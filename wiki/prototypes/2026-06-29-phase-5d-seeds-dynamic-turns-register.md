# Prototype — 2026-06-29 — Phase 5d: parameterized seeds + dynamic turn count + accessible register

## Observation

Cycle 5d sets up the actual walkthrough. Three changes that address concerns surfaced during the 5c cycle:

1. **The static seed crisis was grounding gameplay in a predictable path.** Turn 1 always surfaced the same Anthropic / OpenAI / UAE-actor crisis with the same trigger prose. Across runs, the player would see the same actor names and event framing. The 8 crises had been authored once and reused indefinitely.

2. **The 14-turn limit was arbitrary.** The number 14 wasn't principled — it was set in phase 2 when the deck was 8 crises and the run needed room to surface multiple. With the world generator producing narrative, the run length should be a property of the gameplay, not a fixed cap.

3. **The legalistic register made the prose exhausting.** "Anthropic has released Claude Mythos, a new frontier model with agentic capabilities exceeding the regulator's current evaluation framework." That's a think-tank sentence. The player reads 14+ of these. The project is edutainment (cycle 5a) — the prose should read like a smart briefing, not a policy memo.

## What shipped

### 1. Parameterized seeds (`scripts/seed-variants.js`)

The 8 static crises became 8 parameterized seeds, each with:
- `seed_fragment`: 1 sentence; the LLM's prompt anchor (NOT player-facing)
- `failure_pattern`: one of the four from crisis-anatomy
- `focal_axes`: which state axes this seed foregrounds
- `actor_pool`: 3-5 named entities (e.g., for crisis-1: Anthropic, OpenAI, DeepMind, Meta AI, Mistral)

`selectSeed({state, usedIds, usedActors})` picks a (seed, actor) pair weighted-randomly by focal-axis match against the current state. A baseline weight of 1.0 per seed ensures every seed has a non-zero chance even in calm states (this was a bug fix during the cycle — initially crisis-4 always won when ecological_debt > 50 because it was the only seed with ecological_debt in its focal axes).

Across 30 picks, 15-20 distinct actors surface. Across 200 picks, all 8 seeds surface. Within a run, seeds and actors don't repeat.

The 8 crisis files in `wiki/mechanics/crises/` were updated:
- `actor_pool` field added to frontmatter
- `seed_fragment` field added to frontmatter
- `### Situation`, `### Pressure`, `### Decision point` sections **removed** — these are now LLM-generated
- `### Seed fragment` section added (replaces Situation as the body section)
- Files bumped to v0.3.0, `last_updated: 2026-06-29`

The `wiki/mechanics/crisis-anatomy.md` was updated to v0.3.0 to document the new shape: frontmatter additions (actor_pool, seed_fragment), the Seed fragment body section, and the fact that situation/pressure/decision-point are LLM-generated outputs (not authored prose).

### 2. Dynamic turn count (`src/sim/interactive.js`)

Three new constants:
- `MAX_TURNS = 30` (runaway cap, was 14)
- `STABILIZATION_THRESHOLD = 5` (consecutive non-collapsing turns in holding/strained band to trigger stabilization)
- `STABILIZING_BANDS = new Set(['holding', 'strained'])`

The run now ends on three conditions:
- **collapse**: any of the three collapse modes fires (legitimacy, technical, narrative capture)
- **stabilization**: 5 consecutive turns with all 6 axes in holding/strained band → outcome `stabilized`
- **max turns**: 30-turn cap → outcome `no-collapse`

The stabilization heuristic is intentional design. The existing INITIAL_STATE has `ecological_debt: 30` (eroded band), which means **you cannot stabilize unless you actively raise ecological_debt**. That forces the player to engage with structural problems, not just short-term crises. This aligns with the taoist frame — you can't just declare victory, you have to actually address the conditions.

The world generator now passes through `seedFragment` and `actor` as part of its prompt. The user prompt structure changed: instead of `Title / Situation / Pressure` from the prior crisis, the prompt now includes `Fragment: ... / Actor for this seed: ...` when a seed is available. The LLM weaves the actor into the situation prose.

### 3. Accessible register (`src/sim/world-generator.js`)

A new `REGISTER` section was added to the system prompt:

> Voice: a smart briefing from someone who knows the material and respects the reader. Slightly wry when the situation calls for it. NOT jokey.
> - Short sentences. Aim for 8-15 words each.
> - Concrete actors doing concrete things. Use the actor from the seed prompt when applicable.
> - Active voice.
> - Accessible language. Translate jargon into plain English.
> - The prose is for a player who is curious and alert, slightly pressed for time, and wants to understand the situation without re-reading.

Before/after example (illustrative, not from a real run):
- Before: "Anthropic has released Claude Mythos, a new frontier model with agentic capabilities exceeding the regulator's current evaluation framework."
- After: "Anthropic released a new model today — Claude Mythos. It's the first model that can reliably do multi-step economic tasks on its own. Industry analysts are calling it a regulatory fait accompli. The safety team has 14 days to evaluate it, and they can't."

### 4. Cycle-5b verification update

`/tmp/hermes-verify-5b.sh` was checking for `### Situation / ### Pressure / ### Decision point` sections in crisis files, expecting the v0.2.0 schema. Cycle 5d replaced that with `### Seed fragment`. Updated the verification:
- V1: now checks for `### Seed fragment` (not Situation/Pressure/Decision point)
- V2: now checks for `version: "0.3.0"` (was v0.2.0)
- V3: now checks for `Seed fragment` in crisis-anatomy.md

## Verification

`/tmp/hermes-verify-5d.sh` — all 12 checks pass:
1. seed-variants module shape (8 seeds, fragment, axes, 3-5 actors)
2. ≥4 distinct actors surface in 30 picks (got 15-20 typical)
3. ≥6 distinct seeds surface in 200 picks (got 8)
4. world generator prompt contains register guidance (5 sub-checks)
5. generateWorld and buildUserPrompt accept seedFragment + actor
6. all 8 crisis files have seed_fragment and actor_pool
7. crisis files use ### Seed fragment, not authored Situation/Pressure
8. end-to-end with seed: turn 1 shows "Seed (situation):" + deferred note
9. stabilization fires when state holds 5 consecutive turns; run log records outcome: stabilized
10. **5a + 5b + 5b.5 + 5c verifications still pass** (no regression)
11. **4a-4e verifications still pass** (no deeper regression)
12. wiki audit clean: 67 indexed, 0 schema, 0 broken links

This is ad-hoc verification, not a green test suite, but the 12 checks cover:
- the new seed-variants module's shape and behavior
- the accessible-register guidance is in the prompt
- the crisis files have the new schema
- end-to-end turn 1 uses the seed shape
- stabilization detection fires correctly
- all 9 prior cycle verifications still pass
- wiki audit is clean

## Design notes

**Why weighted-random instead of pure focal-axis scoring.** The first attempt scored seeds purely by focal-axis match against the current state. That created a bias: when no axis was stressed (calm state), every seed scored 0 and the first one in the list won every time. When ecological_debt was high, only crisis-4 scored anything (it's the only seed with ecological_debt in focal axes), so crisis-4 always won. Adding a baseline weight of 1.0 per seed gives every seed a non-zero chance; the focal-axis score then biases toward the best match. With 30 picks, 15-20 distinct actors surface — enough variation to keep the deck feeling fresh without losing the focal-axis sensitivity.

**Why ecological_debt at 30 blocks stabilization.** This is design, not bug. The existing INITIAL_STATE has ecological_debt in the eroded band, which means the regime *starts* in a state that prevents stabilization. The player has to actively move ecological_debt into the strained band (50+) by making moves that address it. This forces engagement with structural problems — exactly what the project is about. If we wanted stabilization to be reachable from the initial state, we'd need to either raise ecological_debt in INITIAL_STATE or remove ecological_debt from the stabilization check. Both are worse designs. Keep the discipline.

**Why the seed fragment, not full prose, is the prompt anchor.** Cycle 5c had the world generator receive `priorCrisis.situation` and `priorCrisis.pressure` — full prose. The LLM used those as the basis for the next turn's prose. Cycle 5d changes this to `seedFragment` (1 sentence) + `actor` (named entity). The LLM still has access to the prior turn's full prose via `turnHistory`, but the *initial prompt* is now shorter and more focused. This means the LLM doesn't reflexively echo the prior crisis's prose — it has more room to generate fresh, contextual prose that responds to the player's move.

**Why 5 consecutive turns for stabilization, not 3.** A 3-turn threshold would trigger too easily — even a brief plateau in the middle of a struggle would count. 5 turns means the regime has held its posture through several cycles of LLM calls, which is a meaningful signal. The threshold can be tuned later if it's too strict or too lenient.

**Why the world generator is told the actor's name, not asked to invent one.** The actor pools are curated per seed (e.g., for crisis-3: UAE, Saudi Arabia, Singapore, EU sovereign cloud, US federal program). Letting the LLM invent actors would produce uneven quality and risk hallucinated names. Curated pools give the player recognizable actors across runs while still varying the surface.

**The Trigger section's legalistic prose is still in the crisis files.** The Trigger is the original authored prose from cycle 2 — it's audit material now, used in artifact generation. The player doesn't see it during play. The LLM can draw on it for context but is not required to. We could rewrite the Trigger in accessible register too, but that's a small follow-up.

## What this cycle does NOT address

- **corpus-quote spinner content** (deferred from 5b.5) — still open
- **artifact-generator surface for the narrative field** (deferred from 5c) — the artifact still uses the legacy interpretive_gloss + narrative_move; the new narrative lives in the run log
- **trigger prose rewrite** — the original Trigger section is still legalistic; the LLM-generated situation/pressure/decision_point is accessible, but the audit material isn't

## Files

**New:**
- `scripts/seed-variants.js`
- `wiki/prototypes/2026-06-29-phase-5d-seeds-dynamic-turns-register.md`

**Changed:**
- `wiki/mechanics/crises/crisis-{1-8}-*.md` (8 files)
- `wiki/mechanics/crisis-anatomy.md`
- `src/sim/world-generator.js`
- `src/sim/interactive.js`
- `wiki/index.md` (prototype registered)
- `wiki/log.md` (5d entry)
- `/tmp/hermes-verify-5b.sh` (updated to match new schema)

## Phase 5 status

| cycle | status |
|---|---|
| 5a | doc pass (edutainment reframe, Principle 6, advisor welcome) — done |
| 5b | collapse the loop to crisis → response — done |
| 5b.5 | multi-line input + status spinner — done |
| 5c | world generator (LLM-driven narrative response) — done |
| 5d | parameterized seeds + dynamic turn count + accessible register — done |
| 5e | the walkthrough — **next** |

## Next

Play the loop with a real LLM. From the project root: `node src/sim/interactive.js`.

What you'll see now:
- **Turn 1**: a parameterized seed (different actor each run), shown as "Seed (situation)" with the seed fragment as the situation. Pressure and decision point are deferred until after your first move.
- **Turns 2+**: world generator produces the situation/pressure/decision point based on the seed fragment + actor + your prior move + state.
- **Run ends** on collapse, on stabilization (5 consecutive stable turns — requires you to address ecological_debt), or after 30 turns as a runaway cap.
- **Prose register**: short sentences, concrete actors, accessible language. No policy-brief legalese.

The litmus test (Principle 6): do you want to start another run after this one?