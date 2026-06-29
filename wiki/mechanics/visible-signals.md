---
title: "Visible signals — the deliberately unreliable layer between hidden state and the player"
description: "Each axis has three named visible signals (lagged, biased, or partial) drawn from the state-model spec. The player never sees the hidden value during play. The literacy device lives in the gap."
type: mechanic
version: "0.1.0"
last_updated: "2026-06-29"
grounded_in:
  - "concepts/algorithmic-authority.md"
  - "concepts/cognitive-authority.md"
---

## Visible signals

The simulation's six state axes are tracked as hidden numeric values (0–100) that the player never sees during play. What the player sees is the *visible signal layer*: three named signals per axis, each grounded in a real-world indicator type, each deliberately unreliable per Principle 3.2 (fragmented signals).

The visible signal layer is what makes the literacy claim operational. The player's job is to develop a working theory of how the visible signals relate to the hidden value, and to read the signals critically. The artifact's collapse reveal then surfaces what the player could not see at the time.

## Three regimes of fragmentation

Per the state-model spec (`wiki/mechanics/state-axes.md`, `docs/06-state-model.md`), each axis contributes three visible signals, one per regime:

- **Lag.** The signal shows the hidden value as it was N turns ago. Examples: industry analyst headlines (3 turns), credit rating posture (4 turns), public health metrics (5 turns), approval polling (3 turns). Band-only signals show only the band, not the number.
- **Bias.** The signal reflects the hidden value through a systematic distortion. Examples: treasury/central-bank statements biased toward confidence, frontier-lab executive statements biased optimistically, social media reflecting amplification rather than distribution.
- **Partial.** The signal captures the hidden value incompletely. Examples: open-weight releases capture part of the frontier (misses closed-frontier), street-level reports capture visible mobilization (misses quiet disengagement), press tone analysis captures elite discourse (misses private).

The regime per signal is fixed by the spec. The function parameters (lag length, bias offset, capture percentage) are deterministic functions of (turn, history) so the same run produces the same signals — auditable per Principle 4.3.

## Per-axis signal map

| Axis | Signal 1 (lag) | Signal 2 (bias) | Signal 3 (partial) |
|------|----------------|------------------|---------------------|
| Capability frontier | industry analyst headlines (3-turn lag) | frontier-lab executive statements (optimistic +8) | open-weight release announcements (55% capture) |
| Fiscal slack | credit rating posture (4-turn lag) | treasury / central bank statements (confident +10) | market reactions (noisy ±12) |
| Ecological debt | public health metrics (5-turn lag) | academic and civil-society warnings (alarmist +6) | climate / supply chain incident reports (40% event rate) |
| Elite alignment | policy and tech press coverage (2-turn lag, flattened) | frontier-lab leadership rhetoric (performative, center-pulled) | think tank and academic statements (30% fragmentation) |
| Narrative coherence | polling on "what is really going on" (3-turn lag) | social media memetic patterns (amplified ×1.3) | press tone analysis (captures elite, not private) |
| Legitimacy | street-level protest / rally reports (1-turn lag, visible-only) | public mood indicators (amplified +7) | approval polling (stated-only, +5 toward 60) |

## Discrepancy and the literacy device

Each rendered signal carries a discrepancy value — the average point-distance between the signal's reported value (or band) and the hidden value at the same turn. High discrepancy means the player is being misled at that moment; reading the signals critically would have changed the policy move.

The artifact's collapse reveal (Section 7) surfaces the top discrepancy rows across the run, showing the player the visible-vs-hidden gap that they could not see at the time. This is the literacy device made material.

## Implementation

- `src/sim/visible-signals.js` — the signal definitions, the three regime functions, the discrepancy calculation, and the per-turn discrepancy timeline.
- `src/sim/state-display.js` — exports `formatVisibleSignalsDisplay()` which is what the interactive CLI shows during play (NOT `formatStateBlock`).
- `src/sim/artifact-generator.js` — uses `buildDiscrepancyTimeline()` to surface the visible-vs-hidden gap in the collapse reveal.

## Audit criteria for the visible-signal layer

- The hidden value is never displayed during play.
- At least one signal per axis is explicitly framed as a regime (lag, bias, or partial) drawn from the state-model spec.
- The discrepancy calculation is deterministic for a given (state, history) pair.
- The collapse reveal in the artifact shows discrepancy rows where the player was misled.
- The signal parameters are documented in this entry (version-tracked).

## Sources

- `docs/06-state-model.md` — the state-model spec that names the three signals per axis.
- `wiki/mechanics/state-axes.md` — the state-axes mechanics entry that grounds the signal names.
- `docs/02-design-principles.md` — Principle 3.2 (fragmented signals) is what motivates the unreliable layer.
- `docs/09-artifact-template.md` — the collapse reveal section is where the visible-vs-hidden gap surfaces.

## Version history

- **0.1.0** (2026-06-29) — Initial visible-signals entry. Three regimes (lag, bias, partial), one signal per regime per axis. Discrepancy calculation and timeline built. Wired into interactive CLI and artifact generator.
