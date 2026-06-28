---
title: "Wiki audit after Phase 1b — 25 indexed pages, 0 schema issues"
date: 2026-06-28
type: prototype
prototype_kind: observed-behavior
model: "n/a (audit script only)"
---

## Observation

After Phase 1b populated the wiki with 22 corpus entries (7 concepts, 3 entities, 2 themes, 10 signals) and 2 hand-authored mechanics entries, the wiki-audit.js script reports 0 schema issues, 0 missing indexed pages, 0 orphaned pages, 0 broken local links.

This probe validates that:

- The inherited audit script (with Polycrisis extensions) works end-to-end against a populated wiki.
- The schema definition in `wiki/SCHEMA.md` matches actual wiki structure.
- The Polycrisis-specific extensions (mechanics/prototypes type inference, alternative section name acceptance, source-reference pattern detection) behave as designed.

## Probe

Command run:

```bash
node scripts/wiki-audit.js --output docs/wiki-quality-audit-1b.md
```

Result summary:

- Indexed wiki pages: 25
- Wiki markdown files: 28
- Missing indexed pages: 0
- Orphaned wiki pages: 0
- Local markdown links checked: 0 (no internal cross-references between wiki pages yet — `wiki/index.md` has markdown links but the audit only checks `.md` links *within* wiki pages, not from index)
- Missing/broken local markdown links: 0
- Filed wiki signal pages: 10
- Unfiled Pressure Systems editions: 0 (informational; source signals live in parent)
- Pages with explicit source/reference sections: 7
- Pages with likely source references: 18
- Schema file present: yes
- Schema issues: 0
- Short wiki pages under 250 words: 0
- TODO/citation-needed markers: 1 (false positive — the prototype entry about the audit describes the audit's TODO detection behavior; the audit's regex matches the word "TODO" in this description)

The full audit report is in `docs/wiki-quality-audit-1b.md`.

## Output

Audit output (excerpt):

> All 25 indexed pages pass schema validation. The 22 corpus entries (inherited from parent project) and 2 mechanics entries (hand-authored for state model and grammar) all have the sections required by the Polycrisis-extended schema.

## Interpretation

**Phase 1b wiki infrastructure works.** The audit script — inherited from the parent project with three Polycrisis-specific extensions — validates 25 entries without flagging any schema violations.

**Three extensions applied to the audit script:**

1. **Type inference for `mechanics/` and `prototypes/`.** The script recognizes the two new directory types and classifies entries correctly.

2. **Mechanic pages excluded from shared required-sections check.** Mechanic pages have their own structure (primary content heading, Sources, Version history) validated manually by the orchestrator, not by the shared list applied to concept/entity/theme pages.

3. **Alternative section name acceptance.** The schema now lists both "Related archive posts" and "Connections" as valid linking-back sections. The audit accepts either. This matches the parent project's actual practice — most of their files use "Connections" while older files use "Related archive posts."

**Two real issues encountered and resolved during Phase 1b:**

- **Signal file mismatch:** The initial signal copy accidentally listed three signal files in `wiki/index.md` that didn't actually exist on disk, while three that did exist weren't in the index. Resolved by copying the missing files and removing the orphans.

- **Schema definition drift:** Initial schema declaration was too verbose — bullet items included description text after the section name, which the audit's parser interpreted as part of the section name. Resolved by simplifying schema declarations to bare section names (matching the parent's schema style) and adding explicit per-type structure documentation as separate H2 sections.

**False positive noted:** The audit reports 1 TODO/citation-needed marker, but this is from this prototype entry itself, which contains the literal phrase "TODO detection behavior." A future refinement could exclude prototype entries from this check, but for MVP-0 this is informational rather than actionable.

**What's next.** Phase 1c is small — it includes wiki-query.js integration (so the grammar can retrieve wiki context) and OpenRouter wiring (so the simulation can actually run). After Phase 1c, the project transitions to Phase 2: actually running the grammar against test cases and observing model behavior.

This prototype observation is filed per Principle 4.5 (Dancing with the Details in the Design). The wiki structure now has substantive content, and the audit infrastructure is mature enough to catch real issues as the wiki evolves.
