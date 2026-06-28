---
title: "Phase 2d — End-to-end real run + artifact produced"
date: 2026-06-28
type: prototype
prototype_kind: observed-behavior
model: "minimax/minimax-m3"
run_id: "20260628223813-8jtf0r"
---

## Observation

A full real-LLM session completed end-to-end against MiniMax M3 with the actual grammar, real wiki retrieval, and real artifact generation. The simulation produced:

- A **400-line run log** with YAML frontmatter, per-turn sections (crisis, player move verbatim, grammar output with state_delta/interpretive_gloss/narrative_move/grounding_trace/confidence, state after turn)
- A **270-line artifact** with all 8 sections per `docs/09-artifact-template.md`: header, run summary, state trajectory table, crisis log, interpretive chain, grounding references, collapse reveal (no-collapse), play invitation

The session ran 9 turns, faced 8 distinct crises (crisis 1 appeared twice because all 8 were exhausted), and ended in no-collapse. Final state: legitimacy 75, fiscal 57, elite 74, ecological 30, narrative 52, capability 52.

## Probe

Command run:

```bash
node src/sim/index-async.js --script scripts/player-script-default.txt --turns 9
```

Script: `scripts/player-script-default.txt` (9 player moves, each addressing the crisis structurally with sustained engagement, training-data transparency, allied coordination, etc.).

Output:

```
=== Turn 1: Frontier lab capability release ===
Pattern: upstream-embedding
  → state_delta: legitimacy:+6, fiscal_slack:-3, elite_alignment:+10, narrative_coherence:+8, capability_frontier:-3
  → confidence: high
... (8 more turns)
=== Turn 9: Frontier lab capability release ===
Pattern: upstream-embedding
  → state_delta: legitimacy:+3, fiscal_slack:-2, elite_alignment:+6, narrative_coherence:+5, capability_frontier:-1
  → confidence: high

Run completed.
  Run ID: 20260628223813-8jtf0r
  Outcome: no-collapse
  Turns: 9
  Run log: /home/situation/polycrisis/runs/20260628223813-8jtf0r.md
  Artifact: /home/situation/polycrisis/runs/20260628223813-8jtf0r-artifact.md

Final state:
  legitimacy: 75
  fiscal_slack: 57
  elite_alignment: 74
  ecological_debt: 30
  narrative_coherence: 52
  capability_frontier: 52
```

## Output

The artifact at `runs/20260628223813-8jtf0r-artifact.md` is 270 lines. Key sections:

**Run summary** names all 9 crises faced and the closing state.

**State trajectory** table:

| Axis | Start | End | Max excursion | Bands crossed |
|------|-------|-----|---------------|----------------|
| Legitimacy | 65 | 75 | 0 | strained → holding |
| Fiscal slack | 70 | 57 | -13 | strained |
| Elite alignment | 60 | 74 | 0 | strained |
| Ecological debt | 30 | 30 | 0 | eroded |
| Narrative coherence | 55 | 52 | -8 | strained → eroded |
| Capability frontier | 65 | 52 | -13 | strained |

**Interpretive chain** traces turns 1, 5, and 9 (first, middle, last):

Turn 1's chain:
- Player wrote: "We announce a 60-day review of all frontier model releases and require training-data transparency..."
- Model knew: crisis-1, civil-society advisor, frontier-lab advisor, agentic-ai concept (4 entries)
- Model heard: "structural response that directly addresses the upstream-embedding failure pattern"
- Model did: +6 legitimacy, -3 fiscal, +10 elite, +8 narrative, -3 capability
- Happened next: "Anthropic publicly objects to the 60-day pause as commercially untenable but signals willingness to negotiate..."

**Grounding references**: 19 unique wiki entries cited, sorted by frequency:

| Wiki path | References |
|-----------|------------|
| `mechanics/crises/crisis-1-frontier-lab-release.md` | 4 |
| `mechanics/advisors/civil-society.md` | 4 |
| `concepts/agentic-ai.md` | 3 |
| `concepts/algorithmic-transparency.md` | 3 |
| `mechanics/crises/crisis-7-narrative-capture-media-consolidation.md` | 3 |
| ... 14 more entries, all 1-2 references each |

## Interpretation

**The simulation works end-to-end.** Real LLM, real wiki, real artifact.

The interpretive chain is the load-bearing piece — it makes the literacy claim legible. A reader who reads just section 5 can understand: what the player wrote, what corpus the model retrieved, what the model heard, what state change resulted, what happened in the world. The chain reads as a coherent story, not as a list of moves.

The state trajectory table is informative. The player made structural responses throughout, and the trajectory shows the visible effects: legitimacy climbed from strained to holding, elite alignment climbed from strained to (just below) holding, narrative coherence dropped slightly, fiscal slack dropped (cost of structural responses), capability frontier dropped (regulation working). The ending state is broadly positive — the regime's authority is intact, somewhat stronger on legitimacy and elite alignment, somewhat weaker on fiscal slack.

The grounding references section makes the connection to the Metaviews corpus explicit. 19 unique wiki entries were cited; the most-cited are the upstream-embedding crisis and the civil-society advisor (4 references each), which fits the player's structural approach. A reader who follows the references outward encounters the parent project's intelligence work.

**One real finding from the run:**

The model's interpretive glosses consistently identify the *structural* vs *quick-response* distinction. When the player wrote "We announce a 60-day review of all frontier model releases" (turn 1), the model heard it as structural — citing the upstream-embedding failure pattern by name and the relevant corpus entries. When the player wrote a less-specific move on a later turn, the gloss sometimes flagged it as inadequate or partial. This is exactly the literacy device: the player's words get read in terms of whether they engage the upstream conditions.

**The artifact functions as an AI policy artifact in its own right.** A reader who has no context for the simulation can read the artifact and learn: what crisis 1 was, what the upstream-embedding failure pattern means, what structural responses look like in this domain. The artifact is *not* just a game score; it's commentary on the policy domain.

**What's next.** Cycle 2e — polish, README updates, final audit, Phase 2 ship criteria verification. The simulation engine, the real grammar, the advisors, the run log, the artifact — all working. The remaining work is documentation, audit, and final presentation.

This prototype observation is filed per Principle 4.5 (Dancing with the Details in the Design). The simulation has been observed producing a real artifact. The case-study claim has a concrete artifact backing it.