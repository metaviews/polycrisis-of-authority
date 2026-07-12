# Cycle 11 — Pacing and help-mode

_Closes the cycle-7 walkthrough-feedback loop's most-pressing player complaints: (1) no way to ask for clarification without advancing the turn, (2) macro events (town halls, consultations, roll-outs) bog the game down by demanding micro-turn-by-turn play. Resolves those without adding a separate "macro mode" — the default pacing moves faster._

## Background and scope

Two playtester reports captured into the cycle-7 walkthrough feedback backlog drove this cycle:

1. **No read-only help.** Every line of player input at the move prompt flows into the interpretation grammar. There is no way to ask "what is `narrative_coherence`?" or "what does this crisis mean?" without submitting the input as a move and triggering the next turn.
2. **Pacing bogs down on macro events.** When the world generator produces a stakeholder-engagement or consultation-style situation (town hall, working group, regulatory hearing, public consultation), the player is asked to play it out one micro-step at a time. The natural unit of *player* meaning is "what does the regime do?" — but the natural unit of *world* granularity inside a single such event is much finer. The mismatch makes the game sluggish whenever a long-running situation unfolds.

This cycle fixes both, with the design choice (user-confirmed in the R1–R4 review) that pacing is fixed by **changing the default per-turn world advance** rather than by adding a new mode the player can opt into. Help-mode is a separate, distinct concern and stays distinct.

### What's in

- **`?` (passive)** at the move prompt re-prints current crisis surface, regime state bands, advisors consulted so far in this run, and a glossary snippet drawn from the corpus. No LLM call. Instant.
- **`?? <question>` (active)** at the move prompt calls a small LLM Q&A helper with `{playerQuestion, crisis, state, retrievedCorpus}` and returns a 2-3 sentence plain-English answer. One LLM round-trip. Env-gated (`POLYCRISIS_HELP_QA_ENABLED`, default off) so deployments that don't want the extra LLM calls can opt out.
- **Default per-turn world advance.** Crisis deck entries gain a `sub_beat_count` and `sub_beat_rationale`, configured by `trigger_kind × failure_pattern`. The world-generator prompt is updated to emit `sub_turns: [{ situation, narrative_beat, state_delta, ... }]` arrays sized to `sub_beat_count`. The interpretation grammar prompt and the `applyDelta` function accept `sub_turns[]` and compose the per-sub-beat deltas sequentially. The post-turn surface (the next crisis's situation/pressure/decision_point) is the *last sub_turn's* fields, not the whole array — the play loop stays prose-only.

### What's NOT in

- No new "macro mode" command, no `m <move>` shortcut. The fix is the *default*. If a player wants finer-grained play, the new `??` clarification path is the read-only channel; the surface itself doesn't grow.
- No change to advisor cast or to interpretation grammar's policy-text → state-delta mapping. The grammar still reads one player move per turn and resolves it state-sensitively; what changes is how *the world responds* to that move (compressed across N sub-beats) and how the *state* accumulates the response (sub-deltas compose sequentially).
- No change to the shareable artifact schema beyond exposing `sub_turns[]` when present. The artifact generator picks up `world.sub_turns` automatically.
- No change to crisis-selection scoring (the existing `selectCrisis` heuristic in `crisis-generator.js` is preserved).
- No change to the collapse / stabilization thresholds. Stabilization still requires 5 consecutive turns of all-axes-in-band; with multi-sub-beat turns, that's 5 *turns*, not 5 *sub-beats*.

## Design choices (user-confirmed)

Recorded here so future cycles don't re-litigate them:

1. **Default-pacing, not new mode.** Per the R1–R4 dialog.
2. **Help-mode = `?` passive + `?? <q>` active.** Player picks.
3. **Sub-delta granularity is type-driven.** Configured on each crisis in the deck as `sub_beat_count` + `sub_beat_rationale`. The LLM does not decide granularity on the fly — that would let the model hide granularity failures.
4. **Sub-deltas compose, not net.** Each sub_beat carries its own `state_delta` and they are applied in order; the surface-visible situation/pressure/decision_point comes from the *last* sub_beat. This preserves the more-truthful case-study evidence: a turn that contains a town hall, a stakeholder walkout, and a leaked memo leaves three distinct deltas in the run log, not one averaged.
5. **Help-mode is a no-op when unused.** If a player never types `?` or `??`, the cycle's code path is unreached and the world generator still receives a single non-`sub_turns` schema (a one-element array — backward-compatible). No behaviour change for existing runs.

## Files changed

### Source

- `src/sim/crisis-generator.js` — add `sub_beat_count` + `sub_beat_rationale` to every entry in `CRISIS_DECK`; type-driven defaults table documented in comments.
- `src/sim/world-generator.js` — prompt directive for `sub_turns[]`; passes `sub_beat_count` and `sub_beat_rationale` through. JSON-schema section in the prompt updated to show the new shape.
- `src/sim/grammar.js` — interpret prompt accepts `sub_turns[]`; fallback (mock-llm) grammar matches.
- `src/sim/state.js` — `applyDelta` accepts either a single delta (existing signature) or an array of deltas; composes left-to-right. Existing call sites pass single deltas; new call sites pass arrays.
- `src/sim/run-loop.js` — world output's `sub_turns` is read; deltas applied sequentially; collapse / stabilization checks happen *after* all sub-beats compose; the post-turn `priorWorld` that becomes the next turn's crisis is the last sub-beat's fields. Also: `readPlayerMove` recognizes `?` and `??` prefixes *before* normal-move parsing.
- `src/sim/mock-llm.js` — the static fallback produces a 1-element `sub_turns` (preserves schema).
- `src/sim/interactive.js` — `createTtySurface.readMove` / `readMove` callers handle `?` vs `??` vs normal. New `runHelp(command, state, crisis, identity, turns)` helper for the TTY path.
- `src/sim/help.js` (new) — `buildHelpContext(state, crisis, identity, turns, corpus)` returns the passive-context prose; `answerHelpQuestion(question, state, crisis, corpus)` calls the LLM with a small targeted Q&A prompt. Best-effort try/catch (corpus miss → useful error message, never a thrown error).
- `src/bot/surface.js` — recognize `?` and `??` message prefixes; route to the same `help.js` helpers; reply inline (no embed upgrade this cycle — keep parity with TTY).

### Corpus / wiki

- No wiki changes this cycle. Help-mode Q&A draws on whatever corpus snippet the existing `pickCorpusQuote` / `wiki-query` provide; the glossary is generated from `wiki/mechanics/state-axes.md` and the `crisis-anatomy.md` axes-glossary section. (If glossary coverage proves thin in real play, follow-up cycle adds `wiki/mechanics/glossary.md`.)

### Docs

- `docs/23-cycle-11-pacing-and-help.md` — this file.
- `docs/02-design-principles.md` — no change. The new mechanics are consistent with existing principles (1.3 state-sensitive grammar remains, 3.1 free-text input remains primary, 3.2 visible signals still unreliable). A note is appended in §3.5 to record the pacing default; principles themselves are unchanged.

### Verifier

- `/tmp/hermes-verify-11.sh` — ad-hoc verifier covering the cycle's substantive claims:
  - Every entry in `CRISIS_DECK` has `sub_beat_count` (integer ≥ 1) and `sub_beat_rationale` (string).
  - `world-generator.js` prompt contains the directive for `sub_turns` and a JSON-schema section.
  - `grammar.js` interpret prompt accepts `sub_turns`; mock-llm produces a 1-element array.
  - `state.applyDelta` accepts either a single delta object or an array; both code paths unit-tested.
  - `run-loop.js` calls `applyDelta(priorState, sub_turns)` (array path) on the multi-sub-turn branch; collapses computed *after* sub-beats compose.
  - `help.js` exports `buildHelpContext` and `answerHelpQuestion`; `buildHelpContext` accepts a `crisis` and a `turns[]` and returns prose including the crisis surface + state bands + advisor-cast-list-consulted. Mock-LLM `answerHelpQuestion` returns deterministic canned answer text in unit test.
  - Interactive `?` and `??` parsing: TTY `readMove` returns `?` and `?? <question>` distinguishable from a normal move.
  - Discord surface: `?` and `??` prefixes recognized; routed to `help.js` helpers.
  - Wiki audit (`node scripts/wiki-audit.js`) reports zero schema issues.
  - `npm run test` stub still exits 0.
  - Working-tree-clean guard (tolerated as 1-fail, per project convention).

## Type-driven sub-beat defaults

| trigger_kind     | default sub_beat_count | rationale                                       |
|------------------|-----------------------:|-------------------------------------------------|
| capability-driven| 3                      | a release is multi-step: announce → evaluate → political response |
| incident-driven  | 1                      | an incident is point-in-time; over-narrating it falsifies |
| legitimacy-driven| 2                      | a polling shift surfaces, then commentary crystallizes |
| elite-driven     | 2                      | a walkout lands, then sectoral reaction          |
| seed-parameterized | uses seed's trigger_kind | falls through to same table                  |

These are **default** — entries can override. The deck hands `sub_beat_count` and `sub_beat_rationale` to the world generator verbatim.

## Ship criteria

- Crisis deck has `sub_beat_count` and `sub_beat_rationale` on every entry.
- World generator emits `sub_turns[]` matching the count.
- Grammar accepts and composes `sub_turns[]`.
- `applyDelta` composes arrays. Existing tests (if any) still pass; new tests cover the array path.
- `?` at TTY move prompt re-prints context; `?? <q>` calls the Q&A helper.
- Discord surface recognizes both prefixes and replies inline.
- `/tmp/hermes-verify-11.sh` passes on the working tree.
- Cycle-level commit and a short notes entry in `wiki/log.md` (pointing at this cycle; no new wiki pages this cycle).

## Out-of-scope (parking lot)

These are deliberate deferrals, recorded so they don't get smuggled back in:

- Glossary corpus entry (deferred — only if play data shows `??` Q&A is hitting un-grounded questions).
- Per-`failure_pattern` delta amplification weights (deferred — would require more run data to tune).
- Surfacing `sub_turns[]` beats in the TTY prose (deferred — `situation/pressure/decision_point` come from the last sub_beat; the *intermediate* beats live in the run log only, so the prose-only principle stays intact).
- Player-controlled sub-beat count (deliberately not added — the type-driven default is the design).
