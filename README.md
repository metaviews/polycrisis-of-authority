# Polycrisis of Authority

A simulation game where you begin already in power and must govern through a constant stream of overlapping crises, responding with policies written in your own words. The world speaks back through fragmented, unreliable signals while deeper conditions shift out of sight. There is no victory, only duration.

## Project status

**Pre-design phase.** Spec and design documents live in `docs/`. Source corpus and seed material live in `corpus/`. Nothing is built yet.

This project is being designed deliberately, not assembled quickly. The wiki, the grammar, the state model, the crisis anatomy, and the shareable artifact are being specified against the curated Metaviews corpus as ground truth, with the LLM as a documented and swappable component of the system.

## Structure

```
docs/          Design and specification documents
  00-vision.md             Root — purpose, framing, MVP-0 scope (read first)
  01-corpus-synthesis.md   What the Metaviews archive gives us
  02-design-principles.md  15 principles, 4 parts
  03-orchestrator-role.md  Six recurring activities, operational texture
  04-roadmap.md            (forthcoming) MVP-0 build order, deferred items
corpus/        Seed material — curated Metaviews posts, signals, wiki entries
wiki/          (Future) The Polycrisis LLM-wiki, organized for gameplay
scripts/       (Future) Build, ingestion, and evaluation scripts
src/           (Future) The game itself
```

## Reading order for new contributors

1. `../metaviews-website/wiki/index.md` — the parent corpus catalog, fits in one context window.
2. `docs/00-vision.md` — the root document, lays out the project's two purposes, MVP-0 scope, and what is and isn't being claimed.
3. `docs/01-corpus-synthesis.md` — what the parent corpus gives us and what it doesn't.
4. `docs/02-design-principles.md` — the principles any design decision should respect.
5. `docs/03-orchestrator-role.md` — the ongoing work of tending the project.
6. `docs/04-roadmap.md` (forthcoming) — what ships in MVP-0, what comes next.

## Naming and tone

Austere, archival, operational. Mono for chrome, serif for prose. No decorative AI styling. The aesthetic should feel like an intelligence desk under pressure, not a SaaS product. See `docs/DESIGN.md` (forthcoming) for the visual and editorial principles.

## License

To be determined before first public commit. Default posture: code under MIT or Apache 2.0; content (corpus selections, wiki entries, the shareable artifact template) under CC BY-NC-SA 4.0 pending orchestrator review.
