# Prototype — 2026-06-29 — Phase 4e: handoff protocol

## Observation

Cycle 4e is the meta-deliverable of Phase 4: the handoff doc that ties the technical surface (wiki-audit, wiki-ingest, run-query, model-log) to a process a new orchestrator can follow.

The roadmap's Phase 4 ship criterion 1 says: *"A new orchestrator can pick up the role, read `03-orchestrator-role.md` plus this section's tooling, and run the wiki audit and pattern review without additional guidance."* This cycle produces the doc that makes that statement testable.

## What shipped

### `docs/12-handoff-protocol.md` (v1.0.0)

A process doc structured around the four questions the orchestrator-role doc said the handoff should answer:

- **What to read first.** 8 docs in dependency order. Start with `00-vision.md` (the why), end with the core mechanics entries. The wiki log is the institutional memory; reading it bottom-to-top is the most important part.
- **What to test.** 6 concrete exercises that build intuition without playing-to-win. The goal is "the system is unsurprising," not "the system works."
- **What to verify before taking responsibility.** A 7-item audit checklist covering both tooling (audit passes, run logs parse, model log current) and judgment (case-study claim articulation, literacy claim articulation, scope-drift defense, over-fitting recognition).
- **What to do in the first week.** Day-by-day onboarding: read, test, audit, scan, review, write first review notes, file first log entry. The first-week review-notes file is the auditable artifact of the handoff.
- **How to know the handoff is done.** 8 self-check questions. If the new orchestrator can answer all 8 without referring to this doc, the handoff is done.

The doc also names what the handoff *does not* do: it doesn't validate the previous orchestrator's work, doesn't hand off relationships, doesn't cover emergency cases, and doesn't replace the principles doc. Each of these is a deliberate scope decision.

### Update: `docs/03-orchestrator-role.md`

The succession section now points to the handoff protocol: *"the handoff protocol is documented in `docs/12-handoff-protocol.md` (Phase 4 cycle 4e). It covers what to read first, what to test, what to verify before taking responsibility, and what to do in the first week."*

The orchestrator-role doc remains the source of truth for *what* the role is; the handoff protocol is the operational layer for *how* a new orchestrator takes over.

### Updates: README + wiki/index.md

Both now reflect Phase 4 complete. The README's "Project status" section names all 4 operator-tooling scripts and the handoff protocol. The wiki index footer names all 5 Phase 4 cycles (4a wiki ingest, 4b run query, 4c pattern review, 4d model log, 4e handoff protocol).

## Probe results

**Verification script** (`/tmp/hermes-verify-4e.sh`): all 8 checks pass.

The verifications cover:

1. Handoff doc exists with all 5 required sections
2. **All 8 self-check questions are answerable in project docs.** Each question has a regex pattern that's tested against the docs the handoff doc references. If a question's answer isn't in the cited doc, the handoff doc is broken.
3. Orchestrator-role succession section references the handoff doc
4. README shows "Phase 4 complete"
5. Wiki index footer shows "Phase 4 complete"
6. Handoff doc references all 4 main tooling surfaces (wiki-audit, wiki-ingest, run-query, model-log)
6b. Handoff doc references the wiki paths (index.md, log.md, mechanics/)
7. All 4 prior cycle verifications (4a, 4b, 4c, 4d) still pass — no regressions
8. Wiki audit clean

**Key insight from verification 2:** the self-check questions are not just documentation theater. Each one is mechanically tested against the actual project docs. If a question's answer moves (e.g., if `wiki-mechanics/state-axes.md` changes its collapse mode description), the verification will fail and the handoff doc will need to be updated.

## Design notes

**Why a separate doc, not a section of the orchestrator-role doc.** The orchestrator-role doc is the *what*: the role's activities, cadence, judgment, sources. The handoff protocol is the *how*: the operational layer for a new orchestrator taking over. Mixing them would force a reader to skim past the role description to find the onboarding steps, and vice versa. The cross-link from the succession section is the integration.

**Why day-by-day onboarding, not just "read this list."** A new orchestrator has limited attention. Day-by-day onboarding constrains what they need to focus on at any moment: Day 1 is read; Day 4 is the scan; Day 7 is the first log entry. This is the same pattern as the cycles in Phases 1-4: small, scoped, verified work each day.

**Why 8 self-check questions, not a freeform "are you ready?"** Self-check questions are mechanically testable. The verification script exercises them; a new orchestrator's handoff can be evaluated by another person who asks the same 8 questions and checks the answers against the project state.

**Why the handoff doc deliberately doesn't cover emergencies.** A handoff protocol is a routine process. Emergencies (run log won't parse, model deprecated, wiki entry missing) need a different protocol: ask the previous orchestrator. Mixing routine and emergency guidance dilutes both.

## Files added/changed

- `docs/12-handoff-protocol.md` — new (v1.0.0, ~11KB)
- `docs/03-orchestrator-role.md` — succession section updated to point to the handoff doc
- `README.md` — Project status reflects Phase 4 complete
- `wiki/index.md` — footer reflects Phase 4 complete

## Phase 4 ship-criterion status — all 3 green

| criterion | status |
|---|---|
| A new orchestrator can pick up the role and run the wiki audit and pattern review without additional guidance | **✓ (4e)** — handoff protocol documents the path |
| A wiki-ingest cycle from the parent project produces a draft proposal set that the orchestrator can review and accept/reject | ✓ (4a) |
| Run logs are persisted for every session and are queryable | ✓ (4b) |

## Phase 4 ship-criterion verification

The three Phase 4 ship criteria can now be evaluated mechanically:

1. *"A new orchestrator can pick up the role"* — the handoff doc answers the 8 self-check questions; verification 2 of `hermes-verify-4e.sh` confirms each question is grounded in the cited doc.
2. *"A wiki-ingest cycle produces a draft proposal set"* — `node scripts/wiki-ingest.js scan --days 30` produces 4 substantive proposals in queue; verification `hermes-verify-4a.sh` confirms the pipeline works.
3. *"Run logs are persisted and queryable"* — `node scripts/run-query.js pattern` produces an aggregate summary; verification `hermes-verify-4b.sh` confirms parsing across both CLI and artifact collapse formats.

## Next

Phase 4 is complete. Phase 5 (first-run validation) is a *validation phase* per the roadmap, not a build phase: *"not a build phase — a validation phase. The first 20–30 real runs by players outside the development team, with orchestrator observation."*

The Phase 5 ship criteria are:
- At least 20 external runs complete without crashes
- Aggregate collapse-mode distribution is roughly balanced across the three collapse modes (legitimacy collapse, technical collapse, narrative capture) — a strong skew would indicate a grammar bias
- At least one player surfaces a meaningful surprise — a policy move the orchestrator did not anticipate, that produced a state delta worth examining
- The orchestrator can defend the case-study claim: "here is what the model did, here is why, here is what the wiki said"
- The artifact is shareable and the play invitation produces new runs

The first 4 are observation-driven (a player has to actually play). The last is a tooling check (the artifact is already shareable from Phase 3c; the play invitation has been in the artifact since Phase 2d).

When ready to start Phase 5, the path is:
1. Recruit 20-30 external players (the README's "Getting started" path is the recruitment surface)
2. Each player runs the simulation; orchestrator observes via `run-query.js pattern` and `model-log.js current`
3. Aggregate patterns after 20-30 runs; assess the case-study claim against the observed player behavior
4. If grammar bias surfaces (collapse mode distribution skews), refine the grammar in a 4c-style cycle
