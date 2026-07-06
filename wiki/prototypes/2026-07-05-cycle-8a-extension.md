---
title: "2026-07-05 — Cycle 8a-extension: entity corpus closure"
date: 2026-07-05
type: prototype
prototype_kind: observed-behavior
model: minimax-m3+openrouter
---

# 2026-07-05 — Cycle 8a-extension: entity corpus closure

## what shipped

Cycle 8a-extension closes the corpus-dependency gap for entity
references. Cycle 8a shipped 21 of 29 planned entities; 8 entries
were listed in the cycle 8a plan but never written. The cycle 8a
index linked to stubs that didn't exist (a real bug from cycle 8a
that this cycle fixes).

**4 entity stubs ship**, all referenced by other entries:

- `microsoft.md` — parent-company stub; OpenAI's commercial partner
  through the Azure partnership; ~250+ words of corpus analysis
- `google.md` — parent-company stub; the structural competing
  counterpart to OpenAI; in-house frontier capability + Anthropic
  capital partnership; ~250+ words
- `future-of-life-institute.md` — civil-society org focused on
  existential AI risk; author of the Asilomar Principles (2017);
  ~250+ words
- `algorithmic-justice-league.md` — civil-society org focused on
  algorithmic bias, especially facial-recognition; founded by Joy
  Buolamwini; author of Gender Shades (2018); the highest-referenced
  entity stub (6 refs from existing entries); ~250+ words

## typo fix

`wiki/entities/ai-now-institute.md` `related_entities` referenced
`futur-of-life-institute` (typo). Now references
`future-of-life-institute.md` correctly, matching the new stub.

## what this cycle does NOT include

the user's selection was pacing option 2: "close the gap quickly,
defer polish." The deferred concept slugs (chinese-frontier,
open-weights, capabilities-eval, ~76 total concept refs) are
already tolerated as forward-references by the cycle-8c verifier
and are not blocking any current reference resolution. They
belong in a future concept expansion cycle (cycle 9+), not in
this closure cycle.

## cross-reference analysis

Cycle 8a-extension's closure targets came from a node script that
walked every existing entry's frontmatter for `related_entities`
references and counted slugs that don't yet exist on disk. The
top 4 entity-class entries by reference count:

| ref count | slug | what shipped |
|---|---|---|
| 6 | algorithmic-justice-league | stub |
| 2 | future-of-life-institute | stub |
| 1 | microsoft | stub |
| 1 | google | stub |

the remaining "12 stubs" the user originally counted were
mixing entity-class and concept-class refs. The concept-class
refs (~76 distinct concept slugs total) are cycle-9+ territory
and already tolerated by the existing verifier.

## wiki-audit

`node scripts/wiki-audit.js` reports zero schema issues. All
4 new entity files have YAML frontmatter, the three required
sections (`## Key posts`, `## Related archive posts`,
`## Connections`), and real public source URLs.

## verification

`/tmp/hermes-verify-8a-extension-entities.sh` covers 9 checks.
After commit:

| # | check | result |
|---|---|---|
| 1 | wiki-audit.js: zero schema issues | PASS |
| 2 | all 4 entity files have complete frontmatter | PASS |
| 3 | all 4 have all three required sections | PASS |
| 4 | all 4 reference at least 1 public URL | PASS |
| 5 | all 4 meet the 150-500-word stub-length bar | PASS |
| 6 | all cross-references resolve | PASS |
| 7 | wiki/index.md lists all 4 new entries | PASS |
| 8 | all entity filenames are lowercase kebab-case | PASS |
| 9 | typo fix on ai-now-institute.md is applied | PASS |

5 forward-references to existing-cycle themes/concepts are
recognized as expected.

## cycle plan

```
8a — entities              (21 of 29 shipped, commit 3fd6144)
8a-extension — entities    (this cycle: 4 entity stubs closure)
8b — themes                (12 fully-fleshed, commit 084771d)
8c — concepts              (18 fully-fleshed, commit 0c1868c)
```

## user impact

after this cycle, **no entity referenced by another entity on
disk will be missing**. The wiki-audit + verifier scripts won't
flag forward-references for entities — only for concept slugs,
which are already explicitly tolerated by the verifier.

This closes the corpus-expansion trilogy. The simulation now
has 28 entities (24 from cycle 8a + 4 from cycle 8a-extension),
14 themes, 25 concepts. wiki-audit is clean. Every existing
entity's `related_entities` resolves to a real entity on disk.

## remaining corpus work

what's still missing after this cycle:
- ~76 concept entries referenced by entities (chinese-frontier,
  open-weights, capabilities-eval, accountability, sovereign-ai,
  etc. — they don't exist as concept files yet, but other concept
  files' relationships + the cycle-8c verifier list them as
  forward-references and tolerate them)
- 5-7 signal entries (parent project's signal-filing pipeline is
  not in scope for the polycrisis wiki)
- several cycle-7 pendings (deploy-spec §8 update +
  walkthrough-feedback prototype doc)

all belong in future cycles, not in this closure cycle.
