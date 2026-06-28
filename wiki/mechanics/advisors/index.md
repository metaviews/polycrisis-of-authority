---
title: "Advisor cast — five voices grounded in the corpus"
description: "The simulation offers five corpus-grounded advisor voices (frontier-lab, civil-society, state-security, open-source, international-ally). Each describes how a represented position sees the crisis; none recommend actions."
type: mechanic
version: "0.1.0"
last_updated: 2026-06-28
grounded_in:
  - "concepts/algorithmic-authority.md"
  - "concepts/cognitive-authority.md"
---

## Advisor cast

The simulation offers the player five advisor voices. Each voice represents a real, documented AI policy position from the corpus. When the player consults an advisor, the simulation produces a response in that advisor's voice describing how the position sees the current crisis.

### The five voices

1. **[Frontier-lab advisor](frontier-lab.md)** — Anthropic / OpenAI / similar frontier AI labs position. Grounded in `concepts/ai-arms-race.md` and `entities/openai-anthropic.md`.

2. **[Civil-society advisor](civil-society.md)** — Civil society organizations and academic AI safety community. Grounded in `concepts/algorithmic-transparency.md` and `concepts/attention-economy.md`.

3. **[State-security advisor](state-security.md)** — State actors focused on AI as national security and competitiveness. Grounded in `entities/trump-administration.md` and `concepts/ai-arms-race.md`.

4. **[Open-source advisor](open-source.md)** — Open-source AI community and commons-oriented position. Grounded in `concepts/algorithmic-authority.md` (resistance strand) and `concepts/agentic-ai.md` (vibe-coding strand).

5. **[International-ally advisor](international-ally.md)** — Allied-state regulators and multilateral-coordination posture. Grounded in `concepts/future-of-authority.md` and the UK/EU strand of `concepts/ai-arms-race.md`.

### The describe-not-recommend constraint

Per Principle 4.2, advisors describe how a represented position sees the crisis; they do not recommend actions to the player. The constraint is operationalized through five mechanisms in each prompt:

1. Explicit "what this voice does NOT do" section forbidding recommendation.
2. Third-person framing requirement ("this position sees...").
3. Length cap (150 words).
4. No structured output requiring recommendation.
5. Corpus grounding requirement that shapes output toward summary, not prediction.

### Player interaction

The player can consult up to 3 advisors per turn (diminishing returns after that). Advisor responses are visible to the player but do *not* enter the grammar's prompt. The player's authored text is what the grammar sees. This preserves the literacy claim that what the player writes is what gets interpreted.

### Curation per Principle 4.2

The MVP-0 cast is fixed. Additions require orchestrator review per the six-step audit-and-curation posture: position identification → corpus verification → distinctness check → prompt drafting → test runs → commit.

## Sources

- `concepts/algorithmic-authority.md` — the institutional and resistance strands motivate why advisor voices represent positions, not opinions
- `concepts/cognitive-authority.md` — attention and framing as how positions are constructed

## Version history

- **0.1.0** (2026-06-28) — Initial advisor-cast entry. Five voices, describe-not-recommend constraint, player interaction rules, curation posture. Authored per `docs/10-advisor-prompts.md`.
