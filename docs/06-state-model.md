# State Model Spec

_Defines the six state axes, their visible signal layers, hidden threshold layers, interaction patterns, and corpus grounding. Read after the spine and the wiki structure plan (`docs/05-wiki-structure.md`). This spec is the contract the interpretation grammar resolves against._

This document is the most operational of the design specs. Where the vision and principles say *what* the simulation does, this spec says *exactly what the simulation's state vector looks like* — six named axes, each with a defined visible layer, a hidden threshold, an interaction map, and a corpus grounding.

When this spec is implemented, the six axes live as separate `wiki/mechanics/state-axis-*.md` entries (one per axis), each versioned independently per Principle 2.3. This doc is the *specification* those entries conform to.

## Framework

### What a state axis is

A state axis is a dimension of authority the simulation tracks numerically and renders to the player partially. Every axis has the same four-layer structure:

- **Hidden value.** The numeric state, 0–100. Not shown to the player directly. What the simulation's engine sees.
- **Named band.** A label for ranges of the hidden value. Used in the artifact and in the collapse reveal. Bands: `holding` (75–100), `strained` (50–74), `eroded` (25–49), `collapsed` (0–24).
- **Visible signals.** What the player sees during play. Two or three named signals per axis, deliberately unreliable (per Principle 3.2). The player reads the signals critically; the simulation's hidden value may be different.
- **Hidden threshold.** The numeric value at which the axis's collapse contribution fires. Different axes have different thresholds; some axes never trigger collapse on their own.

The four-layer structure is what makes the literacy device work: the player has to develop a working theory of how the visible signals relate to the hidden value, and that theory is the literacy claim's pedagogical core.

### State vector representation

The full state vector is a six-tuple of hidden values:

```
state = (legitimacy, fiscal_slack, elite_alignment, ecological_debt, narrative_coherence, capability_frontier)
```

Each component is a number 0–100. Higher is generally "more of that thing." Note that `ecological_debt` is an exception — high ecological debt is bad, so its hidden value is "debt accrued" rather than "capacity remaining." The visible signals for ecological debt are framed in terms of stress, not capacity.

For each axis, the named band is computed from the hidden value at every turn:

- 75–100 → `holding`
- 50–74 → `strained`
- 25–49 → `eroded`
- 0–24 → `collapsed`

The collapse modes fire based on combinations of axis states, not on individual axis thresholds alone. The full collapse rules are at the end of this spec.

### Why this representation

Named bands make the artifact readable: "your legitimacy eroded over turns 8–14" is legible; "your legitimacy went from 67 to 41" requires the reader to know what 67 and 41 mean. Numeric hidden values make the grammar precise: the model produces state-vector deltas in numbers, which compose with the existing hidden value to produce the next state.

The combination preserves both readability (for the artifact) and precision (for the simulation engine).

## The six axes

The axes are presented in causal order — capability frontier and fiscal slack are upstream (material conditions), elite alignment and ecological debt are middle (mediation and substrate), narrative coherence and legitimacy are downstream (interpretation and terminal state). This order reflects how the corpus understands authority to operate and what the collapse modes collapse *toward.*

### 1. Capability frontier

**Hidden value meaning.** The actual state of what frontier AI systems can do, scaled 0–100. 0 = no frontier capability; 100 = capability well beyond any current public model.

**Why this is an axis.** AI policy regimes run into the capability frontier whether they intend to or not. A policy that "regulates deployed AI" is meaningless if capability has moved past deployment to agentic operation. The capability frontier is the technical substrate the player's policy operates against — and it's the axis that determines whether *technical collapse* is possible (collapse triggered by a capability threshold the player's regime cannot respond to).

**Visible signals (three, deliberately unreliable):**

- *Industry analyst headlines* — lag the actual frontier by 1–3 turns. The player sees what was true, not what is true.
- *Open-weight release announcements* — capture part of the frontier (open releases), miss the closed-frontier portion. A useful but partial signal.
- *Anthropic / OpenAI executive statements* — sometimes forward-looking, sometimes performative. The player has to weigh which.

**Hidden threshold.** No collapse fires on this axis alone. But capability_frontier > 80 *combined with* narrative_coherence in `eroded` band *contributes* to technical collapse. (See collapse rules below.)

**Interactions.**

- Affects: elite_alignment (when capability moves, the frontier-lab actor's position changes; elite alignment shifts toward or away from the regime).
- Affects: narrative_coherence (capability shocks drive narrative shifts).
- Is affected by: nothing the player does (capability frontier moves on its own timeline, roughly every 3–5 turns, occasionally triggered by scripted events).

**Corpus grounding.** `concepts/algorithmic-authority.md`, `concepts/ai-arms-race.md`, `entities/openai.md`, `entities/openai-anthropic.md`, `signals/2026-05-13-mythos-ai-palantir-nhs-nuclear-gambles.md`, `signals/2026-05-21-spacex-data-center-ai-oligopoly.md`.

### 2. Fiscal slack

**Hidden value meaning.** Material capacity to absorb shocks, scaled 0–100. 0 = no fiscal room; 100 = abundant fiscal slack (comparable to peak post-war US budgets).

**Visible signals (three, deliberately unreliable):**

- *Treasury / central bank statements* — biased toward expressing confidence regardless of reality. Lag.
- *Market reactions to policy announcements* — fast but noisy. The signal moves on rumor and overreaction.
- *Credit rating posture* — lags by weeks to months. By the time the rating moves, the slack has already shifted.

**Hidden threshold.** No collapse fires on this axis alone. But fiscal_slack < 30 *combined with* ecological_debt > 70 *contributes* to narrative capture collapse (a regime that can't afford to address mounting debt loses the ability to make the debt legible).

**Interactions.**

- Affects: ecological_debt (low slack means debt accumulates without remediation).
- Affects: elite_alignment (low slack means elite actors' positions harden; they're more vulnerable to regime collapse themselves).
- Is affected by: player policy (tax policy, expenditure, procurement moves), capability_frontier shifts (compute is expensive).

**Corpus grounding.** `concepts/ai-arms-race.md` (compute and energy costs), `signals/2026-05-21-spacex-data-center-ai-oligopoly.md` (the UAE's oil-funded compute, the Anthropic-SpaceX deal), `signals/2026-04-29-algorithmic-warfare-care-deficit.md` (material constraints of state infrastructure).

### 3. Ecological debt

**Hidden value meaning.** Accumulated unaddressed environmental and structural damage, scaled 0–100. 0 = no debt; 100 = catastrophic. (High value is bad, unlike the other axes.)

**Visible signals (three, deliberately unreliable):**

- *Public health metrics* — long lag (months to years). Real damage shows up in hospitals first.
- *Climate / supply chain incident reports* — episodic; quiet periods can hide accumulating pressure.
- *Academic and civil society warnings* — often early but treated as alarmist; player has to weigh credibility.

**Hidden threshold.** No collapse fires on this axis alone. But ecological_debt > 70 *combined with* narrative_coherence in `eroded` band *contributes* to narrative capture collapse (debt becomes illegible before it becomes visible).

**Interactions.**

- Affects: fiscal_slack (debt remediation is expensive).
- Affects: narrative_coherence (accumulating debt destabilizes the stories regimes tell about progress).
- Is affected by: capability_frontier shifts (compute is energy-intensive; frontier escalation increases debt), player policy (some moves reduce debt, most don't).

**Corpus grounding.** `concepts/climate-catastrophe.md`, `concepts/algorithmic-authority.md` (the physical substrate of digital power), `signals/2026-04-29-algorithmic-warfare-care-deficit.md` (the metabolic rift framing).

### 4. Elite alignment

**Hidden value meaning.** Whether the system of expertise and institutional actors continues to function as mediator between regime and public, scaled 0–100. 0 = elite defection / fragmentation; 100 = coherent elite consensus.

**Visible signals (three, deliberately unreliable):**

- *Think tank and academic public statements* — fragmented across institutions; hard to read as a single signal.
- *Frontier-lab leadership rhetoric* — visible but performative; positions shift in private before they shift publicly.
- *Coverage in policy and tech press* — surfaces elite disagreement but flattens it into "both sides" framings.

**Hidden threshold.** elite_alignment < 25 *contributes directly* to legitimacy collapse (when the elite defection is severe enough, public mood shifts independently).

**Interactions.**

- Affects: legitimacy (elite defection is the largest single driver of legitimacy erosion).
- Affects: narrative_coherence (elites produce much of the discourse the regime relies on).
- Is affected by: player policy (regime moves that align with or against elite positions), capability_frontier shifts (capability shocks move elite positions).

**Corpus grounding.** `concepts/cognitive-authority.md`, `concepts/institutional-authority.md`, `entities/openai-anthropic.md`, `signals/2026-05-13-palantir-kinetics-tsmc-chokepoints.md`, `signals/2026-05-19-platform-courts-vibe-warfare-digital-defense.md`.

### 5. Narrative coherence

**Hidden value meaning.** The regime's capacity to make meaning — to produce stories about what's happening that the public, the elite, and the policy apparatus can all share, scaled 0–100. 0 = narrative collapse (competing realities, no shared frame); 100 = coherent regime narrative.

**Visible signals (three, deliberately unreliable):**

- *Polling on "what's really going on"* — captures public confusion, not coherence. Lagged.
- *Press tone analysis* — captures elite discourse; misses private discourse.
- *Social media memetic patterns* — captures the surface of public narrative; misses the underlying structures.

**Hidden threshold.** narrative_coherence < 25 *combined with* elite_alignment < 40 *contributes directly* to narrative capture collapse (when the regime has lost both its discourse partners and its meaning-making capacity).

**Interactions.**

- Affects: legitimacy (the most direct upstream driver; legitimacy without narrative coherence is unstable).
- Is affected by: elite_alignment, ecological_debt (debt is illegible before it's visible), capability_frontier shifts.

**Corpus grounding.** `concepts/memetic-warfare.md`, `concepts/mythology-and-narrative.md`, `concepts/cognitive-authority.md`, `concepts/epistemic-war.md`, `signals/2026-05-19-platform-courts-vibe-warfare-digital-defense.md` (the Iran "vibe war" signal).

### 6. Legitimacy

**Hidden value meaning.** Public acceptance of the regime, scaled 0–100. 0 = open rejection / civil disobedience; 100 = broad public acceptance.

**Visible signals (three, deliberately unreliable):**

- *Approval polling* — captures stated opinion, misses revealed opinion (what people do versus what they say).
- *Public mood indicators* — captured by sentiment analysis of social media; reflects amplification, not distribution.
- *Street-level protest / rally reports* — captures visible mobilization, misses quiet disengagement.

**Hidden threshold.** legitimacy < 20 *combined with* elite_alignment < 30 *triggers legitimacy collapse.* This is the primary collapse path. (See collapse rules.)

**Interactions.**

- Is affected by: elite_alignment (the largest driver), narrative_coherence (upstream), ecological_debt (long-arc), capability_frontier shocks (when the frontier moves and the regime has no response).
- Affects: nothing in the model — legitimacy is a terminal state. When it collapses, the simulation ends.

**Corpus grounding.** `concepts/cognitive-authority.md`, `concepts/future-of-authority.md`, `concepts/algorithmic-transparency.md` (transparency as legitimacy substrate), `signals/2026-05-05-algorithmic-authority-care-infrastructure.md`.

## Interaction matrix

How axes affect each other. `→` means "affects." The lag column is for the interpretation grammar: how many turns after a triggering event before the affected axis starts moving.

| From | To | Direction | Lag | Notes |
|------|----|-----------|-----|-------|
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

Player policy affects fiscal_slack (directly), elite_alignment (directly), and ecological_debt (slowly, through resource allocation). Capability_frontier is unaffected by player policy — it moves on its own timeline, occasionally triggered by scripted events.

## Collapse rules

A collapse fires when the conditions below are met *and* the simulation has been running for at least 8 turns (a minimum-run safeguard against early collapse from initial conditions).

**Legitimacy collapse.** legitimacy < 20 AND elite_alignment < 30. The primary collapse path. Most common.

**Technical collapse.** capability_frontier > 80 AND narrative_coherence in `eroded` band (25–49) AND a scripted "frontier event" fires (a model release, an incident, a capability threshold crossed). The simulation surfaces the event; the player's regime cannot respond; collapse follows.

**Narrative capture collapse.** narrative_coherence < 25 AND elite_alignment < 40 AND ecological_debt > 70. The slowest collapse. The regime has lost its discourse partners, its meaning-making capacity, and is facing an accumulating debt it can no longer describe.

These rules are minimum conditions. The orchestrator may tune the thresholds during Phase 5 validation based on observed collapse-mode distribution (per the roadmap's Phase 5 ship criterion of "balanced collapse-mode distribution").

## Audit criteria for state-axis specs

A state-axis spec (when implemented as a `wiki/mechanics/state-axis-*.md` entry) is shippable when:

- The four-layer structure (hidden value, named band, visible signals, hidden threshold) is present.
- At least two corpus entries are cited as grounding.
- At least one visible signal is explicitly framed as unreliable (per Principle 3.2).
- The hidden threshold is quantified (a number, not a vibe).
- The interaction rows in the matrix are filled in for both directions (axis A's effect on B, and B's effect on A).
- The mechanics entry has a `version` field in frontmatter (per the wiki structure plan).

The orchestrator runs the audit against each axis entry. Failed axes are revised before Phase 2 ship criteria are evaluated.

## Sources for this spec

- The vision document (`docs/00-vision.md`) — MVP-0's six-axis state model commitment.
- The corpus synthesis (`docs/01-corpus-synthesis.md`) — what the corpus gives us about each axis.
- The design principles (`docs/02-design-principles.md`) — especially Principles 1.3 (state-sensitivity), 2.3 (mechanics vs corpus), 3.2 (fragmented signals), 3.3 (collapse as reveal).
- The wiki structure plan (`docs/05-wiki-structure.md`) — the frontmatter schema and audit criteria.
- The roadmap (`docs/04-roadmap.md`) — Phase 2 ship criteria this spec must enable.
