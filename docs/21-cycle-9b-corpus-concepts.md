---
title: Polycrisis Corpus — Cycle 9b: Concept Expansion (Forward-Reference Closure)
description: Closes the corpus-dependency gap for concept slugs. Cycle 8c shipped 18 concepts but left ~76 forward-references in entity + theme entries' Connections. This cycle ships 15-20 of the most-referenced concept entries as fully-fleshed pages; remaining 50+ foward-refs ship in cycle 9c.
type: mechanic
version: '1.0'
last_updated: '2026-07-05'
sources:
  - docs/19-cycle-8c-corpus-concepts.md
grounded_in:
  - wiki/themes/transparency-and-auditability.md
  - wiki/themes/open-weights-and-distribution.md
---

# Polycrisis Corpus — Cycle 9b: Concept Expansion (Forward-Reference Closure)

## scope

Cycle 9b ships 15-20 fully-fleshed concept entries — the top
forward-referenced concept-class slugs in the corpus. User
grounded:

- 15-20 fully-fleshed (cycle 8b pattern)
- 20 entries planned, drawn from the top of the forward-reference
  count sorted in cycle 9b's analysis

## what shipped

- **20 fully-fleshed concept entries** — each ~500-700 words of
  corpus analysis, real public sources, full cross-references to
  entities + concepts + themes
- **`wiki/index.md` updated** — 25 → 45 concepts total listed
- **`wiki-audit.js` clean** — zero schema issues
- **`/tmp/hermes-verify-9b-concepts.sh`** covers 8 substantive
  checks (same pattern as cycle 8c)

## entry list (20 concepts)

The top 20 by reference count (across all on-disk entries' front-
matter for `related_concepts`). Pre-existing related concepts
that the existing on-disk entries already point at.

**Tier 1 (ref count 4): 3 entries**

1. **chinese-frontier** (4 refs) — the structural concept of the
   Chinese AI capability frontier; the family of chinese-frontier
   labs collectively.
2. **open-weights** (4 refs) — the open-weight model release
   strategy as a structural concept; the open-weights-and-
   distribution theme references this concept in 4 places.
3. **platform-strategy** (4 refs) — Stratechery's framing of AI as
   a platform-shifting technology with structural dynamics.

**Tier 2 (ref count 3): 3 entries**

4. **accountability** (3 refs) — substantive (not procedural)
   accountability for AI systems; AI Now's principal concept.
5. **transparency** (3 refs) — algorithmic transparency as a
   substantive (not procedural) requirement; the transparency-and-
   auditability theme references this across multiple entries.
6. **capabilities-eval** (3 refs) — the science of evaluating AI
   capability; foundational concept for the eval-and-monitoring
   discourse.

**Tier 3 (ref count 2): 3 entries**

7. **algorithmic-bias** (2 refs) — measurement and mitigation of
   bias in AI systems; principal concept for the AJL's work.
8. **sovereign-ai** (2 refs) — the structural concept of
   jurisdictional AI independence from foreign-vendor lock-in.
9. **distribution-advantage** (2 refs) — the network-effect
   dynamic that compounds platform-scale benefits for incumbents.

**Tier 4 (ref count 1, top 11 by qualitative impact): 11 entries**

10. **infrastructure-critique** — the AI Now framing of
    infrastructure-level AI critique (energy, water, labor).
11. **ai-accountability-database** — the AI Now AI Accountability
    Database as a substantive corpus artifact.
12. **ai-services-registration** — the Chinese services-registration
    regulatory regime.
13. **state-regulation** — the broader category of state-level AI
    regulation.
14. **chinese-policy** — China's AI policy stance; MIIT + CAC.
15. **enterprise-deployment** — corporate AI deployment patterns.
16. **retrieval-models** — retrieval-augmented generation (RAG)
    and the retrieval-models enterprise-deployment pattern.
17. **cost-efficiency** — training-cost economics; the structural
    concept that DeepSeek's release reframed.
18. **moe-architecture** — mixture-of-experts architecture; the
    technical basis of cost-efficiency gains.
19. **ai-cold-war** — the geopolitical "AI Cold War" framing
    (now post-DeepSeek in 2026) and its policy implications.
20. **ai-act-enforcement** — EU AI Act's enforcement mechanisms
    beyond the binding text.

remaining 50+ forward-references (industry-coalition, ai-safety-
commitments, standards-body, agi-timelines, etc.) ship as
stubs in cycle 9c.

## what's full vs stub

all 20 entries are fully-fleshed. cycle 9b ships no stubs.

## source-of-truth

locked at "web + project + signal" per cycles 8a/8b/8c. each
entry's `sources` field references:

- 2-3 publicly verifiable URLs
- 1-2 references to project wiki entries (concepts, entities,
  themes) for cross-linking
- 1 reference to a parent-project `signals/` entry where relevant

## forward-references after cycle 9b

cycle 9b drops the forward-reference count from ~76 to ~51.

cycle 9c (concepts-stub-closure) ships the remaining 51 as
stubs (~150-300 words each). that's the canonical closure of
the corpus-expansion work.

## what's NOT in cycle 9b

- **remaining 50+ concept references** — forward-references to
  entries like industry-coalition, ai-safety-commitments, standards-body,
  agi-timelines, safety-policy. Cycle 9c (concept stubs) handles
  these.
- **cycle 7 pendings** — deploy-spec §8 update + walkthrough-
  feedback prototype doc + 7-* cycle triage. Still pending.
- **cycle 10** — signal-filing pipeline (per user). Cycle 9b
  happens first; cycle 10 follows the corpus-expansion trilogy.

## verification

`/tmp/hermes-verify-9b-concepts.sh` covers:

1. `wiki-audit.js` reports zero schema issues
2. all 20 concept files have valid frontmatter
3. all 20 have ## Key posts, ## Related archive posts, ## Connections sections
4. all 20 reference at least 1 publicly verifiable URL
5. all 20 meet the substantive length bar (≥500 words)
6. cross-references resolve
7. `wiki/index.md` lists all 45 concepts (25 pre-existing + 20 new)
8. file names are lowercase kebab-case

## cycle plan

```
8a / 8b / 8c / 8a-extension — corpus trilogy (shipped)
9a — discord run notifications
9b — concept forward-reference closure (this cycle)
9c — concept stubs closure (remaining 51)
10 — signal-filing pipeline (per user)
```

## user impact

after cycle 9b, **the highest-impact concept forward-references
resolve**. the simulation's LLM now has 45 concepts (25 from 8c
+ 20 from 9b) + 14 themes + 31 entities to ground against. runs
should be substantially more specific in their advisor voices
and crisis frames.
