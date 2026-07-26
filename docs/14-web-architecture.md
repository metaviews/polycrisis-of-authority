---
title: "Web architecture — spec and build plan for the browser player surface"
description: "Architecture and build plan for the web interface. Cycle 11 closed the discord bot build (6a-6g); this doc captures the next-iteration design before any code is written. Spec-only — the inline gate-file protocol at the bottom governs when the build can start."
type: prototype
subtype: design-spec
version: "0.1.0"
last_updated: "2026-07-26"
grounded_in:
  - "docs/13-discord-bot-architecture.md"
  - "docs/12-handoff-protocol.md"
  - "docs/02-design-principles.md"
  - "docs/09-artifact-template.md"
---

# Web architecture — spec and build plan

_This is a design spec, not code. It captures the architecture for the web interface before any code is written. Filed as the post-discord-build planning document. Once the user decides to start the build, this doc becomes the entry point for cycle 12 (or whichever cycle is named when the web work begins)._

## Why web after discord

The discord build (cycles 6a-6g) shipped a working multi-player surface — DM-first, button-driven, posting per-turn embeds with corpus quotes. The web version is the **long-term player surface** for the broader edutainment audience that won't install discord, and for cold-start readers who find a run artifact and want to play their own.

Reasons to build the web version now:

- **the artifact is already HTML.** the cycle 3 shareable artifact (`runs/<id>-artifact.html`) is a self-contained static page with inline CSS, no JS, no external assets. the v0 web surface is a route that *serves existing artifacts* at stable URLs. zero new rendering, zero new state. this is the lowest-effort first step.
- **discord surface is the proven baseline.** cycles 6a-6g taught us what the per-turn payload shape is. the web surface extends that shape to a richer format (links, multi-line input as a textarea not a chat message, persistent advisor panel) without changing the underlying data.
- **resumable sessions change the gameplay.** terminal and discord are session-bounded (the run lives in the process). the web can be resumable: close the tab, come back tomorrow, pick up the same run. this enables a different player rhythm — multi-day runs, return-after-collapse, etc.
- **the corpus can be linked.** the per-turn corpus quote is plain text on discord. on the web it's a hyperlink to the wiki page. that one affordance turns the corpus from "passive LLM grounding" into a *navigable knowledge graph* the player can browse.

## Five confirmed decisions

These are the five load-bearing design decisions, resolved in conversation before this spec was written. They are not defaults; they are choices.

| # | Decision | Choice | Implication |
|---|----------|--------|-------------|
| 1 | **Auth model** | **(b)** — bearer-token issued at first run, no password, resumable across devices from day 1 | v1 ships with a token-cookie auth layer; no PII collected. the issuance dance adds ~30 lines to the run-start flow. v2 is the same with a named identity when accounts exist. |
| 2 | **Corpus quote timing** | **(a)** — quote is a permanent footer under the crisis pane, visible every turn after turn 1 | on every reload the player sees the last turn's corpus quote under the current crisis. the quote is a hyperlink to the wiki page, surfacing the corpus as a knowledge graph. |
| 3 | **Post-game report surface** | **(a)** — styled HTML page at a stable URL with the run hash, one-click share | the existing `artifact-render.js` output is the report. one route: `GET /runs/:id/report`. the URL contains the run hash, the same as the current artifact. share model: copy URL, no PII. |
| 4 | **Run state trajectory** | **(c)** — hidden during play; `/status` is one click away but not on the main surface | the player reads the tea leaves. the system is present but not foregrounded — the taoist frame. `/status` exists for players who want to look; it is not the default. |
| 5 | **Advisor surface** | **(a)** — five advisor cards in a side panel, click-to-consult | one advisor at a time, expanded inline above the decision input. same five voices as discord: frontier-lab, civil-society, state-security, open-source, international-ally. |

The five choices are coherent. (1) + (3) + (4) together: the player enters anonymously, the system stays opaque during play, the report is the shareable surface. (2) + (5) are the *player-facing* affordances — the corpus quote grounds the next crisis, the advisor panel grounds the player's next move.

## Player surface

### Who is the player

After the web version ships, the player can be anyone with a browser. Three player types we should design for, even if v1 only enables the first:

- **type 1: the discoverer.** finds a run report via a shared link, wants to play their own. cold start. the v0 "serve existing artifacts" path serves this player before the v1 run-start path exists. the artifact is the marketing surface.
- **type 2: the player.** creates a run, plays it, may finish it in one sitting or over days. v1 surface. (1) + (4) + (5) are for this player.
- **type 3: the returner.** has a finished run, wants to share it. v0 + v1 surface — `GET /runs/:id/report` is the share. (3) is for this player.

v1 design decisions (auth, corpus footer, advisor panel) are for the player (type 2). v0 work (artifact-serving route) is for the discoverer and the returner (types 1 and 3) — and informs every v1 surface decision.

### The first turn

The first turn does more setup work than the cycle 5e terminal version, which was written for the single player (you). The cycle 5e version says "the regime either holds or it falls" and moves on. The web version is read by cold-start players who need a one-paragraph explanation of what they're about to do.

Proposed first-turn text structure:

1. **page title + simulation name** (the A-in-circle logo, the title, the subtitle)
2. **frame paragraph** (5-6 lines, accessible-register voice from cycle 5d) — *what is this, what is the goal, what does a turn look like*
3. **"start a run" button** (this is the gate; no crisis renders until the player commits)
4. **on click, a brief bearer-token issuance notice** (one line: "your run will be saved at this URL — bookmark it to come back")
5. **turn 1 crisis renders** (headlines empty, situation + pressure + decision point, corpus quote footer empty)

This is the v0→v1 bridge: the page works without a run (artifact browsing, run-start, this is what the simulation is), and the run lifecycle hooks in when the player clicks start.

### The per-turn page

Each turn renders a single page with this structure (top to bottom):

1. **crisis header** — situation, pressure, decision point
2. **headlines section** (turn 2+ — past-tense committed events, the cycle 5e addition)
3. **decision input** — multi-line textarea, blank-line submit (the cycle 5b.5 behavior)
4. **advisor panel** (side or below on narrow viewports) — five cards, click to expand
5. **corpus quote footer** — single sentence + title + link, persistent across the run
6. **mini-status link** (the `/status` route) — small text, one click away, not the default

The frame is austere. Mono for chrome, serif for prose, no gradients, no shadows, no decorative SVG. The aesthetic is anchored in `docs/09-artifact-template.md`; the web version doesn't add visual noise to differentiate itself from the artifact — it *is* the same visual language in interactive form.

### The post-game page

A styled HTML report at `GET /runs/:id/report` — the cycle 3 artifact. Same prose register, same aesthetic, same hash-in-URL verification. The report is the run's durable form; the per-turn pages are the run's interactive surface. They are the same data, rendered two ways.

A "play again" button at the bottom of the report starts a new run. No "share to twitter" buttons, no social media widgets. The share model is: copy URL.

## Session model

### One active run per user, across devices and tab-closes

- a user may have one run in `state = 'active'` at a time.
- a user may have any number of runs in `state = 'ended'` (collapse, stabilization, player-quit).
- starting a new run while a run is active either rejects (default) or ends-and-starts (opt-in via a confirm button).

### Resumability

- v1 ships with bearer-token-in-cookie auth, no PII.
- the token is generated on first `/runs` POST, returned once in the response body + set as a `HttpOnly; SameSite=Strict` cookie. the player sees the run URL once and is told to bookmark it.
- subsequent requests authenticate by the cookie. the run URL is the share-link + the resumption link.
- the token is stored server-side in the `users` table (`token_hash`, `token_created_at`). plaintext is never persisted. rotating the token is a v2 feature.

### Persistence: sqlite, v1

- one sqlite file at `data/polycrisis.db`. not part of the git repo. listed in `.gitignore`.
- tables:
  - `users (id, token_hash, token_created_at, created_at)` — identity
  - `runs (id, user_id, seed_id, state, current_turn, state_json, created_at, updated_at, ended_at, outcome)` — the run state machine
  - `turns (id, run_id, turn_number, situation, pressure, decision_point, headlines, corpus_quote, player_move, world_response, created_at)` — per-turn content
  - `reports (run_id, html_path, html_hash, created_at)` — generated artifacts
- every existing turn content currently held in the in-memory `run-loop.js` is persisted to `turns` on each cycle. the in-memory state is rebuilt from sqlite on server start.
- a crash mid-turn loses only the in-flight LLM call; the prior turn's content is already persisted.

### Deployment

- a single node process (`src/web/server.js`) that:
  1. reads `.env` for the LLM provider keys (same env as the discord bot and the terminal version — swappable LLM via `.env` is a project principle)
  2. opens the sqlite database
  3. serves HTTP on a configurable port (default 3000)
- process can run on fly.io, a $5 VPS, or a developer laptop. no external services beyond the LLM provider. no queues, no redis, no separate worker process. the LLM call blocks the request for the duration of the call; that's fine for one-player v1.
- v2 (multi-player) introduces request queuing and per-request timeout handling. not v1.

## Aesthetic

The web version's aesthetic is **the same austere, archival, mono-chrome, serif-prose language as the artifact**. This is a *load-bearing* design decision, not a default.

Reasons:

- the artifact is the marketing surface (decision 3). if the web version looks different, the artifact is a foreign object. the visual continuity between playing and sharing is part of the share model.
- the simulation's prose is the product. chrome that competes with the prose (gradients, drop shadows, animations) reduces prose legibility.
- the taoist frame: the system yields to the player. visual quietude is yielding.

Concrete design rules, drawn from `docs/09-artifact-template.md` and the cycle 11 feedback:

- mono font for chrome (numbers, timestamps, button labels, advisor names)
- serif font for prose (the situation, the pressure, the decision point, the corpus quote)
- no gradients, no drop shadows, no `box-shadow` of any kind
- one accent color, used sparingly, for the corpus-quote link underline and the active advisor card border
- 70-character max-width on prose (matches the terminal's `wrap()` behavior in `cli-format.js`)
- responsive: single-column on mobile, side-panel on desktop
- no emoji. no decorative SVG. no icon fonts.
- subtle, not zero, motion: the crisis pane fades in over 200ms when a new turn lands. that's it. no parallax, no scroll-linked animation, no page transitions.

These are the same rules huashu-design calls "anti-AI-slop," and the polycrisis aesthetic was already operating by them before huashu was a thing.

## Technical architecture

### File layout

```
src/
├── sim/                 # unchanged
│   ├── world-generator.js
│   ├── post-game-narrator.js
│   ├── crisis-generator.js
│   ├── state.js
│   ├── ...
│   └── artifact-render.js
├── bot/                 # unchanged
│   ├── bot.js
│   ├── surface.js       # the discord surface adapter (the model for src/web/surface.js)
│   └── ...
└── web/                 # NEW
    ├── server.js        # express + sqlite + the LLM call
    ├── db.js            # sqlite schema + queries
    ├── auth.js          # bearer-token issuance + cookie + verification
    ├── surface.js       # the web surface adapter — turns run-loop state into HTML
    ├── state-machine.js # extends run-loop.js state model with persistence hooks
    ├── views/           # the per-page HTML templates
    │   ├── index.html   # the cold-start page
    │   ├── turn.html    # the per-turn page
    │   ├── status.html  # the /status page
    │   └── report.html  # the post-game report (renders artifact-render.js output)
    └── public/          # static assets — fonts, the A-in-circle logo, no JS framework
        ├── logo.svg
        ├── mono.woff2
        └── serif.woff2
```

### The surface adapter pattern

`src/bot/surface.js` already implements a "surface adapter" — it takes run-loop state and emits discord embeds. The web version needs the same shape, emitting HTML fragments instead of embeds. The interface:

```js
// src/web/surface.js
function renderTurnPage({ turn, state, advisors, corpusQuote, isFirstTurn, runMeta }) {
  // returns HTML string
}
function renderStatusPage({ state, turns }) { ... }
function renderReportPage({ artifactHtml, runMeta }) { ... }
function renderAdvisorCard({ voice, expanded, body }) { ... }
```

This is the *only* new file that has to be designed carefully. Everything else is wiring.

### Tech choices

- **express** for the HTTP server. boring, well-known, fits the project's "no framework churn" principle.
- **better-sqlite3** for sqlite. synchronous, fast, no callback dance. v1 is one player; synchronous is fine.
- **no JS framework on the client.** the per-turn page is server-rendered HTML + a few lines of vanilla JS for the advisor-card expansion and the form submission. no React, no Vue, no build step. the principle: the prose-heavy nature of the simulation means the server can render most of the page; small JS swaps the crisis pane after each move.
- **HTMX is a candidate for the per-turn swap.** not committed in this spec. cycle 1 of the build should A/B test "vanilla JS fetch + DOM swap" against "HTMX swap" and pick the simpler one. both fit the architecture.
- **no CSS framework.** hand-written CSS, one stylesheet. the aesthetic is austere; a framework adds noise.

### HTTP API

```
POST   /runs                      # start a new run. returns run id, run URL, and the token (once).
GET    /runs/:id                  # redirect to /runs/:id/turns/:n (current turn)
GET    /runs/:id/turns/:n         # the per-turn page (server-rendered HTML)
POST   /runs/:id/move             # submit a move. body: { text }. returns next turn (or end-of-run)
GET    /runs/:id/status           # the /status page (6 axes, bands, turn count)
GET    /runs/:id/report           # the post-game report (artifact-render.js output)
GET    /runs/:id/advisor/:voice   # one advisor's read on the current crisis
POST   /runs/:id/end              # end the run without finishing. records outcome 'player-quit'
GET    /                           # cold-start page (no run)
```

All routes authenticate via the bearer-token cookie except `GET /` (cold start) and `GET /runs/:id/report` (the share — public, no auth, the URL *is* the access).

## Three direction boards (described, not built)

The huashu-design pattern of "three real HTML mockups, user picks one" applies to the per-turn page specifically. The three directions differ on the *layout architecture*, not the visual style. The visual style is fixed by the aesthetic section.

### Direction A — single-page card (recommended v1 starting point)

The page is a single column. Top: crisis header. Middle: decision textarea. Bottom: corpus quote. Advisor panel sits below the decision input, collapsed by default, expands on click.

Pros: simplest. reads like a document. mobile-friendly by default. the prose is the page.
Cons: advisor voices compete with the main prose for attention when expanded.

### Direction B — chat-thread scroll

The page is a scrollable stream of turns. Each turn is a card. The decision input is pinned at the bottom. New turns append. The corpus quote is a small badge on each turn card.

Pros: feels like a conversation. the run is a record, not a moment.
Cons: requires JS for the append behavior. harder to jump to a specific turn. the prose loses gravity when it's stacked.

### Direction C — split-pane

The page is two columns. Left: the system (six axes, sparklines, advisor panel). Right: the crisis + decision. Persistent visibility of the system.

Pros: the system is always present. the gameplay literacy is foregrounded.
Cons: violates decision 4 (system is hidden during play). the taoist frame pushes back. the system being visible competes with the prose for attention.

**My read: A.** decision 4 explicitly rejects C. A and B are both defensible; A is simpler and reads as a document, which is what the simulation is. The cycle 1 build should produce all three as real HTML mockups, with the same seed crisis and the same corpus quote, before any code is written for the server.

## Gate file protocol

Three files govern whether and how the build can start. None of these are chat moments; they are files on disk. A step that requires a gate file is not "done" until the file exists.

| Gate file | Purpose | Required at |
|-----------|---------|-------------|
| `docs/14-web-architecture.md` | this spec | already filed (cycle 11-12 planning) |
| `.hermes/projects/web/direction-approved.md` | the user's choice of A, B, or C, with reasoning | before the build's cycle 1 |
| `.hermes/projects/web/architecture-frozen.md` | the technical architecture section, frozen with any user corrections | before the build's cycle 2 |

If `direction-approved.md` doesn't exist, the build cannot start. If the user later says "actually, let's do B" after cycle 1, `direction-approved.md` is updated and the build pivots — but cycle 1 of the build, by definition, is *producing the three mockups*, not picking one.

The build itself is out of scope for this spec. It begins when the user signals "start the web build." The build is at minimum a 4-cycle sequence:

1. **cycle 12a: three direction-board HTML mockups.** real, not screenshots of mockups. server-rendered HTML + inline CSS. the user picks.
2. **cycle 12b: cold-start + artifact-serving route.** `GET /` + `GET /runs/:id/report`. the v0 path. ships before the v1 path. this is the lowest-effort highest-leverage cycle.
3. **cycle 12c: bearer-token auth + run start + the per-turn page.** the v1 path. decision 1 + decision 5 land here.
4. **cycle 12d: corpus quote footer + /status + post-game report integration.** decision 2 + decision 3 + decision 4 land here. the cycle ends with a v1 web version ready for play.

After cycle 12d, the v2 work (multi-player, named accounts, queue/timeout) is a separate roadmap section.

## What this spec does *not* decide

These are the explicitly deferred items. They get resolved in their own cycles.

- **HTMX vs vanilla JS** for the per-turn swap. cycle 12a picks.
- **the exact cold-start frame paragraph text.** written in cycle 12a, after the direction board is picked.
- **deployment target** (fly.io, a VPS, etc.). chosen in cycle 12b, when the v0 surface is ready to deploy.
- **whether the discord bot and the web server are one process or two.** the spec assumes they can be the same process (both use the same LLM, the same state machine, the same corpus). cycle 12b confirms or splits.
- **the post-game report's exact format.** the existing `artifact-render.js` is the starting point. if a web-specific layout is wanted, that's a 12d decision.

## Engine commitment

This spec commits to **no changes to the simulation engine** (`src/sim/`). The web surface is a new layer; the engine is the same module that backs the terminal version, the discord bot, and the existing artifact. Any cycle that implies a change to the engine must surface that change for explicit user approval before code lands. The surface-adapter pattern (`src/bot/surface.js` for discord, `src/web/surface.js` for the web) is the architecture that makes this possible — the surface consumes engine state, the engine does not know which surface is consuming it.

## Closing note

This spec is opinionated. It commits to the austere aesthetic, the taoist frame, the single-process deployment, the surface-adapter pattern, the no-JS-framework choice, and the five numbered decisions above. The cycle 1 of the build will *test* these choices with real mockups, and the user picks. If the user picks differently, the spec pivots — but the spec, as filed, is the starting position.

When the user says "start the web build," the next step is: open `docs/14-web-architecture.md` and `.hermes/projects/web/`, produce the three direction-board HTML mockups (cycle 12a), and wait for `direction-approved.md` to be filed before any server code is written.
