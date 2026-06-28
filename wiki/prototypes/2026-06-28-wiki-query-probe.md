---
title: "Wiki query probe — retrieval works against populated wiki"
date: 2026-06-28
type: prototype
prototype_kind: probe
model: "n/a (retrieval only, no LLM call)"
---

## Observation

The inherited `wiki-query.js` (from `../metaviews-website/scripts/wiki-query.js/`) runs against the populated Polycrisis wiki and retrieves relevant pages for representative queries.

This probe validates that:

- The inherited script's `parseWikiIndex` regex matches our `wiki/index.md` format.
- The retrieval pattern (lexical scoring + durable-type boost) surfaces the right pages.
- The script's `--dry-run` mode works without requiring an OpenRouter API key.

The script was minimally adapted for Polycrisis: the OpenRouter client title and the answer-prompt system message were updated from "Metaviews" to "Polycrisis." No behavioral changes.

## Probe

Command run:

```bash
node scripts/wiki-query.js --dry-run "How does algorithmic authority erode?"
```

Result:

```
# Wiki query dry run

Question: How does algorithmic authority erode?

Selected pages:
- concepts/algorithmic-authority.md (Algorithmic Authority) score=9
- concepts/future-of-authority.md (Future of Authority) score=7
- concepts/algorithmic-transparency.md (Algorithmic Transparency) score=6
- concepts/cognitive-authority.md (Cognitive Authority) score=6
- signals/2026-05-04-materialization-of-algorithmic-authority.md (2026-05-04 — The Materialization of Algorithmic Authority) score=5
- themes/ai-and-digital-governance.md (AI and Digital Governance) score=5
```

Top 6 pages selected. The top hit is `concepts/algorithmic-authority.md` (the canonical entry), followed by `future-of-authority.md` and two related concept entries. A signal and a theme round out the top 6. All selections are relevant to the query.

Second probe with a narrower query:

```bash
node scripts/wiki-query.js --dry-run "compute capacity data centers UAE Anthropic"
```

Result:

```
Selected pages:
- entities/anthropic.md (Anthropic) score=5
- entities/openai-anthropic.md (OpenAI and Anthropic) score=5
- signals/2026-05-21-080902-spacex-data-center-ai-oligopoly.md (2026-05-21 — SpaceX's Data Center Gambit and the New AI Oligopoly) score=5
```

Three pages selected, all relevant. Entity entries for the labs and the data-center signal.

## Output

The retrieval runs in milliseconds against the populated wiki. The dry-run mode prints the selected pages with scores; the live mode (without `--dry-run`) would call OpenRouter to synthesize an answer.

## Interpretation

**The retrieval infrastructure works.** The inherited `wiki-query.js` script adapts cleanly to our wiki structure. The lexical scoring + durable-type boost pattern (concepts/themes +3, entities +2, signals -1) ensures that durable synthesis pages surface above filed signals for broad operator questions.

**Two minor Polycrisis-specific adaptations were made:**

1. The OpenRouter client title was changed from "Metaviews Wiki Query" to "Polycrisis Wiki Query" — a cosmetic change that helps with observability (the title appears in OpenRouter's request logs).

2. The answer-prompt system message was extended from "You are answering an internal Metaviews operator query using the llm-wiki." to "You are answering a Polycrisis project query using the llm-wiki. The wiki is grounded in the Metaviews archive of curated, dated, citable source material on AI policy and the politics of authority." — this names the project's relationship to the parent corpus.

**No behavioral changes** to the retrieval logic. The pattern is inherited as-is per the wiki structure plan.

**Implications for the grammar spec.** The grammar spec (`docs/07-interpretation-grammar.md`) describes wiki retrieval as a function of the simulation loop — retrieving relevant corpus entries to ground the player's policy interpretation. This probe confirms the underlying retrieval pattern works against our wiki structure. When Phase 2 build assembles the grammar's user prompt, it can call this script's retrieval function directly (or import its `rankPagesForQuestion` and `readSelectedPages` exports) rather than implementing retrieval from scratch.

**What's next.** Phase 1c is otherwise complete: `.env.example` committed, wiki-query working, OpenRouter client configured. The next phase is Phase 2 build: assembling the grammar's prompt and running test cases against a real model.

This prototype observation is filed per Principle 4.5 (Dancing with the Details in the Design). The retrieval infrastructure has been tested against the populated wiki, and the result confirms the wiki is ready to ground simulation runs.
