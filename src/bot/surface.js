'use strict';

/**
 * src/bot/surface.js
 *
 * Cycle 6b: discord surface adapter for the simulation engine.
 *
 * The simulation engine produces events (turn-start, player-move, world
 * response, end-of-run report). The discord surface consumes those events
 * and posts them as discord embeds + messages. The surface adapter pattern
 * (see src/sim/surface.js for the contract) lets the same shared turn loop
 * drive both the terminal surface and the discord surface.
 *
 * Cycle 6c (step 3) implements surface.readMove via a discord.js
 * MessageCollector. The discord surface is a SINGLE-MESSAGE surface:
 * one message = one move. No multi-line continuation, no `a`/`r` shortcut
 * detection (those are TTY conveniences; on discord, advisors will be
 * buttons in step 4 and resign will be a slash command / button).
 *
 * Surface adapter contract (this file's implementation):
 *
 *   surface.isTTY              → false
 *   surface.singleMessage      → true (discord chat = one message per turn)
 *   surface.print(prose)       → posts discord embed or plain text (2000-char split)
 *   surface.waitWhileLLM(...)  → starts typing indicator, refreshes every 5s, runs fn()
 *   surface.readMove({...})    → returns the next player message in the channel
 *                                (filtered to the player whose run is active)
 *   surface.readChoice({...})  → THROWS "not yet implemented" (step 4)
 *   surface.readConfirm({...}) → THROWS "not yet implemented" (step 4+)
 *   surface.close()            → clears typing interval; no other state
 *
 * Implementation notes:
 *
 *   - Typing indicator: discord shows "Bot is typing..." for ~10s before
 *     timing out. The bot refreshes the indicator every 5s during long LLM
 *     calls via channel.sendTyping() so the indicator stays visible.
 *
 *   - 4096-char embed description limit + 1024-char field value limit are
 *     enforced by formatCrisisForDiscord (in src/sim/surface.js).
 *
 *   - 2000-char message limit. Prose strings longer than this are split into
 *     multiple messages (rare for crisis prose, but the spec calls out long
 *     narratives at run end).
 *
 *   - readMove: uses discord.js's MessageCollector, which is the idiomatic
 *     way to await the next message on a channel. Filter by author (only
 *     the user whose run is active) and ignore the bot's own messages.
 *     Times out after `timeoutMs` (default 10 minutes — long enough for
 *     a player to think, short enough to free memory if they walk away).
 */

const MAX_DISCORD_MESSAGE = 2000;
const MAX_DISCORD_FILE_BYTES = 25 * 1024 * 1024; // 25 MB — discord's bot upload limit
const DEFAULT_READ_MOVE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const { AttachmentBuilder } = require('discord.js');

function notYetImplemented(method) {
  return () => {
    throw new Error(
      `discord surface.${method} is not yet implemented. ` +
      `See docs/13-discord-bot-architecture.md for the build plan. ` +
      `Step 4 implements readChoice (advisor buttons); ` +
      `later steps implement readConfirm.`
    );
  };
}

/**
 * Create a discord surface for a specific channel + active player.
 *
 * @param {object} options
 * @param {import('discord.js').TextChannel | import('discord.js').DMChannel} options.channel
 *   The discord channel (or DM channel) to post messages to.
 * @param {object} options.client
 *   The discord.js Client. Needed for waitWhileLLM's typing indicator AND
 *   for readMove's MessageCollector (which uses the client internally).
 * @param {object} options.activeUser
 *   The user whose run is active in this channel. readMove only accepts
 *   messages from this user. Shape: { id: string, tag?: string }.
 * @param {object} [options.timeoutMs]
 *   How long readMove waits for the next message before timing out.
 *   Defaults to 10 minutes. On timeout, readMove throws an error.
 * @returns {object} a surface adapter conforming to the contract in src/sim/surface.js
 */
function createDiscordSurface({ channel, client = null, activeUser = null, timeoutMs = DEFAULT_READ_MOVE_TIMEOUT_MS } = {}) {
  if (!channel) {
    throw new Error('createDiscordSurface: channel is required');
  }
  if (!client) {
    throw new Error('createDiscordSurface: client is required (needed for MessageCollector + typing indicator)');
  }
  if (!activeUser || !activeUser.id) {
    throw new Error('createDiscordSurface: activeUser with .id is required (readMove filters by author)');
  }

  // Track the typing indicator interval so we can clear it when the LLM
  // call resolves. Discord's typing indicator naturally times out after
  // ~10s; we refresh it every 5s while a long LLM call is in flight.
  let typingInterval = null;

  async function startTyping() {
    if (!channel || typeof channel.sendTyping !== 'function') return;
    try {
      await channel.sendTyping();
    } catch (err) {
      // Typing indicator is best-effort. If the channel doesn't support it
      // (e.g. permission issue), don't crash the loop.
    }
  }

  async function print(prose) {
    if (!channel) return;
    if (prose == null) return;

    // If the prose is a discord embed payload (object with `embed`), post as embed.
    if (typeof prose === 'object' && prose.embed) {
      await channel.send({ embeds: [prose.embed] });
      return;
    }

    // Otherwise treat as plain text. Split if longer than the message limit.
    const text = String(prose);
    if (text.length <= MAX_DISCORD_MESSAGE) {
      await channel.send(text);
      return;
    }
    let cursor = 0;
    while (cursor < text.length) {
      const chunk = text.slice(cursor, cursor + MAX_DISCORD_MESSAGE);
      await channel.send(chunk);
      cursor += MAX_DISCORD_MESSAGE;
    }
  }

  async function waitWhileLLM(message, fn, _options = {}) {
    // Start the typing indicator. Refresh every 5s. Discord shows the
    // indicator for ~10s before timing out.
    if (channel && typeof channel.sendTyping === 'function') {
      await startTyping();
      typingInterval = setInterval(() => {
        startTyping().catch(() => {});
      }, 5000);
    }
    try {
      return await fn();
    } finally {
      if (typingInterval) {
        clearInterval(typingInterval);
        typingInterval = null;
      }
    }
  }

  /**
   * readMove: returns the next message the active player sends in this channel.
   *
   * Filters:
   *   - Only messages from `activeUser.id` (other users' messages are ignored).
   *   - Bot's own messages are ignored (defense in depth — collector filters
   *     by default, but explicit filter makes intent clear).
   *   - Slash commands would arrive as ApplicationCommand interactions, not
   *     messageCreate events, so they don't reach this collector.
   *
   * Returns: the message content as a string (trimmed). Empty content (e.g.
   * a message with only an attachment) returns "" — the loop treats this as
   * a silent move.
   *
   * Throws on timeout. The loop's readPlayerMove catches timeout and treats
   * it as a player-quit (the run can be abandoned; the player can /start again).
   *
   * The `header` and `continuation` options are accepted for surface-contract
   * compatibility with the TTY surface but are ignored: discord chat is
   * single-message, so there's no notion of "first line" vs "continuation line."
   * The full message content is returned.
   */
  async function readMove(_options = {}) {
    if (!channel || typeof channel.createMessageCollector !== 'function') {
      throw new Error('discord surface.readMove: channel does not support MessageCollector');
    }

    return new Promise((resolve, reject) => {
      const filter = (msg) => {
        // Only accept messages from the active user.
        if (!msg.author || msg.author.id !== activeUser.id) return false;
        // Ignore the bot's own messages (defense in depth).
        if (msg.author.bot) return false;
        // Ignore system messages.
        if (msg.system) return false;
        return true;
      };

      const collector = channel.createMessageCollector({
        filter,
        max: 1, // We only need the next message.
        time: timeoutMs,
      });

      collector.on('collect', (msg) => {
        collector.stop('collected');
        // Return the message content trimmed. If empty (e.g. attachment-only),
        // return empty string — the loop will treat as silent move.
        resolve((msg.content || '').trim());
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'collected') return; // Already resolved above.
        if (reason === 'time') {
          reject(new Error(
            `discord surface.readMove: timed out after ${timeoutMs}ms waiting for ` +
            `${activeUser.tag || activeUser.id} to send a message in ${channel.id}. ` +
            `Treat as player-quit; the player can /polycrisis start again to abandon.`
          ));
        } else {
          reject(new Error(`discord surface.readMove: collector ended unexpectedly (reason=${reason})`));
        }
      });
    });
  }

  function close() {
    if (typingInterval) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
    // No channel to close for discord — the bot lifecycle is separate.
    // The active MessageCollector (if any) is owned by runLoop's readMove;
    // it will end naturally on collect / time / close.
  }

  /**
   * postEndOfRun: posts the end-of-run summary embed + 2 file attachments
   * (markdown artifact + html artifact) to the channel, followed by a
   * "play again" hint. Implements surface.postEndOfRun for the discord
   * surface.
   *
   * @param {object} options
   * @param {object} options.result - the runLoop result
   * @param {object} options.embed - the embed payload (from
   *   src/sim/surface.formatEndOfRunEmbed)
   * @param {object} options.files - { markdown: string, html: string, runLog: string }
   * @param {object} options.paths - { runLogPath, artifactPath, htmlPath }
   */
  async function postEndOfRun({ result, embed, files, paths } = {}) {
    if (!channel || typeof channel.send !== 'function') {
      return;
    }
    if (!embed) {
      // Defensive: the loop should always pass an embed. If it doesn't,
      // fall back to a generic plain-text message rather than crashing.
      try {
        await channel.send(
          `_Run ended: ${result?.outcome || 'unknown'} on turn ${result?.turnsCompleted ?? '?'}._`
        );
      } catch (err) {
        console.error('[bot surface] postEndOfRun fallback failed:', err);
      }
      return;
    }

    // Build attachments from the artifact strings. discord.js expects
    // Buffers (or file paths / fetch responses) inside AttachmentBuilder.
    const attachments = [];

    if (typeof files?.markdown === 'string' && files.markdown.length > 0) {
      try {
        const buf = Buffer.from(files.markdown, 'utf-8');
        if (buf.length <= MAX_DISCORD_FILE_BYTES) {
          attachments.push(
            new AttachmentBuilder(buf, { name: `${result.runId}-artifact.md` }),
          );
        } else {
          console.warn(
            `[bot surface] markdown artifact too large to attach (${buf.length} bytes); skipping`,
          );
        }
      } catch (err) {
        console.error('[bot surface] failed to build markdown attachment:', err);
      }
    }

    if (typeof files?.html === 'string' && files.html.length > 0) {
      try {
        const buf = Buffer.from(files.html, 'utf-8');
        if (buf.length <= MAX_DISCORD_FILE_BYTES) {
          attachments.push(
            new AttachmentBuilder(buf, { name: `${result.runId}-artifact.html` }),
          );
        } else {
          console.warn(
            `[bot surface] html artifact too large to attach (${buf.length} bytes); skipping`,
          );
        }
      } catch (err) {
        console.error('[bot surface] failed to build html attachment:', err);
      }
    }

    // runLog is the orchestrator's debug log — not attached per spec (cycle 6e
    // design point 5). It stays on disk for audit purposes.

    // Post the embed + attachments as a single message. discord.js allows
    // up to 10 attachments per message; we send 2 (markdown + html).
    try {
      await channel.send({
        embeds: [embed],
        files: attachments.length > 0 ? attachments : undefined,
      });
    } catch (err) {
      console.error('[bot surface] failed to send end-of-run embed + attachments:', err);
      // Best-effort fallback: send just the embed's description as plain text.
      try {
        const fallback = embed.description
          ? embed.description.slice(0, 1900)
          : `Run ended: ${result?.outcome || 'unknown'}`;
        await channel.send(fallback);
      } catch (fallbackErr) {
        console.error('[bot surface] fallback plain-text send also failed:', fallbackErr);
      }
      return;
    }

    // Followup "play again" hint. Sends AFTER the embed so it's the most
    // recent message in the channel — players see it first when scrolling
    // up. Text-only, no buttons (the spec calls out a "play again" button
    // for future cycles; cycle 6e ships the text hint).
    try {
      await channel.send(
        `Run complete. The artifact files are attached above ` +
        `(\`${result.runId}-artifact.md\` for the canonical markdown, ` +
        `\`${result.runId}-artifact.html\` for the shareable HTML).\n` +
        `Type \`/polycrisis start\` to begin a new run.`
      );
    } catch (err) {
      console.error('[bot surface] failed to send play-again hint:', err);
    }
  }

  return {
    isTTY: false,
    // discord is a single-message surface. The shared runLoop checks this
    // flag in readPlayerMove and skips the multi-line continuation branch.
    singleMessage: true,
    // cycle 6e: discord surface uses embed-and-files mode at run end.
    // The runLoop checks this flag and skips the verbose plain-text
    // "─── Generating artifact ───" + filesystem path listings.
    endOfRunMode: 'embed-and-files',
    print,
    waitWhileLLM,
    readMove,
    postEndOfRun,
    close,
    // Read methods that step 4+ will implement.
    readChoice: notYetImplemented('readChoice'),
    readConfirm: notYetImplemented('readConfirm'),
  };
}

module.exports = {
  createDiscordSurface,
  MAX_DISCORD_MESSAGE,
  DEFAULT_READ_MOVE_TIMEOUT_MS,
};