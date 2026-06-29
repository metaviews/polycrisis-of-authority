# Orchestrator handoff protocol

_What a new orchestrator does in the first week, what they read first, what they test, and what they verify before taking responsibility for ongoing curation. Read after `docs/03-orchestrator-role.md` and `docs/02-design-principles.md`._

This document is the meta-deliverable of Phase 4. The technical surface (wiki-audit, wiki-ingest, run-query, model-log) is complete. This doc is what a new orchestrator reads to use that tooling — and what they verify before their handoff is considered done.

The orchestrator-role doc (`docs/03-orchestrator-role.md`) describes *what* the role is and *why* the activities exist. This doc describes *how* a new orchestrator takes over the role in practice.

## The handoff in one sentence

A new orchestrator takes responsibility when they can: (a) read the wiki log and understand what has been done and why, (b) run the audit and the pattern review without additional guidance, and (c) articulate the project's case-study claim and the literacy claim in their own words.

## What to read first

A new orchestrator should read in this order. The order is dependency-driven: each doc grounds the next.

| order | doc | why |
|---|---|---|
| 1 | `docs/00-vision.md` | The project's two purposes (literacy claim + case-study claim), the MVP-0 scope, the build-and-tend posture. This is the *why*. |
| 2 | `docs/02-design-principles.md` | Principles 1–4. Especially 4.1 (build-and-tend), 4.2 (curated advisor cast), 4.3 (auditable grammar), 4.4 (public surfaces wait), 4.5 (operational prototypes as first-class). This is the *constraints*. |
| 3 | `docs/01-corpus-synthesis.md` | What the corpus gives us, what the four failure patterns are, what the actor cast looks like. This is the *substrate*. |
| 4 | `docs/03-orchestrator-role.md` | The six activities, the cadence, the tools, the succession section. This is the *role*. |
| 5 | `docs/04-roadmap.md` | Phase 1–5 ship criteria. What is "done" for each phase. This is the *plan*. |
| 6 | `wiki/index.md` | The current state of the curated wiki. One-line summaries of every entry. This is the *catalog*. |
| 7 | `wiki/log.md` | Append-only record of every orchestrator action. Start at the bottom and read up. This is the *history*. |
| 8 | `wiki/mechanics/state-axes.md`, `interpretation-grammar.md`, `crisis-anatomy.md`, `visible-signals.md`, `collapse-modes.md` | The core mechanics. The simulation's claims about itself. |

Reading the wiki log from bottom to top is the most important part. The log is the institutional memory; the principles doc explains *why* the activities exist, but the log shows *what was actually decided* and *what was observed*. A new orchestrator who has read the log knows the project's working assumptions.

## What to test

After reading, the new orchestrator should run the simulation enough times to develop intuition. The point isn't to play; it's to *feel* how the system responds.

| test | what it builds intuition for |
|---|---|
| Run `node src/sim/index-async.js --script scripts/player-script-default.txt` with the default script | A baseline run. The simulation runs end-to-end and produces a run log + artifact. |
| Run the interactive CLI (`node src/sim/interactive.js`) and play 3 turns writing your own policy | The literacy device in action. You see the visible-signal layer, not the hidden state. |
| Run the interactive CLI and choose the "easy mode" advisor for at least 2 turns | The describe-not-recommend constraint on advisors. |
| Run a 12-14 turn interactive session until collapse fires | What collapse feels like from the inside. The collapse-reveal section of the artifact is the pedagogical climax. |
| Run the same script twice with different models (change `.env` between runs) | The before/after shape of `node scripts/run-query.js grammar-refine`. |
| Read a completed artifact (`runs/<id>-artifact.md`) and identify which turn the collapse fired on | The interpretive chain. The wiki entries the model cited. The visible-vs-hidden gap. |

The new orchestrator should not test "until things work" — they should test *until the system is unsurprising*. The goal is intuition, not validation.

## What to verify before taking responsibility

The handoff is not done until the new orchestrator can run the following audit themselves and explain what each result means.

### Audit checklist

1. **Wiki audit passes.** `node scripts/wiki-audit.js` reports 0 schema issues, 0 missing indexed pages, 0 broken local links. The orchestrator should be able to explain what each of those categories catches and why it matters.
2. **Wiki proposals queue is reviewed.** `node scripts/wiki-ingest.js review` lists any pending proposals. The orchestrator should review each one and either accept (move to wiki/) or reject (mark as rejected) with a reason.
3. **Run logs are present and parseable.** `node scripts/run-query.js list` shows recent runs with the expected model. The orchestrator should be able to read a run log and trace a single turn's crisis → move → gloss → delta → state.
4. **Model-version log is current.** `node scripts/model-log.js current` shows the current `.env` model. `node scripts/model-log.js list` shows all recorded switches. The orchestrator should be able to read an entry and explain its judgment.
5. **Run-query tool works.** `node scripts/run-query.js pattern` produces an aggregate summary. The orchestrator should be able to interpret the outcome distribution, advisor usage, and signal-discrepancy hotspots.
6. **Review-notes skeleton works.** `node scripts/run-query.js review-notes --output /tmp/test-notes.md` produces a complete markdown skeleton. The orchestrator should review the skeleton's sections and confirm they cover the activities in `03-orchestrator-role.md`.
7. **Wiki log is the institutional memory.** Reading the bottom 10 entries of `wiki/log.md` (most recent) and the top 5 entries (initial), the orchestrator can identify: what was done, why, and what was learned. If they can't, the log is incomplete and the previous orchestrator should be re-engaged.

### What to verify about judgment (not just tooling)

The handoff is also a transfer of judgment, not just process. The new orchestrator should be able to:

- **Articulate the case-study claim in their own words.** The project is a case study of how a swappable LLM reads policy text in a state-sensitive way. Per Principle 1.2, the model is an orchestrator choice, not an implementation detail.
- **Articulate the literacy claim.** The player develops a working theory of how visible signals relate to hidden state by reading the signals critically and seeing the gap in the artifact's collapse reveal.
- **Defend the project against scope drift.** The deferred list in `docs/04-roadmap.md` (no multiplayer, no persistence, no public search, no other policy domains) is intentional. The new orchestrator should be able to explain why each item is deferred and what would have to change to un-defer it.
- **Recognize when a grammar refinement is a real correction vs. over-fitting.** Per Activity 2 in the orchestrator-role doc: "the grammar should not be over-fitted to player patterns — players finding novel uses of the system is a feature, not a bug." A new orchestrator should be able to look at a proposed grammar change and say whether it's targeting a systematic misreading or an occasional surprise.

## What to do in the first week

Concrete onboarding tasks. The new orchestrator does these in order.

| day | task |
|---|---|
| 1 | Read the eight "What to read first" docs in order. |
| 2 | Run the six "What to test" exercises. Read the run logs and artifacts produced. |
| 3 | Run the seven-item audit checklist. Note any issues. |
| 4 | Run `node scripts/wiki-ingest.js scan --days 30`. Review any new proposals. Accept or reject each. |
| 5 | Read the most recent 3 entries in `wiki/log.md` carefully. Run `node scripts/run-query.js pattern` against the runs they reference. Confirm you understand what was done and why. |
| 6 | Write a review notes file: `node scripts/run-query.js review-notes --output wiki/notes/<date>-first-week.md`. Fill in the "Notable surprises" and "Actions triggered" sections. Commit. |
| 7 | Update the wiki log with a "first week" entry. This is your first orchestrator action. |

The first-week review notes file is the auditable artifact of the handoff. If the previous orchestrator is unavailable for questions, the next orchestrator can be evaluated against the handoff protocol by reading that file.

## How to know the handoff is done

The handoff is done when the new orchestrator can answer these questions without referring to this doc:

1. What are the project's two purposes (the case-study claim and the literacy claim)?
2. What are the six state axes and which two contribute to each of the three collapse modes?
3. What is the visible-signal layer and what three regimes of fragmentation does it use?
4. What is the describe-not-recommend constraint on advisors and why does it matter?
5. What does the wiki audit check for, and what would you do if it reported a broken link?
6. What is the run-query `pattern` command's output and what would you look for first?
7. What is the model-version log's judgment field and what does "no-intervention" mean?
8. When is a grammar refinement appropriate vs. over-fitting?

If the new orchestrator can answer all eight, the handoff is done. If they can't, they should re-read the relevant doc and re-test.

## What the handoff does not do

A few things this protocol deliberately doesn't address:

- **It doesn't validate the previous orchestrator's work.** Validation is a separate activity; the audit checklist is the orchestrator's first-pass check, not a certification.
- **It doesn't hand off relationships.** If the new orchestrator needs context that isn't in the wiki, the previous orchestrator should be re-engaged. The protocol assumes the previous orchestrator is available for questions in the first week.
- **It doesn't cover emergency cases.** A run log that won't parse, a wiki entry that's been edited out, a model that's been deprecated — these are escalation cases, not onboarding. The new orchestrator's first action in such cases is to ask the previous orchestrator.
- **It doesn't replace the principles doc.** The principles are the load-bearing document; this protocol is the operational layer on top of them. A new orchestrator who has read the principles but not this doc can still do the work (slowly). A new orchestrator who has read this doc but not the principles is operating without foundations.

## Sources

- `docs/00-vision.md` — the project's two purposes
- `docs/02-design-principles.md` — the principles the handoff respects
- `docs/03-orchestrator-role.md` — the role description and activities
- `docs/04-roadmap.md` — phase ship criteria
- `wiki/log.md` — the institutional memory the handoff reads
- `wiki/mechanics/*.md` — the simulation's claims about itself

## Version history

- **1.0.0** (2026-06-29) — Initial handoff protocol. Authored per the roadmap's Phase 4 ship criterion 1: "A new orchestrator can pick up the role, read `03-orchestrator-role.md` plus this section's tooling, and run the wiki audit and pattern review without additional guidance."
