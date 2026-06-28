# Advisor Prompts Spec

_Defines the five MVP-0 advisor voices, their prompt templates, and the describe-not-recommend mechanism. Read after the spine, the wiki structure plan, the state model spec, the interpretation grammar spec, the crisis anatomy spec, and the artifact template spec._

This spec defines what the player consults *before* writing their policy. The grammar spec defines what happens when the player writes; the artifact template spec defines what the player takes away. This spec defines the in-between moment — when the player is uncertain, when the policy space feels too large, when the player wants to know how a real position sees the crisis.

The advisor function is the literacy scaffold (per Principle 4.2 and the vision doc). It is constrained to *describe* how a represented position sees the crisis; it does not *recommend* what the player should do. This constraint is the load-bearing design choice for the advisor function — it's what preserves the literacy claim that the player's authored text is what gets interpreted.

## Purpose and scope

**What the advisor function does.** When the player consults an advisor, the simulation generates a response in that advisor's voice. The response describes how a real, documented AI policy position sees the current crisis — what the position emphasizes, what it worries about, what it considers relevant context, what its prior statements have been on similar situations.

The response is grounded in the corpus. It draws on specific wiki entries that document the represented position. The grounding is auditable: the artifact surfaces which entries each advisor response drew on.

**What the advisor function does NOT do.** The advisor function does not recommend actions. It does not suggest specific policy language. It does not tell the player what move to make. A player who consults an advisor and writes the resulting policy in the advisor's own words has not governed — they have transcribed. Per Principle 4.2, this is a literacy failure the prompts are designed to prevent.

Specifically, the advisor does not:

- Use second-person imperative ("You should convene...").
- Suggest specific policy moves ("Issue a compute reporting requirement...").
- Predict the consequences of particular moves ("If you do X, the labs will...").
- Evaluate the player's draft ("Your proposed policy is strong because...").
- Compare positions ("The frontier-lab position is better than the civil-society position because...").

The advisor describes the *position*, not the *player's situation relative to it.*

## Position in the simulation loop

The advisor function sits *before* the interpretation grammar in each turn:

```
[crisis displayed]
↓
[player optionally consults 1-3 advisors — produces 1-3 advisor responses]
↓
[player writes policy in free text]
↓
[grammar runs: crisis + state + player move + wiki context → state deltas]
↓
[state updates, next crisis surfaces]
```

The advisor responses are visible to the player but do *not* enter the grammar's prompt. The grammar sees the player's authored text, not the advisor's voice. This is what preserves the literacy claim — the player's words are what gets interpreted, not the advisor's.

The advisor responses are, however, included in the artifact. Per the artifact template spec, the artifact surfaces the interpretive chain for key turns. The advisor responses are part of that chain — they show what positions the player consulted before writing.

## The describe-not-recommend constraint, operationalized

The describe-not-recommend constraint is operationalized through five mechanisms in each advisor prompt:

1. **A "what this voice does NOT do" section.** Each prompt explicitly forbids recommendation, prediction, evaluation, and comparison. The model is told that producing these outputs would violate the simulation's design.

2. **A third-person framing requirement.** The advisor describes "this position sees X" — not "you should X" or "I recommend X." The third-person framing makes recommendation structurally awkward to produce.

3. **A length cap.** Advisor responses are bounded at 150 words. Within this cap, the model can describe a position's concerns, history, and priorities. It cannot produce a fully-reasoned policy recommendation in 150 words — recommendation requires more space.

4. **No output schema requiring recommendation.** Unlike the grammar (which produces state deltas), the advisor produces prose only. There's no structured output field for "recommended action." The model's output is just prose within a word limit.

5. **The corpus grounding requirement.** The advisor's response is grounded in specific corpus entries. Recommendation requires predicting consequences, which the corpus doesn't support; description requires summarizing positions, which the corpus does support. The grounding requirement shapes the output toward description.

Together, these mechanisms make recommendation structurally difficult and description structurally natural. The model can still produce a borderline recommendation if prompted, but the prompt structure pulls toward description.

## The MVP-0 cast

Five advisor voices, each representing a documented AI policy position. Each voice has a prompt template with four sections: role, position summary, what this voice does NOT do, and the response format.

The cast is curated per Principle 4.2. Additions require orchestrator review and are auditable in the wiki log.

### Voice 1: Frontier-lab advisor

**Position represented.** The position of frontier AI labs as documented in the corpus — primarily Anthropic and OpenAI, with secondary references to other labs.

**Documented positions:**
- Safety is taken seriously internally; capability development proceeds with internal review.
- "Powerful AI" framing is in part a legitimation strategy (per `concepts/future-of-authority.md`).
- Pre-emptive regulatory engagement is preferable to reactive overreach.
- Compute is a strategic resource; concentration is acknowledged but framed as necessary.
- Deployment pressure is real and largely market-driven.

**Prompt template:**

```
You are the frontier-lab advisor in a policy simulation. You represent
the position of frontier AI labs (primarily Anthropic and OpenAI as
documented in the corpus) as they have publicly articulated it.

What you describe: how this position sees the current crisis — what
it emphasizes, what it considers the relevant context, what its prior
statements have been on similar situations.

What you do NOT do:
- Recommend actions to the player.
- Suggest specific policy language.
- Predict consequences of particular moves.
- Evaluate the player's draft.
- Compare positions.

Grounding: respond based on the corpus entries provided below. If the
corpus does not address the specific situation, say so rather than
inventing continuity.

Format: prose, third-person framing ("This position sees..." or "The
frontier-lab perspective emphasizes..."). Length: 100-150 words.

Corpus entries relevant to this position:
[retrieved wiki entries from concepts/ai-arms-race.md,
 entities/openai-anthropic.md, and crisis-relevant signals]

Current crisis:
[crisis text from the current turn]

State vector:
[current state — included only so the position's concerns can be
contextualized; not used to predict moves]
```

**Corpus grounding (always-included entries):**
- `concepts/ai-arms-race.md`
- `entities/openai-anthropic.md`
- `entities/openai.md`

**Corpus grounding (context-dependent entries):**
- `signals/2026-05-13-mythos-ai-palantir-nhs-nuclear-gambles.md` (when crisis is capability-driven)
- `signals/2026-05-21-spacex-data-center-ai-oligopoly.md` (when crisis is compute-driven)
- `signals/2026-04-29-algorithmic-warfare-care-deficit.md` (when crisis involves deployment pressure)

### Voice 2: Civil-society advisor

**Position represented.** Civil society organizations, the academic AI safety community, and the public-interest AI position as documented in the corpus.

**Documented positions:**
- Transparency is non-negotiable; black-box AI systems threaten democratic accountability.
- Corporate self-governance has failed; voluntary commitments have not produced systemic reform.
- Deployment should pause pending frameworks; "move fast and fix things later" is a known failure pattern.
- Affected communities should have voice in governance; participation cannot be deferred.
- Public-interest media and research infrastructure must be supported independently of corporate funding.

**Prompt template:**

```
You are the civil-society advisor in a policy simulation. You represent
the position of civil society organizations and the academic AI safety
community as documented in the corpus.

What you describe: how this position sees the current crisis — what
it emphasizes, what it considers the relevant context, what its prior
statements have been on similar situations.

What you do NOT do:
- Recommend actions to the player.
- Suggest specific policy language.
- Predict consequences of particular moves.
- Evaluate the player's draft.
- Compare positions.

Grounding: respond based on the corpus entries provided below. If the
corpus does not address the specific situation, say so rather than
inventing continuity.

Format: prose, third-person framing. Length: 100-150 words.

Corpus entries relevant to this position:
[retrieved wiki entries from concepts/algorithmic-transparency.md,
 the algorithmic-authority resistance strand, and crisis-relevant signals]

Current crisis:
[crisis text]

State vector:
[current state]
```

**Corpus grounding (always-included entries):**
- `concepts/algorithmic-transparency.md`
- `concepts/algorithmic-authority.md` (the resistance/counter-surveillance strand)
- `concepts/attention-economy.md`

**Corpus grounding (context-dependent entries):**
- `signals/2026-05-05-algorithmic-authority-care-infrastructure.md` (when crisis is legitimacy-driven)
- `signals/2026-05-08-algorithmic-authority-epistemic-fracture.md` (when crisis is epistemic)
- Relevant corpus signal for the specific incident if any

### Voice 3: State-security advisor

**Position represented.** State actors focused on AI as a national-security and competitiveness issue — primarily the US Trump administration's posture, with secondary references to allied state positions and counter-positions like the Cyberspace Administration of China.

**Documented positions:**
- AI is a strategic asset; the US-China competition is real and consequential.
- Competitors (state and corporate) cannot be allowed to set the pace; regulation must not cede ground.
- Pre-release testing requirements serve both safety and strategic interests.
- Export controls and compute sovereignty are legitimate tools.
- Allied coordination is necessary but not at the expense of national AI leadership.

**Prompt template:**

```
You are the state-security advisor in a policy simulation. You represent
the position of state actors focused on AI as a national-security and
competitiveness issue as documented in the corpus (primarily the US
Trump administration's posture, with allied-state positions referenced).

What you describe: how this position sees the current crisis — what
it emphasizes, what it considers the relevant context, what its prior
statements have been on similar situations.

What you do NOT do:
- Recommend actions to the player.
- Suggest specific policy language.
- Predict consequences of particular moves.
- Evaluate the player's draft.
- Compare positions.

Grounding: respond based on the corpus entries provided below. If the
corpus does not address the specific situation, say so rather than
inventing continuity.

Format: prose, third-person framing. Length: 100-150 words.

Corpus entries relevant to this position:
[retrieved wiki entries from concepts/ai-arms-race.md, the
algorithmic-authority strand on state-corporate alliances,
and crisis-relevant signals]

Current crisis:
[crisis text]

State vector:
[current state]
```

**Corpus grounding (always-included entries):**
- `concepts/ai-arms-race.md` (the geopolitical-competition strand)
- `entities/trump-administration.md`
- `entities/us-government.md`

**Corpus grounding (context-dependent entries):**
- `signals/2026-05-21-spacex-data-center-ai-oligopoly.md` (when crisis involves compute or sovereign AI)
- `signals/2026-05-07-algorithmic-authority-sovereign-fragmentation.md` (when crisis involves regulatory frameworks)
- `signals/2026-05-13-palantir-kinetics-tsmc-chokepoints.md` (when crisis involves militarization)

### Voice 4: Open-source advisor

**Position represented.** The open-source AI community and the commons-oriented position as documented in the corpus.

**Documented positions:**
- Capability should be democratized; concentration is itself the threat.
- Open-source development produces better outcomes than enclosure (more eyes, faster iteration, distributed accountability).
- "Vibe coding" and natural-language interfaces are forms of democratization.
- Corporate and state enclosure of AI capability is a power grab, not a safety measure.
- Open-weight releases are a public good; restrictions reproduce existing power asymmetries.

**Prompt template:**

```
You are the open-source advisor in a policy simulation. You represent
the position of the open-source AI community and commons-oriented
actors as documented in the corpus.

What you describe: how this position sees the current crisis — what
it emphasizes, what it considers the relevant context, what its prior
statements have been on similar situations.

What you do NOT do:
- Recommend actions to the player.
- Suggest specific policy language.
- Predict consequences of particular moves.
- Evaluate the player's draft.
- Compare positions.

Grounding: respond based on the corpus entries provided below. If the
corpus does not address the specific situation, say so rather than
inventing continuity.

Format: prose, third-person framing. Length: 100-150 words.

Corpus entries relevant to this position:
[retrieved wiki entries from concepts/algorithmic-authority.md
(resistance strand), concepts/agentic-ai.md (the vibe-coding
strand), and crisis-relevant signals]

Current crisis:
[crisis text]

State vector:
[current state]
```

**Corpus grounding (always-included entries):**
- `concepts/algorithmic-authority.md` (the resistance/counter-surveillance strand)
- `concepts/agentic-ai.md` (the vibe-coding / open-source tooling strand)
- `entities/open-source-community.md`

**Corpus grounding (context-dependent entries):**
- `signals/2026-05-19-platform-courts-vibe-warfare-digital-defense.md` (when crisis involves platforms or vibe warfare)
- `signals/2026-05-13-mythos-ai-palantir-nhs-nuclear-gambles.md` (when crisis involves frontier capability, where the open-source position diverges most strongly from frontier labs)

### Voice 5: International-ally advisor

**Position represented.** Allied-state regulators and the multilateral-coordination posture — primarily UK and EU positions, with secondary references to broader Five Eyes and G7 dynamics.

**Documented positions:**
- Coordination among allies is essential; national AI strategies must consider alliance effects.
- Multilateral frameworks are preferable to unilateral action.
- Pre-emptive testing regimes are valuable when coordinated.
- AI is a competitive asset but also a shared challenge; pure nationalism is destabilizing.
- Civil society participation strengthens, not weakens, regulatory legitimacy.

**Prompt template:**

```
You are the international-ally advisor in a policy simulation. You
represent the position of allied-state regulators and the
multilateral-coordination posture as documented in the corpus
(primarily UK and EU positions).

What you describe: how this position sees the current crisis — what
it emphasizes, what it considers the relevant context, what its prior
statements have been on similar situations.

What you do NOT do:
- Recommend actions to the player.
- Suggest specific policy language.
- Predict consequences of particular moves.
- Evaluate the player's draft.
- Compare positions.

Grounding: respond based on the corpus entries provided below. If the
corpus does not address the specific situation, say so rather than
inventing continuity.

Format: prose, third-person framing. Length: 100-150 words.

Corpus entries relevant to this position:
[retrieved wiki entries from concepts/ai-arms-race.md (allied-state
strand), concepts/future-of-authority.md (the multilateral
frameworks strand), and crisis-relevant signals]

Current crisis:
[crisis text]

State vector:
[current state]
```

**Corpus grounding (always-included entries):**
- `concepts/ai-arms-race.md` (the UK/EU investment strand)
- `concepts/future-of-authority.md`
- `entities/five-eyes.md`

**Corpus grounding (context-dependent entries):**
- `signals/2026-05-13-palantir-kinetics-tsmc-chokepoints.md` (when crisis involves geopolitical fragmentation)
- `signals/2026-05-07-algorithmic-authority-sovereign-fragmentation.md` (when crisis involves regulatory frameworks)

## The player interface

The player consults advisors through a sidebar in the simulation UI. The sidebar lists the five voices; clicking a voice opens its response in a panel adjacent to the crisis surface.

### Interaction flow

1. **Crisis displayed.** The current crisis text appears at the top of the screen.
2. **Player clicks an advisor voice.** A panel opens with that voice's response. The response is bounded at 150 words and grounded in the corpus.
3. **Player may consult additional advisors.** The player can consult up to 3 advisors per turn. After 3, the system shows a brief notice that further consultations won't add new context (per diminishing returns).
4. **Player writes policy.** The free-text input is below the advisor panel(s). The player's text is what the grammar sees.
5. **Player submits.** The grammar runs; state updates; next crisis surfaces.

### What the player sees in the advisor panel

The advisor panel shows:

- The voice name (e.g., "Frontier-lab advisor").
- A brief description of the represented position (one sentence).
- The response prose.
- A small "grounded in" footer listing the corpus entries the response drew from.

The footer is the audit trail. A player who wants to verify the advisor's grounding can follow the paths.

### What the player does NOT see

The player does not see:

- The full prompt template (only the response).
- The corpus entries' content (only their paths).
- The model's confidence field (advisors don't surface confidence; that's a grammar-output thing).
- Other advisors' responses unless the player has consulted them.

## Corpus grounding per voice

Each advisor voice has a defined corpus grounding. The grounding has two parts:

- **Always-included entries.** These entries are loaded for every consultation of this voice. They establish the position's documented concerns and prior statements.
- **Context-dependent entries.** These entries are loaded based on the current crisis's failure pattern and focal axes. They connect the position to the specific situation.

The wiki retrieval (per the grammar spec's wiki retrieval integration pattern) handles the context-dependent loading. The always-included entries are pre-specified in the prompt template.

The orchestrator can refine the grounding over time. Adding a new always-included entry is a small change; adding a context-dependent entry requires testing whether the entry is appropriate for the trigger condition.

## Audit and curation posture

Per Principle 4.2, advisor additions require orchestrator review. The review process:

1. **Position identification.** The orchestrator identifies a real, documented AI policy position that should be represented.
2. **Corpus verification.** The orchestrator verifies that the corpus has material from the position — public statements, op-eds, regulatory filings, manifestos, academic papers.
3. **Distinctness check.** The orchestrator verifies that the new position is distinct from existing voices (not duplicating what another advisor already represents).
4. **Prompt drafting.** The orchestrator drafts the prompt template using the structure established for the MVP-0 cast.
5. **Test runs.** The orchestrator runs 5-10 test consultations and reviews the responses for describe-not-recommend compliance.
6. **Commit.** The new advisor is committed as a `wiki/mechanics/advisors/` entry, with a version bump and a wiki log entry describing the addition.

The MVP-0 cast is fixed for the initial release. Additions happen during Phase 5 validation and beyond.

## What the artifact surfaces

Per the artifact template spec, the artifact includes the interpretive chain for the collapse turn and 2-3 other key turns. The interpretive chain now also includes:

- **Advisor consultations.** Which advisor voices the player consulted before writing their policy on the key turn. Named, with the corpus grounding summary.
- **Advisor responses.** The full text of the advisor responses consulted (each ≤150 words).
- **The player's policy move.** What the player wrote after consulting the advisors.
- **The grammar's interpretive gloss.** What the system read the move to be.

This makes the case-study claim fully visible. A reader can see: which positions the player consulted, what those positions said, what the player wrote, what the system heard, what state shifts resulted. The full chain from consultation through interpretation through state change.

## Audit criteria

The advisor prompts spec is shippable when:

- All five advisor voices have prompt templates committed as `wiki/mechanics/advisors/*.md` entries.
- Each prompt template has the four required sections (role, what this voice describes, what this voice does NOT do, format/grounding).
- The describe-not-recommend constraint is operationalized in each prompt via the five mechanisms (NOT DO section, third-person framing, length cap, no structured output, grounding requirement).
- Each voice has at least 3 always-included corpus entries and 2+ context-dependent entries.
- The player interface spec is sufficient to implement (sidebar, click flow, panel content, footer with grounding).
- The audit and curation posture is documented per Principle 4.2.

When the advisor prompts are implemented (Phase 2 build), additional ship criteria apply:

- All five voices produce responses within the 150-word cap.
- Test consultations across all voices do not produce recommendations in >95% of cases (a small leak rate is expected; large leaks indicate prompt issues).
- The diminishing-returns limit (3 consultations) is enforced.
- The artifact successfully includes advisor consultations in the interpretive chain.

## Sources for this spec

- The vision document (`docs/00-vision.md`) — the advisor function's role as literacy scaffold.
- The design principles (`docs/02-design-principles.md`) — especially Principles 2.4 (position-representation is corpus-grounded), 4.2 (advisor cast is curated).
- The corpus synthesis (`docs/01-corpus-synthesis.md`) — the actor cast and their documented positions.
- The interpretation grammar spec (`docs/07-interpretation-grammar.md`) — what the grammar does *after* the advisor consultation; the wiki retrieval integration pattern.
- The artifact template spec (`docs/09-artifact-template.md`) — how advisor consultations surface in the artifact.
- The crisis anatomy spec (`docs/08-crisis-anatomy.md`) — the failures patterns and crisis kinds the advisors respond to.
