---
title: "Run log format — the structured record of every simulation run"
description: "YAML-frontmatter run metadata (run_id, timestamps, model, wiki version), then per-turn entries (crisis, player move, grammar output, state delta, narrative move). The artifact generator consumes this log to produce the shareable artifact."
type: mechanic
version: "0.1.0"
last_updated: 2026-06-28
grounded_in:
  - "../docs/07-interpretation-grammar.md"
  - "../docs/11-openrouter-configuration.md"
---

## Run log format

Every simulation run produces a structured run log. The artifact generator consumes the log to produce the shareable artifact. The log is the primary record of what happened in a run.

### Top-level metadata

The log begins with YAML frontmatter:

```yaml
---
run_id: "YYYY-MM-DD-HH-MM-SS-{random}"
started_at: "ISO-8601 timestamp"
ended_at: "ISO-8601 timestamp"
model: "openai/gpt-4o"
model_version: "snapshot identifier if available, else 'unspecified'"
wiki_version: "git commit hash of wiki/ at run time"
wiki_index_version: "git commit hash of wiki/index.md at run time"
fallback_used: false
outcome: "legitimacy-collapse" | "technical-collapse" | "narrative-capture-collapse" | "no-collapse"
turns_completed: 14
seed: "integer for reproducibility (optional)"
---
```

The `model` and `model_version` fields are per Principle 1.2 — model behavior is observable, versioned, and citable. The `wiki_version` and `wiki_index_version` fields make the corpus grounding traceable. `fallback_used` indicates whether the simulation fell back to `FALLBACK_OPENROUTER_MODEL` at any point.

### Per-turn entries

After the metadata, the log contains a section per turn. Each turn is a markdown H2 with the turn number:

```markdown
## Turn 7

### Crisis

Trigger text (verbatim from the surfaced crisis entry).

### Player move

Free-text policy input (verbatim).

### Advisors consulted

A list of voice names and their response texts:

- **frontier-lab:** "How this position sees the crisis..."
- **civil-society:** "How this position sees the crisis..."

If no advisors were consulted, this section is omitted.

### Grammar output

The grammar spec's structured output:

- **state_delta:** {legitimacy: +5, fiscal_slack: 0, elite_alignment: -3, ecological_debt: 0, narrative_coherence: -2, capability_frontier: 0}
- **interpretive_gloss:** "Your move stabilizes the visible legitimacy signal..."
- **narrative_move:** "The labs' next press release shifts the framing..."
- **grounding_trace:** ["concepts/algorithmic-authority.md", "entities/openai.md"]
- **confidence:** "high"

### State after turn

The full state vector after the delta is applied:

- legitimacy: 67 (strained)
- fiscal_slack: 70 (strained)
- elite_alignment: 52 (strained)
- ecological_debt: 30 (holding)
- narrative_coherence: 48 (eroded)
- capability_frontier: 75 (strained)
```

### Collapse entry

If a collapse fires, the final turn's section includes a collapse block:

```markdown
### Collapse

- **Type:** legitimacy-collapse
- **Trigger turn:** 14
- **Condition met:** legitimacy=18, elite_alignment=27
- **Final state vector:** { full state vector }
```

### Run log directory

Run logs are written to `RUN_LOG_DIR` (default `./runs/`). Each run produces a single file: `runs/{run_id}.md`.

## Sources

- `../docs/07-interpretation-grammar.md` — the grammar spec defines the `state_delta`, `interpretive_gloss`, `narrative_move`, `grounding_trace`, and `confidence` fields that appear in each turn's grammar output.
- `../docs/11-openrouter-configuration.md` — the model and wiki_version fields per the case-study framing.

## Version history

- **0.1.0** (2026-06-28) — Initial run-log-format entry. Top-level metadata, per-turn sections, collapse entry, run log directory convention. Authored to operationalize the format implied by the grammar spec and the artifact template.
