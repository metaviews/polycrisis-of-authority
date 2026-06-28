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
