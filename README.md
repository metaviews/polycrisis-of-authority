# Polycrisis of Authority

A simulation game where you begin already in power and must govern through a constant stream of overlapping crises, responding with policies written in your own words. The world speaks back through fragmented, unreliable signals while deeper conditions shift out of sight. There is no victory, only duration.

## Project status

**Phase 2 complete. Phase 3 starting.** The simulation engine is operational. A real-LLM session can be run end-to-end against MiniMax M3 (or any OpenRouter-supported model) and produces an 8-section shareable artifact. Next phase: player-experience UI and artifact distribution.

The project is being built deliberately, not assembled quickly. The wiki, the grammar, the state model, the crisis anatomy, and the shareable artifact are being specified against the curated Metaviews corpus as ground truth, with the LLM as a documented and swappable component of the system.

## What works

The simulation can be run end-to-end today:

1. **State model** — six axes (legitimacy, fiscal slack, elite alignment, ecological debt, narrative coherence, capability frontier) with named bands, hidden thresholds, three collapse modes.
2. **Crisis anatomy** — eight authored crises covering four failure patterns (upstream embedding, compute/capability escape, legitimacy-erosion cascade, memetic/narrative capture).
3. **Interpretation grammar** — real OpenRouter calls against MiniMax M3. Player free-text policy text is interpreted as state-vector deltas with interpretive gloss, narrative move, grounding trace, and confidence rating.
4. **Advisor cast** — five corpus-grounded voices (frontier-lab, civil-society, state-security, open-source, international-ally). Each describes how a represented position sees the crisis; none recommend actions.
5. **Run log + artifact** — every session produces a structured run log (YAML frontmatter + per-turn sections) and an 8-section shareable artifact (header, run summary, state trajectory, crisis log, interpretive chain, grounding references, collapse reveal, play invitation).

The four grammar test cases pass 10/13 expected-direction checks; the three failures are interpretive disagreements with documented rationales. See `wiki/prototypes/20260628222655-grammar-test-cases.md`.

A 9-turn end-to-end session produced a 270-line artifact. See `wiki/prototypes/2026-06-28-phase-2d-end-to-end.md` and the committed artifact at `wiki/prototypes/20260628223813-8jtf0r-artifact.md`.

## Setup

The project requires Node.js (≥18) and an OpenRouter API key.

```bash
# Clone the repo. The parent Metaviews project must be accessible at
# ../metaviews-website/ for the wiki retrieval pattern.
git clone https://github.com/metaviews/polycrisis-of-authority.git
cd polycrisis-of-authority

# Copy the env template and add your OpenRouter key + model.
cp .env.example .env
# Edit .env:
#   OPENROUTER_API_KEY=sk-or-v1-...
#   OPENROUTER_MODEL=minimax/minimax-m3   # default for the case study

# Verify the wiki is in shape:
node scripts/wiki-audit.js

# Try a dry-run query against the wiki (no API key needed):
node scripts/wiki-query.js --dry-run "How does algorithmic authority erode?"

# Run the grammar test cases (real LLM calls — uses API key):
node src/sim/test-cases.js

# Run a scripted end-to-end session and produce an artifact:
node src/sim/index-async.js --script scripts/player-script-default.txt --turns 9
# Output: runs/<run-id>.md (run log) and runs/<run-id>-artifact.md (artifact)
```

The wiki retrieval is grounded in the parent Metaviews archive. To point this project at a different corpus, edit `wiki/` directly (corpus entries are markdown files with frontmatter).

## Structure

```
docs/          Design and specification documents (12 files)
  00-vision.md             Root — purpose, framing, MVP-0 scope (read first)
  01-corpus-synthesis.md   What the Metaviews archive gives us
  02-design-principles.md  16 principles, 4 parts (incl. Principle 4.5 "Dancing with the Details")
  03-orchestrator-role.md  Six recurring activities, operational texture
  04-roadmap.md            MVP-0 build order, deferred items
  05-wiki-structure.md     Wiki directory layout, entry schemas
  06-state-model.md        Six state axes with hidden values, visible signals, thresholds
  07-interpretation-grammar.md  Central mechanism: prompt structure, output schema, test cases
  08-crisis-anatomy.md     Eight crises, four failure patterns
  09-artifact-template.md  Eight sections, three jobs made concrete
  10-advisor-prompts.md    Five voices, describe-not-recommend mechanism
  11-openrouter-configuration.md  Model swap as case-study hook

wiki/           The Polycrisis LLM-wiki (50 cataloged pages + 3 auto-generated artifacts)
  concepts/      7 corpus concept entries
  entities/      3 corpus entity entries
  themes/        2 corpus theme entries
  signals/       10 filed Pressure Systems editions
  mechanics/     6 root-level (state-axes, interpretation-grammar, collapse-modes,
                 crisis-anatomy, artifact-template, run-log-format)
  mechanics/crises/  8 crisis entries (2 per failure pattern)
  mechanics/advisors/  1 cast index + 5 voice entries
  prototypes/    6 hand-authored prototype observations + 3 auto-generated artifacts
  index.md       Catalog (fits in one context window)
  log.md         Append-only audit trail
  SCHEMA.md      Entry types and required sections

scripts/        Build, ingestion, and evaluation scripts
  wiki-audit.js          Quality audit (inherited, extended)
  wiki-query.js          Retrieval pattern (inherited, adapted)
  wiki-source-refs.js    Source-path enrichment (inherited)
  lib/openrouter.js      OpenRouter client wrapper
  player-script-default.txt  9-move player script for end-to-end runs

src/sim/        Simulation engine (Node.js)
  state.js                State vector, delta application, band computation, collapse detection
  crisis-generator.js     8-crisis deck, selection rule
  mock-llm.js             Hand-authored mock for 2b skeleton testing (superseded by grammar.js)
  grammar.js              Real grammar: OpenRouter call, JSON output, validation
  advisors.js             5 corpus-grounded advisor voices
  run.js                  Sync run loop (mock LLM, for skeleton testing)
  run-async.js            Async run loop (real grammar)
  artifact-generator.js   8-section artifact generator
  test-cases.js           4 grammar test cases harness
  index.js                Sync CLI entry point
  index-async.js          Async CLI entry point (the real-LLM runner)
```

## Reading order for new contributors

1. `../metaviews-website/wiki/index.md` — the parent corpus catalog, fits in one context window.
2. `wiki/index.md` — the Polycrisis wiki catalog, fits in one context window.
3. `docs/00-vision.md` — the root document, lays out the project's two purposes, MVP-0 scope, and what is and isn't being claimed.
4. `docs/01-corpus-synthesis.md` — what the parent corpus gives us and what it doesn't.
5. `docs/02-design-principles.md` — the principles any design decision should respect (16 principles across 4 parts).
6. `docs/03-orchestrator-role.md` — the ongoing work of tending the project.
7. `docs/04-roadmap.md` — what ships in MVP-0, what comes next.
8. The design specs (`docs/05-` through `docs/11-`) — the operational contracts for the simulation.
9. `src/sim/` — the engine code; small, well-commented, Node-native.
10. `wiki/prototypes/` — operational observations per Principle 4.5.

## Naming and tone

Austere, archival, operational. Mono for chrome, serif for prose. No decorative AI styling. The aesthetic should feel like an intelligence desk under pressure, not a SaaS product. The parent Metaviews project's design discipline (`../metaviews-website/DESIGN.md`) is inherited.

## License

To be determined before first public commit. Default posture: code under MIT or Apache 2.0; content (corpus selections, wiki entries, the shareable artifact template) under CC BY-NC-SA 4.0 pending orchestrator review.