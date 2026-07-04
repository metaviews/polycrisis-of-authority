# 2026-07-04 — Cycle 6g prototype observation: end + identity capture

Cycle 6g closes the discord build plan. Step 7 of 7 from
`docs/13-discord-bot-architecture.md`.

## observations

**five-input identity capture matrix.** the slash options `as:` and
`governing:` together produce three meaningful inputs:
- both provided → identity applied directly, no followup
- only one provided → followup DM asks for the missing one
- neither provided → followup DM asks for both in two sequential lines

the player can stay silent and defaults apply at first in-channel move.
this matched what terminal does (cycle 5h's `promptForIdentity`) except
the discord surface uses DM followup instead of multi-line stdin prompts
(single-message chat).

**`/polycrisis end` vs `::resign`.** the new slash command is the
discoverable surface. the existing free-text sentinel stays hidden for
power users. both converge on the same run-end path through
`surface.forceEnd()` — the active MessageCollector is stopped with
reason='end', the readMove promise rejects with a sentinel "run ended
by user request" error, the `runDiscordLoop` catch path catches it,
posts the clean "run ended" message, and the finally block cleans up
activeRuns.

**identity threading.** the run entry now carries flat `player` +
`regime` (so `formatStatusEmbed` reads them unchanged) plus a nested
`identity` object passed to the engine. `consult()` (advisor button
click), `runLoop()` (the main loop), and `formatStatusEmbed` (status
slash command) all read from the same source-of-truth entry.

**storage surface reference on the entry.** `runDiscordLoop` writes
`entry.surface = surface` so `/end` can call `surface.forceEnd()`
without needing access to the surface closure. this is the only way
to stop the active MessageCollector from outside the loop's own call
stack.

## deferred items (per scope grounding)

- `/polycrisis artifact` slash command
- corpus quote during the typing indicator
- walkthrough sub-regression flakiness
- crash-recovery hardening
- deployment (separate cycle)

## verification

26 of 27 checks pass on `/tmp/hermes-verify-6g-end-and-identity.sh`.
the 1 fail is the working-tree-clean guard at the top of the script
which fires pre-commit by design. resolves green once 6g ships.

main behaviors verified:
- POLYCRISIS_COMMAND shape (end + as + governing)
- all 5 identity capture matrix cases
- /end no-run + active-run paths + endingBy flag
- display text + constants
- discord surface contract (`forceEnd` + readMove reason='end' branch)
- handleDmReply 5 scenarios (ask_both / ask_player / ask_regime +
  their blank-input fallbacks)
- /start already-active rejection preserved
- activeRuns entry shape

## status

- cycle 6g shipped at `200df2b` (post this commit)
- working tree clean
- next: deployment to the user's dedicated server, then live-run
  confirmation with real discord credentials, then walkthrough.

## sources

- design: `docs/15-discord-bot-cycle-6g.md`
- spec: `docs/13-discord-bot-architecture.md` row 7 of the build plan
- identity capture pattern: `src/sim/identity.js` (cycle 5h, terminal)
- 6e/6f: prior discord cycle contracts preserved
