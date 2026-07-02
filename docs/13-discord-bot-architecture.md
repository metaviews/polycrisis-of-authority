---
title: "Discord bot architecture — spec and build plan for the next player surface"
description: "Architecture and build plan for the discord bot interface. Cycle 5e closed the terminal-version feedback; this doc captures the next-iteration design before any code is written. Spec-only — see Phase 5e (feedback cycle) and the inline checklist at the bottom for what triggers this work."
type: prototype
subtype: design-spec
version: "0.1.0"
last_updated: "2026-06-29"
grounded_in:
  - "docs/12-handoff-protocol.md"
  - "docs/02-design-principles.md"
---

# Discord bot architecture — spec and build plan

_This is a design spec, not code. It captures the architecture for the discord bot interface before any code is written. Filed during the post-cycle-5e planning conversation. Once the user decides to start the build, this doc becomes the entry point for cycle 5f (or whichever cycle is named when the discord work begins)._

## Why discord before web

After the cycle 5e walkthrough, the user proposed two next-iteration options: a discord bot, or a web interface. The decision was **discord first, then web after multi-player feedback**.

Reasons:

- **discord is the host.** zero infrastructure (or close to it). a single node process connects to discord and runs. no server, no database, no deployment pipeline.
- **typing indicator solves the spinner problem for free.** discord's "Bot is typing..." UX is built in. the terminal version's pendulum spinner (cycle 5b.5) was a workaround; discord doesn't need it.
- **buttons and dropdowns are a better UX than the terminal's `a`-to-consult-advisor flow.** principal 4.2 (easy mode is welcome) is more naturally expressed as clickable buttons than as typed commands.
- **multi-player is built in.** inviting players to a discord server is the entire onboarding. the principle 6 litmus test (does the experience make you want to play again?) can be tested with a small group without building a separate auth layer.
- **faster to playable.** roughly 3-4 days of focused work to a playable v1, vs. 1-2 weeks for the web version.

web is the long-term player surface (lower friction for the broader edutainment audience that won't install discord). discord gets you player feedback first.

## Architecture

### overall shape

a single node process that:

1. connects to the discord gateway via discord.js
2. exposes slash commands + accepts free-text moves
3. maintains a **run state machine** in memory (with optional sqlite persistence for crash recovery, v2)
4. delegates the LLM work to the existing `world-generator.js` and `post-game-narrator.js` — **no changes to the simulation engine**
5. posts turn content as discord embeds, attaches artifacts as files at run end

the process can run anywhere: a laptop with the bot pointed at a test server, a small VPS, fly.io, glitch.com, or a free-tier oracle cloud VM. infrastructure cost is near zero.

### player surface

the bot lives in a discord server. players interact via:

- **slash commands** — `/polycrisis` for the root command with subcommands (start, move, advisor, status, end, artifact)
- **free-text messages** — once a run is active, anything typed in the channel (or DM) is treated as the player's move
- **button interactions** — advisor selection uses buttons; "play again" / "share" at run end uses buttons

the player can run a session in **a discord channel** (multi-player visible) or in **a DM with the bot** (private, single-player). DM mode is the canonical one for the litmus test.

### slash command tree

```
/polycrisis
├── start [seed-id]
│   └── starts a new run. if seed-id is given, uses that seed; otherwise
│       the world generator picks one.
│
├── move <text...>
│   └── submits a move to the active run. most players will just type
│       the move text in the channel without using this command; the
│       slash command is for clarity / accessibility.
│
├── advisor
│   └── shows 5 buttons (frontier-lab, civil-society, state-security,
│       open-source, international-ally). clicking one posts the
│       advisor's corpus-grounded response as a follow-up message
│       and prompts the player for their move.
│
├── status
│   └── shows the current state of the active run as an embed with the
│       6 axes, bands, and turn count. useful if a player walks away
│       and comes back.
│
├── end
│   └── ends the current run without finishing it. records outcome as
│       'player-quit' in the run log.
│
└── artifact
    └── re-posts the artifact file in the channel. useful if the player
        scrolled past it.
```

most of the loop is slash-command-free: the player types their move, the bot responds. slash commands are for explicit states (start, advisor, end, status, artifact).

### run state machine

each run has a state machine:

```
[ idle ] → /start → [ active:turn-N ]
                          │
                          ├─ player text → /move → world-generator → [ active:turn-(N+1) ]
                          │
                          ├─ /advisor → 5 buttons → click → advisor text → [ active:turn-N (waiting for move) ]
                          │
                          ├─ /end → [ ended:player-quit ]
                          │
                          └─ world-generator returns outcome = 'collapse' / 'stabilized' / 'no-collapse' →
                              post-game-narrator → [ ended ]
                                  │
                                  └─ artifact file attached → "play again" button → /start
```

**one run per channel/DM at a time.** a second `/start` while a run is active either rejects ("you have a run in progress, /end first") or ends the current one and starts a new one. default: reject with a button to confirm.

**run identity:** `runId = <channel-or-DM-id>:<user-id>` (per-user-per-channel). if a user runs in two channels, they get two runs. if a user runs twice in the same channel, the second one ends the first.

### per-turn message shape

each turn renders as a single discord embed with fields:

```
──────────────────────────────────────────────
  POLYCRISIS · Turn 2 · Run #2026-06-29-abc123

  Anthropic has agreed to a 90-day review window.

  ▼ Headlines (committed events)                   [if turn 2+]
    • The Mythos release was announced today.
    • The press is calling it a fait accompli.

  Situation:                                        [field]
    Anthropic has agreed to a 90-day review window.
    A second lab is rumored to be planning a similar
    release.

  Pressure:                                         [field]
    The next 30 days will determine whether other labs
    follow Anthropic's example or accelerate their
    own timelines.

  Decision point:                                   [field]
    How do you handle the rumored second release?

  ─ Corpus grounding: Algorithmic Authority         [footer / small text]
    "By 2017, the analysis evolved to consider the
    automation of law and the court of public
    opinion..."

  Your move:                                        [below the embed]
  Or click here for an advisor →                    [button]
──────────────────────────────────────────────
```

the player types their move in the channel. if they type `a` or click the advisor button, the bot posts 5 buttons (one per advisor), and the response comes as a follow-up message with the advisor's voice + the move prompt.

**the typing indicator handles the "interpreting your move" wait automatically** — discord shows "Bot is typing..." until the LLM call returns. no spinner code needed. this is the killer feature of the discord interface: it solves the "did the system hear me?" anxiety that was a real friction in the terminal version (cycle 5b.5 added a pendulum spinner for this; discord doesn't need one).

### the artifact at run end

when the run ends (collapse / stabilization / max-turns / `/end`), the bot:

1. posts the **end-of-run narrative** as an embed (the same content as `renderEndOfRunReport`)
2. attaches the **full artifact** as a markdown file: `polycrisis-<runId>-artifact.md`
3. attaches the **self-contained HTML artifact** as an HTML file: `polycrisis-<runId>-artifact.html`
4. posts a "play again" button. clicking starts a new run with `/start`.

the artifact files are the same files the terminal version produces. the bot just attaches them rather than writing them to `runs/` (though it can still write them to disk for the operator's audit log).

## data model

### runs table (sqlite, optional in v1)

```sql
CREATE TABLE runs (
  run_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  outcome TEXT,                      -- 'collapse' / 'stabilized' / 'no-collapse' / 'player-quit' / null
  turns_completed INTEGER,
  artifact_md_path TEXT,
  artifact_html_path TEXT
);

CREATE TABLE turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  crisis_json TEXT NOT NULL,
  player_move TEXT,
  advisor_used TEXT,
  grammar_output_json TEXT NOT NULL,
  world_json TEXT,
  world_fallback INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(run_id)
);
```

this lets the bot resume a run if it crashes mid-game, and gives the operator a queryable record of all runs across all players. cycle 4b's run-query tool can be extended to read this.

**for v1, sqlite is optional.** the bot can run with in-memory state only and write artifacts to disk. sqlite is a v2 feature for when there are multiple players or when the bot runs persistently.

### persistence policy

- **runs in progress** — stored in memory; sqlite on disk for crash recovery (v2)
- **completed runs** — written to disk as run log + artifact files; sqlite record for queryability (v2)
- **per-turn details** — in memory during the run; written to sqlite + run log at run end
- **no PII retention** — the player's moves are kept (case-study claim), but no other identifying info beyond the discord user id

## what runs on the existing simulation engine

nothing changes. the bot imports the existing modules:

```js
const { selectSeed } = require('./scripts/seed-variants');
const { generateWorld } = require('./src/sim/world-generator');
const { interpret } = require('./src/sim/grammar');
const { narrateRunEnd, renderEndOfRunReport } = require('./src/sim/post-game-narrator');
const { consult, ADVISOR_VOICES } = require('./src/sim/advisors');
const { INITIAL_STATE, applyDelta, checkCollapse, withBands } = require('./src/sim/state');
```

the bot is a thin wrapper that:
- manages discord-specific I/O
- persists run state
- delegates the simulation to the existing engine

the simulation's *behavior* — the LLM call, the state machine, the collapse detection, the corpus grounding — is unchanged.

## file layout

```
polycrisis-of-authority/
├── src/
│   ├── sim/                    ← existing simulation engine
│   │   ├── world-generator.js
│   │   ├── post-game-narrator.js
│   │   └── ...
│   └── bot/                    ← new: discord-specific code
│       ├── bot.js              ← main entrypoint
│       ├── commands.js         ← slash command handlers
│       ├── runs.js             ← run state machine
│       ├── embeds.js           ← discord embed formatting
│       └── interaction.js      ← button / dropdown handlers
├── scripts/
├── docs/
├── wiki/
├── runs/                       ← local artifact storage
└── bot.db                      ← sqlite (v2)
```

the simulation engine stays in `src/sim/`. the bot code goes in `src/bot/`. no cross-contamination — the engine doesn't know about discord; the bot doesn't know about state machine details.

## discord-specific affordances

things that work better in discord than in the terminal:

- **typing indicator.** solves the "is the system working?" problem the terminal version has.
- **buttons + dropdowns.** the `a`-to-consult-advisor flow becomes a real menu. principle 4.2 (easy mode is welcome) is *much* easier to express in a chat UI.
- **embeds.** the situation/pressure/decision point becomes a structured card, not flowing text. easier to scan.
- **reactions.** players can react to a turn with 👎 if a move felt ignored, 👀 if they're not sure what to do, etc. low-cost feedback signal.
- **file attachments.** the artifact is downloadable. shareable in any channel.
- **threads.** the bot can post the per-turn content in a thread to keep the main channel tidy while preserving the narrative flow.
- **voice channels.** the bot could play the situation/pressure aloud via TTS. out of scope for v1 but worth noting.
- **search.** discord's full-text search across the server lets players re-find past runs by keyword.

## discord-specific challenges

- **rate limits.** discord limits messages per channel per second. the bot uses a typing indicator (rate-limit-friendly) instead of sending multiple messages.
- **message length.** discord embeds cap at 4096 chars for the description and 1024 chars per field. the post-game narrative might need to be split into multiple embeds or attached as a file. (most runs are fine in a single embed; only very long narratives overflow.)
- **LLM latency.** the LLM call is 10-30s. discord's typing indicator persists for ~10s before discord times out. the bot may need to refresh the typing indicator with `channel.sendTyping()` every 5s during long LLM calls.
- **discord.js version drift.** discord.js is at v14 stable, v15 in beta. pin to v14 for stability.

## dependencies

```
{
  "dependencies": {
    "discord.js": "^14.14.0",
    "better-sqlite3": "^11.0.0"  // v2; optional in v1
  }
}
```

that's it. discord.js is the only runtime dependency the bot adds. (the simulation engine already depends on `openai` and `node-fetch` via `scripts/lib/openrouter.js`.)

## security and permissions

discord bots have a permission model:

- **scopes** — what the bot can do (read messages, send messages, use slash commands, attach files, use external emoji)
- **permissions** — what the bot can do in a server (send messages, embed links, attach files, use external emoji, add reactions, read message history, manage threads)

for v1, the bot needs:
- `bot` scope (basic bot functionality)
- `applications.commands` scope (slash commands)
- in-server permissions: send messages, embed links, attach files, use external emoji, add reactions, read message history, manage threads

the bot *does not* need: kick/ban, manage roles, manage channels, view audit log, or any administrative scope.

## effort estimate

| component | effort |
|---|---|
| bot.js: discord.js setup, connection, basic message handling | 0.5 day |
| commands.js: slash command tree | 1 day |
| runs.js: state machine, turn loop, message-to-move detection | 1 day |
| embeds.js: discord embed formatter | 0.5 day |
| interaction.js: advisor button row, "play again" button | 0.5 day |
| persistence.js: sqlite layer (v2; optional in v1) | 1 day |
| bot + run integration tests | 1 day |
| deployment + invite flow | 0.5 day |
| **total v1 (one player, no sqlite)** | **3-4 days** |
| **total v2 (multi-player, sqlite)** | **+2 days = 5-6 days** |

the work is mostly mechanical — discord.js is well-documented, and the simulation engine already does the hard part.

## risk: what could go wrong

- **LLM latency during high-traffic periods.** the LLM call is 10-30s. if 5 players are running simultaneously and the rate-limit kicks in, some sessions get bumped to the fallback path (which works but is less rich). acceptable for v1.
- **the 4096-char embed limit.** post-cycle-5e narrator narratives are usually under 2000 chars but long runs could exceed. if it becomes a problem, split into two embeds or attach as a file. monitor.
- **discord.js v14 deprecation cycle.** the bot pins to v14. when v15 stabilizes, migrate. not urgent.
- **the corpus quote extraction during the LLM wait.** the terminal version shows a corpus quote during the spinner (cycle 5e). the discord version doesn't have a spinner — but discord *does* show "Bot is typing..." which fills the same UX role. so the corpus quote is *less* critical for the discord version. (still nice to have but optional.)
- **state persistence edge cases.** what happens if the bot crashes mid-turn? sqlite + run state recovery is a v2 feature. for v1, just say "session ended unexpectedly" if a crash happens mid-game.

## build plan — 7 steps, each a playable increment

| step | what | effort |
|---|---|---|
| 1 | bot skeleton. connects to discord, responds to `ping`, prints "ready" in the console. deploys to your laptop. invite to a test server. you've joined the bot. | 0.5 day |
| 2 | `/polycrisis start` works in a DM. bot posts the seed/turn-1 prose as a single message. no move handling yet — you just see the crisis. | 1 day |
| 3 | free-text move handling. player types in the DM, bot calls `generateWorld`, posts turn 2's prose. typing indicator handles the wait. | 1 day |
| 4 | `a` to consult advisor. bot posts 5 buttons, click posts advisor text. | 0.5 day |
| 5 | post-game report at run end. bot posts embed + artifact file attachment. | 0.5 day |
| 6 | `/status` command. show the current state. | 0.5 day |
| 7 | polish, edge cases, deployment to fly.io / a vps. | 1 day |
| | **total v1** | **5 days** |

## what's preserved across interfaces

this is the constant: every interface (terminal, discord, future web) uses the same simulation engine. the engine doesn't know which surface is in front of it.

what changes between surfaces:

- input/output mechanism (TTY vs discord embeds vs HTML forms)
- state persistence (in-memory + on-disk files for terminal; +sqlite for discord)
- UI affordances (spinner for terminal; typing indicator for discord; CSS animations for web)

what stays the same:

- the simulation engine (`src/sim/*.js`)
- the wiki and corpus grounding
- the run log + artifact output
- the case-study claim (every run produces an observable record of the model's behavior)

## triggers for this work

this doc is filed now but the actual code doesn't get written until:

1. the user finishes their terminal playthroughs (currently in progress)
2. any terminal-side fixes from those playthroughs land and are verified
3. the user signals "start the discord work"

when (3) happens, this doc is the entry point for cycle 5f (or whichever cycle is named when discord work begins). the 7-step build plan above is the cycle breakdown for that work.

## inline checklist — when the user says "start the discord build"

- [ ] step 1: bot skeleton + discord.js connection + `ping` command
- [ ] step 2: `/polycrisis start` posts the seed/turn-1 prose as a single message in a DM
- [ ] step 3: free-text move handling in DMs (typing indicator + `generateWorld` call)
- [ ] step 4: `/polycrisis advisor` shows 5 buttons; clicking posts the advisor's response
- [ ] step 5: post-game report as embed + artifact file attachments
- [ ] step 6: `/polycrisis status` shows the current state
- [ ] step 7: polish, edge cases, deployment

each step is a playable increment — the player (you) can try it before moving to the next step.

## related docs

- `docs/12-handoff-protocol.md` — the orchestrator handoff doc; the discord bot follows the same handoff principles (read first, test, verify, take responsibility)
- `docs/02-design-principles.md` — principle 4.2 (advisor function is welcome) and principle 6 (the simulation is enjoyed, not just understood) are both easier to express in a chat UI than in a terminal
- `wiki/prototypes/2026-06-29-phase-5e-*.md` (the 5e doc, when written) — the cycle that closed the terminal feedback and set up the discord path

## sources

the content of this doc was generated from a conversation between the user and the assistant, in which:
- the user proposed discord vs web as the next-iteration options
- the assistant compared the two and recommended discord first
- the user accepted discord as the next step
- the assistant drafted this spec without writing code

the spec is then reviewed and refined by the user before any code is written.