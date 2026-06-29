# Prototype — 2026-06-29 — Phase 4b: run-log queryability

## Observation

Cycle 4b built `scripts/run-query.js`, a queryable interface over `runs/*.md` (the operational run logs the simulation writes after each session). The roadmap's Phase 4 ship criterion: *"Run logs are persisted for every session and are queryable."*

The script reads run logs as markdown with YAML frontmatter, parses them into structured records, and surfaces six commands:

- `list` — one-line summary per run, with `--outcome`, `--model`, `--since`, `--until`, `--min-turns` filters
- `summary` — aggregate stats: outcome distribution, model distribution, collapse rate, average turns, advisor use rate, cumulative state-delta magnitude per axis
- `show <runId>` — full run details (per-turn crisis, pattern, advisor, delta, gloss, state-after)
- `pattern` — pattern analysis across runs (the orchestrator's primary review command per `docs/03-orchestrator-role.md` Activity 4)
- `diff <id1> <id2>` — before/after comparison for grammar refinements (per Activity 2)
- `help` — usage

The parser handles both run-log formats produced by the codebase: the interactive CLI's collapse block ("Collapse fired: TYPE / Trigger turn: N / Conditions: ...") and the artifact-generator's prose collapse ("Collapse fired as **TYPE** on turn N"). Both are accepted because the orchestrator's run-query tool is used in workflows that touch both formats.

## Probe results

**Verification script** (`/tmp/hermes-verify-4b.sh`): all 10 checks pass.

The verifications cover:

1. Syntax + 13 functions exported as a library (so future tests can parse fixture logs)
2. Parsing of a real-format run log (15 fields per turn, all extracted)
3. Parsing of the CLI collapse format
4. Parsing of the artifact-generator collapse format
5. Filtering across 4 dimensions (outcome, model, date range, min-turns)
6. `listRunFiles` filters out `-artifact.md` files (which are paired with runs but aren't runs)
7. `pattern` command runs end-to-end and surfaces all five sections (outcome distribution, advisor usage, failure pattern distribution, average |delta| per axis, top 10 most-cited wiki entries) plus a Phase 5 ship-criterion check
8. `diff` command produces a structured comparison (timestamps, model, outcome, turns, final state per axis)
9. Empty `runs/` directory produces a helpful message rather than crashing
10. Wiki audit remains clean (no schema or link issues)

**Real run** with a 3-run fixture: the pattern command surfaced:
- Outcome distribution: 1/1/1 across the three collapse modes
- Advisor usage: 3/36 turns (8.3%) — all civil-society
- Failure pattern: 3 turns of "compute and capability escape"
- Top cited entry: `concepts/algorithmic-authority.md` (3 references)
- Phase 5 ship-criterion check: 3 collapses across 2 modes — "OK distribution spans ≥2 modes"

## Design notes

**Why a parser rather than a database.** The runs/ directory is gitignored; run logs are operational records, not catalog entries. A 60-line parser over markdown files is enough for MVP-0's query needs. If run volume grows past ~500 runs, a small SQLite layer would be the next step (deferred per the MVP-0 scope).

**Why pattern, not just list+summary.** The orchestrator-role doc lists *Pattern review* (Activity 4) as the primary review activity, with monthly cadence. A pre-built `pattern` command that surfaces outcome distribution, advisor usage, and citation hotspots gives the orchestrator the heuristic inputs they need without writing ad-hoc queries each time.

**Why diff for two runs.** Grammar refinements (Activity 2) require before/after comparison runs. The diff command takes any two runs and surfaces: timestamps, model, outcome, turns, collapse type, collapse turn, and final state per axis. That covers the structural comparison; the interpretive chain comparison is in the artifact.

**Why permissive parsing.** The codebase produces two slightly different collapse formats. A strict parser would break on either; a permissive parser handles both. The permissiveness is documented in the parse-collapse code comment.

**Why no caching.** MVP-0's runs/ directory has at most a few hundred files. Re-parsing on each command is fast enough. Caching adds complexity (stale-cache bugs, invalidation logic) for no current win.

## Files added

- `scripts/run-query.js` — the run-log query tool (single file, 13 exported functions, ~600 lines)

## Phase 4 ship-criterion status

| criterion | status |
|---|---|
| A new orchestrator can pick up the role and run the wiki audit and pattern review | pending 4e (handoff protocol); the `pattern` command is the technical foundation |
| A wiki-ingest cycle from the parent project produces a draft proposal set that the orchestrator can review and accept/reject | ✓ (4a) |
| Run logs are persisted for every session and are queryable | **✓ (4b)** |

## Next

Cycle 4c — pattern review. This is partly built (the `pattern` command in `run-query.js`); the cycle adds the **before/after diff** workflow that grammar refinements need (Activity 2 of the orchestrator role), and refines the pattern output to match the orchestrator-role doc's review criteria. The `diff` command is also in place; the cycle integrates both into a coherent review workflow.
