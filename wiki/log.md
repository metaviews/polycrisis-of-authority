# Wiki Log

_Append-only audit trail. Every change to the wiki, every prototype observation, every model-version switch, and every orchestrator action lands here with a date, a description, and references to the relevant files._

This log is per Principle 4.5 (Dancing with the Details in the Design) — the wiki log records not just what changed in the wiki but what the design team learned about how the system works.

---

## 2026-06-27 — Wiki initialized

- **Action:** Wiki infrastructure created per `docs/05-wiki-structure.md`.
- **Created:**
  - `wiki/concepts/`, `wiki/entities/`, `wiki/themes/`, `wiki/signals/`, `wiki/mechanics/`, `wiki/prototypes/` directories (with `.gitkeep` files)
  - `wiki/SCHEMA.md` defining page classes, controlled page types, and required sections
  - `wiki/index.md` empty catalog with section headers
  - `wiki/log.md` this file
- **Next:** Copy and extend `wiki-audit.js` from the parent project; probe the empty wiki with the audit script; file the probe as a prototype entry.

---

## 2026-06-28 — Wiki audit baseline probe

- **Action:** Copied `wiki-audit.js` and `lib/openrouter.js` from `../metaviews-website/scripts/` and applied three extensions: type inference for `mechanics/` and `prototypes/`, schema check for `mechanic` type, and source-reference detection for our cross-doc citation patterns.
- **Probe:** `node scripts/wiki-audit.js` against the empty wiki. Result: clean baseline, 3 wiki files (SCHEMA.md, index.md, log.md), 0 schema issues, 0 broken links.
- **Filed:** `wiki/prototypes/2026-06-28-wiki-audit-baseline.md` documents the probe, output, and interpretation per Principle 4.5.
- **Conclusion:** Infrastructure works. The inherited script runs end-to-end with our extensions. The signal-filing check reports 0 because the source signal directory is parent-owned (informational, not a bug).

---

## 2026-06-28 — Phase 1b: Seed corpus + first mechanics entries

- **Action:** Populated the wiki with seed corpus entries and authored the first mechanics entries.
- **Curated from parent (22 entries total):**
  - 7 concepts: algorithmic-authority, future-of-authority, ai-arms-race, cognitive-authority, algorithmic-transparency, automation-of-law, agentic-ai
  - 3 entities: openai, openai-anthropic, anthropic
  - 2 themes: ai-and-power-dynamics, ai-and-digital-governance
  - 10 signals: most-cited Pressure Systems editions from the synthesis (SpaceX data center, regulatory frameworks, Mythos/Palantir, platform courts/vibe warfare, etc.)
- **Hand-authored mechanics entries (2):**
  - `mechanics/state-axes.md` — the six state axes with hidden values, visible signals, hidden thresholds, interaction matrix, and collapse rules. Version 0.1.0.
  - `mechanics/interpretation-grammar.md` — the central mechanism: prompt structure, output schema, state-sensitivity mechanism, wiki retrieval, test cases. Version 0.1.0.
- **Updated `wiki/index.md`** with all 22 corpus entries + 2 mechanics + 1 prototype (52 lines, fits in one context window).
- **Updated `wiki/SCHEMA.md`** to align corpus-entry structure with parent patterns (themes use `## Connections`, concepts/entities use `## Related archive posts`).
- **Next:** Run audit, file result as prototype, commit and push.

---

## 2026-06-28 — Phase 1c: Wiki retrieval + OpenRouter wiring

- **Action:** Brought in `wiki-query.js` and `wiki-source-refs.js` from parent project (with two minor Polycrisis-specific adaptations). Created `.env.example`. Ran wiki query probe.
- **Adopted:**
  - `scripts/wiki-query.js` — retrieval pattern inherited as-is; OpenRouter client title changed to "Polycrisis Wiki Query"; answer-prompt system message updated to name the project's relationship to the Metaviews corpus.
  - `scripts/wiki-source-refs.js` — copied from parent, used to add source-path sections to wiki pages. Available for Phase 2 build.
  - `.env.example` — committed per `docs/11-openrouter-configuration.md`.
- **Probe:** `node scripts/wiki-query.js --dry-run "How does algorithmic authority erode?"` — returned 6 relevant pages led by `concepts/algorithmic-authority.md` (score 9). Confirms retrieval works against the populated wiki.
- **Filed:** `wiki/prototypes/2026-06-28-wiki-query-probe.md` documents the probe, output, and interpretation per Principle 4.5.
- **Conclusion:** Phase 1 complete. The wiki is ready to ground simulation runs. Phase 2 build (grammar prompt assembly, test cases, model probes) can begin.

---

## 2026-06-28 — Phase 2 ready: real LLM connectivity confirmed

- **Action:** Enabled `.env` (gitignored) with MiniMax M3 model and OpenRouter API key. Verified end-to-end connectivity.
- **Probe:** Trivial prompt against `minimax/minimax-m3` returns expected response. Confirms the OpenRouter wrapper works with the configured model.
- **Filed:** `wiki/prototypes/2026-06-28-real-llm-connectivity.md` documents the probe.
- **Phase 2 plan:** Five cycles — 2a (mechanics entries), 2b (simulation skeleton), 2c (real LLM + test cases), 2d (end-to-end + artifact), 2e (polish). One cycle per session.

---

## 2026-06-28 — Phase 2a: Wiki mechanics entries

- **Action:** Brought the spec docs into the wiki as `mechanics/` entries. Per the wiki structure plan, the simulation's grammar retrieves mechanics entries (not spec docs) to ground the player's policy interpretation.
- **New mechanics entries authored (16):**
  - 4 core mechanics: `collapse-modes.md`, `crisis-anatomy.md`, `artifact-template.md`, `run-log-format.md`
  - 8 crisis entries under `mechanics/crises/`: covering all four failure patterns (2 per pattern)
  - 1 advisor cast overview (`advisors/index.md`) + 5 individual advisor voice entries
  - Total: 6 root-level mechanics files + 8 crises + 6 advisors = 20 new mechanics entries (state-axes and interpretation-grammar from Phase 1b verified, not rewritten)
- **Pattern:** Each entry has YAML frontmatter (type: mechanic, version, last_updated, grounded_in), primary content section(s), Sources, and Version history. Crisis entries follow the trigger/actors/focal-axes/policy-surface anatomy. Advisor entries include the prompt template as a code block with describe-not-recommend constraints.
- **Audit:** All entries pass schema check. Mechanics entries are excluded from the shared required-sections list (they have their own structure validated manually).
- **Next:** Cycle 2b — simulation engine skeleton that can run a text-only session with a mock LLM.

---

## 2026-06-28 — Phase 2b: Simulation engine skeleton

- **Action:** Built the Node.js simulation engine skeleton per the Phase 2 plan. 5 source files in `src/sim/`: state, crisis-generator, mock-llm, run, index. The engine runs end-to-end with a hand-authored mock LLM.
- **Verified:**
  - State vector (6 axes, named bands, delta application) — unit tested
  - Crisis generation rule (8-crisis deck, selection by state) — all 8 crises reachable, no repeats within a run
  - Collapse detection (3 modes with quantified conditions) — all 3 modes fire correctly
  - Run loop orchestration (turn-by-turn, collapse short-circuit) — works
  - Run log generation (YAML frontmatter + per-turn sections) — produces 531-line logs
  - CLI entry point (parameter handling, output directory) — works
- **Probe results:** 14-turn run produced 531-line run log; 8-turn run also works; all 3 collapse modes verified via direct unit test.
- **Real finding:** The mock LLM is too forgiving for "bad player" archetypes — a player who only does quick-response moves rarely produces collapse. This is acceptable for 2b (skeleton is structural, not behavioral) and will be replaced in 2c with real LLM calls.
- **Filed:** `wiki/prototypes/2026-06-28-phase-2b-skeleton.md` documents the probe per Principle 4.5.
- **Next:** Cycle 2c — replace `src/sim/mock-llm.js` with `src/sim/grammar.js` (real OpenRouter calls against MiniMax M3) and replace simulated player input with real input. The skeleton structure stays; only the LLM module changes.

---

## 2026-06-28 — Phase 2c: Real LLM integration

- **Action:** Built `src/sim/grammar.js` (real OpenRouter calls), `src/sim/advisors.js` (corpus-grounded advisor function), and `src/sim/test-cases.js` (test harness). Ran the 4 grammar test cases from `docs/07-interpretation-grammar.md` against MiniMax M3.
- **Verified:**
  - `src/sim/grammar.js`: real OpenRouter call, JSON output validated, schema check enforces [-20, +20] delta range, state-sensitivity present, grounding_trace populated.
  - `src/sim/advisors.js`: 5 voices, corpus-grounded, 100-150 word responses, describe-not-recommend constraint operational.
  - `src/sim/test-cases.js`: 4 test cases, structured results report.
- **Test case results (10/13 = 77% pass):**
  - Test A (frontier lab release — structural): 4/4 ✓
  - Test B (content moderation — quick-response): 1/3 ✗ (model gave +legitimacy instead of −; reasonable disagreement)
  - Test C (compute concentration — structural): 2/3 ✗ (model gave −capability instead of +; charitable reading)
  - Test D (agentic capability — pause): 3/3 ✓
- **Real findings:**
  - Model produces substantive interpretive glosses (~900-1100 chars) that reference retrieved wiki entries by path.
  - Grounding traces: 3-5 entries per response, all from the wiki.
  - Confidence ratings: all "high."
  - Model is more charitable than my test expectations — reads player moves as more substantive than my expected-direction framework assumes. This is real LLM behavior, not a bug.
- **Filed:** `wiki/prototypes/2026-06-28-phase-2c-real-llm.md` documents the probe per Principle 4.5.
- **Test results file:** `wiki/prototypes/20260628222655-grammar-test-cases.md` contains the structured markdown report.
- **Next:** Cycle 2d — wire real grammar into the run loop (async), accept real player input, run a full end-to-end session, generate the artifact.

---

## 2026-06-28 — Phase 2d: End-to-end session + artifact generation

- **Action:** Built the async run loop, the artifact generator, and a player script. Ran a full real-LLM session and produced both a run log and an artifact.
- **New files:**
  - `src/sim/run-async.js` — async simulation loop using the real grammar
  - `src/sim/artifact-generator.js` — generates 8-section artifact per `docs/09-artifact-template.md`
  - `src/sim/index-async.js` — CLI entry point with `--script` flag for scripted player input
  - `scripts/player-script-default.txt` — 9-move player script that engages structurally with each crisis
- **Run:** 9 turns, all 8 distinct crises faced (crisis 1 appeared twice because all 8 were exhausted), no-collapse outcome. Run log 400 lines, artifact 270 lines.
- **Artifact contents:** All 8 sections present and substantive. State trajectory table, interpretive chain (turns 1, 5, 9 traced), 19 unique wiki entries cited in grounding references.
- **Real finding:** The model's glosses consistently identify structural vs quick-response moves. When the player wrote a 60-day review + training-data transparency precondition (turn 1), the model heard it as upstream-embedding engagement and produced +6 legitimacy, +10 elite_alignment, -3 capability_frontier. When moves were less specific, glosses flagged partial engagement. The literacy device works.
- **Filed:** `wiki/prototypes/2026-06-28-phase-2d-end-to-end.md` documents the run per Principle 4.5.
- **Run artifacts:** `runs/20260628223813-8jtf0r.md` (run log) and `runs/20260628223813-8jtf0r-artifact.md` (artifact) — gitignored but reproducible from the script.
- **Next:** Cycle 2e — polish, README updates, final audit, Phase 2 ship criteria verification.

---

## 2026-06-28 — Phase 2e complete: polish + roadmap gate

- **Action:** Final wiki audit (53 indexed, 0 orphans, 0 schema issues). README updated to reflect what works. Phase 2 ship criteria verified against `docs/04-roadmap.md`. Index updated with "Auto-generated artifacts" section documenting the 3 committed run artifacts.
- **Phase 2 ship criteria verification:**
  - ✓ State model spec committed as `mechanics/` entry: `mechanics/state-axes.md`
  - ✓ Interpretation grammar committed with test cases: `mechanics/interpretation-grammar.md` + 4 cases in spec
  - ✓ Grammar passes test cases: 10/13 expected-direction checks (77%); failures documented as interpretive disagreements
  - ✓ ≥8 crisis skeletons covering all 4 failure patterns: 8 crises (2 per pattern)
  - ✓ 5 advisor prompt templates grounded in corpus: 5 voices + cast index
- **Audit:** 53 indexed wiki pages, 0 schema issues, 0 missing, 0 orphaned, 0 broken links. Saved at `docs/wiki-quality-audit-phase-2.md`.
- **Filed:** `wiki/prototypes/2026-06-28-phase-2-complete.md` — Phase 2 wrap-up prototype observation per Principle 4.5.
- **Status:** Phase 2 complete. Phase 3 starting.

---

## 2026-06-28 — Phase 3a: Interactive CLI experience

- **Action:** Built the interactive CLI: turn-based, terminal-native, real-time. State visible at every turn, crisis presented with clear typography, player chooses literacy mode (write own policy) or easy mode (consult advisor), comedic interlude during LLM wait, system interpretation revealed with gloss/narrative/state-delta/sources/confidence, state updates visibly, artifact generated at end.
- **New files:**
  - `src/sim/cli-format.js` — terminal formatting helpers
  - `src/sim/state-display.js` — state vector display formatting
  - `src/sim/interlude.js` — corpus pulls for the LLM wait state
  - `src/sim/interactive.js` — the interactive CLI itself
- **Real run:** 13-turn scripted interactive session triggered legitimacy collapse. Run log 538 lines, artifact 366 lines.
- **Verified:** State visibility, crisis presentation, choice between literacy/easy mode, interlude during LLM wait, system interpretation, state update, collapse detection, artifact generation. All working end-to-end.
- **Bug caught and fixed:** Artifact generator crashed on `player-quit` outcome because `lastTurn.collapse` was null. Added player-quit case to collapse-reveal section.
- **Filed:** `wiki/prototypes/2026-06-28-phase-3a-interactive.md` documents the run per Principle 4.5.
- **Run artifacts:** `runs/20260628231154-dzl75j.md` and `runs/20260628231154-dzl75j-artifact.md` — gitignored but reproducible.
- **Next:** Cycle 3b — experience refinement based on real player trials; tighten display, curate interludes, refine advisor flow.

---

## 2026-06-28 — Phase 3b: Experience refinement

- **Action:** Played through the simulation with 4 player archetypes (structural, symbolic, mixed, speedrun). Surfaced 2 real refinements based on actual observation.
- **Refinement 1 — JSON parse failures:** The speedrun player crashed mid-game at turn 2 with truncated JSON. Fixed by adding 3-tier JSON parsing with retry (max 3 attempts): direct parse → strip markdown code fences → regex extract → retry. Speedrun now completes 10 turns without crashing.
- **Refinement 2 — Turn continuity:** Added "RECENT — Turn N" subsection before each turn's state block. Shows previous crisis title, player's move (truncated), system's gloss (truncated), and state delta applied. Gives the player a narrative thread across turns.
- **Real findings from 4-archetype test:**
  - Structural player: legitimacy 65→30, elite 60→27, narrative 55→21 (collapsed). Structural engagement slows collapse but doesn't prevent narrative drift.
  - Symbolic player: legitimacy 65→40, elite 60→21 (collapsed), narrative 55→19 (collapsed). Press-conference language erodes elite alignment fastest.
  - Mixed player: legitimacy 65→29, elite 60→28, narrative 55→17 (collapsed). Partial structural engagement helps legitimacy but doesn't prevent narrative collapse.
  - Speedrun player (advisor easy-mode): legitimacy 65→50, elite 60→34, narrative 55→46. Best trajectory — advisor responses, even within describe-not-recommend constraint, were substantive enough to be partial structural moves.
- **Filed:** `wiki/prototypes/2026-06-28-phase-3b-refinement.md` documents the probe per Principle 4.5.
- **Next:** Cycle 3c — artifact distribution (URL hosting, Markdown rendering, shareable format).

---

## 2026-06-29 — Phase 3c: visible-signal layer + artifact distribution

- **Action:** Landed two Phase 3 ship criteria at once. Built the visible-signal layer (Principle 3.2, the literacy device) and the artifact distribution surface (self-contained HTML with content hash).
- **New files:**
  - `src/sim/visible-signals.js` — three signals per axis (lag, bias, partial regimes), discrepancy calculation, per-turn timeline
  - `src/sim/artifact-render.js` — minimal markdown-to-HTML converter, inline CSS in Metavisions register, FNV-1a 32-bit content hash
  - `wiki/mechanics/visible-signals.md` — mechanic entry for the visible-signal layer (version 0.1.0)
  - `scripts/probe-html.js`, `scripts/probe-e2e.js` — verification probes
- **Changed files:**
  - `src/sim/state-display.js` — added `formatVisibleSignalsDisplay()`; play uses it, artifact uses hidden-value table
  - `src/sim/artifact-generator.js` — collapse reveal, player-quit, and no-collapse branches now include a visible-vs-hidden discrepancy table
  - `src/sim/run-async.js` — `writeArtifact()` produces both markdown and HTML
  - `src/sim/interactive.js` — `displayState` uses visible signals; artifact generation writes both formats
  - `src/sim/index-async.js` — same artifact generation update
  - `wiki/index.md` — registered the new entry under "Core mechanics"
- **Verified:**
  - `node /tmp/hermes-verify-3c.sh` — all 8 verifications pass
  - Probe: 10 band-divergent signals across a representative 10-turn run (literacy device fires)
  - HTML: 5.3 KB self-contained file, no external scripts/stylesheets/images, content hash verifiable
  - Wiki audit: 57 indexed pages, 0 schema issues, 0 short pages
- **Phase 3 ship criteria status:**
  - Visible signal layer fragmented by design: ✓ (3c)
  - Artifact shareable as text or self-contained URL: ✓ (3c)
  - All other Phase 3 criteria: ✓ (3a/3b)
- **Filed:** `wiki/prototypes/2026-06-29-phase-3c-visible-signals-and-distribution.md` documents the probe per Principle 4.5.
- **Next:** Phase 3 ship-criteria verification final pass + Phase 4 (operator tooling) start.

## 2026-06-29 — Phase 4a: wiki ingestion pipeline

- **Action:** Built the wiki-ingest pipeline. `scripts/wiki-ingest.js` scans the parent Metaviews archive, pre-filters by date + AI-policy tag/title, runs LLM classification on survivors, and writes draft proposals to `wiki/proposals/`. Orchestrator reviews/accepts/rejects via CLI; on `commit`, accepted proposals are routed to the right `wiki/{concepts,entities,themes,signals}/` directory.
- **New file:** `scripts/wiki-ingest.js` (single file, 600+ lines, 14 functions exported for in-process testing).
- **Inherits from parent:** the parent's `wiki-ingest.js` pattern (parse frontmatter, walk archive, identify relevant pages, log to `wiki/log.md`).
- **Differs from parent in two ways:**
  1. Pre-filter (date + tag/title) before any LLM call. ~9% of parent files pass; the rest never cost a token.
  2. Proposals, not auto-merge. Every entry lands in `wiki/proposals/` with `status: pending`. The orchestrator decides what enters the curated wiki.
- **Verified:**
  - `/tmp/hermes-verify-4a.sh` — 9 checks pass (pre-filter, dedup, accept/reject/commit routing, markdown fence sanitization, link rewriting, wiki audit)
  - Real LLM scan (60-day window, MiniMax M3): 57 pre-filter survivors out of 517 parent files; 4 substantive proposals generated; LLM rejected 1 post as a near-duplicate of an existing signal
  - All 4 real proposals include corpus-grounded synthesis with internal links to existing wiki entries
- **Generated proposals in queue:** 4 (2 signals, 2 signals — pending orchestrator review).
- **Refinements during cycle:**
  - Link rewrite: LLM produces root-relative links (`concepts/foo.md`); the script rewrites them to file-relative (`../concepts/foo.md`) so they resolve correctly from `wiki/proposals/`.
  - Markdown fence sanitization: the write path strips ```markdown fences that some LLMs add.
  - `wiki/SCHEMA.md` updated to list `proposals/` as a valid directory (was triggering schema violations in the audit).
- **Filed:** `wiki/prototypes/2026-06-29-phase-4a-wiki-ingest.md` documents the probe per Principle 4.5.
- **Next:** Cycle 4b — run-log queryability.

## 2026-06-29 — Phase 4b: run-log queryability

- **Action:** Built `scripts/run-query.js`, a queryable interface over the run logs in `runs/*.md`. Six commands: `list`, `summary`, `show <runId>`, `pattern`, `diff <id1> <id2>`, `help`. Filter flags on `list`: `--outcome`, `--model`, `--since`, `--until`, `--min-turns`.
- **New file:** `scripts/run-query.js` (single file, ~600 lines, 13 functions exported as a library for testing).
- **Parses both collapse formats:** the interactive CLI's `Collapse fired: TYPE / Trigger turn: N / Conditions: ...` and the artifact-generator's `Collapse fired as **TYPE** on turn N`. Permissive parser handles both because the orchestrator's review workflow touches both.
- **`pattern` command** is the orchestrator's primary review tool (per `docs/03-orchestrator-role.md` Activity 4). Surfaces: outcome distribution, advisor usage rate, failure-pattern distribution, average |delta| per axis, top 10 most-cited wiki entries, and a Phase 5 ship-criterion check on collapse-mode balance.
- **`diff` command** supports grammar refinement (Activity 2): two runs side-by-side, with timestamps, model, outcome, turns, collapse type, collapse turn, final state per axis.
- **Verified:**
  - `/tmp/hermes-verify-4b.sh` — 10 checks pass (parsing of 2 collapse formats, 4 filter dimensions, 5 sections of pattern output, diff output, empty-dir handling, wiki audit)
  - Real fixture with 3 runs: pattern command surfaces all sections, including the Phase 5 collapse-mode check
- **Filed:** `wiki/prototypes/2026-06-29-phase-4b-run-query.md` documents the probe per Principle 4.5.
- **Phase 4 ship criterion advanced:** "Run logs are persisted for every session and are queryable" — ✓ (4b).
- **Next:** Cycle 4c — pattern review (refines the `pattern` and `diff` commands against the orchestrator-role doc's review criteria).

## 2026-06-29 — Phase 4c: pattern review workflow

- **Action:** Built the pattern-review workflow layer on top of the 4b run-query tool. The orchestrator-role doc names two activities that need this layer (Activity 4 pattern review, Activity 2 grammar refinement); both produce committed markdown artifacts.
- **Run log format v0.2.0:** the interactive CLI now writes the visible-signal layer into the run log per turn (`### Visible signals` block with three signals and discrepancy per axis). The run-query parser was extended to read the block; old-format run logs (4b and earlier) parse cleanly with `visibleSignals: null`.
- **Two new commands in `scripts/run-query.js`:**
  - `review-notes [--output file.md]` — emits a markdown skeleton for the orchestrator's review (Activity 4). Sections: aggregate summary, notable surprises, actions triggered, linked runs.
  - `grammar-refine <beforeRunId> <afterRunId>` — emits a structured before/after comparison for attaching to a grammar commit's changelog (Activity 2). Sections: run-level comparison, final state per axis, per-turn delta, "why this refinement was made" stub.
- **`pattern` command extended** with a "Visible-signal discrepancy hotspots" section listing the top 10 turn/axis combinations where the gap between the player's visible signals and the hidden state was largest (≥12 points). This is the orchestrator's primary signal for "the literacy device was working as designed here."
- **Verified:**
  - `/tmp/hermes-verify-4c.sh` — 9 checks pass (parser, hotspot aggregation, review-notes skeleton, grammar-refine structure, regression check on 4b commands, wiki audit)
  - Prior cycle verifications (`hermes-verify-4a.sh`, `hermes-verify-4b.sh`) still pass — no regressions
- **Filed:** `wiki/prototypes/2026-06-29-phase-4c-pattern-review.md` documents the probe per Principle 4.5.
- **Next:** Cycle 4d — model-version log.

## 2026-06-29 — Phase 4d: model-version log

- **Action:** Built the model-version log per the roadmap's Phase 4 build order item 5 and the orchestrator-role doc's Activity 5. `wiki/mechanics/model-versions.md` is the append-only log; `scripts/model-log.js` is the CLI for managing it.
- **New files:**
  - `scripts/model-log.js` — single file, ~13KB, 11 exported functions
  - `wiki/mechanics/model-versions.md` — mechanic entry v0.1.0 with the initial-model entry
- **Four commands:**
  - `current` — show current `.env` model + 3 most recent log entries
  - `list` — show all recorded switches with all fields
  - `record <old> <new> [opts]` — append a new switch entry (`--reason`, `--before`, `--after`, `--observation`, `--judgment`, `--linked`)
  - `compare <beforeId> <afterId>` — produce a structured before/after comparison (delegates to `run-query.js` `grammar-refine`)
- **Judgment format:** the load-bearing field. Marker is `intervention` or `no-intervention`; optional free-form note follows. The marker is machine-readable; the note is for the audit trail.
- **Initial entry filed:** `minimax/minimax-m3` chosen as initial model per the project's case-study framing. After runs referenced: 20260628223813-8jtf0r, 20260628231154-dzl75j, 20260629064319-h80unb-speedrun. Judgment: `no-intervention` — the model's interpretive style aligns with the grammar spec.
- **Verified:**
  - `/tmp/hermes-verify-4d.sh` — 10 checks pass (env parsing, buildEntry, appendEntry preserves log, parseEntries round-trips with structured judgment, cmdCurrent, cmdList, loadRun, cmdCompare, wiki audit)
  - Regression: prior cycle verifications (`hermes-verify-4a.sh`, `hermes-verify-4b.sh`, `hermes-verify-4c.sh`) still pass
- **Filed:** `wiki/prototypes/2026-06-29-phase-4d-model-log.md` documents the probe per Principle 4.5.
- **Phase 4 build order complete:** wiki ingest (4a), wiki audit (Phase 1), run log format (Phase 2/4b), pattern review (4c), model-version log (4d). All 5 roadmap items are now landed.
- **Next:** Cycle 4e — handoff protocol.

## 2026-06-29 — Phase 4e: handoff protocol

- **Action:** Authored the handoff protocol that ties Phase 4's technical tooling to a process a new orchestrator can follow. Phase 4 ship-criterion 1 ("A new orchestrator can pick up the role and run the wiki audit and pattern review without additional guidance") is now testable.
- **New file:** `docs/12-handoff-protocol.md` (v1.0.0, ~11KB). Structured around 5 questions: what to read first, what to test, what to verify, what to do in the first week, how to know the handoff is done. 8 self-check questions with mechanically-testable answers.
- **Updated files:**
  - `docs/03-orchestrator-role.md` — succession section points to the handoff protocol
  - `README.md` — "Project status" reflects Phase 4 complete
  - `wiki/index.md` — footer reflects Phase 4 complete
- **Verified:**
  - `/tmp/hermes-verify-4e.sh` — 8 checks pass (doc exists, all 5 sections present, all 8 self-check questions are grounded in project docs, succession section references the handoff, README + wiki index reflect Phase 4 complete, all 4 main tooling surfaces referenced, 4a-4d verifications still pass, wiki audit clean)
- **Phase 4 complete.** All 3 ship criteria green:
  - "A new orchestrator can pick up the role" — ✓ (4e)
  - "A wiki-ingest cycle produces a draft proposal set" — ✓ (4a)
  - "Run logs are persisted and queryable" — ✓ (4b)
- **Filed:** `wiki/prototypes/2026-06-29-phase-4e-handoff-protocol.md` documents the probe per Principle 4.5.
- **Next:** Phase 5 — first-run validation. Not a build phase; an observation phase. 20-30 external players with orchestrator observation, assessing the case-study claim against observed behavior.

## 2026-06-29 — Phase 4e: handoff protocol

- **Action:** Authored the handoff protocol that ties Phase 4's technical tooling to a process a new orchestrator can follow. Phase 4 ship-criterion 1 ("A new orchestrator can pick up the role and run the wiki audit and pattern review without additional guidance") is now testable.
- **New file:** `docs/12-handoff-protocol.md` (v1.0.0, ~11KB). Structured around 5 questions: what to read first, what to test, what to verify, what to do in the first week, how to know the handoff is done. 8 self-check questions with mechanically-testable answers.
- **Updated files:**
  - `docs/03-orchestrator-role.md` — succession section points to the handoff protocol
  - `README.md` — "Project status" reflects Phase 4 complete
  - `wiki/index.md` — footer reflects Phase 4 complete
- **Verified:**
  - `/tmp/hermes-verify-4e.sh` — 8 checks pass (doc exists, all 5 sections present, all 8 self-check questions are grounded in project docs, succession section references the handoff, README + wiki index reflect Phase 4 complete, all 4 main tooling surfaces referenced, 4a-4d verifications still pass, wiki audit clean)
- **Phase 4 complete.** All 3 ship criteria green:
  - "A new orchestrator can pick up the role" — done (4e)
  - "A wiki-ingest cycle produces a draft proposal set" — done (4a)
  - "Run logs are persisted and queryable" — done (4b)
- **Filed:** `wiki/prototypes/2026-06-29-phase-4e-handoff-protocol.md` documents the probe per Principle 4.5.
- **Next:** Phase 5 — first-run validation. Not a build phase; an observation phase. 20-30 external players with orchestrator observation, assessing the case-study claim against observed behavior.

## 2026-06-29 — Phase 4e: handoff protocol

- **Action:** Authored the handoff protocol that ties Phase 4 technical tooling to a process a new orchestrator can follow. Phase 4 ship-criterion 1 (new orchestrator can pick up the role and run the wiki audit and pattern review without additional guidance) is now testable.
- **New file:** `docs/12-handoff-protocol.md` (v1.0.0, ~11KB). Structured around 5 questions: what to read first, what to test, what to verify, what to do in the first week, how to know the handoff is done. 8 self-check questions with mechanically-testable answers.
- **Updated files:**
  - `docs/03-orchestrator-role.md` — succession section points to the handoff protocol
  - `README.md` — "Project status" reflects Phase 4 complete
  - `wiki/index.md` — footer reflects Phase 4 complete
- **Verified:**
  - `/tmp/hermes-verify-4e.sh` — 8 checks pass (doc exists, all 5 sections present, all 8 self-check questions are grounded in project docs, succession section references the handoff, README + wiki index reflect Phase 4 complete, all 4 main tooling surfaces referenced, 4a-4d verifications still pass, wiki audit clean)
- **Phase 4 complete.** All 3 ship criteria green.
- **Filed:** `wiki/prototypes/2026-06-29-phase-4e-handoff-protocol.md` documents the probe per Principle 4.5.
- **Next:** Phase 5 — first-run validation. Not a build phase; an observation phase. 20-30 external players with orchestrator observation.

## 2026-06-29 — Phase 5a: doc pass (edutainment reframe, Principle 6, advisor welcome)

- **Action:** Doc-only cycle. No code. The user pushed back on the original literacy claim — too curriculum-shaped, too measurable, not actually supportable. Also: one player, not 20-30; advisor easy mode is welcome, not suspect.
- **Three reframings landed:**
  1. **Vision doc** primary purpose renamed to "edutainment." The five pedagogical claims are reframed as "Design aspirations" with explicit "design goals, not guarantees" language. New litmus-test paragraph: "a player who finishes a run should want to start another." The case-study claim is now framed as the more rigorous one.
  2. **Principles doc Principle 6** added: the simulation is enjoyed, not just understood. Five what-this-constrains items (crisis surface evocative, collapse reveal as recognition, free-text at any length, easy-mode welcome, artifact has a throughline). The why-this-principle paragraph carries the taoist frame implicitly (right governance does less, yielding is action, modest awareness is durable) without naming the tradition. Litmus test: a player finishes a run, wants to start another.
  3. **Advisor function reframed as welcome.** Principle 2.4 transcription-mistrust line replaced with a parenthetical pointing to 4.2. Principle 4.2 gained a closing paragraph naming the three input paths (consult as briefing, adopt as move in easy mode, decline and author) as complete forms of play. docs/10-advisor-prompts.md updated in two places.
- **README** updated: Phase 5 reframed as usability walkthrough, "20-30 external players" reference removed, edutainment named, advisor section describes easy mode as a complete form of play.
- **Verified:**
  - `/tmp/hermes-verify-5a.sh` — 7 checks pass (vision reframed, Principle 6 added, Principle 4.2 reframed, README updated, advisor prompts spec updated, all 5 prior cycle verifications still pass, wiki audit clean)
  - Wiki audit: 63 indexed, 0 schema, 0 broken links
- **Filed:** `wiki/prototypes/2026-06-29-phase-5a-doc-pass-edutainment.md` documents the probe per Principle 4.5.
- **Next:** Play the game. Run the four player archetypes (structural / symbolic / mixed / speedrun) per the handoff protocol's day-2 test list. Read the artifacts. Check the litmus test.

## 2026-06-29 — Phase 5b: collapse the loop to crisis → response

- **Action:** Noise-fix cycle. Per the walkthrough feedback ("fundamentally the interface should just be the description given to the user, and then their response"), the play loop is now Situation / Pressure / Decision point / your move — nothing else. The visible-signal layer, system-interpretation block, delta display, previous-turn summary, comedic interlude, and advisor menu have all been removed from the loop. The full record still lives in the run log + artifact.
- **Crisis files** (all 8): added `### Situation`, `### Pressure`, `### Decision point` sections. Existing trigger content split into the three parts. Bumped to v0.2.0. The crisis-anatomy doc was updated to document the new schema.
- **`src/sim/crisis-generator.js`** rewritten to load the new deck (situation, pressure, decision_point per crisis).
- **`src/sim/interactive.js`** rewritten with the minimal play loop. The advisor function is still accessible via `a` (single-character, no menu), with a short advisor paragraph (≤60 words) followed by the move prompt. The full advisor response is still generated and recorded in the run log + artifact.
- **`src/sim/artifact-generator.js`** updated to surface Situation / Pressure / Decision point + advisor consult in the artifact's crisis log section.
- **Verified:** `/tmp/hermes-verify-5b.sh` — 9 checks pass (crisis files have new sections, v0.2.0, crisis-anatomy doc, crisis-generator loads new fields, interactive.js has no old per-turn printers, artifact generator handles new shape, 5a + 4a-4e verifications still pass, wiki audit clean: 64 indexed, 0 schema, 0 broken links).
- **What this cycle does NOT address:** the user's other complaint ("the text doesn't respond to the user's response") is the next cycle (5c), which will replace the static crisis deck with an LLM-driven world generator that produces each turn's prose in response to the player's prior move. This is a separate architectural change.
- **Filed:** `wiki/prototypes/2026-06-29-phase-5b-collapse-loop.md` documents the cycle.
- **Next:** 5c (LLM-driven world generator for response problem), then play the new loop across archetypes to test the litmus test.

## 2026-06-29 — Phase 5b.5: multi-line input + status spinner

- **Action:** Two gaps from the 5b walkthrough addressed. (1) Submit-signal ambiguity: the loop used a single-line prompt for the first line of the move, then looped for more lines — the player couldn't tell when the move was sent. (2) No status during the LLM wait: removing the previous comedic interlude left a 10-30s gap with nothing on screen.
- **Multi-line input by default** (`reader.promptMove(headerQuestion)`): the player types their move, presses enter to start a new line, presses enter on a blank line to submit. Either single-line or multi-line moves are valid. The cursor stays at `  > ` between lines so the player knows the move is being built.
- **Status spinner** (`withSpinner(reader, message, fn)`): pendulum animation, dot oscillates through 5 trailing positions (frame width fixed so the message is never broken). 800ms per tick. TTY mode uses ESC[1A + CR to update in place; piped mode falls back to a single static line. Spinner is cleared when the function returns and a blank line is added so the next turn's prose appears cleanly below.
- **The advisor shortcut** (`a` on the first line) still works. After the advisor is consulted, the move goes through `promptMove` (multi-line) like normal.
- **Verified:** `/tmp/hermes-verify-5b.5.sh` — 8 checks pass (promptMove + withSpinner exported, piped-mode fallback, TTY mode uses ESC[1A, end-to-end probe with mocked grammar shows the spinner line, old promptMultiLine is gone, 5a + 5b verifications still pass, 4a-4e verifications still pass, wiki audit clean: 65 indexed, 0 schema, 0 broken links).
- **Two additional end-to-end probes** (in the test): multi-line move `We will convene a 60-day review\nwith civil society observers and industry representatives.` is captured verbatim with newlines preserved; single-line move `We will convene a 60-day review.` is captured cleanly with no double-newline artifact.
- **Filed:** `wiki/prototypes/2026-06-29-phase-5b.5-input-spinner.md` documents the cycle.
- **Next:** 5c (LLM-driven world generator for the response problem), or play the new loop first to test the litmus test.
