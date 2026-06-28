---
title: "Phase 3a — Interactive CLI works end-to-end with real collapse"
date: 2026-06-28
type: prototype
prototype_kind: observed-behavior
model: "minimax/minimax-m3"
---

## Observation

The interactive CLI works end-to-end. A real player can run a session: state is visible at every turn, crisis text is presented with clear typography, the player chooses between literacy mode (write own policy) and easy mode (consult an advisor), the comedic interlude displays during the LLM wait, the system interpretation is revealed with gloss/narrative/state-delta/sources/confidence, the state updates visibly, and the artifact is generated at the end.

A 13-turn scripted interactive session produced a **legitimacy-collapse** outcome — the regime's authority eroded across 47 legitimacy points and 54 elite-alignment points, and collapse fired at turn 13. The artifact captures the trajectory.

## Probe

Two interactive sessions run:

**Session 1 (1 turn, player-quit):** Single policy move on the frontier-lab crisis, then quit.

**Session 2 (13 turns, legitimacy-collapse):** Six structural policy moves across 13 crises, then collapse.

Commands run:

```bash
# Session 1: single-turn quit
printf '0\nWe announce a 60-day review...\n\nq\n\n' | node src/sim/interactive.js

# Session 2: 13-turn collapse
node src/sim/interactive.js < /tmp/multi-turn2.txt
```

## Output

Session 2 produced:

- **Run log:** 538 lines (`runs/20260628231154-dzl75j.md`)
- **Artifact:** 366 lines (`runs/20260628231154-dzl75j-artifact.md`)

Key sections of the artifact:

**Run summary:** "You governed for 13 turns. The regime began in a broadly stable position... The simulation ended with legitimacy collapse on turn 13. The closing state was collapsed legitimacy."

**State trajectory table:**

| Axis | Start | End | Max excursion | Bands crossed |
|------|-------|-----|---------------|----------------|
| Legitimacy | 65 | 18 | -47 | strained → holding → eroded → collapsed |
| Elite alignment | 60 | 6 | -54 | strained → eroded → collapsed |
| Narrative coherence | 55 | 0 | -55 | strained → eroded → collapsed |

**Collapse conditions:** legitimacy=18, elite_alignment=6 (both well below the legitimacy-collapse thresholds of <20 and <30).

## Interpretation

**The interactive experience works.** The full turn loop — state visibility, crisis presentation, player input, advisor consultation (easy mode), LLM wait with interlude, system interpretation, state update, collapse detection, artifact generation — operates end-to-end against MiniMax M3.

**The collapse fired as expected.** With only structural moves but no crisis-specific engagement, the simulation gradually eroded the regime's authority. The legitimacy fell 47 points; elite alignment fell 54 points; narrative coherence collapsed entirely (to 0). This is what the literacy device predicts: structural-but-not-targeted engagement slows but doesn't prevent collapse.

**Player experience observations:**

1. **State visibility works.** The state block is shown at the start of every turn, with all 6 axes, values, and band indicators. The player can see the regime's authority eroding in real time.

2. **Crisis presentation is clear.** Title, failure pattern, trigger kind, and the full trigger text are presented with consistent section breaks.

3. **Choice between literacy and easy mode is functional.** The player sees a numbered list (0 for own policy, 1-5 for advisors), types the number, and either writes or sees the advisor's response.

4. **Comedic interlude during LLM wait.** During the LLM call, a corpus pull is displayed — e.g., "[2026-05-07] — Regulatory Frameworks and the Fragmentation of Sovereignty." This makes the wait feel intentional rather than stalled.

5. **System interpretation is rich.** Gloss (~900 chars), narrative move, state delta with arrows, sources the model drew on, confidence. The player sees the full interpretation chain.

6. **Artifact is a real report.** 366-line artifact with header, run summary, state trajectory, crisis log, interpretive chain, grounding references, collapse reveal, play invitation.

## Real findings

1. **The interlude corpus pulls connect to the parent project.** Each interlude is a date-stamped headline from `wiki/signals/`. The connection is implicit but present — a reader who follows the references encounters the Metaviews corpus.

2. **The advisor-as-easy-mode mechanic is implemented but not yet tested in real player hands.** Per the user's framing, the advisor is "like getting a hint or cheat code." This worked in the scripted test but real player behavior may surface design issues.

3. **The single-turn test exposed a bug in the artifact generator.** When outcome was "player-quit", the artifact crashed because `lastTurn.collapse` was null. Fixed by adding a player-quit case to the artifact generator's collapse-reveal section.

4. **The collapse in session 2 was late in the run.** With structural-but-broad moves, the regime held through turn 12, then collapsed at turn 13 when the cumulative drift crossed thresholds. This matches the case-study claim about hidden shifts accumulating.

## Files added

- `src/sim/cli-format.js` — terminal formatting helpers (sections, indent, wrap, numbered choices)
- `src/sim/state-display.js` — state vector display formatting (compact and block formats)
- `src/sim/interlude.js` — corpus pulls for the LLM wait state
- `src/sim/interactive.js` — the interactive CLI itself

`src/sim/artifact-generator.js` updated to handle player-quit outcome.

## What's next

Cycle 3b: experience refinement based on actually playing through. The current implementation works but has rough edges — the interlude could be better curated, the system interpretation display could be tightened, the state display could show deltas more clearly. Real player trials will reveal what to fix.

This prototype observation is filed per Principle 4.5 (Dancing with the Details in the Design). The interactive experience has been observed working end-to-end with real collapse.

**Note on the auto-generated artifacts:** This run produced an artifact (`runs/20260628231154-dzl75j-artifact.md`) and run log (`runs/20260628231154-dzl75j.md`) — these are gitignored but reproducible. Per the wiki index convention, they're not in the catalog.