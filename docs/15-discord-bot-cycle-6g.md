# Discord bot — Cycle 6g (step 7 of 7): `end` command + identity capture

Cycle 6g closes the discord build plan. The spec at `docs/13-discord-bot-architecture.md` defines 7 steps; cycles 6a–6f shipped steps 1–6. Step 7 is "polish, edge cases, deployment" — left deliberately vague by the spec so the orchestrator can scope what matters most.

User grounding before code:
- **Q1 (scope).** 6g = `/polycrisis end` slash command + identity capture at `/polycrisis start`. Other polish deferred to future cycles.
- **Q2 (sentinel coexistence).** `::resign` (free-text) stays hidden + undocumented. `/polycrisis end` is the discoverable surface. Both call the same run-end path.
- **Q3 (`/polycrisis artifact`).** skip for 6g — artifacts already attached to the end-of-run embed and on disk.
- **Q4 (identity capture).** optional `as:<name> governing:<regime>` slash args + followup DM if either is missing + default fallback if the player stays silent after one prompt pair.

## behaviors shipped

### 1. `/polycrisis end` slash command

Discoverable, ephemeral-confirmation surface for ending an active run without waiting for collapse, max-turns, or typing `::resign` as a hidden sentinel.

- subcommand definition: `{ name: 'end', description: '...', type: 1 }` added to `POLYCRISIS_COMMAND.options`
- handler: `handlePolycrisisEnd(interaction)`
- pure builder: `buildPolycrisisEndReply(interaction)` — same shape pattern as the other handlers (`{ kind: 'no_active_run', key }` vs `{ kind: 'ending', runState }`)
- rejects if no active run, with the same ephemeral text style as `/status`
- on active run: marks the run as "ending" so the active `MessageCollector` from `surface.readMove` will reject on its next `collect` event with a sentinel "run-ended-by-user" error. The loop's `catch` path already handles this (cycle 6c): posts a plain-text "run ended" message + a "play again" hint, then re-throws. The `runDiscordLoop` outer `try/finally` cleans up `activeRuns`.
- the post is a regular (non-ephemeral) channel message: the ephemeral reply is the acknowledgement that the command fired; the regular message is the in-channel announcement that the run is over. Both are 1 message each, so the player sees both clearly.

### 2. identity capture at `/polycrisis start`

Three-input matrix:

| `as` arg | `governing` arg | behavior |
|---|---|---|
| `X` | `Y` | identity = `{ player: X, regime: Y }`. Post the crisis embed + the STEP3_HINT_TEXT as today. No followup DM. |
| `X` | (omitted/blank) | identity = `{ player: X, regime: null }`. Post the crisis embed + a followup DM asking for the institution name. The followup uses discord's DMs (the user already has an open DM with the bot from the `/start` slash interaction). |
| (omitted/blank) | `Y` | identity = `{ player: null, regime: Y }`. Post the crisis embed + followup DM asking for the player's name. |
| (omitted/blank) | (omitted/blank) | identity = `{ player: null, regime: null }`. Post the crisis embed + followup DM asking for both, in two sequential messages. |
| either | either | if the player does not answer the followup DM within the next 5 minutes OR before sending their first in-channel move, defaults are applied (`{ player: 'the player', regime: 'the regime' }`). |

The fall-back timing matters: identity capture is **best-effort** — the simulation never stalls waiting for it. The first in-channel move after `/start` triggers the engine with whatever identity we have at that moment (full input → user input → defaults → defaults).

### 3. identity threading

`activeRuns` entry gains top-level fields:

- `player` (string) — what the player calls themselves; defaults to `'the player'`
- `regime` (string) — what the player calls the institution; defaults to `'the regime'`

These names match the fields `formatStatusEmbed` already reads at line 495 of `src/sim/surface.js`. No embed change needed.

The identity is set by `buildPolycrisisStartReply` and stored in `activeRuns` alongside `seed`, `crisis`, etc. The followup DM uses a private `pendingIdentity` field on the entry:

- `pendingIdentity: { player: string | null, regime: string | null, askedAt: ISO timestamp }`
- when the player DMs back, the bot updates `pendingIdentity` and clears the field once both fields are filled (or once the default-fallback path applies)
- the in-channel `readMove` MessageCollector filters out DM messages (it only collects from `interaction.channel`), so the DM response arrives in parallel and updates the entry out-of-band

The bot reads `runState.player` + `runState.regime` (NOT `runState.identity`) for:
- the status embed (already wired — `formatStatusEmbed` reads them)
- the `consult()` call when the player asks an advisor mid-run (cycle 6d currently passes `identity: null`; 6g threads the captured identity here)
- the `runLoop()` call from `runDiscordLoop` (currently passes `identity: null`; 6g threads the captured identity here)

### 4. slash option validation

Two new optional options on `POLYCRISIS_COMMAND.start`:

```js
{
  name: 'start',
  description: '...',
  type: 1,
  options: [
    { name: 'seed_id', type: 3, required: false, description: '...' },
    { name: 'as', type: 3, required: false, description: '(Optional) what to call you in this run. Blank for default.' },
    { name: 'governing', type: 3, required: false, description: '(Optional) what to call the institution you govern. Blank for default.' },
  ],
},
```

discord's slash command string options have a max length of 100 chars. Both new options enforce this implicitly (discord rejects longer strings at the API layer). The engine doesn't impose its own cap — defaults apply if blank.

## files changed

- `docs/15-discord-bot-cycle-6g.md` (this file — design record)
- `src/bot/commands.js`:
  - `POLYCRISIS_COMMAND.options[start]` adds `as` + `governing` options
  - new `end` subcommand
  - new `buildPolycrisisEndReply(interaction)` pure builder
  - update `buildPolycrisisStartReply(interaction)` to read `as` + `governing` options, build identity, set `player` + `regime` + `pendingIdentity` on the entry
  - exports + display text constants
- `src/bot/bot.js`:
  - `handlePolycrisisStart`: after posting the embed + STEP3_HINT_TEXT, if `pendingIdentity` is non-empty, send a followup DM asking for the missing field(s)
  - new `handlePolycrisisEnd`
  - `messageCreate` handler: if a DM arrives and the sender has an active run with `pendingIdentity`, resolve the pending prompts
  - `runDiscordLoop`: pass `identity: { player: runState.player, regime: runState.regime }` to `runLoop` instead of `null`
  - `handleAdvisorButtonClick`: pass `identity: runState` (or the captured identity) to `consult()` instead of `null`
- `wiki/index.md` + `wiki/log.md`: record the spec
- `scripts/wiki-quality-audit-2a.md` style ad-hoc verification at `/tmp/hermes-verify-6g-end-and-identity.sh`

## what's NOT shipped in 6g (per Q1 + Q3 + R5)

- `/polycrisis artifact` slash command (deferred — Q3)
- corpus quote during the typing indicator (deferred — nice-to-have, spec marks "less critical")
- walkthrough sub-regression flakiness (deferred — known-good-by-baseline)
- crash-recovery hardening (deferred — v1 spec acceptable)
- deployment (separate cycle per user instruction)

## verification strategy

- per-cycle ad-hoc script at `/tmp/hermes-verify-6g-end-and-identity.sh` (no canonical test suite for polycrisis)
- covers:
  - `POLYCRISIS_COMMAND.options` contains `as` + `governing` (both optional strings) and `end` subcommand
  - `buildPolycrisisStartReply` reads both new options and sets `player` + `regime` + `pendingIdentity` correctly across the 5 cases above
  - `buildPolycrisisEndReply` returns `no_active_run` when key absent and `ending` + runState when present
  - identity is stored with defaults applied on the "no followup answer" path
  - `runDiscordLoop` passes the captured identity to `runLoop` (mocked, no real network)
  - `consult()` receives identity from `runState.player`/`runState.regime`
  - regression sanity against the prior cycles' verifications
- mocks LLM + discord I/O via `require.cache` substitution; never makes a real network call

## sources

- conversation ground: user pre-confirmed scope (Q1–Q4) and design (R1–R4) before any code
- spec: `docs/13-discord-bot-architecture.md` step 7 + build-plan row 7
- prior cycle contracts preserved: 6a (skeleton), 6b (`/start` + surface adapter), 6c (free-text moves + MessageCollector), 6d (advisor buttons + `consult()`), 6e (end-of-run embed + attachments), 6f (`/status` + `onTurnStart` snapshot + `formatStatusEmbed`)
- terminal identity: `src/sim/identity.js` (`DEFAULT_PLAYER`, `DEFAULT_REGIME`, `promptForIdentity`) — the discord version follows the same defaults + no-validation-on-blank policy
