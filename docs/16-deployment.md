# Polycrisis of Authority — Discord Bot Deployment Guide

This guide covers deploying the Polycrisis of Authority discord bot
(`src/bot/bot.js`) to a personal server running Debian or Ubuntu.
Everything lives in one user's home directory. No system-wide
packages are installed, no service accounts are created, and the
supervisor runs under the user's own shell.

## intended audience and environment

This guide is for someone who wants to host the bot on a personal
server, home machine, or VPS. The instructions are public-readiness:
another person with a fresh Debian/Ubuntu install and a non-root
shell account should be able to follow them end-to-end without
modification.

The default environment is:
- a single shell account, referred to throughout as `$USER`
- that user's home directory is `$HOME` (often `/home/$USER`)
- Debian or Ubuntu (apt-based; system packages are used only if
  explicitly listed in **§1 install + run**)
- access to the internet for `git clone` and outbound HTTPS to
  discord + the LLM provider

The user's goal is to start the bot, run it under pm2, persist run
state in sqlite, observe it through logs and a heartbeat, and be
able to upgrade it cleanly when a new version ships.

## what's inside

| section | what | why |
|---|---|---|
| 1. install + run | node, app layout, log dir, env-vars, npm install | the system runs |
| 2. secrets + config | `.env`, permissions, openrouter vs direct LLM | the bot authenticates |
| 3. process supervision | pm2 under the user's shell, start/stop/restart | survives crashes + logouts |
| 4. sqlite persistence | `better-sqlite3` schema for runs + turns | survives restarts |
| 5. monitoring + observability | structured logs, logrotate, uptime heartbeat | we can see what's happening |
| 6. webhook liveness | optional webhook URL on boot/stale/crashed | we get told if it's down |
| 7. upgrade + rollback | `git pull && npm ci && pm2 reload` | we can ship a fix |
| 8. live-run confirmation | first real end-to-end run | acceptance |

## what's NOT in this guide

- multi-instance / clustering — single process is sufficient
- load balancing — single machine, single process
- k8s / docker swarm — bare metal + pm2 is enough
- multi-region — the bot is per-guild, no benefit from regions
- CI/CD pipelines — `git pull && pm2 reload` is the deploy
- TLS termination / reverse proxy — the bot doesn't serve web traffic; only outbound HTTPS to discord + LLM provider
- **OS-level security hardening** (ssh, firewall, fail2ban, unattended-upgrades). The user is responsible for hardening their own server; see your VPS provider's docs or your OS security guide. The bot does not need any of these configured to run, only to be reachable safely from outside.
- **system service accounts.** Nothing in this guide creates or modifies system users. The `$USER` account you log in as is the only identity involved.

## file layout

```
~$USER/
└── polycrisis-of-authority/                  ← git clone; everything lives here
    ├── .env                                  ← env-var file (mode 0600)
    ├── .env.example                          ← tracked in git, mode 0644
    ├── package.json
    ├── package-lock.json
    ├── node_modules/                         ← populated by npm install
    ├── logs/                                 ← log directory (created by pm2 or first run)
    ├── src/                                  ← source tree (unchanged from cycle 6g)
    ├── wiki/
    ├── scripts/
    └── ...
~/.local/share/polycrisis/                    ← runtime state, persisted across installs
├── bot.db                                    ← sqlite database
├── bot.db-wal                                ← write-ahead log (sqlite-managed)
├── bot.db-shm                                ← shared memory (sqlite-managed)
└── ~/.pm2/                                   ← pm2's per-user state dir (created by pm2 itself)
```

**all application code and all runtime state live under `$HOME`.** There is no `/opt/polycrisis`, no `/var/lib/polycrisis`, no `/var/log/polycrisis`, no service user called `polycrisis`. This is intentional and load-bearing for the public-readiness of the guide: anyone with a fresh user account on Debian/Ubuntu can follow these steps and get a working bot without `sudo` (or with `sudo` only when they explicitly want to).

> **§X.Y groundings (locked)**: paths use `XDG_DATA_HOME` (`~/.local/share/polycrisis`) for persistence, the install dir is `~/polycrisis-of-authority`, logs are `./logs/` inside the install dir, pm2 is launched as the user under the user's shell with no systemd autostart, and OS-level hardening is out of scope.

---

# §1. install + run

## behavior shipped

- node (current LTS) is on the system. The guide covers both states: node is already installed, or node needs to be installed from apt.
- the app lives at `~/polycrisis-of-authority` (created by `git clone`).
- app dependencies are installed via `npm install --omit=dev` (production-only) using the project's checked-in `package-lock.json`.
- logs land in `~/polycrisis-of-authority/logs/` (created on first run).

## install steps

### if node is already on the system

```bash
node --version        # expect v22.x or v20.x LTS
```

### if node is not yet installed

```bash
# node is in the distro's package archive on modern Debian/Ubuntu; we use
# the system package rather than nvm to keep this guide free of per-user
# toolchains. (See "alternatives" below for nvm if you prefer.)
sudo apt-get update
sudo apt-get install -y nodejs npm
node --version        # confirm v20.x LTS on Debian 12 / Ubuntu 22.04+
npm --version
```

alternatively, install a specific version via NodeSource:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs
```

### clone the app

```bash
cd $HOME
git clone https://github.com/metaviews/polycrisis-of-authority.git
cd polycrisis-of-authority
ls              # confirm package.json, src/, wiki/, scripts/ etc. are present
```

### install dependencies

```bash
cd $HOME/polycrisis-of-authority
npm install --omit=dev     # production-only deps; no devDep tools are needed at runtime
```

### smoke-check the install

```bash
cd $HOME/polycrisis-of-authority
test -f package.json            # true
test -d node_modules            # true
test -d src/sim                 # true (engine source)
test -f .env.example            # true
node -e "require('discord.js')" # succeeds (if it hangs, exit with Ctrl-C; the smoke check is whether require resolves)
```

## alternatives

### node via distro apt vs nvm

- **distro apt** (default in this guide): system-wide, one version, simpler, no shell-customization. what `apt-get install -y nodejs` puts on your system is what's used everywhere. fits the "this guide works for any new user" framing.
- **nvm** (alternative, not recommended here): per-user, no `sudo` for `npm install`, easier version-pinning. adds a shell-customization step that not every user wants. if you prefer nvm, install with the project-standard nvm install script, then `nvm install --lts` and proceed with §1 from the clone step.

the guide defaults to apt because it produces a single, obvious install command and zero per-user shell changes. swap to nvm if you have a reason to.

### cloning vs. downloading a release tarball

`git clone` is the default. if you don't want git around on the server, download a release tarball from the project's GitHub releases page and unpack. the rest of the guide is the same.

## constraints

- the user account that does the install is the same account that runs pm2 (`$USER`). there's no `sudo -u polycrisis` step anywhere.
- `~` and `$HOME` are interchangeable throughout; `~` is used in display, `$HOME` in scripts.
- `.env` is mode `0600` (covered in §2), owned by `$USER:$USER`.
- `node_modules/` is owned by `$USER`; never run `sudo npm install` (it would change ownership).

## what's NOT in §1

- log directory creation — pm2-logrotate (in §5) handles `logs/`. logs also get created implicitly when pm2 starts and writes its first line.
- the systemd hook for boot — none. the bot is expected to run while your shell session is alive (pm2 keeps it alive across the shell). if you want it to survive a full logout, see the "systemd user service" alternative below.
- secrets — covered in §2.

### alternative: systemd user service (if you want boot-time autostart)

if you want the bot to come back up after a full system reboot AND your server has a graphical login or autologin for your user account, you can let systemd's user instance manage pm2. this is opt-in and uses no system-wide package installs. see the systemd user service alternative in §3.

---

# §2. secrets + config

## behavior shipped

- secrets are isolated to one file: `~/polycrisis-of-authority/.env`.
- `.env` is mode `0600`, owned by `$USER:$USER`. only the user can read or write it.
- `.env` is gitignored (already is — see `.gitignore` shipped in cycle 1c).
- the bot reads the env vars at startup; missing required vars crash the process with a clear error (see the `REQUIRED_ENV` check in `src/bot/bot.js`).

## env vars the bot consumes

| name | required? | what it controls |
|---|---|---|
| `DISCORD_BOT_TOKEN` | yes | bot user token |
| `DISCORD_CLIENT_ID` | yes | discord application client id |
| `DISCORD_GUILD_ID` | optional | if set: slash commands are guild-scoped (instant); if unset: global (~1hr) |
| `OPENROUTER_API_KEY` | yes (when `OPENROUTER_MODEL` is set) | openrouter auth |
| `OPENAI_API_KEY` | yes (when running with direct provider) | direct LLM auth |
| `OPENAI_BASE_URL` | optional | swap to a non-openrouter API; defaults to openrouter's URL when unset |
| `OPENROUTER_MODEL` | optional | model id when using openrouter; default: `minimax/minimax-m3` |
| `FALLBACK_OPENROUTER_MODEL` | optional | used by the engine on rate-limit / failure; default: `google/gemini-3.1-flash-lite` |
| `MODEL_DIRECT` | optional | when `"true"`, bot talks to `OPENAI_BASE_URL` (e.g. a direct provider) instead of openrouter |
| `POLYCRISIS_DB_PATH` | optional | sqlite db location; default `~/.local/share/polycrisis/bot.db` |
| `POLYCRISIS_LIVENESS_WEBHOOK` | optional | url to POST boot/stale/crashed events to; default empty (silent) |
| `POLYCRISIS_HOST_LABEL` | optional | label included in webhook payloads; defaults to the hostname |

## .env shape (template)

```dotenv
# ~/polycrisis-of-authority/.env
# generated from .env.example — fill these in

DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=

# openrouter (default LLM provider)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=minimax/minimax-m3
FALLBACK_OPENROUTER_MODEL=google/gemini-3.1-flash-lite

# direct LLM provider (used when MODEL_DIRECT=true). defaults to openrouter's URL.
# set OPENAI_BASE_URL and OPENAI_API_KEY for direct provider connections.
OPENAI_API_KEY=
OPENAI_BASE_URL=
MODEL_DIRECT=false
```

when using openrouter (default), set `OPENROUTER_API_KEY`. the `OPENAI_BASE_URL` is left empty and `MODEL_DIRECT` stays `false`. when using a direct provider, set `MODEL_DIRECT=true`, fill in `OPENAI_API_KEY`, and set `OPENAI_BASE_URL` to the provider's URL.

## LLM provider selection

the project ships with an LLM client (`src/sim/openrouter-client.js` or equivalent — confirmed during implementation grounding) that supports both openrouter and direct OpenAI-compatible APIs. selection is environmental:

- **default: openrouter.** `OPENROUTER_MODEL` is consulted. base URL is openrouter's; auth header is `Authorization: Bearer ${OPENROUTER_API_KEY}`.
- **direct:** set `MODEL_DIRECT=true` in `.env`. the bot reads `OPENAI_BASE_URL` and `OPENAI_API_KEY` instead. headers switch to OpenAI's `Authorization: Bearer ${OPENAI_API_KEY}`.

both paths use the same chat-completions schema (request body shape is identical). the case-study claim is that this swap is environmental, not code: change `.env`, `pm2 reload`, done.

## .env permissions

```bash
cd $HOME/polycrisis-of-authority
install -m 0600 .env.example .env    # first time only; the .env.example is the initial template
ls -l .env                          # -rw------- $USER $USER
```

- owner can read+write (`rw-`)
- group has nothing (`---`)
- world has nothing (`---`)
- root can read+write as always

after the user fills in the `.env` by hand (or via copy-paste from a password manager), permissions are preserved by the editor they use. if the editor changes them, run `chmod 0600 .env` again.

## .env.example tracking

`.env.example` is the template that ships in git. the bot's startup logs reference `docs/16-deployment.md` (this doc) when a required env var is missing.

## constraints

- **never** log env-var values. the bot's startup is `console.log` only, never `console.log(process.env.OPENROUTER_API_KEY)`.
- **never** include `.env` in a backup or in `git status`. already true via `.gitignore`.
- **never** copy `.env` to `/tmp/` or anywhere outside the install dir. secrets stay in `~/polycrisis-of-authority/.env`.

## what's NOT in §2

- logging discipline — covered in §5.
- model swap at deploy time — covered in §7.
- secret rotation — out of scope for v1.

---

# §3. process supervision (pm2)

## behavior shipped

- pm2 is installed **for the user** (no `sudo`). recommended install via `npm install -g pm2` to keep everything in `$HOME`.
- an `ecosystem.config.js` at `~/polycrisis-of-authority/ecosystem.config.js` declares the bot as a pm2-managed process with the right cwd, log paths, env-file directive, restart policy, and graceful shutdown.
- four pm2 lifecycle commands cover the day-to-day: `start`, `stop`, `restart`, `reload`.
- on crash, pm2 auto-restarts the bot with a short delay so transient failures don't tight-loop.
- on `SIGTERM`, the bot's existing handler (`client.destroy()` then exit; §1 of `src/bot/bot.js`) runs cleanly.

## pm2 install

```bash
# user-local pm2 (no sudo needed)
npm install -g pm2          # installs into $HOME/.npm-global by default
# if npm asks "do you want to set this as your prefix?", answer yes.

# add ~/.npm-global/bin to PATH for this session
export PATH="$HOME/.npm-global/bin:$PATH"

# verify
pm2 --version               # expect 5.x or 6.x
which pm2                   # expect $HOME/.npm-global/bin/pm2
```

alternative if you prefer system-wide pm2: `sudo npm install -g pm2`. works fine; pm2 still runs under your shell account when you invoke it.

## ecosystem.config.js

```javascript
// ~/polycrisis-of-authority/ecosystem.config.js
// pm2 config for the Polycrisis discord bot.
//
// Why this lives in the repo: the file is fully determined by the
// project structure (paths, env vars, log files). keeping it versioned
// means deploys are reproducible and config changes are reviewable.

module.exports = {
  apps: [{
    name: 'polycrisis-bot',
    script: 'src/bot/bot.js',
    cwd: '$HOME/polycrisis-of-authority',     // adjust if you clone elsewhere

    // pm2 reads .env natively via env_file.
    env_file: '.env',

    // Restart policy.
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,
    max_memory_restart: '512M',

    // Logs (paths under the install dir).
    out_file: './logs/bot.out.log',
    error_file: './logs/bot.err.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Lifecycle.
    kill_timeout: 8000,
    listen_timeout: 8000,
    time: true,
  }],
};
```

the `cwd` must be set to your absolute install path (`$HOME/polycrisis-of-authority`). if you clone it elsewhere, edit `ecosystem.config.js` accordingly.

## lifecycle

```bash
# start (idempotent: reuses an existing process; `pm2 reload` is the upgrade path)
cd $HOME/polycrisis-of-authority
pm2 start ecosystem.config.js
pm2 save                            # persist process list across pm2 restarts (NOT system reboots)
pm2 list

# graceful stop
pm2 stop polycrisis-bot

# graceful reload (after `git pull`; SIGTERM + start new instance, ~1s pause)
pm2 reload polycrisis-bot

# logs
pm2 logs polycrisis-bot
```

## no systemd autostart

this guide deliberately does **not** set up `pm2 startup` (the systemd hook that brings pm2 back up after a full system reboot). reasons:

- the user's instructions are explicit: everything in `/home/$USER`. systemd units via `pm2 startup` are system-wide.
- pm2 keeps the bot alive across **your shell session**: as long as you've started pm2 once (and run `pm2 save`), the process list survives. closing your terminal doesn't kill the bot.
- what pm2 does **not** survive: a full server reboot. this is acceptable for v1 — the bot recovers when you `pm2 resurrect` after a reboot (which `pm2 save` makes possible).

### alternative: systemd user service (opt-in)

if you want boot-time autostart AND your system has the systemd user instance enabled (it's the default on Debian/Ubuntu), you can enable boot-time startup **without any system-wide writes**:

```bash
# user-side systemd service (no sudo)
mkdir -p ~/.config/systemd/user
# pm2 can generate the unit file when run as the user:
pm2 startup systemd-user         # this prints a command you run as yourself
# it produces ~/.config/systemd/user/pm2-$USER.service

systemctl --user enable pm2-$USER.service
systemctl --user start pm2-$USER

# enable lingering so the user systemd runs even when you're not logged in:
sudo loginctl enable-linger $USER

# on reboot, pm2 starts as your user, then resurrects the saved process list.
```

this is opt-in. if you don't run the commands above, the bot survives your shell session but not a full reboot — which is fine for v1.

## constraints

- pm2 is invoked **as the user account that owns the install dir**. no `sudo -u` step anywhere.
- pm2's own state lives in `~/.pm2/` (created on first pm2 invocation).
- the `.env` is loaded by pm2's `env_file` directive. the bot's `REQUIRED_ENV` check fires at startup; if any required var is missing, pm2 records the crash in `logs/bot.err.log` and the restart policy fires.

## what's NOT in §3

- systemd autostart — opt-in via the alternative above; not part of the default flow.
- log rotation — covered in §5.

---

# §4. sqlite persistence

## behavior shipped

the bot opens a sqlite database at `~/.local/share/polycrisis/bot.db` using `better-sqlite3` (sync, no callback hell; matches the project's "polish + small" style).

- two tables: `runs` (one row per `/start`) and `turns` (one row per player move + one row per state delta + one row per advisor consult).
- on `/polycrisis start`, the new run is persisted (a restart mid-run recovers the state).
- on each turn start, a state snapshot is written (so `/status` reads survive crashes).
- on run end, the final outcome + outcome-flavored fields are written (collapse mode, turns completed, identity, run log paths).
- on bot startup, in-flight runs are loaded back into memory (the run loop resumes from the last persisted turn).
- completed runs are never deleted — they live in the database as the case-study's audit trail.

## file layout

```
~/.local/share/polycrisis/                    ← state dir; owned by $USER:$USER, mode 0700
├── bot.db                                     ← sqlite database
├── bot.db-wal                                 ← write-ahead log (sqlite-managed)
└── bot.db-shm                                 ← shared memory (sqlite-managed)
```

`~/.local/share/polycrisis/` follows the XDG Base Directory
Specification (`$XDG_DATA_HOME/polycrisis/` for application state).
owned by the user only (mode `0700`).

the db dir is created automatically by `src/sim/persistence.js` on
first run if it doesn't exist. if you want to create it manually:

```bash
mkdir -p ~/.local/share/polycrisis
chmod 0700 ~/.local/share/polycrisis
```

## schema

```sql
-- scripts/migrations/001-initial-schema.sql
-- versioned via the schema_migrations table; applied via
-- scripts/db-migrate.js, idempotent.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS runs (
  run_id            TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,
  user_tag          TEXT,
  channel_id        TEXT NOT NULL,
  -- identity (flat — same shape `formatStatusEmbed` reads)
  player            TEXT NOT NULL,
  regime            TEXT NOT NULL,
  -- seed + initial crisis (snapshot for replay)
  seed_id           TEXT NOT NULL,
  seed_actor        TEXT,
  seed_fragment     TEXT,
  -- lifecycle
  started_at        TEXT NOT NULL,
  ended_at          TEXT,
  outcome           TEXT NOT NULL DEFAULT 'no-collapse',
  collapse_mode     TEXT,
  turns_completed   INTEGER NOT NULL DEFAULT 0,
  ending_by         TEXT,
  -- artifact paths
  run_log_path      TEXT,
  artifact_md_path  TEXT,
  artifact_html_path TEXT
);

CREATE INDEX IF NOT EXISTS idx_runs_user_channel ON runs(user_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_runs_ended_at    ON runs(ended_at);

CREATE TABLE IF NOT EXISTS turns (
  turn_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id       TEXT NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  turn_number  INTEGER NOT NULL,
  -- snapshot of state at the START of this turn (pre-delta)
  state_axes   TEXT NOT NULL,
  bands        TEXT NOT NULL,
  crisis       TEXT NOT NULL,
  -- player move + engine response
  player_move  TEXT,
  advisor_used TEXT,
  advisor_text TEXT,
  interpreted_delta TEXT,
  world_text   TEXT,
  started_at   TEXT NOT NULL,
  ended_at     TEXT,
  UNIQUE(run_id, turn_number)
);

CREATE INDEX IF NOT EXISTS idx_turns_run ON turns(run_id);
```

### migration discipline

- `scripts/db-migrate.js` reads `scripts/migrations/*.sql` in alphabetical order, applies any not yet in `schema_migrations`.
- each migration is a single `.sql` file with a single transaction's worth of statements.
- **never** edit a committed migration.
- bot startup runs migrations before opening the connection. failed migrations crash the bot (same pattern as missing required env vars).
- **additive migrations only** in v1 (drops / destructive changes come with explicit user-approval pairs, not blanket schema rewrites).

## persistence hooks

the v1 bot had memory-only state. persistence is bolt-on:

| event | what gets written |
|---|---|
| `/polycrisis start` | insert into `runs` |
| turn start (onTurnStart callback) | insert snapshot row into `turns` |
| turn end (player move + engine response) | update the `turns` row |
| advisor button click | update the latest `turns` row with advisor fields |
| run end | update `runs` with outcome, ending_by, artifact paths |
| bot startup | load in-flight runs (`ended_at IS NULL`) into memory |

in-flight run resume is best-effort. partial turns are not replayed.

## code changes

- **new** `src/sim/persistence.js` — opens db, runs migrations, exposes save/load helpers.
- **new** `scripts/migrations/001-initial-schema.sql` — the schema above.
- **new** `scripts/db-migrate.js` — runs migrations from CLI.
- **modify** `src/bot/bot.js` — on `/start`, save; in `runDiscordLoop`, plumb the persistence calls; on startup, load in-flight runs.
- **modify** `src/bot/commands.js` — `buildPolycrisisStartReply` becomes persistence-aware.
- **modify** `src/sim/run-loop.js` — `onTurnStart` already exists; bot wraps it to call `saveTurnStart`.

the TTY surface (`src/sim/interactive.js`) does **not** persist in v1. the discord bot is the only persistence caller.

## env vars (extend §2)

| name | default | what |
|---|---|---|
| `POLYCRISIS_DB_PATH` | `~/.local/share/polycrisis/bot.db` | db file |
| `POLYCRISIS_PERSIST` | `"true"` | enable persistence; set `"false"` for ephemeral mode |

## constraints

- the db file is never in `/tmp/` or under the install dir — only `~/.local/share/polycrisis/bot.db`. keeps the install dir clean.
- **never** disable WAL mode.
- `~/.local/share/polycrisis/` is mode `0700`, owned by `$USER:$USER`.

## verification

per-cycle ad-hoc script at `/tmp/hermes-verify-deploy-4-sqlite.sh` covers:
1. `~/.local/share/polycrisis/` exists with mode `0700`.
2. `bot.db` is created on first run.
3. `db-migrate.js` is idempotent.
4. a synthetic `/start` → onTurnStart → onTurnEnd cycle writes expected rows.
5. `PRAGMA journal_mode = WAL` is set.
6. `PRAGMA foreign_keys = ON`.

live-network verification (real crash + recovery) is in §8.

---

# §5. monitoring + observability

## behavior shipped

- **structured logs** — every `console.log` in `src/` lands at a deterministic level: `info`, `warn`, `error`, `debug`. the cycle refactors `console.log` → a tiny `log()` helper that emits `level: ISO-timestamp: msg` lines.
- **log file rotation** via pm2's built-in logrotate. daily rotation, max 7 days, compressed.
- **uptime check** — a sibling pm2-managed process (`polycrisis-heartbeat`) reads a heartbeat-file at `./logs/heartbeat.json` updated by the bot on every turn-start and on `client.once('ready')`. file older than 90s = the bot is wedged.

## structured logging

```javascript
// src/lib/log.js (new in §5 cycle)
'use strict';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

let currentLevel = LEVELS[process.env.LOG_LEVEL || 'info'];

function log(level, msg, fields) {
  if (LEVELS[level] < currentLevel) return;
  const ts = new Date().toISOString();
  const suffix = fields ? ' ' + JSON.stringify(fields) : '';
  process.stdout.write(`${ts} [${level}] ${msg}${suffix}\n`);
}

module.exports = {
  debug: (msg, f) => log('debug', msg, f),
  info:  (msg, f) => log('info', msg, f),
  warn:  (msg, f) => log('warn', msg, f),
  error: (msg, f) => log('error', msg, f),
};
```

every `console.log(...)` in `src/` becomes `log.info(...)`.

### what gets logged at what level

- `[info]` startup milestones, run started, run ended, advisor consulted
- `[warn]` recoverable issues (rate-limit fallback, advisor click by non-active user)
- `[error]` failures (LLM call failed, run crashed, persistence error)
- `[debug]` per-turn state snapshots (off by default; turn on with `LOG_LEVEL=debug`)

**never** logged: env-var values, raw LLM response bodies, full player move text.

## log rotation

pm2-logrotate rotates `./logs/*.log` daily, compresses, retains 7.

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

## uptime / heartbeat

two pm2-managed processes:

```
polycrisis-bot          ← main bot
polycrisis-heartbeat    ← sibling watchdog
```

the bot updates `./logs/heartbeat.json` on each turn-start (and on
`client.once('ready')`). `polycrisis-heartbeat` checks this file
every 30s; older than 90s = stale.

the heartbeat-file approach (instead of a unix socket) fits the
"no system-wide paths" constraint: `./logs/` is inside the install
dir, owned by the user, no extra permissions dance.

`polycrisis-heartbeat` is a tiny node script in `scripts/heartbeat.js`. it writes the staleness check to `./logs/heartbeat.log` and posts a "stale" payload to the webhook URL if configured (covered in §6).

## heartbeat field shape

each heartbeat update writes:

```json
{
  "ts": "2026-07-04T18:42:11.123Z",
  "source": "bot",
  "kind": "ready" | "turn" | "tick",
  "turnNumber": 3,
  "runId": "discord-..."
}
```

`(source, kind, ts)` is the minimum useful set; turn/runId are
included for debugging.

## constraints

- `console.log` calls in `src/` go through the `log()` helper.
- log rotation is automatic.
- heartbeat writes are non-blocking and failure-safe (a failed
  write does not crash the bot).

## verification

per-cycle ad-hoc script covers: log helper exports, no remaining `console.log`, both pm2 processes registered, logrotate config set, heartbeat file writeable.

---

# §6. webhook liveness

## behavior shipped

three optional payloads, fired by `polycrisis-heartbeat` (the watcher) at:

- **boot** — bot reaches `ready`. POST payload 1.
- **stale** — heartbeat file older than 90s. POST payload 2.
- **crashed** — pm2 records a crash (max_restarts exceeded). POST payload 3.

the webhook URL is configured in `.env` as `POLYCRISIS_LIVENESS_WEBHOOK`. absent or empty → **silent mode** (no POST ever).

## payload shapes

```json
// payload 1: boot
{
  "kind": "boot",
  "ts": "2026-07-04T18:42:11.123Z",
  "host": "polycrisis-prod-01",
  "model": "minimax/minimax-m3",
  "version": "244829b"
}

// payload 2: stale
{
  "kind": "stale",
  "ts": "2026-07-04T18:42:11.123Z",
  "host": "polycrisis-prod-01",
  "last_message_age_ms": 120000,
  "last_message_kind": "turn"
}

// payload 3: crashed
{
  "kind": "crashed",
  "ts": "2026-07-04T18:42:11.123Z",
  "host": "polycrisis-prod-01",
  "exit_code": 1,
  "restart_count": 6,
  "last_log_path": "/home/$USER/polycrisis-of-authority/logs/bot.err.log"
}
```

POST as `Content-Type: application/json`. discord-style webhooks accept any JSON; slack uses a specific format, so the spec targets discord-style incoming-webhook URLs.

## code

- **new** `scripts/heartbeat.js` (also from §5) gains the POST logic.
- **new** `src/lib/webhook.js` — `postWebhook(url, payload)` with 5s timeout, retry-once on failure.

## env vars (extend §2)

| name | default | what |
|---|---|---|
| `POLYCRISIS_LIVENESS_WEBHOOK` | empty | absolute URL of the webhook receiver |
| `POLYCRISIS_HOST_LABEL` | hostname | label included in payloads |

## constraints

- webhooks are fire-and-forget.
- webhook URLs **never** appear in logs.
- "stale" payload is rate-limited to one per stuck episode.

---

# §7. upgrade + rollback

## behavior shipped

- the standard upgrade flow is `git pull && npm install --omit=dev && pm2 reload`.
- env-only model swap is just `.env` + `pm2 reload`.
- rollbacks are `git checkout <prev-sha> && npm install --omit=dev && pm2 reload`.
- the db schema is forward-only (additive migrations; see §4).

## upgrade runbook

```bash
cd $HOME/polycrisis-of-authority
git fetch --all --prune
git checkout main
git pull --ff-only                  # refuse non-fast-forward; no surprise merge commits
npm install --omit=dev              # updates node_modules to match package-lock.json
pm2 reload ecosystem.config.js      # ~1s pause while pm2 swaps the running process
```

## model swap runbook

```bash
cd $HOME/polycrisis-of-authority
$EDITOR .env                        # change OPENROUTER_MODEL=... or MODEL_DIRECT=true
pm2 reload ecosystem.config.js      # swap goes live; bot accepts the new env at next start
```

optional: add a `smokeCheck()` helper to `src/sim/openrouter-client.js` that verifies reachability before `pm2 reload`. v1 ships without it; v1.1 ships it if requested.

## rollback runbook

```bash
cd $HOME/polycrisis-of-authority
PREV=$(git log --oneline -2 | tail -1 | awk '{print $1}')
echo "rolling back to $PREV"
git checkout "$PREV"
npm install --omit=dev
pm2 reload ecosystem.config.js
```

rollback doesn't touch the db. additive migrations are forward-only; rollback is "ship a new forward migration" if needed.

## constraints

- upgrade runs as the user account that owns the install dir. no `sudo` required.
- `pm2 reload` is non-zero-downtime; the bot might briefly miss slash-command acks during the 1s pause. acceptable.

## verification

per-cycle ad-hoc script covers: `git status` clean, `npm install --omit=dev` succeeds, synthetic reload works, rollback round-trip works.

---

# §8. live-run confirmation

## behavior shipped

this section is **acceptance**, not feature work. the goal is a signed-off end-to-end run with real discord credentials + a real LLM call + a real persisted run that survives a restart.

## live-run runbook

### step 1 — invite the bot to your test server

```bash
cd $HOME/polycrisis-of-authority
pm2 status                          # confirm polycrisis-bot is online
pm2 logs --lines 30 polycrisis-bot  # confirm [bot] ready + boot webhook (if configured)
```

### step 2 — start a run

in your discord client, in a DM with the bot:

```
/polycrisis start as:yourname governing:your institution name
```

expect:
- a crisis embed
- a `STEP3_HINT_TEXT` followup
- a status embed if you send `/polycrisis status`
- the run continues until collapse, max-turns, `/polycrisis end`, or `::resign`

### step 3 — visit a run-end report

when the run ends, check:
- the channel for the end-of-run embed + `.md` + `.html` attachments
- the prototype doc filed at `wiki/prototypes/` (auto-filed by the bot)

### step 4 — verify persistence

```bash
sqlite3 ~/.local/share/polycrisis/bot.db <<'EOF'
.headers on
SELECT run_id, player, regime, outcome, turns_completed, ending_by FROM runs ORDER BY started_at DESC LIMIT 1;
SELECT turn_number, length(player_move) AS move_len, length(world_text) AS world_len FROM turns WHERE run_id = (SELECT run_id FROM runs ORDER BY started_at DESC LIMIT 1) ORDER BY turn_number;
EOF
```

confirm: the run is in `runs`, every turn is in `turns` with non-empty player move, outcome is recorded.

### step 5 — verify boot persistence

restart the bot and confirm the in-flight (or most recent) run state is consistent with the db:

```bash
pm2 restart polycrisis-bot
# in discord, send /status — should match the last db-recorded state
```

### step 6 — model swap (env-only)

```bash
cd $HOME/polycrisis-of-authority
$EDITOR .env        # change OPENROUTER_MODEL=...
pm2 reload ecosystem.config.js
```

start a new `/polycrisis run` and verify the artifact's footer shows the new model id.

### step 7 — fire a swap to direct provider

```bash
cd $HOME/polycrisis-of-authority
$EDITOR .env        # set MODEL_DIRECT=true + OPENAI_BASE_URL + OPENAI_API_KEY
pm2 reload ecosystem.config.js
```

start a new `/polycrisis run` and verify the bot still works end-to-end. the swap should be invisible to the player; only the model name in the artifact footer changes.

### step 8 — record findings

a `wiki/prototypes/2026-07-04-cycle-deploy-live-run.md` gets written capturing:
- the layout: which pm2 processes are running, where the db is, where the logs are
- the live-run result: did the run complete, did it persist, did the model swap work
- any deviation from the spec
- any deferred items that came up

this file is the **acceptance record**. when it's written, §8 is done.

## constraints

- §8 is **manual operator work**, not code. the assistant doesn't have access to your discord account or your test server.
- the runbook is explicit; it doesn't say "verify health," it says `pm2 status` + `pm2 logs --lines 30`.
- the prototype doc is the artifact.

## what's NOT in §8

- multi-user acceptance.
- multi-run stress test (one walkthrough is enough for v1).

---

## cycle plan

| cycle | section | what's new | effort |
|---|---|---|---|
| 7-install | §1 | apt-or-existing node, clone, npm install | 0.5 day |
| 7-secrets | §2 | .env mode 0600, env inventory, swappable LLM client | 0.5 day |
| 7-pm2 | §3 | ecosystem.config.js, npm-global pm2 | 0.5 day |
| 7-sqlite | §4 | persistence.js, db-migrate.js, 001-initial-schema.sql | 1 day |
| 7-monitoring | §5 | log.js helper, logrotate, heartbeat.js | 1 day |
| 7-webhook | §6 | webhook.js helper, payload shapes | 0.5 day |
| 7-upgrade | §7 | runbooks committed, rollback test | 0.5 day |
| 7-live-run | §8 | operator runs the runbook, captures the result | 0.5 day |

**8 cycles total.** OS hardening is explicitly out of scope for this guide (the user runs the bot under their own account; see your VPS provider's docs for hardening your machine).

each cycle starts with R1–R4-style grounding before any code lands.

---

## sources

- **user grounding, 2026-07-04 (revised)**: "before we proceed with install, let's make some modifications to the intended deployment. i do not want anything installed system wide. instead everything should reside within a /home/user directory. this isn't just about us, we're publishing this publicly, so that means other users could follow these instructions, which means they should not be custom to our environment. we'll still with assuming a debian/ubuntu environment, but otherwise everything in the /home/user directory (where user is the user who uses the software)."

- supporting groundings from the same conversation:
  - **pm2 launched as the user** (no service account, no systemd autostart)
  - db at `~/.local/share/polycrisis/bot.db` (XDG-style)
  - logs at `./logs/` inside the install dir
  - install dir at `~/polycrisis-of-authority`
  - **§7 (security hardening) is dropped entirely** from this doc. user is responsible for OS-level hardening; this guide references VPS provider / OS security docs.

- prior art in the project:
  - `docs/13-discord-bot-architecture.md` v2 persistence
  - `docs/14-discord-bot-setup.md` local-dev setup
  - `docs/11-openrouter-configuration.md` model swap mechanics
  - cycle 6g prototype at `wiki/prototypes/2026-07-04-cycle-6g-end-and-identity.md`

## file growth plan (each cycle ships a commit)

```
7-install   ← §1
7-secrets   ← §2
7-pm2       ← §3
7-sqlite    ← §4
7-monitoring← §5
7-webhook   ← §6
7-upgrade   ← §7
7-live-run  ← §8 (incl. wiki/prototypes/2026-07-04-cycle-deploy-live-run.md)
```

## spec policy

this guide commits to a deployment shape, but each section's implementation must be confirmed with the user (R1–R4-style grounding) **before** code lands. the orchestrator (the assistant) does not invent path conventions or sudo policies on the user's behalf.

the public-readiness principle from the user: "this isn't just about us, we're publishing this publicly, so that means other users could follow these instructions." every choice in this guide is defensible against that framing.

## style

single-file deployment guide (`docs/16-deployment.md`), sections numbered 1–8 (renumbered after dropping the old §7 hardening section). follows the project's "polish + acknowledgment" convention from the discord build (numbered design questions before code, confirmations in `1) confirmed ... n) confirmed` form, ad-hoc verification script per cycle at `/tmp/hermes-verify-deploy-<section>.sh`).
