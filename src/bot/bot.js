// src/bot/bot.js
//
// Polycrisis of Authority — discord bot entrypoint.
//
// Cycles:
//   6a (step 1): gateway connect + /ping slash command + graceful shutdown.
//   6b (step 2): /polycrisis start posts the seed/turn-1 crisis as a single
//                discord embed. No move handling yet.
//   6c (step 3): free-text move handling via MessageCollector (one message
//                = one move). runLoop runs end-to-end on the discord surface.
//   6d (step 4): /polycrisis advisor slash command posts a 5-button row.
//                Clicking a button calls consult() and posts the advisor's
//                response as an embed. Only the active user can click;
//                other users get an ephemeral "not your button" reply.
//   6e (step 5): end-of-run report as a discord embed + 2 file attachments
//                (markdown + html artifacts) + a followup "play again" hint.
//   6f (step 6): /polycrisis status slash command. Posts the current state
//                of the active run (6 axes, bands, turn count, crisis title).
//                The loop's onTurnStart callback snapshots the live state
//                into the activeRuns entry so /status can read it.
//   6g (step 7): /polycrisis end slash command for clean run end. Identity
//                capture at /start (optional as:/governing: args + followup
//                DM). Identity threaded into runLoop + consult() + status.
//   7-deploy fix: load .env via dotenv at startup, BEFORE the REQUIRED_ENV
//                check runs. pm2's env_file directive has quirks across
//                versions; dotenv is reliable. The fix here is an in-process
//                load — relies on the project layout (src/bot/bot.js →
//                ../../.env) being stable across installs.
//
// Required env vars:
//   DISCORD_BOT_TOKEN   — bot user token from https://discord.com/developers/applications
//   DISCORD_CLIENT_ID   — application (client) id
//   DISCORD_GUILD_ID    — (optional) test server id. If set, slash commands
//                          are registered as GUILD commands (instant update).
//                          If unset, GLOBAL (~1hr propagation).
//
// Usage:
//   DISCORD_BOT_TOKEN=... DISCORD_CLIENT_ID=... [DISCORD_GUILD_ID=...] node src/bot/bot.js

const { Client, GatewayIntentBits, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const path = require('path');

// Load .env from the install root (two levels up from src/bot/bot.js).
// dotenv doesn't overwrite process.env keys that are already set, so
// pm2's env_file directive (if used) wins for explicit overrides.
const dotenvResult = require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
if (dotenvResult.error) {
  // .env file missing or unparseable. REQUIRED_ENV check below will
  // surface this as a clear missing-vars error if the bot can't proceed.
  console.warn('[bot] dotenv: could not load .env:', dotenvResult.error.message);
}

const {
  PING_COMMAND,
  POLYCRISIS_COMMAND,
  ALL_COMMANDS,
  activeRuns,
  buildPingReply,
  buildPolycrisisStartReply,
  buildPolycrisisAdvisorReply,
  buildAdvisorButtonClickReply,
  buildPolycrisisStatusReply,
  buildPolycrisisEndReply,
  STEP2_FOLLOWUP_TEXT,
  STEP3_HINT_TEXT,
  ALREADY_ACTIVE_TEXT,
  ADVISOR_HEADER_TEXT,
  ADVISOR_NOT_ACTIVE_RUN_TEXT,
  ADVISOR_IGNORED_CLICK_TEXT,
  STATUS_NOT_ACTIVE_RUN_TEXT,
  END_NOT_ACTIVE_RUN_TEXT,
  END_ACK_TEXT,
  END_BOT_MESSAGE_TEXT,
  IDENTITY_ASK_BOTH_DM_TEXT,
  IDENTITY_ASK_PLAYER_DM_TEXT,
  IDENTITY_ASK_REGIME_DM_TEXT,
  IDENTITY_DM_FALLBACK_MS,
} = require('./commands');

const { createDiscordSurface } = require('./surface');
const { runLoop } = require('../sim/run-loop');
const { formatCrisisForDiscord, formatStatusEmbed } = require('../sim/surface');
const { consult } = require('../sim/advisors');

// ---------------------------------------------------------------------------
// config
// ---------------------------------------------------------------------------

const REQUIRED_ENV = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k] || process.env[k].trim() === '');

if (missingEnv.length > 0) {
  console.error(`[bot] missing required env vars: ${missingEnv.join(', ')}`);
  console.error('[bot] see docs/14-discord-bot-setup.md for the setup flow.');
  process.exit(1);
}

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID && process.env.DISCORD_GUILD_ID.trim() !== ''
  ? process.env.DISCORD_GUILD_ID
  : null;

// ---------------------------------------------------------------------------
// slash command registration
// ---------------------------------------------------------------------------

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

  if (GUILD_ID) {
    const route = Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);
    await rest.put(route, { body: ALL_COMMANDS });
    console.log(`[bot] registered ${ALL_COMMANDS.length} command(s) as GUILD commands in ${GUILD_ID} (instant)`);
    for (const cmd of ALL_COMMANDS) {
      console.log(`[bot]   - /${cmd.name}${cmd.options ? ' <subcommand>' : ''}`);
    }
  } else {
    const route = Routes.applicationCommands(CLIENT_ID);
    await rest.put(route, { body: ALL_COMMANDS });
    console.log(`[bot] registered ${ALL_COMMANDS.length} command(s) as GLOBAL commands (~1hr propagation)`);
  }
}

// ---------------------------------------------------------------------------
// command handlers (wrap the pure builders from commands.js with discord I/O)
// ---------------------------------------------------------------------------

async function handlePing(interaction) {
  const sent = await interaction.reply({ content: 'ping…', fetchReply: true });
  const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
  const wsLatency = client.ws.ping;
  const reply = buildPingReply(interaction, { roundtripMs: roundtrip, wsLatencyMs: wsLatency });
  await interaction.editReply(reply.content);
}

async function handlePolycrisisStart(interaction) {
  const result = buildPolycrisisStartReply(interaction);

  if (result.kind === 'already_active') {
    await interaction.reply({ content: ALREADY_ACTIVE_TEXT, ephemeral: true });
    return;
  }

  // Defer the reply so we can take time to build the crisis embed.
  // Discord requires a reply within 3s otherwise the interaction fails.
  await interaction.deferReply();

  if (result.warning) {
    await interaction.editReply({ content: result.warning });
    await interaction.followUp({ embeds: [result.embed] });
  } else {
    await interaction.editReply({ embeds: [result.embed] });
  }

  // Followup hint about free-text move handling (cycle 6c).
  await interaction.followUp({ content: STEP3_HINT_TEXT, ephemeral: true });

  // Identity followup DM (cycle 6g): if the player did not provide both
  // `as:` and `governing:` slash args, send a DM asking for the missing
  // piece(s). The DM reply is handled by handleDmReply (a separate
  // messageCreate listener). The simulation never waits on this; the first
  // in-channel move triggers the loop with whatever identity we have
  // resolved by that point (defaults applied via IDENTITY_DM_FALLBACK_MS).
  if (result.followup) {
    await sendIdentityFollowupDm(interaction, result.followup);
  }

  // Spawn the run loop in the background. The loop calls
  // surface.readMove which uses a MessageCollector to await the player's
  // next message. The slash command handler returns immediately; the loop
  // resolves (or rejects) at run end and removes the entry from activeRuns.
  //
  // We catch errors here so an unhandled rejection in the loop doesn't
  // crash the bot process. The error is logged; the run state is cleaned up.
  runDiscordLoop(interaction, result).catch((err) => {
    console.error(`[bot] runDiscordLoop failed for ${result.key}:`, err);
    activeRuns.delete(result.key);
  });
}

/**
 * sendIdentityFollowupDm: open or reuse a DM channel with the active user
 * and post the appropriate identity-prompt text. Best-effort: if DM is
 * unavailable (user has DMs disabled, bot blocked, etc.), the run proceeds
 * with defaults.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 *   The /start interaction.
 * @param {object} followup - { kind: 'ask_player' | 'ask_regime' | 'ask_both' }
 */
async function sendIdentityFollowupDm(interaction, followup) {
  const user = interaction.user;
  let dm;
  try {
    dm = await user.createDM();
  } catch (err) {
    console.warn(`[bot] could not open DM to ${user.tag} for identity followup:`, err.message);
    return;
  }

  let text;
  switch (followup.kind) {
    case 'ask_player':
      text = IDENTITY_ASK_PLAYER_DM_TEXT;
      break;
    case 'ask_regime':
      text = IDENTITY_ASK_REGIME_DM_TEXT;
      break;
    case 'ask_both':
      text = IDENTITY_ASK_BOTH_DM_TEXT;
      break;
    default:
      console.warn(`[bot] unknown followup kind: ${followup.kind}`);
      return;
  }

  try {
    await dm.send(text);
  } catch (err) {
    console.warn(`[bot] failed to send identity DM to ${user.tag}:`, err.message);
  }
}

/**
 * handleDmReply: messageCreate handler for DM messages from users with an
 * active run. Resolves pendingIdentity fields on the run entry.
 *
 * Two-line DM (ask_both): parses the first non-empty line as player, the
 * second as regime. Either or both can be blank for defaults.
 *
 * Single-line DM (ask_player / ask_regime): the entire content is the
 * missing field.
 *
 * After resolving, the entry's player + regime fields are updated so the
 * next onTurnStart snapshot (and the next /status call) reflects the new
 * identity. The runDiscordLoop itself uses the captured identity once at
 * runLoop() entry; mid-run updates apply to future turns via onTurnStart.
 */
async function handleDmReply(message) {
  // Only DMs from real users (not bots, not system messages).
  if (!message.channel || message.channel.type !== 1 /* DM */) return;
  if (message.author?.bot) return;
  if (!message.content) return;

  // Find the user's active run across all channels. The activeRuns key
  // includes channelId, so we scan all entries to find one owned by this user
  // that has a pendingIdentity. For v1 with one-channel-per-user semantics
  // this is one or zero entries in practice.
  const userId = message.author.id;
  let targetKey = null;
  let targetEntry = null;
  for (const [key, entry] of activeRuns.entries()) {
    if (entry.userId === userId && entry.pendingIdentity) {
      targetKey = key;
      targetEntry = entry;
      break;
    }
  }
  if (!targetEntry) {
    // Not a followup answer; either a stray DM or a message from before
    // /start was called. The bot's readMove MessageCollector doesn't pick
    // up DMs (it filters by channel), so this is ignored silently.
    return;
  }

  const lines = message.content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Resolve based on the pending followup kind.
  const entry_pending = targetEntry.pendingIdentity;
  let newPlayer = targetEntry.player;
  let newRegime = targetEntry.regime;

  if (entry_pending.player === null && entry_pending.regime === null) {
    // ask_both: first line = player, second = regime (both can be blank).
    newPlayer = (lines[0] || '').trim() || 'the player';
    newRegime = (lines[1] || '').trim() || 'the regime';
  } else if (entry_pending.player === null) {
    // ask_player.
    newPlayer = (lines[0] || message.content).trim() || 'the player';
  } else if (entry_pending.regime === null) {
    // ask_regime.
    newRegime = (lines[0] || message.content).trim() || 'the regime';
  }

  targetEntry.player = newPlayer;
  targetEntry.regime = newRegime;
  targetEntry.identity = { player: newPlayer, regime: newRegime };
  targetEntry.pendingIdentity = null;

  try {
    await message.reply(
      `_Got it — you are ${newPlayer}, governing ${newRegime}._`
    );
  } catch (err) {
    console.warn('[bot] failed to reply to identity DM:', err.message);
  }
}

/**
 * runDiscordLoop: build a discord surface for the channel and run the
 * shared simulation engine loop against it. The loop owns the player's
 * input via surface.readMove (a MessageCollector on the channel).
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 *   The original /polycrisis start interaction (used for channel + user).
 * @param {object} startResult
 *   The result of buildPolycrisisStartReply. Must be { kind: 'started', ... }.
 */
async function runDiscordLoop(interaction, startResult) {
  const channel = interaction.channel;
  if (!channel) {
    throw new Error('runDiscordLoop: interaction.channel is missing');
  }
  const user = interaction.user;

  const surface = createDiscordSurface({
    channel,
    client,
    activeUser: { id: user.id, tag: user.tag },
  });

  // Store the surface reference on the run entry so /polycrisis end can
  // call forceEnd() to stop the active MessageCollector. Without this,
  // /end could only mark the run for end (via endingBy) and would have
  // to wait up to 10 minutes for readMove's timeout. Storing the surface
  // lets end resolve immediately.
  const entryAtStart = activeRuns.get(startResult.key);
  if (entryAtStart) {
    entryAtStart.surface = surface;
  }

  // onTurnStart: snapshot the pre-delta state + current crisis so /polycrisis
  // status can read them later. Mutates the activeRuns entry in place via
  // startResult.key (already established when /start was called).
  const onTurnStart = ({ turn, state, crisis, bands }) => {
    const entry = activeRuns.get(startResult.key);
    if (entry) {
      entry.currentTurn = turn;
      entry.currentState = state;
      entry.currentCrisis = crisis;
      entry.bands = bands;
      // If the player answered the identity DM after /start but before this
      // turn started, mirror the latest resolved identity into the live
      // snapshot so /status reads the correct values. The runLoop itself
      // uses the captured identity from runLoop() entry (start time); this
      // is purely for the status embed.
      if (entry.identity) {
        entry.player = entry.identity.player;
        entry.regime = entry.identity.regime;
      }
    }
  };

  // Thread the captured identity into runLoop. The entry's player + regime
  // were set at /start time (or fall back to defaults). Mid-run DM updates
  // don't reach runLoop because it captured the identity once; this is
  // documented as the v1 semantics. The status embed picks up later
  // updates via onTurnStart.
  const entry = activeRuns.get(startResult.key);
  const identityForRun = entry && entry.identity
    ? { player: entry.identity.player, regime: entry.identity.regime }
    : null;

  try {
    await runLoop({
      surface,
      model: process.env.OPENROUTER_MODEL || 'minimax/minimax-m3',
      identity: identityForRun,
      renderTurn: formatCrisisForDiscord,
      onTurnStart,
    });
  } catch (err) {
    // readMove timeout (player-quit after 10 min idle), endingBy flag set
    // by /polycrisis end (sentinel "run-ended-by-user" error), or any other
    // loop error. Surface it to the player as a plain-text message so they
    // know what happened. Use a fresh channel.send (not surface.print)
    // because the surface is being torn down by runLoop's finally block.
    let endText;
    if (entry && entry.endingBy === 'user-end') {
      endText = END_BOT_MESSAGE_TEXT;
    } else if (err.message && err.message.startsWith('discord surface.readMove')) {
      endText = `_(Run ended: ${err.message})_\nType \`/polycrisis start\` to begin a new run.`;
    } else {
      endText = `_(Run ended: ${err.message})_\nType \`/polycrisis start\` to begin a new run.`;
    }
    try {
      await channel.send(endText);
    } catch (sendErr) {
      console.error('[bot] failed to send run-end error message:', sendErr);
    }
    throw err; // Re-throw so the caller's catch logs it.
  } finally {
    // Always clean up the activeRuns entry. This is critical: if we don't,
    // the player can't /start a new run until bot restart.
    activeRuns.delete(startResult.key);
  }
}

/**
 * handlePolycrisisAdvisor: /polycrisis advisor slash command handler.
 *
 * Posts a message with 5 buttons (one per advisor voice). The player
 * clicks one; the bot's button handler (see interactionCreate dispatch)
 * calls consult() and posts the response.
 *
 * Rejects if no active run for this user/channel.
 */
async function handlePolycrisisAdvisor(interaction) {
  const result = buildPolycrisisAdvisorReply(interaction);

  if (result.kind === 'no_active_run') {
    await interaction.reply({
      content: ADVISOR_NOT_ACTIVE_RUN_TEXT,
      ephemeral: true,
    });
    return;
  }

  // Build the discord.js button row from the pure button data.
  // 5 buttons fit in one ActionRow (discord allows up to 5 buttons per row).
  const row = new ActionRowBuilder().addComponents(
    result.buttons.map((b) =>
      new ButtonBuilder()
        .setCustomId(b.customId)
        .setLabel(b.label)
        .setStyle(ButtonStyle.Primary)
    )
  );

  await interaction.reply({
    content: ADVISOR_HEADER_TEXT,
    components: [row],
  });
}

/**
 * handleAdvisorButtonClick: advisor button click handler.
 *
 * Filters: only the active user can click (other users get an ephemeral
 * "not your button" reply). The active user gets a deferred reply
 * followed by an edit with the advisor's response.
 *
 * Uses the run state's seed as the crisis context for consult(). v1
 * simplification — see design note in cycle 6d's prototype doc.
 */
async function handleAdvisorButtonClick(interaction) {
  const result = buildAdvisorButtonClickReply(interaction);

  if (result.kind === 'not_active_user') {
    // Either no run for this user, or a run exists for someone else in
    // this channel. Either way: ephemeral reply indicating the click
    // didn't apply.
    await interaction.reply({
      content: ADVISOR_IGNORED_CLICK_TEXT,
      ephemeral: true,
    });
    return;
  }

  if (result.kind === 'unknown_button') {
    // Defensive — shouldn't happen if interactionCreate dispatches
    // correctly. Tell the user something went wrong.
    await interaction.reply({
      content: '_(Unknown button. Please use `/polycrisis advisor` to get a fresh button row.)_',
      ephemeral: true,
    });
    return;
  }

  // result.kind === 'consult' — call the engine.
  const { voice, runState } = result;
  await interaction.deferReply();

  // Use the run state's seed as the crisis context. The seed's fragment
  // is the seed's situation text (5-6 sentence briefing). This is a v1
  // simplification — see cycle 6d's prototype doc for the trade-off.
  // Future work could thread the latest turn's crisis into the run state.
  const crisisContext = runState.crisis || {
    id: runState.seed?.id || 'unknown',
    title: runState.seed?.actor ? `${runState.seed.actor} seed` : 'Active crisis',
    trigger: runState.seed?.fragment || '',
    situation: runState.seed?.fragment || '',
    pressure: '(consulting an advisor before a crisis is posted)',
    decision_point: '(consulting an advisor before a crisis is posted)',
    failure_pattern: runState.seed?.failurePattern || 'unknown',
    focal_axes: runState.seed?.focalAxes || [],
  };

  try {
    const response = await consult({
      voice,
      crisis: crisisContext,
      state: runState.state || {},
      playerMove: '[player is consulting an advisor during the run]',
      identity: runState.identity || null,
      model: process.env.OPENROUTER_MODEL || 'minimax/minimax-m3',
    });

    // Build a friendly embed with the advisor's name + response.
    const embed = new EmbedBuilder()
      .setTitle(`Advisor: ${voice}`)
      .setDescription(response.slice(0, 4096))
      .setColor(0x6b8a7a); // muted archival green

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error(`[bot] consult failed for voice ${voice}:`, err);
    try {
      await interaction.editReply({
        content: `_(Consult failed: ${err.message})_\nType \`/polycrisis advisor\` to try again.`,
      });
    } catch (editErr) {
      console.error('[bot] editReply also failed:', editErr);
    }
  }
}

/**
 * handlePolycrisisStatus: /polycrisis status slash command handler.
 *
 * Posts the current state of the active run as an embed (6 axes, bands,
 * turn count, crisis title, player/regime, model). Updates whenever the
 * player calls /status mid-run; useful when they've been away and need
 * to recall where they are.
 *
 * Rejects if no active run for this user/channel.
 */
async function handlePolycrisisStatus(interaction) {
  const result = buildPolycrisisStatusReply(interaction, { formatStatusEmbed });

  if (result.kind === 'no_active_run') {
    await interaction.reply({
      content: STATUS_NOT_ACTIVE_RUN_TEXT,
      ephemeral: true,
    });
    return;
  }

  // Post the status embed. This is NOT ephemeral — the player can scroll
  // back to it.
  await interaction.reply({ embeds: [result.embed] });
}

/**
 * handlePolycrisisEnd: /polycrisis end slash command handler.
 *
 * Marks the active run for clean end. The loop's active MessageCollector
 * will reject on its next event with a sentinel error, which the
 * runDiscordLoop catch path catches and surfaces to the player as the
 * "run ended by /polycrisis end" message. The activeRuns entry is removed
 * in runDiscordLoop's finally block.
 *
 * Rejects if no active run for this user/channel.
 */
async function handlePolycrisisEnd(interaction) {
  const result = buildPolycrisisEndReply(interaction);

  if (result.kind === 'no_active_run') {
    await interaction.reply({
      content: END_NOT_ACTIVE_RUN_TEXT,
      ephemeral: true,
    });
    return;
  }

  // Mark the run for end (the runDiscordLoop catch path uses this for
  // the in-channel message wording: "Run ended by /polycrisis end." vs
  // "Run ended: <err.message>").
  result.runState.endingBy = 'user-end';

  // Stop the active MessageCollector immediately so the loop rejects
  // and resolves through the existing runDiscordLoop catch path. The
  // surface was stored on the entry when the loop started.
  if (result.runState.surface && typeof result.runState.surface.forceEnd === 'function') {
    try {
      result.runState.surface.forceEnd();
    } catch (err) {
      console.warn('[bot] forceEnd failed:', err.message);
    }
  }

  // Acknowledge the slash command before the loop's catch path resolves.
  // The in-channel "run ended" message comes from runDiscordLoop (not
  // from this handler) so the player sees both: the ephemeral ack here
  // and the regular run-end message in the channel.
  try {
    await interaction.reply({ content: END_ACK_TEXT, ephemeral: true });
  } catch (err) {
    console.warn('[bot] /end ack failed:', err.message);
  }
}

// ---------------------------------------------------------------------------
// client
// ---------------------------------------------------------------------------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

client.once('ready', (c) => {
  console.log(`[bot] ready — logged in as ${c.user.tag} (id=${c.user.id})`);
  console.log(`[bot] watching ${c.guilds.cache.size} guild(s)`);
  console.log('[bot] cycle 6g complete: /polycrisis end + identity capture at /start. Discord build plan step 7 (of 7) shipped.');
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'ping') {
        await handlePing(interaction);
      } else if (interaction.commandName === 'polycrisis') {
        const sub = interaction.options.getSubcommand();
        if (sub === 'start') {
          await handlePolycrisisStart(interaction);
        } else if (sub === 'advisor') {
          await handlePolycrisisAdvisor(interaction);
        } else if (sub === 'status') {
          await handlePolycrisisStatus(interaction);
        } else if (sub === 'end') {
          await handlePolycrisisEnd(interaction);
        }
      }
    } else if (interaction.isButton()) {
      // Filter: only advisor:* buttons reach the button handler. Buttons
      // with other customIds (added in future cycles) are silently dropped.
      if (interaction.customId && interaction.customId.startsWith('advisor:')) {
        await handleAdvisorButtonClick(interaction);
      }
    }
  } catch (err) {
    console.error(`[bot] error handling interaction:`, err);
    try {
      const reply = `Something went wrong handling that command: ${err.message}`;
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: reply, ephemeral: true });
      } else {
        await interaction.reply({ content: reply, ephemeral: true });
      }
    } catch (followUpErr) {
      console.error('[bot] followUp also failed:', followUpErr);
    }
  }
});

// Cycle 6g: DM replies to the identity followup. Listens for any message
// in a DM channel; if the sender has an active run with a pendingIdentity,
// resolves it. Stray DMs (no active run, no pending identity) are ignored.
client.on('messageCreate', async (message) => {
  try {
    await handleDmReply(message);
  } catch (err) {
    console.error('[bot] error handling DM reply:', err);
  }
});

client.on('error', (err) => {
  console.error('[bot] discord.js client error:', err);
});

client.on('shardError', (err, shardId) => {
  console.error(`[bot] shard ${shardId} error:`, err);
});

// ---------------------------------------------------------------------------
// lifecycle
// ---------------------------------------------------------------------------

async function shutdown(signal) {
  console.log(`[bot] received ${signal}, shutting down…`);
  try {
    client.destroy();
  } catch (err) {
    console.error('[bot] error during client.destroy():', err);
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[bot] unhandledRejection:', reason);
});

(async () => {
  try {
    await registerCommands();
    await client.login(BOT_TOKEN);
  } catch (err) {
    console.error('[bot] startup failed:', err);
    process.exit(1);
  }
})();

// ---------------------------------------------------------------------------
// exports (for verification scripts)
// ---------------------------------------------------------------------------

module.exports = {
  PING_COMMAND,
  POLYCRISIS_COMMAND,
  ALL_COMMANDS,
  // Expose the pure builders for verification scripts.
  buildPingReply,
  buildPolycrisisStartReply,
  buildPolycrisisEndReply,
  activeRuns,
  // runDiscordLoop is exported so verification scripts can test the
  // bot's loop-spawning logic with a mock interaction + channel.
  // (Tests stub client and surface; they don't actually connect to discord.)
  runDiscordLoop,
  // 6d handlers — verification scripts can test the pure paths via
  // buildPolycrisisAdvisorReply / buildAdvisorButtonClickReply (the
  // discord-aware handlers handlePolycrisisAdvisor / handleAdvisorButtonClick
  // are not exported because they require a live discord.js context).
  // 6g handlers — verification scripts can test handlePolycrisisEnd's
  // pure path via buildPolycrisisEndReply. The discord-aware
  // handlePolycrisisEnd is not exported (requires live discord.js context).
  sendIdentityFollowupDm,
  handleDmReply,
};