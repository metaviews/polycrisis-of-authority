---
title: "Collapse modes — the three terminal states of a run"
description: "Legitimacy collapse (slow, default), technical collapse (capability-driven), narrative capture collapse (slowest, environmental debt-driven). Each has quantified threshold conditions and a minimum-run safeguard."
type: mechanic
version: "0.1.0"
last_updated: 2026-06-28
grounded_in:
  - "concepts/algorithmic-authority.md"
  - "concepts/cognitive-authority.md"
---

## Collapse modes

The simulation has three collapse modes. Each fires when its threshold conditions are met *and* the simulation has been running for at least 8 turns (a minimum-run safeguard against early collapse from initial conditions).

### Legitimacy collapse

**Conditions:** legitimacy < 20 AND elite_alignment < 30.

The primary collapse path. Most common in the simulation. The regime has lost both public acceptance and elite support simultaneously; the cascade is structurally irreversible within the simulation's state dynamics.

### Technical collapse

**Conditions:** capability_frontier > 80 AND narrative_coherence in `eroded` band (25–49) AND a scripted frontier event fires.

Capability-driven collapse. A model release, a capability threshold crossed, or a frontier incident has outpaced the regime's response capacity. The narrative_coherence condition captures the regime's inability to make the event legible; without that, even a high capability shift might be absorbable. The scripted-event condition ensures the collapse is grounded in something the simulation can point to.

### Narrative capture collapse

**Conditions:** narrative_coherence < 25 AND elite_alignment < 40 AND ecological_debt > 70.

The slowest and rarest collapse. The regime has lost its discourse partners (elite_alignment), its meaning-making capacity (narrative_coherence), and is facing an accumulating ecological debt it can no longer describe. The combination is distinctive: it requires the regime to be both captured and buried.

### Minimum-run safeguard

No collapse fires before turn 8. This prevents the simulation from collapsing immediately on initial conditions (a run that starts with low legitimacy and elite alignment should not end before the player has a chance to respond).

### Tuning during validation

The thresholds above are the MVP-0 defaults. Per Phase 5 of the roadmap, the orchestrator tunes the thresholds during validation based on observed collapse-mode distribution (the ship criterion is "balanced collapse-mode distribution" — a strong skew would indicate a grammar bias).

## Sources

- `concepts/algorithmic-authority.md` — the CIA framework motivates the three collapse modes
- `concepts/cognitive-authority.md` — narrative coherence as a state-collapse precondition

## Version history

- **0.1.0** (2026-06-28) — Initial collapse-modes entry. Three modes with quantified conditions, minimum-run safeguard, tuning notes for validation. Authored per `docs/06-state-model.md` § Collapse rules.
