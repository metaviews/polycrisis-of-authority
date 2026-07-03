// src/bot/bot.js
//
// Polycrisis of Authority — discord bot entrypoint (cycle 6a, step 1).
//
// This file is the gateway connect + slash command registration + /ping handler.
// No simulation engine integration yet. Step 2 (cycle 6b) wires up /polycrisis start.
//
// Required env vars:
//   DISCORD_BOT_TOKEN   — bot user token from https://discord.com/developers/applications
//   DISCORD_CLIENT_ID   — application (client) id
//   DISCORD_GUILD_ID    — (optional) test server id. If set, /ping is registered as a
//                          GUILD command (instant update). If unset, /ping is registered
//                          as a GLOBAL command (~1hr propagation).
//
// Usage:
//   DISCORD_BOT_TOKEN=... DISCORD_CLIENT_ID=... [DISCORD_GUILD_ID=...] node src/bot/bot.js

const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');

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

const PING_COMMAND = {
  name: 'ping',
  description: 'Polycrisis bot health check. Replies with pong and gateway latency.',
};

// ---------------------------------------------------------------------------
// slash command registration
// ---------------------------------------------------------------------------

async function registerPingCommand() {
  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

  if (GUILD_ID) {
    // Guild-scoped: instant update, ideal for the dev loop.
    const route = Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);
    await rest.put(route, { body: [PING_COMMAND] });
    console.log(`[bot] registered /ping as a GUILD command in ${GUILD_ID} (instant)`);
  } else {
    // Global: ~1hr propagation, but works in every server the bot joins.
    const route = Routes.applicationCommands(CLIENT_ID);
    await rest.put(route, { body: [PING_COMMAND] });
    console.log('[bot] registered /ping as a GLOBAL command (~1hr propagation)');
  }
}

// ---------------------------------------------------------------------------
// client
// ---------------------------------------------------------------------------

const client = new Client({
  // We need only message content for future step-3 free-text move handling.
  // Step 1 doesn't read messages, but declaring the intent now avoids re-auth later.
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,  // privileged; enable in dev portal too
    GatewayIntentBits.DirectMessages,
  ],
});

client.once('ready', (c) => {
  console.log(`[bot] ready — logged in as ${c.user.tag} (id=${c.user.id})`);
  console.log(`[bot] watching ${c.guilds.cache.size} guild(s)`);
  console.log('[bot] step 1 complete: bot skeleton is alive. /ping to verify.');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'ping') return;

  const sent = await interaction.reply({ content: 'ping…', fetchReply: true });
  const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
  const wsLatency = client.ws.ping;
  await interaction.editReply(
    `pong — roundtrip ${roundtrip}ms, websocket ${wsLatency}ms, ` +
    `user ${interaction.user.tag}, channel ${interaction.channelId}`
  );
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
    await registerPingCommand();
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
  // registerPingCommand is async and side-effecting; not re-exported.
  // client is the singleton — verification scripts that need it can require this module
  // and inspect `module.exports.client` if we expose it later. For step 1, the static
  // PING_COMMAND export is enough.
};