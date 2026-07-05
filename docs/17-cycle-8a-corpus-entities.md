# Polycrisis Corpus — Cycle 8a: Entities

## scope

This cycle ships the entity expansion under the corpus. The user's
grounded goal: "expand the wiki; we need more entities to create a
more engaging experience." Entities come first (concrete grounding
material), themes next (cross-entity patterns), concepts last
(abstract dynamics).

## what shipped

- **3 fully-fleshed existing entries** (openai.md, anthropic.md, openai-anthropic.md) — deepened with current corpus material
- **9 net-new fully-fleshed entries** — google-deepmind, mistral, deepseek, eu-ai-office, uk-aisi, nist, ai-now-institute, rand-corporation, stratechery
- **17 net-new stub entries** — 1-line description + frontmatter + sources-stub; ready for future cycles to flesh out
- **`wiki/index.md` updated** — all 28 entries linked
- **`wiki/log.md` entry** — record the corpus expansion

## entry list

### AI Labs (12)

| # | slug | category | quality |
|---|---|---|---|
| 1 | openai | frontier lab | exists; deepened |
| 2 | anthropic | frontier lab | exists; deepened |
| 3 | openai-anthropic | tension within frontier labs | exists; deepened |
| 4 | google-deepmind | frontier lab | full |
| 5 | xai | frontier lab | stub |
| 6 | mistral | mid-tier / european | full |
| 7 | cohere | mid-tier / canadian | stub |
| 8 | inflection-ai | mid-tier / commercial | stub |
| 9 | meta-ai | frontier lab | stub |
| 10 | deepseek | chinese frontier | full |
| 11 | alibaba-qwen | chinese frontier | stub |
| 12 | zhipu | chinese frontier | stub |
| 13 | moonshot-ai | chinese frontier | stub |

### State Actors (6)

| # | slug | quality |
|---|---|---|
| 14 | white-house-ai-office | stub |
| 15 | us-congress | stub |
| 16 | eu-ai-office | full |
| 17 | uk-aisi | full |
| 18 | china-miit | stub |
| 19 | nist | full (also standards) |

### Multilateral + Alliances (5)

| # | slug | quality |
|---|---|---|
| 20 | un-ai-advisory-body | stub |
| 21 | oecd-ai-policy | stub |
| 22 | partnership-on-ai | stub |
| 23 | frontier-model-forum | stub |
| 24 | ieee-7000 | stub |

### Civil Society + Watchdogs (4)

| # | slug | quality |
|---|---|---|
| 25 | ai-now-institute | full |
| 26 | future-of-life-institute | stub |
| 27 | rand-corporation | full |
| 28 | algorithmic-justice-league | stub |

### Press (1)

| # | slug | quality |
|---|---|---|
| 29 | stratechery | full |

total: **29 entities** (under the 30 target).

## what's full vs stub

"Full" entries have:
- YAML frontmatter (title, description, type, version, last_updated, sources, related_concepts, related_entities, related_themes)
- "Key posts" section (curated references to publicly known material)
- "Connections" section (cross-references to other wiki entries)
- ~200–400 words of in-corpus analysis

"Stub" entries have:
- YAML frontmatter (all required fields including real sources)
- 1-2 paragraph description
- "Connections" section (cross-references)
- A "## sources" line with 2–3 publicly verifiable URLs

this is the minimum wiki-audit-passing shape with real sources. future cycles flesh stubs into full.

## the 9 net-new full entries

1. **google-deepmind** — frontier lab; founded 2010 in london; the deepmind/alphafold strand of medical-impact AI vs the alphastar/scalable-policymaking debates; currently pivot toward Gemini-family flagship models.
2. **mistral** — french frontier / mid-tier research lab; founded 2023 by ex-deepmind and meta-ai engineers; emphasis on open-weights and european independence from US-frontiers.
3. **deepseek** — chinese frontier lab; emphasis on MoE architecture (DeepSeek-V3) and open-weight release; their Qwen-bench comparisons and the "Sputnik moment" framing around cost-efficiency.
4. **eu-ai-office** — the EU's AI Office; enforces the AI Act; multi-institutional home (DG CONNECT + DG JUST + national-authority liaisons).
5. **uk-aisi** — UK AI Safety Institute; established 2023 at Bletchley Park; emphasizes model evaluations and frontier-model pre-deployment testing.
6. **nist** — National Institute of Standards and Technology (US); AI Risk Management Framework (RMF 1.0, January 2023); standards body for evaluation methodology; the GenAI Profile (2024).
7. **ai-now-institute** — civil-society research org focused on AI accountability; annual reports cover liability gaps, antitrust, and infrastructure externalities.
8. **rand-corporation** — US federally-funded research center with multiple AI policy studies; tariff models, compute-export rules, scenario planning.
9. **stratechery** — Substack by Ben Thompson covering tech platform + AI business-model analysis; anchors the de facto "industry discourse" on AI policy.

## what's NOT in cycle 8a

- min**imax** as an entry — the project memory at session-start says the model's vendor (minimax M3 / MiniMax m3) is the case-study subject, **not** a corpus entity. including it would create circular grounding (the wiki is the corpus the model draws from; the model can't draw on itself). minimax appears only in the project's `README`, the case-study docs, and (when used at runtime) in the LLM client config. **not in the wiki.**
- fictional entities — even though narrative-rich runs might benefit from a named antagonist, real-world anchoring was locked in grounding. if a future cycle wants fictional content, that's a deliberate departure.
- pre-existing duplicates: openai-anthropic.md as a standalone "tension within frontier labs" entry. it's kept distinct from openai.md because it tracks the axis (corporate alliance vs corporate rivalry) rather than a single lab.
- `signals/` re-population — the parent project's signal-filing pipeline is not in scope here. cycle 8a is wiki-only; cycle 8d or later can revisit signals.

## sources strategy

locked at "web + project + signal" per grounding. each full entry's `sources` field references:

- 2–3 publicly verifiable URLs (lab press releases, white papers, government documents, journalism)
- 1–2 references to project wiki entries (concepts, themes, other entities) for cross-linking
- 1 reference to a parent-project `signals/` entry where relevant (deepseek + 87: AI Cold War, etc.)

this matches the existing project pattern. no fabricated post numbers; all references are to publicly verifiable material.

## verification

`/tmp/hermes-verify-8a-entities.sh` covers:

1. `wiki-audit.js` reports clean schema (zero missing frontmatter, zero orphans)
2. all 29 entity files have valid frontmatter (title, description, type, sources)
3. `wiki/index.md` lists all 29 entries
4. entity file names are lowercase kebab-case
5. cross-reference integrity (every cross-reference points to a real entry)
6. no entity file is empty (full entries have ≥200 words; stubs have ≥30 words)

live verification is via `node scripts/wiki-audit.js` (the project's existing audit script).

## cycle plan

```
8a — entities       (this cycle: 29 entries)
8b — themes          (12–15 net-new themes)
8c — concepts        (15–20 net-new concepts)
```

each cycle ships a per-cycle ad-hoc verifier at `/tmp/hermes-verify-8[a-c]*.sh`. wiki-audit is the project's existing canonical check.
