# Polycrisis Wiki Schema

_Defines the structure of wiki entries. Read by `scripts/wiki-audit.js`. Per the wiki structure plan (`docs/05-wiki-structure.md`)._

The Polycrisis wiki inherits the Metaviews project's wiki conventions for corpus entries (`concepts/`, `entities/`, `themes/`, `signals/`) and adds two new entry types (`mechanics/`, `prototypes/`) for game-claim documentation and prototype outputs respectively.

## Domain

This wiki is the knowledge layer for the Polycrisis simulation game. It compiles curated corpus material from the parent Metaviews archive and Polycrisis-specific game-claim entries into durable, source-backed pages used for editorial memory, retrieval-grounded simulation, and case-study observability.

## Purpose

- Preserve durable AI-policy memory across runs.
- Make the interpretation grammar's wiki retrieval grounded in source material, not the model's prior.
- Keep the case-study claim (model behavior is observable) auditable through source paths and citations.
- Support prototype outputs (Principle 4.5) with a permanent home.

## Page classes

- concepts/ — corpus concept entries distilled from source material
- entities/ — corpus entity entries (organizations, figures, technologies)
- themes/ — corpus theme entries (longitudinal syntheses)
- signals/ — filed Pressure Systems editions from the parent Metaviews project
- mechanics/ — game-claim entries (Polycrisis-specific; distinct from corpus)
- prototypes/ — prototype outputs and observed-model-behavior notes (per Principle 4.5)
- proposals/ — wiki-ingest queue (per `scripts/wiki-ingest.js`, Cycle 4a). Files here have `status: pending | accepted | rejected` and are reviewed by the orchestrator before being committed into concepts/, entities/, themes/, or signals/.

## Controlled page types

- concept
- entity
- theme
- signal
- mechanic
- prototype

## Required frontmatter

All wiki pages must include YAML frontmatter at the top. Required fields depend on page type.

### Corpus entries (concept, entity, theme)

- `title` (string)
- `description` (string, fits in `wiki/index.md`)
- `type` (one of: `concept`, `entity`, `theme`)
- `sources` (list of paths or URLs)

### Signal entries

- `title`
- `description`
- `type: signal`
- `date` (YYYY-MM-DD)
- `sources`

### Mechanic entries (game-claims)

- `title`
- `description`
- `type: mechanic`
- `version` (semantic version of this game-claim)
- `last_updated` (YYYY-MM-DD)
- `grounded_in` (optional: corpus entries this claim draws from)
- `contradicts` (optional: corpus entries this claim is in tension with)

### Prototype entries

- `title`
- `date` (YYYY-MM-DD)
- `type: prototype`
- `prototype_kind` (one of: `probe`, `observed-behavior`, `script-snapshot`)
- `model` (model identifier including version)

## Required page sections

These sections are required for concept, entity, and theme pages (when the page has enough source material to support them):

- Key posts
- Related archive posts
- Connections

(The parent project's wiki uses either "Related archive posts" or "Connections" — both are accepted as the linking-back section. The audit script's Polycrisis extension allows either.)

Mechanic pages use their own structure — see "Mechanic pages" below for per-type requirements. The audit script's shared required-sections list does not apply to mechanics; mechanics are validated manually by the orchestrator.

Signal pages use their own edition format and must include a source path back to the parent project.

## Conventions

- File names are lowercase kebab-case markdown files.
- `wiki/index.md` is the primary navigation map and must list every wiki page.
- `wiki/log.md` is append-only. Record major wiki maintenance actions there.
- Prefer deterministic maintenance scripts before LLM rewrites.
- The signal-filing check in `wiki-audit.js` reads from `../metaviews-website/src/signal/` (parent-owned). Local unfiled signals are informational, not a bug.

## Concept pages

Concept pages explain recurring analytic categories in the Polycrisis corpus. Inherited structure from parent project:

- `# Concept Name`
- `## In the Metaviews archive`
- `## Key posts`
- `## Related archive posts`

## Entity pages

Entity pages track people, institutions, companies, states, platforms, and infrastructure actors:

- `# Entity Name`
- `## In the Metaviews archive`
- `## Key posts`
- `## Related archive posts`

## Theme pages

Theme pages synthesize patterns that cut across many concepts and entities:

- `# Theme Name`
- `## In the Metaviews archive`
- `## Key posts`
- `## Connections`

Themes use `## Connections` instead of `## Related archive posts` (parent convention).

## Signal pages

Signal pages file published Pressure Systems editions into the wiki:

- title heading
- source path back to parent project
- date
- synthesis/summary
- monitored/source items

## Mechanic pages

Mechanic pages document game-claims. They are distinct from corpus entries per Principle 2.3:

- `# Mechanic name`
- `## <Mechanic name>` — primary content
- `## Sources` — corpus entries the mechanic references
- `## Version history` — record of version bumps

## Prototype pages

Prototype pages record operational observations per Principle 4.5:

- `# Prototype title`
- `## Observation` — what was tested/observed
- `## Probe` — the prompt sent or path to prompt file
- `## Output` — the model output or path to output file
- `## Interpretation` — orchestrator's reading

## Source policy

- Use parent project source paths for auditability: `../metaviews-website/src/intelligence/archive/...`
- Use parent project wiki paths for corpus citations: `concepts/[name].md`, `entities/[name].md`, etc.
- Do not invent citations or backfill sources by guesswork.
- Prefer source-path sections over decorative prose citations.

## Audit policy

Run `node scripts/wiki-audit.js --output docs/wiki-quality-audit.md` after:

- full wiki rebuilds
- signal filing
- source-reference enrichment
- manual wiki page edits
- adding or changing schema conventions

The audit surfaces missing indexed pages, orphaned pages, broken local links, unfiled Pressure Systems editions, weak source/reference coverage, short pages, and schema violations.

## Quality thresholds

- No missing indexed pages.
- No orphaned wiki pages.
- No short pages under 250 words (with exceptions for index/log/SCHEMA).
- Pages should have explicit source/reference sections when possible.

## Anti-patterns

- Public query bars or public query layers before retrieval is reliable.
- LLM rewrites that erase source paths.
- Creating new wiki pages for passing mentions.
- Treating Pressure Systems filing as synthesis. Filing makes editions retrievable; synthesis remains a separate step.
