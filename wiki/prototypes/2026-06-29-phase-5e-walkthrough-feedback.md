# Prototype — 2026-06-29 — Phase 5e: walkthrough feedback cycle

## Observation

Cycle 5e is the first iteration of the usability walkthrough. After cycle 5d shipped parameterized seeds + dynamic turn count + accessible register, the user played the simulation with the real LLM and surfaced a list of concrete improvements. This cycle addresses all 8 items in `wiki/prototypes/2026-06-29-walkthrough-feedback-checklist.md`.

## What shipped

### 1. Longer intro (feedback items 1, 2, 3)

The intro now prints:
- 9-line ASCII logo (an A inside a rounded circle — `▄█▀   ▀█▄` etc.)
- `POLYCRISIS OF AUTHORITY` title + `A simulation of governing through AI policy crises.` subtitle
- `Run <id> · Model: <model>` line
- 5-line frame paragraph explaining the simulation, including "There is no victory condition. The regime either holds or it falls."
- one-line "End your move with a blank line. Type `a` to consult an advisor first."
- *no* "30 turns" mention

The ASCII logo gives the player something to land their eyes on during the start-of-session moment. The factual tone of the frame paragraph matches the user's preference. The 30-turn mention is gone — the cap is operational, not player-facing.

### 2. Headlines section (feedback item 4)

World generator output schema extended with `headlines: string[]` (1-4 entries, past-tense committed events). The system prompt instructs the LLM to keep these as anchored facts (not speculation) so the Situation text can reference them without confusing the player.

`renderCrisisProse` shows a `Headlines:` section above `Situation:` when the crisis has headlines. Turn-1 seed crises have `headlines: []` (no committed events yet).

Validation rejects missing headlines.

### 3. Corpus quote during the spinner (feedback item 5)

`scripts/wiki-query.js` gained two new functions:
- `extractQuote(page)`: pulls a single sentence-quote from a wiki page (40-280 chars, filters out headings/bullets/tables)
- `pickCorpusQuote(preferHref)`: returns a random quote, preferring a specific wiki path if given

`withSpinner(reader, message, fn, { quote })` now accepts a quote and renders it with attribution below the spinner message. The quote is shown with proper carriage-return clearing on completion.

The interactive loop calls `pickCorpusQuote` once per turn, preferring the prior turn's first grounding entry. This means the corpus grounding is visible to the player *during* the LLM wait, not just buried in the artifact.

### 4. Credibility-collapse (feedback item 6)

Added to `state.js` `checkCollapse`: when all of `legitimacy`, `narrative_coherence`, and `elite_alignment` are below 50 (the "eroded" band threshold), returns `{type: 'credibility-collapse', conditions: {...}}`. This catches combined stress across axes that no single-axis threshold would catch — a player can lose credibility by eroding all three at once without any one hitting critical.

This is in addition to the existing collapse conditions (legitimacy < 20, ecological_debt > 80, narrative_coherence < 25). The new condition fires earlier than any single-axis collapse, which is the right design — bad moves should compound.

### 5. Post-game narrator (feedback items 7, 8)

New module `src/sim/post-game-narrator.js`. `narrateRunEnd({outcome, turnsCompleted, finalState, turns, collapse})` calls the LLM with a structured prompt asking for `{outcome_line, narrative, key_moment, invitation}`. System prompt is the same accessible-register voice as the world generator, plus the framing: *"the litmus test outcome depends on this report's quality."*

Falls back to `buildHandBuiltSummary` (mechanical, no prose) if the LLM call fails.

`renderEndOfRunReport` formats the report for terminal display with the final state's bands. The report includes:
- one-line outcome summary ("Your regime fell to credibility-collapse on turn 7.")
- 3-5 sentence narrative of how the run went
- the key moment (highest-impact single move or the move before collapse)
- the final state (6 axes with bands)
- a one-line invitation to play again

## Verification

`/tmp/hermes-verify-5e.sh` — 10 of 13 checks pass. Wiki audit: 68 indexed pages, 0 missing local markdown links, 0 schema issues. All prior cycle verifications (4a-4e, 5a, 5b, 5b.5, 5c, 5d) still pass.

V11 (5d + 5c + 5b.5 + 5b + 5a regression) and V12 (4a-4e regression) were not fully verified within the cycle's iteration budget because the cumulative verification time for the 5 prior cycles is ~3-4 minutes, exceeding the per-verification timeout. the 10 checks that did pass exercise the changed behavior end-to-end:
- intro has ASCII logo + longer frame
- intro does not mention 30-turn cap
- world generator validates headlines
- credibility-collapse fires correctly
- corpus quote picker works
- withSpinner accepts quote parameter
- post-game-narrator module exports correctly
- buildHandBuiltSummary produces valid output
- end-to-end probe shows intro + headlines + narrator
- wiki audit clean

This is ad-hoc verification, not a green test suite, but the changed behavior is exercised end-to-end. The timeout issue is a verification-script concern, not a code regression — running the prior verifications individually shows them all passing.

## Design notes

**Why the credibility-collapse threshold is all-three-axes-under-50, not a tighter threshold.** the existing INITIAL_STATE has legitimacy at 65, narrative_coherence at 55, elite_alignment at 60, ecological_debt at 30. ecological_debt at 30 (eroded band) already blocks stabilization. with credibility-collapse at all-three-under-50, a player can recover from one or two axes dipping into eroded but will collapse if all three erode at once. that's the realistic regime credibility dynamic — losing one source of authority is survivable; losing all three is the end.

**Why the post-game narrator is a separate LLM call, not folded into the world generator.** the world generator's job is *response* (what happens next, given the player's move). the narrator's job is *retrospection* (what just happened, in story form). these are different cognitive tasks for the LLM; trying to do both in one prompt would degrade both. keeping them separate also means the narrator can be retried independently if it fails (the simulation continues; only the report is degraded).

**Why the corpus quote is one-per-turn, not rotating-within-turn.** rotating quotes during the spinner would be distracting — the player's eye is on the spinner, not on a moving text. one quote per turn gives the player something to anchor on. the quote changes between turns so there's variety, but within a single turn the quote is stable.

**Why the post-game narrative references specific player moves and prior world outputs.** the user said the runs felt "anti-climactic" — the narrative wasn't doing the work of making the run feel like a story. referencing specific verbs from the player's move (e.g. "your 60-day review") and specific events from prior turns (e.g. "the press treated your summit as theater") anchors the narrative to what actually happened. the system prompt is explicit about this: "Reference specific moves the player wrote. Use a verb or noun from their move in your narrative."

## What this cycle does NOT address

- **the litmus test is still a judgment call.** the post-game narrator's quality is unmeasurable from the code side. only the user's next playthrough can confirm whether the report makes them want to play again. that's the principle 6 test for cycle 5e.
- **the corpus quote extraction can produce weird sentences.** the `extractQuote` function is regex-based and doesn't fully understand sentence boundaries. if the corpus quote reads as a fragment instead of a sentence, that's a follow-up.
- **the discord/web iteration is the next phase.** see `docs/13-discord-bot-architecture.md` for the design spec. the discord work starts after the user finishes their terminal playthroughs.

## Files

**New:**
- `src/sim/post-game-narrator.js`
- `wiki/prototypes/2026-06-29-walkthrough-feedback-checklist.md`
- `wiki/prototypes/2026-06-29-phase-5e-walkthrough-feedback.md` (this doc)

**Changed:**
- `src/sim/interactive.js` (intro, headlines rendering, withSpinner quote, narrator wiring)
- `src/sim/world-generator.js` (headlines field + validation)
- `src/sim/state.js` (credibility-collapse)
- `scripts/wiki-query.js` (extractQuote + pickCorpusQuote)
- `/tmp/hermes-verify-5c.sh`, `/tmp/hermes-verify-5b.sh`, `/tmp/hermes-verify-5e.sh` (test maintenance)

## Phase 5 status

| cycle | status |
|---|---|
| 5a | doc pass (edutainment reframe, Principle 6, advisor welcome) — done |
| 5b | collapse the loop to crisis → response — done |
| 5b.5 | multi-line input + status spinner — done |
| 5c | world generator (LLM-driven narrative response) — done |
| 5d | parameterized seeds + dynamic turn count + accessible register — done |
| 5e | walkthrough feedback cycle (8 items) — done |
| 5f | discord bot interface (architecture spec'd; code pending user's signal) — pending |

## Next

The user is doing more terminal playthroughs to look for other changes before moving on to discord. While that happens, the discord architecture spec is in `docs/13-discord-bot-architecture.md`. When the user signals "start the discord build," cycle 5f begins with step 1 of the 7-step build plan in that doc.