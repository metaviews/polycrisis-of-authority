# 2026-07-04 — Deployment spec filed

files-only cycle: spec doc landed, no implementation. the
user's request was "take the time to produce the spec docs before
we proceed." this is the spec.

## what shipped

`docs/16-deployment.md` — single-doc deployment specification,
1684 lines. 9 sections covering install, secrets, pm2 supervision,
sqlite persistence, monitoring, webhook liveness, security, upgrade,
live-run confirmation.

## grounding conversation (2026-07-04)

asked the user 8 multi-choice questions about server specifics.
answers locked in:

1. **OS**: ubuntu/debian (apt + systemd, but pm2 for app supervision)
2. **node**: uncertain — spec covers both "node is already installed"
   and "node needs install" paths. nvm default; apt as documented alt.
3. **supervisor**: pm2 (not systemd units, not docker). lighter than
   systemd, friendlier for non-DB apps.
4. **LLM provider**: both openrouter AND direct MiniMax m3 selectable
   via env (`MODEL_DIRECT=true`). openrouter default; MiniMax
   direct as the case-study alternative.
5. **persistence**: yes, persistent sqlite (`better-sqlite3`). v2
   of the discord spec.
6. **monitoring**: all three (logs + rotation + uptime + heartbeat).
7. **liveness**: webhook (POLYCRISIS_LIVENESS_WEBHOOK). discord/slack
   incoming-webhook style.
8. **security**: public-internet posture (ssh-key only, fail2ban,
   firewall, non-root polycrisis user, secrets isolated).
9. **model swap**: env-var-only (flip OPENROUTER_MODEL, pm2 reload).
   no schema migration.
10. **spec shape**: single doc (not split per concern).

## structure of the doc

- header: audience, scope table, what's-not-in-scope, cycle plan
- §1 install + run
- §2 secrets + config
- §3 process supervision (pm2)
- §4 sqlite persistence
- §5 monitoring + observability
- §6 webhook liveness
- §7 security hardening (rest of §7)
- §8 upgrade + rollback
- §9 live-run confirmation

each section has the same shape:
- behavior shipped
- the actual command / schema / config
- code changes (new + modify files)
- env vars (extending §2)
- constraints
- what's NOT in this section
- verification (per-cycle ad-hoc script)
- pending grounding (callouts where applicable)

## pending grounding for upcoming cycles

gathered in callout blocks (`> **§X.Y (grounding pending)**`):

- §4.1 — backups: skip for v1 (spec default); user can request a
  minimal daily backup later if they want
- §5.1 — heartbeat fields: `(source, kind, ts)` is the minimum
  useful (spec default); user can request richer fields
- §7.1 — operator's ssh key: spec assumes you already have one
  (`~/.ssh/id_ed25519` typically). confirm.
- §7.2 — operator-login flow: spec assumes you log in as your
  regular ssh user and `sudo -u polycrisis` from there
- §7.3 — ssh port: keep 22 (default; more visible activity in
  logs) or move to a non-standard port (cuts drive-by scans)
- §2 refactor scope: confirm the swappable LLM client in
  `src/sim/openrouter-client.js` (or equivalent) actually
  exists before §2 implementation. if not, §2 grows a refactor
  cycle first.

## cycle plan

each section ships as its own cycle in series `7-x`:

| cycle | section | what's new | estimated effort |
|---|---|---|---|
| 7-install | §1 | nvm-or-apt, /opt/polycrisis, npm ci, smoke checks | 0.5 day |
| 7-secrets | §2 | .env mode 0640, env inventory, swappable LLM | 0.5 day |
| 7-pm2 | §3 | ecosystem.config.js, polycrisis user, pm2 startup | 1 day |
| 7-sqlite | §4 | persistence.js, db-migrate.js, 001-initial-schema.sql | 1 day |
| 7-monitoring | §5 | log.js helper, logrotate, heartbeat.js | 1 day |
| 7-webhook | §6 | webhook.js helper, payload shapes | 0.5 day |
| 7-security | §7 | ssh config, ufw, fail2ban, audit script | 1 day |
| 7-upgrade | §8 | runbooks, rollback test | 0.5 day |
| 7-live-run | §9 | operator runs the runbook, this doc captures the result | 0.5 day |

total: 6.5 days. v1 of the deployment ships.

the spec was approved ground-truth. each cycle starts with R1–R4
grounding before any code lands or remote commands touch the
server.

## status

- spec filed at `docs/16-deployment.md` (commit ee12df6)
- wiki index entry + log entry + this prototype observation recorded
- working tree clean
- next: cycle 7-install when the user signals "start the deploy"
