---
title: "Crisis anatomy — how crises are structured and surfaced"
description: "Each crisis has trigger text, three-part play-loop prose (Situation, Pressure, Decision point), actors with positions, focal axes, policy surface, and a failure-pattern tag. The MVP-0 deck has 8 crises covering 4 failure patterns (upstream embedding, compute/capability escape, legitimacy-erosion cascade, memetic/narrative capture)."
type: mechanic
version: "0.2.0"
last_updated: "2026-06-29"
grounded_in:
  - "concepts/algorithmic-authority.md"
  - "concepts/ai-arms-race.md"
  - "concepts/cognitive-authority.md"
---

## Crisis anatomy

The simulation surfaces crises to the player in playable form. Each crisis conforms to the anatomy schema:

### Anatomy schema

**Frontmatter:**
- `title` (crisis title)
- `type: mechanic`, `subtype: crisis`, `version`, `last_updated`
- `failure_pattern` (list — a crisis can activate multiple patterns)
- `focal_axes` (which state axes this crisis foregrounds)
- `grounded_in` (corpus entries cited)
- `trigger_kind` (capability-driven, legitimacy-driven, elite-driven, incident-driven)

**Body — six required sections:**

1. **Trigger.** Specific and dated event text — the full prose of the crisis (used in artifact generation and audit material).
2. **Situation.** 1-2 sentences. What is happening in the world, stated concretely. This is what the player sees first in the play loop.
3. **Pressure.** 1-2 sentences. What is at stake, what could go wrong, what forces are closing in. This is what the player sees second.
4. **Decision point.** 1 sentence. The question the regime must answer. This is what the player sees third, followed by their move prompt.
5. **Actors.** Who is involved, what their positions are, what they have publicly said or done.
6. **Focal axes.** Which state axes this crisis foregrounds and why.
7. **Policy surface.** What kinds of policy moves the grammar should be listening for — the policy space the player operates in.

The play loop surfaces only Situation, Pressure, and Decision point. The other sections are audit material that lives in the artifact and the run log, not the loop. (See the Phase 5b doc pass on the play-loop redesign.)

### Four failure patterns

Crises are tagged with one or more of the four corpus-derived failure patterns:

1. **Upstream embedding** — AI policy regimes get drafted against visible outputs while consequential decisions happen upstream.
2. **Compute and capability escape** — regulatory regimes run into frontier capability that wasn't anticipated.
3. **Legitimacy-erosion cascade** — policy regimes survive capability but lose public trust.
4. **Memetic and narrative capture** — regimes survive both capability and legitimacy but lose meaning.

The grammar's gloss can name the pattern when relevant: *"this move addresses the visible crisis but ignores the upstream embedding."*

### Crisis generation rule

When the grammar's `narrative_move` signals a new trigger, the simulation:

1. Surfaces a new crisis from the deck. Selection criteria:
   - Failure pattern most active in the current run.
   - Current state vector band (some crises are appropriate only in certain states).
   - Actor engagement (avoid surfacing the same actor twice in a row).
2. Shifts an existing crisis (escalation, new actor entry, new development).
3. No new crisis (stability signal).

### MVP-0 deck

Eight authored crises, two per failure pattern. Each crisis is its own wiki entry under `mechanics/crises/`:

| Crisis | Pattern | Trigger kind |
|--------|---------|--------------|
| Frontier lab capability release | Upstream embedding | Capability-driven |
| Content moderation incident | Upstream embedding | Incident-driven |
| Compute concentration announcement | Compute/capability escape | Capability-driven |
| Model agentic capability threshold | Compute/capability escape | Capability-driven |
| Public legitimacy tipping point | Legitimacy-erosion cascade | Legitimacy-driven |
| Elite defection sequence | Legitimacy-erosion cascade | Elite-driven |
| Narrative capture via media consolidation | Memetic/narrative capture | Elite-driven |
| Memetic warfare / foreign disinformant | Memetic/narrative capture | Incident-driven |

## Sources

- `concepts/algorithmic-authority.md` — the framing of crisis as something regimes must respond to, with hidden and visible dimensions
- `concepts/ai-arms-race.md` — material substrate for capability-driven and compute-driven crises
- `concepts/cognitive-authority.md` — narrative-coherence crises and memetic warfare

## Version history

- **0.1.0** (2026-06-28) — Initial crisis-anatomy entry. Anatomy schema, four failure patterns, crisis generation rule, MVP-0 deck overview. Authored per `docs/08-crisis-anatomy.md`.
