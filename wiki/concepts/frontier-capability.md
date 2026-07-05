---
title: Frontier Capability
description: What constitutes a frontier AI model — the empirical thresholds, the policy designations, and the structural characteristic that distinguishes frontier capability from prior waves of AI development.
type: concept
version: '1.0'
last_updated: '2026-07-05'
grounded_in:
  - wiki/entities/openai.md
  - wiki/entities/google-deepmind.md
  - wiki/themes/state-ai-strategic-competition.md
sources:
  - https://epochai.org/data/big-bench
  - https://arxiv.org/abs/2403.05530
  - wiki/concepts/capability-eval.md
related_concepts:
  - capability-eval
  - alignment
  - catastrophic-risk
related_entities:
  - openai
  - anthropic
  - google-deepmind
  - deepseek
  - alibaba-qwen
  - zhipu
  - moonshot-ai
related_themes:
  - compute-as-geopolitics
  - state-ai-strategic-competition
  - international-coordination-failure-and-recovery
---

# Frontier Capability

"Frontier capability" in the AI policy corpus refers to the empirical capacity of the most capable AI models at any given point in time, and the structural characteristic of those models that distinguishes them from prior waves of AI. The notion is operationalized in three ways: by raw capability benchmarks (the trajectory of accuracy on tests like MMLU, GPQA, SWE-bench, MMLU-Pro); by industry self-designation (the principal frontier labs — OpenAI, Anthropic, Google DeepMind, and the chinese frontier cohort — labeling their latest releases); and by policy thresholds (the EU AI Act's designation of general-purpose AI models with "systemic risk").

The structural characteristic of frontier capability is *generality* — the same model can perform a wide range of tasks competently, including tasks the developer didn't train on. Prior AI waves (computer vision, narrow NLP, recommendation systems) had high accuracy on specific tasks but failed outside their training distribution. Frontier models succeed at general-purpose reasoning tasks and on domains substantially different from training. The generality is what creates the policy problem: a model with high generality is harder to evaluate against specific use cases, harder to constrain to specific applications, harder to predict the behavior of at deployment time.

The empirical thresholds that define "frontier" have shifted substantially since 2022. The GPT-4 release (March 2023) substantially raised the capability frontier; the release of GPT-4o, Claude 3, Gemini 1.5 throughout 2024 sustained the trajectory; DeepSeek-V3 (January 2025) and subsequent chinese frontier outputs maintained the trajectory at progressively lower training costs. The benchmark-setting work continues to expose new dimensions of capability that the prior generation couldn't reach. The substantive question of "how much further can the capability frontier extend" is open; the empirical question of whether the trajectory has slowed or accelerated is also open, with conflicting signals (some benchmarks show saturation; others show ongoing capability gains).

In the Polycrisis corpus, this concept is the principal reference for "what the LLM running the simulation can and cannot do" — and what frontier capability thresholds a simulation should treat as given. Crisis frames involving "frontier AI capability N now exceeds benchmark M" can be grounded against this concept, with the threshold for "frontier" itself grounded against publicly available benchmarking data.

## Connections

The frontier-capability concept is connected to:

- `capability-eval` (the operational capability to evaluate what frontier models can do)
- `alignment` (technical alignment work specifically targets frontier-capability systems)
- `catastrophic-risk` (the catastrophic-risk discourse is specifically focused on frontier-capability systems)

Advisors framed as model-evaluation researchers can be grounded here. Crisis frames that invoke capability thresholds (a frontier model exceeding capability eval X, a developer deploying a frontier model with capability Y at scale) can be modeled against this concept's evidence.

## Key references

- Epoch AI's BIG-bench dataset and capability benchmarking infrastructure.
- Recent capability-benchmarking research (e.g., the April 2024 positionality paper on capability evaluations).
- Metaviews archive coverage of the capability frontier trajectory.

## Key posts

This concept covers an abstract dynamic in the AI policy corpus. Specific post coverage is filed in the parent Metaviews archive under the corresponding tag; the corpus references on this entry are public sources (URLs in frontmatter `sources`). Future fleshing cycles will reference specific archive posts by number once the wiki-ingest pipeline ingests them under this tag.

## Related archive posts

This concept is the principal corpus anchor for an abstract dynamic. Future ingest cycles will surface specific Metaviews archive posts by number once the `wiki-ingest` pipeline runs against the parent archive.
