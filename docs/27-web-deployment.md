# Polycrisis of Authority — Web Surface Deployment Guide

This guide covers deploying the Polycrisis of Authority **web
surface** (`src/web/server.js`) to a personal server running
Debian or Ubuntu. Everything lives in one user's home directory.
No system-wide packages are installed, no service accounts are
created, and the supervisor runs under the user's own shell.

**This guide is the web-surface companion to `docs/16-deployment.md`.**
The discord-bot deployment uses pm2, sqlite, and a richer env-var
shape. The web surface uses *none of that* — node's built-in
`http.createServer` only. So this guide is shorter, lighter, and
doesn't need pm2 unless you want it.

## intended audience and environment

This guide is for someone who wants to host the web surface on a
personal server, home machine, or VPS. The instructions are
public-readiness: another person with a fresh Debian/Ubuntu install
and a non-root shell account should be able to follow them
end-to-end without modification.

The default environment is:

- a single shell account, referred to throughout as `$USER`
- that user's home directory is `$HOME` (often `/home/$USER`)
- Debian or Ubuntu (apt-based; system packages are used only if
  explicitly listed in **§1 install + run**)
- access to the internet for `git clone` and outbound HTTPS to the
  LLM provider
- a reachable IP address or hostname (so you can open the URL in a
  browser)

The user's goal is to start the web server, persist run state under
the install dir, observe it through logs, and be able to upgrade it
cleanly when a new version ships.

## what's inside

| section | what | why |
|---|---|---|
| 1. install + run | node, app layout, env-vars, smoke check | the system runs |
| 2. secrets + config | `.env`, permissions, openrouter API key | the server authenticates |
| 3. process supervision | pm2 (or plain tmux/screen/nohup) under the user's shell | survives logouts |
| 4. runtime data | `data/runs/` and `assets/videos/` | state survives restarts |
| 5. monitoring + observability | logs, logrotate (optional) | we can see what's happening |
| 6. firewall + port | opening the port, hostname access | the browser can reach it |
| 7. upgrade + rollback | `git pull && pm2 reload` | we can ship a fix |
| 8. live-run confirmation | first real end-to-end run | acceptance |

## what's NOT in this guide

- TLS termination / reverse proxy — the surface ships without
  auth and the run URL is the access. Reverse-proxy-with-auth
  was considered and explicitly rejected for v1 (cycle 12c
  decision: no bearer-token, no npm install for sqlite). If you
  want HTTPS or auth, terminate it at a reverse proxy you run
  yourself.
- bearer-token auth on the surface itself — same reason. The
  v1 surface ships open. v2 (cycle 14+) layers auth on top.
- sqlite persistence — the web surface uses the filesystem
  (`data/runs/<id>.json`), not sqlite. The `bot.db` /
  `better-sqlite3` shape in `docs/16-deployment.md` is for the
  discord bot and is not used here.
- OS-level security hardening (ssh, firewall, fail2ban,
  unattended-upgrades). The user is responsible for hardening
  their own server; see your VPS provider's docs or your OS
  security guide. The web surface does not need any of these
  configured to run, only to be reachable safely from outside.
- system service accounts. Nothing in this guide creates or
  modifies system users. The `$USER` account you log in as is
  the only identity involved.

## file layout

```
~$USER/
└── polycrisis-of-authority/                  ← git clone; everything lives here
    ├── .env                                  ← env-var file (mode 0600)
    ├── .env.example                          ← tracked in git, mode 0644
    ├── package.json
    ├── package-lock.json
    ├── node_modules/                         ← populated by npm install (only needed for the LLM client + wiki-query)
    ├── logs/                                 ← log directory (created on first run)
    ├── data/
    │   ├── seed-runs/                        ← 2 hand-crafted runs committed in git
    │   └── runs/                             ← live v1 session files (gitignored)
    ├── assets/
    │   └── videos/prototype-2026-08/         ← opening title video (committed in git; the surface asset)
    ├── src/                                  ← source tree
    │   ├── sim/                              ← engine
    │   └── web/                              ← web surface (the thing this guide ships)
    ├── wiki/                                 ← the corpus
    └── scripts/                              ← wiki-query, seed-variants, etc.
```

**All application code and all runtime state live under `$HOME`.**
There is no `/opt/polycrisis`, no `/var/lib/polycrisis`, no
`/var/log/polycrisis`, no service user called `polycrisis`. This
is intentional and load-bearing for the public-readiness of the
guide: anyone with a fresh user account on Debian/Ubuntu can
follow these steps and get a working web surface without `sudo`.

> **§X.Y groundings (locked)**: the install dir is
> `~/polycrisis-of-authority`, the runtime dir is
> `~/polycrisis-of-authority/data/runs/`, logs are
> `./logs/` inside the install dir, the supervisor is launched
> as the user under the user's shell with no systemd autostart
> (opt-in via `pm2 startup systemd-user` if you want boot-time
> recovery), and OS-level hardening is out of scope.

---

# §1. install + run

## behavior shipped

- node (current LTS) is on the system. The guide covers both
  states: node is already installed, or node needs to be installed
  from apt.
- the app lives at `~/polycrisis-of-authority` (created by
  `git clone`).
- app dependencies are installed via `npm install --omit=dev`
  (production-only) using the project's checked-in
  `package-lock.json`. **the web surface itself only needs
  `dotenv`** for env loading; `discord.js` and `js-yaml` are
  dependencies of the discord-bot surface and aren't used by the
  web server, but they're cheap and installing them keeps a single
  `node_modules/` consistent.
- the server listens on `127.0.0.1:3000` by default (loopback only).
  See **§6 firewall + port** for changing this to a reachable
  address.
- logs land in `~/polycrisis-of-authority/logs/` (created on
  first run).

## install steps

### if node is already on the system

```bash
node --version        # expect v22.x or v20.x LTS
```

### if node is not yet installed

```bash
# node is in the distro's package archive on modern Debian/Ubuntu;
# we use the system package rather than nvm to keep this guide
# free of per-user toolchains.
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
test -d src/web                 # true (web surface source)
test -f .env.example            # true
node --check src/web/server.js  # syntax check
node --check src/web/surface.js # syntax check
```

## alternatives

### node via distro apt vs nvm

- **distro apt** (default in this guide): system-wide, one version,
  simpler, no shell-customization. what `apt-get install -y nodejs`
  puts on your system is what's used everywhere. fits the
  "this guide works for any new user" framing.
- **nvm** (alternative, not recommended here): per-user, no `sudo`
  for `npm install`, easier version-pinning. adds a
  shell-customization step that not every user wants. if you prefer
  nvm, install with the project-standard nvm install script,
  then `nvm install --lts` and proceed with §1 from the clone step.

the guide defaults to apt because it produces a single, obvious
install command and zero per-user shell changes. swap to nvm if
you have a reason to.

### cloning vs. downloading a release tarball

`git clone` is the default. if you don't want git around on the
server, download a release tarball from the project's GitHub
releases page and unpack. the rest of the guide is the same.

## constraints

- the user account that does the install is the same account that
  runs the supervisor (`$USER`). there's no `sudo -u polycrisis`
  step anywhere.
- `~` and `$HOME` are interchangeable throughout; `~` is used in
  display, `$HOME` in scripts.
- `.env` is mode `0600` (covered in §2), owned by `$USER:$USER`.
- `node_modules/` is owned by `$USER`; never run
  `sudo npm install` (it would change ownership).

## what's NOT in §1

- log directory creation — the server creates `logs/` itself on
  first run.
- the systemd hook for boot — none. the server is expected to run
  while your shell session is alive (pm2 or a tmux session keeps it
  alive across the shell). if you want it to survive a full logout,
  see the **systemd user service** alternative in §3.
- secrets — covered in §2.

---

# §2. secrets + config

## behavior shipped

- secrets are isolated to one file:
  `~/polycrisis-of-authority/.env`.
- `.env` is mode `0600`, owned by `$USER:$USER`. only the user
  can read or write it.
- `.env` is gitignored (already is — see `.gitignore` shipped in
  cycle 1c).
- the server reads the env vars at startup; missing required vars
  crash the process with a clear error.

## env vars the web surface consumes

| name | required? | what it controls |
|---|---|---|
| `OPENROUTER_API_KEY` | **yes** | openrouter auth |
| `OPENROUTER_MODEL` | optional | model id; default: `minimax/minimax-m3` |
| `FALLBACK_OPENROUTER_MODEL` | optional | used by the engine on rate-limit / failure; default: `google/gemini-3.1-flash-lite` |
| `OPENAI_API_KEY` | optional | direct LLM provider auth |
| `OPENAI_BASE_URL` | optional | direct LLM provider URL |
| `MODEL_DIRECT` | optional | when `"true"`, server talks to `OPENAI_BASE_URL` instead of openrouter |
| `PORT` | optional | listen port; default `3000` |
| `HOST` | optional | bind address; default `127.0.0.1` (loopback — see §6) |
| `WIKI_RETRIEVAL_LIMIT` | optional | corpus pages retrieved per advisor call; default 6 |
| `WIKI_CONTEXT_CHARS` | optional | corpus context char budget; default 8000 |
| `RUN_LOG_DIR` | optional | directory for run logs; default `./runs/` inside the install dir |

`OPENROUTER_API_KEY` is the only env var the surface *must* have
to function. Without it, `POST /runs` and `POST /runs/:id/move`
will fail with an authentication error from openrouter. The
`GET` routes (cold-start, run list, run page, status page,
asset route) work without it — they don't call the LLM.

## .env shape (template)

```dotenv
# ~/polycrisis-of-authority/.env
# generated from .env.example — fill these in

# openrouter (default LLM provider)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=minimax/minimax-m3
FALLBACK_OPENROUTER_MODEL=google/gemini-3.1-flash-lite

# direct LLM provider (used when MODEL_DIRECT=true). defaults to
# openrouter's URL. set OPENAI_BASE_URL and OPENAI_API_KEY for direct
# provider connections.
OPENAI_API_KEY=
OPENAI_BASE_URL=
MODEL_DIRECT=false

# server bind (loopback by default; see §6 to expose externally)
PORT=3000
HOST=127.0.0.1
```

when using openrouter (default), set `OPENROUTER_API_KEY`.
`OPENAI_BASE_URL` is left empty and `MODEL_DIRECT` stays `false`.
when using a direct provider, set `MODEL_DIRECT=true`, fill in
`OPENAI_API_KEY`, and set `OPENAI_BASE_URL` to the provider's URL.

## LLM provider selection

- **default: openrouter.** `OPENROUTER_MODEL` is consulted.
  base URL is openrouter's; auth header is
  `Authorization: Bearer ${OPENROUTER_API_KEY}`.
- **direct:** set `MODEL_DIRECT=true` in `.env`. the server
  reads `OPENAI_BASE_URL` and `OPENAI_API_KEY` instead. headers
  switch to OpenAI's
  `Authorization: Bearer ${OPENAI_API_KEY}`.

both paths use the same chat-completions schema (request body
shape is identical). the case-study claim is that this swap is
environmental, not code: change `.env`, restart the server, done.

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

after you fill in the `.env` by hand (or via copy-paste from a
password manager), permissions are preserved by the editor you
use. if the editor changes them, run `chmod 0600 .env` again.

## constraints

- **never** log env-var values. the server's startup is
  `console.log` only, never
  `console.log(process.env.OPENROUTER_API_KEY)`.
- **never** include `.env` in a backup or in `git status`.
  already true via `.gitignore`.
- **never** copy `.env` to `/tmp/` or anywhere outside the
  install dir. secrets stay in
  `~/polycrisis-of-authority/.env`.

## what's NOT in §2

- logging discipline — covered in §5.
- model swap at deploy time — covered in §7.
- secret rotation — out of scope for v1.

---

# §3. process supervision

## three viable options

The web surface is a single `node` process that listens on a port.
You can run it under any of three supervisors, in order of
"out-of-the-box-ness":

### option A — pm2 (recommended for production)

pm2 is what `docs/16-deployment.md` uses for the discord bot, and
it's the right shape here too. Single process, restart-on-crash,
log files in `./logs/`, `pm2 save` to persist the process list
across pm2 restarts.

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

create `ecosystem.config.js` at the install root (a copy of
`ecosystem.config.js.example`, edited to point at `src/web/server.js`
instead of `src/bot/bot.js`):

```javascript
// ~/polycrisis-of-authority/ecosystem.config.js
// pm2 config for the Polycrisis web surface.
//
// Why this file exists at all: pm2 needs a config object
// describing the process. We commit this as
// `ecosystem.config.js.example` (no secrets, no user-specific
// paths) and copy it to ecosystem.config.js for deployment.
// Each user fills in their own `cwd` path and changes the
// `script` to point at the web surface (this file) or the
// discord bot (the example).

module.exports = {
  apps: [{
    name: 'polycrisis-web',
    script: 'src/web/server.js',
    cwd: '/REPLACE/WITH/YOUR/ABSOLUTE/PATH/TO/polycrisis-of-authority',

    // pm2 reads .env natively via env_file. the web surface
    // also loads .env itself via dotenv (at the top of the
    // wiki-query / openrouter-client code). env_file is set
    // anyway so pm2's `pm2 env` command shows the right values.
    env_file: '.env',

    // Restart policy — survive transient failures.
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,
    max_memory_restart: '512M',

    // Logs — all paths inside the install dir, owned by you.
    out_file: './logs/web.out.log',
    error_file: './logs/web.err.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Lifecycle.
    kill_timeout: 8000,
    listen_timeout: 8000,
    time: true,
  }],
};
```

the `cwd` must be set to your absolute install path
(`$HOME/polycrisis-of-authority`). if you clone it elsewhere,
edit `ecosystem.config.js` accordingly.

### lifecycle (pm2)

```bash
# start (idempotent: reuses an existing process; `pm2 reload` is the upgrade path)
cd $HOME/polycrisis-of-authority
pm2 start ecosystem.config.js
pm2 save                            # persist process list across pm2 restarts (NOT system reboots)
pm2 list

# graceful stop
pm2 stop polycrisis-web

# graceful reload (after `git pull`; SIGTERM + start new instance, ~1s pause)
pm2 reload polycrisis-web

# logs
pm2 logs polycrisis-web

# a quick read of the last N lines without following
tail -100 logs/web.out.log
tail -100 logs/web.err.log
```

### option B — plain tmux / screen

If you don't want pm2 at all, the lightest-touch option is a
tmux or screen session running `node src/web/server.js`. This
survives your shell logout (the tmux server keeps running) but
not a system reboot.

```bash
# install tmux if you don't have it (one-time)
sudo apt-get install -y tmux

# start a named session running the server
cd $HOME/polycrisis-of-authority
tmux new -s polycrisis-web 'node src/web/server.js 2>&1 | tee logs/web.out.log'

# detach: Ctrl-b then d
# re-attach: tmux attach -t polycrisis-web
# tail logs from outside: tail -f logs/web.out.log
```

### option C — `nohup` for the absolute minimum

```bash
cd $HOME/polycrisis-of-authority
nohup node src/web/server.js > logs/web.out.log 2>&1 &
echo $! > logs/web.pid     # so you can kill it later

# stop:
kill $(cat logs/web.pid)
```

this is the bare minimum — no restart-on-crash, no auto-rotate,
no clean lifecycle. fine for a quick smoke test, not recommended
for "leave it running for weeks."

## no systemd autostart (default)

the default flow does **not** set up `pm2 startup` (the systemd
hook that brings pm2 back up after a full system reboot). reasons:

- the user's instructions are explicit: everything in `/home/$USER`.
  systemd units via `pm2 startup` are system-wide.
- pm2 keeps the surface alive across your shell session: as long
  as you've started pm2 once (and run `pm2 save`), the process
  list survives. closing your terminal doesn't kill the server.
- what pm2 does **not** survive: a full server reboot. this is
  acceptable for v1 — the server recovers when you
  `pm2 resurrect` after a reboot (which `pm2 save` makes
  possible).

### alternative: systemd user service (opt-in)

if you want boot-time autostart AND your system has the systemd
user instance enabled (it's the default on Debian/Ubuntu), you can
enable boot-time startup **without any system-wide writes**:

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

this is opt-in. if you don't run the commands above, the server
survives your shell session but not a full reboot — which is fine
for v1.

## constraints

- pm2 is invoked **as the user account that owns the install dir**.
  no `sudo -u` step anywhere.
- pm2's own state lives in `~/.pm2/` (created on first pm2
  invocation).

---

# §4. runtime data

The web surface persists two kinds of data:

1. **v1 session files** at `data/runs/<run-id>.json` — one
   JSON file per in-flight or completed run. Created on
   `POST /runs`, updated on every move, persisted across
   restarts.
2. **opening title video** at
   `assets/videos/prototype-2026-08/polycrisis-of-authority-opening.mp4`
   — generated artifact, gitignored.

Both live inside the install dir. No `/var/lib/polycrisis`, no
sqlite. The disk shape is intentionally simple.

## session files

```
~/polycrisis-of-authority/data/
├── seed-runs/                        ← 2 hand-crafted runs (in git; not modified at runtime)
│   ├── 20260629064319-h80unb.json
│   └── 20260628223813-8jtf0r.json
└── runs/                             ← live v1 sessions (gitignored)
    └── 20260801203456-abc123.json    ← one file per run
```

session files are written atomically (`writeJsonSafe` writes to
`.tmp` then renames). On crash mid-turn, the last successful
turn is preserved.

`data/runs/` is gitignored. To back up your runs, copy the
directory:

```bash
tar czf polycrisis-runs-backup-$(date +%F).tgz -C ~/polycrisis-of-authority data/runs/
```

to restore:

```bash
tar xzf polycrisis-runs-backup-YYYY-MM-DD.tgz -C ~/polycrisis-of-authority/
```

## opening title video

`assets/videos/prototype-2026-08/polycrisis-of-authority-opening.mp4`
is part of the surface — it's the opening title that plays on
the cold-start and end-of-run pages. It ships in the repo at
that path (committed as part of cycle 13's prototype 5 render)
and `git pull` keeps it current.

The surface renders the `<video>` element pointing at this
file. If the file is missing for any reason (manual deletion,
failed fetch), the video element fails to load and the player
sees an empty rectangle. The skip link still works. The rest
of the surface is unaffected.

the underlying prompts and the `scripts/h3-generate.sh` script
are in the repo for re-rendering if the video ever needs to be
regenerated — see `docs/26-interstitial-video.md` for the
production recipe. This is not a step the player runs at deploy
time.

## constraints

- `data/runs/` and `assets/videos/prototype-2026-08/` are
  gitignored. already true via `.gitignore` shipped in cycle 13.
- the seed runs in `data/seed-runs/` are committed in git and
  are read-only at runtime. do not modify them in-place on the
  server — `git pull` would overwrite your changes.

## what's NOT in §4

- backup automation — covered in §5 if you want cron-based
  snapshots.
- log rotation — covered in §5.

---

# §5. monitoring + observability

## behavior shipped

- structured logs land in
  `~/polycrisis-of-authority/logs/web.out.log` and
  `web.err.log` (under pm2) or wherever your supervisor
  redirects them.
- the server prints `[web]` prefixed log lines on boot:
  ```
  [web] polycrisis v1 surface (cycle 13 — opening title)
  [web] listening on http://127.0.0.1:3000
  [web] routes:
  [web]   GET  /                     cold-start
  [web]   GET  /runs                 json list of runs
  [web]   GET  /runs/:id             run page (B chat-thread layout)
  [web]   GET  /runs/:id/report      post-game report (alias)
  [web]   GET  /runs/:id/status      system status (6 axes, hidden during play)
  [web]   GET  /assets/videos/...    static asset route (cycle 13 — opening title video)
  [web]   POST /runs                 start a new run
  [web]   POST /runs/:id/move        submit a move
  [web]   POST /runs/:id/advisor     consult an advisor (corpus-grounded read)
  [web] data:
  [web]   <N> runs across live + seed + legacy sources
  ```
- each request is logged by node's built-in http server if you're
  using a reverse proxy; otherwise, the `console.log` lines on
  crash or `console.error` on uncaught exceptions are your
  primary signal.

## log discipline

- the server logs route shapes, run IDs, and turn numbers. It
  never logs the player's move text (that would be PII).
- the server never logs env-var values (covered in §2).

## log rotation

pm2 ships with `pm2-logrotate` which can be installed and
configured per-user:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
```

this caps each log file at 10 MB and keeps 14 days of history.

If you're using tmux/screen/nohup, log rotation is your
responsibility. The simplest approach is a daily cron job that
renames `web.out.log` to `web.out.log.YYYY-MM-DD` and signals
the server to reopen it. The server doesn't currently reopen
log files on signal — for v1, the simplest discipline is to
`pm2 reload` after rotating (which restarts the process and
reopens the file).

## heartbeat (optional)

the discord-bot deployment has a webhook for boot/stale/crashed
events. The web surface does not. If you want a heartbeat, use
a `cron` job that hits `GET /` and alerts on non-200:

```bash
# add to `crontab -e`
*/5 * * * * curl -fsS http://127.0.0.1:3000/ > /dev/null || echo "[polycrisis] heartbeat failed $(date)" | mail -s "polycrisis down" you@example.com
```

this is opt-in. The web surface is not in the critical path for
any production system, so a missed heartbeat is not urgent.

## what's NOT in §5

- structured logging to a remote service (papertrail, loki,
  etc.) — out of scope for v1. The logs are plain text on disk;
  pipe them through whatever you want at the supervisor level.

---

# §6. firewall + port

## the loopback default

the server's default `HOST` is `127.0.0.1` — loopback only.
This means *only processes on the same box can reach it*.
Useful for a smoke test (`curl http://127.0.0.1:3000/` from
an SSH session), not useful for opening the page in a browser
on your laptop.

## exposing externally — three options

### option 1 — bind to `0.0.0.0` (simplest)

set `HOST=0.0.0.0` in `.env`. The server now accepts
connections on all interfaces. The browser on your laptop
hits `http://<vps-public-ip>:3000/`.

```dotenv
HOST=0.0.0.0
PORT=3000
```

**security caveat:** the v1 surface ships without auth. With
`HOST=0.0.0.0`, anyone who knows the IP can read or start
runs. If your VPS has a public IP and is reachable from the
internet, that's a real exposure. Mitigations:

- restrict the port with a firewall (`ufw allow from <your-ip>
  to any port 3000`, or the equivalent with iptables / nftables).
- rely on your VPS provider's firewall (most providers give you
  a control panel to scope inbound traffic per port).
- put the server behind a reverse proxy that adds HTTP basic
  auth (out of scope here; see your reverse proxy's docs).

### option 2 — SSH tunnel (no public exposure)

keep `HOST=127.0.0.1` on the server. From your laptop:

```bash
ssh -L 3000:127.0.0.1:3000 $USER@<vps-public-ip>
```

open `http://127.0.0.1:3000/` in your local browser; the SSH
tunnel forwards the request to the server's loopback. No
firewall changes, no public exposure. Works through any SSH
client. Recommended for personal play.

### option 3 — VPN / Tailscale

install Tailscale (or wireguard) on the VPS, join your laptop
to the same tailnet, and bind the server to the tailnet IP.
Same security posture as option 2 (no public exposure), but
the connection is persistent across laptop sessions, not
per-SSH-connection.

## recommended posture

- for a quick smoke test from your laptop: option 2 (SSH
  tunnel). No `.env` changes needed.
- for a sustained personal VPS: option 1 with a tight firewall
  rule that scopes inbound to your home/office IP range. Set
  `HOST=0.0.0.0` in `.env`, add a `ufw` or `iptables` rule.
- for "I want to share this with one other person": option 1
  with a `ufw allow from <their-ip>`, or option 3 (Tailscale)
  with their device on the tailnet.

## what's NOT in §6

- TLS termination — see your reverse proxy's docs if you want
  HTTPS. The v1 surface speaks plain HTTP.
- rate limiting / DDoS protection — out of scope. The surface
  is small and not in any production-critical path.

---

# §7. upgrade + rollback

## behavior shipped

- `git pull` brings new commits onto your install dir.
- `npm ci` (or `npm install`) refreshes `node_modules/`.
- `pm2 reload` restarts the process with the new code, with a
  brief pause for graceful shutdown.

## upgrade steps

```bash
cd $HOME/polycrisis-of-authority

# 1. see what's coming
git fetch origin
git log --oneline HEAD..origin/main

# 2. apply
git pull

# 3. refresh deps (cheap; only writes if package-lock.json changed)
npm ci --omit=dev

# 4. reload
pm2 reload polycrisis-web

# 5. verify
pm2 logs polycrisis-web --lines 50 --nostream
curl -fsS http://127.0.0.1:3000/ | head -c 200
```

## rollback

the install dir is a git checkout, so every commit you have
ever pulled is still in `.git/`. Rollback:

```bash
cd $HOME/polycrisis-of-authority
git log --oneline -10              # find the prior good commit
git checkout <prior-commit-sha>    # move HEAD back
npm ci --omit=dev                  # refresh deps
pm2 reload polycrisis-web
```

or to roll forward to a specific tag:

```bash
git checkout v0.2.0
```

session files in `data/runs/` are *not* touched by an upgrade
or rollback. They persist across deploys.

## breaking changes

the project follows `docs/04-roadmap.md` for phase plans and
`wiki/log.md` for cycle-by-cycle changes. Check those before
upgrading if you care about specific feature stability. In
practice, the v1 surface has been additive-only since cycle 12b
shipped — no upgrade has required schema migration or
config-file changes.

## constraints

- never edit `.env` during an upgrade — your edits will survive
  `git pull` because `.env` is gitignored.
- never edit files inside `data/seed-runs/` — those are
  committed and `git pull` would overwrite your changes.
- if `package.json` changes (a new dep), `npm ci` is required;
  `pm2 reload` alone would crash with `Cannot find module`.

---

# §8. live-run confirmation

After §1-§7 are done, this is the acceptance step. Open a
browser and walk through one full run end-to-end.

```bash
# 1. confirm the server is up
pm2 list                          # expect polycrisis-web with status "online"
curl -fsS http://127.0.0.1:3000/  # expect the cold-start HTML

# 2. in your browser, open the cold-start
#    http://<your-vps>:3000/    (or http://127.0.0.1:3000/ if you're on the box)
#    you should see:
#    - the opening title video at the top (if you generated it; otherwise
#      the video element is there but the file 404s — surface still works)
#    - the "Polycrisis of Authority" h1
#    - the v1 surface frame paragraph
#    - a "Runs" list with the 2 seed runs

# 3. start a run
#    click "Start a run" (or POST /runs via curl)
#    the response is a page with the first crisis + decision dock

# 4. submit a move
#    write 2-3 sentences in the textarea
#    end with a blank line
#    click Submit
#    the response is the next turn

# 5. consult an advisor
#    click one of the 5 advisor buttons below the textarea
#    the read area populates with a corpus-grounded response
#    re-click returns the cached read with "(cached)" tag

# 6. continue until the run collapses or stabilizes
#    on collapse, the URL stays the same but the page shows end-of-run
#    prose + the post-game artifact

# 7. verify persistence
#    open a new browser window (or private tab)
#    navigate to the same run URL
#    the run's turns are loaded from data/runs/<id>.json — same content

# 8. check the logs
pm2 logs polycrisis-web --lines 100 --nostream
#    expect boot messages, route registrations, no errors
```

if all 8 steps pass, the deployment is done. the surface is
live, persisting, and reachable.

---

# appendix: full first-run checklist

```bash
# 1. install node (skip if you have v20+ already)
sudo apt-get update && sudo apt-get install -y nodejs npm

# 2. clone
cd $HOME
git clone https://github.com/metaviews/polycrisis-of-authority.git
cd polycrisis-of-authority

# 3. install deps
npm install --omit=dev

# 4. .env
install -m 0600 .env.example .env
$EDITOR .env       # fill in OPENROUTER_API_KEY at minimum

# 5. install pm2
npm install -g pm2
export PATH="$HOME/.npm-global/bin:$PATH"

# 7. write ecosystem.config.js (copy + edit the example)

# 8. start
pm2 start ecosystem.config.js
pm2 save

# 9. confirm
pm2 list
curl -fsS http://127.0.0.1:3000/

# 10. expose the port (option 1: bind to 0.0.0.0)
#    - add HOST=0.0.0.0 to .env
#    - pm2 reload polycrisis-web
#    - configure firewall (ufw / VPS provider panel)

# 11. open in browser, walk through §8

# 12. (optional) enable boot-time recovery
pm2 startup systemd-user    # follow the printed command
systemctl --user enable pm2-$USER.service
systemctl --user start pm2-$USER
sudo loginctl enable-linger $USER
```

---

# sources

- `docs/04-roadmap.md` — the project's roadmap and cycle history
- `docs/16-deployment.md` — the discord-bot deployment guide (this
  doc's companion; uses pm2 + sqlite + a richer env-var shape)
- `src/web/server.js` — the web server (node's built-in
  `http.createServer`, 9 routes, no framework)
- `src/web/surface.js` — the web surface adapter (mirrors
  `src/bot/surface.js`)
- `src/web/README.md` — the web surface's per-cycle changelog
- `package.json` — node deps (`discord.js`, `dotenv`, `js-yaml`;
  none of which the web surface uses, but installing them keeps
  the install shape consistent with the bot)
- `wiki/log.md` — the institutional memory of what was built,
  cycle by cycle
