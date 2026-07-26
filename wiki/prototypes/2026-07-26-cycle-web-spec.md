# 2026-07-26 — Web architecture spec filed

files-only cycle: spec doc landed, no implementation. this is the
post-discord-build planning document. the user's request was
"let's re-open the web spec, but before we do so, let's learn
from [huashu-design](https://github.com/alchaincyf/huashu-design)."
this is the spec that came out of that re-opening.

## what shipped

`docs/24-web-architecture.md` — web player-surface spec, 287 lines.
single doc covering the player surface, the session model, the
aesthetic, the technical architecture, three direction boards, the
gate file protocol, and the build plan.

## grounding conversation (2026-07-26)

this spec was opened in response to the user's "let's re-open the
web spec" after the discord build (cycles 6a-6g) had completed
and shipped. the user pointed to huashu-design as a reference
project to learn from. the conversation went through:

1. **a check on prior work** — confirmed in session history
   (session `20260629_070434_478304`) that the web interface
   had been *discussed* but not *started*. discord was chosen
   first, then web, with the design decision that web would
   come after multi-player feedback from discord.

2. **a review of huashu-design's principles** — distilled 8
   takeaways from the huashu README + SKILL.md, separated into
   "learn" and "ignore or adapt" for the polycrisis context.
   the most load-bearing lessons: spec-first, three-direction
   gate before code, fact-verification > clarifying questions,
   gate files as the contract, anti-AI-slop as the floor.

3. **five numbered design decisions** — the user picked from
   options on each:
   - (1) auth model: **(b) bearer-token, no password** — resumable
     across devices from day 1
   - (2) corpus quote timing: **(a) permanent footer under crisis
     pane, visible every turn after turn 1**
   - (3) post-game report: **(a) styled HTML at stable URL, one-
     click share** — the existing artifact-render.js is the report
   - (4) run state trajectory: **(c) hidden during play; `/status`
     one click away** — the taoist frame: system is present but
     not foregrounded
   - (5) advisor surface: **(a) five cards in a side panel, click-
     to-consult** — one advisor at a time, expanded inline

4. **a "spec first, mockups after" path** — the user picked
   option 1: write the spec as a canonical doc, then produce
   three direction-board HTML mockups after the user reviews
   and corrects the spec text.

5. **a numbering correction** — the spec was initially filed
   as `docs/14-web-architecture.md` but `docs/14-discord-bot-
   setup.md` already exists. renamed to `docs/24-web-
   architecture.md` (next free number) before pushing.

## structure of the doc

- **header** — why web after discord, five confirmed decisions
  in a table
- **player surface** — three player types (discoverer, player,
  returner); the first turn; the per-turn page; the post-game
  page
- **session model** — one active run per user, resumable,
  bearer-token-issued on first run, sqlite persistence from v1
- **aesthetic** — same austere mono/serif/no-gradient language
  as the artifact, anchored in `docs/09-artifact-template.md`
  and the taoist frame
- **technical architecture** — file layout (src/web/ added
  next to src/sim/ unchanged and src/bot/ unchanged); the
  surface-adapter pattern (src/bot/surface.js is the model
  for src/web/surface.js); tech choices (express, better-
  sqlite3, no JS framework, no CSS framework); the HTTP API
  (8 routes, all auth via cookie except the share route)
- **three direction boards (described, not built)** — A
  single-page card (recommended v1 starting point); B chat-
  thread scroll; C split-pane (rejected by decision 4)
- **gate file protocol** — three files: this spec (already
  filed), `direction-approved.md` (before cycle 1's build
  code), `architecture-frozen.md` (before cycle 2)
- **build plan** — 4 cycles: 12a three direction boards → 12b
  v0 artifact route → 12c v1 run-start + per-turn → 12d
  corpus footer + status + post-game report
- **what the spec does NOT decide** — HTMX vs vanilla JS,
  deployment target, one process or two, exact cold-start
  text, exact report format (all deferred to their own cycles)
- **engine commitment** — no changes to `src/sim/`; the
  surface-adapter pattern is the architecture that makes
  this implementable
- **closing note** — the spec is opinionated; cycle 1 of
  the build will *test* these choices with real mockups,
  and the user picks

## verification

ad-hoc verification at `/tmp/hermes-verify-14-web-spec.sh`.
50 of 50 checks pass:

1. spec file exists and is non-trivial (>= 200 lines; this
   one is 287)
2. frontmatter complete (title, description, type, subtype,
   version, last_updated, grounded_in)
3. five confirmed decisions explicitly present, in order,
   with their chosen (a/b/c) values
4. five decisions rendered as a markdown table
5. all load-bearing topics covered (bearer-token, resumable,
   sqlite, corpus quote, post-game, /status, advisor, side
   panel, aesthetic, no gradients/no drop shadows, surface
   adapter, express, no JS framework)
6. three direction boards (A, B, C) all present; A
   recommended; C explicitly rejected by decision 4
7. gate file protocol (24-web-architecture.md,
   direction-approved.md, architecture-frozen.md);
   direction-approved is a hard gate
8. build plan in 4+ cycles (12a, 12b, 12c, 12d)
9. engine-unchanged commitment; surface-adapter pattern
   anchored to src/bot/surface.js; Engine commitment
   section present
10. deferred items named: HTMX vs vanilla JS, deployment
    target, one process or two

## next

- **user reviews the spec.** corrections become edits to
  `docs/24-web-architecture.md`. the spec text is the
  starting position; the user's corrections are how the
  spec becomes final.
- **cycle 12a starts** when the user signals "start the
  web build" or "do the mockups." cycle 12a produces three
  real HTML direction-board mockups (one per direction,
  same seed crisis, same corpus quote, side-by-side) and
  files `direction-approved.md` only after the user picks.
- **cycles 12b–12d** are the v0 + v1 build, sequenced so
  each ships a playable increment: 12b is read-only (the
  artifact-serving route, no run-start); 12c adds run
  start + per-turn page; 12d lands the corpus footer +
  /status + post-game report integration.
