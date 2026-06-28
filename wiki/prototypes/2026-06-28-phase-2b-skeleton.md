---
title: "Phase 2b — Simulation engine skeleton works end-to-end"
date: 2026-06-28
type: prototype
prototype_kind: observed-behavior
model: "n/a (mock LLM only)"
---

## Observation

The simulation engine skeleton (Cycle 2b) runs end-to-end. The loop surfaces crises, accepts (simulated) player input, produces (mock) LLM output, applies state deltas, checks for collapse, and writes a structured run log.

This prototype validates that:

- The state vector representation (six axes, named bands, delta application) works.
- The crisis generation rule selects appropriate crises based on state.
- The mock LLM produces state-sensitivity — the same player archetype gets different deltas from different crises.
- The collapse detection function fires correctly for all three collapse modes.
- The run log format matches the spec — each turn gets a section, the metadata is at the top, the collapse block is appended when a collapse fires.

## Probe

Commands run:

```bash
# Full simulation
node src/sim/index.js

# Short simulation
node src/sim/index.js --turns 8

# Direct unit tests
node /tmp/test-collapse.js  # verified all three collapse modes fire
node /tmp/test-crisis.js    # verified crisis selection works
```

Result summary:

**Full simulation (14 turns):**
- Run ID: 20260628221732-y4py7p
- Outcome: no-collapse
- Final state: legitimacy 69, fiscal_slack 69, elite_alignment 87, ecological_debt 33, narrative_coherence 77, capability_frontier 57
- Run log: 531 lines, well-formatted

**8-turn simulation:**
- Run ID: 20260628221826-lhescn
- Outcome: no-collapse
- Run log: generated correctly

**Collapse detection (direct unit test):**
- `legitimacy-collapse`: fires at turn 10 with legitimacy=18, elite_alignment=27 ✓
- `technical-collapse`: fires at turn 10 with capability_frontier=85, narrative_coherence=35 (eroded band) ✓
- `narrative-capture-collapse`: fires at turn 12 with narrative_coherence=22, elite_alignment=38, ecological_debt=75 ✓
- Minimum-turn safeguard: no collapse fires at turn 7 even with collapse conditions met ✓

**Crisis selection (direct unit test):**
- With INITIAL_STATE: selects crisis-1 (Frontier lab capability release) ✓
- With low legitimacy (15): selects crisis-5 (Public legitimacy tipping point) ✓
- 8/8 unique crises selected over 10 turns (no repeats until exhausted) ✓

## Output

The full run log for a 14-turn session (run ID 20260628221732-y4py7p) is 531 lines and follows the run-log-format spec: YAML frontmatter with run metadata, then per-turn sections with Crisis, Player move, Grammar output, and State after turn.

## Interpretation

**The skeleton works.** Every component the simulation depends on is operational:

- State vector: representation, delta application, band computation, collapse detection — all verified.
- Crisis generation: rule-based selection from the 8-crisis deck, no repeats within a run.
- Mock LLM: produces state-sensitive deltas — different crises, different deltas. Crude but functional.
- Run loop: turn-by-turn orchestration with collapse short-circuit, structured logging.
- Run log: format matches the spec, 531 lines for a 14-turn session, includes all required fields per wiki/mechanics/run-log-format.md.

**One real finding from the probe:**

The mock LLM is too forgiving for "bad player" archetypes — when a player only does quick-response moves (press conferences, public statements), the mock still produces small positive legitimacy deltas. The result is that the simulation rarely collapses in 14 turns even with minimal structural engagement.

This is acceptable for 2b (the skeleton is structural, not behavioral), but the real LLM in 2c will produce more varied outputs. The mock's tuning is a 2c concern, not a 2b concern. The collapse detection *function* is correct (verified by direct unit test); the mock's *behavior* just doesn't push state to collapse conditions in 14 turns.

**What the skeleton proves about the real implementation:**

- The state model is a real, working data structure with a real update rule and a real collapse check.
- The crisis deck is wired correctly to the selection rule.
- The run log format works for real runs and produces real artifacts.
- The CLI entry point works with parameter handling.

**Implications for Cycle 2c.** The skeleton is ready to be upgraded:

- `src/sim/mock-llm.js` becomes `src/sim/grammar.js` — real OpenRouter calls per the grammar spec, using the wiki retrieval and the state model.
- The simulated player input becomes real player input (read from stdin or a UI).
- The simulation engine's structure stays the same; only the LLM module changes.

**File inventory:**

- `src/sim/state.js` — state vector, delta application, band computation, collapse detection.
- `src/sim/crisis-generator.js` — 8-crisis deck, selection rule.
- `src/sim/mock-llm.js` — 8 hand-authored crisis handlers + generic response.
- `src/sim/run.js` — run loop, run log generation, run log writing.
- `src/sim/index.js` — CLI entry point.

This prototype observation is filed per Principle 4.5 (Dancing with the Details in the Design). The simulation engine has been observed working end-to-end. The case-study claim is testable: when 2c wires the real LLM, the wiki retrieval will provide corpus grounding and the grammar will produce real interpretive glosses.

`.gitignore` updated to exclude `runs/` directory (the simulation's run log output).
