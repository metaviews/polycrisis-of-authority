# Polycrisis Corpus — Cycle 8c: Concepts

## scope

This cycle ships the **concept** expansion under the corpus.
Concepts are the deepest layer of the corpus: they identify
abstract dynamics — the structural patterns that entities
participate in and themes pull on.

User grounded:

- 15-18 fully-fleshed concepts + 0-2 stubs
- 15-20 total entries
- maximum polish (no stubs this cycle)
- full focus on 8c; cycle-7 pendings deferred

## what shipped

- **18 concepts fully-fleshed** (no stubs) — each ~500-1000 words of
  corpus analysis, real public sources, forward-references to
  entities and themes
- **`wiki/index.md` updated** — 25 concepts total listed
- **`wiki-audit.js` clean** — zero schema issues

## entry list (18 concepts)

concepts are organized by what kind of abstract dynamic they
represent. each concept identifies a pattern that recurs across
entities and themes; concepts are not specific actors or
cross-entity patterns (those are entities and themes respectively).

### AI capability concepts (4)

1. **frontier-capability** — what constitutes a frontier model
   and where the frontier is; capability-tied obligations.
2. **capability-eval** — the science of evaluating AI capability;
   the procedural artifact that regulation, safety, and procurement
   all depend on.
3. **alignment** — the technical question of getting AI systems to
   do what their developers intend at scale.
4. **interpretability** — the technical question of understanding
   why AI systems produce the outputs they do.

### Risk and safety concepts (4)

5. **catastrophic-risk** — existential and societal-scale risks from
   advanced AI; the source of much of the safety discourse.
6. **misuse-and-double-use** — applications with both beneficial
   and harmful applications; the strategic question of access.
7. **dual-use-research** — research that produces capabilities with
   both civilian and military/illicit uses.
8. **robustness-and-distribution-shift** — model behavior outside
   the training distribution; the question of when deployed AI
   "fails."

### Economic concepts (3)

9. **labor-displacement** — what work AI replaces and what it
   augments; the structural question of substitution vs. augmentation.
10. **productivity-paradox** — the empirical puzzle that AI
    investments don't yet show large productivity gains.
11. **platform-economics** — multi-sided markets with winner-take-all
    dynamics; the structural question of where AI value is captured.

### Institutional and political concepts (3)

12. **regulatory-capture** — when regulators come to serve the
    regulated industry; the structural condition that undermines
    AI governance.
13. **procurement-power** — government's structural leverage through
    what it buys.
14. **epistemic-trust** — institutional mechanisms for trusting
    knowledge claims in an environment with abundant synthetic content.

### Data and infrastructure concepts (2)

15. **data-provenance** — origins, ownership, and lineage of training
    data; the structural question of copyright, consent, and audit.
16. **compute-governance** — regulation through compute access
    (export controls, GPU licensing); the substrate of all
    intervention in frontier AI.

### Content concepts (2)

17. **content-provenance** — tracking the origin and authenticity
    of generated media; the technical and policy response to
    synthetic media.
18. **model-collapse** — degradation that occurs from training AI
    on AI-generated data; the recursive-content question.

## what's full vs stub

all 18 entries are full. this cycle ships no stubs (per the user's
grounding: maximum polish, slower). future cycles can deepen the
remaining concepts beyond 18.

## source-of-truth

locked at "web + project + signal" per cycles 8a/8b. each concept
entry's `sources` field references:

- 2-3 publicly verifiable URLs (academic papers, government reports,
  journalism, primary documents)
- 1-2 references to project wiki entries (concepts, entities, themes)
  for cross-linking
- 1 reference to a parent-project `signals/` entry where relevant

## forward-references

concepts reference entities and themes that already exist (or will
exist in cycle 8a-extension). the verifier accepts known forward-
references.

## what's NOT in cycle 8c

- **minimax** (model vendor) — intentionally NOT a wiki concept.
  the wiki is the corpus the model draws from; the model can't
  draw on itself.
- fictional concepts — real-world anchoring locked at 8a.
- cycle 7-pendings (deploy-spec §8 update + walkthrough-feedback
  prototype doc + 7-* cycle triage) — deferred per user; pick up
  later.
- cycle 8a-extension (12 remaining entity stubs) — deferred
  per user.

## verification

`/tmp/hermes-verify-8c-concepts.sh` covers:

1. `wiki-audit.js` reports zero schema issues
2. all 18 concept files have valid frontmatter
3. all 18 have `## Key posts`, `## Connections` sections
4. all 18 reference at least 1 publicly verifiable URL
5. all 18 meet the substantive length bar (~500+ words)
6. cross-references resolve to real entries
7. `wiki/index.md` lists all concepts (7 pre-existing + 18 new = 25)
8. file names are lowercase kebab-case

## cycle plan

```
8a — entities      (commit 3fd6144, 17 of 29; 8a-extension deferred)
8b — themes        (commit 084771d, 12 themes fully-fleshed)
8c — concepts      (this cycle: 18 concepts fully-fleshed)
```

