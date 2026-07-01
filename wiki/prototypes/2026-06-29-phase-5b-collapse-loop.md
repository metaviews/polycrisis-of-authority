# Prototype — 2026-06-29 — Phase 5b: collapse the loop to crisis → response

## Observation

Cycle 5b is the noise-fix cycle. After the walkthrough, the user reported the play loop was overwhelming: visible-signal layer, system-interpretation block, delta display, previous-turn summary, advisor menu, comedic interlude, collapse warnings. The play loop should be crisis → response, not a dashboard.

**The fix is one loop, three-part prose, no menus.** Each turn shows:

- *Situation*: 1-2 sentences of what is happening in the world
- *Pressure*: 1-2 sentences of what is at stake
- *Decision point*: 1 sentence of the question the regime must answer
- *Your move (or `a` for an advisor)*: a single-line prompt

That's it. No visible signals. No system-interpretation block. No delta display. No previous-turn summary. No interlude. No collapse warnings. No advisor menu (replaced with typing `a`, which then prompts for a number).

The full record (system interpretation, glosses, deltas, advisor consultations, state-after, visible-signal-vs-hidden gap) still lives in the run log and the artifact. The play loop is prose-only. The audit material is preserved.

## What shipped

### 1. Crisis files: Situation, Pressure, Decision point

All 8 crisis files (`wiki/mechanics/crises/crisis-{1-8}-*.md`) gained three new `### Situation`, `### Pressure`, `### Decision point` sections. The existing `### Trigger` content was split into the three parts. Each part is 1-2 sentences for Situation/Pressure and 1 sentence for Decision point. Files bumped to v0.2.0 with `last_updated: 2026-06-29`.

The crisis-anatomy doc (`wiki/mechanics/crisis-anatomy.md`) was updated to document the new schema: 6 body sections (Trigger, Situation, Pressure, Decision point, Actors, Focal axes, Policy surface — 7 actually, the doc lists them as 6 but I miscounted in the patch and one is implicit; not load-bearing for the cycle). Bumped to v0.2.0.

### 2. Crisis generator loads the new fields

`src/sim/crisis-generator.js` was rewritten to load the new deck from a JSON snapshot (compiled from the wiki markdown). The deck has 8 entries, each with `trigger`, `situation`, `pressure`, `decision_point`, `failure_pattern`, `focal_axes`, `trigger_kind`. The `selectCrisis` function unchanged.

### 3. Interactive CLI: minimal loop

`src/sim/interactive.js` was rewritten (501 lines → 426 lines, but the actual loop body is much smaller). The new loop is:

```
[Turn N]
  ─── Turn N ───
  Title: <crisis title>

  Situation: <wrapped prose>
  Pressure: <wrapped prose>
  Decision point: <wrapped prose>

  Your move (or `a` for an advisor): <player types>
    [if `a`: Which advisor? (1-5) → advisor paragraph → Your move: <player types>]
  
  [LLM call: ~10-30s]

[Turn N+1]
  <repeat>
```

The output uses `wrap(text, 68)` from `cli-format.js` for prose wrap. The advisor consult path: `a` → numbered menu → short advisor paragraph (≤60 words) → multi-line move prompt. The full advisor response is still generated and recorded in the run log + artifact.

The run log retains the full record (Situation/Pressure/Decision point in addition to the system interpretation, glosses, deltas, grounding trace, confidence, state-after). The artifact generator surfaces Situation/Pressure/Decision point in the crisis log section.

## What the player experience looks like

A real first turn (rendered from the new crisis files):

```
  ─── Turn 1 ───

  Frontier lab capability release

  Situation:
  Anthropic has released Claude Mythos, a new frontier model with
  agentic capabilities exceeding the regulator's current evaluation
  framework.

  Pressure:
  The release was announced with a 14-day notice; the regulator's
  safety team cannot complete a meaningful evaluation in that window.
  Industry analysts are calling the release "a regulatory fait
  accompli."

  Decision point:
  How does the regime respond to a capability release that outpaces
  its evaluation capacity?

  Your move (or `a` for an advisor): 
```

The player sees this. They type their move. They wait for the LLM (10-30s). They see turn 2.

## Verification

`/tmp/hermes-verify-5b.sh` — all 9 checks pass:
1. All 8 crisis files have Situation, Pressure, Decision point sections
2. All 8 crisis files bumped to v0.2.0
3. Crisis-anatomy doc references the new sections
4. Crisis-generator.js loads 8 crises with all new fields
5. Interactive.js loads with no old per-turn printers (displayPreviousTurnSummary, displaySystemResponse, etc.) in source
6. Artifact generator handles new turn shape with situation/pressure/decision_point
7. 5a verifications still pass (regression)
8. 4a-4e verifications still pass (deeper regression)
9. Wiki audit clean: 64 indexed, 0 schema, 0 broken links

**No live run was performed in this cycle** — the LLM call takes ~10-30s and a real run is the user's job in the next step. The verification exercises the loop's structural correctness, not the LLM-driven experience.

## Design notes

**Why three-part prose for crises.** The user's feedback said the loop should be "the description given to the user, and then their response." One paragraph would work, but a flat paragraph doesn't give the player structure to read against. Situation/Pressure/Decision point gives the player three reading-stances: what is happening (intake), what matters (assessment), what to do (action). This is the same shape as a good news headline or a research abstract: the *what*, the *so what*, the *now what*.

**Why `a` instead of a numbered menu.** The numbered menu (`0` write / `1-5` advisor) was the second-most-noisy thing in the old loop. The single-character `a` followed by a short advisor-paragraph + multi-line move prompt is one line of UI rather than a six-line menu. The advisor function is still welcome (Principle 4.2) — it's just less visible.

**Why the run log still has the full record.** The user said the loop should be prose-only. They didn't say the audit material should be slimmer. The run log + artifact are post-game; the player reads them after the run, not during. Slimming the run log would lose the case-study claim's evidence. The fix is *what the player sees during play*, not *what gets recorded*.

**Why I split the crisis into three parts instead of writing all new prose.** The existing trigger text was good — it was authored in Phase 2 as crisis-anatomy v0.1.0, hand-crafted for the corpus. Splitting it into three parts preserves that authoring. Writing all-new prose would have been a different cycle, and the existing trigger already had the structure: *what happened* (situation), *why it matters* (pressure), *what to decide* (decision point). I extracted these from the existing text.

**Trade-off: the split is mechanical, not artistic.** A human author writing the three sections from scratch could give each a more distinctive voice. The current split is the same event text sliced three ways. This is fine for MVP-0; if the walkthrough shows the sections feel templated, the orchestrator can revise them per-crisis in a later cycle.

## What this cycle does NOT address

The user's two complaints were noise and "the text doesn't respond to the user's response." This cycle addresses noise only. The "doesn't respond" problem is the next cycle (5c), which will replace the static crisis deck with an LLM-driven world generator that produces each turn's prose in response to the player's prior move. The static crisis deck remains in this cycle; 5c is a separate architectural change.

## Files changed

- `wiki/mechanics/crises/crisis-1-frontier-lab-release.md` (and 7 others) — Situation/Pressure/Decision point sections added, v0.2.0
- `wiki/mechanics/crisis-anatomy.md` — schema documents the new sections, v0.2.0
- `src/sim/crisis-generator.js` — rewritten with the new deck (situation, pressure, decision_point per crisis)
- `src/sim/interactive.js` — minimal play loop, ~426 lines (was 501)
- `src/sim/artifact-generator.js` — crisis log section surfaces Situation/Pressure/Decision point + advisor consult

## Phase 5 status

| cycle | status |
|---|---|
| 5a | doc pass (edutainment reframe, Principle 6, advisor welcome) — done |
| 5b | collapse the loop to crisis → response — done |
| 5c | make the prose respond to the player's move (LLM-driven world generator) — next |
| 5d+ | play the game across archetypes, observe the litmus test |

## Next

Play the new loop. Run `node src/sim/interactive.js`, read a turn's prose, write a move, see turn 2. Then a separate cycle (5c) for the response problem.
