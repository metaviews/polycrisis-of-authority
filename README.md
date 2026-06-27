# Polycrisis of Authority

A simulation game where you begin already in power and must govern through a constant stream of overlapping crises, responding with policies written in your own words. The world speaks back through fragmented, unreliable signals while deeper conditions shift out of sight. There is no victory, only duration.

## Project status

**Pre-design phase.** Spec and design documents live in `docs/`. Source corpus and seed material live in `corpus/`. Nothing is built yet.

This project is being designed deliberately, not assembled quickly. The wiki, the grammar, the state model, the crisis anatomy, and the shareable artifact are being specified against the curated Metaviews corpus as ground truth, with the LLM as a documented and swappable component of the system.

## Relationship to other projects

- **`../metaviews-website/`** — The parent intelligence practice. Polycrisis draws on the Metaviews archive as the seed corpus for its wiki. The wiki is *not* the same as Metaviews' own wiki; it is a specialized downstream consumer with its own curation logic.
- **`../openflows/`** — Adjacent project; may share infrastructure patterns (Fastify admin server, HTMX UI) but is a separate system with separate goals.

## Structure

```
docs/          Design and specification documents
corpus/        Seed material — curated Metaviews posts, signals, wiki entries
wiki/          (Future) The Polycrisis LLM-wiki, organized for gameplay
scripts/       (Future) Build, ingestion, and evaluation scripts
src/           (Future) The game itself
```

## Naming and tone

Austere, archival, operational. Mono for chrome, serif for prose. No decorative AI styling. The aesthetic should feel like an intelligence desk under pressure, not a SaaS product. See `docs/DESIGN.md` (forthcoming) for the visual and editorial principles.

## License

To be determined before first public commit. Default posture: code under MIT or Apache 2.0; content (corpus selections, wiki entries, the shareable artifact template) under CC BY-NC-SA 4.0 pending orchestrator review.
