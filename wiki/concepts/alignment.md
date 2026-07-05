---
title: Alignment
description: The technical question of getting AI systems to do what their developers intend at scale; the spectrum of alignment techniques from RLHF through constitutional AI to scalable oversight methods.
type: concept
version: '1.0'
last_updated: '2026-07-05'
grounded_in:
  - wiki/entities/anthropic.md
  - wiki/entities/openai.md
  - wiki/entities/google-deepmind.md
sources:
  - https://arxiv.org/abs/2203.02155
  - https://www.anthropic.com/news/core-views-on-ai-safety
  - wiki/concepts/capability-eval.md
related_concepts:
  - capability-eval
  - catastrophic-risk
  - interpretability
related_entities:
  - anthropic
  - openai
  - google-deepmind
  - partnership-on-ai
related_themes:
  - transparency-and-auditability
  - voluntary-framework-vs-binding-regulation
---

# Alignment

Alignment in the AI policy corpus refers to the technical question of ensuring that AI systems do what their developers intend, both at training time and at deployment. The concept is wider than the technical discipline — it encompasses the policy question of how to specify what "intent" means, the operational question of how to verify that intent is being fulfilled, and the engineering question of producing robust behaviors that scale with capability.

The current state of alignment techniques falls into several categories. **Reinforcement learning from human feedback (RLHF)** and variants (RLAIF, DPO) provide the dominant post-training approach used by OpenAI, Anthropic, and most frontier labs as of 2025-2026. **Constitutional AI** and related "principle-based" approaches provide a structured mechanism for specification. **Scalable oversight** methods (debate, weak-to-strong generalization, recursive reward modeling) target the question of how to ensure alignment holds as capability advances beyond human evaluation capacity. **Mechanistic interpretability** work attempts to understand model internals directly, rather than only measuring behavior.

The substantive alignment discourse is split across two distinct framings that have been merging over 2024-2026. The **outer alignment** question is "what should the model do" — the specification problem. The **inner alignment** question is "what does the model actually do, and does that correspond to the specification" — the robust-games problem. The frontier work targets both, but the public discourse is heavily weighted toward outer alignment (constitutional AI, RLHF) and toward the post-deployment behavior (red-teaming, evaluations). The mechanistic-interpretability strand is the principal candidate for a fuller inner-alignment answer.

In the Polycrisis corpus, this concept is the principal reference for "what safety means in technical terms." Crisis frames involving alignment failures (a deployed model behaves contrary to intent; a safety mechanism fails to constrain the model; a red-team finds an alignment gap) can be grounded here. Advisor voices framed as alignment researchers, AI safety researchers, and Frontier-Model-Forum safety leads can be grounded here.

The 2025-2026 alignment discourse has a notable structural feature: the policy conversation is catching up with the technical conversation. Early alignment work was almost entirely within frontier labs; the AI Now accountability discourse, the UK AISI evaluations, the EU AI Act's transparency provisions are all attempts to bring alignment work into the public regulatory conversation. The simulation can be used to explore which of these policy mechanisms actually closes the alignment gap in which scenarios.

## Connections

This concept is connected to:

- `capability-eval` (alignment work targets models at specific capability thresholds)
- `catastrophic-risk` (catastrophic-risk work is heavily focused on alignment failures at frontier capability)
- `interpretability` (interpretability work is one approach to inner alignment)

It is referenced by advisor voices framed as alignment researchers, safety researchers, and policy analysts.

## Key references

- The InstructGPT paper (2022, RLHF foundational work).
- Anthropic's published "Core Views on AI Safety."
- Metaviews archive coverage of the alignment discourse.

## Key posts

This concept covers an abstract dynamic in the AI policy corpus. Specific post coverage is filed in the parent Metaviews archive under the corresponding tag; the corpus references on this entry are public sources (URLs in frontmatter `sources`). Future fleshing cycles will reference specific archive posts by number once the wiki-ingest pipeline ingests them under this tag.

## Related archive posts

This concept is the principal corpus anchor for an abstract dynamic. Future ingest cycles will surface specific Metaviews archive posts by number once the `wiki-ingest` pipeline runs against the parent archive.
