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

## Step 2 — Try `/polycrisis start`

Once step 1 lands (gateway connected, `/ping` works), restart the bot:

```
npm run bot
```

Expected output (truncated):

```
[bot] registered 2 command(s) as GUILD commands in <guild id> (instant)
[bot]   - /ping
[bot]   - /polycrisis <subcommand>
[bot] ready — logged in as <bot tag> (id=…)
[bot] watching 1 guild(s)
[bot] step 2 complete: /polycrisis start posts turn 1 as an embed. /ping still works.
```

In your discord test server (or in a DM with the bot), type `/polycrisis start`. The bot should reply with a discord embed containing:

- **Title:** the crisis title (e.g. "OpenAI seed")
- **Situation field:** the seed's 5–6 sentence briefing as the turn-1 crisis
- **Pressure & Decision point field:** a deferred note ("Pressure and decision point will be generated after your first move")

After the embed, the bot sends an ephemeral followup noting that free-text move handling arrives in step 3.

### Optional: specify a seed

`/polycrisis start seed_id:<id>` picks a specific seed from the curated set instead of choosing at random. To find the available seed ids, look at `scripts/seed-variants.js` (each entry has an `id` field like `meta-content-moderation`, `crisis-7`, etc.). If the id doesn't match any seed, the bot posts a warning and falls back to a random seed.

### Rejecting a second run

If you type `/polycrisis start` again while a run is still active for you in the same channel/DM, the bot replies (ephemeral) with "You already have an active run in this channel." This is the spec's "one run per channel-or-DM per user" rule.

For step 2, the bot has no `/polycrisis end` shortcut, so if you want to abandon an active run, you'll have to restart the bot (the run state is in-memory). Step 3 (cycle 6c) will add proper move handling and a way to end runs.

### What "step 2 complete" means

- [ ] `/polycrisis start` posts a discord embed with the seed's situation as the first crisis
- [ ] `/polycrisis start seed_id:<id>` honors the specified seed id (or warns on unknown)
- [ ] A second `/polycrisis start` is rejected with the "already have an active run" message
- [ ] `/ping` still works

Confirm step 2 to proceed to step 3 (free-text move handling in DMs — typing the indicator handles the LLM wait).

## Step 3 — Free-text move handling

Once step 2 lands (the bot posts the turn-1 crisis embed), restart the bot:

```
npm run bot
```

Expected output (truncated):

```
[bot] registered 2 command(s) as GUILD commands in <guild id> (instant)
[bot]   - /ping
[bot]   - /polycrisis <subcommand>
[bot] ready — logged in as <bot tag> (id=…)
[bot] watching 1 guild(s)
[bot] step 3 complete: /polycrisis start runs the loop end-to-end; type your move as a message.
```

In your discord test server (or in a DM with the bot):

1. Type `/polycrisis start`. The bot posts the turn-1 crisis as an embed and an ephemeral followup explaining how to submit moves.
2. Type your policy as a message in the same channel/DM. The bot shows "Bot is typing..." while the LLM interprets your move (15–30s typical).
3. The bot posts turn 2's crisis as a new embed. Repeat from step 2.
4. The run ends when the regime collapses, when the run reaches the dynamic turn cap, or after ~10 minutes of inactivity (treated as player-quit).

### Key behaviors (cycle 6c)

- **One message = one move.** Discord chat doesn't have a "blank line ends the move" affordance; each message you send in the channel becomes one move. For long policies, paste the whole text into a single message (Shift+Enter on desktop).
- **Other users' messages are ignored.** The bot only accepts moves from the user who started the run in this channel/DM.
- **Slash commands always win.** Typing `/ping` while a run is active runs the ping command and doesn't disrupt the loop.
- **`::resign` to end a run.** Send a message containing exactly `::resign` (no other text) to end the run immediately. No confirmation prompt (deliberate: typing it is the confirmation).
- **Identity defaults.** For step 3, the simulation uses "the player" / "the regime" defaults — there's no `/polycrisis start as:<name>` option yet. Identity capture will land in a later step.

### What "step 3 complete" means

- [ ] `/polycrisis start` posts the crisis embed + an ephemeral hint
- [ ] Typing a policy message triggers the typing indicator and produces turn 2's crisis
- [ ] Multiple turns can be played in one session
- [ ] A collapse / stabilization / max-turns end fires the artifact-writing flow (artifact files appear in `./runs/`)
- [ ] `/polycrisis start` again is allowed after the previous run ends
- [ ] Sending `::resign` ends the run cleanly

Confirm step 3 to proceed to step 4 (advisor buttons — `/polycrisis advisor` shows 5 buttons; click posts the advisor's response).

## Step 4 — Advisor buttons

Once step 3 lands (the loop runs end-to-end with free-text moves), restart the bot:

```
npm run bot
```

Expected output (truncated):

```
[bot] registered 2 command(s) as GUILD commands in <guild id> (instant)
[bot]   - /ping
[bot]   - /polycrisis <subcommand>
[bot] ready — logged in as <bot tag> (id=…)
[bot] watching 1 guild(s)
[bot] step 4 complete: /polycrisis advisor posts a 5-button row; click an advisor to consult.
```

In your discord test server (or DM with the bot):

1. `/polycrisis start` to begin a run (if you don't already have one active).
2. `/polycrisis advisor` — the bot posts a message with 5 buttons (Frontier Lab, Civil Society, State Security, Open Source, International Ally) and a header explaining the advisor flow.
3. Click one of the buttons. The bot shows "Bot is typing..." while it calls the LLM (15–30s typical), then edits the reply with an embed containing the advisor's response.

### Key behaviors (cycle 6d)

- **Requires an active run.** `/polycrisis advisor` rejects with an ephemeral message if no run is active in this channel/DM. Start one with `/polycrisis start` first.
- **Only the active user can click.** Other users who click an advisor button get an ephemeral "only the user with the active run can click advisor buttons" reply.
- **Advisors describe, don't recommend.** Per docs/10-advisor-prompts.md, the advisor's response describes how that voice sees the current crisis. It doesn't recommend a specific action — the player writes their own policy.
- **One message = one consult.** Each click produces one advisor response. Players can click multiple buttons in succession; each produces its own response.
- **Advisor context uses the run's seed crisis.** v1 simplification: the advisor's corpus retrieval uses the seed (turn-1) as the crisis context, not the latest turn's crisis. The advisor's response is still corpus-grounded, just slightly less turn-specific. Future cycles can thread the latest crisis into the run state for sharper context.
- **Free-text moves still work.** Clicking an advisor button doesn't disrupt the loop's MessageCollector waiting for the player's next move. The two event paths (`interactionCreate` for buttons, `messageCreate` for moves) are independent.

### What "step 4 complete" means

- [ ] `/polycrisis advisor` posts a message with 5 buttons
- [ ] Clicking an advisor button posts an embed with the advisor's response
- [ ] `/polycrisis advisor` rejects when no run is active
- [ ] Clicking from a non-active user gets an ephemeral "not your button" reply
- [ ] Free-text move handling (from step 3) still works

Confirm step 4 to proceed to step 5 (end-of-run report as embed + artifact file attachments).

## Step 5 — End-of-run report as embed + artifact attachments

Once step 4 lands (advisor buttons work mid-run), restart the bot:

```
npm run bot
```

When a run ends — collapse, stabilization, max-turns, or your `::resign` — the bot posts:

1. **A polished discord embed** with:
   - **Title** — outcome-flavored (`"The regime fell"`, `"The regime held"`, `"The run ended"`, `"You resigned"`) + run id
   - **Description** — the narrator's narrative summary of the run (curated by the `narrateRunEnd` LLM call; falls back to a mechanical summary if the narrator is unavailable)
   - **Fields** — Outcome / Turns completed / Player / Regime / Key moment / Invitation / Final state (the 6 axes' values and bands)
   - **Color** — outcome-flavored (warm red for collapse, muted green for stabilized, archival neutral for no-collapse, muted gray for player-quit)
   - **Footer** — model name
2. **Two file attachments**:
   - `<runId>-artifact.md` — the canonical markdown artifact (8 sections, all per-turn detail, all grounding traces)
   - `<runId>-artifact.html` — the self-contained HTML artifact (FNV-1a content hash, ready to share)
3. **A plain-text followup** — "Run complete. The artifact files are attached above (`<runId>-artifact.md` for the canonical markdown, `<runId>-artifact.html` for the shareable HTML). Type `/polycrisis start` to begin a new run."

The files are also written to `./runs/` on disk for the orchestrator's audit trail.

### Key behaviors (cycle 6e)

- **Suppressed verbose TTY banner.** Discord no longer shows the multi-message sequence of `─── Generating artifact ───` + filesystem paths. The polished embed replaces it.
- **Both artifact formats attached.** Markdown is the canonical source for handoff and audit. HTML is the shareable version (self-contained, FNV-1a content hash).
- **`runLog` (per-turn debug log) stays on disk only.** Not attached to discord — that's the orchestrator's debug record, not player-facing.
- **Outcome-color encoding.** Each outcome type has a distinct embed color. Players learn to read the embed's color as a quick "how did the run end" signal.
- **Fallback note.** When the narrator LLM is unavailable, the embed includes a "Note" field: "_Narrator unavailable; using the mechanical summary._" — preserves the case-study claim.

### What "step 5 complete" means

- [ ] A collapse / stabilization / max-turns / resign ends the run with a polished discord embed
- [ ] The embed includes 2 file attachments (markdown + html)
- [ ] A plain-text followup hints at `/polycrisis start` to begin a new run
- [ ] Artifact files appear in `./runs/` (for orchestrator audit)
- [ ] No multi-message plain-text "Generating artifact" sequence on discord
- [ ] The embed color matches the outcome

Confirm step 5 to proceed to step 6 (`/polycrisis status` slash command).

## Step 6 — `/polycrisis status` slash command

Once step 5 lands (end-of-run report + attachments work), restart the bot:

```
npm run bot
```

In your discord test server (or DM with the bot):

1. `/polycrisis start` to begin a run (if you don't already have one active).
2. At any point during the run, type `/polycrisis status`. The bot replies with an embed showing the current state.
3. Continue playing — `/status` is read-only and doesn't disrupt the loop.

### What the status embed shows

- **Title** — `Status — Turn N — <crisis title>` (the current turn number + the title of the crisis the player is reasoning about).
- **Color** — band-driven. All axes in the `holding` band → muted green. Any axis in the `collapsed` band → warm red. Otherwise → muted archival neutral. Gives a quick visual signal of the regime's state.
- **Axes field** — all 6 axes with current value + band (e.g. `legitimacy: 45 (eroded)`).
- **Turn** — current turn number.
- **Player / Regime** — the player and institution from the run's identity.
- **Model** — the model used for the run.
- **Current situation** — a brief snippet of the current crisis's situation text (helps the player recall what they're deciding on after scrolling away).
- **Footer** — `Run <runId>`.

### Key behaviors (cycle 6f)

- **Requires an active run.** `/polycrisis status` rejects with an ephemeral message if no run is active in this channel/DM.
- **Mid-run snapshot.** Status reflects the state at the most recent turn. The loop's `onTurnStart` callback snapshots the pre-delta state + current crisis into the `activeRuns` entry at the top of each turn; `/status` reads that snapshot.
- **Read-only.** Doesn't change any game state. Safe to call repeatedly.
- **Color is band-driven.** See the table above.

### What "step 6 complete" means

- [ ] `/polycrisis status` posts a status embed with all 6 axes + bands + turn + crisis
- [ ] The embed color reflects the current band distribution (green / red / neutral)
- [ ] Calling `/status` multiple times mid-run shows the same data (no drift)
- [ ] `/polycrisis status` rejects with an ephemeral "no active run" if no run is active
- [ ] The end-of-run report (step 5) and the move handling (step 3) still work

Confirm step 6 to proceed to step 7 (polish + deployment).

## Related docs

- `docs/13-discord-bot-architecture.md` — the architecture spec this setup doc implements
- `src/bot/bot.js` — the bot entrypoint
- `.env.example` — the template you copy into `.env`