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
  ALREADY_ACTIVE_TEXT,
} = require('./commands');

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

  // Followup hint about what's not yet implemented (steps 3+).
  await interaction.followUp({ content: STEP2_FOLLOWUP_TEXT, ephemeral: true });
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
  console.log('[bot] step 2 complete: /polycrisis start posts turn 1 as an embed. /ping still works.');
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
};