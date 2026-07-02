# Prototype — 2026-06-29 — Phase 5c: world generator (LLM-driven narrative response)

## Observation

Cycle 5c solves the second half of the walkthrough feedback: "the text doesn't seem to respond to the user's response." Previously, the simulation had two narratives sitting next to each other, not in dialogue:

- The static crisis file (e.g., "Industry announces a new model. You must respond.")
- The grammar's interpretive gloss (e.g., "Your move stabilizes the visible legitimacy signal")

The player wrote policy, the numbers moved, but the next turn's crisis felt like it was drawn from a static deck rather than generated in response to what they just said.

The fix collapses the two narratives into one. The **world generator** is the new LLM call that produces, given the player's prior move + current state + retrieved corpus context: (a) state deltas, (b) what happens in the world next, (c) the next turn's prose (situation / pressure / decision point), (d) the wiki entries cited. The player sees only the prose; the artifact captures the full structured output.

## What shipped

### 1. New module: `src/sim/world-generator.js`

A single LLM call (`generateWorld({priorCrisis, state, playerMove, turnHistory})`) that returns:

```json
{
  "state_delta": { "legitimacy": 5, ... },
  "narrative": "You convene a 60-day review. Anthropic, surprised by the speed, agrees to a 90-day window. ...",
  "situation": "Anthropic has agreed to a 90-day review window. A second lab is rumored to be planning a similar release.",
  "pressure": "The next 30 days will determine whether other labs follow Anthropic's example or accelerate their own timelines.",
  "decision_point": "How do you handle the rumored second release, and do you use the 90-day window to set standards that bind future releases?",
  "grounding_trace": ["concepts/algorithmic-authority.md", ...],
  "confidence": "high"
}
```

The system's prompt instructs the LLM to:
- Output ONLY valid JSON matching the schema.
- Make the narrative respond to the player's prior move (use a verb or noun from their move).
- Build on the prior turn's narrative (the world is continuous).
- Reference at least one retrieved corpus entry (case-study claim).
- Not recommend actions to the player (you are the world, not their advisor).

The world generator merges what was previously two LLM calls (grammar + crisis deck lookup) into one. Per the user's confirmation of design point 7: one LLM call per turn produces both state deltas and the response narrative.

### 2. Updated `src/sim/interactive.js`

The play loop now:
- For turn 1: uses the static seeded crisis (from `selectCrisis`)
- For turns 2+: uses the *prior* turn's world generator output, converted to crisis shape via `crisisFromWorld(world, fallbackTitle)`

The world generator call is wrapped in the existing `withSpinner` for status display during the 10-30s LLM wait. If the world generator fails (3 retries), the loop falls back to the static grammar + crisis deck and logs a warning.

The run log now includes:
- A `### World response (narrative)` section per turn (the world generator's narrative)
- A top-of-file note if any turn used the fallback path
- A per-turn note (`> *This turn used the static fallback path...*`)
- The crisis title line includes `(failure pattern: <x>; from world generator)` for turns 2+ vs `(failure pattern: <x>; static seeded crisis)` for turn 1

The artifact generator surfaces the world generator's interpretive_gloss and narrative_move through its existing interpretive-chain section. The narrative field itself is in the run log (full record) but not the artifact (kept the artifact shape stable per cycle 5c scope).

### 3. First-turn static seed preserved

The authored crisis files (`wiki/mechanics/crises/*.md`) are now used only for turn 1 and as fallback. Their authoring work is preserved (they still give the world a known-good opening), but for turns 2+ the world takes over and produces narrative in response to the player.

## What the player experience looks like

A two-turn run with the real LLM (illustrative — actual output depends on model and prompt):

```
  ─── Turn 1 ───
  Frontier lab capability release

  Situation: Anthropic has released Claude Mythos...
  Pressure:  The release was announced with a 14-day notice...
  Decision point: How does the regime respond to a capability release that outpaces its evaluation capacity?

  Your move (or `a` for an advisor): We will convene a 60-day review with civil society observers.

  Interpreting your move ·  ·  ·  ·

  ─── Turn 2 ───
  Continuing crisis

  Situation: Anthropic has agreed to a 90-day review window. A second lab is rumored to be planning a similar release.
  Pressure:  The next 30 days will determine whether other labs follow Anthropic's example or accelerate their own timelines.
  Decision point: How do you handle the rumored second release, and do you use the 90-day window to set standards that bind future releases?
```

The key change: turn 2's prose directly references the player's turn-1 move ("A second lab is rumored to be planning a similar release" is a consequence of "we will convene a 60-day review"). It's no longer drawn from a static deck.

## Verification

`/tmp/hermes-verify-5c.sh` — all 8 checks pass:
1. World-generator module exports the right surface (5 functions)
2. Validator accepts complete output; rejects missing narrative, out-of-range deltas, empty grounding_trace (case-study claim requires it)
3. End-to-end probe: world generator called once per turn (turns 1 and 2 both got world responses)
4. Turn 2's prose comes from the world generator's prior-turn output (verified by marker strings)
5. Fallback path: when world generator throws, the static grammar is used and the run log records the fallback (case-study claim preserved)
6. **5a, 5b, 5b.5 verifications still pass** (no regression)
7. **4a-4e verifications still pass** (deeper regression)
8. Wiki audit clean: 66 indexed, 0 schema, 0 broken links

**Two real end-to-end probes** (in the test, not the verification):
- With mocked world generator: turn 1's static crisis surfaces, player's move is captured, turn 2's prose is the world generator's prior-turn output (situation / pressure / decision point).
- With mocked world generator throwing: the static fallback runs, the run log records the fallback count + per-turn note, the artifact still gets a narrative (the grammar's interpretive_gloss stands in).

## Design notes

**Why one LLM call instead of two.** The user confirmed: merge grammar + world-gen into one LLM call. Total wall time per turn stays at 10-30s (one LLM call), not 20-60s (two LLM calls). The output is a superset of the grammar's output (state_delta + interpretive_gloss + narrative_move + grounding_trace + confidence) plus the new narrative fields.

**Why the first turn is static.** The world generator has nothing to *respond* to on the first turn (no prior move). The authored crisis files give a known-good opening that's corpus-grounded. After turn 1, the world takes over.

**Why the fallback preserves the case-study claim.** The fallback uses the existing `grammar.js` (which retrieves corpus context + produces grounding traces). So even when the world generator is down, every turn's output is still corpus-grounded and auditable. The run log notes which turns used the fallback, so the audit trail records when the simulation deviated from the new model.

**Why the artifact generator wasn't changed.** The artifact already surfaces the world generator's interpretive_gloss and narrative_move through its existing interpretive-chain section. Adding the narrative field to the artifact would require either a new section (breaks the artifact's existing 8-section template) or replacing gloss/narrative_move (changes the cycle 3c artifact design). Both are scope creep for 5c. The narrative lives in the run log; the artifact surfaces the gloss + narrative_move (which are now derived from the world generator).

**Why the world generator's `narrative_move` field is kept.** The grammar spec's `narrative_move` is "what happens next in the world, given the player's action." The world generator's `narrative` field is the same thing but longer and more detailed. We keep both in the output — the artifact uses `narrative_move`, the run log uses `narrative`. This preserves the cycle 3c artifact's interpretive chain unchanged.

**The system prompt temperature.** Set to 0.4 (vs the grammar's 0.2). Higher temperature lets the world produce more varied narrative, which matters for the loop's responsiveness. The grammar's lower temperature was right for stable state-delta output; the world generator's narrative wants some variation.

**State sensitivity.** The system's prompt explicitly tells the LLM: "identical player moves in different states may produce different deltas. Use the current state vector." The retrieveContext function also weights the query by the most-stressed axes, so the LLM sees the corpus entries most relevant to the current state.

## What this cycle does NOT address

The corpus-quote spinner content (mentioned in 5b.5) is still a follow-up. The world generator's narrative is rich, but during the 10-30s LLM wait the player only sees the pendulum spinner. A corpus quote per turn (drawn from the wiki) could add texture; that's 5c.5 if needed.

The narrative surface in the play loop is now responsive, but the corpus grounding could be richer. The world generator retrieves 4 corpus entries; if those don't include an obvious match for the situation, the LLM may rely on its prior. That's a tuning issue for the next walkthrough to surface.

The visible-signal layer is still only in the artifact (not the play loop), per 5b. We can revisit that.

## Files changed

- `src/sim/world-generator.js` — new module (the world generator)
- `src/sim/interactive.js` — restructured loop to use world generator for turns 2+, with fallback path; updated run log to capture narrative + fallback notes

## Phase 5 status

| cycle | status |
|---|---|
| 5a | doc pass (edutainment reframe, Principle 6, advisor welcome) — done |
| 5b | collapse the loop to crisis → response — done |
| 5b.5 | multi-line input + status spinner — done |
| 5c | world generator (LLM-driven narrative response) — done |
| 5d+ | play the new loop across archetypes, observe the litmus test |

## Next

Play the new loop. With a real LLM and a few runs, you'll see whether the prose actually responds to your move — that's the core test. The walkthrough across archetypes (structural, symbolic, mixed, speedrun) will surface any remaining issues. We may discover the world generator's prompt needs tuning (the LLM doesn't reference the player's move strongly enough), or that the corpus retrieval isn't bringing the right entries, or that the narrative occasionally contradicts itself.