---
title: "2026-07-05 — Cycle 9 — Discord run notifications"
date: 2026-07-05
type: prototype
prototype_kind: script-snapshot
model: minimax-m3+openrouter
---

# 2026-07-05 — Cycle 9 — Discord run notifications

## what shipped

User-grounded feature: **post a discord embed to a configured channel every time
a polycrisis run is started or ended.**

- **`src/bot/notifications.js`** — new file. exports `notifyRunStart()` and
  `notifyRunEnd()`. Both call `client.channels.cache.get(env).send(embed)`.
  Best-effort: errors are caught and logged, never thrown (so a broken
  channel never breaks gameplay).
- **`src/bot/bot.js`** — `handlePolycrisisStart` calls `notifyRunStart`
  immediately before `runLoop` (after identity capture is final). The
  `runDiscordLoop`'s `finally` block calls `notifyRunEnd` (fires on
  normal completion AND catch path so every run gets a notification
  regardless of outcome).
- **`.env.example`** — adds `DISCORD_NOTIFICATION_CHANNEL_ID=` with
  explainer comment.
- **`docs/14-discord-bot-setup.md`** — new "Step 6.5" subsection under
  Step 6 explaining how to get the channel id.

## payload shape

**Run-start embed:**
- title: `Polycrisis run started`
- color: `0x4f7cac` (muted blue)
- fields: Run id, Model, Seed, Identity (player + regime), Started

**Run-end embed:**
- title: `Polycrisis run ended`
- color: `0x8a6b6b` (muted red)
- fields: Run id, Outcome, Turns, Identity, Ended, Model

`Outcome` is whatever the run's `endingBy` value was at run end:
- `'user-end'` — player sent `::resign` or `/polycrisis end`
- `'collapse'` — engine surface's collapse (axes tipped)
- `'stabilization'` — engine reached stable equilibrium
- `'no-collapse'` — run completed without collapse / stabilization
- `'error'` — unhandled run-loop error
- `'unknown'` — fall-through if no endingBy set

## opt-in

`DISCORD_NOTIFICATION_CHANNEL_ID` is the only knob. If unset, both
notifications are silent no-ops (verified by the verifier). This
keeps the feature opt-in to avoid surprising existing deployments
that don't want notification noise.

## decide constraints

the .env.example / docs/14-discord-bot-setup.md guidance is grounded
on the user's request: "i'd rather have it settable via env variable
than hardcoded." the channel id is a deploy-time concern (changes
per server / per channel layout), so it goes in `.env`, not source.

## design choices made

- **"direct channel.send(), not WebhookClient"**: a configured channel
  id lets you bind a `TextChannel` from `client.channels.cache` and
  call `.send(embed)` directly. WebhookClient works too but requires
  Manage Webhooks perm, requires per-message webhook creation, and
  is structurally more expensive. Direct-channel is also the standard
  pattern documented in the discord.js guide.
- **"post in the same channel, not DM users"**: the user's request
  was "anytime a round of the game is started or ended notification
  is sent using a webhook to the channel" — they named a single
  channel id (1523657946272235652) and asked for notifications in
  that channel. We honor that — not a DM flow.
- **"best-effort, not throw"**: a discord notification must never
  break gameplay. If the channel was deleted between deploy and
  runtime, the bot should still run correctly. `notifyRunStart` /
  `notifyRunEnd` wrap their sends in try/catch and log errors.
- **"post on run-end, including catch path"**: if a run times out
  or errored, the run-end notification still fires. That's
  specifically useful for the moderator — they want to know a run
  ended, regardless of the outcome.
- **"identity comes from the entry, not from the engine"**: the
  `activeRuns` entry is set at /start time (with identity defaults
  applied). Reading from the entry at run end gives us the player's
  resolved identity (regardless of whether the run caught or completed
  normally).

## verification

`/tmp/hermes-verify-discord-run-notifications.sh` covers 18 checks:

| # | check | result |
|---|---|---|
| 1 | canonical (npm run test) | PASS |
| 2 | hermes-verify-7-deploy-fix.sh regression | PASS |
| 3 | hermes-verify-8a-extension-entities.sh regression | PASS |
| 4 | hermes-verify-8b-themes.sh regression | PASS |
| 5 | hermes-verify-8c-concepts.sh regression | PASS |
| 6 | notifications module loads cleanly | PASS |
| 7 | exports notifyRunStart + notifyRunEnd | PASS |
| 8 | notifyRunStart posts an embed to the configured channel | PASS |
| 9 | notifyRunEnd posts an embed to the configured channel | PASS |
| 10 | silent when env unset (start + end) | PASS |
| 11 | errors caught, not thrown (start + end) | PASS |
| 12 | embed shapes correct (Run id, Identity, Outcome, Turns fields) | PASS |
| 13 | bot.js imports notifyRunStart + notifyRunEnd | PASS |
| 14 | bot.js calls notifyRunStart (1+ sites) | PASS |
| 15 | bot.js calls notifyRunEnd (1+ sites) | PASS |
| 16 | notifyRunEnd is in the `finally` block (fires for normal + error) | PASS |
| 17 | .env.example documents the new env var | PASS |

verification runs against a discord.js shim that mocks
`client.channels.cache.get(...).send(...)` and captures the sent
embeds for shape inspection. The full captured embed payloads are
printed in the verifier output.

## cycle plan

```
8a / 8b / 8c / 8a-extension  — corpus trilogy (shipped)
9a — discord run notifications (this cycle)
```

## user impact

- A configured channel (e.g., 1523657946272235652) now receives one
  embed on every run start + one on every run end. Anyone with read
  access to that channel can monitor active runs without being in
  the gameplay channel.
- The bot can now be deployed to a "monitoring" channel layout
  where a moderator tracks multiple servers' run activity by
  pinning one channel per server (or aggregating into a shared
  channel).

## next decisions

1. close cycle 7 pendings (deploy-spec §8 update + walkthrough doc)
2. concept expansion (cycle 9+, ~76 forward-references to fill)
3. signal-filing pipeline
4. something else
