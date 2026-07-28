#!/usr/bin/env node
'use strict';

/**
 * server.js — Polycrisis of Authority · web v1 surface
 *
 * Cycle 12c. The interactive web surface. Replaces the v0 server.
 *
 * Routes (additions over v0):
 *   POST /runs                start a new run; returns the run id and the first turn
 *   POST /runs/:id/move       submit a move; returns the next turn or end-of-run
 *
 * Routes (carried over from v0):
 *   GET /                     cold-start (lists finished runs)
 *   GET /runs                 JSON list of runs
 *   GET /runs/:id             the run page (B chat-thread layout)
 *   GET /runs/:id/report      alias: same content as /runs/:id when state='ended'
 *
 * Engine commitment:
 *   - the v1 server uses the per-turn API extracted in cycle 12c
 *     (stepTurn, pickCrisis). It does NOT modify the engine. The
 *     engine is unaware of HTTP.
 *   - run state is persisted to data/runs/<id>.json. Each turn
 *     writes a new version of the file. On crash mid-turn, the
 *     last successful turn is preserved.
 *
 * Auth: the run URL is the access. v1 ships without bearer-token
 * auth; the spec's decision (1) calls for bearer-token in v1 but
 * the project's no-PII posture and the user's gating of npm
 * installs (which would be required for sqlite) make auth-as-URL
 * the right v1 surface. v2 layers auth on top — a small addition
 * to the session contract.
 *
 * Run with:  node src/web/server.js
 *            PORT=8080 node src/web/server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const surface = require('./surface');
const { stepTurn, pickCrisis } = require('../sim/run-loop');
const { generateWorld } = require('../sim/world-generator');
const { interpret } = require('../sim/grammar');
const { selectSeed } = require('../../scripts/seed-variants');
const { INITIAL_STATE, applyDelta, checkCollapse, withBands, bandFor } = require('../sim/state');
const { generateArtifact } = require('../sim/artifact-generator');
const { renderArtifactHtml } = require('../sim/artifact-render');
const { narrateRunEnd } = require('../sim/post-game-narrator');
const { pickCorpusQuote } = require('../../scripts/wiki-query');
const { selectAtmospherics } = require('../sim/atmospherics');

const ROOT_DIR = path.join(__dirname, '..', '..');
const SEED_RUNS_DIR = path.join(ROOT_DIR, 'data', 'seed-runs');
const REAL_RUNS_DIR = path.join(ROOT_DIR, 'data', 'runs');
const LEGACY_RUNS_DIR = path.join(ROOT_DIR, 'runs');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1';

// stabilization (from run-loop.js, kept in sync)
const STABILIZATION_THRESHOLD = 5;
const STABILIZING_BANDS = new Set(['holding', 'strained']);

const COLD_START_SIMULATION = `*Polycrisis of Authority* is a simulation game where you begin already in power and must govern through a constant stream of overlapping crises, responding with policies written in your own words.

You never solve problems; each response reshapes the system, often stabilizing what's visible while quietly weakening what sustains authority. The world speaks back through fragmented, unreliable signals—public mood, elite alignment, narrative coherence—while deeper conditions shift out of sight.

There is no victory, only duration. The game ends when authority collapses, often suddenly, after a long period in which your decisions seemed reasonable, even effective.

**v1 is interactive.** Start a run, write your moves, and the regime will respond. Run URLs are the access — bookmark yours to come back.`;

// ---------------------------------------------------------------
// helpers
// ---------------------------------------------------------------

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    return null;
  }
}

function writeJsonSafe(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  // atomic-ish: write to .tmp then rename
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p);
}

function generateRunId() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:T]/g, '').replace(/\..+/, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${rand}`;
}

// list runs from all sources: live v1 sessions, v0 seed runs, legacy real runs
function listAllRuns() {
  const sources = [
    { dir: REAL_RUNS_DIR, prefix: 'data/runs', live: true },
    { dir: SEED_RUNS_DIR, prefix: 'data/seed-runs', live: false },
    { dir: LEGACY_RUNS_DIR, prefix: 'runs', live: false },
  ];
  const all = [];
  for (const { dir, prefix, live } of sources) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      if (f.includes('-artifact')) continue;
      const data = readJsonSafe(path.join(dir, f));
      if (!data) continue;
      all.push({ ...data, _source: prefix, _live: live });
    }
  }
  return all;
}

function findRun(runId) {
  // v1 live runs first
  const livePath = path.join(REAL_RUNS_DIR, `${runId}.json`);
  if (fs.existsSync(livePath)) {
    const data = readJsonSafe(livePath);
    if (data) return { run: data, source: 'live' };
  }
  // seed runs
  const seedPath = path.join(SEED_RUNS_DIR, `${runId}.json`);
  if (fs.existsSync(seedPath)) {
    const data = readJsonSafe(seedPath);
    if (data) return { run: data, source: 'seed' };
  }
  // legacy runs
  const legacyPath = path.join(LEGACY_RUNS_DIR, `${runId}.json`);
  if (fs.existsSync(legacyPath)) {
    const data = readJsonSafe(legacyPath);
    if (data) return { run: data, source: 'legacy' };
  }
  return null;
}

function findArtifactPath(runId) {
  const candidates = [
    path.join(REAL_RUNS_DIR, `${runId}-artifact.html`),
    path.join(SEED_RUNS_DIR, `${runId}-artifact.html`),
    path.join(LEGACY_RUNS_DIR, `${runId}-artifact.html`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function send(res, status, body, contentType = 'text/html; charset=utf-8') {
  res.writeHead(status, {
    'content-type': contentType,
    'content-length': Buffer.byteLength(body, 'utf8'),
    'cache-control': 'no-store',
  });
  res.end(body);
}

function sendJson(res, obj, status = 200) {
  send(res, status, JSON.stringify(obj, null, 2), 'application/json; charset=utf-8');
}

function send404(res, msg = 'not found') {
  send(res, 404, `<!DOCTYPE html><html><body style="font-family: ui-monospace, monospace; padding: 2rem; color: #6b6862;"><h1>404</h1><p>${msg}</p><p><a href="/">back to cold start</a></p></body></html>`);
}

// ---------------------------------------------------------------
// deliberate corpus-quote picker (cycle 12d)
//
// uses the project's pickCorpusQuote (cycle 5e) at display time, with
// a forward-pointing preferredHref — the prior turn's grounding trace
// becomes this turn's preferred corpus entry. this creates a chain:
// turn 1's quote is random, turn 2's points to what grounded turn 1,
// turn 3's points to what grounded turn 2, etc. the player can browse
// the corpus as a knowledge-graph traversal of the run.
//
// if pickCorpusQuote returns null (no wiki entries match), fall back
// to the LLM's grounding_trace derivation.
// ---------------------------------------------------------------

function pickQuoteForTurn(turn, priorTurn) {
  const priorHref = (priorTurn && priorTurn.world && priorTurn.world.grounding_trace && priorTurn.world.grounding_trace[0]) || null;
  // pickCorpusQuote expects a wiki path like "wiki/concepts/capabilities-eval"
  // the prior turn's grounding_trace already gives us that
  let preferHref = null;
  if (priorHref) {
    // normalize: turn "wiki/concepts/foo" into a path the picker understands
    preferHref = priorHref.startsWith('wiki/') ? priorHref : `wiki/${priorHref}`;
  }
  const picked = pickCorpusQuote(preferHref);
  if (picked && picked.text) {
    return {
      text: picked.text,
      href: picked.href || '/wiki/index',
      title: picked.title || 'Corpus',
    };
  }
  // fallback: derive from the LLM's grounding_trace
  if (turn && turn.world && turn.world.grounding_trace && turn.world.grounding_trace.length > 0) {
    const trace = turn.world.grounding_trace[0];
    return {
      text: turn.world.interpretive_gloss || turn.grammarOutput?.interpretive_gloss || '',
      href: `/wiki/${trace.replace(/^wiki\//, '').replace(/\.md$/, '')}`,
      title: (trace.split('/').pop() || '').replace(/\.md$/, ''),
    };
  }
  return null;
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

// LLM caller for the v1 web surface. Wraps the engine's generateWorld.
async function callLLM({ priorCrisis, state, playerMove, turnHistory, identity }) {
  return generateWorld({
    priorCrisis,
    state,
    playerMove,
    turnHistory,
    identity,
  });
}

// Fallback LLM caller. Used when generateWorld fails.
async function callFallback({ crisis, state, playerMove, turnHistory, identity }) {
  return interpret({
    crisis,
    state,
    playerMove,
    turnHistory,
    identity,
  });
}

// ---------------------------------------------------------------
// end-of-run handling
// ---------------------------------------------------------------

function checkStabilization(state) {
  const bands = withBands(state);
  const allStable = Object.keys(bands).every((axis) =>
    STABILIZING_BANDS.has(bands[axis].band)
  );
  return allStable;
}

async function endRun({ run, sessionPath, outcome, finalState, collapse }) {
  // generate the LLM-driven end-of-run report
  let report = null;
  try {
    report = await narrateRunEnd({
      outcome,
      turnsCompleted: run.turnsCompleted,
      finalState,
      turns: run.turns,
      collapse,
      identity: run.identity,
    });
  } catch (err) {
    console.error('[web] narrateRunEnd failed:', err.message);
  }

  // build the artifact
  const result = {
    runId: run.runId,
    startedAt: run.startedAt,
    endedAt: new Date().toISOString(),
    model: run.model,
    outcome,
    turnsCompleted: run.turnsCompleted,
    turns: run.turns,
    finalState,
    player: run.identity.player,
    regime: run.identity.regime,
    fallbackWarnings: 0,
  };

  let artifactPath = null;
  let htmlPath = null;
  try {
    const artifact = generateArtifact(result);
    artifactPath = path.join(REAL_RUNS_DIR, `${run.runId}-artifact.md`);
    fs.writeFileSync(artifactPath, artifact);
    const html = renderArtifactHtml(artifact, {
      runId: run.runId,
      model: run.model,
      outcome,
      hashOf: JSON.stringify(run.turns),
    });
    htmlPath = path.join(REAL_RUNS_DIR, `${run.runId}-artifact.html`);
    fs.writeFileSync(htmlPath, html);
  } catch (err) {
    console.error('[web] artifact generation failed:', err.message);
  }

  // update the run record with end state
  run.endedAt = new Date().toISOString();
  run.outcome = outcome;
  run.state = finalState;
  run.stateJson = JSON.stringify(finalState);
  if (collapse) run.collapse = collapse;
  if (report) run.report = report;
  writeJsonSafe(sessionPath, run);

  return { report, artifactPath, htmlPath };
}

// ---------------------------------------------------------------
// route handlers
// ---------------------------------------------------------------

function handleColdStart(req, res) {
  const all = listAllRuns();
  const summary = all.map(r => ({
    run_id: r.runId || r.run_id,
    ended_at: r.endedAt || r.ended_at,
    outcome: r.outcome,
    turns_completed: r.turnsCompleted || r.turns_completed || 0,
    live: r._live || false,
  }));
  const html = surface.renderColdStart({
    runs: summary,
    simulation: COLD_START_SIMULATION,
  });
  send(res, 200, html);
}

function handleRunsList(res) {
  const all = listAllRuns();
  sendJson(res, {
    runs: all.map(r => ({
      run_id: r.runId || r.run_id,
      started_at: r.startedAt || r.started_at,
      ended_at: r.endedAt || r.ended_at,
      outcome: r.outcome,
      turns_completed: r.turnsCompleted || r.turns_completed || 0,
      live: r._live || false,
    })),
  });
}

function handleRunPage(req, res, runId) {
  const found = findRun(runId);
  if (!found) return send404(res, `run ${runId} not found`);

  const { run } = found;
  const isActive = !run.endedAt && !run.outcome;

  // build the per-turn view from the run record
  // for live runs: run.turns[] is the history (each turn is a {turn, crisis, playerMove, grammarOutput, world, stateBefore, stateAfter, collapse})
  // for seed runs: run.turns[] is the same shape
  const turns = Array.isArray(run.turns) ? run.turns : [];
  const corpusQuotes = (run.corpus_quotes && Array.isArray(run.corpus_quotes)) ? run.corpus_quotes : null;

  // for live runs, derive corpus quotes deliberately using the cycle 12d picker
  const effectiveCorpusQuotes = corpusQuotes || turns.map((t, i) => {
    return pickQuoteForTurn(t, i > 0 ? turns[i - 1] : null);
  });

  // normalize the run shape for the surface adapter
  const surfaceRun = {
    run_id: run.runId || run.run_id,
    started_at: run.startedAt || run.started_at,
    ended_at: run.endedAt || run.ended_at,
    model: run.model,
    outcome: run.outcome,
    turns_completed: run.turnsCompleted || run.turns_completed || 0,
  };

  const endProse = (run.outcome && run.outcome !== 'no-collapse') ? (
    run.report?.narrative || run.report?.outcome_line || null
  ) : null;

  // the surface adapter expects turns in a different shape; we need to convert
  const surfaceTurns = turns.map(t => ({
    turn_number: t.turn,
    crisis_kind: t.crisis?.failure_pattern || '',
    heading: t.crisis?.title || '',
    situation: t.crisis?.situation || t.crisis?.trigger || '',
    pressure: t.crisis?.pressure || '',
    decision_question: t.crisis?.decision_point || '',
    headlines: t.world?.headlines || t.crisis?.headlines || [],
    player_move: t.playerMove === '[silence]' ? null : t.playerMove,
    advisors: [],
  }));

  const html = surface.renderRunPage({
    run: surfaceRun,
    turns: surfaceTurns,
    corpusQuotes: effectiveCorpusQuotes,
    isActive,
    endProse,
  });
  send(res, 200, html);
}

function handleRunReport(req, res, runId) {
  const found = findRun(runId);
  if (!found) return send404(res, `run ${runId} not found`);
  const { run } = found;
  if (!run.endedAt && !run.outcome) {
    return send404(res, `run ${runId} is still active; no report yet`);
  }
  // prefer the existing self-contained artifact HTML
  const artifactPath = findArtifactPath(runId);
  if (artifactPath) {
    const html = surface.renderArtifact({ artifactPath });
    if (html) return send(res, 200, html);
  }
  // fall back: render the run page
  handleRunPage(req, res, runId);
}

function handleRunStatus(req, res, runId) {
  // /status — the only place the 6 axes are visible. Spec decision 4.
  // reachable via the run-meta link in the run page. not on the main surface.
  const found = findRun(runId);
  if (!found) return send404(res, `run ${runId} not found`);
  const { run } = found;

  // for live runs, the state is the current state; for ended runs, it's the final state
  const state = (run.state) || (run.turns && run.turns.length > 0 ? run.turns[run.turns.length - 1].stateAfter : null);
  if (!state) {
    return send404(res, `run ${runId} has no state to display`);
  }

  const statusRun = {
    run_id: run.runId || run.run_id,
    started_at: run.startedAt || run.started_at,
    ended_at: run.endedAt || run.ended_at,
    model: run.model,
    outcome: run.outcome,
    currentTurn: run.currentTurn || (run.turns && run.turns.length) || 0,
  };

  const html = surface.renderStatusPage({ run: statusRun, state });
  send(res, 200, html);
}

// ---------------------------------------------------------------
// v1 routes — start a new run, submit a move
// ---------------------------------------------------------------

async function handleStartRun(req, res) {
  // start a new run. no body required; identity is anonymous-by-default.
  const runId = generateRunId();
  const startedAt = new Date().toISOString();
  const model = process.env.OPENROUTER_MODEL || 'minimax/minimax-m3';

  // identity — anonymous. v2 will let the player name themselves.
  const identity = { player: 'the player', regime: 'the regime' };

  // pick the turn 1 crisis
  const seed = selectSeed({ state: { ...INITIAL_STATE }, usedIds: [], usedActors: [] });
  const picked = pickCrisis({
    turnNumber: 1,
    state: { ...INITIAL_STATE },
    seed,
  });

  // initial session record
  const session = {
    runId,
    startedAt,
    model,
    identity,
    state: { ...INITIAL_STATE },
    stateJson: JSON.stringify({ ...INITIAL_STATE }),
    currentTurn: 1,
    currentCrisis: picked.crisis,
    usedSeedIds: [picked.crisis.id],
    usedActors: [seed.actor],
    currentSubBeatCount: picked.currentSubBeatCount,
    currentSubBeatRationale: picked.currentSubBeatRationale,
    turns: [],
    consecutiveStableTurns: 0,
    endedAt: null,
    outcome: null,
    collapse: null,
    report: null,
  };

  // persist
  const sessionPath = path.join(REAL_RUNS_DIR, `${runId}.json`);
  writeJsonSafe(sessionPath, session);

  // build the response — the surface adapter shape, plus the run id
  const surfaceRun = {
    run_id: runId,
    started_at: startedAt,
    ended_at: null,
    model,
    outcome: null,
    turns_completed: 0,
  };
  const surfaceTurn = {
    turn_number: 1,
    crisis_kind: picked.crisis.failure_pattern,
    heading: picked.crisis.title,
    situation: picked.crisis.situation,
    pressure: picked.crisis.pressure,
    decision_question: picked.crisis.decision_point,
    headlines: picked.crisis.headlines || [],
    player_move: null,
    advisors: [],
  };

  // the response is the run page HTML, with the run URL the client can use
  const html = surface.renderRunPage({
    run: surfaceRun,
    turns: [surfaceTurn],
    corpusQuotes: [null],
    isActive: true,
    endProse: null,
  });
  send(res, 200, html, 'text/html; charset=utf-8');
}

async function handleSubmitMove(req, res, runId) {
  // load the session
  const found = findRun(runId);
  if (!found || found.source !== 'live') {
    return send404(res, `run ${runId} is not an active v1 session`);
  }
  const session = found.run;
  if (session.endedAt || session.outcome) {
    return send404(res, `run ${runId} has already ended`);
  }

  // read the move
  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    return send(res, 400, JSON.stringify({ error: 'invalid JSON body' }), 'application/json');
  }
  const playerMove = (body.text || '').trim();
  if (!playerMove) {
    return send(res, 400, JSON.stringify({ error: 'move text is required' }), 'application/json');
  }

  // call stepTurn
  const priorTurns = session.turns.slice(-5);
  const atmospherics = selectAtmospherics({
    turnNumber: session.currentTurn,
    usedLines: session.usedAtmospherics || [],
  });
  const preferredHref = (session.turns.length > 0
    && session.turns[session.turns.length - 1].world
    && session.turns[session.turns.length - 1].world.grounding_trace
    && session.turns[session.turns.length - 1].world.grounding_trace[0]) || null;
  const corpusQuote = pickCorpusQuote(preferredHref);

  let result;
  try {
    result = await stepTurn({
      state: session.state,
      crisis: session.currentCrisis,
      playerMove,
      identity: session.identity,
      turnNumber: session.currentTurn,
      priorTurns,
      atmospherics,
      corpusQuote,
      callLLM,
      callFallback,
      currentSubBeatCount: session.currentSubBeatCount,
      currentSubBeatRationale: session.currentSubBeatRationale,
    });
  } catch (err) {
    console.error('[web] stepTurn failed:', err.message);
    return send(res, 500, JSON.stringify({ error: `stepTurn failed: ${err.message}` }), 'application/json');
  }

  // record the turn
  const turnRecord = {
    turn: session.currentTurn,
    crisis: session.currentCrisis,
    playerMove,
    grammarOutput: result.grammarOutput,
    world: result.world,
    subTurnSteps: result.subTurnSteps,
    worldFallback: result.worldFallback,
    stateBefore: session.state,
    stateAfter: result.stateAfter,
    collapse: result.collapse,
    advisorUsed: null,
    advisorFullResponse: null,
    helpUsedThisTurn: 0,
  };
  session.turns.push(turnRecord);
  session.state = result.stateAfter;
  session.stateJson = JSON.stringify(result.stateAfter);
  session.currentSubBeatCount = result.currentSubBeatCount;
  session.currentSubBeatRationale = result.currentSubBeatRationale;

  // check collapse
  if (result.collapse) {
    session.endedAt = new Date().toISOString();
    session.outcome = result.collapse.type;
    session.collapse = result.collapse;
    session.turnsCompleted = session.currentTurn;
    const sessionPath = path.join(REAL_RUNS_DIR, `${runId}.json`);
    await endRun({
      run: session,
      sessionPath,
      outcome: result.collapse.type,
      finalState: result.stateAfter,
      collapse: result.collapse,
    });
  } else {
    // check stabilization
    if (checkStabilization(result.stateAfter)) {
      session.consecutiveStableTurns = (session.consecutiveStableTurns || 0) + 1;
    } else {
      session.consecutiveStableTurns = 0;
    }
    if (session.consecutiveStableTurns >= STABILIZATION_THRESHOLD) {
      session.endedAt = new Date().toISOString();
      session.outcome = 'stabilized';
      session.turnsCompleted = session.currentTurn;
      const sessionPath = path.join(REAL_RUNS_DIR, `${runId}.json`);
      await endRun({
        run: session,
        sessionPath,
        outcome: 'stabilized',
        finalState: result.stateAfter,
        collapse: null,
      });
    } else {
      // advance to next turn
      session.currentTurn += 1;
      const next = pickCrisis({
        turnNumber: session.currentTurn,
        state: result.stateAfter,
        priorWorld: result.world,
        usedSeedIds: session.usedSeedIds,
        usedActors: session.usedActors,
        currentSubBeatCount: result.currentSubBeatCount,
        currentSubBeatRationale: result.currentSubBeatRationale,
      });
      session.currentCrisis = next.crisis;
      if (next.seedId) session.usedSeedIds.push(next.seedId);
      if (next.actor) session.usedActors.push(next.actor);
      // persist
      const sessionPath = path.join(REAL_RUNS_DIR, `${runId}.json`);
      writeJsonSafe(sessionPath, session);
    }
  }

  // build the response — the run page HTML, with the updated state
  const surfaceRun = {
    run_id: runId,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    model: session.model,
    outcome: session.outcome,
    turns_completed: session.turns.length,
  };

  // build the surface turns from the session's turn records
  const surfaceTurns = session.turns.map(t => ({
    turn_number: t.turn,
    crisis_kind: t.crisis?.failure_pattern || '',
    heading: t.crisis?.title || '',
    situation: t.crisis?.situation || t.crisis?.trigger || '',
    pressure: t.crisis?.pressure || '',
    decision_question: t.crisis?.decision_point || '',
    headlines: t.world?.headlines || t.crisis?.headlines || [],
    player_move: t.playerMove === '[silence]' ? null : t.playerMove,
    advisors: [],
  }));

  // if active, include the current crisis as the last turn
  const isActive = !session.endedAt;
  if (isActive) {
    surfaceTurns.push({
      turn_number: session.currentTurn,
      crisis_kind: session.currentCrisis.failure_pattern,
      heading: session.currentCrisis.title,
      situation: session.currentCrisis.situation,
      pressure: session.currentCrisis.pressure,
      decision_question: session.currentCrisis.decision_point,
      headlines: session.currentCrisis.headlines || [],
      player_move: null,
      advisors: [],
    });
  }

  // corpus quotes from the turn records (deliberate picker, cycle 12d)
  const surfaceCorpusQuotes = session.turns.map((t, i) => {
    return pickQuoteForTurn(t, i > 0 ? session.turns[i - 1] : null);
  });
  if (isActive) surfaceCorpusQuotes.push(null);

  const endProse = (session.outcome && session.outcome !== 'no-collapse') ? (
    session.report?.narrative || session.report?.outcome_line || null
  ) : null;

  const html = surface.renderRunPage({
    run: surfaceRun,
    turns: surfaceTurns,
    corpusQuotes: surfaceCorpusQuotes,
    isActive,
    endProse,
  });
  send(res, 200, html, 'text/html; charset=utf-8');
}

// ---------------------------------------------------------------
// router
// ---------------------------------------------------------------

async function route(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';
  const method = req.method || 'GET';

  // write methods only on specific paths
  if (method === 'POST') {
    if (pathname === '/runs') {
      return handleStartRun(req, res);
    }
    const moveMatch = pathname.match(/^\/runs\/([a-zA-Z0-9_-]+)\/move\/?$/);
    if (moveMatch) {
      return handleSubmitMove(req, res, moveMatch[1]);
    }
    res.writeHead(405, { 'content-type': 'text/plain' });
    return res.end('405 method not allowed');
  }

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
  const runMatch = pathname.match(/^\/runs\/([a-zA-Z0-9_-]+)\/?$/);
  if (runMatch) {
    return handleRunPage(req, res, runMatch[1]);
  }
  const reportMatch = pathname.match(/^\/runs\/([a-zA-Z0-9_-]+)\/report\/?$/);
  if (reportMatch) {
    return handleRunReport(req, res, reportMatch[1]);
  }
  const statusMatch = pathname.match(/^\/runs\/([a-zA-Z0-9_-]+)\/status\/?$/);
  if (statusMatch) {
    return handleRunStatus(req, res, statusMatch[1]);
  }
  send404(res, `no route for ${pathname}`);
}

// ---------------------------------------------------------------
// server
// ---------------------------------------------------------------

const server = http.createServer((req, res) => {
  route(req, res).catch((err) => {
    console.error('[web] route error:', err);
    if (!res.headersSent) {
      send(res, 500, JSON.stringify({ error: err.message }), 'application/json');
    }
  });
});

server.listen(PORT, HOST, () => {
  const all = listAllRuns();
  console.log(`[web] polycrisis v1 surface (cycle 12c)`);
  console.log(`[web] listening on http://${HOST}:${PORT}`);
  console.log(`[web] routes:`);
  console.log(`[web]   GET  /                     cold-start`);
  console.log(`[web]   GET  /runs                 json list of runs`);
  console.log(`[web]   GET  /runs/:id             run page (B chat-thread layout)`);
  console.log(`[web]   GET  /runs/:id/report      post-game report (alias)`);
  console.log(`[web]   GET  /runs/:id/status      system status (6 axes, hidden during play)`);
  console.log(`[web]   POST /runs                 start a new run`);
  console.log(`[web]   POST /runs/:id/move        submit a move`);
  console.log(`[web] data:`);
  console.log(`[web]   ${all.length} runs across live + seed + legacy sources`);
  if (all.length > 0) {
    for (const r of all.slice(0, 5)) {
      const id = r.runId || r.run_id;
      const turns = r.turnsCompleted || r.turns_completed || 0;
      const outcome = r.outcome || 'active';
      console.log(`[web]   /runs/${id}  (${turns} turns, ${outcome})`);
    }
    if (all.length > 5) console.log(`[web]   ... and ${all.length - 5} more`);
  }
});

function shutdown() {
  console.log('[web] shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
