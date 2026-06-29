---
title: "Model versions — the log of every model switch and its observed effects"
description: "Append-only record of every model the simulation has run under. Each entry names the old and new model, the date of the switch, the reason, before/after comparison runs, and the orchestrator's judgment on whether the behavior change required a grammar/wiki update."
type: mechanic
version: "0.1.0"
last_updated: "2026-06-29"
grounded_in:
  - "../docs/03-orchestrator-role.md"
  - "../docs/11-openrouter-configuration.md"
---

## Model versions

This is the append-only log of every model the Polycrisis simulation has run under. Per the orchestrator-role doc's Activity 5 (Model-version and provider response), the log records the date of each switch, the reason, before/after comparison runs, observed behavior changes, and the orchestrator's judgment on whether the change required a grammar or wiki update.

The log is *append-only*. Existing entries are never edited. New entries are added at the bottom of the file via `node scripts/model-log.js record`.

The current model is read from `.env`'s `OPENROUTER_MODEL` setting. The fallback model (used on 429 rate-limit responses) is `FALLBACK_OPENROUTER_MODEL`.

## How to record a model switch

1. **Before switching:** run a few sessions under the current model. Note the run IDs of representative runs (one collapse run + one no-collapse run, ideally) for the before/after comparison.
2. **Edit `.env`:** set `OPENROUTER_MODEL=<new-model>`. Restart the simulation.
3. **After switching:** run a few sessions under the new model using the same player script. Note the run IDs.
4. **Record the switch:** `node scripts/model-log.js record <oldModel> <newModel> --reason "..." --before <beforeRunId1,beforeRunId2> --after <afterRunId1,afterRunId2>`. This appends a new entry to this log.
5. **Review the behavior change:** use `node scripts/run-query.js pattern` and `node scripts/run-query.js grammar-refine` to compare the before/after runs. Update the log entry with the orchestrator's judgment.

## How to read this log

Each entry follows this shape:

```markdown
### YYYY-MM-DD — from <oldModel> to <newModel>

- **Reason:** ...
- **Before runs:** <id1>, <id2>
- **After runs:** <id1>, <id2>
- **Observed behavior change:** ...
- **Judgment:** intervention | no-intervention [optional explanation]
- **Linked grammar/wiki updates:** <commit refs, if any>
```

The "Judgment" line is the load-bearing one. The value must start with the marker `intervention` or `no-intervention` (the orchestrator's call on whether the change required a grammar/wiki update); any text after the marker is an optional explanation. The orchestrator-role doc says: *"Both [requiring a grammar update vs. producing different but acceptable behavior] are observable outcomes of the case-study claim; only the first requires intervention."* The marker is the orchestrator's call; the explanation is for the audit trail.

## Log entries

### 2026-06-28 — initial model: `minimax/minimax-m3`

- **Reason:** Initial model selection per the project's case-study framing. The orchestrator chose MiniMax M3 as the primary model because the project is being showcased in the MiniMax community.
- **Before runs:** n/a (initial entry)
- **After runs:** 20260628223813-8jtf0r, 20260628231154-dzl75j, 20260629064319-h80unb-speedrun
- **Observed behavior change:** n/a. The model produced substantive interpretive glosses (2-4 sentences), 5-grounding-trace retrieval, and consistent state-delta magnitudes. The 4c prototype observation documented the model's interpretive style: detailed glosses with internal links to existing wiki entries, and confidence ratings of "high" in 13/13 probed turns.
- **Judgment:** no-intervention. The model's interpretive style aligns with the grammar spec; no grammar update needed.
- **Linked grammar/wiki updates:** grammar commit during Phase 2c, mechanics entry `interpretation-grammar.md`
