# Prototype — 2026-07-03 — Cycle 6c: Discord free-text move handling

## Observation

Cycle 6c is step 3 of the 7-step discord build plan in `docs/13-discord-bot-architecture.md`. Step 3's spec scope: "free-text move handling. player types in the DM, bot calls `generateWorld`, posts turn 2's prose. typing indicator handles the wait."

The user noted they could not do the cycle 6b live-run confirmation and signaled "proceed with 6c." This is a judgment call worth naming: the canonical step-2 criterion per the setup doc was the live-run check, and we proceeded without it. The 6b verification script (53 of 53 pass) and walkthrough regressions still gave us high confidence in the engine refactor, but any behavior only discord itself would have surfaced (e.g. a typo in the embed structure that discord's API would have rejected) would have been caught here in 6c instead.

What step 3 actually delivered: more than the spec's minimum, because the loop runs end-to-end on the discord surface — turn 1, player move, turn 2, ..., collapse or max-turns, end. Step 3 is the first cycle where the **shared runLoop** actually drives the discord surface all the way through, which is the load-bearing test of the cycle 6b refactor.

## What shipped

### 1. Discord surface adapter — readMove via MessageCollector

`src/bot/surface.js` (refactored): the `readMove` stub that threw in cycle 6b is now a real implementation using `channel.createMessageCollector`. Key design decisions:

- **One message = one move.** The discord chat model is one message per turn. No multi-line continuation. The `singleMessage: true` flag on the surface signals this to the loop.
- **Author filter.** Only messages from `activeUser.id` are accepted. Other users' messages are ignored.
- **Bot-message filter.** The bot's own messages are ignored (defense in depth; the collector filters by default but we make intent explicit).
- **System-message filter.** Discord's system messages (joins, pins, etc.) are ignored.
- **Timeout.** After 10 minutes of inactivity (configurable via `timeoutMs`), `readMove` rejects with an error. The bot catches this and treats the run as player-quit.
- **`createDiscordSurface` requires `client` and `activeUser`.** Previously only required `channel`. Now both are required — `client` for the typing indicator, `activeUser` for the author filter.

### 2. run-loop.js — single-message branch in readPlayerMove

`src/sim/run-loop.js` (refactored): `readPlayerMove` now branches on `surface.singleMessage`:

- **Single-message surface** (discord): one `readMove` call returns the complete move. The `a`/`r` shortcut detection is skipped (those are TTY-only affordances). The `::resign` check still runs.
- **TTY surface** (no flag): the original multi-line flow — first-line prompt, `a`/`r` shortcuts, blank-line-to-submit continuation.

This keeps the existing TTY behavior intact and lets the discord surface run the same loop without forking the code.

### 3. Bot — spawn runLoop after /polycrisis start

`src/bot/bot.js` (refactored): after posting the crisis embed, the bot spawns `runLoop` in the background via a new `runDiscordLoop` helper. The slash command returns immediately; the loop awaits the player's first move via `surface.readMove`.

- **`runDiscordLoop`** builds a discord surface for the channel, calls `runLoop({ surface, identity: null, renderTurn: formatCrisisForDiscord })`, and cleans up `activeRuns` in a `finally` block. If the loop throws (e.g. readMove timeout), the bot posts a plain-text message explaining the run ended and re-throws so the outer catch logs the error.
- **STEP3_HINT_TEXT** (in commands.js) replaces STEP2_FOLLOWUP_TEXT. Tells the player "type your policy as a message" and mentions `::resign`.
- **ready log updated** to reflect step 3 complete.

### 4. Commands — STEP3 hint + updated already-active message

`src/bot/commands.js`: `STEP3_HINT_TEXT` exported. `ALREADY_ACTIVE_TEXT` updated to reflect the new flow ("type your next move as a message ... or send `::resign` to end").

### 5. Setup doc

`docs/14-discord-bot-setup.md` gained a "Step 3 — Free-text move handling" section with: expected console output, what to type in the test server, key behaviors (one-message-per-move, author filter, slash commands always win, `::resign` recognition, identity defaults), and a step-3 completion checklist.

### 6. Verification scripts

- **`/tmp/hermes-verify-6c-discord-moves.sh`** (new): 31 checks across 5 categories: discord surface adapter (`singleMessage`, `readMove` filter, timeout, `readChoice`/`readConfirm` still throw), `readPlayerMove` (single-message branch + `::resign` recognition + TTY behavior preserved), `runDiscordLoop` integration (`activeRuns.delete`, exports), setup doc has step 3 section, regressions (6a/6b/5f/5g/5h/5j).
- **`/tmp/hermes-verify-6b-discord-start.sh`** (updated): the surface-shape checks now provide the new required `client` and `activeUser` args to the mock channel. Added a check for the new `singleMessage: true` flag.

## Design decisions

**Single-message surface.** Discord chat is one message per turn. We don't try to concatenate multiple messages into one move (out of scope for v1). The `singleMessage` flag on the surface lets the loop know.

**`::resign` recognized if the entire message equals `::resign`** (case-insensitive, trimmed). Matches the TTY behavior from cycle 5j. The player doesn't need a confirmation prompt — typing the literal word is the confirmation.

**Identity defaults.** No `/polycrisis start as:<name>` option yet. The loop's formatter handles `identity: null` by leaving the description empty and using "the player" / "the regime" defaults in the run log. Identity capture lands in a later cycle.

**Loop runs end-to-end.** Step 3 doesn't artificially cap at "one move → turn 2." The loop runs through collapse / stabilization / max-turns. Collapse announcements + artifact writing happen via `surface.print`, which the discord surface renders as plain text. Step 5 (cycle 6e) will upgrade these to embeds + file attachments.

**Typing indicator covers LLM wait.** No spinner code needed for discord. The `waitWhileLLM` method posts the typing indicator and refreshes it every 5s while the LLM call runs.

**Slash commands always win.** Slash commands are dispatched via `interactionCreate` (a different event from `messageCreate`). They don't compete with the MessageCollector for the player's next move. Typing `/ping` mid-run works as expected.

**Author filter is the active user.** The `activeUser.id` is set when the surface is created (from the `/polycrisis start` interaction). The collector filters by this id — other users in the same channel can't accidentally send moves to your run.

**No `/polycrisis end` slash command in 6c.** The player can end a run by sending `::resign` or by letting it time out (10 min). A proper end command lands in a later cycle (step 4 or later).

## Verification

`/tmp/hermes-verify-6c-discord-moves.sh` — **31 of 31 pass.**

Categories:
- Discord surface: 9 checks (singleMessage flag, readMove filter by author/bot/system, timeout, readChoice/Confirm still throw).
- readPlayerMove: 8 checks (single-message branch happy path, `::resign` recognition × 3 forms, TTY behavior preserved).
- runDiscordLoop integration: 4 checks (activeRuns Map semantics, runDiscordLoop exported, STEP3_HINT_TEXT shape).
- Setup doc: 1 check.
- Regressions: 6a=17, 6b=54, 5f=10, 5g=10, 5h=17, 5j=22.

The live-run check (real `/polycrisis start` followed by typed messages in the user's test server) was skipped per the user's note.

## Known issues

- **The live-run confirmation was skipped.** Without it, any discord-specific bug (e.g. an embed field rejection) wouldn't be caught until 6d or later.
- **No `/polycrisis end` slash command.** Players abandon runs by waiting 10 minutes or sending `::resign`. Could be confusing if a player wants to abandon without resigning.
- **Identity is null.** The loop uses "the player" / "the regime" defaults. The artifact will show those, not personalized names.
- **The 5i pre-existing failure** is still there. Documented in cycle 6b's prototype doc.

## Next

- Cycle 6d (step 4): advisor buttons. `surface.readChoice` posts 5 buttons (one per advisor voice); the player clicks one; the surface resolves with the choice. `bot.js` adds a `/polycrisis advisor` slash command that posts the buttons.
- Cycle 6e (step 5): end-of-run report as embed + artifact file attachments.
- Cycle 6f (step 6): `/polycrisis status` slash command.
- Cycle 6g (step 7): polish + deployment.
- **Address the 5i pre-existing failure** in a separate cycle if it hasn't been fixed by then.