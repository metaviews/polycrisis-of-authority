# Roadmap

_What ships, in what order, with what conditions for "done." Read after `00-vision.md`, `01-corpus-synthesis.md`, `02-design-principles.md`, and `03-orchestrator-role.md`._

This document specifies the build order for Polycrisis of Authority and the conditions under which each phase is considered complete. It names what is in MVP-0, what is deferred, and the rough shape of phases after MVP-0.

The roadmap is downstream of the vision document. It does not re-derive the project's purposes — it operationalizes them. If a roadmap decision conflicts with vision, principles, or orchestrator-role, those documents win.

## How to read this document

Each phase has:

- **Scope.** What gets built.
- **Build order within the phase.** What depends on what.
- **Ship criteria.** Concrete, testable conditions that must hold for the phase to count as done.
- **Case-study contribution.** How this phase strengthens (or only weakly supports) the case-study claim.

The phases are sequential by default. A later phase does not begin until the prior phase's ship criteria are met. Internal task order within a phase is described; parallel work across phases is not assumed.

## Phase 1 — Wiki and corpus (before MVP-0)

**Scope.** The Polycrisis wiki itself. Curated corpus entries drawn from the Metaviews archive. The game-specific `mechanics/` entry type. The wiki's index, log, and audit tooling. The OpenRouter client configured for swappable models. Operational prototypes that probe how the model reads candidate corpus material, with prototype outputs filed as wiki entries or wiki log entries per Principle 4.5 (Dancing with the Details in the Design).

**Build order.**

1. Wiki directory structure: `concepts/`, `entities/`, `themes/`, `signals/`, `mechanics/`. Inherited from the parent project's wiki discipline; the addition is `mechanics/`.
2. Wiki index generation script, adapted from `../metaviews-website/scripts/wiki-build.js`.
3. Seed corpus selection: 60–100 source documents from the Metaviews archive, focused on AI policy and the policy-domain questions identified in the corpus synthesis (load-bearing concepts: algorithmic-authority, future-of-authority, ai-arms-race, cognitive-authority, algorithmic-transparency, automation-of-law, agentic-ai; load-bearing entities: openai, openai-anthropic, anthropic; themes: ai-and-power-dynamics, ai-and-digital-governance; signals: the recent 30 Pressure Systems editions).
4. Seed concept/entity/theme entries, drafted by hand first, then formalized through the wiki-build pipeline.
5. Seed incident/position entries derived from the recent signals.
6. The first `mechanics/` entries — `state-axes.md`, `collapse-modes.md`, `interpretation-grammar.md` (placeholder), `advisors.md`. These document the game's own claims about itself.
7. Wiki audit script, inherited from the parent project and adapted for the `mechanics/` type.
8. OpenRouter client configuration: `.env.example` with model variable, default to a non-MiniMax model initially so the case-study claim is genuinely about the swap.

**Ship criteria.**

- The wiki has at least 30 concept/entity/theme entries, all with explicit source references that resolve.
- The wiki has at least 20 signal entries drawn from recent Pressure Systems editions.
- The wiki has at least 4 `mechanics/` entries documenting the game's own model.
- `wiki-audit` passes: every entry has source references; the schema is consistent; citations resolve.
- The wiki's index fits in one context window (i.e. an LLM can load the index in a single prompt).
- An LLM, given only the wiki's index and a question about AI policy, can correctly identify which wiki pages are relevant (verified by a small set of test questions).

**Case-study contribution.** *Establishes the substrate.* The case-study claim that the simulation is grounded in a curated, dated, citable knowledge base rests on the wiki existing and being auditable. This phase is what makes the project different from a prompt-engineering toy.

## Phase 2 — State model and grammar (MVP-0 core)

**Scope.** The state model with all six axes (legitimacy, fiscal slack, elite alignment, ecological debt, narrative coherence, capability frontier). The interpretation grammar that resolves free-text policy input into state-vector deltas. The crisis anatomy drafted against the four failure patterns (upstream embedding, compute and capability escape, legitimacy-erosion cascade, memetic and narrative capture). The advisor function with the MVP-0 cast of five voices (frontier-lab, civil-society, state-security, open-source, international-ally). The three collapse modes (legitimacy collapse, technical collapse, narrative capture collapse) as the simulation's terminal states. Per Principle 4.5, this phase's specs are drafted in dialogue with operational prototypes — probes against the model that evoke what each spec should feel like before the spec is committed.

**Build order.**

1. State model spec: each of the six axes defined with visible signal layer, hidden threshold layer, interaction patterns with other axes, and corpus grounding. Written as a wiki `mechanics/` entry.
2. Interpretation grammar prompt structure: how the player's policy text is presented to the LLM, what context is included (current state, recent state history, retrieved wiki context), what structured output the LLM produces (state deltas, interpretive gloss, narrative move).
3. Test cases for the grammar: 3–5 concrete crisis scenarios, with 2–3 player moves per crisis, hand-authored expected state deltas. These are the grammar's first specification.
4. Run the grammar against the test cases. Compare actual deltas to expected. Refine until the grammar reliably does what the spec says.
5. Crisis anatomy: 8–12 authored crisis skeletons (trigger, actors, focal axes, policy surface) covering the four failure patterns. Each tagged with which wiki entries ground it.
6. Advisor prompt templates, one per voice. Each constrained to description (not recommendation) per Principle 4.2's describe-not-recommend constraint. Each grounded in specific corpus entries.
7. End-to-end test: a single full session (12–20 turns) without UI, just the simulation engine. Verify that state deltas compose correctly, that crises generate according to the anatomy, that advisor responses stay within their constrained role.

**Ship criteria.**

- The state model spec has been written and committed as a `mechanics/` entry. Every axis has visible/hidden layer definitions and corpus grounding.
- The interpretation grammar prompt is committed as a `mechanics/` entry with test cases.
- The grammar passes its own test cases: actual deltas match expected deltas within an orchestrator-defined tolerance.
- At least 8 crisis skeletons are committed, covering all four failure patterns.
- The 5 advisor voices have committed prompt templates grounded in specific corpus entries.
- An end-to-end text-only session completes without crashes, with collapse firing at the appropriate threshold for at least one mode.

**Case-study contribution.** *Establishes the mechanism.* The case-study claim that the model reads policy text in a state-sensitive way rests on the grammar. This phase is what makes the project different from a wiki viewer with a chat box.

## Phase 3 — Player experience and shareable artifact (MVP-0 surface)

**Scope.** The single-screen turn loop. The state dashboard with visible signals (public mood, elite posture, narrative tone, surface-level state — all unreliable by design). The crisis surface. The advisor interface. The shareable artifact generated from a run.

**Build order.**

1. UI direction note: visual principles, layout, typography. Inherited from the parent project's design discipline (`../metaviews-website/DESIGN.md`); the addition is the interactive surface for player input and visible signal display.
2. Single-screen turn loop: crisis displayed top, free-text input bottom, visible signals as a side rail. Mono for chrome, serif for prose. No gradients, no decorative AI styling.
3. Advisor interface: a sidebar of five voice icons. Clicking a voice opens a corpus-grounded response in that voice. The advisor response is visible to the player; the wiki grounding is not.
4. Visible signal layer: each axis contributes one or two visible signals, lagged or contradicted by design. The player has to read them critically.
5. Shareable artifact generator: a script that takes a run log and produces the artifact — narrative report, state trajectory, interpretive chain for load-bearing turns, grounding references, invitation to play.
6. Artifact template versioning: the artifact template is itself a wiki entry, versioned, so changes to the artifact's content shape are auditable.

**Ship criteria.**

- A player can complete a full session through the UI without crashes.
- The UI feels austere and operational, in the Metaviews register (visual design principles check).
- The visible signal layer is genuinely fragmented: at least one signal can be verified (against the hidden state) to lag, contradict, or mislead.
- The advisor interface produces grounded responses from all five voices, with each response visibly constrained to description (not recommendation) on review.
- The shareable artifact includes: narrative report, state trajectory, interpretive chain for at least the collapse turn, grounding references (wiki entry paths), and a play invitation framed by the run's content.
- The artifact can be shared as text or as a self-contained URL.

**Case-study contribution.** *Establishes the surface.* The case-study claim that runs are observable, versioned, citable rests on the artifact being real and shareable. This phase is what makes the project different from a research demo with no distribution.

## Phase 4 — Operator tooling and orchestrator workflow (MVP-0 operations)

**Scope.** The tooling the orchestrator uses to do the work described in `03-orchestrator-role.md`. Wiki ingestion from the parent Metaviews project. Wiki audit script. Run log aggregation. Pattern-review notebook. Model-version log.

**Build order.**

1. Wiki ingestion: a script that pulls new entries from the parent Metaviews project (or accepts proposals from outside), filters for corpus fit, and queues them for orchestrator review.
2. Wiki audit: inherited from the parent project, run regularly.
3. Run log format: structured records of every run — what the player wrote, what the model read, what state deltas resulted, what wiki context was retrieved, when collapse fired.
4. Pattern-review tooling: a notebook (or script) that aggregates runs, surfaces patterns, and supports before/after comparison for grammar refinements.
5. Model-version log: a structured record of every model change, with before/after comparison runs.

**Ship criteria.**

- A new orchestrator can pick up the role, read `03-orchestrator-role.md` plus this section's tooling, and run the wiki audit and pattern review without additional guidance.
- A wiki-ingest cycle from the parent project produces a draft proposal set that the orchestrator can review and accept/reject.
- Run logs are persisted for every session and are queryable.

**Case-study contribution.** *Establishes the audit trail.* The case-study claim that the project is build-and-tend, not ship-and-forget, rests on the orchestrator workflow being real and the audit trail being maintained. This phase is what makes the project different from a one-shot artifact.

## Phase 5 — First-run validation (MVP-0 launch)

**Scope.** Not a build phase — a validation phase. The first 20–30 real runs by players outside the development team, with orchestrator observation.

**Build order.**

- Orchestrator runs the game 5–10 times before external players, to surface obvious bugs and patterns.
- 20–30 external players run the game. Their runs are logged with consent.
- Orchestrator reviews aggregated patterns: are the three collapse modes (legitimacy collapse, technical collapse, narrative capture) firing at expected thresholds? Are all five advisor voices (frontier-lab, civil-society, state-security, open-source, international-ally) producing description-not-recommendation consistently? Is the artifact readable? Is the case-study framing legible in the artifact?
- Grammar refinements (Phase 2's grammar-refinement cycle) happen during this phase as patterns emerge.
- Wiki updates (Phase 1's wiki-curation cycle) happen as needed.

**Ship criteria.**

- At least 20 external runs complete without crashes.
- Aggregate collapse-mode distribution is roughly balanced across the three collapse modes (legitimacy collapse, technical collapse, narrative capture) — a strong skew would indicate a grammar bias.
- At least one player surfaces a meaningful surprise — a policy move the orchestrator did not anticipate, that produced a state delta worth examining. This is evidence the literacy claim is real, not staged.
- The orchestrator can defend the case-study claim: "here is what the model did, here is why, here is what the wiki said."
- The artifact is shareable and the play invitation produces new runs.

**Case-study contribution.** *Confirms or challenges the case-study claim.* If validation produces the surprises and patterns the claim requires, the project is a working case study. If it doesn't, the claim needs revisiting — the literacy work may still hold, but the case-study framing may need to be revised.

## Deferred — explicit out-of-scope for MVP-0

These are named so scope drift can be resisted. Each item names why it's deferred.

- **Multiplayer or shared runs.** The orchestrator's role is operator-side, not player-side. Single-player is sufficient to test the literacy claim; multiplayer would require designing interactions the orchestrator cannot curate.
- **Persistence between sessions.** Each run is its own run. Persistence raises questions about player progress, identity, and comparative scoring — each of which complicates the case-study framing without strengthening the literacy claim.
- **Public query or search interfaces over the wiki.** Per Principle 4.4, public-facing surfaces wait until retrieval is mature. The artifact's grounding references are the only public exposure of wiki content.
- **Policy domains other than AI.** The case-study focus is AI policy. Expanding domains would require re-curating the corpus, re-grounding the advisor cast, and revalidating the case-study framing — each a separate project.
- **Production-grade scaling.** MVP-0 is a working artifact for an audience that knows what it is, not a high-traffic public service. Engineering for scale is deferred until the artifact is shaped correctly.
- **Mobile-first design.** Desktop-first is the assumption for MVP-0. Mobile is deferred until the desktop experience is settled.

## Phases after MVP-0 — sketched, not committed

These are directions, not commitments. Each names the rough shape so future work has somewhere to land, but the phases themselves are not scheduled.

**MVP-1.** Wiki expansion with a larger corpus (100+ entries), a second policy domain as a parallel case study, and persistence between runs (player profiles, comparative scoring). The case-study framing would extend to "how does the same simulation read across policy domains?" — a stronger claim than MVP-0's.

**MVP-2.** A second player surface: a spectator or co-governor mode where one player observes another and the advisor function operates in dialogue. Multiplayer would require careful design to preserve the literacy claim (the advisor cast would need to expand to accommodate dialogue partners).

**Longer-term.** The project's wiki, if it grows enough, becomes a citable research artifact in its own right — a curated, dated, traceable knowledge base for AI policy analysis. The game is then a demonstration surface for the wiki; the wiki is the primary contribution. This is the trajectory of the parent Metaviews project, and Polycrisis may follow a similar arc.

## Sources for this document

- The vision document (`docs/00-vision.md`) — the project's two purposes, MVP-0 scope, and case-study framing.
- The design principles (`docs/02-design-principles.md`) — what design decisions must respect.
- The orchestrator role (`docs/03-orchestrator-role.md`) — what the orchestrator's day-to-day work is.
- The corpus synthesis (`docs/01-corpus-synthesis.md`) — what the corpus gives us, what the four failure patterns are, what the actor cast looks like.
- The parent Metaviews project's structure (`../metaviews-website/CLAUDE.md`) — the wiki discipline and operator tooling patterns to inherit.
