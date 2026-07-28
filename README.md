# Polycrisis of Authority

A simulation game where you begin already in power and must govern through a constant stream of overlapping crises, responding with policies written in your own words. The world speaks back through fragmented, unreliable signals while deeper conditions shift out of sight. There is no victory, only duration.

## Project status

**MVP-0 complete (cycles 1-5).** Three player surfaces shipped: terminal, Discord bot, web. The simulation engine is operational, the six state axes (legitimacy, fiscal slack, elite alignment, ecological debt, narrative coherence, capability frontier) drive the world, the LLM-grounded interpretation grammar turns free-text policy into state-vector deltas, and every run produces a shareable 8-section artifact (markdown + self-contained HTML, FNV-1a content hash for verification).

The project's primary purpose is **edutainment**: a felt encounter with the complexity of policy and the randomness of politics, delivered through an experience the player wants to have again and share. The literacy claim is bounded and modest; the case-study claim (the controlled observation of LLM interpretive behavior) is the more rigorous one. Design Principle 6 in `docs/02-design-principles.md` is the litmus test: a player who finishes a run should want to start another.

The project is being built deliberately, not assembled quickly. The wiki, the grammar, the state model, the crisis anatomy, and the shareable artifact are specified against the curated Metaviews corpus as ground truth, with the LLM as a documented and swappable component of the system.

The three player surfaces, in order of development:

- **Terminal** (`src/sim/interactive.js`) — the original surface. Full feature set, the most tested. Run via `npm run sim`.
- **Discord bot** (`src/bot/`) — shipped in cycles 6a-6g. DM-first, button-driven. Run via `npm run bot`. See `docs/14-discord-bot-setup.md` for setup.
- **Web surface** (`src/web/`) — shipped in cycles 12b-12e. Interactive, resumable, no auth. Run via `npm run web`. See `docs/25-web-surface-cycles.md` for the spec.

Each surface is a thin adapter over the same engine; the surface contract is documented in `docs/24-web-architecture.md` §"Surface adapter pattern." Per the project's Principle 4.4 ("public surfaces wait"), the surfaces were built only after the engine was stable.

## What works

The simulation can be run end-to-end today, on any of three surfaces:

1. **State model** — six axes (legitimacy, fiscal slack, elite alignment, ecological debt, narrative coherence, capability frontier) with named bands, hidden thresholds, three collapse modes.
2. **Crisis anatomy** — eight authored crises covering four failure patterns (upstream embedding, compute/capability escape, legitimacy-erosion cascade, memetic/narrative capture).
3. **Interpretation grammar** — real OpenRouter calls against MiniMax M3. Player free-text policy text is interpreted as state-vector deltas with interpretive gloss, narrative move, grounding trace, and confidence rating.
4. **Advisor cast** — five corpus-grounded voices (frontier-lab, civil-society, state-security, open-source, international-ally). Each describes how a represented position sees the crisis. The web surface wires this to a clickable panel; the discord bot uses button interactions; the terminal uses an `a` shortcut.
5. **Run log + artifact** — every session produces a structured run log (YAML frontmatter + per-turn sections) and an 8-section shareable artifact (header, run summary, state trajectory, crisis log, interpretive chain, grounding references, collapse reveal, play invitation).
6. **Per-turn engine API** (`stepTurn`, `pickCrisis` in `src/sim/run-loop.js`) — extracted in cycle 12c so the web surface can call the engine per HTTP request, not in a long-lived process. The terminal and discord bot still use the in-process `runLoop`.

The four grammar test cases pass 10/13 expected-direction checks; the three failures are interpretive disagreements with documented rationales. See `wiki/prototypes/20260628222655-grammar-test-cases.md`.

A 9-turn end-to-end session produced a 270-line artifact. See `wiki/prototypes/2026-06-28-phase-2d-end-to-end.md` and the committed artifact at `wiki/prototypes/20260628223813-8jtf0r-artifact.md`.

## Setup

The project requires Node.js (≥20) and an OpenRouter API key.

```bash
# Clone the repo. The parent Metaviews project must be accessible at
# ../metaviews-website/ for the wiki retrieval pattern.
git clone https://github.com/metaviews/polycrisis-of-authority.git
cd polycrisis-of-authority

# Install dependencies.
npm install

# Copy the env template and add your OpenRouter key + model.
cp .env.example .env
# Edit .env:
#   OPENROUTER_API_KEY=sk-or-v1-...
#   OPENROUTER_MODEL=minimax/minimax-m3   # default for the case study
#   DISCORD_BOT_TOKEN=...                  # only for the discord bot
#   DISCORD_CLIENT_ID=...                 # only for the discord bot
#   DISCORD_GUILD_ID=...                  # optional, for instant command propagation

# Verify the wiki is in shape:
node scripts/wiki-audit.js

# Try a dry-run query against the wiki (no API key needed):
node scripts/wiki-query.js --dry-run "How does algorithmic authority erode?"

# Run the grammar test cases (real LLM calls — uses API key):
node src/sim/test-cases.js

# Run a scripted end-to-end session and produce an artifact:
node src/sim/index-async.js --script scripts/player-script-default.txt --turns 9
# Output: runs/<run-id>.md (run log), runs/<run-id>-artifact.md (artifact),
# and runs/<run-id>-artifact.html (self-contained HTML for sharing)
```

### Per-surface setup

**Terminal (no extra setup):**
```bash
npm run sim
```

**Discord bot:** see `docs/14-discord-bot-setup.md` for the 7-step developer setup. After setup:
```bash
npm run bot
```

**Web surface:** no extra setup beyond the OpenRouter key. Run:
```bash
npm run web
# open http://127.0.0.1:3000/
# or: PORT=8080 npm run web
```

The web surface is currently a v1 interactive surface (cycles 12b-12e complete). It's a single-player surface — no auth, no multi-player — but it's resumable across tabs/devices via the run URL. v2 (auth + multi-player) is the next surface iteration.

The wiki retrieval is grounded in the parent Metaviews archive. To point this project at a different corpus, edit `wiki/` directly (corpus entries are markdown files with frontmatter).

## Structure

```
docs/          Design and specification documents (25 files)
  00-vision.md             Root — purpose, framing, MVP-0 scope (read first)
  01-corpus-synthesis.md   What the Metaviews archive gives us
  02-design-principles.md  16 principles, 4 parts (incl. Principle 4.5 "Dancing with the Details")
  03-orchestrator-role.md  Six recurring activities, operational texture
  04-roadmap.md            MVP-0 build order + after-MVP-0 cycles (descriptive)
  05-wiki-structure.md     Wiki directory layout, entry schemas
  06-state-model.md        Six state axes with hidden values, visible signals, thresholds
  07-interpretation-grammar.md  Central mechanism: prompt structure, output schema, test cases
  08-crisis-anatomy.md     Eight crises, four failure patterns
  09-artifact-template.md  Eight sections, three jobs made concrete
  10-advisor-prompts.md    Five voices, describe-not-recommend mechanism
  11-openrouter-configuration.md  Model swap as case-study hook
  12-handoff-protocol.md   What a new orchestrator does in their first week
  13-discord-bot-architecture.md  Discord surface spec, surface adapter pattern
  14-discord-bot-setup.md  7-step Discord developer setup guide
  15-discord-bot-cycle-6g.md     Discord polish + identity capture (cycle 6g)
  16-deployment.md         pm2 + sqlite + monitoring (revised)
  17-cycle-8a-corpus-entities.md       Corpus expansion: entities
  18-cycle-8b-corpus-themes.md         Corpus expansion: themes
  19-cycle-8c-corpus-concepts.md       Corpus expansion: concepts
  21-cycle-9b-corpus-concepts.md       Corpus closure: forward-references
  22-cycle-10-signal-filing-pipeline.md  Signal filing (cycle 10)
  23-cycle-11-pacing-and-help.md      Default multi-sub-beat turns + help-mode
  24-web-architecture.md   Web surface spec (cycles 12a-12e entry point)
  25-web-surface-cycles.md  Web surface cycle summary (12b, 12c, 12d, 12d+1, 12e)

wiki/           The Polycrisis LLM-wiki (~130 cataloged pages)
  concepts/      Corpus concept entries
  entities/      Corpus entity entries
  themes/        Corpus theme entries
  signals/       Filed Pressure Systems editions
  mechanics/     Game-claim entries (state-axes, interpretation-grammar, collapse-modes,
                 crisis-anatomy, artifact-template, run-log-format)
  mechanics/crises/  8 crisis entries (2 per failure pattern)
  mechanics/advisors/  1 cast index + 5 voice entries
  prototypes/    Hand-authored cycle docs + committed run artifacts
  index.md       Catalog (fits in one context window)
  log.md         Append-only audit trail (every cycle)
  SCHEMA.md      Entry types and required sections

scripts/        Build, ingestion, and evaluation scripts
  wiki-audit.js          Quality audit
  wiki-query.js          Retrieval pattern
  wiki-source-refs.js    Source-path enrichment
  wiki-ingest.js         Wiki ingest pipeline
  wiki-file-signals.js   Signal filing (cycle 10)
  lib/openrouter.js      OpenRouter client wrapper
  player-script-default.txt  9-move player script for end-to-end runs

src/sim/        Simulation engine (Node.js)
  state.js                State vector, delta application, band computation, collapse detection
  crisis-generator.js     8-crisis deck, selection rule
  grammar.js              Real grammar: OpenRouter call, JSON output, validation
  advisors.js             5 corpus-grounded advisor voices (consult() + retrieveAdvisorContext)
  run-loop.js             Surface-agnostic turn loop; exports runLoop, stepTurn (per-turn API), pickCrisis
  world-generator.js      LLM-driven narrative response (single source of LLM call per turn)
  post-game-narrator.js   LLM-driven end-of-run narrative
  atmospherics.js         Atmospheric text selection
  artifact-generator.js   8-section artifact generator
  artifact-render.js      Self-contained HTML renderer
  visible-signals.js      Visible-signal layer
  identity.js             Player + regime identity
  interactive.js          TTY CLI (terminal surface)
  index-async.js          Async CLI entry point (real-LLM runner)
  test-cases.js           4 grammar test cases harness
  surface.js              Format helpers for terminal and discord
  (engine is unchanged by surface code; surface-adapter pattern)

src/bot/        Discord bot surface (cycle 6)
  bot.js                  discord.js entry point, slash command handlers
  commands.js             Slash command definitions (/polycrisis, /ping, etc.)
  surface.js              Discord surface adapter
  (uses src/sim/ unchanged)

src/web/        Web surface (cycle 12)
  server.js               http.createServer, 6 routes, no auth (v1)
  surface.js              Web surface adapter, surface contract (renderRunPage, renderDecisionDock, renderColdStart, renderStatusPage, renderArtifact)
  README.md               How to run v1
  (uses src/sim/ unchanged; per-turn API from cycle 12c)

data/           V1 web surface data
  seed-runs/              Hand-authored seed runs (v0 demo content)
  runs/                   Live v1 session files (gitignored, runtime)

.hermes/        Project-internal gate files
  projects/web/direction-approved.md   Web build state (cycle 12a → 12b handoff)
```

## Reading order for new contributors

1. `../metaviews-website/wiki/index.md` — the parent corpus catalog, fits in one context window.
2. `wiki/index.md` — the Polycrisis wiki catalog, fits in one context window.
3. `docs/00-vision.md` — the root document, lays out the project's two purposes, MVP-0 scope, and what is and isn't being claimed.
4. `docs/01-corpus-synthesis.md` — what the parent corpus gives us and what it doesn't.
5. `docs/02-design-principles.md` — the principles any design decision should respect (16 principles across 4 parts).
6. `docs/03-orchestrator-role.md` — the ongoing work of tending the project.
7. `docs/04-roadmap.md` — what shipped in MVP-0 (phases 1-5) and what came after (cycles 6-12).
8. The design specs (`docs/05-` through `docs/11-`) — the operational contracts for the simulation.
9. The surface specs (`docs/13-` through `docs/15-` for Discord, `docs/24-` and `docs/25-` for the web) — the player surface contracts.
10. `src/sim/` — the engine code; small, well-commented, Node-native.
11. `wiki/prototypes/` — operational observations per Principle 4.5. The wiki log (`wiki/log.md`) is the institutional memory; the prototypes are the per-cycle details.

## Naming and tone

Austere, archival, operational. Mono for chrome, serif for prose. No decorative AI styling. The aesthetic should feel like an intelligence desk under pressure, not a SaaS product. The parent Metaviews project's design discipline (`../metaviews-website/DESIGN.md`) is inherited.

## License

To be determined before first public commit. Default posture: code under MIT or Apache 2.0; content (corpus selections, wiki entries, the shareable artifact template) under CC BY-NC-SA 4.0 pending orchestrator review.
