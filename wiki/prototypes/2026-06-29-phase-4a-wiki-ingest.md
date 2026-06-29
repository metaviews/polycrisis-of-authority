# Prototype — 2026-06-29 — Phase 4a: wiki ingestion pipeline

## Observation

Cycle 4a built the wiki-ingest pipeline that connects the curated Polycrisis wiki to the parent Metaviews archive. The script `scripts/wiki-ingest.js` scans the parent archive, pre-filters by date and AI-policy relevance (no LLM), then runs an LLM classification step that produces draft proposals the orchestrator reviews/accepts/rejects.

The pipeline follows the parent project's `wiki-ingest.js` conventions with two key differences:

1. **Pre-filter before LLM.** The parent wiki is general-purpose (391 posts); the Polycrisis corpus is narrow (AI policy, ~60-100 seed docs). A naive ingest would burn LLM tokens on every post. The pre-filter is a date window + tag/title keyword check that catches AI-policy posts cheaply. Probe: 57 of 517 parent files pass the pre-filter for a 60-day window — a ~9x reduction in LLM calls.

2. **Proposals, not auto-merge.** The parent wiki's `wiki-ingest.js` rewrites existing pages via LLM. Polycrisis's curated wiki is too small and load-bearing to auto-merge. Every AI-policy post becomes a *proposal stub* in `wiki/proposals/` with `status: pending`. The orchestrator accepts/rejects via CLI; on `commit`, accepted proposals are routed to `wiki/concepts/`, `wiki/entities/`, `wiki/themes/`, or `wiki/signals/` based on the `type` field.

## Probe results

**Verification script** (`/tmp/hermes-verify-4a.sh`): all 8 checks pass.
- 14 functions exported for in-process testing (pre-filter, walk, dedup, writeProposal, etc.)
- Pre-filter correctly distinguishes AI-policy posts (2/3) from non-AI (1/3) on a fixture
- Dedup reads existing proposals and excludes them
- `review` lists pending proposals
- `accept` + `commit` routes to the right `wiki/{concepts,entities,themes,signals}/` directory by type
- `reject` marks status without removing the file
- `writeProposal` strips markdown code fences (LLMs commonly wrap output)
- Wiki audit still clean: 58 indexed pages, 0 schema issues

**Real LLM scan** (60-day window, MiniMax M3, OpenRouter):
- 57 candidates passed pre-filter (out of 517 parent files)
- 4 substantive proposals generated across two scan runs (rate-limited; ~120s per scan)
- All 4 proposals are corpus-grounded, link to existing wiki entries, name the relevant axis and failure pattern, and suggest concrete simulation scenarios

The 4 real proposals in `wiki/proposals/` (`2026-05-01-algorithmic-power-supply-chains-and-sovereignty.md`, `2026-05-04-algorithmic-authority-versus-care-infrastructure.md`, `2026-05-04-pressure-systems-the-materialization-of-algorithmic-authorit.md`, `2026-05-05-epistemic-fractures-demand-the-impossible.md`) demonstrate the pipeline's value: each identifies a load-bearing signal that the curated wiki could incorporate, names the existing wiki pages it relates to (`concepts/algorithmic-authority`, `signals/2026-04-29-algorithmic-warfare-care-deficit`, `themes/ai-and-power-dynamics`, `concepts/ai-arms-race`, `concepts/cognitive-authority`), and proposes a synthesis in wiki-voice prose. The orchestrator can accept any, reject any, or run another scan with a larger window to generate more candidates.

The LLM also exhibits good judgment: during the second scan, the model rejected one post as a near-duplicate of an existing signal, logging the reasoning ("the title and date closely mirror the existing 2026-05-05 signal... suggesting this is either a duplicate or a near-duplicate of already-captured material"). The orchestrator's review queue won't accumulate redundant proposals.

## Refinements during the cycle

**Link rewriting.** The LLM produces root-relative links like `concepts/foo.md`; from a file in `wiki/proposals/`, these resolve to non-existent paths (`wiki/proposals/concepts/foo.md`). The script now rewrites root-relative internal links to file-relative ones (e.g. `../concepts/foo.md`) as a post-processing step. The LLM prompt is also updated to instruct the model to use file-relative paths from the start. Both layers are needed — the prompt for cleaner first-pass output, the rewrite as a safety net.

**Markdown fence sanitization.** LLMs (including the one in use) often wrap markdown output in ```markdown code fences, especially when the prompt says "return ONLY the markdown content." The write path strips leading and trailing fences so the file has clean frontmatter from the start.

**Schema awareness.** `wiki/SCHEMA.md` is updated to list `proposals/` as a valid directory. The wiki audit previously flagged proposal files as schema violations because the directory wasn't in the allow-list; this surfaced during testing and was fixed in the same cycle.

## Design notes

**Why proposals and not auto-merge:**
The roadmap's Phase 4 ship criterion is *"A wiki-ingest cycle from the parent project produces a draft proposal set that the orchestrator can review and accept/reject."* The "review and accept/reject" wording is the load-bearing part. The curated wiki is small and every entry traces to a load-bearing claim about the world; an LLM rewrite loop that auto-merged would erode the case-study framing over time. Proposals preserve the orchestrator's authority over what the simulation knows.

**Why a date window:**
The case-study claim depends on dated, citable material (Principle 2.2). A 60-day default window keeps proposals current. The orchestrator can run `--days 365` for a backlog sweep.

**Why dedup by `source_canonical`:**
The parent archive imports each Substack post once; the canonical URL is the dedup key. Re-running the ingest won't propose the same post twice. Pending proposals in the queue are also excluded — once a post is queued, it stays queued until accepted, rejected, or committed.

**Why the markdown fence sanitization:**
LLMs (including the one used in this project) often wrap markdown output in ```markdown fences, especially when prompted to "return ONLY the markdown content." The sanitization step ensures the proposal file has clean frontmatter.

**Why CLI for accept/reject/commit:**
The orchestrator's interface with the project is the wiki and git. A CLI for proposal lifecycle keeps the workflow scriptable and reviewable in the wiki log. There's no UI for this in MVP-0 (per the deferred list: "Public query or search interfaces over the wiki... wait until retrieval is mature.").

## Files added

- `scripts/wiki-ingest.js` — the ingest pipeline (scan / review / accept / reject / commit)

## Next

Cycle 4b — run-log queryability. Build `scripts/run-query.js` so the orchestrator can filter runs by outcome, model, date, axis trajectory, and collapse turn.
