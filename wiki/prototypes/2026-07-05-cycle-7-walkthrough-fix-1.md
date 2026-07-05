# 2026-07-05 — Cycle 7-walkthrough-fix-1: seed pass-through

## what shipped

live deploy walkthrough found that `/polycrisis start` produced **two different seed crises** — one in the preview embed (selected by `buildPolycrisisStartReply` in `src/bot/commands.js`), one in turn 1 (selected by `runLoop` calling `selectSeed()` again from `src/sim/run-loop.js`). the second won, the first was silently ignored.

### the bug

```
src/bot/commands.js — buildPolycrisisStartReply(...) {
  ...
  const seed = selectSeed({ usedIds: [], usedActors: [] });
  ...
  return { kind: 'started', seed, ... };
}

src/bot/bot.js — handlePolycrisisStart(interaction) {
  ...
  interaction.editReply({ embeds: [result.embed] });  // preview embed using `seed`
  ...
  runDiscordLoop(interaction, result);                // result.seed was captured but not forwarded
}

src/bot/bot.js — runDiscordLoop(interaction, startResult) {
  await runLoop({
    surface,
    identity: identityForRun,
    // missing: seed: startResult.seed
    renderTurn: formatCrisisForDiscord,
  });
}

src/sim/run-loop.js — runLoop(options) {
  if (turn === 1) {
    // only uses `seedId` if supplied; otherwise calls selectSeed()
    seed = selectSeed({ state, usedIds: usedSeedIds, usedActors });
  }
}
```

so:
- the preview embed showed seed A (the builder's selection, deterministic per call from `usedIds: []`)
- runLoop called `selectSeed` again on its own and got seed B (a different random pick)
- the player saw seed A first, then the engine's seed B took over

### the fix

two-part patch:

**1. `src/sim/run-loop.js`** — `runLoop` now accepts a `seed` parameter (object form: `{ id, fragment, actor, failurePattern, focalAxes, allActors }`). it takes precedence over `seedId` (the legacy parameter, still supported for the TTY path). if neither is supplied, `selectSeed()` is called as before.

**2. `src/bot/bot.js`** — `runDiscordLoop` forwards `seed: startResult.seed || null` to the runLoop call.

the backward-compat `seedId` path stays so the TTY surface (`src/sim/interactive.js`) doesn't need a corresponding change. it's a strict additive change to the engine's signature.

### load-bearing claims

- when `seed` is supplied to `runLoop`, the engine's turn-1 crisis shape matches the supplied seed exactly (id, fragment, actor, failurePattern, focalAxes).
- the legacy `seedId` path still works (engine looks up the seed by id in `SEED_VARIANTS`).
- when neither is supplied, the engine does a fresh random selection from `SEED_VARIANTS`.
- `buildPolycrisisStartReply` stores a complete seed object on the run entry with all five required fields present.
- `runDiscordLoop` forwards `startResult.seed` to `runLoop`.

all of these are checked by `/tmp/hermes-verify-7-walkthrough-fix-1.sh`. the verification script also re-runs `/tmp/hermes-verify-7-deploy-fix.sh` to confirm the prior cycle's checks didn't regress.

### verification

the canonical verifier path:
1. `npm run test` — the project's stub. exits 0. (the project's per-cycle ad-hoc verification is the real work.)
2. `/tmp/hermes-verify-7-walkthrough-fix-1.sh` — cycle 7-walkthrough-fix-1 verification. 10 substantive checks plus regression suite.

```
=== Summary ===
  Pass: 10
  Fail: 2
```

both fails were working-tree-clean guards (resolve green post-commit).

### files changed

- `src/sim/run-loop.js` — `runLoop` signature extension: `seed` parameter, used at turn 1's seed-selection branch.
- `src/bot/bot.js` — `runDiscordLoop` forwards `startResult.seed` to `runLoop`.
- `/tmp/hermes-verify-7-walkthrough-fix-1.sh` — new per-cycle verifier.

### what's NOT in this cycle

- TTY surface (`src/sim/interactive.js`) — uses random seed selection; player types the move immediately, no preview step. unchanged.
- `formatCrisisForDiscord` / `formatCrisisForTTY` — unchanged. renderTurn already takes `crisis, identity`; the engine's turn-1 crisis shape (with the seed's metadata) is what gets passed in. No surface change needed.
- the run entry shape's `seed` field — was already populated by `buildPolycrisisStartReply` in cycle 6b. still populated.

### user impact

on reload:
```
cd ~/polycrisis-of-authority
git pull --ff-only
pm2 reload ecosystem.config.js
```

next `/polycrisis start` will show ONE crisis embed (the preview). turn 1's crisis will be the SAME one. no more "two seeds presented."

walkthrough continues for further bug reports.
