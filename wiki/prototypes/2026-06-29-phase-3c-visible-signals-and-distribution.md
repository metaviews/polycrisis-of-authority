# Prototype — 2026-06-29 — Phase 3c: visible-signal layer + artifact distribution

## Observation

Phase 3c landed two Phase 3 ship criteria at once:

1. **Visible-signal layer (Principle 3.2 / state-model spec).** Built `src/sim/visible-signals.js` with three signals per axis (one per regime: lag, bias, partial), each grounded in a named real-world indicator type from `docs/06-state-model.md`. The interactive CLI now displays the visible-signal layer during play; the hidden value is never shown to the player during play (opacity-in-play). The artifact's collapse reveal surfaces the visible-vs-hidden gap (transparency-in-artifact). Probes confirm divergence in 10 out of 10 turns for a representative 10-turn run with 12+ point discrepancy.

2. **Artifact distribution (ship criterion: shareable as text or self-contained URL).** Built `src/sim/artifact-render.js`: a minimal markdown-to-HTML converter with inline CSS in the Metavisions register (mono chrome, serif prose, no decorative AI styling). Output is fully self-contained — no external scripts, stylesheets, or images. The FNV-1a 32-bit content hash of the run log is embedded in the meta tag and footer, so any reader can re-compute the hash and verify the artifact. Hash is deterministic (same input → same hash). Both the interactive CLI and the async scripted run produce markdown + HTML artifacts.

The visible-signal layer also surfaces in the artifact's **collapse reveal (Section 7)** as a per-turn table showing hidden band vs visible bands with a discrepancy column. This is the literacy device made material — the player can see, after the run, what they missed during play.

## Probe

`scripts/probe-e2e.js` exercises a fake-but-realistic 10-turn run that fires legitimacy collapse. All 14 checks pass:

- **Markdown artifact (7/7):** visible-vs-hidden table, discrepancy column, collapse-fired line, all 8 sections present, no raw hidden values leaked into prose.
- **HTML render (7/7):** self-contained (no external assets), hash present and matches, tables rendered, discrepancy column rendered.
- **Divergence count:** 10 band-divergent (>=12 pt) axes across the 10-turn run.
- **Hash determinism:** same input → same hash (FNV-1a 32).

`scripts/probe-html.js` exercises the HTML renderer on a sample artifact. All 12 self-containment checks pass. Sample output at `/tmp/probe-artifact.html` (5.3 KB for a 4.6 KB markdown input).

## Files added/changed

- `src/sim/visible-signals.js` — new. Signal definitions, three regime functions, discrepancy calculation, per-turn timeline.
- `src/sim/state-display.js` — added `formatVisibleSignalsDisplay()` for play-time use; `formatStateBlock()` retained for artifact/inspector use (hidden value is shown only in the transparency surface).
- `src/sim/artifact-render.js` — new. Minimal markdown-to-HTML converter, inline CSS in Metavisions register, FNV-1a 32-bit content hash.
- `src/sim/artifact-generator.js` — collapse reveal, player-quit, and no-collapse branches now include a visible-vs-hidden discrepancy table.
- `src/sim/run-async.js` — added `writeArtifact()` that produces both markdown and HTML.
- `src/sim/interactive.js` — displayState now uses `formatVisibleSignalsDisplay`; artifact generation now writes both markdown and HTML.
- `src/sim/index-async.js` — same artifact generation update.
- `wiki/mechanics/visible-signals.md` — new mechanic entry (version 0.1.0).
- `wiki/index.md` — registered the new entry under "Core mechanics."
- `scripts/probe-html.js`, `scripts/probe-e2e.js` — probes.

## Phase 3 ship criteria status

| Criterion | Status |
|-----------|--------|
| Player can complete a full session through the UI without crashes | ✓ (3a) |
| UI feels austere and operational, in the Metavisions register | ✓ (3a) |
| Visible signal layer is genuinely fragmented: at least one signal can be verified (against the hidden state) to lag, contradict, or mislead | **✓ (3c)** — 10 divergences per representative run |
| Advisor interface produces grounded responses from all five voices, with describe-not-recommend constraint | ✓ (3a) |
| Shareable artifact includes: narrative report, state trajectory, interpretive chain for at least the collapse turn, grounding references, play invitation | ✓ (2d) |
| Artifact can be shared as text or as a self-contained URL | **✓ (3c)** — markdown + self-contained HTML with FNV-1a content hash |

## Interpretation

The visible-signal layer is the operational form of the literacy claim. The spec defined the three signals per axis (in the state-model doc) but the simulation never used them — the player saw the hidden value directly, which collapsed the gap and the literacy device. With 3c, the gap is real: the player sees the analyst headlines, the treasury statements, the press tone — and has to develop a theory of what they actually mean. The artifact surfaces the gap in the collapse reveal, which is the pedagogical climax per Principle 3.3.

The HTML render is deliberately austere: serif prose, mono chrome, paper background, no decorative AI styling. The visual register does the case-study framing work that the prose cannot — a reader sees the artifact and recognizes it as intelligence-desk output, not a game victory screen. The FNV-1a content hash is the smallest possible verification surface: any reader can re-compute the hash and confirm the artifact hasn't been tampered with.

The 3c build is structural, not behavioral. The signal parameters (lag length, bias offset, capture percentage) are deterministic for a given (state, history) pair, so the same run produces the same signals — auditable per Principle 4.3. Phase 5 validation may tune the parameters based on observed player behavior, but the structure is the structure.

## Next

Cycle 3d — Phase 3 ship-criteria verification, README update, wiki audit, log entry, commit/push. After that, Phase 3 is shipped; Phase 4 (operator tooling) and Phase 5 (first-run validation) remain.
