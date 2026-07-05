# 2026-07-05 — Cycle 8b: corpus expansion — themes

## what shipped

Cycle 8b expands the theme corpus. User grounded:

- 10-12 fully-fleshed themes + 0-2 stubs
- 12-14 total entries
- maximum polish (no stubs this cycle)

**12 themes fully-fleshed (no stubs)**, organized by connective axis:

**Power & institutions (4)**
- `state-ai-strategic-competition.md`
- `compute-as-geopolitics.md`
- `labor-displacement-and-class.md`
- `ai-in-procurement-state-power.md`

**Governance & law (3)**
- `voluntary-framework-vs-binding-regulation.md`
- `international-coordination-failure-and-recovery.md`
- `transparency-and-auditability.md`

**Economic & platform (3)**
- `frontier-firm-ai-business-model.md`
- `open-weights-and-distribution.md`
- `synthetic-media-and-information-environment.md`

**Civil society & culture (2)**
- `civil-society-accountability-infrastructure.md`
- `talent-concentration-and-labor-conditions.md`

## what's in each entry

- YAML frontmatter: title, description, type, version, last_updated, grounded_in, sources, related_concepts, related_entities, related_themes
- `## In the [topic] corpus` (corpus analysis, ~300-500 words)
- `## Key posts` (placeholder for archive-integration; cycle-8c will fill in if we extend the wiki-ingest pipeline)
- `## Related archive posts` (placeholder)
- `## Connections` (cross-references to entities + concepts + themes)
- `## Key references` (the public sources listed in frontmatter, summarized for the reader)
- 500+ words of substantive corpus analysis per entry

## wiki-audit

`node scripts/wiki-audit.js` reports **zero schema issues** after cycle 8b lands. The audit script verifies:

- frontmatter completeness
- required sections (Key posts, Related archive posts, Connections for theme pages)
- file naming conventions
- forward-reference resolution (via the new `## Related archive posts` section)

## verification

`/tmp/hermes-verify-8b-themes.sh` covers 8 sections. After the commit lands:

| # | check | result |
|---|---|---|
| 1 | wiki-audit.js: zero schema issues | PASS |
| 2 | all 12 theme files have complete frontmatter (title/type/description/sources) | PASS |
| 3 | all 12 have ## Key posts, ## Related archive posts, ## Connections | PASS |
| 4 | all 12 reference at least 1 public URL | PASS |
| 5 | all 12 meet the ≥500-word substantive bar | PASS |
| 6 | all 131 cross-references resolve (or are recognized forward-references) | PASS |
| 7 | wiki/index.md lists all 12 new themes | PASS |
| 8 | all theme filenames are lowercase kebab-case | PASS |

27 forward-references to entries that will exist in cycles 8a-extension / 8c — recognized as expected. The substantive checks all pass cleanly.

## real-world references

each entry references real publicly verifiable material: NBER working papers, RAND analyses, IEA reports, CSIS analyses, NIST publications, EU AI Act text, OECD AI Principles, C2PA content-provenance standards, IEEE 7000-series standards, Acemoglu's task-substitution work, AI Now's annual reports, NBER w31649 on AI talent concentration, Stratechery's frontier-firm analysis, and the parent Metaviews archive.

## cycle plan

```
8a — entities       (commit 3fd6144, 17 of 29)
8a-extension       (DEFERRED per user)
8b — themes         (this cycle: 12 themes fully-fleshed)
8c — concepts       (15-20 net-new concepts — next)
```

## user impact

the simulation now has 14 themes (2 pre-existing + 12 new) and 24 entities. Crisis frames that previously said "this is an arms-race question" can now specifically reference `state-ai-strategic-competition` or `compute-as-geopolitics`. Advisor voices can ground in `voluntary-framework-vs-binding-regulation` or `transparency-and-auditability`. End-of-run artifacts can name connective themes that span the player's policy choices.

Specifically, the simulation's `interpreter` (LLM) now has 14 thematic axes it can pull from to frame crisis, advisor, and narrative outputs. This should produce richer and more specific runs compared to the previous 2-theme corpus.
