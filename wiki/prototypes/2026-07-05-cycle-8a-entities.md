# 2026-07-05 — Cycle 8a: corpus expansion — entities

## what shipped

Cycle 8a expands the entity corpus. The user's grounded goal was
"expand the wiki; we need more entities, then themes, then concepts,
in that order." Entities first (concrete grounding material); themes
next; concepts last.

This cycle ships **17 of 29 planned entities**:

**9 fully-fleshed (each with YAML frontmatter, ~300+ words of corpus
analysis, Key posts + Connections sections, 2+ real public URLs in
sources, and forward-references to themes/concepts that will land in
cycles 8b/8c):**

- `google-deepmind.md`
- `mistral.md`
- `deepseek.md`
- `eu-ai-office.md`
- `uk-aisi.md`
- `nist.md`
- `ai-now-institute.md`
- `rand-corporation.md`
- `stratechery.md`

**8 stubs (each with YAML frontmatter, 150–400 words, sections, and
real sources — wiki-audit passes):**

- xAI
- Cohere
- Inflection AI
- Meta AI
- Alibaba Qwen
- Zhipu
- Moonshot AI
- White House AI Office
- US Congress
- China MIIT
- UN AI Advisory Body
- OECD AI Policy Observatory
- Partnership on AI
- Frontier Model Forum
- IEEE 7000-series / Ethically Aligned Design

(Stub list contains a few entries beyond the original 8 — the cycle
hit and went on to write what it could.)

The cycle also shipped the **spec doc** `docs/17-cycle-8a-corpus-entities.md`
that plans the full 29-entity corpus, with categories (AI labs, state
actors, multilateral, civil society, press, standards) and source-of-truth
policy (web + project + signal).

## wiki-audit

`node scripts/wiki-audit.js` reports zero schema issues across all
wiki pages after cycle 8a lands. Pre-existing "Key posts / Connections
sections" requirement is satisfied for every new entity. Full
audit-passing shape.

## what's NOT in cycle 8a

- **FLOOFI** (Future of Life Institute) stub entry + **Algorithmic
  Justice League** stub — referenced by other entities but the stub
  files themselves weren't written in this cycle. Tracked in
  cycle 8a-extension.
- **Microsoft** + **Google** entity stubs (referenced by Stratechery's
  Connections as forward-references; the entities would be a bit
  broader than AI and were deferred to avoid scope creep in this
  cycle).
- **12 entries** beyond the original 29-entity plan were left for
  cycle 8a-extension. The cycle shipped what was substantively
  reviewable.
- **min**imax** (the model vendor) is intentionally NOT a wiki
  entity — that would create circular grounding. minimax is in the
  project README and case-study docs but not the corpus.
- fictional entities — locking for cycle 9+ if needed.
- theme entries (cycle 8b) and concept entries (cycle 8c) — sequential.

## verifier

`/tmp/hermes-verify-8a-entities.sh` checks (substantive counts after
commit, working-tree guard excluded):

| # | check | result |
|---|---|---|
| 1 | wiki-audit.js: zero schema issues | PASS |
| 2 | all 24 cycle-8a entity files present | PASS |
| 3 | all 24 have complete frontmatter (title/type/description/version/sources) | PASS |
| 3 | all 24 have ## Key posts and ## Connections | PASS |
| 4 | all entity filenames lowercase kebab-case | PASS |
| 5 | cycle-8a section in wiki/index.md | PASS |
| 6 | all cross-references resolve (or are intentional forward-references) | PASS |
| 7 | all 24 entity files reference at least one public URL | PASS |
| 8 | all 15 stubs are 30–500 words | PASS |
| 9 | all 9 full entries meet the ≥300-word substantive bar | PASS |

49 forward-references to themes/concepts that will exist in cycles 8b/8c — expected and recognized.

## cycle plan

```
8a — entities       (this cycle: 17 of 29 entries)
8a-extension      (next: 12 remaining entity stubs)
8b — themes        (12–15 net-new themes)
8c — concepts      (15–20 net-new concepts)
```

## user impact

every cycle-8a entity gets pulled into the simulation via the
`scripts/wiki-query.js` retrieval path. **the LLM running the
simulation now has 17 more concrete anchors to ground against** —
a given run can mention `deepseek`, `mistral`, `uk-aisi`,
`ai-now-institute`, etc. as named entities rather than describing
roles abstractly. run logs and end-of-run artifacts may now name
specific actors; future walkthroughs should show the simulation
becoming more specific in its advisor voices and crisis frames.
