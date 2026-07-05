# Polycrisis Corpus — Cycle 8b: Themes

## scope

This cycle ships the **theme** expansion under the corpus. Themes are
*connective*: they identify cross-entity patterns that the simulation
can pull on when framing advisor voices, crisis frames, and
end-of-run narratives.

User grounded:

- 10-12 fully-fleshed themes + 0-2 stubs
- themes distinct from the 2 existing (`ai-and-power-dynamics`,
  `ai-and-digital-governance`) — new connective axes, not duplicates
- 12-14 total entries

## what shipped

- **12 themes fully-fleshed** (no stubs) — each ~500-800 words of
  corpus analysis, real public sources, forward-references to
  entities and concepts
- **`wiki/index.md` updated** — 14 themes total listed
- **`wiki/log.md` entry** — record the theme expansion
- **`wiki-audit.js` clean** — zero schema issues

## entry list (12 themes)

themes are organized by what kind of connective axis they represent:

### Power & institutions (4)

1. **state-ai-strategic-competition** — the deepseek-sparked reframing of state-level AI competition, the Sputnik-moment argument, export-control efficacy.
2. **compute-as-geopolitics** — energy + datacenter + chip supply chain as state-power lever; export controls and compute as a non-tariff trade instrument.
3. **labor-displacement-and-class** — the structural question of which work AI replaces, which it augments, and the political coalitions that follow.
4. **ai-in-procurement-state-power** — government procurement as the binding lever on AI deployment; the federal-level use of procurement to shape private-sector AI development.

### Governance & law (3)

5. **voluntary-framework-vs-binding-regulation** — the comparative analysis of NIST's voluntary RMF, the EU's binding AI Act, and the UK's operational AISI. The three instruments are not redundant; they are three layers of one regulatory practice.
6. **international-coordination-failure-and-recovery** — the multilateral process failure modes: when AI summits deliver paper; when voluntary commitments decay; the conditions under which coordination holds.
7. **transparency-and-auditability** — algorithmic transparency as a substantive (not procedural) requirement; the technical and political difficulty of inspecting foundation-model systems.

### Economic & platform (3)

8. **frontier-firm-ai-business-model** — the platform-strategy argument that AI is a platform-shifting technology; the business-model questions about who captures the value and what that means for governance.
9. **open-weights-and-distribution** — the open-weight release debate as a structural question; how open weights interact with safety commitments, antitrust, and state strategy.
10. **synthetic-media-and-information-environment** — generative AI's effect on the information environment; the policy questions about content authenticity, watermarking, and provenance.

### Civil society & culture (2)

11. **civil-society-accountability-infrastructure** — the institutional scaffolding of accountability work: AI Now, Future of Life, AJL, Partnership on AI, the AIs Accountability Database, and how they interact with state regulation.
12. **talent-concentration-and-labor-conditions** — the structural question of who works on AI, where, under what conditions, and what that means for the political economy of the field.

## what's full vs stub

all 12 entries are full. this cycle ships no stubs (per the user's
grounding: maximum polish, slower). future cycles can deepen the
remaining themes beyond 12.

## source-of-truth

locked at "web + project + signal" per the 8a grounding. each
theme entry's `sources` field references:

- 2-3 publicly verifiable URLs (academic papers, government reports,
  journalism, primary documents)
- 1-2 references to project wiki entries (concepts, entities, other
  themes) for cross-linking
- 1 reference to a parent-project `signals/` entry where relevant

## forward-references

themes reference concepts that are scheduled for cycle 8c. the
verifier accepts these as expected forward-references. the audit
script reports zero schema issues regardless.

## what's NOT in cycle 8b

- **min**imax** (model vendor) — intentionally NOT a wiki entity
  or theme. the wiki is the corpus the model draws from; the model
  can't draw on itself.
- fictional themes — real-world anchoring locked at 8a. if a future
  cycle wants fictional content, that's a deliberate departure.
- cycle 8c (concepts, 15-20 entries) — sequential.

## verification

`/tmp/hermes-verify-8b-themes.sh` covers:

1. `wiki-audit.js` reports zero schema issues
2. all 12 theme files have valid frontmatter (title, description,
   type, sources)
3. all 12 have `## Connections` (required for theme pages)
4. all 12 reference at least 1 publicly verifiable URL
5. all 12 meet the substantive length bar (~500+ words)
6. cross-references resolve to real entries (forward-references
   recognized)
7. `wiki/index.md` lists all 14 themes (2 pre-existing + 12 new)
8. file names are lowercase kebab-case

## cycle plan

```
8a — entities       (17 of 29 landed, commit 3fd6144)
8a-extension       (12 remaining entity stubs — DEFERRED per user)
8b — themes         (this cycle: 12 themes fully-fleshed)
8c — concepts       (15-20 net-new concepts — next)
```
