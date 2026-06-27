# Design Principles

_The principles any design decision in this project should respect. Read after `00-vision.md` and before any concrete spec doc._

This document codifies the design moves we have settled across the project's early conversations. Each principle is stated, justified, and tied to the part of the project it constrains. Future design proposals should be evaluated against these principles before they are accepted.

The principles are organized into four groups: principles about the model's role, principles about the wiki's role, principles about the player's experience, and principles about the project's ongoing care.

## Part 1 — The model's role

### Principle 1.1 — The model is an orchestrator choice, not an implementation detail

The model that runs the simulation is configured through environment variables and can be swapped without code changes. The project does not hardwire any specific model, including the MiniMax M3 model that is the case-study focus.

**Why this principle:** the case-study claim is about the *category* of behavior — what language models do when they interpret policy — not about any one model's behavior in isolation. Hardwiring the model would conflate the artifact with one instance of it. Keeping the model swappable preserves the ability to compare runs across models, document model behavior as a class of observation in the wiki, and replace the model without rebuilding the project.

**What this constrains:** no model name appears in source code. Model selection is read from `.env`. The shareable artifact records which model produced a given run. The wiki can document model behavior as a curated, citable observation.

### Principle 1.2 — The model's behavior is observable, versioned, and citable

A run's interpretation of player policy is not a black box. The wiki can document what the model has been observed to do; the artifact surfaces what the model did in a given run; and the orchestrator can compare runs across model versions to identify shifts.

**Why this principle:** the case-study claim is falsifiable only if model behavior is observable. A simulation whose interpretations cannot be examined or compared is not evidence for anything about language models — it is entertainment. The literacy device works only if players can develop a working theory of how the model reads their words.

**What this constrains:** the artifact shows the interpretive chain (player input → model reading → state deltas) for at least the load-bearing turns of a run. The wiki's `mechanics/` entries can include "observed model behaviors" subsections that are updated by the orchestrator. Model version appears in run metadata.

### Principle 1.3 — The same policy text in different states produces different effects

The interpretation grammar is state-sensitive: identical player text applied at different points in the simulation produces different state-vector deltas. The same words do not always do the same work.

**Why this principle:** this is the central literacy device. Policy as a tool is contextual; the same intervention in a strong-fiscal-slack state versus a depleted-fiscal-slack state produces different outcomes. A simulation where the grammar is state-insensitive teaches players that policy is deterministic — the opposite of what the project claims.

**What this constrains:** the grammar's prompt to the model must include state context. The artifact should be able to illustrate this asymmetry by showing at least one case where the player's intent was clear but the outcome was state-dependent.

## Part 2 — The wiki's role

### Principle 2.1 — The wiki is opaque in play, transparent in the artifact

Players cannot read the wiki while playing. After a run, the wiki entries that grounded the simulation are surfaced in the shareable artifact, with citations to the source material.

**Why this principle:** the gameplay tension requires that the player cannot reach behind the curtain. The literacy claim requires that the player can, after the fact, examine what the system did and why. Both are necessary; collapsing either one collapses the design.

**What this constrains:** no in-game link or query interface to the wiki. The artifact's "grounding" section is real and citable. The wiki is structurally separate from any player-facing surface.

### Principle 2.2 — The wiki is grounded in dated, citable, real source material

Every wiki entry that makes a claim about the world traces to a source document with a date, author or publisher, and URL where available. The wiki does not contain claims that exist only in the model's prior.

**Why this principle:** this is what makes the project a case study rather than a toy. If the wiki can drift into the model's prior, the simulation becomes an extended hallucination with citations. If the wiki is grounded in real material, the simulation becomes a constrained, auditable interaction with a curated knowledge domain.

**What this constrains:** every `concepts/`, `entities/`, `themes/`, `signals/` wiki entry must include source references. The wiki's audit step (per the parent Metaviews project's `wiki-audit.js` discipline) verifies this. The orchestrator's curation work is grounded in source material, not in the model's invention.

### Principle 2.3 — The wiki distinguishes game-claims from corpus-claims

The wiki has a `mechanics/` entry type distinct from the corpus entry types. `mechanics/` entries describe the game's own model of itself — state axes, collapse modes, interpretation grammar, advisor cast. Corpus entries describe the policy domain. Players reading the artifact can see which claims are the game's and which are the world's.

**Why this principle:** literacy requires that players can distinguish what the simulation claims from what the policy domain claims. A run where a player collapses legitimacy is the *game's* claim that the player's regime lost public acceptance; whether that reflects anything about how legitimacy actually erodes in the policy domain is a separate, citable claim grounded in corpus entries.

**What this constrains:** every game-specific concept lives in `mechanics/`. Every concept about the policy domain lives in `concepts/`, `entities/`, `themes/`, or `signals/`. Cross-references between the two types are explicit and labeled.

### Principle 2.4 — Position-representation is a corpus-grounded claim

When an advisor voice speaks for a position (e.g. "the frontier-lab advisor"), that voice is grounded in specific corpus entries documenting that position. The grounding is auditable from inside the artifact.

**Why this principle:** the advisor function is a literacy scaffold, not a multiple-choice menu. Its value depends on the represented positions being real, documented, and contestable. An advisor voice that has no corpus grounding is decoration. Advisors are constrained to *describe* how a represented position sees the crisis — they do not recommend actions, do not suggest specific policy language, and do not collapse into answer-giving. A player who consults an advisor and writes the resulting policy in the advisor's own words has not governed; they have transcribed. The literacy claim requires that the player's authored text remain the input that gets interpreted.

**What this constrains:** every advisor voice has at least one corpus entry (or set of entries) it is grounded in. The artifact surfaces those entries. New advisors are added by the orchestrator, not generated; the orchestrator's judgment about what position an advisor represents and whether the corpus supports that representation is required. Advisor prompts are constrained to description and analysis of how a position sees a crisis — they do not produce recommended actions or suggested policy language for the player to copy.

## Part 3 — The player's experience

### Principle 3.1 — Free-text input is the primary interaction

The player's authored policy text is what the interpretation grammar resolves. Pre-written options, dropdowns, and choice menus are absent from the primary interaction loop.

**Why this principle:** the literacy device lives in what the player writes. Replacing free-text input with menu selection collapses the device into a quiz. The advisor function (see Principle 4.2) is a scaffold for players who need help framing their move, not a substitute for writing.

**What this constrains:** the primary UI is a text input on a crisis surface. Crisis framing and visible signals are presented as prose and small data visualizations, not as choice lists.

### Principle 3.2 — Visible signals are fragmented and unreliable by design

The signals the player can see during play — public mood, elite posture, narrative tone, surface-level state — are partial, lagged, and sometimes contradicted by the hidden state. The player has to read them critically.

**Why this principle:** this is the central pedagogical texture. A simulation with reliable signals teaches players that policy responds to feedback; a simulation with fragmented signals teaches players that authority is sustained by interpretation of incomplete information. The brief calls this out explicitly: "The world speaks back through fragmented, unreliable signals."

**What this constrains:** the dashboard's visible signals can be wrong, lagged, or contradictory. The hidden state can shift without visible movement. The post-collapse reveal is often the first time the player sees the full picture.

### Principle 3.3 — Collapse is a reveal, not a game-over screen

When a run ends in collapse, the player sees which hidden condition collapsed, the timeline of state changes, the interpretive chain from player words to state deltas, and the gap between intended and observed effects. The collapse surface is itself a teaching device.

**Why this principle:** the central pedagogical beat is the surprise — the collapse after a long period in which decisions seemed reasonable. The teaching lands only if the collapse reveals something the player could not see in play. A generic "game over" screen wastes the moment.

**What this constrains:** the three collapse modes (legitimacy, technical, narrative capture) each have a distinct reveal treatment. The reveal surfaces the specific hidden threshold that broke, the trajectory toward it, and at least one player move whose consequences were not visible at the time.

### Principle 3.4 — The shareable artifact has three jobs

The post-run artifact must (a) report on the player's run in a way that is honest about what happened, (b) invite others to play, and (c) function as an AI policy artifact in its own right — legible as commentary on the policy domain, not just as a game score.

**Why this principle:** the artifact is the project's main distribution surface. If it only does (a) and (b), the case-study claim evaporates — the project becomes a game whose output is a meme. If it only does (c), it becomes inaccessible. All three are required.

**What this constrains:** the artifact template includes grounding references to wiki entries, a clear invitation at the end framed by the actual content of the run, and a narrative report on what the player did and what the system read it as. The artifact is shareable as text, image, or URL — depending on what best serves the three jobs.

## Part 4 — The project's ongoing care

### Principle 4.1 — The project is build-and-tend, not ship-and-forget

The wiki evolves. The grammar evolves. The advisor cast is curated. The orchestrator role is ongoing, not transitional.

**Why this principle:** this is the project's identity. A wiki that does not evolve goes stale. A grammar that does not refine accumulates interpretive drift. An advisor cast that does not get curated drifts toward the model's prior. The project's value compounds over tending, not over shipping.

**What this constrains:** every doc in this repository should be revisable. The orchestrator's role is documented in `03-orchestrator-role.md` and is part of the project's permanent design, not its bootstrap.

### Principle 4.2 — The advisor cast is curated, not generated

New advisors are added by the orchestrator after explicit consideration of (a) what position the advisor represents, (b) whether the corpus supports that representation, and (c) what the new voice adds to the existing cast. Advisors are not auto-generated, expanded, or pruned without orchestrator review.

**Why this principle:** the advisor function's value depends on the cast being a deliberate, defensible set of positions. Generated advisors accumulate voices that are not real positions; pruned advisors lose voices that mattered. Curation is the orchestrator's job.

**What this constrains:** the MVP-0 cast is named and grounded in specific corpus entries. Additions to the cast are made by editing the wiki's `mechanics/advisors.md` entry, not by running a generation step.

### Principle 4.3 — The interpretation grammar's refinements are auditable

When the orchestrator refines the interpretation grammar — adding a policy-mechanism recognition pattern, adjusting how a state axis responds to player text, sharpening a collapse threshold — the change is recorded in the wiki's log, with the prior version, the new version, and the reason for the change.

**Why this principle:** the case-study claim depends on the project's behavior being inspectable. A grammar that changes without a trail is indistinguishable from a grammar that drifts. Auditability is what lets the project make claims about how language is interpreted by language models.

**What this constrains:** every change to the interpretation grammar is committed to the wiki with a dated log entry. The orchestrator's refinements are visible in the project's history.

### Principle 4.4 — Public-facing surfaces wait until retrieval is mature

No public query interface, search bar, or status dashboard is exposed until the orchestrator has confidence in retrieval quality. Internal/operator tooling may exist before public surfaces do.

**Why this principle:** this is inherited from the parent Metaviews project's design discipline (see `../metaviews-website/PROJECT.md` and the `wiki-audit.js` pattern). Public surfaces that pretend to be functional but aren't erode trust faster than no surface at all. The wiki is internal/transparent-in-artifact until the orchestrator decides otherwise.

**What this constrains:** MVP-0 does not include a public wiki query endpoint. The artifact is the only public surface that exposes wiki content, and it does so in a curated way.

## How to use this document

When proposing a new design decision — a new state axis, a new crisis pattern, a new advisor voice, a new artifact section — evaluate it against the principles here. A proposal that conflicts with a principle is either a bad proposal or evidence that the principle needs revision. In either case, the conflict is the conversation to have, not a thing to paper over.

When a principle itself needs revision, document the change in the wiki log with the prior version, the new version, and the reason. Principles that drift silently are worse than principles that are occasionally revised out loud.

## Sources for this document

- The vision document (`docs/00-vision.md`) — the literacy claim, the case-study framing, the MVP-0 scope.
- The corpus synthesis (`docs/01-corpus-synthesis.md`) — the load-bearing material from the parent archive, including the CIA framework and the four failure patterns.
- The parent Metaviews project's design discipline (`../metaviews-website/PROJECT.md`, `../metaviews-website/DESIGN.md`, `../metaviews-website/CLAUDE.md`) — the wiki discipline, the audit pattern, and the opacity/transparency principle.
