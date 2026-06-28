---
title: "State axes — the six dimensions of authority the simulation tracks"
description: "Each of the six state axes has a hidden value (0-100), a named band, three visible signals, and a hidden threshold. The literacy device lives in the gap between visible signals and hidden value."
type: mechanic
version: "0.1.0"
last_updated: 2026-06-28
grounded_in:
  - "concepts/algorithmic-authority.md"
  - "concepts/ai-arms-race.md"
  - "concepts/cognitive-authority.md"
---

## State axes

The simulation tracks six state axes. Each axis has a hidden value (0–100), a named band (`holding`, `strained`, `eroded`, `collapsed`), three visible signals (deliberately unreliable per Principle 3.2), and a hidden threshold.

Axes are presented in causal order — capability frontier and fiscal slack are upstream (material conditions); elite alignment and ecological debt are middle (mediation and substrate); narrative coherence and legitimacy are downstream (interpretation and terminal state).

### Capability frontier

The actual state of what frontier AI systems can do, scaled 0–100. AI policy regimes run into this whether they intend to or not — a policy that regulates deployed AI is meaningless if capability has moved past deployment to agentic operation.

Visible signals: industry analyst headlines (lag the actual frontier by 1–3 turns), open-weight release announcements (capture part of the frontier, miss the closed-frontier portion), frontier-lab executive statements (sometimes forward-looking, sometimes performative).

Hidden threshold: capability_frontier > 80 combined with narrative_coherence in `eroded` band contributes to technical collapse.

### Fiscal slack

Material capacity to absorb shocks, scaled 0–100. Visible signals lag or are biased: treasury/central-bank statements (biased toward expressing confidence), market reactions (fast but noisy), credit rating posture (lags by weeks to months).

Hidden threshold: fiscal_slack < 30 combined with ecological_debt > 70 contributes to narrative capture collapse.

### Ecological debt

Accumulated unaddressed environmental and structural damage, scaled 0–100 (high is bad). Visible signals: public health metrics (long lag), climate/supply chain incident reports (episodic), academic and civil society warnings (often treated as alarmist).

Hidden threshold: ecological_debt > 70 combined with narrative_coherence in `eroded` band contributes to narrative capture collapse.

### Elite alignment

Whether the system of expertise and institutional actors continues to function as mediator between regime and public, scaled 0–100. Visible signals: think tank/academic public statements (fragmented), frontier-lab leadership rhetoric (performative), coverage in policy/tech press (flattens disagreement).

Hidden threshold: elite_alignment < 25 contributes directly to legitimacy collapse.

### Narrative coherence

The regime's capacity to make meaning, scaled 0–100. Visible signals: polling on "what's really going on" (lagged), press tone analysis (captures elite discourse), social media memetic patterns (captures surface, misses structure).

Hidden threshold: narrative_coherence < 25 combined with elite_alignment < 40 contributes directly to narrative capture collapse.

### Legitimacy

Public acceptance of the regime, scaled 0–100. Visible signals: approval polling (captures stated opinion, not revealed opinion), public mood indicators (sentiment analysis reflects amplification), street-level protest/rally reports (visible mobilization, misses quiet disengagement).

Hidden threshold: legitimacy < 20 combined with elite_alignment < 30 triggers legitimacy collapse.

## Interaction matrix

| From | To | Direction | Lag | Notes |
|------|-----|-----------|-----|-------|
| capability_frontier | elite_alignment | → | 1 turn | Frontier shifts move lab positions. |
| capability_frontier | narrative_coherence | → | 2 turns | Capability shocks destabilize narratives. |
| capability_frontier | fiscal_slack | → | 1 turn | Compute is expensive. |
| capability_frontier | ecological_debt | → | 2 turns | Compute is energy-intensive. |
| fiscal_slack | ecological_debt | → | 3 turns | Low slack means debt accumulates. |
| fiscal_slack | elite_alignment | → | 2 turns | Low slack hardens elite positions. |
| elite_alignment | legitimacy | → | 2 turns | Largest single driver of legitimacy erosion. |
| elite_alignment | narrative_coherence | → | 1 turn | Elites produce much of the discourse. |
| ecological_debt | fiscal_slack | → | 4 turns | Remediation is expensive and slow. |
| ecological_debt | narrative_coherence | → | 6 turns | Debt becomes illegible before it becomes visible. |
| narrative_coherence | legitimacy | → | 3 turns | Most direct upstream driver. |

Player policy affects fiscal_slack (directly), elite_alignment (directly), and ecological_debt (slowly, through resource allocation). Capability_frontier is unaffected by player policy — it moves on its own timeline.

## Collapse rules

A collapse fires when the conditions below are met *and* the simulation has been running for at least 8 turns.

- **Legitimacy collapse:** legitimacy < 20 AND elite_alignment < 30.
- **Technical collapse:** capability_frontier > 80 AND narrative_coherence in `eroded` band AND a scripted frontier event fires.
- **Narrative capture collapse:** narrative_coherence < 25 AND elite_alignment < 40 AND ecological_debt > 70.

## Sources

The state model is grounded in the corpus synthesis (`docs/01-corpus-synthesis.md`), which identified the load-bearing material from the Metaviews archive. Specific corpus entries:

- `concepts/algorithmic-authority.md` — the CIA framework (Cognitive/Institutional/Algorithmic Authority) that motivates the six-axis structure
- `concepts/ai-arms-race.md` — the capability frontier and fiscal slack material substrate
- `concepts/cognitive-authority.md` — narrative coherence and elite alignment material

## Version history

- **0.1.0** (2026-06-28) — Initial state axes entry. Six axes with hidden values, visible signals, hidden thresholds, interaction matrix, and collapse rules. Authored per `docs/06-state-model.md`.
