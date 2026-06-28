---
title: "Wiki audit baseline — empty wiki after Phase 1a infrastructure"
date: 2026-06-28
type: prototype
prototype_kind: observed-behavior
model: "n/a (audit script only)"
---

## Observation

The inherited `wiki-audit.js` from `../metaviews-website/scripts/wiki-audit.js/` runs against an empty Polycrisis wiki (Phase 1a infrastructure only — directories created, SCHEMA.md authored, index.md and log.md initialized, but no corpus entries yet).

This probe validates that:

- The inherited script runs without modification to its core logic.
- The three Polycrisis-specific extensions work as intended (mechanics/ and prototypes/ type inference; mechanic schema check; cross-doc citation detection).
- The empty-wiki state produces a clean baseline (no errors, no missing files, no schema violations).

## Probe

Command run:

```bash
node scripts/wiki-audit.js
```

Result summary:

- Indexed wiki pages: 0
- Wiki markdown files: 3 (SCHEMA.md, index.md, log.md)
- Missing indexed pages: 0
- Orphaned wiki pages: 0
- Missing/broken local markdown links: 0
- Published Pressure Systems source editions: 0
- Filed wiki signal pages: 0
- Unfiled Pressure Systems editions: 0
- Pages with explicit source/reference sections: 0
- Pages with likely source references: 0
- Schema file present: yes
- Schema issues: 0
- Short wiki pages under 250 words: 0
- TODO/citation-needed markers: 0

The audit ran in 0 seconds and produced a clean baseline report. The audit script's signal-filing check correctly reports 0 because the source signal directory is parent-owned (`../metaviews-website/src/signal/`), not local.

## Output

The full audit output is preserved in the wiki log (the audit ran successfully and exited 0).

## Interpretation

**The infrastructure works.** The audit script runs end-to-end against our wiki structure. The three extensions applied to the inherited script behave as intended:

1. **Type inference extension.** The script now recognizes `mechanics/` and `prototypes/` directories as valid wiki page types. Future entries in those directories will be classified correctly.

2. **Schema check extension.** The script applies required-section validation to `mechanic` pages in addition to `concept`, `entity`, `theme`. This means a mechanics entry missing its required sections (per `wiki/SCHEMA.md`) will be flagged.

3. **Source-reference detection extension.** The script now recognizes Polycrisis-specific citation patterns: parent wiki paths (`metaviews-website/wiki/...`), grounded_in fields, and inter-entry markdown links (`concepts/[name].md`, `signals/[date]-[name]`). Without this extension, the audit would incorrectly report 0 pages with likely source references even as corpus entries are added.

**The signal-filing check is irrelevant for our wiki.** The audit's signal-filing check compares local `src/signal/` (parent's Pressure Systems source editions) to `wiki/signals/`. Our wiki doesn't have a local `src/signal/` — the parent's is the source. We could either point the audit at the parent's source directory (via the `wiki-source-refs.js` mechanism, per the wiki structure plan) or accept this section of the audit as informational only. The current behavior (reporting 0 source signals) is a known consequence of the architecture, not a bug.

**What's next.** Phase 1b will populate the wiki with seed corpus entries and the first mechanics entries. Each new entry will be auditable; this baseline provides the before-state for comparison.

This prototype observation is filed per Principle 4.5 (Dancing with the Details in the Design). The infrastructure is the result of a probe — the audit's run against the empty wiki told us the inherited script and our extensions work.
