---
title: Misuse and Dual-Use
description: AI applications with both beneficial and harmful uses; the structural question of access as a policy lever — open weights, API gating, and the resulting tradeoffs.
type: concept
version: '1.0'
last_updated: '2026-07-05'
grounded_in:
  - wiki/concepts/dual-use-research.md
  - wiki/themes/open-weights-and-distribution.md
sources:
  - https://arxiv.org/abs/2006.07242
  - https://partnershiponai.org/
  - wiki/themes/synthetic-media-and-information-environment.md
related_concepts:
  - dual-use-research
  - catastrophic-risk
related_entities:
  - partnership-on-ai
  - openai
  - anthropic
  - meta-ai
  - mistral
  - deepseek
related_themes:
  - open-weights-and-distribution
  - synthetic-media-and-information-environment
  - transparency-and-auditability
---

# Misuse and Dual-Use

Misuse in the AI corpus refers to harmful applications of AI systems that the developer didn't intend or didn't fully anticipate. Dual-use refers more specifically to capabilities that have both beneficial and harmful uses — biology research, code-execution capability, synthetic-media generation, persuasion. The two concepts overlap but are distinct: misuse can be unintended, while dual-use is structurally intended. Both place the structural question of access at the center of policy.

The 2024-2026 misuse discourse has been substantially shaped by specific high-profile incidents: the deepfake calls to voters in the 2024 election cycle; the synthetic CSAM that structured the early-2025 disclosure; the chemistry and biology misuse cases revealed in red-teaming reports; the persuasion and influence campaigns that synthetic media enables. The pattern is consistent: a capability is developed for a benign use, deployed broadly, and shortly the misuse case becomes substantial. The policy question is whether the response should be ex ante (restrict the capability or the access) or ex post (develop mitigations against the misuse).

The structural policy lever is access. Open-weight model releases trade some misuse risk (broader access makes it harder to constrain harmful use) against some benefit (broader access enables more oversight and red-teaming, lower concentration of risk). API-served frontier models trade the reverse: tighter access via API gating creates ex ante control but concentrates the misuse risk on a few actors and limits oversight. Closed frontier labs argue that their access-management procedures (allowlist, usage policies, abuse-detection teams) provide ex ante control without the open-weight downsides. Open-weight advocates argue that abuse-detection and accountability work better with broad access and external scrutiny.

In the Polycrisis corpus, this concept is the structural reference for simulation frames involving access decisions. Crisis frames that invoke AI misuse (a specific harmful use case; a model deployed for unintended purposes) can be grounded against this concept. Advisor voices framed as frontier-lab-access specialists, open-weight distributors, and abuse-response-team leads can be grounded here.

The simulation can be used to explore the access-vs-accountability tradeoff under different conditions: low-misuse-rate models with high capabilities; open weights to small academic users; API access for high-throughput services; release-to-procurement channels in regulated industries.

## Connections

This concept is connected to:

- `dual-use-research` (the broader tradition of dual-use research and how AI fits)
- `catastrophic-risk` (specific misuse scenarios scale up to catastrophic-risk framings)
- `data-provenance` (training data with restricted licensing creates input-side misuse considerations)

It is referenced by advisor voices framed as access specialists, misuse-response analysts, and procurement-security researchers.

## Key references

- The original "On the Opportunities and Risks of Foundation Models" (Bommasani et al., 2022).
- Partnership on AI's research on misuse prevention and response.
- Metaviews archive coverage of misuse incidents and policy responses.

## Key posts

This concept covers an abstract dynamic in the AI policy corpus. Specific post coverage is filed in the parent Metaviews archive under the corresponding tag; the corpus references on this entry are public sources (URLs in frontmatter `sources`). Future fleshing cycles will reference specific archive posts by number once the wiki-ingest pipeline ingests them under this tag.

## Related archive posts

This concept is the principal corpus anchor for an abstract dynamic. Future ingest cycles will surface specific Metaviews archive posts by number once the `wiki-ingest` pipeline runs against the parent archive.
