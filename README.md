# Polycrisis of Authority

A simulation game where you begin already in power and must govern through a constant stream of overlapping crises, responding with policies written in your own words. The world speaks back through fragmented, unreliable signals while deeper conditions shift out of sight. There is no victory, only duration.

## Project status

**Phase 1 complete. Phase 2 starting.** The doc spine, design specs, wiki infrastructure, and retrieval are in place. Next phase: building the interpretation grammar and running test cases against a real model.

The project is being built deliberately, not assembled quickly. The wiki, the grammar, the state model, the crisis anatomy, and the shareable artifact are being specified against the curated Metaviews corpus as ground truth, with the LLM as a documented and swappable component of the system.

## Setup

The project requires Node.js (≥18) and an OpenRouter API key. To set up locally:

```bash
# Clone the repo (the parent Metaviews project must also be accessible
# at ../metaviews-website/ for the wiki retrieval pattern):
git clone https://github.com/metaviews/polycrisis-of-authority.git
cd polycrisis-of-authority

# Copy the env template and add your OpenRouter key:
cp .env.example .env
# Edit .env to set OPENROUTER_API_KEY

# Verify the wiki is in shape:
node scripts/wiki-audit.js

# Try a dry-run query against the wiki:
node scripts/wiki-query.js --dry-run "How does algorithmic authority erode?"
```

The wiki retrieval is grounded in the parent Metaviews archive. If you want to point this project at a different corpus, edit `wiki/` directly (corpus entries are markdown files with frontmatter).

## Structure

```
docs/          Design and specification documents (12 files)
  00-vision.md             Root — purpose, framing, MVP-0 scope (read first)
  01-corpus-synthesis.md   What the Metaviews archive gives us
  02-design-principles.md  16 principles, 4 parts
  03-orchestrator-role.md  Six recurring activities, operational texture
  04-roadmap.md            MVP-0 build order, deferred items
  05-wiki-structure.md     Wiki directory layout, entry schemas
  06-state-model.md        Six state axes with hidden values, visible signals, thresholds
  07-interpretation-grammar.md  Central mechanism: prompt structure, output schema, test cases
  08-crisis-anatomy.md     Eight crises, four failure patterns
  09-artifact-template.md  Eight sections, three jobs made concrete
  10-advisor-prompts.md    Five voices, describe-not-recommend mechanism
  11-openrouter-configuration.md  Model swap as case-study hook
wiki/           The Polycrisis LLM-wiki (26 entries, audited)
  concepts/      7 corpus concept entries
  entities/      3 corpus entity entries
  themes/        2 corpus theme entries
  signals/       10 filed Pressure Systems editions
  mechanics/     2 hand-authored game-claim entries (state model, grammar)
  prototypes/    3 prototype observations (per Principle 4.5)
  index.md       Catalog (fits in one context window)
  log.md         Append-only audit trail
  SCHEMA.md      Entry types and required sections
scripts/        Build, ingestion, and evaluation scripts
  wiki-audit.js          Quality audit (inherited, extended)
  wiki-query.js          Retrieval pattern (inherited, adapted)
  wiki-source-refs.js    Source-path enrichment (inherited)
  lib/openrouter.js      OpenRouter client wrapper
src/            (Future) The game itself
```

## Reading order for new contributors

1. `../metaviews-website/wiki/index.md` — the parent corpus catalog, fits in one context window.
2. `wiki/index.md` — the Polycrisis wiki catalog, fits in one context window.
3. `docs/00-vision.md` — the root document, lays out the project's two purposes, MVP-0 scope, and what is and isn't being claimed.
4. `docs/01-corpus-synthesis.md` — what the parent corpus gives us and what it doesn't.
5. `docs/02-design-principles.md` — the principles any design decision should respect.
6. `docs/03-orchestrator-role.md` — the ongoing work of tending the project.
7. `docs/04-roadmap.md` — what ships in MVP-0, what comes next.
8. The design specs (`docs/05-` through `docs/11-`) — the operational contracts for the simulation.

## Naming and tone

Austere, archival, operational. Mono for chrome, serif for prose. No decorative AI styling. The aesthetic should feel like an intelligence desk under pressure, not a SaaS product. The parent Metaviews project's design discipline (`../metaviews-website/DESIGN.md`) is inherited.

## License

To be determined before first public commit. Default posture: code under MIT or Apache 2.0; content (corpus selections, wiki entries, the shareable artifact template) under CC BY-NC-SA 4.0 pending orchestrator review.
