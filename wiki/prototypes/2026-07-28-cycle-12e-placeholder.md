# 2026-07-28 — Turn-1 placeholder decision question (cycle 12e)

cycle 12e fixes a UX gap in the v1 surface: on turn 1, the seed
crisis has placeholder `pressure: "(LLM-generated)"` and
`decision_point: "(LLM-generated)"` strings. the engine elaborates
these after the player's first move, but on turn 1 the player
never sees the elaboration — they'd see the literal placeholder
text in the decision dock and the per-turn card.

cycle 12e is a small web-only cycle that adds per-failure-pattern
question and pressure substitution to the surface adapter. when
the engine produces a placeholder, the surface adapter substitutes
a hand-authored, per-pattern question and pressure so the player
sees a real, specific decision to make on turn 1.

## what shipped

```
src/web/surface.js   +60 lines: PATTERN_QUESTIONS, PATTERN_PRESSURES,
                              resolveDecisionQuestion, resolveDecisionPressure
```

no engine changes. cycle 12e is a *display* fix in the surface
adapter, not a simulation change. the engine still produces the
placeholders; the LLM still elaborates them after the first move.

## the four failure patterns and their questions

| pattern | question |
|---------|----------|
| upstream-embedding | How does the regime respond to a capability release that outpaces its evaluation capacity? |
| compute-capability-escape | How does the regime address a lab whose capabilities exceed disclosed evaluation thresholds? |
| legitimacy-erosion | How does the regime rebuild trust in the safety institutions whose credibility has eroded? |
| memetic-narrative-capture | How does the regime counter a coordinated narrative that distorts the public record? |
| (unknown) | How do you respond to this situation? |

each pattern also has a per-pattern pressure:

| pattern | pressure |
|---------|----------|
| upstream-embedding | The lab's capabilities have outpaced the regulator's evaluation capacity, and the next capability release is announced before the prior review is complete. |
| compute-capability-escape | The disclosed evaluation thresholds have been exceeded in production, and the gap is widening with each capability release. |
| legitimacy-erosion | Public trust in the safety institutions has eroded, and the regime's evaluation process is no longer seen as credible by the press, the public, or the labs. |
| memetic-narrative-capture | A coordinated narrative has distorted the public record, and the regime's response is being interpreted through that frame before any policy action is taken. |
| (unknown) | The current situation demands a response, and the regime has limited time to act. |

## the substitution logic

the surface adapter has two new helpers:

- `resolveDecisionQuestion(decisionQuestion, failurePattern)` — if
  the engine produced a real question (not the `(LLM-generated)`
  placeholder), use it. Otherwise, substitute the per-pattern
  question. If the pattern is unknown, fall back to a generic
  question.

- `resolveDecisionPressure(pressure, failurePattern)` — same logic
  for the pressure field.

both helpers are case-insensitive on the placeholder match
(`(llm-generated)` and `(LLM-generated)` are both recognized).

## where the substitution happens

two places in the surface adapter:

1. `renderTurnCard` — the per-turn card in the chat-thread. The
   pressure and decision_question are both substituted if they're
   placeholders. Prior turns get the same treatment, so a player
   going back to read turn 1 sees a real pressure and question,
   not the placeholder.

2. `renderDecisionDock` — the decision dock at the bottom of the
   page. The decision_question is substituted. The player sees
   a real, specific question in the dock.

## why not call the LLM at run-start?

i considered calling the LLM at run-start to elaborate the seed
into a full crisis (with real pressure and decision_question
fields). this would mean an LLM call on every run-start, even
before the player has written anything. the v1 surface's value
is the player's *first impression* is fast; a 3-5s LLM call
before the first turn is an unnecessary delay.

the per-pattern question approach has different trade-offs:
- the questions are *authored*, not LLM-generated. they're stable.
- the player sees a real, specific question immediately.
- the LLM still gets to do its work on the first move (the world
  generator produces the rich pressure/decision_point for turn 2's
  seed). the player just doesn't see a turn-1 question that's
  *fully* authored by the LLM before they've moved.
- cost: 0 LLM calls for the turn-1 substitution.

## verification

`/tmp/hermes-verify-12e-placeholder.sh`. **17 of 17 checks pass.**
categories:

1. per-pattern question and pressure maps are defined (4 patterns × 2 maps)
2. resolveDecisionQuestion: real question is passed through
3. 4 placeholder+pattern combinations substitute correctly
4. case-insensitive placeholder detection
5. unknown pattern → generic fallback
6. resolveDecisionPressure: same logic (real passes through, placeholder substitutes, unknown falls back)
7. renderDecisionDock uses resolveDecisionQuestion
8. renderTurnCard uses both resolvers
9. placeholder text does not appear in the rendered run page
10. v0/v1 regressions — GET /, /runs/:id, /runs/:id/status still work
11. seed runs (authored content) don't show `(LLM-generated)`

the existing live run from cycle 12d+1 testing (failure_pattern:
legitimacy-erosion) was rendered with the per-pattern question
("How does the regime rebuild trust in the safety institutions
whose credibility has eroded?") and per-pattern pressure
("Public trust in the safety institutions has eroded, and the
regime's evaluation process is no longer seen as credible by
the press, the public, or the labs."). zero matches for
`(LLM-generated)` in the rendered page.

## what 12e does NOT do

- no LLM call at run-start. the per-pattern question is the
  substitution; the LLM still elaborates after the first move.
- no engine changes. the engine still produces placeholders;
  the surface adapter substitutes them.
- no per-pattern *situations*. the situation field is the seed's
  `trigger`/`situation`, which is the *real* situation text (not
  a placeholder). no substitution needed.
- no per-pattern headlines. headlines are post-move world
  generator output. not relevant to turn 1.

## next

- user plays the v1 surface. the player experience is now: see a
  real question on turn 1, consult advisors, write a move, see a
  rich turn-2 question (from the LLM). no more placeholder text.
- v1 surface is feature-complete per the spec. v2 (cycle 13+) is
  the auth layer + multi-player.
- cycle 6g (discord polish) is still open.
