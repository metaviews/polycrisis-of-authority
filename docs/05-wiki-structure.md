# Wiki Structure Plan

_The first spec. Defines the wiki's directory layout, entry schemas, audit criteria, build pipeline inheritance, and where prototype outputs (per Principle 4.5) get filed. Read after the spine (`00-vision.md` through `04-roadmap.md`)._

This document is the operational counterpart to the principles. The principles say *what* the wiki must be (corpus-grounded, opaque in play, transparent in artifact, with a `mechanics/` type that holds game-claims). This document says *how the wiki is shaped* — directory structure, file naming, frontmatter, cross-references, what makes an entry shippable.

The plan is for Phase 1 of the roadmap. Most of it must be in place before Phase 2's specs (state model, interpretation grammar) can land, because most of those specs will themselves be wiki `mechanics/` entries.

## Inheritance from the parent project

The parent Metaviews project (`../metaviews-website/`) maintains a mature wiki pipeline that Polycrisis adapts. The inheritance map below is explicit so the parent project's complexity doesn't silently pull Polycrisis into building things it doesn't need.

| Parent artifact | Status | Notes |
|-----------------|--------|-------|
| `wiki/concepts/` | Inherited | Same purpose (concept entries distilled from source material). Polycrisis seeds 5–8 concepts in MVP-0. |
| `wiki/entities/` | Inherited | Same purpose (people, organizations, technologies appearing in the corpus). Polycrisis seeds 8–12 entities in MVP-0. |
| `wiki/themes/` | Inherited | Same purpose (longitudinal syntheses across the corpus). Polycrisis seeds 2–3 themes in MVP-0. |
| `wiki/signals/` | Inherited | Same purpose (filed Pressure Systems editions). Polycrisis seeds 5–8 signals in MVP-0. |
| `wiki/mechanics/` | **New** | The Polycrisis-specific entry type. Holds game-claims — state axes, collapse modes, interpretation grammar, advisor prompts, crisis anatomy, artifact template. Distinct from corpus entries per Principle 2.3. |
| `wiki/index.md` | Adapted | Parent's index is built by `wiki-build.js`. Polycrisis inherits the structure (one-line summaries per page) and extends it with `mechanics/` entries. |
| `wiki/log.md` | Adapted | Parent's log is append-only record of wiki ingests. Polycrisis extends with: prototype outputs (per Principle 4.5), grammar refinements, advisor cast changes, model-version switches. |
| `scripts/wiki-build.js` | Adapted | Parent's two-phase build (propose structure → write pages). Polycrisis uses this for the corpus portion; `mechanics/` entries are written by hand and committed directly. |
| `scripts/wiki-query.js` | Inherited as-is | The retrieval pattern (parse index → rank pages → read top-N → format with source-preference) is exactly what the game needs. |
| `scripts/wiki-audit.js` | Inherited as-is | Schema and citation check. Polycrisis extends the schema check for the `mechanics/` type. |
| `scripts/wiki-source-refs.js` | Adapted | Adds source-path sections to wiki pages. Useful for `mechanics/` entries to show which corpus entries informed them. |
| `scripts/lib/openrouter.js` | Inherited as-is | Project-agnostic OpenRouter wrapper. Model selection via `.env` per Principle 1.1. |
| `scripts/signal-*` | Not used | The signal-scoring, drafting, publishing pipeline is operator-side for the parent project; Polycrisis doesn't have a "publish Pressure Systems edition" workflow. |
| `admin/` (Fastify server) | Deferred | Polycrisis may build a similar operator interface later (orchestrator tooling per roadmap Phase 4) but not in MVP-0. |
| `salon/` | Not used | Disabled Salon feature in the parent project; not relevant to Polycrisis. |
| Eleventy static-site build | Deferred | The parent builds a public-facing website from the wiki. Polycrisis's wiki is internal/transparent-in-artifact (Principle 2.1); no public wiki site in MVP-0. |

The inheritance principle: **when in doubt, don't inherit.** Most of the parent's complexity (Discord publishing, Eleventy site build, Fastify admin server) is for its public-facing intelligence desk. Polycrisis's wiki is a different kind of artifact — internal, curated, gameplay-oriented — and inheriting parent complexity for its own sake would dilute that.

## Directory layout

```
wiki/
  index.md             # catalog of all wiki pages, fits in one context window
  log.md               # append-only audit trail (wiki changes + prototype outputs)
  concepts/            # corpus concept entries
    *.md
  entities/            # corpus entity entries
    *.md
  themes/              # corpus theme entries (longitudinal syntheses)
    *.md
  signals/             # filed Pressure Systems editions
    *.md
  mechanics/           # game-claim entries (NEW)
    *.md
  prototypes/          # prototype outputs and observed-model-behavior notes (NEW)
    YYYY-MM-DD-*.md    # dated, slug-named
```

The `prototypes/` directory is new and per Principle 4.5. It holds:
- Probe runs (a small experiment against the model, with the prompt and the output)
- Observed-model-behavior notes (a curator's interpretation of what a probe revealed)
- Prototype-script snapshots (when a probe is reproducible, the script that produced the probe)

Each prototype file is dated and named like a Pressure Systems edition. The wiki's log.md indexes them.

## File naming

- **Corpus entries** (concepts/, entities/, themes/, signals/): inherit parent convention. Signals use `YYYY-MM-DD-slug.md`. Concepts, entities, themes use `slug.md` (no date — they're evergreen).
- **Mechanics entries**: `kebab-case-name.md`. No date prefix; the entry is versioned through the wiki's log and through git commits, not through filename dates.
- **Prototype files**: `YYYY-MM-DD-slug.md`. Date prefix is essential — prototypes are point-in-time observations and the date matters for cross-reference.

## Frontmatter schema

Every wiki entry begins with YAML frontmatter. The schema differs by entry type.

### Corpus entries (concepts, entities, themes, signals)

Inherited from parent project. Required fields:

```yaml
---
title: "Concept or entity name"
description: "One-sentence summary that fits in wiki/index.md"
type: "concept" | "entity" | "theme" | "signal"
sources:
  - "path/to/source-document-1.md"
  - "path/to/source-document-2.md"
related:
  - "path/to/related-entry-1.md"
---
```

`type` is required for the audit script to verify schema consistency. `sources` is required — Principle 2.2 says every corpus claim traces to dated, citable source material. `related` is optional but encouraged.

For signals, an additional required field:

```yaml
date: YYYY-MM-DD
```

### Mechanics entries (new type)

Distinct schema. Mechanics entries describe the *game's own model* — what claims the game makes about itself — and so the schema is different:

```yaml
---
title: "Name of the game-claim"
description: "One-sentence summary"
type: "mechanics"
version: "0.1.0"          # semantic version of this claim
last_updated: YYYY-MM-DD
grounded_in:               # optional: corpus entries this claim draws from
  - "concepts/algorithmic-authority.md"
  - "signals/2026-05-21-spacex-data-center.md"
contradicts:               # optional: corpus entries this claim is in tension with
  - "concepts/algorithmic-transparency.md"
---
```

The `version` field is critical. Game-claims change as the orchestrator refines them, and the version is what makes the change auditable. The wiki's log.md records every version bump with the reason.

The `grounded_in` field is optional because not every mechanics entry needs corpus grounding — some are purely game-mechanic claims (e.g. "the turn counter starts at 1") with no policy-domain equivalent. The audit script flags mechanics entries that *should* be grounded but aren't.

The `contradicts` field is for the rare cases where the game's claim is in tension with corpus material. This is honest scholarship — the game sometimes models authority in ways that the corpus's policy-domain analysis complicates, and naming that explicitly is better than papering over it.

### Prototype files (new type)

```yaml
---
title: "What this prototype tested or observed"
date: YYYY-MM-DD
type: "prototype"
prototype_kind: "probe" | "observed-behavior" | "script-snapshot"
model: "model-id-used"    # which model was probed, including version
prompt: "..."             # or path to prompt file
output: "..."             # or path to output file
interpretation: "..."     # orchestrator's read of what this revealed
---
```

The `model` field is required. Per Principle 1.2, model behavior is observable and citable; the model field is what makes the prototype's observation comparable across model versions. `prompt` and `output` may be inline (for short probes) or file paths (for longer probes).

## Cross-references

Wiki entries cross-reference other entries using wiki-style relative links:

- `[algorithmic authority](concepts/algorithmic-authority.md)` — corpus link
- `[interpretation grammar](mechanics/interpretation-grammar.md)` — mechanics link
- `[prototype 2026-05-21 model-behavior probe](prototypes/2026-05-21-model-behavior-probe.md)` — prototype link

Cross-references from mechanics entries to corpus entries are *expected and encouraged* — they're how game-claims ground themselves. Cross-references from corpus entries to mechanics entries are *unusual* — the corpus describes the world; mechanics describes the game. The audit script flags corpus → mechanics links for review.

## Audit criteria

A wiki entry is shippable when:

- **Frontmatter is valid** — all required fields present, types correct, no unknown fields.
- **Sources resolve** — every entry in `sources:` or `grounded_in:` points to a file that exists.
- **For mechanics entries with `version`**: the version follows semantic versioning (major.minor.patch).
- **For mechanics entries that should be grounded**: the `grounded_in:` field is non-empty. The "should be grounded" determination is curated by the orchestrator; the audit script flags entries where the orchestrator has annotated "should-ground" and the field is empty.
- **For prototype files**: the `model` field is present and non-empty.
- **Index consistency**: every wiki entry is reachable from `wiki/index.md`; `wiki/index.md` contains no broken links.

The audit script (`scripts/wiki-audit.js`, inherited) runs all these checks. It's run:
- On every commit to the wiki (via git pre-commit hook or CI).
- Manually by the orchestrator as a sanity check.
- Before each Phase 1 ship criterion (roadmap Phase 1, item 4).

## Build pipeline

The parent project's `wiki-build.js` runs two LLM phases: propose structure, then write pages. Polycrisis uses this pipeline only for the corpus portion:

1. **Corpus build.** Given a manifest of seed source documents, the pipeline proposes concept/entity/theme/signal entries and writes them. This is the part that scales as new material is ingested.
2. **Mechanics authoring.** Mechanics entries are written by hand and committed directly. The orchestrator (or a designated author) drafts the entry, validates against the schema, runs the audit, and commits. No automated generation — mechanics entries are too load-bearing for the case-study claim to be generated without human review.
3. **Prototype capture.** When a probe is run, its output is filed into `wiki/prototypes/` with the appropriate frontmatter. The orchestrator's interpretation (what the probe revealed, what should change in the wiki or grammar as a result) is committed alongside.

The pipeline is staged:
- A new corpus entry first lands in `wiki/concepts/`, `wiki/entities/`, etc.
- The audit runs.
- If the entry's existence suggests a mechanics claim needs revision (e.g. a corpus entry contradicts an existing mechanics claim), the orchestrator files an update to the relevant mechanics entry and bumps its version.

## Where prototypes land (per Principle 4.5)

The `wiki/prototypes/` directory is the home for everything Principle 4.5 calls "prototype outputs." Concretely:

- **Probe runs** — the prompt sent to the model, the response received, and any context used.
- **Observed-model-behavior notes** — the orchestrator's interpretation of what the probe revealed. These are themselves citable: a future orchestrator reading the wiki can trace what the project learned about model behavior at a given moment.
- **Script snapshots** — when a probe is reproducible, the script that produced the probe is filed alongside. This makes probes runnable, comparable, and revisable.

The wiki log records prototype filings as a separate category. The log entry notes: which probe was run, what it tested, what it revealed, and whether it triggered a wiki or grammar update.

## What this plan does NOT specify

These are deliberately deferred — either because they belong to a later phase, or because they're decisions the next spec should make:

- **State model spec.** Lives at `wiki/mechanics/state-axes.md`. The schema above accommodates it; the content is for the state model spec to determine.
- **Interpretation grammar spec.** Lives at `wiki/mechanics/interpretation-grammar.md`. Same.
- **Crisis anatomy.** A set of `wiki/mechanics/crisis-*.md` entries plus a top-level `wiki/mechanics/crisis-anatomy.md`. Decided by the crisis anatomy spec.
- **Advisor prompt templates.** Five entries, one per voice, in `wiki/mechanics/advisors/`. Decided by the advisor prompts spec.
- **Artifact template.** Lives at `wiki/mechanics/artifact-template.md`. Decided by the shareable artifact spec.
- **The actual seed content.** Which concepts/entities/themes/signals get seeded for MVP-0. Decided during Phase 1 build, not here.

## Sources for this document

- The spine documents (`00-vision.md` through `04-roadmap.md`) — what the wiki must be and how it gets built.
- The design principles (`02-design-principles.md`) — especially Principles 1.1, 1.2, 2.1, 2.2, 2.3, 4.5.
- The parent Metaviews wiki structure (`../metaviews-website/wiki/`) and the parent's wiki scripts (`../metaviews-website/scripts/wiki-*.js`) — the inherited patterns and the inheritance map.
