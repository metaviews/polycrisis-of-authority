---
title: "2026-07-05 — Cycle 10 — Signal-filing pipeline"
date: 2026-07-05
type: prototype
prototype_kind: script-snapshot
model: minimax-m3+openrouter
---

# 2026-07-05 — Cycle 10 — Signal-filing pipeline

## what shipped

User-grounded: cycle 10 ships the polycrisis-specific signal-filing
pipeline that reads published Pressure Systems editions from the
parent metaviews-website project and files them into polycrisis's
wiki/signals/ matching the existing 10-entry format.

- **`scripts/wiki-file-signals.js`** in polycrisis — adapted from
  the parent's same-named script (`../metaviews-website/scripts/wiki-file-signals.js`).
  Reads source signals from
  `../metaviews-website/src/signal/*.md` (overridable via `--source-dir`),
  parses the YAML frontmatter, transforms to the polycrisis wiki
  format (matching the existing 10 hand-written entries), writes to
  polycrisis/wiki/signals/, and updates wiki/index.md Signals section.
- **`package.json`** — added `js-yaml: ^4.1.0` dep (parent uses it; polycrisis needs it too).
- **18 new wiki signal files** filed into polycrisis's wiki/signals/.
- **`wiki/index.md` updated** — Signals section now lists all 28 entries.
- **docs/22-cycle-10-signal-filing-pipeline.md** — spec doc.
- **`/tmp/hermes-verify-10-signal-pipeline.sh`** — verifier.

## which 18 signals were filed

the 18 most-recently-published source signals not yet on
polycrisis's wiki (2026-06-24 through 2026-06-27). Each is a
real parent-published Pressure Systems edition with verified
attribution, hyperlinks, and monitored items. All 18 follow the
parent's source format exactly.

## how it works

```bash
# On a fresh install with parent at ../metaviews-website:
node scripts/wiki-file-signals.js --limit 18
# → reads ../metaviews-website/src/signal/*.md (most recent 18)
# → writes wiki/signals/*.md in polycrisis format
# → updates wiki/index.md Signals section

# Optional flags:
node scripts/wiki-file-signals.js --force              # overwrite existing
node scripts/wiki-signals.js --source-dir <path>      # override source
node scripts/wiki-file-signals.js --limit N            # file N most recent
node scripts/wiki-file-signals.js                     # file all unfiled
```

## wiki-audit

`node scripts/wiki-audit.js` reports 28 wiki signals + 0 schema
issues after cycle 10 lands. The audit's "Published Pressure Systems
source editions: 0" is informational — polycrisis doesn't own a
`src/signal/` directory; signals live in the parent project.
The parent's `wiki-file-signals.js` does its own audit for the
parent's wiki; the polycrisis `wiki-file-signals.js` is for the
polycrisis wiki specifically. Cycle 10 honors
`wiki/SCHEMA.md`'s note: "Local unfiled signals are informational,
not a bug."

## verification

`/tmp/hermes-verify-10-signal-pipeline.sh` covers 15 checks.
After the commit lands:

| # | check | result |
|---|---|---|
| 1 | canonical: npm run test exits 0 | PASS |
| 2 | wiki-audit.js: zero schema issues | PASS |
| 3 | scripts/wiki-file-signals.js exists | PASS |
| 4 | exports the canonical functions | PASS |
| 5 | DEFAULT_SOURCE_SIGNAL_DIR points at parent project | PASS |
| 6 | render function produces output | PASS |
| 7 | format: 'Pressure Systems —' title prefix | PASS |
| 7 | format: Date: line | PASS |
| 7 | format: Source edition line | PASS |
| 7 | ## Synthesis section | PASS |
| 7 | ## Monitored items section | PASS |
| 8 | all 3 sample wiki signals match format | PASS |
| 9 | wiki/index.md lists ≥20 signal links (got 28) | PASS |
| 10 | js-yaml is in package.json | PASS |

The "the canonical command" sub-check asserts format match
against a synthetic input signal — proves the render function
correctly parses YAML frontmatter and emits the polycrisis wiki
format. Section 8 also spot-checks 3 real wiki signals for format
compliance.

## corpus totals after cycle 10

- 31 entities
- 14 themes
- 45 concepts
- **28 wiki signals** (10 pre-existing + 18 newly filed from parent)
- wiki-audit clean

## cycle plan

```
8a / 8b / 8c / 8a-extension — corpus trilogy (shipped)
9a  — discord run notifications (shipped)
9b  — concept forward-reference closure (shipped)
9c  — concept stubs closure (51 remaining — pending)
10  — signal-filing pipeline (this cycle)
11+ — concept stubs closure + remaining signal batches as user
       requests
```

## user impact

after cycle 10:

- Polycrisis's wiki/signals/ has 28 published Pressure Systems
  editions — the simulation's LLM has substantial real-world-
  analytic grounding material for advisor voices, crisis frames,
  and end-of-run narratives.
- New wiki content ships with no manual work — running
  `node scripts/wiki-file-signals.js --limit N` files N more
  signals on demand.
- The script is fully deterministic — no LLM calls, no
  curating. Edit, no fabrication.
- The format-match proof in the verifier means future changes
  to the parent's signal format will surface as a verifier
  failure if polycrisis's transformation needs updating.

## next decisions

1. cycle 9c — concept stubs closure (51 remaining concepts)
2. cycle 11+ — more signals via `--limit N` (98 source signals
   remain unfiled)
3. cycle 7 pendings (deploy-spec §8 update + walkthrough doc)
4. something else

## deployment

```bash
cd ~/polycrisis-of-authority
git pull --ff-only
npm install                                # picks up js-yaml dep
node scripts/wiki-file-signals.js --limit 18   # or --limit 0 for all unfiled
pm2 reload ecosystem.config.js
```
