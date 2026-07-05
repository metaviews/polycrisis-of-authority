---
title: Capability Evaluation
description: The science of evaluating AI model capability; the operational practice of pre-deployment testing, behavioral red-teaming, and the procedural artifacts that regulation, safety, and procurement all depend on.
type: concept
version: '1.0'
last_updated: '2026-07-05'
grounded_in:
  - wiki/entities/uk-aisi.md
  - wiki/entities/anthropic.md
  - wiki/entities/stratechery.md
sources:
  - https://www.aisi.gov.uk/
  - https://arxiv.org/abs/2107.14082
  - wiki/concepts/frontier-capability.md
related_concepts:
  - frontier-capability
  - alignment
related_entities:
  - uk-aisi
  - nist
  - anthropic
  - openai
  - google-deepmind
  - partnership-on-ai
related_themes:
  - voluntary-framework-vs-binding-regulation
  - transparency-and-auditability
  - compute-as-geopolitics
---

# Capability Evaluation

Capability evaluation is the science and operational practice of measuring what AI models can and cannot do. The discipline emerged in the early 2020s as a response to the difficulty of reasoning about AI system behavior through general claims alone; the operational practice shifted dramatically in 2023-2025 as model capability advanced faster than evaluation methodology could keep up.

The current practice falls into three pillars. First, **benchmark evaluations** — standardized tests (MMLU, GPQA, SWE-bench, HumanEval, ARC-AGI, BIG-bench, FrontierEval, others) that produce numeric scores and trend curves. Benchmarks are necessary but insufficient — they get saturated, they can be trained against, they capture some of capability but not the operational question of "what does this model actually do in deployment." Second, **red-teaming** — structured adversarial testing, where humans and increasingly other AI models probe the system for failure modes, unintended behaviors, and capability emergence. Third, **pre-deployment evaluations** — voluntary operational practice, exemplified by the UK AISI's frontier-model evaluations, where the developer grants an evaluator access to the model before deployment.

Capability evaluation is the procedural artifact that all other AI policy infrastructure depends on. Regulation without capability evaluation is theater (you can require "AI systems must be safe" without a meaningful way to evaluate safety). Procurement without capability evaluation is also theater (you can specify "AI must be safe" without a way to evaluate the relevant vendors). Safety work without capability evaluation is similarly hollow (you can describe alignment techniques without knowing whether they are sufficient for the capability level of the deployed model).

The substantive constraint is that capability evaluation is, in 2025-2026, partial. Benchmark evaluations get saturated; red-teaming is bounded by the practical limits of human probing; pre-deployment evaluations require voluntary access. The community's response has been to layer (combine benchmark scores with red-team findings with pre-deployment reports), to expand evaluation cadence (more frequent, broader sample), and to develop structural evaluation methods (the interpretability work that targets the model internals).

In the Polycrisis corpus, this concept provides the substantive reference for simulation frames that involve evaluation. Crisis frames that invoke evaluation results (a model fails benchmark X, a system scores Y on capability test Z) can be grounded against this concept. Advisor voices framed as evaluators (a UK AISI evaluator, a third-party red team lead, a frontier-model evaluation researcher) can be grounded here.

## Connections

This concept is connected to:

- `frontier-capability` (the capability frontier defines what evaluation must measure)
- `alignment` (alignment work targets models with capability above specific thresholds)
- `transparency-and-auditability` (the operational transparency of evaluation results)

Advisor voices framed as evaluators, and crisis frames involving evaluation findings, can be grounded here.

## Key references

- UK AI Safety Institute operational materials.
- The Inspect framework for capability evaluations.
- Metaviews archive coverage of capability evaluation methodology.

## Key posts

This concept covers an abstract dynamic in the AI policy corpus. Specific post coverage is filed in the parent Metaviews archive under the corresponding tag; the corpus references on this entry are public sources (URLs in frontmatter `sources`). Future fleshing cycles will reference specific archive posts by number once the wiki-ingest pipeline ingests them under this tag.

## Related archive posts

This concept is the principal corpus anchor for an abstract dynamic. Future ingest cycles will surface specific Metaviews archive posts by number once the `wiki-ingest` pipeline runs against the parent archive.
