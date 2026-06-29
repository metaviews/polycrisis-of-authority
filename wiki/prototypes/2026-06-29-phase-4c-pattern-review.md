# Prototype — 2026-06-29 — Phase 4c: pattern review workflow

## Observation

Cycle 4c lands the *workflow* layer on top of the 4b run-query tool. The orchestrator-role doc names two activities that need this layer:

- **Activity 4 (Pattern review).** *"Outputs: a brief notes file (committed to the repo) summarizing observed patterns, notable surprises, and any actions triggered."* The review is a committed artifact, not just command output.
- **Activity 2 (Grammar refinement).** *"Inputs: aggregated run logs, the wiki's relevant mechanics entries, the corpus's relevant concepts entries, direct comparison runs before and after a refinement. Outputs: an updated grammar prompt committed to the repo with a dated changelog entry; before/after comparison notes."*

This cycle builds the two outputs the orchestrator produces: a review-notes skeleton (Activity 4) and a grammar-refine comparison (Activity 2). Both are emitted by `scripts/run-query.js` as markdown the orchestrator can edit, save, and commit.

## What shipped

### 1. Visible-signal block in the run log (run-log format v0.2.0)

The interactive CLI now writes the visible-signal layer into the run log per turn. The block names the three signals per axis and the discrepancy score. This makes the run log the canonical record of what the player saw, not just what the simulation knew.

The run-query parser (4b) was extended to read this block, populating `turn.visibleSignals` with `{signals, discrepancy}` per axis. Old run logs (Cycle 4b and earlier) parse cleanly with `visibleSignals: null` — the parser tolerates the absence.

### 2. `pattern` command now surfaces signal-discrepancy hotspots

The pattern output adds a "Visible-signal discrepancy hotspots" section listing the top 10 turn/axis combinations where the gap between the player's visible signals and the hidden state was largest (≥12 points). This is the orchestrator's primary signal for "the literacy device was working as designed here" — the moments when reading the signals critically would have changed the policy move.

### 3. `review-notes` command (Activity 4)

`node scripts/run-query.js review-notes [--output file.md]` emits a markdown review-notes skeleton with:

- Aggregate summary (total runs, collapse rate, advisor use rate, outcome distribution, model distribution, top 5 cited wiki entries, top 5 signal hotspots)
- "Notable surprises" section (the orchestrator's working notes)
- "Actions triggered" section (checkboxes for grammar/wiki/advisor/model actions)
- Linked runs (every run reviewed)

The orchestrator reads the skeleton, fills in the open sections, and commits the file to `wiki/notes/` as the audit trail for the review.

### 4. `grammar-refine` command (Activity 2)

`node scripts/run-query.js grammar-refine <beforeRunId> <afterRunId>` produces a structured before/after comparison with:

- Run-level comparison (outcome, turns, collapse type/turn)
- Final state per axis
- Per-turn delta side-by-side
- "Why this refinement was made" stub for the orchestrator's note

The orchestrator attaches this to a grammar commit's changelog per the orchestrator-role doc's grammar-refinement output spec.

## Probe results

**Verification script** (`/tmp/hermes-verify-4c.sh`): all 9 checks pass.

The verifications cover:

1. Syntax + 4 new exports (`cmdReviewNotes`, `cmdGrammarRefine`, `buildReviewNotes`, `buildGrammarRefine`)
2. Visible-signal block parsing — 8 field-level checks (signals array, names, values, band-only signals, discrepancy)
3. Old-format run logs parse cleanly (`visibleSignals: null`, not an error)
4. Review-notes skeleton has all 10 required sections
5. `review-notes --output` writes a complete skeleton to file
6. `pattern` command surfaces signal-discrepancy hotspots
7. `grammar-refine` produces structured comparison with all required sections
8. Existing 4b commands (list, summary, show) still work — no regression
9. Wiki audit remains clean

**Regression check:** the prior cycle verifications (`hermes-verify-4a.sh`, `hermes-verify-4b.sh`) still pass.

## Design notes

**Why a markdown skeleton, not a fillable form.** The orchestrator's review note is a curated document, not a form response. A skeleton with sections and checkboxes gives structure without forcing the orchestrator into a pre-defined answer shape. The "Notable surprises" section is intentionally a free-form bullet list; the "Actions triggered" section is a checkbox list so the orchestrator can move items into the wiki log or commit hooks.

**Why visible-signal data in the run log, not just the artifact.** The run log is the orchestrator's primary input per the orchestrator-role doc; the artifact is the player's shareable output. Putting signal data in the run log means the orchestrator can aggregate across runs without re-parsing artifacts. The artifact still carries the discrepancy timeline (collapse-reveal section, Cycle 3c) for the player's transparency surface.

**Why the hotspots are a top-10, not all.** With 6 axes and 14 turns per run, even a single run can produce dozens of hot-spot turns. The top-10 by discrepancy is what an orchestrator scans in a 5-minute review. Per-axis aggregate (printed in the same section) gives the long-tail distribution.

**Why grammar-refine is its own command, not a flag on diff.** `diff` answers "what's different" — a structural comparison. `grammar-refine` answers "what should I write in the changelog" — a structured output ready to attach to a commit. Separating them keeps the diff output clean and the changelog output markdown-shaped.

## Files added/changed

- `src/sim/interactive.js` — `displayState` returns the structured signals; turn record carries `visibleSignals`; `buildRunLog` writes the new block.
- `src/sim/state-display.js` — new `computeVisibleSignals` function returns structured signals (parallel to `formatVisibleSignalsDisplay` which returns the rendered string).
- `wiki/mechanics/run-log-format.md` — version bumped to 0.2.0; "Visible signals" section documented.
- `scripts/run-query.js` — extended parser for the new block; new `pattern` section; new `review-notes` and `grammar-refine` commands; new exports.
- `wiki/notes/` — new directory; first review-notes example will be filed in 4d (handoff protocol) or earlier if the orchestrator runs a real review.

## Phase 4 ship-criterion status

| criterion | status |
|---|---|
| A new orchestrator can pick up the role and run the wiki audit and pattern review | pending 4e (handoff protocol); the technical surface is now complete |
| A wiki-ingest cycle from the parent project produces a draft proposal set that the orchestrator can review and accept/reject | ✓ (4a) |
| Run logs are persisted for every session and are queryable | ✓ (4b); extended in 4c with visible-signal data + review/grammar-refine commands |

## Next

Cycle 4d — model-version log. Per the roadmap: *"Model-version log: a structured record of every model change, with before/after comparison runs."* The 4c `grammar-refine` and `pattern` commands are the inputs; 4d adds the wiki entry that the log lands in, plus a CLI command to file a model switch.
