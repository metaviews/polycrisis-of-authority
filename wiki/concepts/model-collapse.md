---
title: Model Collapse
description: Degradation that occurs from training AI on AI-generated data; the recursive-content question; the empirical evidence through 2025-2026 and the policy implications of generated-data saturation.
type: concept
version: '1.0'
last_updated: '2026-07-05'
grounded_in:
  - wiki/concepts/data-provenance.md
  - wiki/concepts/content-provenance.md
sources:
  - https://www.nature.com/articles/s41586-024-07566-y
  - https://arxiv.org/abs/2304.09842
related_concepts:
  - data-provenance
  - content-provenance
related_entities:
  - partnership-on-ai
  - frontier-model-forum
related_themes:
  - synthetic-media-and-information-environment
  - data-provenance
---

# Model Collapse

Model collapse refers to the degradation that occurs in AI models when they are trained on data that includes substantial amounts of AI-generated content. The phenomenon was documented in a 2024 Nature paper and subsequently observed in frontier-model training runs. The substantive mechanism is that AI-generated content has specific statistical regularities — certain phrases, certain structures, certain distribution properties — that, when used as training signal, produce models that converge toward those regularities at the expense of the broader distribution.

The empirical observations through 2025-2026 are partial. Frontier labs have reported observing training-data-distribution skew toward generated content as the public web has become saturated with synthetic text. The response has been to curate training data more aggressively (filtering, weighting, and dedicating human-generated-data channels). The structural concern is that as the proportion of synthetic content increases, the cost of producing truly fresh training data rises — the very definition of "fresh data" requires identifying and filtering out generated content.

The substantive question is whether model collapse is catastrophic or manageable. The pessimistic reading is that the generated-data saturation means we are running out of training data on a multi-year horizon. The optimistic reading is that human-generated content remains substantial and that the frontier labs' curation efforts will keep them ahead of the saturation. The honest read is that we are in an empirical transition: the saturation is real, the response is partial, and the trajectory is uncertain.

In the Polycrisis corpus, this concept is the substantive reference for simulation frames involving generated-data saturation. Crisis frames that involve "the training data is contaminated" or "the model is degrading" can be grounded against this concept. Advisor voices framed as AI training-data researchers, content provenance specialists, and frontier-lab-training leads can be grounded here.

The simulation can be used to explore model-collapse scenarios under different conditions: rate of generated-data saturation; effectiveness of training-data curation; alternative training-data channels (synthetic-but-fresh, user-interaction data, sector-specific licensing).

## Connections

This concept is connected to:

- `data-provenance` (data provenance is the upstream instrument)
- `content-provenance` (content provenance is what makes the saturation observable)

It is referenced by advisor voices framed as AI training-data researchers, content-provenance specialists, and frontier-lab-training leads.

## Key references

- The 2024 Nature paper "AI models collapse when trained on recursively generated data."
- The 2023 arXiv "Self-Consuming Generative Models Go MAD" paper.
- Metaviews archive coverage of generated-data saturation.

## Key posts

This concept covers an abstract dynamic in the AI policy corpus. Specific post coverage is filed in the parent Metaviews archive under the corresponding tag; the corpus references on this entry are public sources (URLs in frontmatter `sources`). Future fleshing cycles will reference specific archive posts by number once the wiki-ingest pipeline ingests them under this tag.

## Related archive posts

This concept is the principal corpus anchor for an abstract dynamic. Future ingest cycles will surface specific Metaviews archive posts by number once the `wiki-ingest` pipeline runs against the parent archive.
