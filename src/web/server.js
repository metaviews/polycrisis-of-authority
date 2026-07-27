#!/usr/bin/env node
'use strict';

/**
 * server.js — Polycrisis of Authority · web v0 surface
 *
 * Cycle 12b. Read-only HTTP surface. Serves:
 *   GET /                      cold-start page (lists finished runs)
 *   GET /runs                  JSON list of runs (machine-readable mirror of cold-start)
 *   GET /runs/:id              the run page (B chat-thread layout)
 *   GET /runs/:id/report       alias: same content as /runs/:id when state='ended'
 *
 * v0 contract:
 *   - no auth
 *   - no write paths
 *   - no LLM call
 *   - no database
 *   - reads from data/seed-runs/*.json (committed) and runs/*.json (real,
 *     from the simulation's existing player-quit records)
 *   - serves runs/<id>-artifact.html as the report for runs that have one
 *
 * Engine commitment: this file does not import from src/sim/. It reads
 * JSON-shaped data from the filesystem and hands it to the surface
 * adapter (src/web/surface.js). The engine is unaware of the web
 * surface, and the web surface is unaware of the engine.
 *
 * Run with:  node src/web/server.js
 *            PORT=8080 node src/web/server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const surface = require('./surface');

const ROOT_DIR = path.join(__dirname, '..', '..');
const SEED_RUNS_DIR = path.join(ROOT_DIR, 'data', 'seed-runs');
const REAL_RUNS_DIR = path.join(ROOT_DIR, 'runs');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1';

const COLD_START_SIMULATION = `*Polycrisis of Authority* is a simulation game where you begin already in power and must govern through a constant stream of overlapping crises, responding with policies written in your own words.

You never solve problems; each response reshapes the system, often stabilizing what's visible while quietly weakening what sustains authority. The world speaks back through fragmented, unreliable signals—public mood, elite alignment, narrative coherence—while deeper conditions shift out of sight.

There is no victory, only duration. The game ends when authority collapses, often suddenly, after a long period in which your decisions seemed reasonable, even effective.

**v0 is the read-only surface.** You can browse finished runs and read their reports. Run-start and move submission land in cycles 12c–12d. See \`docs/24-web-architecture.md\` for the full plan.`;

// ---------------------------------------------------------------
// data layer — read seed + real runs from disk
// ---------------------------------------------------------------

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    return null;
  }
}

function listSeedRuns() {
  if (!fs.existsSync(SEED_RUNS_DIR)) return [];
  return fs.readdirSync(SEED_RUNS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => readJsonSafe(path.join(SEED_RUNS_DIR, f)))
    .filter(Boolean);
}

function listRealRuns() {
  if (!fs.existsSync(REAL_RUNS_DIR)) return [];
  // real runs: <id>.json (the simulation writes both .json state and .md log)
  // existing real runs are tiny player-quit records (turns_completed: 0).
  // we accept them but they render as empty pages.
  return fs.readdirSync(REAL_RUNS_DIR)
    .filter(f => f.endsWith('.json') && !f.includes('-artifact'))
    .map(f => readJsonSafe(path.join(REAL_RUNS_DIR, f)))
    .filter(Boolean);
}

function loadAllRuns() {
  // seed runs are surfaced first; real runs append.
  const seeds = listSeedRuns();
  const real = listRealRuns();
  return { seeds, real, all: [...seeds, ...real] };
}

function findRun(runId) {
  // seed runs first (they have the rich content), then real
  const seedPath = path.join(SEED_RUNS_DIR, `${runId}.json`);
  if (fs.existsSync(seedPath)) {
    const data = readJsonSafe(seedPath);
    if (data) return { run: data, source: 'seed' };
  }
  const realPath = path.join(REAL_RUNS_DIR, `${runId}.json`);
  if (fs.existsSync(realPath)) {
    const data = readJsonSafe(realPath);
    if (data) return { run: data, source: 'real' };
  }
  return null;
}

function findArtifactPath(runId) {
  // the simulation writes <id>-artifact.html alongside the run files
  const candidates = [
    path.join(SEED_RUNS_DIR, `${runId}-artifact.html`),
    path.join(REAL_RUNS_DIR, `${runId}-artifact.html`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ---------------------------------------------------------------
// response helpers
// ---------------------------------------------------------------

function send(res, status, body, contentType = 'text/html; charset=utf-8') {
  res.writeHead(status, {
    'content-type': contentType,
    'content-length': Buffer.byteLength(body, 'utf8'),
    'cache-control': 'no-store',
  });
  res.end(body);
}

function sendJson(res, obj) {
  send(res, 200, JSON.stringify(obj, null, 2), 'application/json; charset=utf-8');
}

function send404(res, msg = 'not found') {
  send(res, 404, `<!DOCTYPE html><html><body style="font-family: ui-monospace, monospace; padding: 2rem; color: #6b6862;"><h1>404</h1><p>${msg}</p><p><a href="/">back to cold start</a></p></body></html>`);
}

// ---------------------------------------------------------------
// route handlers
// ---------------------------------------------------------------

function handleColdStart(req, res) {
  const { all } = loadAllRuns();
  const summary = all.map(r => ({
    run_id: r.run_id,
    ended_at: r.ended_at,
    outcome: r.outcome,
    turns_completed: r.turns_completed || 0,
  }));
  const html = surface.renderColdStart({
    runs: summary,
    simulation: COLD_START_SIMULATION,
  });
  send(res, 200, html);
}

function handleRunsList(res) {
  const { all } = loadAllRuns();
  sendJson(res, {
    runs: all.map(r => ({
      run_id: r.run_id,
      started_at: r.started_at,
      ended_at: r.ended_at,
      outcome: r.outcome,
      turns_completed: r.turns_completed || 0,
    })),
  });
}

function handleRunPage(req, res, runId) {
  const found = findRun(runId);
  if (!found) return send404(res, `run ${runId} not found`);

  const { run } = found;
  const isActive = !run.ended_at;

  const turns = Array.isArray(run.turns) ? run.turns : [];
  const corpusQuotes = Array.isArray(run.corpus_quotes) ? run.corpus_quotes : [];

  // for active runs in v0, we still render but with a disabled decision dock.
  // v0 has no LLM call, so "active" runs in seed data should not exist;
  // but if a real run is found without ended_at, we still serve something.
  const html = surface.renderRunPage({
    run,
    turns,
    corpusQuotes,
    isActive,
    endProse: isActive ? null : (run.end_prose || null),
  });
  send(res, 200, html);
}

function handleRunReport(req, res, runId) {
  // v0: /runs/:id/report is an alias for /runs/:id when state='ended'.
  // for active runs, the report doesn't exist yet; serve 404.
  const found = findRun(runId);
  if (!found) return send404(res, `run ${runId} not found`);

  const { run } = found;
  if (!run.ended_at) {
    return send404(res, `run ${runId} is still active; no report yet`);
  }

  // prefer the existing self-contained artifact HTML if it exists
  const artifactPath = findArtifactPath(runId);
  if (artifactPath) {
    const html = surface.renderArtifact({ artifactPath });
    if (html) return send(res, 200, html);
  }

  // fall back: render the run page (state='ended' is the post-game view)
  const turns = Array.isArray(run.turns) ? run.turns : [];
  const corpusQuotes = Array.isArray(run.corpus_quotes) ? run.corpus_quotes : [];
  const html = surface.renderRunPage({
    run,
    turns,
    corpusQuotes,
    isActive: false,
    endProse: run.end_prose || null,
  });
  send(res, 200, html);
}

// ---------------------------------------------------------------
// router — minimal, no dependencies
// ---------------------------------------------------------------

function route(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';
  const method = req.method || 'GET';

  if (method !== 'GET') {
    res.writeHead(405, { 'content-type': 'text/plain' });
    return res.end('405 method not allowed');
  }

  if (pathname === '/' || pathname === '') {
    return handleColdStart(req, res);
  }

  if (pathname === '/runs') {
    return handleRunsList(res);
  }

  // /runs/:id
  const runMatch = pathname.match(/^\/runs\/([a-zA-Z0-9_-]+)\/?$/);
  if (runMatch) {
    return handleRunPage(req, res, runMatch[1]);
  }

  // /runs/:id/report
  const reportMatch = pathname.match(/^\/runs\/([a-zA-Z0-9_-]+)\/report\/?$/);
  if (reportMatch) {
    return handleRunReport(req, res, reportMatch[1]);
  }

  send404(res, `no route for ${pathname}`);
}

// ---------------------------------------------------------------
// server
// ---------------------------------------------------------------

const server = http.createServer((req, res) => {
  try {
    route(req, res);
  } catch (err) {
    console.error('[web] route error:', err);
    send(res, 500, `<!DOCTYPE html><html><body style="font-family: ui-monospace, monospace; padding: 2rem; color: #6b6862;"><h1>500</h1><p>${err.message}</p></body></html>`);
  }
});

server.listen(PORT, HOST, () => {
  const runs = loadAllRuns();
  console.log(`[web] polycrisis v0 surface`);
  console.log(`[web] listening on http://${HOST}:${PORT}`);
  console.log(`[web] routes:`);
  console.log(`[web]   GET /                      cold-start`);
  console.log(`[web]   GET /runs                  json list of runs`);
  console.log(`[web]   GET /runs/:id              run page (B chat-thread layout)`);
  console.log(`[web]   GET /runs/:id/report       post-game report (alias)`);
  console.log(`[web] data:`);
  console.log(`[web]   ${runs.seeds.length} seed runs from data/seed-runs/`);
  console.log(`[web]   ${runs.real.length} real runs from runs/`);
  if (runs.all.length > 0) {
    console.log(`[web] available run ids:`);
    for (const r of runs.all) {
      console.log(`[web]   /runs/${r.run_id}  (${r.turns_completed || 0} turns, ${r.outcome || '?'})`);
    }
  }
});

// graceful shutdown
function shutdown() {
  console.log('[web] shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
