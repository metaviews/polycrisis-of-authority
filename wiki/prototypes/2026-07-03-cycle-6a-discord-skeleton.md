# Prototype — 2026-07-03 — Cycle 6a: Discord bot skeleton

## Observation

The user signaled "start the discord build" after the terminal-side walkthrough cycles (5f–5j) landed. Step 1 of the 7-step build plan in `docs/13-discord-bot-architecture.md` is a minimal bot skeleton: connect to the discord gateway, register a single `/ping` slash command, respond to it. No simulation engine integration yet — that begins in step 2 (cycle 6b).

The skeleton's job is to verify the gateway plumbing before any game logic is built on top of it.

## What shipped

### 1. `src/bot/bot.js`

The bot entrypoint. Single file, ~120 lines.

- Reads `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, optional `DISCORD_GUILD_ID` from `process.env`.
- Registers the `/ping` slash command on startup:
  - If `DISCORD_GUILD_ID` is set, registers as a **guild command** (instant update — ideal for dev).
  - If not set, registers as a **global command** (~1hr propagation, works in every server the bot joins).
- Connects to the discord gateway via `discord.js` v14 with `Guilds`, `GuildMessages`, `MessageContent`, and `DirectMessages` intents. (MessageContent is privileged — enabled in the dev portal per `docs/14-discord-bot-setup.md`.)
- On `interactionCreate` for `/ping`, replies with `ping…`, then edits the reply with `pong — roundtrip Xms, websocket Yms, user ..., channel ...`.
- Handles SIGINT/SIGTERM with a clean shutdown.
- Logs `unhandledRejection` so failures don't vanish silently.

No simulation engine integration. No file writes. No sqlite. Just the skeleton.

### 2. `.env.example` updates

Three new vars:

```
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
```

All empty. Documented inline with the URLs to fetch each value.

### 3. `.gitignore` updates

- `.env.discord` (alternative env file for the bot, in case the user wants a separate file for clarity)
- `runs/` (the simulation's per-run artifact directory was missing from the original gitignore — added during the bot setup)
- `bot.db`, `bot.db-journal`, `bot.db-wal`, `bot.db-shm` (sqlite artifacts for v2)

### 4. `package.json`

First package.json for the project. Minimal:

- `discord.js@^14.14.0` (installed: 14.26.4)
- `npm run bot` → `node src/bot/bot.js`
- `npm run sim` → `node src/sim/interactive.js` (the existing terminal surface)
- Node engine: `>=20`

### 5. `docs/14-discord-bot-setup.md`

One-time developer setup flow. 7 steps:

1. Create the discord application (get `DISCORD_CLIENT_ID`)
2. Create the bot user (get `DISCORD_BOT_TOKEN`)
3. Enable the privileged MessageContent intent
4. Create or identify the test server (get `DISCORD_GUILD_ID`)
5. Invite the bot via OAuth2 URL with minimum permissions
6. Fill in `.env` (gitignored — never commit)
7. Run `npm run bot` and verify `/ping` in the test server

Also documents the security posture (no admin permissions, never commit tokens, reset immediately if leaked) and the exit criteria for step 1.

## Design decisions

**Engine stays untouched (for now).** The architecture spec promises "the simulation engine is unchanged." Step 1 doesn't violate that — there's no engine interaction. Step 2 will be the first moment the bot calls into `src/sim/`. If a refactor is needed for clean engine integration, it'll be designed in step 2's planning conversation, not assumed here.

**No `dotenv` library.** The bot reads `process.env` directly. The project doesn't use `dotenv` elsewhere. Pulling it in for step 1 would be premature. Can add later if the user prefers to source `.env` instead of exporting env vars manually.

**Slash command registered via REST, not a separate script.** Discord.js exposes a `REST` client that can PUT slash commands directly. Bot.js calls it on startup. This means no `node scripts/register-commands.js` step, no separate deploy loop. Downside: if the bot crashes between REST PUT and gateway login, the command is registered but the bot is offline. Acceptable for step 1.

**Privileged intents declared now.** `MessageContent` isn't needed for `/ping` but will be needed in step 3 (free-text move handling). Declaring it now means we won't need to re-auth the bot mid-build.

**Minimum permission set.** The bot only asks for the perms it actually needs: Send Messages, Embed Links, Attach Files, Use External Emoji, Add Reactions, Read Message History, Manage Threads (for step 7 polish). No admin perms, no kick/ban, no role management.

## What this doesn't include (deferred)

- **`/polycrisis` slash command tree.** That's steps 2-7. Step 1 only has `/ping`.
- **Free-text move handling.** Step 3.
- **Advisor buttons.** Step 4.
- **End-of-run report + artifact attachment.** Step 5.
- **State persistence.** v2 feature, not in scope for step 1.
- **Multi-server / multi-player.** v1 is single-player (one run per channel/DM per user, but v1 doesn't even reach the multi-player question because it has no sim integration yet).
- **Deployment to fly.io / VPS.** Step 7 polish.

## Verification

`/tmp/hermes-verify-6a-discord-skeleton.sh` runs 8 checks:

1. `package.json` declares `discord.js` dependency
2. `node_modules/discord.js` is installed (>=14.0.0)
3. `src/bot/bot.js` exists and is non-empty
4. `src/bot/bot.js` requires `discord.js`
5. `.env.example` has all three DISCORD_* keys
6. `.gitignore` ignores `.env`, `.env.discord`, and `bot.db`
7. `docs/14-discord-bot-setup.md` exists with the 7-step flow
8. `node -e "require('./src/bot/bot.js')"` succeeds when env vars are set to dummy values (proves the module's top-level code parses and the missing-env guard fires cleanly without crashing on syntax)

This is the **live-run** check that the user has to do themselves: `npm run bot` with real `.env` values, then `/ping` in the test server. The verification script covers everything *except* the actual gateway connection, which requires real credentials.

## Known issues

- **`npm audit` reports 4 vulnerabilities** in the `undici` chain (HTTP client used by `@discordjs/rest`). 3 moderate, 1 high. Fix requires downgrading discord.js to v13, which contradicts the spec's v14 pin. Accepted risk for v1: the affected vectors (HTTP-header injection, DoS via WebSocket fragment count, Set-Cookie parsing) aren't reachable from a normal discord bot use case. Will revisit if v2's HTTP-server-adjacent features (web dashboard) widen the attack surface.

## Next

Step 2 (`/polycrisis start` posts the seed/turn-1 prose as a single message in a DM). This is the first step that touches the simulation engine, so the cycle 6b planning conversation will include deciding how to surface a `runTurn` / surface-adapter refactor — the user confirmed "engine can be touched where necessary."