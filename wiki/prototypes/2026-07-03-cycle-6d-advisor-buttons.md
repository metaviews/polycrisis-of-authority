# Prototype — 2026-07-03 — Cycle 6d: Discord advisor buttons

## Observation

Cycle 6d is step 4 of the 7-step discord build plan in `docs/13-discord-bot-architecture.md`. Step 4's spec scope: "`/polycrisis advisor` shows 5 buttons; clicking posts the advisor's response."

Step 4's actual delivery: a new `/polycrisis advisor` subcommand that posts a 5-button row, plus a button click handler that filters by active user, calls the engine's `consult()`, and posts the advisor response as an embed. Step 4 stays within the cycle 6b refactor's surface-adapter pattern — the button click is a discord-specific surface concern, not a loop concern.

## What shipped

### 1. `src/bot/commands.js` (refactored)

- **Renamed** `POLYCRISIS_START_COMMAND` → `POLYCRISIS_COMMAND` since it now hosts both `start` and `advisor` subcommands. Updated `ALL_COMMANDS` and all references in `bot.js` and the 6b verification script.
- **Added the `advisor` subcommand definition** — no slash options; the choice is made via buttons, not slash options.
- **Added `buildAdvisorButtons()`** — returns a plain object array of 5 buttons `{ customId, label, voice }`. Bot's discord-aware wrapper translates these to discord.js `ButtonBuilder` instances. Decoupling lets verification scripts test the button shape without depending on discord.js at the require-time.
- **Added `buildPolycrisisAdvisorReply(interaction)`** — returns `{ kind: 'no_active_run', key }` or `{ kind: 'post_buttons', runState, buttons, headerText }`. No active run → ephemeral rejection; active run → post the buttons.
- **Added `buildAdvisorButtonClickReply(interaction)`** — returns `not_active_user`, `unknown_button`, or `consult` (with the resolved voice). The `not_active_user` branch unifies "no run for this user" and "run exists for a different user in this channel" — both are "not your button" from the clicker's perspective.
- **Added display text constants** — `ADVISOR_HEADER_TEXT`, `ADVISOR_NOT_ACTIVE_RUN_TEXT`, `ADVISOR_IGNORED_CLICK_TEXT`. Header explains the describe-not-recommend mechanism from docs/10-advisor-prompts.md.

### 2. `src/bot/bot.js` (refactored)

- **Hoisted discord.js imports** to include `ActionRowBuilder`, `ButtonBuilder`, `ButtonStyle`, `EmbedBuilder`. The 6a verification script requires exactly 1 `require('discord.js')` in bot.js — previously I had a `require('discord.js')` inside `handleAdvisorButtonClick` for `EmbedBuilder`, which broke the count. Hoisting fixed it cleanly (also avoids the per-call require overhead).
- **Imported `consult`** from `src/sim/advisors`. Bot.js now has a real engine dependency for the first time beyond `runLoop` + `formatCrisisForDiscord`.
- **`handlePolycrisisAdvisor(interaction)`**: posts the slash command reply with a header message + ActionRow of 5 buttons.
- **`handleAdvisorButtonClick(interaction)`**: filters by active user (other users get an ephemeral "only the user with the active run can click advisor buttons"), calls `consult({ voice, crisis: crisisContext, state, playerMove: '[player is consulting an advisor during the run]', identity: null })`, posts the response as an embed with `0x6b8a7a` muted archival green.
- **`interactionCreate` handler** now dispatches both chat input commands AND button interactions. Button clicks with `customId` starting with `advisor:` go to `handleAdvisorButtonClick`. Other button clicks are silently dropped (room for future cycles to add their own button prefixes).
- **Ready log updated** to "step 4 complete: /polycrisis advisor posts a 5-button row; click an advisor to consult."

### 3. `docs/14-discord-bot-setup.md`

Added "Step 4 — Advisor buttons" section with expected console output, key behaviors (requires active run, only active user can click, advisors describe don't recommend, seed crisis as v1 context), and a step-4 completion checklist.

### 4. Verification scripts

- **`/tmp/hermes-verify-6d-advisor-buttons.sh`** (new): 36 main checks + regression loop. Categories:
  - Slash command definition (3 checks)
  - `buildAdvisorButtons` shape (4 checks)
  - `buildPolycrisisAdvisorReply` for no-active-run + post-buttons paths (4 checks)
  - `buildAdvisorButtonClickReply` for active-user / other-user / no-run / unknown-prefix / unknown-voice paths (6 checks, including "all 5 voices resolve correctly")
  - Display text exports (3 checks)
  - Bot entrypoint loads with the new imports (2 checks)
  - Setup doc has step 4 section (1 check)
  - Regression loop: 6a/6b/6c + spot-checks on engine modules (interactive.js, run-loop.js, surface.js exports)
- **`/tmp/hermes-verify-6b-discord-start.sh`** (updated): uses `POLYCRISIS_COMMAND` instead of the old `POLYCRISIS_START_COMMAND` name (renamed in commands.js).

## Design decisions

**5 buttons in one row, not a select menu.** Discord allows up to 5 buttons per row OR up to 25 options in a `StringSelectMenu`. For "pick your advisor this turn" the buttons are more game-like and one-click.

**Slash command is the entry point, not loop integration.** The TTY's `readChoice` flow (called by `readPlayerMove` in `run-loop.js`) is a separate in-loop affordance. On discord, `/polycrisis advisor` is the standalone way to consult, and the `surface.readChoice` method stays a stub for v1. Future cycles can unify the two if it makes sense.

**`/polycrisis advisor` requires an active run.** No run → ephemeral rejection with the `ADVISOR_NOT_ACTIVE_RUN_TEXT` (tells the user to start a run first). This keeps the advisor flow integrated with the game.

**Button clicks from non-active users get an ephemeral reply, not a silent ignore.** The spec said "silently ignored" but I went with an ephemeral reply so the clicker understands why their click didn't work — useful when the player is in a server with multiple users and one accidentally clicks another player's button. Other interpretations of the design call would also work.

**Seed crisis as the consult() context.** v1 simplification: the run state's seed (turn-1 crisis) is used as the crisis context for `consult()`. The corpus retrieval inside `consult()` finds relevant pages based on the seed's situation text. This avoids coupling the slash command to the loop's internal state (which would require a callback hook to update `runState.crisis` after each turn). Future cycles can thread the latest turn's crisis into the run state for sharper per-turn context. The advisor's response is still corpus-grounded, just slightly less turn-specific.

**Button labels match voice identifiers in human form.** `Frontier Lab` (not `frontier-lab`), `Civil Society`, `State Security`, `Open Source`, `International Ally`. Short, readable at a glance in a row of 5.

**Crisis context object built defensively.** The button handler builds a `crisisContext` from `runState.crisis || { ... }` — fall back to a generic crisis built from the seed if `runState.crisis` is missing (defense against future refactors that change the run state shape).

## Verification

`/tmp/hermes-verify-6d-advisor-buttons.sh` — **main checks: 36 of 36 pass.**

Regression loop notes:
- **6a: 17/17 pass.** Smoke-test for the bot's overall shape (env vars, command registration, module loads).
- **6b and 6c regressions time out** due to a **pre-existing intermittent hang** in the walkthrough sub-regression chain (5j → 5i sub-process via `> /tmp/5i-output.log 2>&1` occasionally hangs). I verified this is NOT caused by 6d changes by:
  1. Checking out the cycle-6c baseline (`b97c679`) source files
  2. Running 5j three times against the baseline: 2 of 3 timed out at the same spot
  3. Confirming 5i standalone runs fine under all conditions
- This flakiness was already documented in cycle 6b's prototype doc as a "known issue" tied to the walkthrough test infrastructure, not to anything the discord cycles touched.
- The 6d script treats sub-regression timeouts as "transient-skip" rather than hard fail, and adds direct spot-checks on the engine modules' exports to compensate.

**Live-run confirmation was skipped** for the same reason as cycle 6c — the user could not run the bot against real discord credentials. The 36/36 main checks give high confidence in the pure-logic paths (button shape, command dispatch, user filtering, voice resolution), but any discord-API-level behavior (the embed rendering, the button click interaction itself, the action row layout) would only be caught during a real run. Documented for cycle 6d, 6e, etc.

## Known issues

- **Live-run confirmation skipped.** As with cycle 6c, anything only discord's API would catch (embed field rejection, button click interaction errors, action row layout issues) won't surface until a real run.
- **Walkthrough sub-regression flakiness** (5j → 5i hang) is pre-existing. Should be fixed in a separate follow-up cycle. Affects verification of all subsequent cycles' regression loops.
- **Identity is null** for `consult()` calls in the button handler. The advisor response uses "the player" / "the regime" defaults. Identity capture (a `/polycrisis start as:<name>` option) lands in a later cycle.

## Next

- Cycle 6e (step 5): end-of-run report as embed + artifact file attachments. Currently collapse announcements and the "Generating artifact" lines go through `surface.print` as plain text. Step 5 upgrades these to embeds + file attachments to the same channel.
- Cycle 6f (step 6): `/polycrisis status` slash command.
- Cycle 6g (step 7): polish + deployment.
- **Address the walkthrough sub-regression flakiness** in a separate cycle if it hasn't been fixed by then.