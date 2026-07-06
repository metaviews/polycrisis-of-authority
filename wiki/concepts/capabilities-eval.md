---
title: Capabilities Evaluation
description: The science and operational practice of evaluating AI model capability — benchmark evaluations, red-teaming, pre-deployment evaluations, and the procedural artifacts that regulation, safety, and procurement all depend on.
type: concept
version: '1.0'
last_updated: '2026-07-05'
grounded_in:
  - wiki/entities/uk-aisi.md
  - wiki/concepts/capability-eval.md
  - wiki/themes/transparency-and-auditability.md
sources:
  - https://www.aisi.gov.uk/
  - https://arxiv.org/abs/2107.14082
  - https://transformer-circuits.pub/
related_concepts:
  - capability-eval
  - catastrophic-risk
  - alignment
related_entities:
  - uk-aisi
  - nist
  - anthropic
  - openai
related_themes:
  - voluntary-framework-vs-binding-regulation
  - transparency-and-auditability
---

# Capabilities Evaluation

Capabilities evaluation in the AI corpus refers to the science and operational practice of evaluating AI model capability — benchmark evaluations, red-teaming, pre-deployment evaluations, and the procedural artifacts that regulation, safety, and procurement all depend on. This concept is closely related to but distinct from `capability-eval` (the technical concept); what it adds is the operational artifact dimension.

The operational practice falls into three pillars. **Benchmark evaluations** — standardized tests (MMLU, GPQA, SWE-bench, HumanEval, ARC-AGI, BIG-bench, FrontierEval, others) that produce numeric scores and trend curves. **Red-teaming** — structured adversarial testing, where humans and increasingly other AI models probe the system for failure modes and unintended behaviors. **Pre-deployment evaluations** — voluntary operational practice, exemplified by the UK AISI's frontier-model evaluations and the US AISI successor.

Capabilities evaluation is the procedural artifact that all other AI policy infrastructure depends on. Regulation without capability evaluation is theater (you can require "AI systems must be safe" without a meaningful way to evaluate safety). Procurement without capability evaluation is also theater. Safety work without capability evaluation is similarly hollow. The current state of the art is partial — benchmarks get saturated, red-teaming is bounded by human probing limits, and pre-deployment evaluations require voluntary developer access.

The substantive constraint of capabilities evaluation is that it requires the evaluator to have meaningful access to the model. The structural question of access is the principal bottleneck. Closed-frontal-API models can be evaluated against the API but not the weights; open-weight models can be evaluated comprehensively but lose frontier-scale capability (the most capable models tend to be closed). The capability-eval-vs-frontier-capability tradeoff is a specific instance of this dynamic.

In the Polycrisis corpus, this concept is the principal reference for the procedural artifact dimension of capability work. Crisis frames that invoke evaluation results (a model fails benchmark X, a system scores Y on capability test Z) can be grounded against this concept. Advisor voices framed as evaluators (a UK AISI evaluator, a third-party red team lead, a frontier-model evaluation researcher) can be grounded here.

## Connections

This concept is connected to:

- `capability-eval` (the technical concept of capability evaluation)
- `accountability` (capability evaluation produces accountability artifacts)
- `transparency` (capability-evaluation results are transparency artifacts)

It is referenced by advisor voices framed as evaluators and capability-evaluation researchers.

## Key references

- UK AI Safety Institute operational materials and the Inspect framework.
- Metaviews archive coverage of capability evaluation methodology.
- The transformer-circuits publication archive on circuit-level capability evaluation.

## Key posts

This concept covers an abstract dynamic in the AI policy corpus. Specific post coverage is filed in the parent Metaviews archive under the corresponding tag; the corpus references on this entry are public sources (URLs in frontmatter `sources`). Future fleshing cycles will reference specific archive posts by number once the wiki-ingest pipeline ingests them under this tag.

## Related archive posts

This concept is the principal corpus anchor for an abstract dynamic. Future ingest cycles will surface specific Metaviews archive posts by number once the `wiki-ingest` pipeline runs against the parent archive.
