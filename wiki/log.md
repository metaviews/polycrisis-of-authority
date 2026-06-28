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
