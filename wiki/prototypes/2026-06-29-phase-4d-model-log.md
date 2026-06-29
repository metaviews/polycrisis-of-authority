# Prototype — 2026-06-29 — Phase 4d: model-version log

## Observation

Cycle 4d built the model-version log per the roadmap's Phase 4 build order item 5: *"Model-version log: a structured record of every model change, with before/after comparison runs."*

The model-version log is the orchestrator's tool for Activity 5 (Model-version and provider response) per `docs/03-orchestrator-role.md`. Its load-bearing output is the **judgment** — the orchestrator's call on whether a model switch required a grammar/wiki update vs. just produced different-but-acceptable behavior.

## What shipped

### 1. The wiki entry: `wiki/mechanics/model-versions.md`

An append-only log. Each entry follows a fixed shape:

- `### YYYY-MM-DD — from `OLD` to `NEW`` (or `initial model: `MODEL`` for foundational entries)
- **Reason:** why the switch
- **Before runs:** run IDs from before the switch
- **After runs:** run IDs from after the switch
- **Observed behavior change:** what the orchestrator noticed
- **Judgment:** the marker (`intervention` or `no-intervention`) + optional explanation
- **Linked grammar/wiki updates:** commit refs if judgment was `intervention`

The "Judgment" line is structured as a marker plus optional note. The orchestrator's call (intervention vs. no-intervention) is the load-bearing decision; the explanation is for the audit trail.

### 2. The CLI: `scripts/model-log.js`

Four commands:

- `current` — show current `.env` model + the 3 most recent log entries
- `list` — show all recorded switches with all fields
- `record <old> <new> [opts]` — append a new switch entry to the log. Options: `--reason`, `--before`, `--after`, `--observation`, `--judgment`, `--linked`
- `compare <beforeRunId> <afterRunId>` — produce a before/after comparison (delegates to `run-query.js` `grammar-refine` for the structured output)

`record` is the orchestrator's primary tool. The other three are query/investigation commands.

### 3. First entry: the initial model

The project has been running on `minimax/minimax-m3` since the start. The first log entry records this foundational choice:

```
### 2026-06-28 — initial model: `minimax/minimax-m3`
- Reason: Initial model selection per the project's case-study framing
- After runs: 20260628223813-8jtf0r, 20260628231154-dzl75j, 20260629064319-h80unb-speedrun
- Observed behavior change: substantive interpretive glosses, 5-grounding-trace retrieval,
  consistent state-delta magnitudes, "high" confidence on 13/13 probed turns
- Judgment: no-intervention
```

The judgment (no-intervention) reflects that the model's interpretive style aligns with the grammar spec — the orchestrator's call that no grammar update was needed for the initial model choice.

## Probe results

**Verification script** (`/tmp/hermes-verify-4d.sh`): all 10 checks pass.

The verifications cover:

1. Syntax + 11 functions exported
2. `readEnv` parses `.env` (OPENROUTER_MODEL + FALLBACK_OPENROUTER_MODEL)
3. `buildEntry` produces all 8 required fields
4. `appendEntry` preserves the existing log (size grows, original content intact)
5. `parseEntries` round-trips with structured judgment (marker + note)
6. `cmdCurrent` shows current model + recent log entries
7. `cmdList` lists the initial entry with all fields
8. `loadRun` parses model + outcome + turns from run log frontmatter
9. `cmdCompare` produces a structured model-version comparison (delegates to grammar-refine)
10. Wiki audit clean

**Regression check:** prior cycle verifications (`hermes-verify-4a.sh`, `hermes-verify-4b.sh`, `hermes-verify-4c.sh`) still pass.

## Design notes

**Why a marker plus optional note, not just a marker.** The judgment is the orchestrator's call. The marker is machine-readable (the parser extracts it as a discrete field); the note is for the human audit trail. This separation lets future tooling branch on the marker without parsing prose.

**Why initial-model entries are a separate shape.** A foundational entry has no "from" — there's no previous model. The parser handles both shapes; the orchestrator can write either form depending on whether the entry is a switch or a foundation.

**Why `cmdCompare` delegates to `run-query.js`.** The model-version comparison is structurally identical to the grammar-refinement comparison (Activity 2 vs. Activity 5 in the orchestrator role both need before/after). The model-log command wraps the run-query command rather than re-implementing, keeping the comparison format consistent.

**Why an append-only log.** Per the orchestrator-role doc, the log is the audit trail. Editing an entry would erase the orchestrator's earlier judgment, which is the load-bearing part of the entry. New entries are added at the bottom; corrections are new entries pointing at the old one.

**Why the per-judgment structured field.** The `judgment: intervention | no-intervention` marker makes it possible to filter or aggregate later (e.g., "how many model switches in the last year required grammar updates?"). The note is free-form.

## Files added/changed

- `scripts/model-log.js` — new CLI (single file, ~13KB, 11 exported functions)
- `wiki/mechanics/model-versions.md` — new mechanic entry (version 0.1.0) with the initial-model entry

## Phase 4 ship-criterion status

| criterion | status |
|---|---|
| A new orchestrator can pick up the role and run the wiki audit and pattern review | pending 4e (handoff protocol); the technical surface is now complete (wiki-audit, wiki-ingest, run-query with review-notes/grammar-refine, model-log) |
| A wiki-ingest cycle from the parent project produces a draft proposal set that the orchestrator can review and accept/reject | ✓ (4a) |
| Run logs are persisted for every session and are queryable | ✓ (4b) |

The roadmap's Phase 4 build order is now complete:
1. ✓ Wiki ingestion (4a)
2. ✓ Wiki audit (Phase 1, inherited)
3. ✓ Run log format (Phase 2/4b, extended in 4c)
4. ✓ Pattern-review tooling (4c)
5. ✓ Model-version log (4d)

## Next

Cycle 4e — handoff protocol. The roadmap's Phase 4 ship criterion 1 says: *"A new orchestrator can pick up the role, read `03-orchestrator-role.md` plus this section's tooling, and run the wiki audit and pattern review without additional guidance."* The technical tooling is now complete; 4e writes the doc that ties it together (what to read first, what to test, what to verify, what "done" looks like for a handoff).
