---
title: "Phase 2a — Wiki mechanics entries complete and retrievable"
date: 2026-06-28
type: prototype
prototype_kind: observed-behavior
model: "n/a (wiki retrieval only)"
---

## Observation

After Phase 2a, the wiki has 46 indexed pages including 6 root-level mechanics, 8 crisis entries, and 6 advisor entries (1 index + 5 voices). All mechanics entries are retrievable through the inherited wiki-query.js retrieval pattern. The simulation's grammar will be able to retrieve them in Phase 2 build.

## Probe

Commands run:

```bash
# Audit
node scripts/wiki-audit.js --output docs/wiki-quality-audit-2a.md

# Retrieval — state axes
node scripts/wiki-query.js --dry-run "What are the six state axes?"

# Retrieval — crisis
node scripts/wiki-query.js --dry-run "Tell me about the Mythos capability release crisis"
```

Result summary from the audit:

- Indexed wiki pages: 46
- Wiki markdown files: 49
- Missing indexed pages: 0
- Orphaned wiki pages: 0
- Local markdown links checked: 5
- Missing/broken local markdown links: 0
- Pages with explicit source/reference sections: 25
- Pages with likely source references: 37
- Schema issues: 0
- Short wiki pages under 250 words: 0

Retrieval results:

**State axes query:** Top hit is `mechanics/state-axes.md` (score 7). Followed by `mechanics/advisors/state-security.md` (score 3) and `mechanics/advisors/international-ally.md` (score 1). The state-axes entry is correctly identified as the most relevant.

**Crisis query:** Top hit is `mechanics/crises/crisis-1-frontier-lab-release.md` (score 10) — the Mythos release crisis. Followed by `mechanics/crises/crisis-4-agentic-capability-threshold.md` (score 6, also capability-driven) and related crises. The retrieval correctly surfaces the directly relevant crisis first.

## Output

The full audit report is in `docs/wiki-quality-audit-2a.md`.

## Interpretation

**Mechanics entries are now first-class wiki citizens.** They're indexed, retrievable, and schema-valid. The simulation can ground its grammar and advisor prompts in them.

**One real issue encountered and fixed:**

The crisis index entries initially used `(Pattern: X)` parenthetical format instead of the em-dash separator the audit script expects. The parser requires `title — description` format. Fixed by changing the format to `title — Pattern: X: brief description.` This is a small but real cross-doc consistency fix — the index format has to match the parser's expectations.

**Phase 2a ship criteria met:**

- 6 root-level mechanics entries (state-axes, interpretation-grammar, collapse-modes, crisis-anatomy, artifact-template, run-log-format) — exceeds the roadmap's "≥4 mechanics" criterion
- 8 crisis entries covering all 4 failure patterns (2 per pattern) — meets the roadmap's "≥8 crises covering all 4 patterns" criterion
- 5 advisor entries + 1 index — meets the roadmap's "5 advisor prompt templates" criterion
- All entries have proper frontmatter, sources, version history
- All entries retrievable through wiki-query

**What's next.** Cycle 2b — the simulation engine skeleton. The simulation needs:

- `src/sim/` directory structure
- State vector representation and update logic
- Crisis generation rule (select from the 8 crises based on state and pattern)
- Run loop orchestration
- A mock LLM that returns hand-authored responses

After 2b, we can run a full text-only session end-to-end with a fake LLM. Then 2c wires the real MiniMax M3 model and runs the grammar test cases.

This prototype observation is filed per Principle 4.5 (Dancing with the Details in the Design). The mechanics entries have been tested via retrieval; the wiki is ready to ground the simulation engine.
