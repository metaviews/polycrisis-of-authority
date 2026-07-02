---
title: "Walkthrough feedback checklist — items surfaced during the first usability walkthrough"
description: "Concrete improvements requested during the post-5d walkthrough. All 8 items were addressed in cycle 5e; this doc is the record of what was closed and when. The handoff protocol (docs/12-handoff-protocol.md) says the handoff doc should track open work; this is the handoff doc for cycle 5e onward."
type: prototype
subtype: feedback-checklist
version: "0.2.0"
last_updated: "2026-06-29"
---

# Walkthrough feedback checklist

_Filed during the post-5d walkthrough, before the cycle 5e work began. Each item is a concrete improvement surfaced by playing the simulation with the real LLM. Items are tracked here so subsequent cycles can pick up the list and complete items without re-litigating the design._

## Items

- [x] **1. Longer intro.** Done in cycle 5e. ASCII logo + title + subtitle + 5-line frame paragraph + one-line "how to play" + run ID/model line. The intro gives the player a moment to settle into the world before the first crisis hits.
- [x] **2. ASCII logo of an A with a circle.** Done in cycle 5e. 9-line ASCII-art logo at the top of the intro: a rounded circle with an A inside. Austere/archival register, consistent with the project's design.
- [x] **3. Don't tell players about the 30-turn cap.** Done in cycle 5e. The intro now ends with "the regime either holds or it falls" — no mention of the operational MAX_TURNS=30 cap. The cap is enforced internally but not announced.
- [x] **4. Headlines section.** Done in cycle 5e. World generator output schema extended with `headlines: string[]` (1-4 past-tense committed events). `renderCrisisProse` shows `Headlines:` above `Situation:` when present. Turn-1 seed crises have `headlines: []`.
- [x] **5. Corpus quote during the spinner.** Done in cycle 5e. `pickCorpusQuote()` in `scripts/wiki-query.js` extracts a single sentence-quote from a random wiki page; `withSpinner(reader, message, fn, { quote })` displays it with attribution below the spinner message. Prefers the prior turn's first grounding entry.
- [x] **6. Tighter collapse conditions.** Done in cycle 5e. Added `credibility-collapse` to `state.js`: when all of legitimacy, narrative_coherence, and elite_alignment are below 50, the regime loses credibility. Existing collapse conditions (legitimacy < 20, ecological_debt > 80, narrative_coherence < 25) remain.
- [x] **7. End-of-run report.** Done in cycle 5e. New module `src/sim/post-game-narrator.js`. `narrateRunEnd()` calls the LLM with a structured prompt asking for `{outcome_line, narrative, key_moment, invitation}`. Falls back to a hand-built mechanical summary if the LLM call fails. `renderEndOfRunReport` formats for terminal display with the final state's bands.
- [x] **8. The litmus test still failing.** Done in cycle 5e. The post-game narrator is the response to this. Whether the report's prose actually makes the player want to start another run is a judgment call from the next playthrough — the litmus test outcome can't be verified mechanically, only by playing.

## How to use this checklist (for future iterations)

When a new walkthrough-feedback cycle begins, copy this file to a new version (e.g., `2026-07-15-walkthrough-feedback-checklist.md`) and start with all items open. Mark each item `[x]` with the cycle number as it's closed.

## Closed items

**All 8 items closed in cycle 5e (2026-06-29).** See the `## Items` section above for the resolved text on each item.

the prototype observation for cycle 5e is at `wiki/prototypes/2026-06-29-phase-5e-walkthrough-feedback.md` and walks through each change in detail.

when this checklist is needed again — for the next major iteration (e.g., after discord playtesting produces feedback) — copy this file to a new version and start with all items open.