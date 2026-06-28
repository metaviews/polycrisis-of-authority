# Wiki Schema

_Defines the structure of wiki entries. Read by the inherited `wiki-audit.js` script (extended for our entry types). Per the wiki structure plan (`docs/05-wiki-structure.md`)._

## Page classes

- concepts/ — corpus concept entries distilled from source material
- entities/ — corpus entity entries (organizations, figures, technologies)
- themes/ — corpus theme entries (longitudinal syntheses)
- signals/ — filed Pressure Systems editions from the parent Metaviews project
- mechanics/ — game-claim entries (Polycrisis-specific; distinct from corpus)
- prototypes/ — prototype outputs and observed-model-behavior notes (per Principle 4.5)

## Controlled page types

- concept
- entity
- theme
- signal
- mechanic
- prototype

## Required frontmatter

All wiki pages must include YAML frontmatter at the top. The required fields depend on page type.

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

Each page type has required `## Section` headings (case-insensitive).

### Concept, entity, theme pages

- `## In the <type> archive` — narrative summary grounded in sources
- `## Key posts` — bulleted list of source posts with dates
- `## Connections` — bulleted list of related concepts/entities/themes/signals

### Signal pages

- `## Synthesis` — synthesis of monitored items
- `## Monitored items` — bulleted list of items with title, link, source, date, score, excerpt

### Mechanic pages

- `## <Mechanic name>` — primary content (the game-claim itself)
- `## Sources` — corpus entries the mechanic references (per `grounded_in`)
- `## Version history` — record of version bumps with reasons

### Prototype pages

- `## Probe` or `## Observation` — what was tested/observed
- `## Prompt` — the prompt sent (or path to prompt file)
- `## Output` — the model output (or path to output file)
- `## Interpretation` — orchestrator's reading of what this revealed
