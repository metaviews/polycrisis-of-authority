# The Orchestrator Role

_Who tends the project, what they actually do, and what the role is not. Read after `02-design-principles.md`._

This document describes the orchestrator role: the ongoing, post-launch work of keeping the project alive as a literacy artifact and a case study. The principles doc (`docs/02-design-principles.md`) explains *what* the orchestrator's work is for. This doc explains *what the work actually is.*

The garden metaphor from the vision doc is the right frame. The orchestrator is the gardener. The wiki is the soil and the seed stock. The interpretation grammar is the bed shape. The advisor cast is what's planted. The player is the visitor. The orchestrator's job is to keep the garden growing in a way that produces what the project claims to produce.

## The role in one sentence

The orchestrator is the person (or small group) who curates the wiki, refines the interpretation grammar, curates the advisor cast, reviews aggregated player patterns, and tends the project's epistemic integrity over time.

The orchestrator's scope spans six state axes (legitimacy, fiscal slack, elite alignment, ecological debt, narrative coherence, capability frontier), three collapse modes (legitimacy collapse, technical collapse, narrative capture), and five advisor voices (frontier-lab, civil-society, state-security, open-source, international-ally) — each enumerated in the vision and roadmap docs. The orchestrator's activities apply across that whole surface, not to specific axes in isolation; this document is organized by *kind of work*, not by *which axis the work touches*.

## What the orchestrator actually does

The orchestrator's work falls into six recurring activities. Each is described with its trigger, its cadence, its inputs, its outputs, and the kind of judgment it requires.

The work described here is also informed by operational prototypes — probes against the model that evoke what the system feels like during design (Principle 4.5, Dancing with the Details in the Design). Prototype outputs become inputs to the activities below: a probe run might surface a grammar refinement (Activity 2), a wiki gap (Activity 1), a model-behavior observation worth filing (Activity 6). The orchestrator's prototyping is lightweight and integrated with the rest of the work, not a separate phase.

### 1. Wiki curation

**Trigger:** new source material becomes available (a Metaviews archive post is filed, a Pressure Systems edition is published, an external document is identified as relevant); a wiki entry is found to be inaccurate or out of date; a wiki entry is found to be missing.

**Cadence:** continuous for new material; weekly review of pending candidates; quarterly review of all existing entries for staleness.

**Inputs:** the Metaviews wiki ingest pipeline, the Pressure Systems signal pipeline, external source documents (news, policy papers, capability reports, model cards), player-pattern observations that suggest the corpus needs new material.

**Outputs:** new or revised wiki entries committed to the repo with a dated changelog entry; deferred candidates with reasons logged; obsolete entries marked for archival with the reason.

**Judgment required:** what counts as a corpus-worthy source. The principle is that every wiki claim traces to dated, citable, real material (Principle 2.2). The orchestrator's judgment is in selecting material that supports the game's analytical claims while remaining faithful to how the policy domain actually is, not how the model imagines it to be.

### 2. Grammar refinement

**Trigger:** player patterns reveal consistent interpretations that don't match the orchestrator's intent; a state axis responds in ways that don't track the corpus's account of how that axis actually works; a collapse threshold fires in cases that shouldn't have collapsed or fails to fire in cases that should have; the LLM provider releases a model version that meaningfully changes interpretation behavior.

**Cadence:** event-driven (when patterns emerge), not on a fixed schedule. The orchestrator should expect to refine the grammar multiple times during MVP-0's first month of operation and less frequently as patterns stabilize.

**Inputs:** aggregated run logs (interpretive chains from past runs), the wiki's relevant `mechanics/` entries, the corpus's relevant `concepts/` entries, direct comparison runs before and after a refinement.

**Outputs:** an updated grammar prompt committed to the repo with a dated changelog entry; before/after comparison notes; a brief note in the changelog explaining *why* the refinement was made and what behavior it corrects.

**Judgment required:** what behavior is interpretive drift vs. what behavior is the model doing exactly what the grammar asked. The grammar should not be over-fitted to player patterns — players finding novel uses of the system is a feature, not a bug. Refinements should target systematic misreadings, not occasional surprising ones.

### 3. Advisor cast curation

**Trigger:** the existing cast proves insufficient for a recurring crisis pattern; a new position in the policy domain emerges that the corpus documents and that the existing cast doesn't represent; an existing advisor's grounding in the corpus becomes stale or contested.

**Cadence:** rare. The MVP-0 cast (frontier-lab, civil-society, state-security, open-source, international-ally) is expected to be sufficient for MVP-0's crisis deck. Adding or removing advisors is a deliberate event, not a routine one.

**Inputs:** the wiki's existing corpus entries on the position being considered; the corpus's documentation of how that position has spoken publicly on AI policy; the orchestrator's judgment about whether the corpus supports a representative voice.

**Outputs:** a new `mechanics/advisors.md` entry (or a revision to the existing one) listing the new advisor, the position they represent, the corpus entries that ground them, and the orchestrator's reasoning for the addition; a dated changelog entry.

**Judgment required:** whether the corpus actually supports representing the position in a way that's faithful to it, or whether adding the advisor would amount to the orchestrator putting words in someone's mouth. If the corpus doesn't have material from the position, the position shouldn't be an advisor — at most, it can be a player-readable corpus entry.

### 4. Pattern review

**Trigger:** a meaningful number of runs have accumulated; a single run produces a surprising result that warrants inspection; a wiki or grammar change needs before/after comparison.

**Cadence:** monthly review of aggregated patterns. Surprise-driven reviews as needed.

**Inputs:** run logs (what players wrote, what the model read, what state deltas resulted, when collapses fired); the shareable artifacts of notable runs; the orchestrator's prior expectations.

**Outputs:** a brief notes file (committed to the repo) summarizing observed patterns, notable surprises, and any actions triggered (which may feed back into grammar refinement or advisor curation); no immediate changes to game code unless patterns warrant.

**Judgment required:** what counts as a meaningful pattern vs. noise. A few runs producing a particular outcome is anecdote; a consistent fraction producing it is signal. The orchestrator's job is to wait for signal before acting.

### 5. Model-version and provider response

**Trigger:** the LLM provider releases a new model version; the orchestrator switches the configured model via `.env`; behavior changes are observed under the new model that require wiki or grammar updates.

**Cadence:** event-driven.

**Inputs:** provider release notes; before/after comparison runs under the old and new models; the wiki's "observed model behaviors" subsections if any.

**Outputs:** a model-version log entry in the wiki recording the switch, the date, the reason, and any observed behavior changes; corresponding grammar or wiki updates if the behavior change warrants them.

**Judgment required:** when a model-version change requires a grammar update vs. when it just produces different but acceptable behavior. Both are observable outcomes of the case-study claim; only the first requires intervention.

### 6. Audit and integrity

**Trigger:** any of the above activities completes; a public-facing artifact is generated; a wiki entry is published that makes a load-bearing claim about the world.

**Cadence:** continuous. Every orchestrator action produces an audit record.

**Inputs:** the wiki's audit step (per the parent Metaviews project's `wiki-audit.js` discipline — every entry has source references, the schema is intact, citations resolve, page health is good); the project's git history (every change is committed with a message that names what changed and why).

**Outputs:** an audit-pass log entry after each wiki audit run; flagged integrity issues that require correction; the wiki log itself, which is append-only and publicly inspectable.

**Judgment required:** what integrity issues are worth flagging immediately vs. deferring. A broken citation needs same-day correction; a missing changelog entry can wait a day.

## What the orchestrator is not

The role has limits and they matter.

**The orchestrator is not the player.** The orchestrator does not play the game to win it or to demonstrate how to play it well. The orchestrator plays to test the system — runs with the intent of finding patterns, not of producing shareable artifacts (those are player output). An orchestrator's runs are operational, not pedagogical.

**The orchestrator is not the developer in the conventional sense.** Most of the orchestrator's work is curation, judgment, and refinement — not feature development. The orchestrator may commit code (especially to the grammar), but the orchestrator is not the person building new game mechanics, designing the UI, or shipping releases. Those roles are separate.

**The orchestrator is not the case-study author.** The case study emerges from how players interact with the simulation; the players are the authors. The orchestrator's role is to keep the conditions under which the case study can emerge intact. An orchestrator who tries to engineer specific outcomes has lost the case-study claim.

**The orchestrator is not the only possible curator.** The MVP-0 orchestrator is the project's principal maintainer. The role's design supports a small group of curators (2–4 people, with shared access to the wiki log and clear handoff protocols). It does not require a single individual.

**The orchestrator does not write the shareable artifact.** The artifact is generated from the run, by the system. The orchestrator's role is to keep the system capable of generating honest artifacts, not to write them.

## Tools the orchestrator works with

The orchestrator uses operator-side tooling. The orchestrator's interface with the project is the wiki, the grammar, the repo, and the audit log.

- **`wiki/`** — the curated knowledge base, browsable and editable as markdown files. The orchestrator reads entries, writes entries, reviews proposed entries from the wiki-ingest pipeline, and audits the wiki's integrity.
- **`wiki/log.md`** — the append-only audit trail. Every orchestrator action lands here with a date, a description, and a reference to the relevant files.
- **`scripts/wiki-audit.js`** (to be inherited from the parent project) — runs the wiki schema and citation check. Orchestrator runs this regularly.
- **Git history** — every change is a commit. The orchestrator reads commit history to understand what changed when and why.
- **Run logs** — the system's records of what players wrote, what the model read, and what state changes resulted. The orchestrator reviews these to find patterns.

The orchestrator does not have access to player-facing surfaces beyond what's publicly available. The wiki opacity-in-play principle (Principle 2.1) extends to the orchestrator's testing — the orchestrator experiences the system the way a player would.

## Cadence summary

| Activity | Trigger | Typical cadence |
|----------|---------|-----------------|
| Wiki curation — new entries | new source material | weekly |
| Wiki curation — staleness review | scheduled | quarterly |
| Grammar refinement | pattern-driven | event-driven, expect several in MVP-0 month one |
| Advisor cast curation | cast-insufficiency observed | rare; expect zero in MVP-0 |
| Pattern review | runs accumulated | monthly |
| Model-version response | provider release | event-driven |
| Audit | any change | continuous |

## Succession

The orchestrator role is ongoing. Any individual orchestrator is not. The role is designed to be handed off.

**What makes handoff possible:** every orchestrator action is logged. The wiki log is the institutional memory of the project. A new orchestrator can read the log and understand what has been done, why, and with what reasoning.

**What makes handoff hard:** judgment is not transferable from log alone. A new orchestrator needs to understand *the principles* (this is why `02-design-principles.md` exists), not just the actions. They need to play the system enough to develop intuition for it. They need to read the corpus enough to know what the wiki is claiming.

**MVP-0 handoff protocol:** the handoff protocol is documented in `docs/12-handoff-protocol.md` (Phase 4 cycle 4e). It covers what to read first, what to test, what to verify before taking responsibility, and what to do in the first week. The orchestrator-role doc remains the source of truth for *what* the role is; the handoff protocol is the operational layer for *how* a new orchestrator takes over.

## Sources for this document

- The vision document (`docs/00-vision.md`) — the build-and-tend posture, the case-study framing, the orchestrator's role as named there.
- The design principles (`docs/02-design-principles.md`) — what the orchestrator's work is for, especially Principles 4.1–4.4.
- The corpus synthesis (`docs/01-corpus-synthesis.md`) — the substrate the orchestrator works against.
- The parent Metaviews project's operator discipline (`../metaviews-website/CLAUDE.md`, `../metaviews-website/scripts/wiki-audit.js`) — the audit cadence and the wiki-as-source-of-truth pattern that the orchestrator inherits.
