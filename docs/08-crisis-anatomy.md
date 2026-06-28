# Crisis Anatomy Spec

_Defines the structure of crises the simulation surfaces, the four failure patterns crises activate, and the MVP-0 crisis deck. Read after the spine, the wiki structure plan, the state model spec, and the interpretation grammar spec._

This spec defines what the player is *responding to* each turn. The grammar spec defines how the player's response becomes state-vector deltas. This spec defines what produces the deltas in the first place — the situation the player faces.

The crisis anatomy is the bridge between the corpus (which describes real AI policy situations) and the simulation (which surfaces those situations to the player in playable form). The corpus gives us *real crises* — frontier lab model releases, civil society reports, regulatory capture, compute concentration, narrative warfare. The anatomy gives us *playable crises* — structured enough that the grammar can produce state-conditional interpretations, specific enough that the player can write policy in response.

## Purpose and scope

**What the crisis anatomy does.** The crisis anatomy defines:

1. The *schema* every crisis conforms to — the four required parts (trigger, actors, focal axes, policy surface) plus a failure-pattern tag.
2. The *failure patterns* — four characteristic ways AI policy regimes fail, drawn from the corpus synthesis. Each crisis is tagged with which pattern(s) it activates.
3. The *crisis generation rule* — when a new crisis surfaces, when an existing crisis shifts, when crises accumulate.
4. The *MVP-0 crisis deck* — eight authored crises, two per failure pattern, each fully specified.

**What the crisis anatomy does NOT do.**

- It does not generate crises automatically. Per the wiki structure plan and Principle 2.2, crises are authored against the corpus, not generated from the model's prior. The MVP-0 deck is hand-authored; later versions may add to it through orchestrator-curated authoring.
- It does not replace the grammar's `narrative_move` output. The grammar produces a narrative_move; the crisis anatomy consumes it to decide the next crisis. They're separate concerns.
- It does not decide state-vector deltas. The grammar produces deltas based on the player's policy move in response to a crisis. The crisis anatomy just provides the situation.

## The anatomy schema

Every crisis is a markdown file in `wiki/mechanics/crises/` (per the wiki structure plan's mechanics entry pattern). Each crisis has frontmatter and four required body sections.

### Frontmatter

```yaml
---
title: "The crisis title — what the player sees"
type: "mechanics"
subtype: "crisis"
version: "0.1.0"
last_updated: YYYY-MM-DD
failure_pattern: ["upstream-embedding" | "compute-capability-escape" | "legitimacy-erosion" | "memetic-narrative-capture"]
focal_axes: ["legitimacy" | "fiscal_slack" | "elite_alignment" | "ecological_debt" | "narrative_coherence" | "capability_frontier"]
grounded_in:
  - "concepts/..."
  - "signals/..."
trigger_kind: "capability-driven" | "legitimacy-driven" | "elite-driven" | "incident-driven"
---
```

The `failure_pattern` field is a list because a crisis can activate multiple patterns. A single incident might involve both upstream-embedding (the policy response addresses output, not training) and legitimacy-erosion (public mood shifts because the response feels inadequate).

The `focal_axes` field tells the grammar which axes to weight when interpreting player moves on this crisis. The grammar still considers all six axes, but focal axes are the ones where the player's policy is most likely to move state.

The `trigger_kind` field categorizes the crisis's source. Useful for run analytics and for the orchestrator's pattern review.

### Body — four required sections

**1. Trigger.** The event or condition that brings the crisis into focus. The trigger is specific and dated (real or plausible-real): "On [date], [actor] [did X]." The trigger text is what the player sees at the top of the crisis surface.

**2. Actors.** Who is involved in the crisis, what their positions are, what they have publicly said or done. The actor list draws from the corpus's documented actor cast — frontier labs, civil society, state regulators, allied states, the open-source community, the academic AI safety community, the press, adversarial actors. Each actor entry names the position they hold on this crisis.

**3. Focal axes.** A prose explanation of which state axes this crisis foregrounds and why. The focal_axes field is the short version; this section explains the *reasoning* — why the crisis is most likely to move legitimacy, or capability_frontier, or both.

**4. Policy surface.** What kinds of policy moves the grammar should be listening for on this crisis. The policy surface is what makes a crisis feel distinct — what kinds of moves would address it (and what kinds would miss it). The policy surface is *not* a menu of options; it's a description of the policy space the player is operating in.

### Failure-pattern tag (cross-reference)

The failure_pattern field in frontmatter tags which of the four corpus-derived failure patterns the crisis activates. This is what enables the grammar's gloss to point at the pattern: "this move addresses the visible crisis but ignores the upstream embedding pattern."

## The four failure patterns

Each failure pattern is a characteristic way AI policy regimes fail. The patterns are derived from the corpus synthesis (`docs/01-corpus-synthesis.md`) and are grounded in specific Metaviews wiki entries.

### Pattern 1: Upstream embedding

**What it is.** AI policy regimes get drafted against visible outputs (chatbot behavior, image generation, content moderation) while the consequential decisions are made upstream (training data selection, capability evaluation criteria, RLHF reward modeling, deployment architecture).

**Characteristic trigger.** An incident, complaint, or capability demonstration that focuses attention on a visible output. The crisis surface is the output; the cause is upstream.

**What the grammar should be sensitive to.** Player moves that respond to the visible surface without addressing upstream conditions. Such moves typically stabilize visible signals (legitimacy, narrative_coherence) while quietly weakening hidden state (elite_alignment if actors read the move as inadequate, ecological_debt if the underlying cause is structural).

**Corpus grounding.** `concepts/automation-of-law.md`, `concepts/agentic-ai.md`, `concepts/algorithmic-transparency.md`.

### Pattern 2: Compute and capability escape

**What it is.** Every regulatory regime on AI runs into a frontier capability that wasn't anticipated and a compute base that wasn't covered. The Anthropic-SpaceX deal, the UAE's oil-funded compute, hyperscalers moving data through Iraqi pipelines — these are the corpus's documented instances.

**Characteristic trigger.** A capability demonstration, a model release, an infrastructure announcement, or a compute deal that exceeds the regime's response capacity.

**What the grammar should be sensitive to.** Player moves that try to regulate the visible capability without addressing the compute base. Such moves typically stabilize short-term signals but accelerate capability_frontier shifts because the underlying compute and capability development continue.

**Corpus grounding.** `concepts/ai-arms-race.md`, `entities/openai-anthropic.md`, `signals/2026-05-21-spacex-data-center-ai-oligopoly.md`, `signals/2026-05-13-palantir-kinetics-tsmc-chokepoints.md`.

### Pattern 3: Legitimacy-erosion cascade

**What it is.** Policy regimes that survive contact with capability nonetheless collapse because their claims stop making sense to the people they govern. Public mood shifts independently of elite position; the regime's narrative coherence fails; legitimacy erodes.

**Characteristic trigger.** A sequence of events — an incident, a slow policy rollout, an elite defection, a press cycle — that cumulatively shifts public mood past a tipping point.

**What the grammar should be sensitive to.** Player moves that address elite alignment without addressing public mood. Such moves often read as elite-management (the labs are satisfied, the civil society groups are consulted) while the public reads the move as inadequate or captured.

**Corpus grounding.** `concepts/cognitive-authority.md`, `concepts/future-of-authority.md`, `signals/2026-05-05-algorithmic-authority-care-infrastructure.md`, `signals/2026-05-08-algorithmic-authority-epistemic-fracture.md`.

### Pattern 4: Memetic and narrative capture

**What it is.** Policy regimes that survive both capability and legitimacy nonetheless collapse because their meaning is captured by an external narrative — a meme cycle, a media consolidation, a foreign disinformant, a domestic partisan realignment.

**Characteristic trigger.** A narrative event (a viral moment, a media acquisition, a foreign disinformation campaign) that reframes the regime's actions in a way the regime cannot easily counter.

**What the grammar should be sensitive to.** Player moves that address the substantive policy without addressing the narrative frame. Such moves may be technically correct but politically unintelligible — the public has been captured by a different story.

**Corpus grounding.** `concepts/memetic-warfare.md`, `concepts/mythology-and-narrative.md`, `concepts/attention-aristocracy.md`, `signals/2026-05-19-platform-courts-vibe-warfare-digital-defense.md` (the "Iran Is Winning the Vibe War" coverage).

## The crisis generation rule

The grammar produces a `narrative_move` field in its output (per the grammar spec). The narrative_move describes what happens next in the simulation. The crisis generation rule consumes that field and decides:

1. **Surface a new crisis.** If the narrative_move signals a new trigger (a capability demonstration, an incident, a public reaction), the crisis generation rule picks an appropriate crisis from the deck and surfaces it. The pick is constrained by:
   - The current failure pattern most active in the run (the orchestrator tracks this in real time).
   - The current state vector (some crises are appropriate only when state is in certain bands).
   - The actor cast currently engaged (avoid surfacing the same actor twice in a row).

2. **Shift an existing crisis.** If the narrative_move signals a shift in an existing crisis (escalation, new actor entry, new development), the rule modifies the trigger text and possibly the focal_axes. The grammar sees the modified crisis on the next turn.

3. **No new crisis.** If the narrative_move signals stability, no new crisis surfaces; the existing crisis remains in focus.

The rule itself is implemented as code in Phase 2 build, not specified in this doc beyond the selection criteria. The criteria are enough to make the deck's authoring coherent — every crisis knows what state and what failure pattern it activates.

### Trigger kinds

The `trigger_kind` frontmatter field categorizes how the crisis enters the simulation:

- **Capability-driven.** A model release, capability demonstration, or compute announcement. The capability_frontier axis shifts; the crisis gives the player a chance to respond.
- **Legitimacy-driven.** A public reaction, an incident, a polling shift. The legitimacy axis is already under pressure; the crisis is the surface where the player responds.
- **Elite-driven.** A defection, an alliance shift, a public disagreement among institutional actors. The elite_alignment axis is the foreground.
- **Incident-driven.** A specific harmful event (a model failure, a data breach, a misuse case). The crisis has a specific date and a specific victim; the player's response is judged against that specificity.

The trigger_kind tells the grammar what kind of *temporal pressure* the crisis carries. Capability-driven crises have a long fuse (the capability is already there). Incident-driven crises have a short fuse (the harm is already done). The grammar's gloss can name this pressure when relevant.

## The MVP-0 crisis deck

Eight authored crises, two per failure pattern. Each is fully specified: trigger text, actors with positions, focal axes with reasoning, policy surface, and corpus grounding.

### Crisis 1: Frontier lab capability release (Pattern 1 — upstream embedding)

**Trigger text (what the player sees).** "Anthropic has released Claude Mythos, a new frontier model with agentic capabilities exceeding the regulator's current evaluation framework. The release was announced with a 14-day notice; the regulator's safety team cannot complete a meaningful evaluation in that window. Industry analysts are calling the release 'a regulatory fait accompli.'"

**Actors and positions:**
- **Anthropic** — Defended the release as safety-tested and competitive-necessity. Argues that delay would cede ground to less careful actors.
- **Frontier-model regulator (in-player)** — Under pressure to demonstrate that the regime has authority over frontier capabilities.
- **Academic AI safety community** — Public statements call for a pause; private concerns about overreaction.
- **Allied regulators (UK, EU)** — Coordinating posture; the EU AI Act may have different evaluation requirements.

**Focal axes.** elite_alignment (the lab-regulator relationship is the foreground), narrative_coherence (the public reads the release as a power move), capability_frontier (the move shifts the axis).

**Policy surface.** Player moves that respond to the release itself (a public statement, an emergency rule, a coordination call with allied regulators) versus moves that address upstream conditions (training-data transparency requirements, evaluation criteria reform, compute reporting thresholds). The latter are harder to enact quickly but address the structural cause.

**Grounded in:** `concepts/automation-of-law.md`, `concepts/algorithmic-authority.md`, `signals/2026-05-13-mythos-ai-palantir-nhs-nuclear-gambles.md`.

### Crisis 2: Content moderation incident (Pattern 1 — upstream embedding)

**Trigger text.** "A widely-shared social media post documents an AI content moderation system producing systematically biased outputs against dialectal English varieties. The post goes viral with screenshots. Civil society organizations are calling for an immediate investigation. The company operating the system has issued a public statement but has not committed to release training data."

**Actors and positions:**
- **Civil society organizations** — Calling for transparency about training data and evaluation.
- **The operating company** — Defending the system as meeting all published standards; resisting training-data disclosure as a trade secret.
- **Affected communities** — Documenting the harm; not part of the in-game conversation but their presence shapes the legitimacy pressure.
- **The press** — Coverage focused on individual incidents rather than systemic patterns.

**Focal axes.** legitimacy (public mood is the immediate foreground), narrative_coherence (the incident becomes a test case for "is the regime responsive?"), elite_alignment (the company's resistance shifts the lab position).

**Policy surface.** Quick-response moves (an investigation, a public hearing, a transparency requirement with a 30-day window) versus structural moves (training-data audit requirements, evaluation standard reform, civil society consultation requirements). The former address the visible harm; the latter address the upstream conditions.

**Grounded in:** `concepts/algorithmic-transparency.md`, `concepts/agentic-systems.md`, `signals/2026-04-30-algorithmic-authority-epistemic-fracture.md`.

### Crisis 3: Compute concentration announcement (Pattern 2 — compute and capability escape)

**Trigger text.** "The UAE has announced a sovereign AI compute fund backed by oil revenue, sized at $80 billion over five years. The fund will provide compute access to international AI labs at below-market rates. Analysts project this will shift the global compute balance significantly within 18 months."

**Actors and positions:**
- **UAE sovereign wealth fund** — Framing the fund as a contribution to global AI safety through expanded compute access.
- **US hyperscalers** — Concerned about competitive pressure; private lobbying for export controls.
- **International AI labs** — Some view this as compute relief; others as geopolitical entanglement.
- **Allied regulators** — Asking how compute access for foreign labs affects domestic regulatory authority.

**Focal axes.** fiscal_slack (the compute shift has material consequences), capability_frontier (the axis is the long-term driver), elite_alignment (lab positions shift).

**Policy surface.** Compute-reporting moves (transparency about foreign compute access, evaluation requirements for compute-funded models) versus response moves (subsidizing domestic compute, retaliatory export controls, multilateral coordination). The former are visible and quick; the latter are slow and material.

**Grounded in:** `concepts/ai-arms-race.md`, `entities/openai-anthropic.md`, `signals/2026-05-21-spacex-data-center-ai-oligopoly.md`.

### Crisis 4: Model agentic capability threshold (Pattern 2 — compute and capability escape)

**Trigger text.** "OpenAI has published a paper demonstrating an agentic capability threshold: a model that can complete a multi-step economic task (procurement, contracting, payment) with human-level reliability. The paper does not announce a product release; it documents the capability. Industry analysts are calling this 'the agentic moment.'"

**Actors and positions:**
- **OpenAI** — Framing the paper as research transparency; argues publication enables pre-emptive regulatory engagement.
- **Civil society organizations** — Calling for a pause on deployment pending regulatory frameworks for agentic AI.
- **Industry analysts** — Predicting rapid commercialization; concerned about deployment before frameworks.
- **The press** — Coverage focused on the timeline question (when will this be in products?) rather than the regulatory question.

**Focal axes.** capability_frontier (the axis shifts directly), narrative_coherence (the public reads "agentic" as a meaningful threshold), ecological_debt (compute-intensive agentic systems increase energy demand).

**Policy surface.** Quick-response moves (public statements about deployment readiness, engagement with OpenAI's pre-emptive framing) versus structural moves (agentic AI deployment frameworks, capability evaluation requirements for agentic systems, liability frameworks). The former are visible; the latter require sustained work.

**Grounded in:** `concepts/ai-arms-race.md`, `concepts/agentic-ai.md`, `signals/2026-05-13-mythos-ai-palantir-nhs-nuclear-gambles.md`.

### Crisis 5: Public legitimacy tipping point (Pattern 3 — legitimacy-erosion cascade)

**Trigger text.** "Polling this week shows that public trust in AI governance has dropped 12 points in three months. The drop is concentrated among voters who previously expressed moderate confidence. The shift correlates with a series of small incidents that received sustained press coverage. The press is framing the moment as 'the legitimacy crisis arriving.'"

**Actors and positions:**
- **Public (represented through polling)** — Trust has eroded; specific concerns are diffuse.
- **Press** — Framing the moment as a tipping point; coverage is itself a force.
- **Civil society organizations** — Some see this as an opportunity to push for stronger regulation; others worry about overreach in response.
- **Industry** — Concerned about regulatory overreaction; private messaging emphasizes measured response.

**Focal axes.** legitimacy (the foreground), narrative_coherence (the framing of "legitimacy crisis" affects what counts as a response), elite_alignment (industry and civil society positions diverge).

**Policy surface.** Quick-response moves (a high-profile address, a new initiative, a public consultation) versus structural moves (transparency reforms, accountability mechanisms, regulatory reform). The former buy time; the latter address the underlying legitimacy deficit.

**Grounded in:** `concepts/cognitive-authority.md`, `concepts/future-of-authority.md`, `signals/2026-05-08-algorithmic-authority-epistemic-fracture.md`.

### Crisis 6: Elite defection sequence (Pattern 3 — legitimacy-erosion cascade)

**Trigger text.** "Three senior safety researchers have left major AI labs in the past month, citing concerns about deployment decisions. Their departures have been characterized in press coverage as 'a credibility crisis for the labs' internal safety functions.' Industry analysts are noting that the labs' public safety commitments are no longer matched by their internal organization."

**Actors and positions:**
- **Departing researchers** — Public statements focus on internal disagreements; private concerns about deployment pressure.
- **AI labs** — Publicly defending their safety functions; privately concerned about recruitment.
- **Academic AI safety community** — Public statements supportive of the departing researchers; offers of academic positions.
- **Civil society** — Using the departures as evidence in regulatory advocacy.

**Focal axes.** elite_alignment (the foreground — the elite is fragmenting), narrative_coherence (the coverage is itself a narrative event), legitimacy (downstream).

**Policy surface.** Quick-response moves (a public statement of support for safety researchers, an inquiry into lab safety functions) versus structural moves (whistleblower protections, lab safety function requirements, deployment review requirements). The former signal concern; the latter change the structure.

**Grounded in:** `concepts/algorithmic-authority.md`, `concepts/future-of-authority.md`, `signals/2026-05-07-algorithmic-authority-sovereign-fragmentation.md`.

### Crisis 7: Narrative capture via media consolidation (Pattern 4 — memetic and narrative capture)

**Trigger text.** "A major media acquisition has been completed: a single corporate entity now controls a substantial share of the AI-policy-adjacent press. Editorial independence commitments have been made, but coverage in the past week has shifted noticeably toward framing AI policy debates in terms the industry's preferred narrative."

**Actors and positions:**
- **The acquiring corporation** — Publicly committed to editorial independence; privately the coverage shift is consistent.
- **Affected journalists and outlets** — Some have left; some are continuing under new ownership.
- **Civil society** — Concerned about narrative consolidation; calling for media diversity requirements.
- **The press (broader ecosystem)** — Coverage of the acquisition has been muted compared to past media-consolidation stories.

**Focal axes.** narrative_coherence (the foreground — the meaning of the policy debate is shifting), elite_alignment (downstream — institutional positions are affected by media framing), legitimacy (further downstream).

**Policy surface.** Quick-response moves (a public statement about media diversity, an inquiry into the acquisition) versus structural moves (media ownership disclosure requirements, AI-policy-adjacent journalism funding, public-interest media support). The former are visible; the latter are slow and contested.

**Grounded in:** `concepts/memetic-warfare.md`, `concepts/attention-aristocracy.md`, `signals/2026-05-21-spacex-data-center-ai-oligopoly.md` (the Murdoch acquisition of Vox Media Podcast Network and NY Mag within the same edition).

### Crisis 8: Memetic warfare / foreign disinformant (Pattern 4 — memetic and narrative capture)

**Trigger text.** "Coordinated inauthentic behavior has been detected across major platforms, framing the current AI policy debate around a narrative that conflates several distinct policy questions. The campaign has been attributed to a state actor. The narrative frame has gained traction in public discourse faster than fact-checkers can respond."

**Actors and positions:**
- **State actor (named or plausibly-identified)** — Denies responsibility; the campaign's framing serves their interests.
- **The platforms** — Publicly committed to enforcement; the volume exceeds current detection capacity.
- **Civil society and researchers** — Documenting the campaign; concerned about narrative entrenchment.
- **The press** — Coverage is itself shaped by the campaign's narrative frame, creating a recursive effect.

**Focal axes.** narrative_coherence (the foreground — the meaning of the policy debate is contested), legitimacy (downstream — public trust is affected by the perceived confusion), elite_alignment (further downstream).

**Policy surface.** Quick-response moves (public attribution statements, platform enforcement escalation) versus structural moves (platform accountability requirements, public-interest media investment, civic information infrastructure). The former address the immediate campaign; the latter address the conditions that make campaigns effective.

**Grounded in:** `concepts/memetic-warfare.md`, `concepts/mythology-and-narrative.md`, `signals/2026-05-19-platform-courts-vibe-warfare-digital-defense.md` (the "Iran Is Winning the Vibe War" coverage).

## How the grammar consumes the crisis

The crisis text (specifically the trigger text and the actor summary) is included in the grammar's user prompt as the **Current crisis** section, per the grammar spec. The grammar does not see the full crisis anatomy file — just the trigger text and a compact summary of actors and focal axes.

The wiki retrieval (per the grammar spec's wiki retrieval integration) draws on the crisis's `grounded_in` entries automatically. The retrieval query is constructed from the crisis text + the player's policy move; the wiki pages most relevant to both are returned.

The crisis's failure_pattern tag is also included in the user prompt as a hint to the model: "this crisis activates the upstream-embedding pattern." The model uses this hint when producing the interpretive gloss — it can name the pattern explicitly when the player's move engages with it or ignores it.

## Crisis lifecycle

Crises accumulate and shift during a run. The lifecycle is:

1. **Surfaced.** The crisis generation rule picks a crisis from the deck and surfaces it. The trigger text appears on the player's screen.
2. **Engaged.** The player writes policy in response. The grammar produces a state_delta and narrative_move. The state vector updates.
3. **Shifted.** If the narrative_move signals a shift (escalation, new actor entry, new development), the trigger text is modified. The grammar sees the modified crisis on the next turn.
4. **Resolved or replaced.** A crisis resolves when (a) the player has made moves that address the underlying conditions, (b) the state has shifted in a way that makes the crisis feel settled, or (c) the narrative_move says the moment has passed. Resolution does not mean the underlying conditions are fixed — it means the crisis is no longer the foreground.

The orchestrator can tune the resolution criteria during Phase 5 validation. The MVP-0 deck ships with explicit resolution hints per crisis, not full automation — the resolution is operator-curated.

## Audit criteria

The crisis anatomy spec is shippable when:

- The anatomy schema (frontmatter + four body sections) is specified and committed as a `mechanics/` wiki entry.
- The four failure patterns are documented with characteristic triggers and grammar-sensitivity guidance.
- The MVP-0 deck has eight crises, two per failure pattern, each with trigger text, actors with positions, focal axes with reasoning, policy surface, and corpus grounding.
- Each crisis is committed as a separate `wiki/mechanics/crises/*.md` file.
- Each crisis has at least two corpus entries cited in `grounded_in`.
- The crisis generation rule specifies selection criteria (failure pattern, state band, actor engagement).
- The wiki retrieval integration is consistent with the grammar spec — the crisis's `grounded_in` field feeds the retrieval query.

When the anatomy is implemented (Phase 2 build), additional ship criteria apply:

- All eight crises can be surfaced by the crisis generation rule.
- The grammar successfully consumes the crisis text as input (no schema mismatches).
- An end-to-end text-only session runs 12-20 turns with crises surfacing, shifting, and resolving.

## Sources for this spec

- The state model spec (`docs/06-state-model.md`) — the focal axes and the collapse thresholds.
- The interpretation grammar spec (`docs/07-interpretation-grammar.md`) — what consumes the crisis and produces the state delta.
- The corpus synthesis (`docs/01-corpus-synthesis.md`) — the four failure patterns the crises activate.
- The wiki structure plan (`docs/05-wiki-structure.md`) — the frontmatter schema and where crises live.
- The parent Metaviews wiki entries — specifically the corpus entries cited in each crisis's `grounded_in` field.
