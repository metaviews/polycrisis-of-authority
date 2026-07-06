---
title: Retrieval Models
description: The structural concept of retrieval-augmented generation (RAG) and embedding-based search — when AI models use external knowledge bases via retrieval, modifying the deployment patterns and the data-provenance question.
type: concept
version: '1.0'
last_updated: '2026-07-05'
grounded_in:
  - wiki/concepts/enterprise-deployment.md
  - wiki/concepts/data-provenance.md
sources:
  - https://cohere.com/rerank
  - https://arxiv.org/abs/2005.11401
related_concepts:
  - retrieval-models
  - enterprise-deployment
  - data-provenance
related_entities:
  - cohere
  - mistral
related_themes:
  - frontier-firm-ai-business-model
  - civil-society-accountability-infrastructure
---

# Retrieval Models

Retrieval models in the AI corpus refer to the structural concept of retrieval-augmented generation (RAG) and embedding-based search — when AI models use external knowledge bases via retrieval, modifying the deployment patterns and the data-provenance question.

The technical pattern: a query is processed against a knowledge base (often vector-embedded) to retrieve relevant documents; the retrieved documents are concatenated with the query as context for a language model; the model generates a response grounded in the retrieved material. The pattern has substantial adoption across enterprise AI deployment (Glean, Pinecone, Weaviate, Cohere, Anthropic's citations feature, OpenAI's retrieval API).

The substantive implications: (1) **Deployment patterns**: retrieval-augmented deployment is substantially cheaper than fine-tuning for many enterprise AI use cases; (2) **Data provenance**: the retrieval corpus is a substantive input to model outputs, with corresponding provenance requirements; (3) **Hallucination mitigation**: retrieval grounding reduces certain classes of model hallucination, though introduces new failure modes (irrelevant retrievals, conflicts between retrieval and model prior); (4) **Authorization**: the retrieval corpus can be customer-controlled (no third-party retrieval), substantially affecting data-residency implications.

The empirical record shows substantial adoption. Retrieval-augmented deployment has become the dominant enterprise AI pattern for cases involving large document corpora, internal knowledge bases, and user-facing information retrieval.

In the Polycrisis corpus, this concept is the principal reference for the technical dimension of enterprise AI deployment. Crisis frames involving enterprise AI integration patterns, knowledge-base deployment, and data-provenance for retrieval augmentation can be grounded against this concept. Advisor voices framed as enterprise AI specialists and information-retrieval researchers can be grounded here.

## Connections

This concept is connected to:

- `enterprise-deployment` (the broader pattern this concept instantiates)
- `data-provenance` (the data-provenance question for retrieval corpora)

It is referenced by advisor voices framed as enterprise AI specialists.

## Key references

- The original RAG paper (Lewis et al., 2020).
- Cohere's enterprise RAG positioning.
- Metaviews archive coverage of retrieval-augmented AI deployment.

## Key posts

This concept covers an abstract dynamic in the AI policy corpus. Specific post coverage is filed in the parent Metaviews archive under the corresponding tag; the corpus references on this entry are public sources (URLs in frontmatter `sources`). Future fleshing cycles will reference specific archive posts by number once the wiki-ingest pipeline ingests them under this tag.

## Related archive posts

This concept is the principal corpus anchor for an abstract dynamic. Future ingest cycles will surface specific Metaviews archive posts by number once the `wiki-ingest` pipeline runs against the parent archive.
