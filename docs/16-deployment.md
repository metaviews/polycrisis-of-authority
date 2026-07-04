# Discord bot — Deployment Specification

This spec covers deploying the Polycrisis of Authority discord bot
(`src/bot/bot.js`) to the user's dedicated Ubuntu/Debian server.
Production runtime, secrets, supervision, monitoring, security, upgrades.

## audience

The user is the sole dev + sole player. Deployment is a one-machine setup
on a dedicated VPS, ubuntu/debian, exposed to the public internet.
Hardened where it counts (ssh-only, fail2ban, secrets isolated, non-root
user) but no multi-node orchestration or k8s.

## scope (grounded with user, 2026-07-04)

| section | what | why |
|---|---|---|
| 1. install + run | node installation, app layout, log rotation, env-var loading, restart policy | the system runs |
| 2. secrets + config | `DISCORD_BOT_TOKEN`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `.env` permissions | the bot authenticates |
| 3. process supervision | pm2 with start/stop/restart, graceful shutdown on SIGTERM | survives crashes + deploys |
| 4. sqlite persistence | `better-sqlite3` schema for runs + turns tables (v2 of discord spec) | survives restarts |
| 5. monitoring + observability | pm2 logs + logrotation + uptime check + liveness heartbeat | we can see what's happening |
| 6. webhook liveness | webhook URL → discord/slack notification on boot + crash | we get told if it's down |
| 7. security hardening | non-root user, ssh-key-only, fail2ban, firewall (ufw), `.env` permissions | the server is exposed |
| 8. upgrade + rollback | git pull → npm ci → pm2 reload; env-var-only model swap | we can ship a fix |
| 9. live-run confirmation | first real end-to-end run with real discord creds; recorded in `wiki/prototypes/` | acceptance |

## what's NOT in scope

- multi-instance / clustering — single process is sufficient
- load balancing — single machine, single process
- k8s / docker swarm — bare metal + pm2 is enough
- multi-region — the bot is per-guild, no benefit from regions
- CI/CD pipelines — `git pull && pm2 reload` is the deploy
- TLS termination / reverse proxy — the bot doesn't serve web traffic; only outbound HTTPS to discord + openrouter

## cycle plan

Each numbered section is a self-contained cycle. Some depend on others:

```
§1 install + run         ── required first
§2 secrets + config      ── depends on §1
§3 pm2 supervision       ── depends on §1, §2; folds in non-root user from §7
§4 sqlite persistence    ── independent
§5 monitoring            ── depends on §1, §3
§6 webhook liveness      ── depends on §5
§7 security hardening    ── depends on §1; firewall+fail2ban land after app is up
§8 upgrade + rollback    ── depends on §3, §5
§9 live-run confirmation ── depends on all; final acceptance
```

a deployment cycle takes 0.5–1 day each. eight cycles to ship v1.0 of
the deployment spec; the live-run cycle is the gate.

## sources

- conversation with the user, 2026-07-04 (server OS, supervisor choice,
  LLM swappability, sqlite-on, full monitoring, webhook liveness,
  env-var-only model swap, public-internet security, single-doc spec)
- prior art in the project:
  - `docs/13-discord-bot-architecture.md` v1 vs v2 persistence split
  - `docs/14-discord-bot-setup.md` — local-dev setup flow
  - `docs/11-openrouter-configuration.md` — model swap mechanics
  - `docs/12-handoff-protocol.md` — orchestrator handoff pattern

## spec policy

this doc commits to a deployment shape, but each section's implementation
must be confirmed with the user (R1–R4-style grounding) **before** code
or remote commands land. the orchestrator (the assistant) does not invent
server-specific paths or sudo policies on the user's behalf.

---

# §1. install + run

## behavior shipped

- node (LTS, currently v22) is available on the server. the spec covers
  both states: "node is already installed at v22+" and "node needs to be
  installed from scratch"
- the app lives at `/opt/polycrisis` (system-wide but owned by a
  dedicated `polycrisis` non-root user — see §3 for that part)
- app dependencies are installed via `npm ci` (production-only) using
  the project's checked-in `package-lock.json`
- logs land in `/var/log/polycrisis/` (writable by the `polycrisis` user
  via group membership in `adm`)

## layout

```
/opt/polycrisis/                        ← git checkout; owned by polycrisis:polycrisis
├── .env                                ← env-var file (mode 0640, owner polycrisis:polycrisis)
├── .env.example                        ← tracked in git, mode 0644
├── package.json
├── package-lock.json
├── node_modules/                       ← owned by polycrisis; populated by npm ci
├── src/                                ← source tree (unchanged from cycle 6g)
├── wiki/
└── scripts/
/var/log/polycrisis/                   ← log directory; owned by polycrisis:adm, mode 0750
├── bot.out.log
├── bot.err.log
└── heartbeat.log
/etc/pm2/                               ← pm2's per-user state dir
/var/run/polycrisis/                    ← socket + pidfile (mode 0755)
```

## install steps (idempotent)

### if node is **not** already on the server

```bash
# install nvm for the polycrisis user (no root install; the user owns their toolchain)
sudo -u polycrisis -H bash -lc 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash'
sudo -u polycrisis -H bash -lc 'nvm install --lts'   # 2026-07: lts=jod (node 22)
sudo -u polycrisis -H bash -lc 'nvm alias default lts/*'
# alternatives: distro's `apt-get install -y nodejs` if you prefer
# pinning to ubuntu's package. nvm is more aligned with the project's
# "swappable runtime" framing; see alternatives callout below.
```

### if node **is** already on the server

```bash
sudo -u polycrisis -H bash -lc 'node --version'   # expect v22+
```

### clone the app

```bash
sudo -u polycrisis -H bash -lc '
  set -e
  cd /opt
  if [ ! -d polycrisis ]; then
    git clone https://github.com/metaviews/polycrisis-of-authority.git polycrisis
  fi
  cd polycrisis
  git fetch --all --prune
  git checkout main
  git pull --ff-only
  npm ci --omit=dev
'
```

### create the log dir

```bash
sudo install -d -o polycrisis -g adm -m 0750 /var/log/polycrisis
```

### verify

```bash
sudo -u polycrisis -H bash -lc '
  set -e
  cd /opt/polycrisis
  node --version                     # expect v22.x
  test -f .env                       # a (yet-empty) .env exists
  test -f package-lock.json
  node -e "require(\"discord.js\")"  # smoke: dependency resolves
  node -e "require(\"./src/sim/run-loop\")"   # smoke: engine resolves
'
```

## alternatives

### node via distro package vs nvm

- **nvm** (default in this spec): per-user, no `sudo` for `npm install`,
  easy to pin multiple versions side-by-side. matches the project's
  "swap the runtime" framing in `docs/11-openrouter-configuration.md`.
- **distro apt** (`apt-get install -y nodejs` from nodesource repo):
  system-wide, one version, simpler on a single-app host. fits the
  "exposed to public internet" security posture with less surface area.

the spec doesn't lock this; user picks per §1 grounding. the install
script defaults to nvm, but switching to apt means deleting the nvm
section and replacing with a one-line apt step.

### git checkout location

- `/opt/polycrisis` (default — matches the FHS pattern of third-party
  software)
- `~polycrisis/polycrisis-of-authority` (alternative — keeps the app in
  the user's home directory, simpler permission story)

the spec recommends `/opt` because it keeps the app separate from the
user's home (which contains ssh keys, shell history, scratch files
that don't belong to the app).

## constraints

- root is **not** used to run the app. the dedicated `polycrisis`
  user owns the checkout; pm2 runs as that user.
- the systemd unit that brings pm2 up on boot IS allowed to use
  root, but the unit's `ExecStart` does `sudo -u polycrisis` before
  invoking pm2. (this is the systemd-side boot dependency, not part
  of the pm2 supervision in §3.)
- `.env` is mode 0640 owned by `polycrisis:polycrisis` (see §2).
- the app's `package.json` must already have `npm ci --omit=dev`
  passing before this cycle ships. check that first.

## what's NOT in §1

- log rotation — covered in §5
- pm2 ecosystem — covered in §3
- secrets — covered in §2
- firewall + fail2ban — covered in §7

---

# §2. secrets + config

## behavior shipped

- secrets are isolated to one file: `/opt/polycrisis/.env`
- `.env` is mode 0640, owner `polycrisis:polycrisis` (no other user
  can read it; the `polycrisis` user and root can)
- `.env` is `gitignored` (already is — see `.gitignore` and
  `.env.example` shipped in cycle 1c)
- the bot reads the env vars at startup; missing required vars crash
  the process with a clear error (see the `REQUIRED_ENV` check in
  `src/bot/bot.js`)

## env vars the bot consumes

| name | required? | shape | what it controls |
|---|---|---|---|
| `DISCORD_BOT_TOKEN` | yes | string | bot user token |
| `DISCORD_CLIENT_ID` | yes | string | discord application client id |
| `DISCORD_GUILD_ID` | optional | string | if set: slash commands are guild-scoped (instant); if unset: global (~1hr) |
| `OPENROUTER_API_KEY` | yes (when `OPENROUTER_MODEL` is set) | string | openrouter auth |
| `OPENAI_API_KEY` | yes (when running against MiniMax direct; see §2.3) | string | MiniMax m3 direct auth |
| `OPENAI_BASE_URL` | optional | url | swap to MiniMax direct or other compatible API; default is OpenAI's |
| `OPENROUTER_MODEL` | optional | string | model id when using openrouter; default: `minimax/minimax-m3` (set in `.env.example`) |
| `FALLBACK_OPENROUTER_MODEL` | optional | string | used by the engine on rate-limit / failure; default: `google/gemini-3.1-flash-lite` |
| `MODEL_DIRECT` | optional | `"true"` / unset | when `"true"`, bot talks to `OPENAI_BASE_URL` instead of openrouter; covered below |
| `NODE_ENV` | best-practice | `"production"` | turn on NODE_ENV for log discipline; the bot doesn't gate behavior on it |

## .env shape (template)

```
# /opt/polycrisis/.env
# generated from .env.example — fill these in
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=

# openrouter (default route)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=minimax/minimax-m3
FALLBACK_OPENROUTER_MODEL=google/gemini-3.1-flash-lite

# direct MiniMax m3 (case-study route). only used when MODEL_DIRECT=true.
# unset OPENAI_BASE_URL to use the OpenAI base; set it to MiniMax's URL for the swap.
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
MODEL_DIRECT=false
```

## LLM provider selection (openrouter vs MiniMax direct)

the user grounded that both should work, selectable via env. the
mechanism lives in `src/sim/openrouter-client.js` (or wherever the
model call is bundled — confirm in §2.3 grounding). v1 ships with:

- **default: openrouter.** `OPENROUTER_MODEL` is consulted. base URL
  is openrouter's; auth header is `Authorization: Bearer ${OPENROUTER_API_KEY}`.
- **direct: MiniMax m3 (or any OpenAI-compatible API).** set
  `MODEL_DIRECT=true` in `.env`. the bot reads `OPENAI_BASE_URL` and
  `OPENAI_API_KEY` instead. headers switch to OpenAI's
  `Authorization: Bearer ${OPENAI_API_KEY}`.

both paths use the same chat-completions schema (the request body
shape is identical). the case-study claim is that this swap is
**environmental, not code**: a config change, a `pm2 reload`, and the
bot is on the other model.

> **§2.3 (grounding pending)**: the user should confirm — does the
> project already have a swappable client in `src/sim/openrouter.js`?
> If yes, §2 ships as-is and the swap is config-only. If not, §2
> includes a small refactor cycle to add the `MODEL_DIRECT` branch.
> Net effect on the spec: §2 lands in either 0.25 day (refactor
> already done) or 0.5–1 day (refactor + §2).

## .env permissions

```
-rw-r-----  polycrisis polycrisis  /opt/polycrisis/.env
```

- owner can read+write (`rw-`)
- group can read only (`r--`)
- world has nothing (`---`)
- root can read+write (typical filesystem behavior)

created by:

```bash
sudo -u polycrisis bash -lc '
  install -m 0640 /opt/polycrisis/.env.example /opt/polycrisis/.env || true
  # first-time only — the .env.example is the initial template
'
# after the user fills in the .env by hand (or via a copy-paste from a
# password manager), permissions are preserved by the editor they use.
```

### alternative: systemd-creds / pass

- for higher-security deployments, store secrets in **systemd-creds**
  or a pass-store and have pm2 read them via a wrapper. this adds
  two layers of indirection and isn't needed for a single-machine
  bot.
- this spec assumes the user is comfortable with a 0640 file on a
  hardened server. if the user wants pass, this section grows by ~50
  lines and a `pass insert` step.

## .env.example tracking

`.env.example` is the **template** that ships in git with safe default
values (the openrouter model id already matches the project's
showcase default from cycle 1c). the bot's startup logs reference
`.env.example` when a required env var is missing (see
`src/bot/bot.js` — the existing "see docs/14-discord-bot-setup.md"
message is replaced with "see docs/16-deployment.md §2" in this cycle).

## constraints

- **never** log env-var values. the bot's startup is `console.log` only,
  never `console.log(process.env.OPENROUTER_API_KEY)`. spot-check in §2.
- **never** include `.env` in a backup or in `git status`. already true
  via `.gitignore`.
- **never** copy `.env` to the `/tmp/` verify workspace. the verification
  script in this cycle uses `DISCORD_BOT_TOKEN=fake` only.

## verification (per-cycle ad-hoc script)

`/tmp/hermes-verify-deploy-2-secrets.sh` covers:

1. `.env.example` exists in the working tree
2. `.env` is `.gitignore`d
3. `cp .env.example .env && chmod 0640` produces a file with the
   right permissions
4. the bot's `REQUIRED_ENV` array includes all 5 required vars
5. the bot exits cleanly with a `[bot] missing required env vars`
   message when any required var is unset (current behavior)
6. **swap test**: the openrouter / direct branches in the swappable
   client produce the right URL + auth header for each env state
7. `grep -R "process.env" src/` returns no stringified secret values
   in `console.log` calls (manual review)

checks 6+7 require either (a) the swappable client exists today or
(b) §2 ships with a refactor. §2.3 grounding decides.

## what's NOT in §2

- runtime configuration that doesn't live in `.env` — covered in §3
- log discipline (what gets logged where) — covered in §5
- model swap at deploy time — covered in §8
- secret rotation procedure — out of scope for v1 (single-machine
  setup; if a token leaks, the user regenerates and updates `.env`)

---

# §3. process supervision (pm2)

## behavior shipped

- pm2 is installed globally for the `polycrisis` user (not root)
- an `ecosystem.config.js` at `/opt/polycrisis/ecosystem.config.js`
  declares the bot as a pm2-managed process with the right env,
  log files, cwd, and graceful-shutdown hooks
- three pm2 scripts cover lifecycle: `start`, `stop`, `restart`, `reload`
- on crash, pm2 auto-restarts the bot (with a small restart delay so
  transient failures don't tight-loop)
- on `SIGTERM` (during `pm2 stop` or `pm2 reload`), the bot's existing
  SIGTERM handler (in `src/bot/bot.js`) calls `client.destroy()` and
  exits cleanly — confirmed in cycle 6a

## the non-root user (folded in from §7)

this section lands the `polycrisis` user that everything else assumes.
firewall + fail2ban (the rest of §7) ship in batch 3.

```bash
# create the user (idempotent — `useradd` errors on existing user; we ignore)
sudo useradd --system --create-home --shell /usr/bin/bash polycrisis || true
sudo install -d -o polycrisis -g polycrisis -m 0755 /opt
sudo chown -R polycrisis:polycrisis /opt/polycrisis
```

`--system` puts the user in `/etc/passwd` with no aging and a high uid
(typical for service accounts). `--create-home` gives a home for nvm
and `.pm2` to live in. the user has no password — login is ssh-key-only
(see §7).

## pm2 install

```bash
sudo -u polycrisis -H bash -lc '
  set -e
  npm install -g pm2    # uses nvm's bundled npm
  pm2 --version         # expect 5.x
  # pm2 needs a startup script. the standard way is `pm2 startup systemd`
  # which generates a unit file as root. for a non-root pm2, we instead
  # use `pm2 startup` to print the command the user runs, then run it
  # manually via sudo.
'
```

`pm2 startup` (run as `polycrisis`) prints:

```
[PM2] You have to run this command as root:
[PM2] sudo env PATH=$PATH:/home/polycrisis/.nvm/versions/node/v22.x.y/bin pm2 startup systemd -u polycrisis --hp /home/polycrisis
```

the user runs this `sudo` command once. the resulting systemd unit
brings pm2 up on boot, owned by `polycrisis`.

> **§3.1 (grounding pending)**: confirm — does the user want pm2 under
> systemd (this approach, robust on reboot) or skip the boot hookup
> for v1 (no auto-start on reboot, simpler, just don't `reboot` the
> server during a run)? spec defaults to systemd (more robust for a
> server exposed to the internet).

## ecosystem.config.js

```javascript
// /opt/polycrisis/ecosystem.config.js
// pm2 config for the Polycrisis discord bot.
//
// Why this lives in the repo: the file is fully determined by the
// project structure (paths, env vars, log files). keeping it versioned
// means deploys are reproducible and config changes are reviewable.

module.exports = {
  apps: [{
    name: 'polycrisis-bot',
    script: 'src/bot/bot.js',
    cwd: '/opt/polycrisis',

    // Load env vars from .env (NO dotenv dep — pm2 reads it natively).
    // pm2 parses simple KEY=value lines; we don't need a library.
    env: process.env,  // the user fills in .env separately; pm2 reads it via `pm2 start --env <file>` or via env_file directive
    env_file: '.env',

    // Restart policy.
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',     // don't count a crash as legitimate unless the app ran 10s first
    restart_delay: 5000,   // 5s between restarts; prevents tight-loops on transient failures
    max_memory_restart: '512M', // kill+restart if rss exceeds 512MB; catches leaks

    // Logs.
    out_file: '/var/log/polycrisis/bot.out.log',
    error_file: '/var/log/polycrisis/bot.err.log',
    merge_logs: true,            // combine out+err into one stream when not redirected
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    log_file_name_length_limit: 100,

    // Lifecycle.
    kill_timeout: 8000,          // SIGTERM → wait 8s → SIGKILL. bot's SIGTERM handler is fast; 8s gives margin.
    listen_timeout: 8000,
    shutdown_with_message: true, // optional; useful for one-shot restarts

    // Misc.
    node_args: '--max-old-space-size=512',
    time: true,                  // prefix log lines with timestamps
  }],
};
```

## lifecycle

the bot is managed via four pm2 commands:

```bash
# start (idempotent: `pm2 start` reuses an existing process; `pm2 reload` is the upgrade path)
sudo -u polycrisis -H bash -lc '
  cd /opt/polycrisis
  pm2 start ecosystem.config.js      # first time
  pm2 save                            # persist process list across reboots
  pm2 list                            # confirm "polycrisis-bot" is online
'

# graceful stop (sends SIGTERM)
sudo -u polycrisis pm2 stop polycrisis-bot

# graceful reload (after `git pull`; SIGTERM + start new instance, then SIGTERM old; zero-downtime in theory, ~1s pause in practice)
sudo -u polycrisis pm2 reload polycrisis-bot

# logs
sudo -u polycrisis pm2 logs polycrisis-bot
sudo -u polycrisis pm2 logs --lines 200 /var/log/polycrisis/bot.out.log
```

## constraints

- pm2 runs **as the polycrisis user, not as root.** every `pm2` command
  in this spec runs under `sudo -u polycrisis -H bash -lc '...'`.
- the `polycrisis` user has no password; ssh is key-only (covered in
  §7 batch 3).
- the `.env` is loaded by pm2's `env_file` directive. the bot's
  `REQUIRED_ENV` check fires at startup; if any required var is missing,
  pm2 records the crash in `/var/log/polycrisis/bot.err.log` and the
  restart policy fires.

## `pm2 startup` on boot

without the `pm2 startup` systemd hook, the bot doesn't restart after
a server reboot. that's fine for short-term deployments but bad for
production. the spec assumes the user runs the `pm2 startup` command
once, immediately after the pm2 install. if they don't, the bot
recovers when pm2 is started manually but stays offline across reboots.

> **§3.1 (grounding pending)** above addresses this explicitly.

## verification (per-cycle ad-hoc script)

`/tmp/hermes-verify-deploy-3-pm2.sh` covers:

1. the `polycrisis` user exists (uid + home dir check)
2. `/opt/polycrisis` is owned by `polycrisis:polycrisis`
3. `ecosystem.config.js` parses (JSON-style `node -e` check)
4. `pm2 --version` is callable as `polycrisis`
5. **dry-start**: `pm2 start ecosystem.config.js --dry-run` succeeds
   (or `pm2 start ecosystem.config.js` followed by `pm2 delete`)
6. the bot's SIGTERM handler is reachable via `pm2 stop` (kill_timeout
   honored)
7. log files written under `/var/log/polycrisis/` with correct
   ownership

live-network verification ("did the bot actually connect to discord?")
happens in §9. this cycle's verification stays local.

## what's NOT in §3

- the systemd unit that brings pm2 up on boot — auto-generated by
  `pm2 startup`, not hand-written
- log rotation — covered in §5
- the heartbeat / liveness webhook — covered in §6
- firewall / fail2ban / ssh hardening — covered in §7 (batch 3)

---

## ## batch 1 confirmation

§1, §2, §3 are landed (user confirmed 2026-07-04). proceeding with
batch 2.

---

# §4. sqlite persistence

## behavior shipped

the user's cycle is grounded on **persistent sqlite** — runs survive
restarts. this is the v2 path of `docs/13-discord-bot-architecture.md`
section "persistence (v2)". v1 of the bot had in-memory state; this
deploy flips that.

- the bot opens a sqlite database at `/var/lib/polycrisis/bot.db`
  using `better-sqlite3` (sync, no callback hell; matches the
  project's "polish + small" style)
- two tables: `runs` (one row per `/start`) and `turns` (one row per
  player move + one row per state delta + one row per advisor consult)
- on `/polycrisis start`, the new run is **persisted** (so a restart
  mid-run recovers the state)
- on each turn start, a **state snapshot** is written (so `/status`
  reads survive crashes)
- on run end, the **final outcome + outcome-flavored fields** are
  written (collapse mode, turns completed, identity, run log paths)
- on bot startup, **in-flight runs** are loaded back into memory
  (the run loop resumes from the last persisted turn)
- completed runs are **never deleted** — they live in the database
  as the case-study's audit trail. cleanup is a manual `DELETE`
  after a few weeks if you care about disk space, or via a future
  "tier rotation" cycle that archives runs older than N.

## file layout

```
/var/lib/polycrisis/                    ← db dir; owned by polycrisis:polycrisis, mode 0750
├── bot.db                               ← sqlite database
├── bot.db-wal                           ← write-ahead log (auto-managed)
├── bot.db-shm                           ← shared memory (auto-managed)
└── backups/                             ← optional; covered below
    ├── bot-2026-07-04T0000Z.db
    └── ...
```

`/var/lib/...` follows FHS convention for "variable state data that
the system manages". own it `polycrisis:polycrisis` so only that user
can read/write it (root can read+write as always).

## schema

```sql
-- /opt/polycrisis/sql/schema.sql
-- versioned via the SQLITE_MIGRATIONS table below. applied via
-- /opt/polycrisis/scripts/db-migrate.js, idempotent.

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
  started_at        TEXT NOT NULL,                   -- ISO-8601
  ended_at          TEXT,                            -- null while in-flight
  outcome           TEXT NOT NULL DEFAULT 'no-collapse',
  collapse_mode     TEXT,                            -- null unless outcome in ('collapse','mixed')
  turns_completed   INTEGER NOT NULL DEFAULT 0,
  ending_by         TEXT,                            -- 'user-end' | 'inactivity' | '::resign' | 'collapse' | 'max-turns'
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
  turn_number  INTEGER NOT NULL,                    -- 1-indexed; matches runLoop's `turn` var
  -- snapshot of state at the START of this turn (pre-delta; matches onTurnStart callback shape)
  state_axes   TEXT NOT NULL,                       -- JSON of the 6-axis state vector
  bands        TEXT NOT NULL,                       -- JSON of the bands (holding/strained/eroded/collapsed)
  crisis       TEXT NOT NULL,                       -- JSON of the crisis object (title + situation + decision_point)
  -- player move + engine response
  player_move  TEXT,                                -- the player's text (or null if turn ended before input)
  advisor_used TEXT,                                -- voice id if advisor button clicked, null otherwise
  advisor_text TEXT,                                -- advisor's response, if used
  interpreted_delta TEXT,                           -- JSON of the LLM-interpreted delta on state axes
  world_text   TEXT,                                -- the engine's prose response, if any
  started_at   TEXT NOT NULL,
  ended_at     TEXT,
  UNIQUE(run_id, turn_number)
);

CREATE INDEX IF NOT EXISTS idx_turns_run ON turns(run_id);
```

### migration discipline

- `scripts/db-migrate.js` reads `scripts/migrations/*.sql` in
  alphabetical order, applies any not yet in `schema_migrations`
- each migration is a single `.sql` file with a single transaction's
  worth of statements
- **never** edit a committed migration. if you need to fix v1, write
  v2.
- bot startup calls `db-migrate.js` (or the in-process equivalent)
  before opening the rest of the connection pool. failed migrations
  crash the bot (same pattern as missing required env vars).
- schema is small and additive-friendly. **v1 ships no destructive
  migrations**. (cycles that need destructive changes will be
  paired with backup + explicit user approval, not blanket schema
  rewrites.)

## persistence hooks

the v1 bot had memory-only state. persistence is **bolt-on**:

| event | what gets written |
|---|---|
| `/polycrisis start` | insert into `runs` (run_id, user, channel, identity, seed) |
| turn start (onTurnStart callback) | insert snapshot row into `turns` (state + bands + crisis, no move yet) |
| turn end (player move + engine response) | update the `turns` row with move + delta + world text |
| advisor button click | insert or update the latest `turns` row with advisor fields |
| run end | update `runs` with `ended_at`, `outcome`, `collapse_mode`, `turns_completed`, `ending_by`, artifact paths |
| bot startup | load in-flight runs (`ended_at IS NULL`) back into memory so the loop can resume |

in-flight run resume is **best-effort**, not perfect: if the bot
crashes mid-turn, the loop resumes from the next turn start. partial
turns are not replayed. this matches the v1 acceptance bar (the
spec says "for v1, just say 'session ended unexpectedly' if a crash
happens mid-game" — read more carefully: v1 acceptable, not great.
with sqlite we get partial recovery; with full durability we'd
need write-ahead logging per move, which is out of scope for this
spec).

## code changes

- **new** `src/sim/persistence.js` — opens the db, runs migrations,
  exposes `loadInflightRuns()`, `saveRunStart()`, `saveTurnStart()`,
  `saveTurnEnd()`, `saveAdvisorClick()`, `saveRunEnd()`.
  pure functions; the discord bot and the TTY simulation both call
  into this if persistence is enabled (env flag).
- **new** `scripts/migrations/001-initial-schema.sql` — the schema
  above.
- **new** `scripts/db-migrate.js` — runs migrations from CLI.
  called by the bot at startup.
- **modify** `src/bot/bot.js` — on `/start`, call `saveRunStart`;
  in `runDiscordLoop`, plumb the persistence calls. on startup,
  `loadInflightRuns()` reseeds `activeRuns`.
- **modify** `src/bot/commands.js` — `runKey()` doesn't change.
  `buildPolycrisisStartReply` becomes persistence-aware: if db
  is configured, it pre-loads any in-flight state for the
  (channel, user) pair.
- **modify** `src/sim/run-loop.js` — `onTurnStart` callback already
  exists. the bot wraps it to also call `saveTurnStart`.
- the TTY surface (`src/sim/interactive.js`) calls the same
  persistence hooks when the env flag is set. **v1 ships TTY
  without persistence** — only the discord bot persists. spec
  notes this asymmetry; if the user later asks for parity, it's
  a separate cycle.

## env vars (extend §2)

| name | default | what |
|---|---|---|
| `POLYCRISIS_DB_PATH` | `/var/lib/polycrisis/bot.db` | where the db file lives |
| `POLYCRISIS_PERSIST` | `"true"` | enable persistence. set `"false"` to disable (useful for local dev). |
| `POLYCRISIS_DB_BACKUP_DIR` | empty | if set, do periodic backups (covered below) |
| `POLYCRISIS_DB_BACKUP_EVERY_HOURS` | `24` | how often to dump |

## backups

`/var/lib/polycrisis/backups/` (optional, only if user wants them):

- `node scripts/backup-db.js` calls `VACUUM INTO '<path>'` (sqlite
  ships a "VACUUM INTO" that creates a clean copy, no locking issues)
- scheduled via `pm2` cron (or a tiny `setInterval` in a separate
  pm2 process; covered below)
- retained 7 daily + 4 weekly + 12 monthly; cleanup is a tiny
  loop in the backup script

for v1 the spec recommends **skipping backups entirely** for the
single-machine setup. the user can always re-run a turn (the
corpus and wiki survive a bot wipe). backups are an "if you ask
for it later" feature.

> **§4.1 (grounding pending)**: confirm — skip backups for v1, or
> ship a minimal daily backup? spec defaults to skip.

## constraints

- the db file is **never** in `/tmp/` or `/opt/polycrisis/` —
  only `/var/lib/polycrisis/bot.db`. keeps the checkout clean
  and the db owned by `polycrisis`.
- **never** use `fs.writeFileSync(dbPath, ...)` to "save the db".
  sqlite is the right tool; let it manage its own files.
- **never** disable WAL mode. WAL is faster + safer for our
  access pattern (one writer, occasional reads).
- the `polycrisis` user owns the db file. **not** root, **not**
  the user's ssh login user.
- backups are explicitly out of scope for v1 unless §4.1 says
  otherwise.

## what's NOT in §4

- ad-hoc SQL querying for the operator — the cycle at hand is
  persistence, not query tooling. the wiki + cycle 4b "run log
  queryability" already covers higher-level runs/turns analysis.
- GUI for runs/turns — out of scope. plain sqlite is enough.
- multi-instance write coordination — we have one process.
- WAL checkpoint tuning — out of scope; default is fine.

## verification (per-cycle ad-hoc script)

`/tmp/hermes-verify-deploy-4-sqlite.sh` covers:

1. `/var/lib/polycrisis/` exists, owned by `polycrisis:polycrisis`
2. `bot.db` is created on first run (or pre-seeded if shipped)
3. `db-migrate.js` is idempotent: running it twice doesn't error
4. `loadInflightRuns()` returns an empty list on a fresh db
5. a synthetic `/start` → onTurnStart → onTurnEnd cycle writes
   the expected rows
6. `runs.turns_completed` matches the number of `turns` rows
7. a bot restart in the middle of a run recovers cleanly (mock
   via direct script invocation)
8. `PRAGMA journal_mode = WAL` (sqlite default; spot-check the
   db header has WAL enabled)
9. `PRAGMA foreign_keys = ON` (so `REFERENCES` works)

live-network verification ("did the bot actually persist across a
real crash?") happens in §9.

---

# §5. monitoring + observability

## behavior shipped

- **structured logs** — every `console.log` in `src/` lands at a
  deterministic level: `info`, `warn`, `error`, `debug`. the cycle
  refactors `console.log` → a tiny `log()` helper that emits
  `level: ISO-timestamp: msg` lines (so logs are grep-able, not
  free-form)
- **log file rotation** via pm2's built-in logrotate (`pm2 install
  pm2-logrotate`). daily rotation, max 7 days, compressed
- **uptime check** — pm2 publishes a heartbeat on a unix socket at
  `/var/run/polycrisis/heartbeat.sock`. a sibling pm2-managed process
  (`polycrisis-heartbeat`) pings the socket every 30s and updates
  `/var/log/polycrisis/heartbeat.log`. older than 90s = "the bot is
  wedged" (silent).
- **liveness heartbeat** — `polycrisis-bot`'s `client.once('ready')`
  fires a heartbeat update to the heartbeat process via the socket.
  ready = "discord side is healthy, the bot can run a run loop".
  this heartbeat is *what §6's webhook latches onto*.

## structured logging

the project currently uses raw `console.log`. this cycle refactors:

```javascript
// src/lib/log.js  (new)
'use strict';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

let currentLevel = LEVELS[process.env.LOG_LEVEL || 'info'];

function log(level, msg, fields) {
  if (LEVELS[level] < currentLevel) return;
  const ts = new Date().toISOString();
  const suffix = fields ? ' ' + JSON.stringify(fields) : '';
  const out = `${ts} [${level}] ${msg}${suffix}\n`;
  process.stdout.write(out);
}

module.exports = {
  debug: (msg, f) => log('debug', msg, f),
  info:  (msg, f) => log('info', msg, f),
  warn:  (msg, f) => log('warn', msg, f),
  error: (msg, f) => log('error', msg, f),
};
```

every `console.log(...)` in `src/` becomes `log.info(...)`. the
update is mechanical but comprehensive.

### what gets logged at what level

- `[info]` startup milestones (`bot ready`, `commands registered`,
  persistence migrations applied, run started, run ended with the
  outcome)
- `[info]` operator-relevant events (`/polycrisis start`, identity
  resolved, advisor consulted)
- `[warn]` recoverable issues (rate-limit fallback, pending identity
  fell back to defaults after 5min, advisor click by non-active user)
- `[error]` failures (LLM call failed, run crashed mid-loop, persistence
  error, bot exiting)
- `[debug]` per-turn state snapshots (helpful for inspecting why a
  collapse happened). **default off**; turn on with `LOG_LEVEL=debug`
  to investigate.

**never** log at any level:
- environment variable values (tokens, keys, ids)
- full player move text if it includes PII
- raw LLM responses (they can be long; log a length and truncate)

the latter two are about respecting the user's privacy even though
they're the user. better safe than sorry.

### why structured (not pretty)

the pm2 → logrotate → grep / log search pipeline is the operator's
tool. structured `timestamp | level | msg | fields` lines are
`grep`-able and `jq`-able. pretty logs (colors, columns) look nice
in a terminal and die in production. the spec locks structured-only.

## log rotation

```bash
sudo -u polycrisis -H bash -lc '
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 50M
  pm2 set pm2-logrotate:retain 7
  pm2 set pm2-logrotate:compress true
  pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
  pm2 set pm2-logrotate:rotateModule true
'
```

this rotates `/var/log/polycrisis/*.log` daily, compresses old logs
(`.gz`), and retains 7 of them. fits comfortably in well under 1GB
of disk for the bot's normal volume.

disk-space monitoring is an out-of-band concern (the disk-fills-up
case is rare on a 50GB VPS but worth a cron job to surface it
either way). §5 ships **no** disk-monitoring; that's a §5 cycle if
the user asks later.

## uptime / heartbeat

two pm2-managed processes:

```
polycrisis-bot          ← the main bot
polycrisis-heartbeat    ← sibling watchdog process
```

`polycrisis-heartbeat` is a tiny node script (`scripts/heartbeat.js`):

```javascript
// scripts/heartbeat.js
// every 30 seconds, checks `/var/run/polycrisis/heartbeat.sock`.
// if no message in 90s, write "stale" to /var/log/polycrisis/heartbeat.log
// and exit non-zero (pm2 restarts it; the user sees the restart in pm2 logs).
//
// the main bot's `client.once('ready')` and the onTurnStart callback
// post a JSON line to the socket: { source: 'bot', kind: 'ready'|'turn'|'tick' }.
//
// this process writes that line to heartbeat.log. if the bot stops
// posting (crash, hang, network loss to discord), the log goes stale
// within 90s and the operator gets a signal.
```

the socket is a unix domain socket on `/var/run/polycrisis/heartbeat.sock`,
mode 0660 owned by `polycrisis:polycrisis`. no other user can reach
it. **why a socket and not a file**: files buffer + lose ordering +
races when two writers; unix sockets give us a clean stream.

> **§5.1 (grounding pending)**: heartbeat shape — confirm
> `(source, kind, ts)` per line is enough, or do you want more
> fields (turn count, last crisis id, run id)? spec defaults to
> `(source, kind, ts)` as the minimum useful.

## constraints

- `console.log` calls in `src/` **must** go through the `log()`
  helper. the cycle's commit includes a `grep -R 'console\.log' src/`
  returning only the helper's own internal call.
- log rotation is **automatic** (pm2-logrotate runs in the
  background). the operator doesn't need to remember it.
- heartbeat is silent during boot — the bot posts "ready" before
  the heartbeat watcher starts listening. that's fine: the watcher
  starts listening as part of its own pm2 `start` and reads existing
  socket messages.

## what's NOT in §5

- sentry / datadog / external APM — out of scope. plain logs +
  heartbeat is enough for v1.
- disk-space monitoring — out of scope.
- alerting integration (paging on alert) — out of scope. §6's
  webhook covers user-visible liveness.

## verification (per-cycle ad-hoc script)

`/tmp/hermes-verify-deploy-5-monitoring.sh` covers:

1. `src/lib/log.js` exports `info/warn/error/debug`
2. `grep -R 'console\.log' src/` returns no project-code hits
   (only the helper's own internal `process.stdout.write`)
3. the heartbeat process is registered in pm2 (`pm2 list` shows both
   `polycrisis-bot` and `polycrisis-heartbeat`)
4. logrotate config is set (`pm2 get pm2-logrotate:retain` returns 7)
5. the heartbeat socket is readable by `polycrisis`, not world-readable
6. **dry-run**: a synthetic message on the socket lands in
   `/var/log/polycrisis/heartbeat.log`

live-network verification ("did the bot keep heartbeating through a
real discord exchange?") happens in §9.

---

# §6. webhook liveness

## behavior shipped

- when `polycrisis-bot` boots and reaches `ready`, it POSTs a JSON
  payload to a configurable webhook URL (discord webhook, slack
  webhook, or any HTTP endpoint that accepts JSON)
- when `polycrisis-heartbeat` (sibling process) notices the bot's
  heartbeat has gone stale (>90s no message), it POSTs a separate
  "stale" payload
- when pm2 records a crash (max_restarts exceeded within a window),
  the heartbeat process POSTs a "crashed" payload
- the webhook URL is configured in `.env` as `POLYCRISIS_LIVENESS_WEBHOOK`
- absent or empty `POLYCRISIS_LIVENESS_WEBHOOK` = **silent mode**.
  cycle defaults to silent mode; user opts in via .env. respects
  the "no surprises" discipline from the project's handoff protocol.

## behavior

three payload shapes:

```json
// payload 1: boot
{
  "kind": "boot",
  "ts": "2026-07-04T18:42:11.123Z",
  "host": "polycrisis-prod-01",
  "model": "minimax/minimax-m3",
  "version": "200df2b"
}

// payload 2: stale
{
  "kind": "stale",
  "ts": "...",
  "host": "...",
  "last_message_age_ms": 120000,
  "last_message_kind": "turn"
}

// payload 3: crashed
{
  "kind": "crashed",
  "ts": "...",
  "host": "...",
  "exit_code": 1,
  "restart_count": 6,
  "last_log_path": "/var/log/polycrisis/bot.err.log"
}
```

the webhook URL receives each as a `POST` with `Content-Type: application/json`.
the receiver (discord/slack/generic) is responsible for formatting it
for display. discord webhooks accept arbitrary JSON; slack uses a
specific shape, so this spec only supports **discord-style webhooks
that accept any JSON** (most "incoming webhook" services do).

## code changes

- **new** `scripts/heartbeat.js` (already in §5) gains the webhook
  POST logic. on stale detection, POST payload 2. on pm2 event
  ("process exited"), POST payload 3.
- **new** `src/lib/webhook.js` — tiny utility, `postWebhook(url, payload)`
  with a 5-second timeout (don't hang on a slow webhook receiver).
  retry once on failure; log + drop on second failure. no
  exponential backoff for v1 (the heartbeat process is itself
  pm2-managed and pm2 retries it if it crashes).
- **modify** `src/bot/bot.js` — on `client.once('ready')`, POST
  payload 1 if `POLYCRISIS_LIVENESS_WEBHOOK` is set. fire-and-forget;
  if the POST fails, log a warning and continue (never block bot
  startup on a webhook).

## env vars (extend §2)

| name | default | what |
|---|---|---|
| `POLYCRISIS_LIVENESS_WEBHOOK` | empty | absolute URL of the webhook receiver |
| `POLYCRISIS_HOST_LABEL` | hostname | label included in payloads (useful when the user has multiple bots across hosts) |

## discord-specific path

if the user wants discord-native (DM / channel post), the spec
builds that path later as an enhancement. for v1 the webhook covers
the same need with less code.

## constraints

- webhooks are **fire-and-forget**. a failed POST must not crash
  the bot or the heartbeat process.
- webhook URLs **never** appear in logs. they're a secret in the
  same risk class as the discord token.
- "stale" payload is rate-limited to one per stuck episode (not
  per 30s check) — the heartbeat watcher sets a flag for 5min after
  a stale POST, suppressing repeats.
- the bot doesn't subscribe to `/silence bot` style commands. the
  user controls liveness via the env var, not slash commands.

## verification (per-cycle ad-hoc script)

`/tmp/hermes-verify-deploy-6-webhook.sh` covers:

1. `POLYCRISIS_LIVENESS_WEBHOOK` unset → no POST attempted on boot
   (assert via mock webhook receiver)
2. mock receiver gets payload 1 on simulated bot boot
3. stale detection posts payload 2 (synthetic: kill the bot for 100s,
   verify the heartbeat watcher POSTed once)
4. crash detection posts payload 3 (synthetic: send `SIGKILL`,
   verify POST within 10s)
5. webhook URL **does not** appear in log lines
6. webhook POST has a timeout (mock a slow receiver; assert
   second-failure drop, not hang)

live verification with a real discord/slack webhook happens after
deployment. the cycle's verification is mock-driven.

---

## batch 2 confirmation

§4, §5, §6 are landed (user confirmed 2026-07-04). proceeding with
batch 3.

---

# §7. security hardening

## behavior shipped

the user grounded "public internet" posture for this server. §3
shipped the non-root `polycrisis` user; this section covers the
rest: ssh hardening, firewall, fail2ban, file-permission discipline.

**what §7 explicitly addresses:**

- ssh key-only authentication (no password login)
- ssh configuration discipline (`PermitRootLogin no`,
  `PasswordAuthentication no`, `X11Forwarding no`, limited
  ciphers/MACs)
- ufw firewall (default-deny incoming, allow outbound, allow
  ssh from anywhere)
- fail2ban (ban IPs that brute-force ssh)
- file ownership + permissions discipline for `/opt`, `/var/lib`,
  `/var/log`, `/var/run`
- ssh port hardening (optional: move off port 22)

**what §7 explicitly does NOT address:**

- the `polycrisis` user creation — already shipped in §3
- ISO 27001 / SOC2 controls — overkill for a single-machine bot
- AppArmor / SELinux profiles — out of scope; ufw covers the
  common cases
- TLS / Let's Encrypt — the bot doesn't serve web traffic
- intrusion detection beyond fail2ban — out of scope

## ssh hardening

### password login disabled

```bash
sudo tee /etc/ssh/sshd_config.d/00-polycrisis.conf >/dev/null <<'EOF'
PermitRootLogin no
PasswordAuthentication no
ChallengeResponseAuthentication no
KerenbosAuthentication no
PubkeyAuthentication yes
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PrintMotd no
AcceptEnv LANG LC_*
EOF
sudo systemctl reload ssh
```

after this, every ssh login attempt must succeed with the user's
ssh key. password brute-force is impossible.

> **§7.1 (grounding pending)**: do you already have an ssh key
> you'd like to use for this server, or do you want me to generate
> one as part of the deploy? spec assumes you already have one.

### ssh config for the `polycrisis` user (login shell)

the `polycrisis` user has `--shell /usr/bin/bash` (set in §3) but
**does not** have a configured ssh key by default. the operator's
regular ssh key is authorized for both their own user and the
`polycrisis` user:

```bash
# on the operator's local machine
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server     # for the user's login
ssh user@server 'sudo -u polycrisis -H bash -lc "mkdir -p ~/.ssh && chmod 0700 ~/.ssh"'
cat ~/.ssh/id_ed25519.pub | ssh user@server 'sudo -u polycrisis -H bash -lc "cat >> ~/.ssh/authorized_keys && chmod 0600 ~/.ssh/authorized_keys"'
```

> **§7.2 (grounding pending)**: confirm the operator logs in as
> their regular ssh user first, then uses `sudo -u polycrisis`
> from there. the alternative is direct `ssh polycrisis@server`,
> but that requires key auth set up for polycrisis too.

### optional: move ssh off port 22

moving to a non-standard port cuts drive-by scans by ~95%. not a
security fix (a determined attacker finds the port); just noise
reduction.

```bash
# in /etc/ssh/sshd_config.d/00-polycrisis.conf
Port 2222
```

and update the operator's local `~/.ssh/config`:

```
Host polycrisis-prod
    HostName server.example.com
    User user
    Port 2222
```

> **§7.3 (grounding pending)**: do you want to move off port 22?
> spec defaults to keeping port 22 (simpler ops, more visible
> activity in logs).

## ufw firewall

default-deny incoming. allow ssh outbound to anywhere (the bot
needs to reach discord + openrouter). no other inbound ports.

```bash
sudo apt-get install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh           # or `ufw allow 2222/tcp` if §7.3 says yes
sudo ufw enable
sudo ufw status verbose
```

the bot doesn't serve any ports. no `ufw allow` for the bot's
internals; the bot is purely outbound (https to discord + openrouter).

> **note**: if the user runs a future web version of polycrisis
> on this server (the spec at `docs/13-discord-bot-architecture.md`
> §"future work" hints at a web UI), the corresponding `ufw allow`
> ships in that future cycle. NOT in this spec.

## fail2ban

```bash
sudo apt-get install -y fail2ban
sudo tee /etc/fail2ban/jail.d/polycrisis.conf >/dev/null <<'EOF'
[sshd]
enabled = true
port = ssh           # or 2222 per §7.3
filter = sshd
backend = systemd
maxretry = 5
findtime = 600
bantime = 3600
ignoreip = 127.0.0.1/8 ::1 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16
EOF
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

5 attempts / 10 min window → 1 hour ban. private network ranges
are exempted so the user's local network doesn't get banned by
their own brute-force attempts.

## file permissions audit

the operator runs a one-shot audit script:

```bash
#!/usr/bin/env bash
# /usr/local/bin/polycrisis-audit
# fail loud if the permissions drift from §7 spec.

set -e
errors=0

check() {
  local path="$1" expected_mode="$2" expected_owner="$3"
  if [ ! -e "$path" ]; then
    echo "  MISSING: $path"
    errors=$((errors+1))
    return
  fi
  local actual
  actual=$(stat -c '%a %U:%G' "$path")
  local expected="$expected_mode $expected_owner"
  if [ "$actual" != "$expected" ]; then
    echo "  FAIL: $path"
    echo "    expected: $expected"
    echo "    actual:   $actual"
    errors=$((errors+1))
  else
    echo "  OK:   $path"
  fi
}

echo "applying §7 file-permission spec…"
check /opt                          0755 root:root
check /opt/polycrisis               0755 polycrisis:polycrisis
check /opt/polycrisis               0755 polycrisis:polycrisis
check /opt/polycrisis/.env          0640 polycrisis:polycrisis
check /var/lib/polycrisis           0750 polycrisis:polycrisis
check /var/log/polycrisis           0750 polycrisis:adm
check /var/run/polycrisis           0755 polycrisis:polycrisis
check /var/run/polycrisis/heartbeat.sock 0660 polycrisis:polycrisis
check /home/polycrisis              0750 polycrisis:polycrisis
check /home/polycrisis/.ssh         0700 polycrisis:polycrisis
check /etc/ssh/sshd_config.d/00-polycrisis.conf 0644 root:root

if [ $errors -gt 0 ]; then
  echo "FAIL: $errors permission drift"
  exit 1
fi
echo "PASS: file permissions match §7 spec"
```

this script is what `polycrisis-audit` returns non-zero on. cron it
weekly if the user wants continuous guarding, or just keep it
manual.

## automatic security updates

```bash
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -f noninteractive unattended-upgrades
```

security patches install automatically within 24h of release.
os upgrades (kernel, etc.) wait for the user to manually
`apt-get upgrade`. the spec calls this out because: an exposed
server's biggest risk isn't clever attacks, it's missing
patches.

## constraints

- the operator's regular ssh user (not `polycrisis`) has sudo
  access. `polycrisis` does **not** have sudo.
- root login is disabled. sudo is the only way to get root.
- sshd_config changes are tested (no immediate `systemctl reload`
  without verifying syntax first).
- ufw is enabled **before** any other inbound service is exposed.
- fail2ban runs from the moment ufw is enabled.

## verification (per-cycle ad-hoc script)

`/tmp/hermes-verify-deploy-7-security.sh` covers:

1. `/etc/ssh/sshd_config.d/00-polycrisis.conf` exists with the
   expected directives
2. `PermitRootLogin no` is in effect
3. `PasswordAuthentication no` is in effect
4. ufw is enabled with the expected rule set (`ufw status`)
5. fail2ban is running (`fail2ban-client status sshd`)
6. the `polycrisis` audit script reports 0 errors
7. **negative test**: a password auth attempt is rejected (we
   skip this in CI; it's tested manually as the last thing before
   closing the session that opened port 22 / ssh — if the user
   can't log back in with a key, they restore the snapshot
   from their VPS provider's UI).

live verification (try to ssh with a wrong key, watch fail2ban
ban the IP) happens via manual operator action in §9.

---

# §8. upgrade + rollback

## behavior shipped

- the standard upgrade flow is `git pull && npm ci && pm2 reload`
  (zero-downtime; pm2 brings up the new process before SIGTERMing
  the old)
- env-only model swap is its own sub-command:
  `polyswap-model <name>` (alias: just edit `.env` and reload)
- rollbacks are `git checkout <prev-sha> && pm2 reload`. the db
  schema is NOT rolled back automatically (additive migrations
  only; see §4)
- "model swap" = literally flip `OPENROUTER_MODEL` and `pm2 reload`.
  the user grounded this. the spec doesn't ship any magic — the
  project already has swappable LLM via env.

## the upgrade runbook

```
# upgrade to latest main
ssh server
sudo -u polycrisis -H bash -lc '
  set -e
  cd /opt/polycrisis
  git fetch --all --prune
  git checkout main
  git pull --ff-only
  npm ci --omit=dev
  pm2 reload ecosystem.config.js
'
```

this is the canonical deploy for **any change that ships on main**.
it does:
1. fetch new commits (no auto-merge; `git pull --ff-only` refuses
   to push non-fast-forward so we don't silently create merge commits)
2. install new deps without touching the existing `node_modules`
   (`npm ci` removes the old before installing; that's safe because
   the old process is still running during this step)
3. reload pm2 (SIGTERM the old, start the new; ~1s pause)

the spec doesn't ship a `deploy.sh` script in v1 — the operator
runs the three commands by hand or copy-paste. automation is
out of scope (no CI runs against this; the user merges + pulls).

## the model-swap runbook

```
# swap models (no code change; just env + reload)
ssh server
sudo -u polycrisis -H bash -lc '
  set -e
  cd /opt/polycrisis
  # edit .env: change OPENROUTER_MODEL=...
  ${EDITOR:-nano} .env
  # verify the model is reachable (smoke check before reload)
  node -e "process.env.OPENROUTER_MODEL = \"$(grep OPENROUTER_MODEL .env | cut -d= -f2)\"; require(\"./src/sim/openrouter-client\").smokeCheck()"
  pm2 reload ecosystem.config.js
'
```

the smoke-check call is a **best-effort** sanity step. if it
fails, the user aborts the reload; if it succeeds, the swap
goes live. matches the project's "swappable LLM is core
infrastructure" claim from `docs/01-corpus-synthesis.md`.

> the smoke-check function doesn't exist yet; it's added in the
> §8 implementation cycle if the user wants it. v1 acceptable
> to ship without it — the user just relies on `pm2 logs` after
> reload.

## the rollback runbook

```
# roll back to a known-good commit
ssh server
sudo -u polycrisis -H bash -lc '
  set -e
  cd /opt/polycrisis
  PREV=$(git log --oneline -2 | tail -1 | awk "{print \$1}")
  echo "rolling back to $PREV"
  git checkout "$PREV"
  npm ci --omit=dev
  pm2 reload ecosystem.config.js
'
```

this is the loop-hole for "we shipped a regression at HEAD".
`git checkout <sha>` works regardless of branch state. the spec
doesn't ship any other rollback mechanism in v1 (no capistrano,
no slots, no blue-green — single process + git is enough).

### rollback doesn't touch the db

sqlite migrations are forward-only (§4). if v1 of the schema
shipped at commit `abc123` and v2 ships at `def456`, rolling
back to `abc123` keeps the v2 schema in place. that's fine for
additive migrations; if v2 ever drops a column, rollback gets
ugly. the spec locks v1 to additive migrations only.

## bot.db backup before each deploy (optional)

the spec calls out that rolling back the code without rolling
back the db can leave the app confused. v1 ships **without**
this discipline — the user can adopt it informally by running
`node scripts/db-snapshot.js` before each deploy if they want.

## constraints

- upgrade runs **as the polycrisis user** (not root). the only
  step that touches root is fail2ban / ufw / sshd changes from §7.
- `pm2 reload` is non-zero-downtime; the bot might briefly
  miss slash-command acks during the 1s pause. acceptable.
- env-var changes (`OPENROUTER_MODEL` etc.) are committed to
  the .env on the server. not committed to the repo (secrets).
- the user opts in to which commit they want via git checkout.
  there's no auto-update from github; deployments are explicit.

## what's NOT in §8

- CI / CD pipelines (no github actions triggering deploys)
- blue-green deploys (single process + reload is enough)
- canary / staged rollouts (single user, single process)
- db migration rollback (additive migrations only; rollback
  is "ship a new forward migration" if needed)
- load balancing (single machine, single process)

## verification (per-cycle ad-hoc script)

`/tmp/hermes-verify-deploy-8-upgrade.sh` covers:

1. `git status` is clean before the upgrade (no uncommitted
   local changes that would block `git pull --ff-only`)
2. `npm ci --omit=dev` exits 0 with the current `package-lock.json`
3. a synthetic `pm2 reload` on a test config file works (or
   `pm2 reload ecosystem.config.js` against a verification-mode
   stub)
4. **rollback test**: checkout HEAD~1, `npm ci`, reload works,
   checkout back to HEAD, reload works
5. `node -e "require('./src/sim/openrouter-client').smokeCheck()"`
   works against the env-var-resolved model (only if §8 ships
   the smokeCheck helper)

the spec's stance on this verification: most checks are
mechanical. the real test is in §9: a live-run on the deployed
server, then a deliberate upgrade, then a deliberate rollback,
with the user playing through each time.

---

# §9. live-run confirmation

## behavior shipped

this section is **acceptance**, not feature work. the goal is a
signed-off end-to-end run with real discord credentials + a real
LLM call + a real persisted run that survives a restart. when
this section closes, the deployment is **done**.

## the live-run runbook

this is what the operator does, in order, when §9 lands. the
operator is the user.

### step 1 — invite the bot to your test server

```
# pre: you've created the bot at discord.com/developers/applications
# pre: you've copied the bot token + client id to .env
# pre: you've set DISCORD_GUILD_ID in .env so slash commands register
#      as GUILD commands (instant) instead of GLOBAL (~1hr)

ssh server
sudo -u polycrisis -H bash -lc '
  cd /opt/polycrisis
  pm2 status                                # confirm polycrisis-bot is online
  pm2 logs --lines 30 polycrisis-bot        # confirm [bot] ready + boot webhook fired (if configured)
'
```

### step 2 — start a run

in your discord client, in a DM with the bot:

```
/polycrisis start as:yourname governing:your institution name
```

expect:
- a crisis embed
- a STEP3_HINT_TEXT followup
- a status embed if you send `/polycrisis status`
- three turns of play, ending in either collapse or stabilization

### step 3 — visit a run-end report

when the run ends (collapse, max-turns, `/polycrisis end`, or
`::resign`):
- check the channel for the end-of-run embed + `.md` + `.html`
  attachments
- check `wiki/prototypes/` for the auto-filed prototype doc
- check the db: `sqlite3 /var/lib/polycrisis/bot.db "SELECT * FROM runs ORDER BY started_at DESC LIMIT 1;"`

### step 4 — verify persistence

```
ssh server
sudo -u polycrisis sqlite3 /var/lib/polycrisis/bot.db <<'EOF'
.headers on
SELECT run_id, player, regime, outcome, turns_completed, ending_by FROM runs ORDER BY started_at DESC LIMIT 1;
SELECT turn_number, length(player_move) AS move_len, length(world_text) AS world_len FROM turns WHERE run_id = (SELECT run_id FROM runs ORDER BY started_at DESC LIMIT 1) ORDER BY turn_number;
EOF
```

this confirms:
- the run is recorded in `runs`
- every turn is recorded in `turns` with a non-empty player move
- the outcome is recorded

### step 5 — verify boot persistence

restart the bot and confirm the in-flight (or most recent) run
state is consistent with the db:

```
ssh server
sudo -u polycrisis pm2 restart polycrisis-bot
# in discord, send /status — should match the last db-recorded state
```

### step 6 — model swap (env-only)

```
ssh server
sudo -u polycrisis -H bash -lc '
  cd /opt/polycrisis
  # set OPENROUTER_MODEL to a fallback or different model
  sed -i "s/^OPENROUTER_MODEL=.*/OPENROUTER_MODEL=google\/gemini-3.1-flash-lite/" .env
  pm2 reload ecosystem.config.js
'
```

start a new `/polycrisis run` and verify the artifact's footer
shows the new model. (the model id is in the embed footer.)

### step 7 — fire a swap to direct MiniMax m3

```
ssh server
sudo -u polycrisis -H bash -lc '
  cd /opt/polycrisis
  # set MODEL_DIRECT=true + OPENAI_BASE_URL to MiniMax URL + OPENAI_API_KEY
  # (per §2 env table)
  pm2 reload ecosystem.config.js
'
```

start a new `/polycrisis run` and confirm the bot still works
end-to-end. the swap should be invisible to the player; the
only observable change is the model name in the artifact footer.

### step 8 — record findings

a `wiki/prototypes/2026-07-04-cycle-deploy-live-run.md` gets
written capturing:
- the layout: which pm2 processes are running, where the db is,
  where the logs are
- the live-run result: did the run complete, did it persist,
  did the model swap work
- any deviation from the spec
- any deferred items that came up

this file is the **acceptance record**. when it's written, §9
is done.

## constraints

- §9 is **manual operator work**, not code. the assistant
  doesn't have access to the user's discord account or their
  test server. the user runs the runbook.
- the runbook is **explicit**. it doesn't say "verify the
  bot is healthy"; it says `pm2 status` + `pm2 logs --lines 30`.
- the prototype doc is the artifact. the assistant sees the
  prototype doc and uses it to ground the next batch.

## what's NOT in §9

- multi-user acceptance (the user is the only player).
- multi-run stress test (one walkthrough is enough for v1;
  multi-run is a cycle 5-style polish cycle later).
- external acceptance — there are no external players for v1.

---

## batch 3 confirmation

§7, §8, §9 drafted. pending grounding questions:

- §7.1 — confirm the operator's ssh key shape
- §7.2 — operator-login user + `sudo -u polycrisis` workflow
- §7.3 — keep ssh on port 22 (default) or move to a non-standard
  port (less visible to drive-by scans)

reply with "7) confirmed ... 9) confirmed" once you've landed
your answers, and the doc is done. the next session picks up
the implementation cycles (one section per cycle, pre-confirmed
grounding before each remote command).

---

## sources for the full spec

- conversation with the user, 2026-07-04 (server OS, supervisor,
  LLM swappability, sqlite-on, monitoring, webhook liveness,
  model swap shape, public-internet security, single-doc spec)
- prior art in the project:
  - `docs/13-discord-bot-architecture.md` v2 persistence
  - `docs/14-discord-bot-setup.md` local-dev setup
  - `docs/11-openrouter-configuration.md` model swap mechanics
  - `docs/12-handoff-protocol.md` orchestrator handoff
  - cycle 6g prototype at `wiki/prototypes/2026-07-04-cycle-6g-end-and-identity.md`

## file growth plan (each cycle ships a commit)

```
cycle 7-install    ← §1
cycle 7-secrets    ← §2 + grounding for §4 + the .gitignore check
cycle 7-pm2        ← §3 (also lands the polycrisis user)
cycle 7-sqlite     ← §4 + scripts/db-migrate.js + scripts/migrations/001-initial-schema.sql
cycle 7-monitoring ← §5 + src/lib/log.js refactor + scripts/heartbeat.js
cycle 7-webhook    ← §6 + src/lib/webhook.js
cycle 7-security   ← §7 (firewall + ssh + fail2ban + audit script)
cycle 7-upgrade    ← §8 runbooks committed + verified via rollback test
cycle 7-live-run   ← §9 + prototype doc at wiki/prototypes/2026-07-04-cycle-deploy-live-run.md
```

each cycle has its own `pre-code` numbered-question grounding
(R1–R4-style) before any code or remote commands touch the
server.
