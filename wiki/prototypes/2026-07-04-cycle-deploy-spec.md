# 2026-07-04 — Deployment spec filed

files-only cycle: spec doc landed, no implementation. the
user's request was "take the time to produce the spec docs before
we proceed." this is the spec.

## what shipped

`docs/16-deployment.md` — single-doc deployment specification,
~760 lines. 8 sections covering install, secrets, pm2 supervision,
sqlite persistence, monitoring, webhook liveness, upgrade+rollback,
live-run confirmation.

## grounding conversation (2026-07-04, original + revised)

**original ground (2026-07-04 afternoon)**:
- ubuntu/debian, node-install-flexible, pm2, openrouter-or-MiniMax-
  direct-both, sqlite-on, full monitoring, webhook liveness, env-var
  model swap, public-internet security (hardened), single-doc spec

**revision (2026-07-04 evening)**:
- "before we proceed with install, let's make some modifications
  to the intended deployment. i do not want anything installed
  system wide. instead everything should reside within a
  /home/user directory. this isn't just about us, we're
  publishing this publicly, so that means other users could
  follow these instructions, which means they should not be
  custom to our environment."
- pm2 launched as the user (no service account, no systemd
  autostart by default)
- db at `~/.local/share/polycrisis/bot.db` (XDG-style)
- logs at `./logs/` inside the install dir
- install dir at `~/polycrisis-of-authority`
- §7 (security hardening) **dropped** from this doc entirely.
  user is responsible for OS-level hardening; this doc references
  VPS provider / OS security docs.

## structure of the doc (revised)

- header: intended audience, what's-not-in-scope (incl. OS-level
  hardening), file layout, locked groundings
- §1 install + run
- §2 secrets + config
- §3 process supervision (pm2, as user)
- §4 sqlite persistence
- §5 monitoring + observability
- §6 webhook liveness
- §7 upgrade + rollback
- §8 live-run confirmation

the old §7 (security hardening) is gone. sections that referenced
system service accounts, `/etc/ssh/sshd_config.d/`, fail2ban, ufw,
etc. were rewritten or removed.

## public-readiness principle

the user's framing: "we're publishing this publicly, so that means
other users could follow these instructions, which means they
should not be custom to our environment."

every path in the doc is referenced via `$HOME` / `~/` / generic
positions. the only places a path is a literal absolute path are
where the project has a clear convention (the github repo URL,
the npm install paths). the next user can clone the repo and
follow the same steps; their `$HOME` is just substituted for ours.

## cycle plan (8 cycles, 7-install → 7-live-run)

```
7-install    ← §1
7-secrets    ← §2
7-pm2        ← §3
7-sqlite     ← §4
7-monitoring ← §5
7-webhook    ← §6
7-upgrade    ← §7
7-live-run   ← §8 (incl. prototype doc at wiki/prototypes/2026-07-04-cycle-deploy-live-run.md)
```

each cycle starts with R1–R4-style grounding before any code lands.
no remote commands without explicit user confirmation.

## status

- spec filed at `docs/16-deployment.md`
- 8 sections, no security-hardening section (out of scope per user)
- wiki/index entry + log entry + this prototype observation
- working tree ready for review
- next: cycle 7-install when user signals "start the deploy"
