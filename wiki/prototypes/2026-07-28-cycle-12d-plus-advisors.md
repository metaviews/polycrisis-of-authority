# 2026-07-28 — Web advisor interaction (cycle 12d+1)

cycle 12d+1 finishes the v1 surface's advisor interaction (decision 5).
the v1 surface (cycles 12b/12c/12d) had the advisor panel *rendered but
non-functional* — five buttons in the chat-thread, no click handler,
no read, no LLM call. cycle 12d+1 wires the panel to the engine's
`consult()` function, which is the same corpus-grounded advisor the
discord bot has been using since cycle 6.

## what shipped

```
src/web/surface.js   +250 lines: renderDecisionDock with advisor panel,
                              polycrisisConsultAdvisor JS, advisor CSS
src/web/server.js    +140 lines: handleConsultAdvisor, /advisor route,
                              deriveAdvisorRead, deriveConsultedVoice,
                              bug fix: current crisis on turn 1
```

no engine changes. cycle 12d+1 is a *web-only* cycle that uses the
existing `consult()` function from `src/sim/advisors.js`.

## the four pieces

### 1. the advisor panel

`renderDecisionDock` (which already had the form for move submission)
now also renders an *advisor panel* below the form. the panel has:
- 5 buttons in a row, one per voice (frontier-lab, civil-society,
  state-security, open-source, international-ally)
- a read area below the buttons, initially empty with a hint
- each button has a `data-voice` attribute and an `onclick` that
  calls the inline JS function `polycrisisConsultAdvisor(runId, voice)`

when the player clicks a button, the JS POSTs to `/runs/:id/advisor`
with `{ voice }`, gets the read back as JSON, and renders it in
the read area. the active button is marked `data-active="true"`.

### 2. the server route

`POST /runs/:id/advisor` (cycle 12d+1's new route):
- validates the voice is one of the 5 ADVISOR_VOICES
- checks the cache: `session.advisorReads[\`${currentTurn}:${voice}\`]`
  - if cached, return the cached read (with `fromCache: true`)
  - else: call `consult({ voice, crisis, state, playerMove: '[player is consulting before writing their move]', identity })`
  - cache the result in the session, persist
  - return `{ voice, read, retrievedPages, fromCache: false }`

the LLM call is ~5-10s. cache hit is <10ms.

### 3. the read area

the read area has two states:
- **empty:** italic hint "Consult an advisor to see how this position
  sees the current crisis. (Read does not consume a turn.)"
- **populated:** the voice label (e.g. "Civil Society"), the read
  body in serif prose, and a "Sources:" line with the corpus pages
  that grounded the response (rendered as small mono links)

when the player re-clicks an already-consulted voice, the cached
read is returned and displayed with a "(cached)" tag. the engine's
`consult()` is corpus-grounded — it retrieves 6 pages from the
wiki index (4 voice-specific + 2 crisis-relevant) and feeds them
to the LLM with a constrained prompt. the result is *grounded in
the project's own corpus*, not just LLM hallucination.

### 4. the bug fix: turn-1 dock

cycle 12d+1 also fixes a pre-existing bug in the v1 surface: the
decision dock was *not rendering on turn 1* because the v1
server's `handleRunPage` and `handleSubmitMove` only included
*prior* turns in the surface adapter's `turns[]` array. the
*current* crisis (which is what the player is reasoning about
RIGHT NOW) wasn't included.

the fix: for active runs, push the `currentCrisis` as the last
item in `surfaceTurns` (with `player_move: null`, indicating the
player hasn't moved yet). the surface adapter then has the
current crisis in its data, and the dock renders.

this was a *pre-existing* gap in the v1 surface. the advisor
panel lives in the dock, so the bug fix is part of 12d+1 — the
advisor panel is now visible on the player's first interaction
with the simulation.

## the cache model

session.advisorReads is keyed by `${currentTurn}:${voice}`. when
the player advances to turn 2, the turn-1 consults are *not* shown
anywhere (they're in the session but the surface adapter only shows
the current turn's read). this matches the discord model: advisor
consults are transient interactions, not part of the run record.

a re-click of the same voice on the same turn returns the cached
read in <10ms with `fromCache: true`. the "cached" tag is shown
in the read area so the player knows they're seeing the same
response, not a fresh one.

## the read area persistence

when the player consults an advisor and then refreshes the page,
the consult is preserved — the session has `advisorReads`, the
page re-renders with `deriveAdvisorRead(session)`, and the read
area is populated. the most recent consult is shown; the prior
turn's consults are not displayed (matches the discord model).

## the engineering surface

- `src/sim/advisors.js` — the engine's `consult()` function, exported
- `src/web/server.js` imports `consult` and `ADVISOR_VOICES` from
  the engine, calls them in `handleConsultAdvisor`
- `src/web/surface.js` renders the panel and the read area
- no engine changes, no schema changes, no new dependencies

## verification

`/tmp/hermes-verify-12dplus-advisors.sh`. **28 of 28 checks pass.**
categories:

1. surface adapter: renderDecisionDock accepts advisorRead + consultedVoice
2. 5 advisor voices are rendered with correct labels and data-voice keys
3. empty read state and populated read state both render correctly
4. server.js imports consult() and ADVISOR_VOICES from the engine
5. handleConsultAdvisor is defined, the route is wired
6. deriveAdvisorRead and deriveConsultedVoice helpers defined
7. advisor CSS classes present in surface.js
8. live HTTP test: server boots, POST /runs starts a run, POST /runs/:id/advisor returns the right shape, cache works on second consult, different voice is fresh, invalid voice returns 400, non-existent run returns 404, seed run returns 404, re-rendered page has the populated read area, exactly 1 active voice, (cached) tag is shown
9. aesthetic compliance (no gradients, no box-shadow)

real LLM calls were made during verification. the frontier-lab
consult returned a 932-char read grounded in 6 corpus pages; the
civil-society consult returned a 1033-char read grounded in
Algorithmic Authority, Algorithmic Transparency, OpenAI and
Anthropic, Agentic AI, and two signal entries.

## what 12d+1 does NOT do

- **no per-turn advisor history in the chat-thread.** prior turns'
  consults are persisted in the session but not displayed. the
  discord model matches: advisor consults are transient.
- **no "refresh" button.** re-clicking returns the cached read; if
  the player wants a fresh LLM call, they'd need to advance the
  turn and come back. v2 could add this.
- **no rate limit.** a player could click all 5 voices 5 times each,
  triggering up to 25 LLM calls per turn. the cost is the player's
  choice. the cache helps (5 calls then 0 LLM calls per voice).
- **no turn-1 placeholder fix.** the seed crisis has
  `pressure: "(LLM-generated)"` and `decision_point: "(LLM-generated)"`
  as placeholders. on turn 1, the decision question in the dock
  shows this placeholder text. a real decision question appears on
  turn 2+. this is a follow-up issue (cycle 12e?).

## next

- the v1 surface is now feature-complete per the spec: 5 decisions
  (auth, corpus, post-game, trajectory, advisor) all landed.
- v2 (cycle 13+) is the auth layer + multi-player.
- the cycle 12e follow-up: turn-1 placeholder question.
- the cycle 6g thread: discord polish + deployment, still open.
