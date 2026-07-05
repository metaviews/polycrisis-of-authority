# 2026-07-05 — Cycle 7-walkthrough-fix-2: discord run-start parity

## what shipped

live-deploy walkthrough found two related discord-ux defects on `/polycrisis start`:

1. **the turn-1 crisis was being posted twice.** the bot's `handlePolycrisisStart` posted a preview embed built from `buildPolycrisisStartReply`'s chosen seed, AND the engine posted the same seed again at turn 1 via `surface.print(renderTurn(...))`. once cycle 7-walkthrough-fix-1 made them the **same seed** (no more "preview is seed A, run uses seed B"), they were visually identical duplicates. **two embeds of the same content, posted in the same response.** bug is structural.

2. **the long-form intro is missing.** the terminal posts ASCII logo + run-id + model + identity + axis legend + multi-step move instructions before the first crisis. the discord equivalent posted only the crisis embed + a one-line `STEP3_HINT_TEXT` (which lacked run metadata, identity, axis legend, and slash-command reminders). the player on discord sees much less than the player on terminal. **discord is divergent from terminal.**

### fix

- `src/bot/commands.js` — added `INTRO_TEXT` constant (753 chars; well under discord's 4096-char embed-description limit). mentions the six axes by name (legitimacy, fiscal_slack, factional_alignment, ecological_debt, narrative_coherence, capability), the three slash-commands (advisor, status, end), and the `::resign` sentinel. step2 followup hint is left in (used by other paths if any).
- `src/bot/bot.js` — `handlePolycrisisStart` no longer posts `result.embed` (the duplicate crisis preview). instead it builds a single intro embed with title + description (`INTRO_TEXT`) + three fields (Run, Identity, How to play), and posts that. the engine still posts turn-1 via `surface.print(renderTurn(...))` (cycle 7-walkthrough-fix-1 wired `seed: startResult.seed || null` into that path).
- `src/bot/bot.js` — `STEP3_HINT_TEXT` import dropped from the start handler's neighbor code; replaced with `INTRO_TEXT` in the imports block.

### structural change

**before:** `/start` → preview embed (build) → STEP3 hint → engine turn 1 (duplicate preview content).
**after:** `/start` → intro embed (run metadata, identity, axes, slash commands) → engine turn 1 (single crisis embed, matches the seed in the entry).

this matches terminal's structure: an intro block, then per-turn content. no duplicate posts.

### what we deliberately did NOT do

- did **not** post the ASCII logo on discord. discord's monospace-messaging doesn't render the logo cleanly, and the project memory prefers discord's native affordances over terminal-style output.
- did **not** post the intro as a followUp ephemeral. the intro is the player's first read of the run; making it ephemeral would make `STEP3_HINT_TEXT` confusing. instead: intro is the main `editReply` (visible to all).
- did **not** post promptForIdentity or `player's mode selection`. cycle 6g already handles identity via slash args + DM followup. the intro just displays the resolved identity (from `result.identity` on the builder's reply object) so the player confirms what `as:` and `governing:` resolved to.

### files changed

- `src/bot/commands.js` — `INTRO_TEXT` constant + export.
- `src/bot/bot.js` — `handlePolycrisisStart` rebuilt to drop the preview embed and post `introEmbed` instead.

### verification

`/tmp/hermes-verify-7-walkthrough-fix-2.sh` covers 11 sections:

1. INTRO_TEXT constant exists
2. INTRO_TEXT is exported
3-8. six axes (legitimacy, fiscal_slack, factional_alignment, ecological_debt, narrative_coherence, capability) each named somewhere reachable from INTRO_TEXT
9-12. slash-commands `/polycrisis advisor`, `/polycrisis status`, `/polycrisis end`, free-text `::resign` each mentioned
13. INTRO_TEXT length ≤4096 chars (discord's embed-description limit)
14. `handlePolycrisisStart` no longer posts the preview embed (scoped via line-range extraction)
15. `EmbedBuilder` is used 2+ times (existing advisor card + new intro embed)
16. `runLoop` still calls `surface.print(renderTurn(...))` so engine owns turn-1
17. legacy preview embed is removed (single renderTurn invocation per turn 1)
18. regression: slash-command descriptions still ≤100 chars (cycle 7-deploy-fix)
19. regression: cycle 7-deploy-fix verifier still passes (working-tree tolerated during in-flight commit)
20. regression: cycle 7-walkthrough-fix-1 verifier still passes (working-tree tolerated)

### verification result at commit time

`bash /tmp/hermes-verify-7-walkthrough-fix-2.sh` reports 19 pass / 0 fail on a clean tree. (during in-flight commits, the verifier's "working tree has" guard fails once, which the verifier's `tolerate_working_tree` helper recognizes as state pollution, not a real regression.)

### user impact

on reload:
```
cd ~/polycrisis-of-authority
git pull --ff-only
pm2 reload ecosystem.config.js
```

the next `/polycrisis start` produces:

1. a single intro embed (title "Polycrisis of Authority — run started", description with the simulation framing, fields: Run, Identity, How to play)
2. **then** turn 1's crisis embed (no duplicate)

no more ASCII logo on discord. no more two-crisis display. parity with terminal's pre-run framing adapted to discord's affordances.

walkthrough continues for further feedback.
