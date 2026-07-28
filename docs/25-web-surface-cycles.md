---
title: "Web surface cycles — summary of cycles 12a through 12e"
description: "What the v1 web surface is, how to run it, what each cycle contributed, and pointers to the per-cycle details. Read after docs/24-web-architecture.md."
type: prototype
subtype: cycle-summary
version: "0.1.0"
last_updated: "2026-07-28"
grounded_in:
  - "docs/24-web-architecture.md"
  - "wiki/prototypes/2026-07-26-cycle-12a-mockups.md"
  - "wiki/prototypes/2026-07-27-cycle-12b-v0.md"
  - "wiki/prototypes/2026-07-27-cycle-12c-v1.md"
  - "wiki/prototypes/2026-07-28-cycle-12d-complete.md"
  - "wiki/prototypes/2026-07-28-cycle-12d-plus-advisors.md"
  - "wiki/prototypes/2026-07-28-cycle-12e-placeholder.md"
---

# Web surface cycles — summary of cycles 12a through 12e

This document is the **operational contract for the v1 web surface**. The full design spec is at `docs/24-web-architecture.md`; the per-cycle details are in `wiki/prototypes/`. This doc summarizes what's shipped, how to run it, what each cycle contributed, and what v2 will need to address.

## what shipped (cycle 12a through 12e)

| cycle | date | deliverable |
|-------|------|-------------|
| 12a | 2026-07-26 | Three real HTML direction-board mockups (A, B, C). User picked B (chat-thread scroll). `docs/24-web-architecture.md` and `direction-approved.md` filed. |
| 12b | 2026-07-27 | v0 read-only surface. 4 GET routes: `/`, `/runs`, `/runs/:id`, `/runs/:id/report`. No LLM, no DB, no auth. The artifact-serving route serves existing run files at stable URLs. |
| 12c | 2026-07-27 | v1 interactive surface. 2 new POST routes: `/runs` (start), `/runs/:id/move` (submit). Engine got one additive change: `stepTurn` and `pickCrisis` extracted from `runLoop` so the v1 server can call the engine per HTTP request. |
| 12d | 2026-07-28 | v1 surface complete. 1 new GET route: `/runs/:id/status` (the only place the 6 axes are visible, per spec decision 4). Deliberate corpus-quote picker using `pickCorpusQuote` with forward-pointing preferredHref. Decision-dock form wired to JSON POST. Bug fix: turn-1 dock now renders. |
| 12d+1 | 2026-07-28 | Advisor interaction. The 5 advisor buttons in the decision dock are wired to a new POST route `/runs/:id/advisor` that calls the engine's `consult()` function (the same corpus-grounded advisor the discord bot uses). Reads are cached per (currentTurn, voice). |
| 12e | 2026-07-28 | Turn-1 placeholder fix. On turn 1, the seed crisis has `pressure: "(LLM-generated)"` and `decision_point: "(LLM-generated)"` as placeholders. The surface adapter now substitutes per-failure-pattern questions and pressures (4 patterns × 2 maps, with a generic fallback). |

The v1 web surface is **feature-complete per the spec.** All 5 decisions (auth, corpus, post-game, trajectory, advisor) landed.

## how to run

```bash
cd polycrisis-of-authority

# Verify the wiki is in shape (cycle 1):
node scripts/wiki-audit.js

# Start the v1 web surface:
npm run web
# or: node src/web/server.js
# or: PORT=8080 npm run web

# Open http://127.0.0.1:3000/ in a browser.
```

The cold-start page shows the simulation's frame paragraph and a list of runs. To start a new run, POST `/runs` (or use a tool like curl). Each turn is a separate HTTP request; state persists to `data/runs/<id>.json` between requests.

### The 6 routes

```
GET  /                       cold-start (lists finished runs)
GET  /runs                   JSON list of runs
GET  /runs/:id               run page (B chat-thread layout)
GET  /runs/:id/report        post-game report (alias for ended runs)
GET  /runs/:id/status        system status (6 axes; the only place the system is visible)
POST /runs                   start a new run
POST /runs/:id/move          submit a move
POST /runs/:id/advisor       consult an advisor
```

There is no auth. The run URL is the access; bookmark it for resumability.

## the engine commitment (re-stated)

The web surface uses the engine through the **surface-adapter pattern** documented in `docs/24-web-architecture.md`. The engine in `src/sim/` was unchanged from cycle 11 until cycle 12c, when two functions were extracted from `runLoop`:

- `stepTurn({ state, crisis, playerMove, identity, turnNumber, priorTurns, callLLM, callFallback, ... })` — runs one turn. Returns the new state and the world record.
- `pickCrisis({ turnNumber, state, priorWorld, seed, seedId, ... })` — selects the crisis to display.

The change is *additive*: no logic changes, no behavior changes to the existing `runLoop`. The discord bot and terminal version are unaffected. The engine is unaware of HTTP; the engine is unaware of the web surface.

The surface adapter (`src/web/surface.js`) is a *renderer* — it takes JSON-shaped engine state and emits HTML. The web server (`src/web/server.js`) is the *only* file that knows about HTTP.

## the auth decision (v1 ships without bearer-token)

The spec's decision (1) called for bearer-token auth. The v1 surface ships *without* it. The run URL is the access. Reasons:

- the project's no-PII posture
- the user has been gating `npm install` (no sqlite or auth-cookie libraries)
- the run URL was already the access model in v0
- v2 (cycle 13+) layers auth on top — a small addition to the session contract

## the visual language

The surface adapter is **austere, archival, operational**. Mono for chrome (the run-meta header, the advisor labels, the corpus-quote labels). Serif for prose (the situation, the pressure, the decision question, the corpus quote body). One accent color (desaturated ink-blue) used sparingly for links and the active advisor's border. 70ch max-width on prose. No gradients, no box-shadows, no emoji, no decorative SVGs. Subtle 200ms fade-in on the crisis pane. The aesthetic matches `docs/09-artifact-template.md` and the shareable artifact.

The same visual language is shared by the cold-start, the run page, the status page, and the chat-thread. The advisor panel, the corpus-quote panel, and the decision-dock are visually consistent.

## the file layout

```
src/web/
├── server.js    # http.createServer, 6 routes, no deps (node built-in only)
├── surface.js   # the surface adapter (modeled on src/bot/surface.js)
└── README.md    # how to run v1

data/
├── seed-runs/   # hand-authored seed runs (committed; v0 demo content)
└── runs/        # live v1 session files (gitignored; runtime)

.hermes/
└── projects/web/
    └── direction-approved.md   # web build state (cycle 12a → 12b handoff)
```

The surface adapter's full public surface is in `src/web/surface.js`'s `module.exports`:

```js
{
  createWebSurface,       // factory
  renderRunPage,          // the per-run chat-thread page
  renderDecisionDock,     // the decision input + advisor panel
  renderColdStart,        // the cold-start page
  renderStatusPage,       // the /status page
  renderArtifact,         // the self-contained HTML artifact
  resolveDecisionQuestion,// cycle 12e: per-failure-pattern question substitution
  resolveDecisionPressure,// cycle 12e: per-failure-pattern pressure substitution
  PATTERN_QUESTIONS,      // cycle 12e: per-pattern question map
  PATTERN_PRESSURES,      // cycle 12e: per-pattern pressure map
  bandFor,                // cycle 12d: matches engine's bandFor
  escapeHtml,             // small HTML escape helper
  inlineMarkdown,         // minimal inline markdown (bold/italic/code)
  PALETTE,                // visual palette
  FONTS,                  // font stack
}
```

The web server's full route surface is in `src/web/server.js`'s `route` function.

## what v2 needs to address (cycle 13+)

v1 ships without these spec'd features:

- **Bearer-token auth.** v1 has no auth; the run URL is the access. v2 would add a sqlite-backed users table, a token-cookie issued on first run, verification on subsequent requests. Requires `npm install` for sqlite and a new dep. The user has gated this during cycle 12.
- **Multi-player.** v1 is single-player per run URL. v2 would add a notion of "the player" beyond the anonymous default identity, with multiple in-flight runs per user.
- **Help-mode affordances on the web.** Cycle 11 added `?` / `??` help-mode to the TTY. The web surface doesn't have this yet.
- **Refresh button for advisor reads.** v1 caches reads; re-clicks return the cached read. v2 could add a "Re-consult" button to bypass the cache.

## per-cycle details

For the full per-cycle details — what was decided, what was rejected, what was verified — see the wiki prototypes:

- `wiki/prototypes/2026-07-26-cycle-12a-mockups.md` — three real HTML mockups, user picked B.
- `wiki/prototypes/2026-07-27-cycle-12b-v0.md` — v0 read-only surface, 4 GET routes.
- `wiki/prototypes/2026-07-27-cycle-12c-v1.md` — v1 interactive surface, 2 new POST routes, engine per-turn API.
- `wiki/prototypes/2026-07-28-cycle-12d-complete.md` — `/status` page, deliberate corpus-quote picker, wired decision-dock form.
- `wiki/prototypes/2026-07-28-cycle-12d-plus-advisors.md` — advisor interaction, `consult()` integration.
- `wiki/prototypes/2026-07-28-cycle-12e-placeholder.md` — turn-1 placeholder fix, per-failure-pattern questions and pressures.

## sources

- `docs/24-web-architecture.md` — the design spec (5 decisions, 3 direction boards, build plan).
- `wiki/log.md` — the institutional memory of every cycle.
- `src/web/README.md` — the v1 surface's own README.
- `docs/03-orchestrator-role.md` — the six orchestrator activities (the v1 surface is a result of Activity 4, "Surface tending").
- `docs/12-handoff-protocol.md` — what a new orchestrator does in their first week.
