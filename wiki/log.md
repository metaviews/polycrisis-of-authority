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
