# src/web — Polycrisis web surface

the browser player surface for the simulation. cycle 12b ships the v0
read-only surface; cycles 12c–12d add run-start, move submission, and
the corpus-aware per-turn page.

## what's in v0 (cycle 12b)

- **cold-start page** (`GET /`) — frame paragraph + finished-runs list
- **run list** (`GET /runs`) — JSON mirror of the cold-start run list
- **run page** (`GET /runs/:id`) — the B chat-thread layout, end-of-run prose appended for `state='ended'`
- **report alias** (`GET /runs/:id/report`) — same content as the run page for ended runs; serves the existing self-contained artifact HTML if one exists, otherwise renders the run page

no auth, no write paths, no LLM call, no database. the v0 surface is a *reader* over the existing `runs/` directory and the committed `data/seed-runs/` directory.

## what's NOT in v0 (deferred to 12c/12d)

- bearer-token auth (decision 1)
- run-start (`POST /runs`)
- move submission (`POST /runs/:id/move`)
- the per-turn page for *active* runs (the v0 surface only renders *finished* runs as the chat-thread; active runs would need the LLM-driven turn pipeline that 12c introduces)
- the `/status` page
- the corpus-quote footer for turns (the v0 surface reads committed corpus quotes from the seed data; the live quote picker is a 12c+ concern)
- the advisor interaction (the dock renders the advisor strip but the buttons are non-functional in v0)

## cycle 12c — v1 surface (interactive)

cycle 12c replaces this server with the v1 server (`src/web/server.js`
is now the v1 server; the v0 read-only paths still work). the v1
server has two new routes:

- `POST /runs` — start a new run. returns the run id and the first turn.
- `POST /runs/:id/move` — submit a move. returns the next turn or the end-of-run report.

the v1 server integrates with the engine through the cycle 12c
per-turn API (`stepTurn` and `pickCrisis` in `src/sim/run-loop.js`).
each turn is a separate HTTP request; the state is persisted to
`data/runs/<id>.json` between requests.

## the auth decision (v1 ships without bearer-token)

the spec's decision (1) called for bearer-token auth. the v1
surface ships *without* it. the run URL is the access — the
player bookmarks the run URL and comes back to it. reasons:

- the project's no-PII posture
- the user has been gating `npm install` (which would be needed for sqlite or auth-cookie libraries)
- the run URL was already the access model in v0
- v2 (cycle 13+) can layer auth on top: a small addition to the session contract

## the engine change (cycle 12c)

`src/sim/run-loop.js` gained two new exported functions:

- `stepTurn({ state, crisis, playerMove, identity, turnNumber, priorTurns, callLLM, callFallback, ... })` — runs one turn. takes the current state, the crisis, and the player's move; calls the LLM; applies the delta; checks for collapse; returns the new state and the world record.
- `pickCrisis({ turnNumber, state, priorWorld, seed, seedId, ... })` — selects the crisis to display.

the change is *additive*: no logic changes, no behavior changes
to the existing `runLoop`. the discord bot and terminal version
are unaffected — they still call `runLoop` for their in-process
flow.

the v1 server uses `stepTurn` and `pickCrisis` per HTTP request.
the engine is unaware of HTTP; the engine is unaware of the web
surface.

## cycle 12d — v1 surface complete

cycle 12d finishes the v1 surface. three additions, all small:

1. **`/status` page** — `GET /runs/:id/status` returns the system
   status (6 axes + bands + back link). The only place the system
   becomes visible, per spec decision 4. Austere: no charts, no
   sparklines, no gradients. The `bandFor` helper is in the
   surface adapter and mirrors the engine's bands.

2. **deliberate corpus-quote picker** — the v1 surface uses
   `pickCorpusQuote(preferHref)` at display time, with
   `preferHref` set to the prior turn's grounding trace. This
   creates a chain: turn 1's quote is random, turn 2's points
   to what grounded turn 1, turn 3's to what grounded turn 2, etc.
   The player can browse the corpus as a knowledge-graph
   traversal of the run.

3. **wired decision-dock form** — the v1 surface (cycle 12c) was
   *half-wired*: the server accepted moves but the form was
   still the v0 placeholder. Cycle 12d wires the form: the
   textarea and submit button are no longer `disabled`, a
   small inline `<script>` block defines `polycrisisSubmitMove`
   that strips trailing blank lines and POSTs JSON. **This is
   the load-bearing change of cycle 12d** — without it, the v1
   surface was a server that no client could talk to.

4. **seed run state fields** — both seed runs in `data/seed-runs/`
   got a `state` field so the `/status` page can render them.
   Real v1 runs in `data/runs/` get `state` automatically.

## cycle 12d+1 — what's left (advisor interaction, polish)

- the advisor strip in the decision dock is rendered but the
  buttons are non-functional. wiring the advisor interaction
  (decision 5) is a follow-up cycle.
- the corpus-quote picker's forward-pointing chain is a design
  call. if backward-pointing is preferred, the change is 1 line
  in `pickQuoteForTurn`.
- v2 (cycle 13+) is the auth layer + multi-player.

## cycle 12d+1 — advisor interaction wired

cycle 12d+1 wires the advisor panel to the engine's `consult()`
function. before this cycle, the panel was rendered but the
buttons were non-functional.

- **the advisor panel** is in the decision dock area, below the
  form. 5 buttons (frontier-lab, civil-society, state-security,
  open-source, international-ally) and a read area. clicking a
  button POSTs to `/runs/:id/advisor` and renders the read.
- **the read area** shows the voice label, the read body in serif
  prose, and the corpus pages that grounded the response.
- **the cache** is `session.advisorReads[`${currentTurn}:${voice}`]`.
  Re-clicks return the cached read with `(cached)` tag.
- **the turn-1 bug fix** — the decision dock was not rendering on
  turn 1 because the v1 server wasn't passing the current crisis
  to the surface adapter. cycle 12d+1 fixes this. the dock now
  renders on the player's first interaction.

no engine changes. cycle 12d+1 uses the existing `consult()` from
`src/sim/advisors.js` — the same function the discord bot uses.

## after cycle 12d+1

the v1 surface is now feature-complete per the spec. 5 decisions
(auth, corpus, post-game, trajectory, advisor) all landed. v2
(cycle 13+) is the auth layer + multi-player.

## cycle 12e — turn-1 placeholder fix

cycle 12e fixes a UX gap: on turn 1, the seed crisis has placeholder
`pressure: "(LLM-generated)"` and `decision_point: "(LLM-generated)"`
strings. the engine elaborates these after the player's first move,
but on turn 1 the player never sees the elaboration. the surface
adapter substitutes per-failure-pattern questions and pressures:

- `upstream-embedding` → "How does the regime respond to a
  capability release that outpaces its evaluation capacity?"
- `compute-capability-escape` → "How does the regime address a lab
  whose capabilities exceed disclosed evaluation thresholds?"
- `legitimacy-erosion` → "How does the regime rebuild trust in the
  safety institutions whose credibility has eroded?"
- `memetic-narrative-capture` → "How does the regime counter a
  coordinated narrative that distorts the public record?"
- (unknown) → "How do you respond to this situation?"

each pattern has a per-pattern pressure (1-2 sentences explaining
why the question is being asked). the substitution is case-
insensitive on the placeholder match. real (non-placeholder)
strings pass through unchanged.

the substitution happens in two places: `renderTurnCard` (per-turn
card in the chat-thread, so prior turns also get the fix) and
`renderDecisionDock` (the decision dock at the bottom of the page).

no engine changes. no LLM calls. 0 cost beyond the surface
adapter code.

## file layout

```
src/web/
├── server.js        # http.createServer, 4 routes, no deps
├── surface.js       # the surface adapter (modeled on src/bot/surface.js)
└── README.md        # this file

data/
└── seed-runs/       # 2 hand-crafted runs that the v0 surface renders as the chat-thread
    ├── 20260629064319-h80unb.json   # 3 turns, no-collapse
    └── 20260628223813-8jtf0r.json   # 2 turns, collapse
```

## how to run

```bash
cd polycrisis-of-authority
node src/web/server.js
# or: PORT=8080 node src/web/server.js
```

then open `http://127.0.0.1:3000/` in a browser.

## the engine commitment

`src/web/` does not import from `src/sim/`. the surface adapter takes
plain JSON-shaped data (`{ run, turns, corpusQuotes, endProse }`) and
emits HTML. the server reads JSON from disk and hands it to the
adapter. the simulation engine is unaware of the web surface, and the
web surface is unaware of the simulation engine.

this matches the spec's "no changes to `src/sim/`" commitment. the
surface-adapter pattern (`src/bot/surface.js` for discord, `src/web/
surface.js` for the web) is the architecture that makes the
engine-unchanged claim implementable.

## the v0 surface contract

```
GET /                          cold-start page
GET /runs                      JSON list of runs
GET /runs/:id                  run page (B chat-thread layout)
GET /runs/:id/report           post-game report (alias of /runs/:id for state='ended')
```

all routes are `GET`. `POST` returns `405 method not allowed`. unknown
paths return `404`. no caching (`cache-control: no-store`).

## verification

`/tmp/hermes-verify-12b-v0.sh` — 24 ad-hoc checks across 9 categories:

1. v0 files exist
2. no engine coupling
3. surface adapter exports the spec's interface
4. surface adapter renders a real run (in-process)
5. surface adapter renders cold-start (in-process)
6. surface adapter renders a collapse run (in-process)
7. seed runs are valid JSON with the expected shape
8. server starts and serves 4 routes (live HTTP)
9. visual render check (headless chromium, offline)

run before each cycle that touches `src/web/`. the verifier mocks
nothing — it boots the real server and hits the real routes.

## what 12b's surface adapter does NOT do (yet)

- `renderTurnPage` is the spec's per-turn method; in v0, `renderRunPage` is the chat-thread equivalent. the v0 surface is read-only, so there is no concept of "the current turn" independent of the run.
- `renderStatusPage` is not implemented (12c).
- `renderAdvisorCard` is rendered as part of the run page's decision dock but the click-to-expand behavior is not wired (12c).
- `renderReportPage` is the spec's post-game method; in v0, the report is the same URL as the run page (decision 3 + the chat-thread direction B's design).

## cycle log

- cycle 12a: three real HTML direction-board mockups (A, B, C). user picked B. `direction-approved.md` filed.
- cycle 12b (this cycle): v0 read-only surface. 4 routes, 2 seed runs, no engine coupling.
- cycle 12c (next): bearer-token auth + run-start + per-turn page. the v1 surface.
- cycle 12d: corpus-quote footer + `/status` + post-game report integration.
