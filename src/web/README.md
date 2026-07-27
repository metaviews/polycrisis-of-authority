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
