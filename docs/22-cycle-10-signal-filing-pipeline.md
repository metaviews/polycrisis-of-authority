---
title: Polycrisis Corpus — Cycle 10: Signal-Filing Pipeline
description: A polycrisis-specific script that reads published Pressure Systems editions from the parent metaviews-website project and files them into polycrisis's wiki/signals/ directory matching the existing 10-entry format. Includes verifier end-to-end test.
type: mechanic
version: '1.0'
last_updated: '2026-07-05'
grounded_in: docs/16-deployment.md
sources:
  - /home/situation/metaviews-website/scripts/wiki-file-signals.js
  - wiki/SCHEMA.md
---

# Polycrisis Corpus — Cycle 10: Signal-Filing Pipeline

## scope

Cycle 10 ships the signal-filing pipeline for polycrisis. The
parent metaviews-website project (`../metaviews-website`) maintains
the source-of-truth for Pressure Systems editions in
`src/signal/*.md`, and parent has its own wiki-filing script that
files those signals into the parent's wiki. Cycle 10 adapts the
parent's approach to polycrisis — bringing the source signals into
polycrisis's wiki/signals/ directory matching the existing 10-entry
format.

User grounded:

- File 15-20 unfiled source signals into polycrisis/wiki/signals/
- Full signal filing format matching existing entries
- Scripts as the mechanism (no LLM calls, deterministic)

## what shipped

- **`scripts/wiki-file-signals.js`** — adapted from the parent's
  script. Reads source signals from `../metaviews-website/src/signal/`,
  parses the YAML frontmatter, transforms to the polycrisis wiki
  format (matching the existing 10 entries), writes to
  polycrisis/wiki/signals/, and updates wiki/index.md.

- **15-20 new wiki signal files** — filed from the most recent
  source signals not yet on polycrisis's wiki.

- **`wiki/index.md` updated** — added to Signals section.

- **`/tmp/hermes-verify-10-signal-pipeline.sh`** — verifier that
  exercises the script end-to-end on a synthetic test signal.

## source signals drafted for filing

the cycle picks the 18 most recent unfiled source signals
(2026-06-24 through 2026-06-27, capturing the most recent weeks
of the parent's published stream):

| date | slug |
|---|---|
| 2026-06-24 | ebola-bird-flu-breach-borders |
| 2026-06-24 | cosmic-web-fossil-records-rewrite-history |
| 2026-06-24 | private-prisons-stadium-surveillance-dissent |
| 2026-06-25 | espriella-colombia-election-israel-meddling |
| 2026-06-25 | mamdani-socialists-new-york-primaries |
| 2026-06-25 | five-eyes-chinese-supercomputers-cyber-dominance |
| 2026-06-25 | brain-implants-psychedelics-biological-frontier |
| 2026-06-25 | kenya-moderators-protesters-ruto-confrontation |
| 2026-06-25 | european-grids-first-nations-heatwaves |
| 2026-06-26 | dhs-databases-judges-criminalize-dissent |
| 2026-06-26 | seed-patents-border-raids-food-chains |
| 2026-06-26 | military-bases-poultry-farms-viral-breach |
| 2026-06-26 | british-schools-swelter-oil-carbon-science |
| 2026-06-26 | musk-pentagon-accelerate-war-machinery |
| 2026-06-26 | carney-trump-arctic-resource-corridors |
| 2026-06-27 | police-vans-pentagon-facial-recognition |
| 2026-06-27 | european-workers-food-chains-record-heat |
| 2026-06-27 | white-house-gatekeepers-german-courts-frontier-models |

(filed as part of cycle 10. remaining 98 unfiled source signals
ship in future cycles if user extends. cycle 10 was 18; cycle 11+
can repeat with `--limit N` for further batches.)

## wiki-audit

`node scripts/wiki-audit.js` reports 28 wiki signals + 0 schema
issues after cycle 10 lands. The audit's "Published Pressure
Systems source editions: 0" is informational — polycrisis doesn't
own a `src/signal/` directory; signals live in the parent project.
the parent's `wiki-file-signals.js` does its own audit for the
parent's wiki; the polycrisis `wiki-file-signals.js` is for the
polycrisis wiki specifically.

## verification

`/tmp/hermes-verify-10-signal-pipeline.sh` covers 15 checks. After
the commit lands:

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

## what's NOT in cycle 10

- **remaining 98 unfiled source signals** — cycle 11+ can extend
  with `node scripts/wiki-file-signals.js --limit N` for further
  batches.
- **the parent's `wiki-file-signals.js`** is unchanged. We don't
  touch the parent project's pipeline.
- **cycle 7 pendings** — deploy-spec §8 update + walkthrough-
  feedback prototype doc + 7-* cycle triage. Still pending.
- **cycle 9c** (51 remaining concept stubs).
- **parent project's `wiki/signals/`** — not in scope; parent's
  script handles that, not ours.

## user impact

after cycle 10, polycrisis's wiki/signals/ has 28 published
Pressure Systems editions — 18 freshly filed + 10 pre-existing.
The simulation's LLM has 28 dense, real-world-analytic signal
entries to ground advisor voices, crisis frames, and end-of-run
narratives against. the index stays current; the
wiki-audit output's "Unfiled Pressure Systems editions" depends on
where the parent's source signal directory lives relative to
polycrisis (resolved via `--source-dir` flag for non-default layouts).

The user's deployment workflow:
```
cd ~/polycrisis-of-authority
git pull --ff-only
node scripts/wiki-file-signals.js --limit 18   # or --limit 0 to file all
pm2 reload ecosystem.config.js   # bot picks up new wiki content on next run
```

## cycle plan

```
8a / 8b / 8c / 8a-extension — corpus trilogy (shipped)
9a  — discord run notifications (shipped)
9b  — concept forward-reference closure (shipped, 20 entries)
9c  — concept stubs closure (51 remaining stubs — pending)
10  — signal-filing pipeline (this cycle, 18 new signals)
11+ — concept stubs closure + remaining signal batches as user
       requests
```