---
title: Transparency
description: The structural concept of algorithmic transparency as a substantive (not procedural) requirement — what artifacts developers publish, what those artifacts actually tell third-party evaluators, the auditability question for inspection and verification.
type: concept
version: '1.0'
last_updated: '2026-07-05'
grounded_in:
  - wiki/concepts/algorithmic-transparency.md
  - wiki/themes/transparency-and-auditability.md
sources:
  - https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf
  - https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689
  - https://www.ieee.org/standards/ieee7000.html
related_concepts:
  - transparency
  - accountability
  - capability-eval
related_entities:
  - nist
  - eu-ai-office
  - uk-aisi
  - partnership-on-ai
related_themes:
  - transparency-and-auditability
  - voluntary-framework-vs-binding-regulation
---

# Transparency

Transparency in the AI corpus refers to the structural concept of algorithmic transparency as a substantive (not procedural) requirement — what artifacts developers publish, what those artifacts actually tell third-party evaluators, and the auditability question for inspection and verification.

The concept is operationalized through multiple artifact types. Model cards (a published document describing intended use, training data categories, evaluation results, limitations); system cards (more detailed variant for deployed systems); data sheets (training data collection methodology); disclosure-of-evaluation-results practices; model cards' principle-of-provenance requirements; datasheets-for-datasets standards. Each artifact type has different implications for what third-party evaluators can actually verify.

The auditability question is harder than the artifact question. A third-party evaluator (an AI safety institute, a regulator, an academic) needs to (a) reproduce the model's behavior on a meaningful test set, (b) probe for capabilities or failure modes the developer didn't disclose, (c) verify that the deployed model matches the disclosed model. The first two are technical; the third is an integrity question. The current state of the art (red-teaming, capability evaluations, model fingerprinting) is partial.

The policy regime treats transparency as a substantive obligation. The EU AI Act requires GPAI providers to supply sufficient information for downstream safe integration. NIST's AI RMF treats transparency as one of seven trustworthy characteristics. The UK AISI's operational model is structured around transparency-with-developers (pre-deployment evaluations are voluntary; AISI asks for access that a developer could decline).

In the Polycrisis corpus, this concept is the principal reference for the transparency-and-auditability theme. Crisis frames involving AI accountability, harm investigation, and institutional response can be grounded against this concept. Advisor voices framed as auditors, civil-society researchers, and compliance specialists can be grounded here.

## Connections

This concept is connected to:

- `accountability` (transparency is the prerequisite for substantive accountability)
- `capability-eval` (the operational practice that converts transparency into measurement)
- `transparency-and-auditability` (the theme that pulls on this concept)

It is referenced by advisor voices framed as auditors and compliance specialists.

## Key references

- NIST AI RMF 1.0's transparency framework.
- EU AI Act transparency provisions.
- IEEE 7000-series standards on AI transparency.
- Metaviews archive coverage of algorithmic transparency.

## Key posts

This concept covers an abstract dynamic in the AI policy corpus. Specific post coverage is filed in the parent Metaviews archive under the corresponding tag; the corpus references on this entry are public sources (URLs in frontmatter `sources`). Future fleshing cycles will reference specific archive posts by number once the wiki-ingest pipeline ingests them under this tag.

## Related archive posts

This concept is the principal corpus anchor for an abstract dynamic. Future ingest cycles will surface specific Metaviews archive posts by number once the `wiki-ingest` pipeline runs against the parent archive.
