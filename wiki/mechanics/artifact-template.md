---
title: "Artifact template — the eight-section shareable report"
description: "Each run produces an 8-section artifact (header, summary, trajectory, crisis log, interpretive chain, grounding references, collapse reveal, play invitation) per Principle 3.4's three-job framing. Markdown format, ~1500-2500 words."
type: mechanic
version: "0.1.0"
last_updated: 2026-06-28
grounded_in:
  - "concepts/algorithmic-authority.md"
  - "concepts/algorithmic-transparency.md"
---

## Artifact template

The simulation produces an 8-section artifact at the end of every run. The artifact is the project's main distribution surface — what the player takes away, what they share, what the case-study claim rests on.

Per Principle 3.4, the artifact has three jobs:
1. **Report** on the player's run (honest, not evaluative).
2. **Invite** others to play (specific to the run, not generic marketing).
3. **Function as an AI policy artifact** in its own right (legible as commentary on the policy domain).

### Section 1: Header

`Polycrisis of Authority — run report.`

- Date
- Model used (per Principle 1.1)
- Model version
- Wiki version referenced
- Wiki index version referenced

### Section 2: Run summary

3-5 sentences: opening state, major crises faced, closing state, outcome.

Example shape: *"You governed for 14 turns. The regime began in a strained legitimacy position and faced three overlapping crises — a frontier capability release, a public trust shift, and a coordinated disinformant campaign. The Mythos release on turn 7 overwhelmed the regime's response capacity despite attempts at coordination. Collapse fired as technical collapse on turn 14."*

### Section 3: State trajectory

A small data table showing the state vector's evolution. For each of the six axes (legitimacy, fiscal slack, elite alignment, ecological debt, narrative coherence, capability frontier): starting value, ending value, maximum excursion, named bands crossed.

### Section 4: Crisis log

Chronological list of crises faced. Each entry: turn number, crisis title, failure pattern(s) activated, player's policy move (verbatim), system's interpretive gloss (verbatim), state-vector delta.

### Section 5: Interpretive chain

For the collapse turn and 2-3 other key turns: what the player wrote, what wiki entries were retrieved, what the model heard (gloss verbatim), what the model did (delta), what happened next (narrative_move verbatim).

This section makes the case-study claim legible — readers can trace from player intent through model interpretation to state change.

### Section 6: Grounding references

Wiki entries cited in the run, sorted by frequency of reference. Each entry: path, title, description (from `wiki/index.md`), reference count.

This section connects the run to the Metaviews corpus — readers who follow the references encounter the parent project's intelligence work.

### Section 7: Collapse reveal

If collapse fired: which hidden condition collapsed, timeline of state changes leading to it, player moves whose consequences were not visible at the time. If no collapse: a note explaining why.

### Section 8: Play invitation

Three parts: (1) what was interesting about this run, (2) what other readings might have been possible, (3) the play link framed by the run's content.

### Length target

Total: 1,500-2,500 words. Tunable per run.

### Distribution forms

- **Text.** Markdown rendered as plain text.
- **Self-contained URL.** Markdown rendered as a static HTML page hosted at a stable URL. The URL contains a hash of the run log for verification.
- **Image (later).** State trajectory visualization as an image. Not in MVP-0.

## Sources

- `concepts/algorithmic-authority.md` — the case-study framing grounds the artifact's role as an AI policy artifact in its own right
- `concepts/algorithmic-transparency.md` — the interpretive chain and grounding references sections operationalize the transparency principle

## Version history

- **0.1.0** (2026-06-28) — Initial artifact-template entry. Eight sections, three-job framing, length target, distribution forms. Authored per `docs/09-artifact-template.md`.
