---
title: MoE Architecture
description: The structural concept of mixture-of-experts (MoE) architecture — when a language model routes different tokens to different specialized sub-networks (experts), reducing inference compute while maintaining capability.
type: concept
version: '1.0'
last_updated: '2026-07-05'
grounded_in:
  - wiki/entities/deepseek.md
  - wiki/concepts/cost-efficiency.md
sources:
  - https://arxiv.org/abs/2407.06263
  - https://arxiv.org/abs/2401.06066
related_concepts:
  - moe-architecture
  - cost-efficiency
related_entities:
  - deepseek
  - mistral
related_themes:
  - compute-as-geopolitics
  - state-ai-strategic-competition
---

# MoE Architecture

MoE (Mixture-of-Experts) architecture in the AI corpus refers to the structural concept of language-model architecture where different tokens are routed to different specialized sub-networks ("experts") rather than processed by a single dense network. The architecture reduces inference compute while maintaining capability, and has been a substantive factor in the 2024-2026 cost-efficiency gains.

The technical pattern: a routing layer takes each token and assigns it to one or a few of the available experts; each expert is a smaller sub-network specialized for particular token types or semantic categories. Inference proceeds with only a subset of the network active per token. Training proceeds with all experts available, with routing decisions updated through gradient learning.

The substantive efficiency gains: at inference, only a small fraction of the network is active per token, substantially reducing compute per token. At training, the full parameter count contributes to capability, but the routing pattern allows each expert to specialize, producing a different efficiency-capability tradeoff than dense networks.

The empirical record through 2024-2026: substantial adoption. Mixtral 8x7B / 8x22B (Mistral) was the early 2024 open-weight MoE release. Qwen's MoE variants. DeepSeek-V3's substantial MoE architecture is the canonical 2025 frontier-capability MoE deployment. The structure has become a default choice for new large model deployments.

In the Polycrisis corpus, this concept is the principal reference for the technical dimension of AI cost-efficiency dynamics. Crisis frames involving training-cost economics, frontier-model architecture, or compute-substrate dynamics can be grounded against this concept. Advisor voices framed as ML-research specialists, compute-economics researchers, and capability researchers can be grounded here.

## Connections

This concept is connected to:

- `cost-efficiency` (the broader capability-economics question this concept instantiates)
- `chinese-frontier` (the empirical context in which MoE was developed at scale)
- `compute-as-geopolitics` (the substrate that MoE architecture modulates)

It is referenced by advisor voices framed as ML-research specialists.

## Key references

- The Mixtral 8x7B technical report (Mistral).
- DeepSeek-V3 technical report (DeepSeek).
- Survey papers on MoE architectures.
- Metaviews archive coverage of Mixture-of-Experts research.

## Key posts

This concept covers an abstract dynamic in the AI policy corpus. Specific post coverage is filed in the parent Metaviews archive under the corresponding tag; the corpus references on this entry are public sources (URLs in frontmatter `sources`). Future fleshing cycles will reference specific archive posts by number once the wiki-ingest pipeline ingests them under this tag.

## Related archive posts

This concept is the principal corpus anchor for an abstract dynamic. Future ingest cycles will surface specific Metaviews archive posts by number once the `wiki-ingest` pipeline runs against the parent archive.
