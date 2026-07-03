---
title: "Discord bot setup — one-time developer flow to provision the bot user and gather tokens"
description: "How the developer provisions a discord application + bot user, gets a token, and prepares .env. This is the manual setup that precedes running the bot. The bot itself is at src/bot/bot.js."
type: prototype
subtype: setup-guide
version: "0.1.0"
last_updated: "2026-07-03"
grounded_in:
  - "docs/13-discord-bot-architecture.md"
---

# Discord bot setup

_This is the **one-time, manual** developer setup that produces the three values in `.env`. The bot itself runs unattended once configured. If you already have a discord application + bot user with the right intents enabled, skip to step 5._

## Prerequisites

- a discord account
- a test server you own (or will create) — the bot joins this server for development
- ~10 minutes

## Step 1 — Create the discord application

1. Open https://discord.com/developers/applications
2. Click **New Application** (top right). Name it something like `Polycrisis Dev`.
3. On the application's **General Information** tab, copy the **Application ID**. This is your `DISCORD_CLIENT_ID`.

Don't close this tab yet.

## Step 2 — Create the bot user

1. In the left sidebar, click **Bot**.
2. Click **Add Bot**, confirm.
3. The bot user appears with a username like `Polycrisis Dev`. (You can rename later.)
4. Under **Token**, click **Reset Token**, then **Copy**. This is your `DISCORD_BOT_TOKEN`. **Treat it like a password** — never commit it, never paste it into a chat.

The token is shown once. If you lose it, reset and copy again.

## Step 3 — Enable the privileged intent

The bot needs the **Message Content Intent** to read free-text messages in steps 3+ (the player types their move directly in the channel/DM). For step 1 (`/ping` only) you can defer this, but enabling it now avoids re-auth later.

1. Still on the **Bot** tab, scroll to **Privileged Gateway Intents**.
2. Toggle **Message Content Intent** ON.
3. Save changes.

## Step 4 — Create a test server (or use an existing one)

If you don't already have a discord server for dev work:

1. Open Discord, click the **+** in the server list, **Create My Own**, **For me and my friends**.
2. Name it `Polycrisis Dev` or similar.
3. Enable **Developer Mode** in Discord settings: **User Settings → Advanced → Developer Mode ON**.
4. Right-click the new server icon, **Copy Server ID**. This is your `DISCORD_GUILD_ID`.

## Step 5 — Invite the bot to the test server

Still on the discord developer portal, in your application:

1. Left sidebar: **OAuth2 → URL Generator**.
2. **Scopes:** check `bot` and `applications.commands`.
3. **Bot Permissions:** check:
   - Send Messages
   - Embed Links
   - Attach Files
   - Use External Emoji
   - Add Reactions
   - Read Message History
   - Manage Threads (for step 7 polish / per-turn threads)
4. Copy the generated URL at the bottom. Open it in a browser, pick the test server, authorize.

You should now see the bot in your server's member list (offline until you start it).

## Step 6 — Fill in `.env`

Copy `.env.example` to `.env`:

```
cp .env.example .env
```

Edit `.env` and fill in the three values from steps 1, 2, and 4:

```
DISCORD_BOT_TOKEN=<token from step 2>
DISCORD_CLIENT_ID=<application id from step 1>
DISCORD_GUILD_ID=<server id from step 4>
```

**`.env` is gitignored. Never commit it.** If you accidentally commit a token, reset it immediately in the dev portal and update `.env`.

## Step 7 — Run the bot

```
npm run bot
```

Expected output (truncated):

```
[bot] registered /ping as a GUILD command in <guild id> (instant)
[bot] ready — logged in as Polycrisis Dev#1234 (id=…)
[bot] watching 1 guild(s)
[bot] step 1 complete: bot skeleton is alive. /ping to verify.
```

In your discord test server, type `/ping`. The bot should reply with a roundtrip + websocket latency readout.

If you see `[bot] missing required env vars`, the `.env` file isn't being read. Two common causes:

- The bot was started from outside the project root, so `.env` is in a different directory. (We're not using `dotenv` yet — the bot reads `process.env` directly. Make sure you `cd /home/situation/polycrisis` before `npm run bot`.)
- The `.env` file has trailing spaces or the keys are commented out.

## Security notes

- **Never commit `.env`.** It's in `.gitignore`. Verify with `git status` before every commit.
- **Never paste a real token into a chat.** If a token leaks, reset it immediately and update `.env`.
- **The bot doesn't need admin permissions.** The permission set in step 5 is the minimum that lets it post embeds, attach files, and add reactions.
- **Privileged intents are privileged for a reason.** `MessageContent` lets the bot read every message in every channel it can see. The bot only uses it to capture player moves in step 3+. Don't add more privileged intents without a clear reason.

## When you're done

Step 1 (cycle 6a) is complete when:

- [ ] `.env` has the three values filled in
- [ ] `npm run bot` connects to the gateway
- [ ] `/ping` returns a pong in your test server
- [ ] `.env` is NOT in `git status`

Confirm step 1 to proceed to step 2 (`/polycrisis start` posts the seed/turn-1 prose).

## Related docs

- `docs/13-discord-bot-architecture.md` — the architecture spec this setup doc implements
- `src/bot/bot.js` — the bot entrypoint
- `.env.example` — the template you copy into `.env`