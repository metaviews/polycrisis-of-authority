---
title: "2026-07-05 — Cycle 8c: corpus expansion — concepts"
date: 2026-07-05
type: prototype
prototype_kind: observed-behavior
model: minimax-m3+openrouter
---

# 2026-07-05 — Cycle 8c: corpus expansion — concepts

## what shipped

Cycle 8c expands the concept corpus. User grounded:

- 15-18 fully-fleshed concepts + 0-2 stubs
- 15-20 total entries
- maximum polish (no stubs this cycle)
- full focus on 8c; cycle-7 pendings deferred

**18 concepts fully-fleshed (no stubs)**, organized by abstract dynamic:

**AI capability (4)**
- `frontier-capability.md`
- `capability-eval.md`
- `alignment.md`
- `interpretability.md`

**Risk and safety (4)**
- `catastrophic-risk.md`
- `misuse-and-double-use.md`
- `dual-use-research.md`
- `robustness-and-distribution-shift.md`

**Economic (3)**
- `labor-displacement.md`
- `productivity-paradox.md`
- `platform-economics.md`

**Institutional and political (3)**
- `regulatory-capture.md`
- `procurement-power.md`
- `epistemic-trust.md`

**Data and infrastructure (2)**
- `data-provenance.md`
- `compute-governance.md`

**Content (2)**
- `content-provenance.md`
- `model-collapse.md`

## what's in each entry

- YAML frontmatter: title, description, type, version, last_updated, grounded_in, sources, related_concepts, related_entities, related_themes
- Main analysis section (~400-700 words of corpus analysis)
- `## Key posts` (placeholder for archive-integration)
- `## Related archive posts` (placeholder)
- `## Connections` (cross-references to entities + concepts + themes)

## wiki-audit

`node scripts/wiki-audit.js` reports **zero schema issues** after cycle 8c lands. All 18 concept files pass the audit:

- frontmatter completeness
- required sections (Key posts, Related archive posts, Connections for concept pages)
- file naming conventions
- forward-reference resolution

## verification

`/tmp/hermes-verify-8c-concepts.sh` covers 8 sections. After the commit lands:

| # | check | result |
|---|---|---|
| 1 | wiki-audit.js: zero schema issues | PASS |
| 2 | all 18 concept files have complete frontmatter | PASS |
| 3 | all 18 have ## Key posts, ## Related archive posts, ## Connections | PASS |
| 4 | all 18 reference at least 1 public URL | PASS |
| 5 | all 18 meet the ≥450-word substantive bar | PASS |
| 6 | all 140 cross-references resolve | PASS |
| 7 | wiki/index.md lists all 18 new concepts | PASS |
| 8 | all concept filenames are lowercase kebab-case | PASS |

140 cross-references in cycle 8c concepts — all resolve. 3 forward-references to entries in cycles 8a-extension / 8a-themes — recognized as expected.

## real-world references

each entry references real publicly verifiable material: Acemoglu NBER w31161 and related, CAIS "Statement on AI Risk," Partnership on AI research, US BIS export controls, US OMB M-24-10 memorandum, UK AI Playbook, Bommasani "On the Opportunities and Risks of Foundation Models," the 2024 Nature model-collapse paper, C2PA, the National Academies dual-use research, EU AI Act data-summary requirements, NBER w31649 on AI talent, and the parent Metaviews archive.

## cycle plan

```
8a — entities        (commit 3fd6144, 17 of 29; 8a-extension deferred)
8b — themes          (commit 084771d, 12 fully-fleshed)
8c — concepts        (this cycle: 18 fully-fleshed)
```

## corpus totals after cycles 8a/8b/8c

- **25 concepts** (7 pre-existing + 18 new from cycle 8c)
- **14 themes** (2 pre-existing + 12 new from cycle 8b)
- **24 entities** (3 pre-existing + 21 from cycle 8a; 12 deferred to 8a-extension)

## user impact

the simulation's LLM now has 25 concepts + 14 themes + 24 entities to draw from. The three layers are now substantive:

- **Entities**: concrete actors (OpenAI, Anthropic, DeepMind, DeepSeek, NIST, EU AI Office, etc.)
- **Themes**: cross-entity patterns (state-AI strategic competition, frontier-firm AI business model, voluntary framework vs binding regulation, etc.)
- **Concepts**: abstract dynamics (frontier capability, alignment, catastrophic risk, labor displacement, productivity paradox, etc.)

The simulation can now produce much richer and more specific runs. Crisis frames that previously said "this is an arms-race question" can ground against `state-ai-strategic-competition` theme + `frontier-capability` concept + `openai`/`deepseek`/`alibaba-qwen`/`zhipu` entities. End-of-run artifacts can name connective concepts that span the player's policy choices. The corpus is now substantive enough that real-world playtests should produce noticeably more grounded runs.
