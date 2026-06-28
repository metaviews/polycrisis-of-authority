# OpenRouter Configuration

_Defines how the model is configured, swapped, and logged. Read after the spine and the wiki structure plan. The smallest spec by content but operationally important — it makes Principle 1.1 (model is an orchestrator choice) actually work._

This spec specifies the configuration layer that makes the model swappable. The OpenRouter client itself (`scripts/lib/openrouter.js`) is inherited from the parent Metaviews project as-is — the parent already has a project-agnostic OpenRouter wrapper. This spec is not about *building* the client; it's about *configuring* it for the case-study claim and ensuring the configuration is auditable.

## Purpose and scope

**What this spec configures.** This spec defines:

1. The `.env.example` file — what variables are required, what defaults are sensible, what the comments explain.
2. The model selection pattern — how the simulation reads the model name and version, how swapping happens at runtime.
3. The case-study posture for model selection — why the shipped default is not MiniMax, and how the case-study framing is preserved through the configuration.
4. The run-log fields that record which model produced a given run — making model behavior observable per Principle 1.2.
5. The wiki integration — where the configuration lives as a mechanics entry, how model-version changes are logged per the orchestrator role's Activity 5.

**What this spec does NOT configure.** This spec does not specify the model's behavior — that's the interpretation grammar spec's job. This spec does not specify how prompts are structured — that's the grammar spec and advisor prompts spec. This spec is purely about *which model* runs, *how that's recorded*, and *how it can be swapped*.

The configuration is the operational hook for the case-study claim. Without it, the claim is just words. With it, the claim is testable: change the model, compare runs, observe differences.

## The `.env.example` specification

The project ships with a `.env.example` file (and a real `.env` is created by the user when they set up). The `.env.example` is the template; it has every variable the project uses, with sensible defaults and explanatory comments.

```bash
# OpenRouter API key (required)
# Get yours at https://openrouter.ai/keys
OPENROUTER_API_KEY=

# Primary model (required)
# This is the model the simulation uses for grammar, advisors, and crisis generation.
# The default is a non-MiniMax model so the case-study claim about model swap
# is genuinely about the swap (not about a specific model).
#
# Per Principle 1.1, this is an orchestrator choice expressed through .env.
# Change this value to run the simulation under a different model and observe
# the difference. See docs/11-openrouter-configuration.md for the case-study
# framing.
#
# Examples of valid model identifiers:
#   openai/gpt-4o
#   anthropic/claude-3.5-sonnet
#   google/gemini-flash-1.5
#   minimax/MiniMax-M3 (set explicitly for the MiniMax case study)
OPENROUTER_MODEL=openai/gpt-4o

# Fallback model (optional)
# Used when the primary model returns 429 (rate limit) or other transient errors.
# Should be from a different provider than the primary to avoid correlated failures.
FALLBACK_OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# Wiki retrieval settings (optional)
# Number of wiki pages to retrieve per query. Default 6 (inherited from parent).
WIKI_RETRIEVAL_LIMIT=6

# Token budget per wiki page in context (optional)
# Default 12000 total / N pages. Inherited from parent.
WIKI_CONTEXT_CHARS=12000

# Run log location (optional)
# Where the simulation writes run logs (for orchestrator pattern review).
# Default: ./runs/
RUN_LOG_DIR=./runs/
```

The comments in `.env.example` are load-bearing. They're not just explaining variables — they're explaining *why this is configurable* and *what changing it does*. A user reading the file learns the case-study framing without needing to read this spec.

## Model selection pattern

The simulation reads the model from `process.env.OPENROUTER_MODEL` at startup. The model is fixed for the duration of a run — there's no per-turn model switching (that would complicate the case-study claim).

When the orchestrator wants to swap models, they:

1. Update `.env` (or the deployment environment) with the new model identifier.
2. Restart the simulation.
3. Run a baseline test (per the grammar spec's test cases) to verify the new model produces comparable output.
4. Log the model change in the wiki log per the orchestrator role's Activity 5.
5. Optionally run before/after comparison runs to observe behavior differences.

The model identifier follows OpenRouter's format: `provider/model-name`, e.g., `anthropic/claude-3.5-sonnet`, `openai/gpt-4o`, `minimax/MiniMax-M3`. OpenRouter's API accepts this format directly.

### Why no per-turn model switching

Per-turn model switching would produce runs whose behavior depends on which model handled which turn — making the run's interpretive behavior hard to attribute. The case-study claim requires that a run's behavior be *attributable* to a specific model. Per-run model identity (one model for the whole run) preserves this.

A future version could support model comparison runs (the same player input processed by different models) — that's a separate feature, not MVP-0.

## The case-study posture

The roadmap says: "default to a non-MiniMax model initially so the case-study claim is genuinely about the swap."

This is a deliberate choice. The project is part of a MiniMax community showcase, but the case-study framing requires that the *category of behavior* (LLM interpretation of policy) is what's being studied, not the *specific behavior of MiniMax M3*. Shipping with MiniMax M3 as the default would conflate the artifact with one instance of model behavior.

The shipped default is `openai/gpt-4o` (or any non-MiniMax model the user prefers). To run the MiniMax case study specifically, the user sets `OPENROUTER_MODEL=minimax/MiniMax-M3` in `.env` and runs the simulation. The comparison between runs under different models is what makes the case study observable.

This posture also makes the project useful *outside* the MiniMax showcase. Anyone can run it under their preferred model and get a working simulation. The MiniMax-specific framing is a documentation choice, not a code choice.

## Run log integration

Per Principle 1.2 (model behavior is observable, versioned, and citable), every run log records the model that produced it. The run log format:

```yaml
# Run metadata (always present at top of run log)
run_id: "YYYY-MM-DD-HH-MM-SS-{random}"
started_at: "ISO-8601 timestamp"
model: "openai/gpt-4o"
model_version: "snapshot identifier if available, else 'unspecified'"
wiki_version: "git commit hash of wiki/ at run time"
wiki_index_version: "git commit hash of wiki/index.md at run time"
fallback_used: false  # true if fallback model was invoked
```

These fields are written at the start of every run and are immutable for the duration of the run. The artifact (per the artifact template spec) surfaces the model and version fields in its header section.

The model_version field is whatever OpenRouter returns as the model snapshot identifier. OpenRouter's API responses include model metadata that can be recorded. If the user runs against an OpenRouter-compatible endpoint that doesn't return version metadata, the field is `unspecified` and the orchestrator's wiki log records the absence.

## Model-version log

Per the orchestrator role's Activity 5 (model-version response), every model change is logged in the wiki log. The log entry format:

```markdown
## YYYY-MM-DD — Model version change

- **Previous model:** {previous model identifier}
- **New model:** {new model identifier}
- **Reason:** {why the change was made}
- **Baseline test result:** {passed/failed, with summary}
- **Comparison runs:** {list of any before/after runs}
- **Observed behavior changes:** {any notable differences}

---
```

The log entry makes the change auditable. A reader of the wiki log can trace the model's evolution over the project's history. The case-study claim — that the project studies model behavior, not a specific model — is supported by this audit trail: the model has been observed to change, the changes are recorded, and the runs before and after can be compared.

When the model is set to `minimax/MiniMax-M3` specifically, the log entry also notes this is the MiniMax case-study configuration. The orchestrator can compare runs under MiniMax M3 to runs under other models and document the differences.

## Wiki integration

The configuration lives as a `mechanics/` wiki entry, per the wiki structure plan. The mechanics entry has frontmatter:

```yaml
---
title: "OpenRouter configuration"
type: "mechanics"
version: "0.1.0"
last_updated: YYYY-MM-DD
grounded_in:
  - "principles/1.1-swap"  # cross-ref to the principles doc
---

# OpenRouter configuration

[Brief explanation]

## .env.example

[The .env.example content from this spec]

## Model selection

[Pattern explanation from this spec]

## Case-study posture

[Default-not-MiniMax explanation from this spec]

## Run log integration

[Run log field documentation from this spec]
```

The wiki entry is committed to the wiki and versioned. The wiki entry path is `wiki/mechanics/openrouter-configuration.md`. Changes to the configuration (e.g., a new variable, a new fallback pattern) update the wiki entry and bump the version. The wiki log records the change.

The principles doc's Principle 1.1 is referenced as the grounding for the configuration — the model is an orchestrator choice, expressed through `.env`, visible in run logs and the artifact.

## Audit criteria

The OpenRouter configuration is shippable when:

- `.env.example` is committed to the repo with all required variables and explanatory comments.
- The simulation reads `OPENROUTER_MODEL` from the environment at startup (verified by a test that confirms the value is used).
- Run logs include the `model`, `model_version`, `wiki_version`, and `wiki_index_version` fields at the top.
- The artifact template surfaces the model and version in its header (per the artifact template spec).
- The wiki entry `wiki/mechanics/openrouter-configuration.md` is committed with version 0.1.0.
- The wiki log has an entry explaining the initial model configuration.
- The case-study framing is documented (the `.env.example` comments and the wiki entry both explain why the default is not MiniMax).

When the configuration is implemented (Phase 1 build), additional ship criteria apply:

- A run with `OPENROUTER_MODEL=openai/gpt-4o` completes successfully.
- The same run with `OPENROUTER_MODEL=anthropic/claude-3.5-sonnet` completes successfully.
- The same run with `OPENROUTER_MODEL=minimax/MiniMax-M3` completes successfully.
- Run logs from all three configurations have the correct model field.
- The orchestrator can swap models by changing `.env` and restarting — no code changes required.

## Sources for this spec

- The vision document (`docs/00-vision.md`) — the case-study framing, the model-as-orchestrator-choice posture.
- The design principles (`docs/02-design-principles.md`) — especially Principle 1.1 (model is an orchestrator choice) and Principle 1.2 (model behavior is observable).
- The wiki structure plan (`docs/05-wiki-structure.md`) — the mechanics entry type and where this lives.
- The artifact template spec (`docs/09-artifact-template.md`) — what the artifact surfaces about the model.
- The orchestrator role doc (`docs/03-orchestrator-role.md`) — Activity 5 (model-version response) and how changes are logged.
- The roadmap (`docs/04-roadmap.md`) — Phase 1 item 8 (the OpenRouter client configuration requirement).
- The parent Metaviews project's `scripts/lib/openrouter.js` (`../metaviews-website/scripts/lib/openrouter.js`) — the OpenRouter client being inherited.
