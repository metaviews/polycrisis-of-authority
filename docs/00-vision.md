# Vision — Polycrisis of Authority

_The root document. Everything in this repository assumes what is written here. Read this first._

## What this project is

Polycrisis of Authority is a simulation game in which the player begins already in power and must govern through a constant stream of overlapping crises. Policy is written in the player's own words. The world speaks back through fragmented, unreliable signals — public mood, elite alignment, narrative coherence — while deeper conditions shift out of sight. There is no victory, only duration. The game ends when authority collapses, often suddenly, after a long period in which the player's decisions seemed reasonable, even effective.

The game runs on an LLM, against an LLM-wiki that is itself grounded in real, curated, dated, citable source material about AI policy and the broader politics of authority. The wiki evolves with the policy domain and with how the game is played. A run produces a shareable artifact — a report on the player's governance — that is legible as an AI policy artifact in its own right, not just a game score.

This is not a finished game and not a frozen artifact. It is a build-and-tend project: a garden. The wiki is the soil; the corpus is the seed stock; the orchestrator is the gardener; the player is the visitor who walks through and takes something away.

## Two purposes, in priority order

The project serves two purposes, and the design must serve both. They are not separable in practice but they are distinguishable in design.

### Primary purpose — edutainment

The project is edutainment. The literacy claim is that playing the game gives the player a felt encounter with the complexity of policy and the randomness of politics — a modestly increased awareness, not a curriculum. The player walks away with a slightly more humbled sense of how policy actually works under pressure, because they tried to govern and felt the complexity in their hands.

The case-study framing (the project's secondary purpose, below) is the more rigorous claim: the project is a controlled setting in which to observe the interpretive behavior of language models. The literacy claim is the *experience* that makes the case-study worth running.

The literacy claim is bounded. The game does not teach AI policy. It does not teach transferable competence in governance. What it offers is a *modest* increase in awareness of how complex policy is, delivered through an experience the player wants to have again. The design goal is that the experience be enjoyable enough to be worth re-entering and worth sharing, *and* that re-entering and sharing be the way the modest literacy happens.

**Design aspirations.** The following claims describe what the project aims to support, not what it has measured. They are aspirations the design works toward; whether any given player's run lands on any of them is not guaranteed. The aspirations are:

- Policy is a tool whose effects depend on the conditions it enters into, not the intentions behind it. The same words in different states produce different outcomes.
- Authority is sustained by multiple sources at once — public mood, elite alignment, narrative coherence, material capacity, ecological conditions, capability frontiers. These erode unevenly. Collapse is rarely total until very late.
- The visible surface of a policy regime is rarely where its consequential decisions live. Crises that look technical are often legitimacy crises; crises that look legitimacy-driven are often capability-driven.
- Language is load-bearing. The way a policy is written matters to what it does. This is true in real governance and it is true in the simulation; the simulation makes it legible by being legible itself.
- Governance happens in the presence of multiple positions, not in a vacuum. A policy move is also a choice about whose advice to take, whose framing to adopt, whose warning to discount. The in-play advisor function makes this legible by surfacing real, corpus-grounded positions the player can weigh or reject.

**What the game does NOT claim to teach:**

- The factual content of any specific AI policy debate. The game uses AI policy as a domain; it is not a substitute for engagement with that domain on its own terms.
- That any particular governance outcome is right or wrong. The game is diagnostic, not prescriptive.
- That players will become better at governing in real life. The game teaches texture and relationship, not transferable competence.
- That the literacy aspirations above will land in any given session. They are design goals, not guarantees.

**What the litmus test for the design looks like.** The literacy claim is satisfied when a player finishes a run and wants to start another. If the experience is informative but joyless, the claim has failed, regardless of whether the aspirations above are supported. The design must serve both the literacy surface and the pleasure of engaging with it (see Principle 6 in `02-design-principles.md`).

### Secondary purpose — showcase the capabilities and unpredictability of LLMs

The game is also a case study in what language models do. The literacy device works by making the interpretive gap between player intent and system response visible. The case study works by making the interpretive *behavior of the model itself* visible — across runs, across model versions, across policy domains.

The analogy the project draws is this: just as the language of politics is the substance of politics, the language of LLMs — the way they read, the way they respond, the way they fail to respond — is the substance of LLMs. The game is a controlled setting in which to observe that language in action.

The case study claim is bounded too. The project is one artifact among many. It does not claim to settle questions about LLM behavior; it claims to make those questions more legible, by building a system in which the model's behavior is observable, citable, versioned, and swappable.

## The build-and-tend posture

This is not a ship-and-forget project. It is a build-and-tend project.

What that means concretely:

- **The wiki evolves.** New source material enters; entries are revised when the policy domain shifts or when player patterns reveal something the wiki should formalize. Updates are versioned, logged, and auditable.
- **The grammar evolves.** The interpretation grammar — the mechanism by which player policy text becomes state deltas — is the orchestrator's most active design surface. It gets refined in response to what actually happens in play.
- **The orchestrator role is real.** Someone (initially the project's principal maintainer) tends the garden: curates the wiki, refines the grammar, reviews aggregated player patterns, decides what to formalize and what to leave emergent. The role is ongoing, not transitional.
- **The shareable artifact is the bridge between runs and the wiki.** Patterns observed in runs inform wiki updates. Wiki updates change the interpretation in subsequent runs. The loop is intentional.

The garden framing is not decorative. It implies that the project's value compounds over time as the wiki and grammar are tended, not that it decays. The opposite of a ship-and-forget artifact.

## MVP-0 — what we are building first

The minimum viable version is small on purpose. It exists to test whether the design claims hold up under actual play.

**In scope for MVP-0:**

- A single-player, no-persistence, single-session game loop.
- Six state axes — five core (legitimacy, fiscal slack, elite alignment, ecological debt, narrative coherence) plus one AI-specific (capability frontier). Each axis has a visible signal layer and a hidden threshold layer.
- Three collapse modes — legitimacy collapse, technical collapse, narrative capture collapse — each producing a distinct post-game reveal.
- An interpretation grammar that resolves free-text policy input into state-vector deltas, grounded in a wiki built from a curated subset of the Metaviews archive.
- An in-play advisor function — a small cast of corpus-grounded voices (e.g. frontier-lab, civil-society, state-security, open-source, international-ally) the player can consult before writing their policy. Advisors describe how their represented position sees the crisis; they do not recommend actions. The function is a literacy scaffold, not an answer-giving device.
- A shareable artifact that reports on the player's run as an AI policy artifact and invites further play.
- A wiki built from a curated corpus of ~60–100 source documents (Metaviews posts and signals) plus game-specific entries that make the game's own claims auditable.
- Operator tooling minimal but real — at minimum the ability to inspect, audit, and update the wiki.

**Out of scope for MVP-0 (explicit):**

- Persistence between sessions. Each run is its own run.
- Multiplayer or shared runs. The orchestrator's role is operator-side, not player-side.
- Public query or search interfaces over the wiki. The wiki is internal/transparent-in-artifact, not a public knowledge base.
- Policy domains other than AI. The case study focus is AI policy; expanding to other domains is post-MVP.
- Production-grade scaling. MVP-0 runs as a working artifact for an audience that knows what it is, not as a high-traffic public service.
- Mobile-first design. Desktop-first is the assumption.

## The case-study framing — what is and isn't being claimed

The project is being developed as part of a showcase for the MiniMax community, using the MiniMax M3 model. That framing matters and constrains several decisions.

**What the case study claims:**

- That an LLM-wiki grounded in curated, dated, citable material produces a different (and more legible) simulation than an LLM operating on prior alone.
- That the interpretive gap between player intent and system response is the load-bearing literacy device, and that this gap is observable and versionable.
- That the choice of model is an orchestrator choice, expressed in `.env` and visible in the shareable artifact. The project is a study in *what the model does*, not *how the model is built*.

**What the case study does NOT claim:**

- That MiniMax M3 (or any specific model) is the right model for AI policy simulation. The model is swappable; the project claims something about the *category* of behavior, not the specific instance.
- That the project's results generalize beyond the AI policy domain. The domain is a focused case, not a benchmark.
- That the project, by itself, demonstrates anything about the broader question of how LLMs handle language. It is one artifact in a larger conversation.

## Reading order for new contributors

1. This document (`docs/00-vision.md`).
2. `docs/01-corpus-synthesis.md` — what the Metaviews archive gives us.
3. `docs/02-design-principles.md` — the principles any design decision should respect.
4. `docs/03-orchestrator-role.md` — the ongoing work of tending the project.
5. `docs/04-roadmap.md` — what ships in MVP-0, what comes next.
6. Forthcoming docs on state model, interpretation grammar, crisis anatomy, and the shareable artifact.

## Sources this vision draws on

- The one-paragraph brief that initiated the project (this conversation).
- The Metaviews corpus, especially the CIA Framework for Authority, the algorithmic-authority and AI-and-power-dynamics themes, and the recent Pressure Systems signals. See `docs/01-corpus-synthesis.md`.
- The design tradition of the parent Metaviews project — austere, archival, operational. See `../metaviews-website/PROJECT.md` and `../metaviews-website/DESIGN.md`.
