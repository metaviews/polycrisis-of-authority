---
title: Interpretability
description: The technical question of understanding why AI systems produce the outputs they do; the empirical work on mechanistic interpretability, the conceptual question of what "understanding" means for a foundation model.
type: concept
version: '1.0'
last_updated: '2026-07-05'
grounded_in:
  - wiki/entities/anthropic.md
  - wiki/entities/google-deepmind.md
  - wiki/themes/transparency-and-auditability.md
sources:
  - https://arxiv.org/abs/2107.14082
  - https://transformer-circuits.pub/
  - wiki/concepts/alignment.md
related_concepts:
  - alignment
  - capability-eval
related_entities:
  - anthropic
  - openai
  - google-deepmind
related_themes:
  - transparency-and-auditability
  - international-coordination-failure-and-recovery
---

# Interpretability

Interpretability in the AI corpus is the technical discipline of understanding what AI models do and why they do it. The work operates at two distinct levels. **Behavioral** interpretability (sometimes called "black-box" interpretability) probes the model through observation — what does it output on specific inputs, what does it reveal through interrogation, what does it do in edge cases. **Mechanistic** interpretability (sometimes called "white-box" or "circuits" work) targets the model's internals — what computations does the model perform, what features does it learn, what does it have representations of, and how do those combine to produce outputs.

The current state of mechanistic interpretability work is partial but substantive. Anthropic's published work on circuits (the "transformer-circuits" publication series and successor work) has demonstrated that some model behaviors can be traced to specific identified subnetworks; the work is methodologically distinctive — it requires producing models specifically engineered for tractable interpretability, not just inspecting production models. OpenAI's mechanistic interpretability group, Google's DeepMind interpretability work, and academic groups at MIT, Berkeley, and Anthropic are the principal research sites.

The conceptual question of what "understanding" means for a foundation model is genuinely hard. A foundation model has billions of parameters trained on data that itself is largely inspectable but whose influence on a specific computation is not. The mechanistic-interpretability work has shown that the model "learns features" — representations of concepts that show up as directions in the model's activation space — but the relationship between "the model has a representation of X" and "the model behaves as if it understands X" is subtle and contested. A behavioral interpretation (the model does X when prompted Y) is more accessible but less robust; a mechanistic interpretation (the model has feature F, F contributes to output) is more rigorous but harder to generalize.

In the Polycrisis corpus, this concept provides the substantive reference for simulation frames involving AI transparency and accountability. Crisis frames that involve "the AI did something and we don't know why" can be grounded against this concept. Advisor voices framed as mechanistic-interpretability researchers, third-party-model auditors, and AI accountability specialists can be grounded here.

The practical role of interpretability in AI safety is contested. Some researchers see mechanistic interpretability as the principal path to genuine AI safety, where others (notably alignment researchers focused on behavioral methods) see it as one of several complementary approaches. The simulation can be used to explore which scenarios favor which approaches.

## Connections

This concept is connected to:

- `alignment` (interpretability is one approach to inner alignment)
- `capability-eval` (interpretability complements behavioral evaluations)
- `transparency-and-auditability` (interpretability is a transparency instrument for AI systems)

It is referenced by advisor voices framed as mechanistic-interpretability researchers, third-party-model auditors, and accountability specialists.

## Key references

- The original mechanistic-interpretability foundational paper.
- The transformer-circuits publication archive.
- Metaviews archive coverage of the interpretability discourse.

## Key posts

This concept covers an abstract dynamic in the AI policy corpus. Specific post coverage is filed in the parent Metaviews archive under the corresponding tag; the corpus references on this entry are public sources (URLs in frontmatter `sources`). Future fleshing cycles will reference specific archive posts by number once the wiki-ingest pipeline ingests them under this tag.

## Related archive posts

This concept is the principal corpus anchor for an abstract dynamic. Future ingest cycles will surface specific Metaviews archive posts by number once the `wiki-ingest` pipeline runs against the parent archive.
