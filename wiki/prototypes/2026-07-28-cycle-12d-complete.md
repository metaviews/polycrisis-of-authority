# 2026-07-28 — Web v1 surface complete (cycle 12d)

cycle 12d finishes the v1 surface. the v0 read-only surface (cycle
12b) had four GET routes. the v1 interactive surface (cycle 12c)
added two POST routes. cycle 12d adds the `/status` page, the
deliberate corpus-quote picker, and the wired decision-dock form.
the v1 surface is now feature-complete per the spec.

## what shipped

```
src/web/surface.js   +236 lines: renderStatusPage, bandFor, decision-dock wired form
src/web/server.js    +70 lines: handleRunStatus, /status route, pickQuoteForTurn helper
data/seed-runs/*.json  +2 fields: state field added to both seed runs
```

no engine changes. cycle 12d is a *web-only* cycle.

## the four pieces

### 1. the `/status` page

`GET /runs/:id/status` returns a new page showing the 6 axes, their
values, their bands, and a back-link to the run. this is the *only*
place the system becomes visible — per spec decision 4, the system
is hidden during play; /status is "one click away, not on the
main surface."

the page is austere: 6 axis rows, each with the label, a bar, the
value, and the band. no charts, no sparklines, no gradients. the
band colors match the engine's `bandFor` (collapsed: deep red,
eroded: dark orange, strained: warm orange, holding: ink). a
minimal `run-meta` header has the run id and a `← run` back-link.

the `bandFor` helper is in the surface adapter (cycle 12d adds
it). it mirrors the engine's `bandFor` from `src/sim/state.js`:
0-49 collapsed, 50-59 eroded, 60-79 strained, 80-100 holding. the
verifier confirms they match at all 8 boundary points.

### 2. the deliberate corpus-quote picker

the v1 surface (cycle 12c) was rendering corpus quotes by deriving
them from the LLM's `grounding_trace[0]`. cycle 12d replaces that
with the project's deliberate picker: `pickCorpusQuote(preferHref)`
from `scripts/wiki-query.js` (cycle 5e addition).

the picker is called at *display time*, not at turn-generation time.
each turn's quote is picked when the run page is rendered, with
`preferHref` set to the *prior turn's* grounding trace. this creates
a *chain*: turn 1's quote is random, turn 2's points to what
grounded turn 1, turn 3's points to what grounded turn 2, etc.
the player can browse the corpus as a knowledge-graph traversal
of the run.

if `pickCorpusQuote` returns null (no wiki entries match the
preferred href), the v1 server falls back to the LLM's grounding
trace derivation. this is the same fallback the v0 surface had,
preserved for resilience.

### 3. the wired decision-dock form

the v1 surface (cycle 12c) was *half-wired*: the server accepted
`POST /runs/:id/move`, but the form in the rendered page was still
the v0 placeholder (textarea and button both `disabled`, with a
note saying "v0 is read-only"). a player using the v1 surface
would type their move, click submit, and... nothing would happen.

cycle 12d wires the form:

- the textarea is no longer `disabled`. it has a real placeholder.
- the submit button is no longer `disabled`. it says "Submit move."
- a small inline `<script>` block defines `polycrisisSubmitMove(event, runId)`:
  - strips trailing blank lines from the textarea
  - fetches `POST /runs/<id>/move` with `content-type: application/json`
  - replaces the document with the server's response (the new run page)
  - scrolls to the bottom so the player sees the new turn
  - shows an error in the dock-hint on failure
- the "End your move with a blank line" hint matches the cycle 5b.5
  behavior — the same affordance the terminal and discord versions
  use.
- the v0 "v0 is read-only" message is gone.

this is the load-bearing change of cycle 12d. without it, the v1
surface was a *server* that no client could talk to.

### 4. seed run state fields

the seed runs in `data/seed-runs/` were authored for the v0
surface that didn't need state. the `/status` page needs `state`
on every run. cycle 12d adds the `state` field to both seed runs
with hand-crafted values that match the outcome (`no-collapse`:
mostly `strained`/`eroded` bands, one `holding`; `collapse`:
multiple `collapsed` bands).

real v1 runs (in `data/runs/`) get `state` automatically — the
session file persists state across requests.

## what the v1 surface looks like now

the cold-start now shows a "v1 surface · interactive" label, the
simulation's frame paragraph, and a "Runs" list. each run links
to its run page. ended runs are visibly shareable (same URL,
state-driven content).

the run page renders the chat-thread (B layout: prior turns
muted, current turn full-strength, corpus quote per turn, decision
dock pinned to the bottom). the run-meta header has the run id
and a `/status` link. clicking `/status` goes to the status page.
clicking the corpus-quote link goes to the wiki page it quotes.

ended runs additionally show the end-of-run prose and a self-
contained artifact HTML at `data/runs/<id>-artifact.html`. the
share model is the run URL — same URL, different content.

## verification

`/tmp/hermes-verify-12d-status.sh`. **35 of 35 checks pass.**
categories:

1. surface exports (renderStatusPage, bandFor)
2. bandFor matches the engine's bands at 8 boundary points
3. renderStatusPage renders 6 axes, 4 bands, back link
4. pickQuoteForTurn uses pickCorpusQuote with forward-pointing priorHref
5. decision-dock form is wired (no v0 placeholder, no disabled)
6. v1 server boots, all 5 GET routes (4 v0 + 1 new `/status`) work
7. /status page has axes, bands, back link, "System status" h1
8. /status page is austere (no gradients, no box-shadow)
9. collapse run's /status shows multiple collapsed bands
10. /status for non-existent run returns 404
11. POST /runs returns a page with the wired form (polycrisisSubmitMove + Submit move)
12. v0 placeholder text is gone
13. textarea and button are no longer disabled
14. POST /runs/:id/move advances the turn (real LLM call)
15. after-move page has corpus-inline panel with wiki link
16. /status on a live v1 run shows the player's evolved state (6 axes)
17. seed runs have a `state` field with all 6 axes
18. aesthetic compliance (no gradients/box-shadow, serif for prose)

real LLM calls were made during verification. the v1 surface
was driven end-to-end: `POST /runs` (LLM call) → page renders
with the form → `POST /runs/:id/move` (LLM call) → new turn →
`/status` shows the evolved state.

## what 12d explicitly does NOT do

- no advisor interaction (decision 5) — the advisor strip in the
  dock renders but the buttons are non-functional. this is 12d+1
  or a separate cycle.
- no /status for the cold-start itself — the cold-start links to
  runs, not to /status. this is correct: /status is per-run, not
  global.
- no authentication — the v1 surface still uses the run URL as
  the access. v2 (cycle 13+) layers auth on top.
- no post-game report *content* changes — the v1 surface already
  uses the existing `generateArtifact` + `renderArtifactHtml` for
  ended runs. 12d doesn't touch the artifact generation.

## the engine commitment — re-stated

cycle 12c made an additive engine change (extracted `stepTurn`
and `pickCrisis`). cycle 12d makes *no* engine changes. the
`bandFor` helper in the surface adapter mirrors the engine's
`bandFor`; this is a *display* concern, not a *simulation* concern.
the engine is unchanged.

## next

- the v1 surface is feature-complete per the spec. user plays
  a few runs and confirms the player experience.
- the v0/v1 surface contract is documented in `src/web/README.md`.
  v2 (cycle 13+) can layer auth on top without changing the
  surface contract.
- if the user wants to refine: the corpus-quote picker's
  forward-pointing chain is a design call; if backward-pointing
  is preferred, the change is 1 line in `pickQuoteForTurn`.
- the v1 surface serves the player (type 2) from the spec's
  three player types. discoverer and returner are served by
  the cold-start and the share model.
