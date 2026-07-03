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
 * For cycle 6b (step 2 of the discord build), this surface is intentionally
 * partial:
 *
 *   - surface.print(prose)        → posts a discord embed (or a text message)
 *   - surface.waitWhileLLM(msg, fn, opts)
 *                                → starts the typing indicator, runs fn(),
 *                                  and refreshes the indicator every 5s
 *                                  while fn is in flight. Returns fn's result.
 *   - surface.close()             → no-op for discord (bot lifecycle is
 *                                  separate)
 *   - surface.readMove({ header }) → THROWS "not yet implemented"
 *   - surface.readChoice({...})    → THROWS "not yet implemented"
 *   - surface.readConfirm({...})   → THROWS "not yet implemented"
 *
 * The read methods throw because step 2 is intentionally no-input — the bot
 * accepts /polycrisis start, displays turn 1's crisis as an embed, and waits.
 * Step 3 (cycle 6c) implements readMove for free-text move handling.
 *
 * The print method takes either a string (raw prose) or an object with
 * `{ embed }` (a discord.js embed payload from formatCrisisForDiscord). The
 * bot code that calls surface.print decides which form to pass. Raw strings
 * are posted as plain text messages with a 2000-char limit; embeds are
 * posted as embeds (with discord's 4096-char description limit, enforced by
 * the formatter).
 *
 * Discord-specific affordances:
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
 */

const MAX_DISCORD_MESSAGE = 2000;

function notYetImplemented(method) {
  return () => {
    throw new Error(
      `discord surface.${method} is not yet implemented. ` +
      `See docs/13-discord-bot-architecture.md for the build plan. ` +
      `Steps 3+ implement the read methods.`
    );
  };
}

/**
 * Create a discord surface for a specific channel.
 *
 * @param {object} options
 * @param {import('discord.js').TextChannel | import('discord.js').DMChannel} options.channel
 *   The discord channel (or DM channel) to post messages to.
 * @param {object} [options.client]
 *   Optional discord.js Client — needed for waitWhileLLM's typing indicator.
 *   If omitted, waitWhileLLM silently skips the indicator (useful for tests).
 * @returns {object} a surface adapter conforming to the contract in src/sim/surface.js
 */
function createDiscordSurface({ channel, client = null } = {}) {
  if (!channel) {
    throw new Error('createDiscordSurface: channel is required');
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

  function close() {
    if (typingInterval) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
    // No channel to close for discord — the bot lifecycle is separate.
  }

  return {
    isTTY: false,
    print,
    waitWhileLLM,
    close,
    // Read methods throw for cycle 6b. Each step after this one implements them.
    readMove: notYetImplemented('readMove'),
    readChoice: notYetImplemented('readChoice'),
    readConfirm: notYetImplemented('readConfirm'),
  };
}

module.exports = {
  createDiscordSurface,
  MAX_DISCORD_MESSAGE,
};