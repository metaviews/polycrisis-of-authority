// src/bot/bot.js
//
// Polycrisis of Authority — discord bot entrypoint.
//
// Cycles:
//   6a (step 1): gateway connect + /ping slash command + graceful shutdown.
//   6b (step 2): /polycrisis start posts the seed/turn-1 crisis as a single
//                discord embed. No move handling yet — the discord surface's
//                readMove / readChoice / readConfirm throw "not yet
//                implemented". Step 3 (cycle 6c) wires up free-text moves.
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

const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');

const {
  PING_COMMAND,
  POLYCRISIS_START_COMMAND,
  ALL_COMMANDS,
  activeRuns,
  buildPingReply,
  buildPolycrisisStartReply,
  STEP2_FOLLOWUP_TEXT,
  STEP3_HINT_TEXT,
  ALREADY_ACTIVE_TEXT,
} = require('./commands');

const { createDiscordSurface } = require('./surface');
const { runLoop } = require('../sim/run-loop');
const { formatCrisisForDiscord } = require('../sim/surface');

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

  try {
    await runLoop({
      surface,
      model: process.env.OPENROUTER_MODEL || 'minimax/minimax-m3',
      // identity is null for step 3 (no /start as:<name> option yet).
      // The loop's formatter handles null identity by leaving the
      // description empty; the run log uses default "the player" / "the regime".
      identity: null,
      renderTurn: formatCrisisForDiscord,
    });
  } catch (err) {
    // readMove timeout (player-quit after 10 min idle) or any other loop error.
    // Surface it to the player as a plain-text message so they know what happened.
    // Use a fresh channel.send (not surface.print) because the surface is being
    // torn down by runLoop's finally block.
    try {
      await channel.send(
        `_(Run ended: ${err.message})_\n` +
        `Type \`/polycrisis start\` to begin a new run.`
      );
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
  console.log('[bot] step 3 complete: /polycrisis start runs the loop end-to-end; type your move as a message.');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === 'ping') {
      await handlePing(interaction);
    } else if (
      interaction.commandName === 'polycrisis' &&
      interaction.options.getSubcommand() === 'start'
    ) {
      await handlePolycrisisStart(interaction);
    }
  } catch (err) {
    console.error(`[bot] error handling /${interaction.commandName}:`, err);
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
  POLYCRISIS_START_COMMAND,
  ALL_COMMANDS,
  // Expose the pure builders for verification scripts.
  buildPingReply,
  buildPolycrisisStartReply,
  activeRuns,
  // runDiscordLoop is exported so verification scripts can test the
  // bot's loop-spawning logic with a mock interaction + channel.
  // (Tests stub client and surface; they don't actually connect to discord.)
  runDiscordLoop,
};