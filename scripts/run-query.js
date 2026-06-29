'use strict';

/**
 * run-query.js
 *
 * Cycle 4b. Queryable interface over runs/*.md (the run logs the
 * simulation writes after each session).
 *
 * Per the roadmap's Phase 4 ship criterion: "Run logs are persisted for
 * every session and are queryable."
 *
 * Usage:
 *   node scripts/run-query.js list                 # list all runs (one-line summary each)
 *   node scripts/run-query.js list --outcome legitimacy-collapse
 *   node scripts/run-query.js list --model "minimax/minimax-m3" --since 2026-06-01
 *   node scripts/run-query.js summary              # aggregate stats
 *   node scripts/run-query.js show <runId>         # full details of one run
 *   node scripts/run-query.js pattern              # pattern analysis across runs
 *   node scripts/run-query.js diff <id1> <id2>     # before/after comparison
 *
 * Filter flags (work with `list`):
 *   --outcome X      Filter by outcome (legitimacy-collapse, technical-collapse, narrative-capture-collapse, no-collapse, player-quit)
 *   --model X        Filter by model identifier (substring match)
 *   --since YYYY-MM-DD
 *   --until YYYY-MM-DD
 *   --min-turns N    Filter by minimum turns completed
 *
 * The runs/ directory is gitignored per .gitignore; run logs are
 * operational records, not catalog entries. This script reads them
 * directly from disk; no caching layer in MVP-0.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RUNS_DIR = path.join(ROOT, 'runs');

// ---------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    cmd: null,
    file: null,
    files: [],
    outcome: null,
    model: null,
    since: null,
    until: null,
    minTurns: null,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === 'list' || a === 'summary' || a === 'show' || a === 'pattern' || a === 'diff') {
      args.cmd = a;
    } else if (a === 'help' || a === '--help' || a === '-h') {
      args.help = true;
    } else if (a === '--outcome') args.outcome = argv[++i];
    else if (a === '--model') args.model = argv[++i];
    else if (a === '--since') args.since = argv[++i];
    else if (a === '--until') args.until = argv[++i];
    else if (a === '--min-turns') args.minTurns = parseInt(argv[++i], 10);
    else if (!a.startsWith('--')) {
      if (args.cmd === 'show' && !args.file) args.file = a;
      else if (args.cmd === 'diff') args.files.push(a);
    }
  }
  return args;
}

// ---------------------------------------------------------------
// Run log parsing
// ---------------------------------------------------------------

/**
 * Parse a single run log. The actual emitted format (per src/sim/interactive.js
 * and src/sim/run-async.js) is markdown with YAML frontmatter. The parser
 * is permissive: it pulls out what it can, leaves the rest as raw text.
 *
 * Returns: {
 *   runId, startedAt, endedAt, model, outcome, turnsCompleted,
 *   turns: [{ turn, crisisTitle, failurePattern, playerMove, advisorUsed,
 *             interpretiveGloss, narrativeMove, stateDelta, groundingTrace,
 *             confidence, stateAfter }],
 *   collapse: { type, conditions, triggerTurn } | null,
 *   raw,
 * }
 */
function parseRunLog(content, filePath) {
  const result = {
    filePath,
    runId: null,
    startedAt: null,
    endedAt: null,
    model: null,
    outcome: null,
    turnsCompleted: 0,
    turns: [],
    collapse: null,
    raw: content,
  };

  // Frontmatter (--- ... ---)
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    result.runId = extractYamlString(fm, 'run_id');
    result.startedAt = extractYamlString(fm, 'started_at');
    result.endedAt = extractYamlString(fm, 'ended_at');
    result.model = extractYamlString(fm, 'model');
    result.outcome = extractYamlString(fm, 'outcome');
    const tc = extractYamlString(fm, 'turns_completed');
    if (tc) result.turnsCompleted = parseInt(tc, 10);
  }
  if (!result.runId) {
    // Fallback: derive from filename (runs/20260629-test01.md)
    result.runId = path.basename(filePath, '.md');
  }

  // Per-turn parsing
  // Split on `## Turn N` headings.
  const turnRegex = /## Turn (\d+)\s*\n([\s\S]*?)(?=\n## Turn |\n## Collapse|$)/g;
  let m;
  while ((m = turnRegex.exec(content)) !== null) {
    const turnNum = parseInt(m[1], 10);
    const body = m[2];
    result.turns.push(parseTurn(turnNum, body));
  }

  // Collapse block (if present at end of file)
  const collapseMatch = content.match(/## Collapse\s*\n([\s\S]*?)$/);
  if (collapseMatch) {
    result.collapse = parseCollapse(collapseMatch[1]);
  }

  return result;
}

function extractYamlString(fm, key) {
  const re = new RegExp(`^${key}:\\s*['"]?(.+?)['"]?\\s*$`, 'm');
  const m = fm.match(re);
  return m ? m[1].trim() : null;
}

function parseTurn(turnNum, body) {
  const turn = {
    turn: turnNum,
    crisisTitle: null,
    failurePattern: null,
    playerMove: null,
    advisorUsed: null,
    interpretiveGloss: null,
    narrativeMove: null,
    stateDelta: {},
    groundingTrace: [],
    confidence: null,
    stateAfter: {},
  };

  // Crisis title and pattern: **TITLE** (failure pattern: PATTERN)
  const crisisMatch = body.match(/\*\*([^*]+)\*\*\s*\(failure pattern:\s*([^)]+)\)/);
  if (crisisMatch) {
    turn.crisisTitle = crisisMatch[1].trim();
    turn.failurePattern = crisisMatch[2].trim();
  }

  // Player move: "### Player move\n\n<text>" (until next ### or end)
  const moveMatch = body.match(/### Player move\s*\n\n([\s\S]*?)(?=\n### |\n## |$)/);
  if (moveMatch) {
    turn.playerMove = moveMatch[1].trim();
  }

  // Advisor used: "### Advisor consulted: NAME"
  const advisorMatch = body.match(/### Advisor consulted:\s*(\S+)/);
  if (advisorMatch) {
    turn.advisorUsed = advisorMatch[1].trim();
  }

  // Interpretive gloss: "**interpretive_gloss:** TEXT"
  const glossMatch = body.match(/\*\*interpretive_gloss:\*\*\s*([\s\S]*?)(?=\n\*\*|\n### |\n## |$)/);
  if (glossMatch) {
    turn.interpretiveGloss = glossMatch[1].trim();
  }

  // Narrative move: "**narrative_move:** TEXT"
  const narrativeMatch = body.match(/\*\*narrative_move:\*\*\s*([\s\S]*?)(?=\n\*\*|\n### |\n## |$)/);
  if (narrativeMatch) {
    turn.narrativeMove = narrativeMatch[1].trim();
  }

  // State delta: bullet list under "**state_delta:**"
  const deltaMatch = body.match(/\*\*state_delta:\*\*\s*\n([\s\S]*?)(?=\n\*\*|\n### |\n## |$)/);
  if (deltaMatch) {
    for (const line of deltaMatch[1].split('\n')) {
      const dm = line.match(/^\s*-\s*([a-z_]+):\s*([+-]?\d+)/);
      if (dm) turn.stateDelta[dm[1]] = parseInt(dm[2], 10);
    }
  }

  // Grounding trace: bullet list under "**grounding_trace:**"
  const traceMatch = body.match(/\*\*grounding_trace:\*\*\s*\n([\s\S]*?)(?=\n\*\*|\n### |\n## |$)/);
  if (traceMatch) {
    for (const line of traceMatch[1].split('\n')) {
      const tm = line.match(/^\s*-\s*`?([^`\s]+(?:\.md))`?/);
      if (tm) turn.groundingTrace.push(tm[1]);
    }
  }

  // Confidence: "**confidence:** VALUE"
  const confMatch = body.match(/\*\*confidence:\*\*\s*(\S+)/);
  if (confMatch) {
    turn.confidence = confMatch[1].trim();
  }

  // State after turn: bullet list under "### State after turn"
  const stateMatch = body.match(/### State after turn\s*\n\n([\s\S]*?)$/);
  if (stateMatch) {
    for (const line of stateMatch[1].split('\n')) {
      const sm = line.match(/^\s*-\s*([a-z_]+):\s*(\d+)\s*\(([a-z]+)\)/);
      if (sm) turn.stateAfter[sm[1]] = { value: parseInt(sm[2], 10), band: sm[3] };
    }
  }

  return turn;
}

function parseCollapse(body) {
  const out = { type: null, conditions: {}, triggerTurn: null };
  // From interactive CLI: "Collapse fired: TYPE\n  Trigger turn:   N\n  Conditions:\n    key: value"
  const typeMatch = body.match(/Collapse fired:\s*(\S+)/);
  if (typeMatch) out.type = typeMatch[1].trim();
  const triggerMatch = body.match(/Trigger turn:\s*(\d+)/);
  if (triggerMatch) out.triggerTurn = parseInt(triggerMatch[1], 10);
  // Conditions block
  const condMatch = body.match(/Conditions:\s*\n([\s\S]*?)$/);
  if (condMatch) {
    for (const line of condMatch[1].split('\n')) {
      const cm = line.match(/^\s+([a-z_]+):\s*(\d+)/);
      if (cm) out.conditions[cm[1]] = parseInt(cm[2], 10);
    }
  }
  // From artifact-generator: "Collapse fired as **TYPE** on turn N"
  if (!out.type) {
    const alt = body.match(/Collapse fired as \*\*([^*]+)\*\*\s*on turn\s*(\d+)/);
    if (alt) {
      out.type = alt[1].trim();
      out.triggerTurn = parseInt(alt[2], 10);
    }
  }
  return out;
}

// ---------------------------------------------------------------
// Loading runs
// ---------------------------------------------------------------

function listRunFiles() {
  if (!fs.existsSync(RUNS_DIR)) return [];
  return fs.readdirSync(RUNS_DIR)
    .filter(f => f.endsWith('.md') && !f.includes('-artifact'))
    .map(f => path.join(RUNS_DIR, f))
    .sort();
}

function loadAllRuns() {
  return listRunFiles().map(f => {
    const content = fs.readFileSync(f, 'utf8');
    return parseRunLog(content, f);
  });
}

function loadRun(runId) {
  // Match by runId field, or by filename prefix
  for (const f of listRunFiles()) {
    const base = path.basename(f, '.md');
    if (base === runId || base.startsWith(runId)) {
      const content = fs.readFileSync(f, 'utf8');
      return parseRunLog(content, f);
    }
  }
  return null;
}

// ---------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------

function applyFilters(runs, filters) {
  return runs.filter(r => {
    if (filters.outcome && r.outcome !== filters.outcome) return false;
    if (filters.model && r.model && !r.model.includes(filters.model)) return false;
    if (filters.since) {
      const since = new Date(filters.since).getTime();
      const date = r.startedAt ? new Date(r.startedAt).getTime() : 0;
      if (date < since) return false;
    }
    if (filters.until) {
      const until = new Date(filters.until).getTime();
      const date = r.startedAt ? new Date(r.startedAt).getTime() : 0;
      if (date > until) return false;
    }
    if (filters.minTurns !== null && r.turnsCompleted < filters.minTurns) return false;
    return true;
  });
}

// ---------------------------------------------------------------
// Commands
// ---------------------------------------------------------------

function cmdList(args) {
  const runs = applyFilters(loadAllRuns(), args);
  if (runs.length === 0) {
    console.log('[run-query] No runs match the filter. (Is the runs/ directory populated?)');
    return;
  }
  console.log(`[run-query] ${runs.length} run(s):\n`);
  for (const r of runs) {
    const date = r.startedAt ? r.startedAt.slice(0, 10) : '?';
    const outcome = r.outcome || 'unknown';
    const model = r.model || 'unknown';
    console.log(`  ${r.runId}  ${date}  turns=${r.turnsCompleted}  outcome=${outcome}  model=${model}`);
  }
}

function cmdSummary(args) {
  const runs = applyFilters(loadAllRuns(), args);
  if (runs.length === 0) {
    console.log('[run-query] No runs to summarize.');
    return;
  }

  const outcomeDist = {};
  const modelDist = {};
  let totalTurns = 0;
  let collapseCount = 0;
  let advisorCount = 0;
  let totalDelta = {};
  const AXES = ['legitimacy', 'fiscal_slack', 'elite_alignment', 'ecological_debt', 'narrative_coherence', 'capability_frontier'];

  for (const r of runs) {
    outcomeDist[r.outcome] = (outcomeDist[r.outcome] || 0) + 1;
    modelDist[r.model] = (modelDist[r.model] || 0) + 1;
    totalTurns += r.turnsCompleted;
    if (r.outcome && r.outcome !== 'no-collapse' && r.outcome !== 'player-quit') {
      collapseCount += 1;
    }
    for (const turn of r.turns) {
      if (turn.advisorUsed) advisorCount += 1;
      for (const axis of AXES) {
        if (turn.stateDelta[axis]) {
          totalDelta[axis] = (totalDelta[axis] || 0) + Math.abs(turn.stateDelta[axis]);
        }
      }
    }
  }

  console.log(`[run-query] Summary of ${runs.length} run(s):\n`);
  console.log('  Outcomes:');
  for (const [outcome, count] of Object.entries(outcomeDist).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / runs.length) * 100).toFixed(1);
    console.log(`    ${outcome}: ${count} (${pct}%)`);
  }
  console.log('\n  Models:');
  for (const [model, count] of Object.entries(modelDist).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${model}: ${count}`);
  }
  console.log(`\n  Collapse rate: ${collapseCount}/${runs.length} (${((collapseCount / runs.length) * 100).toFixed(1)}%)`);
  console.log(`  Avg turns/run: ${(totalTurns / runs.length).toFixed(1)}`);
  console.log(`  Advisor consults: ${advisorCount} (across all runs)`);
  console.log('  Cumulative state delta magnitude (by axis):');
  for (const axis of AXES) {
    if (totalDelta[axis]) {
      console.log(`    ${axis}: ${totalDelta[axis]}`);
    }
  }
}

function cmdShow(args) {
  if (!args.file) {
    console.error('[run-query] Usage: run-query.js show <runId>');
    process.exit(1);
  }
  const r = loadRun(args.file);
  if (!r) {
    console.error(`[run-query] Run not found: ${args.file}`);
    process.exit(1);
  }
  console.log(`Run: ${r.runId}`);
  console.log(`  Started:        ${r.startedAt || '?'}`);
  console.log(`  Ended:          ${r.endedAt || '?'}`);
  console.log(`  Model:          ${r.model || '?'}`);
  console.log(`  Outcome:        ${r.outcome || '?'}`);
  console.log(`  Turns:          ${r.turnsCompleted}`);
  console.log(`  Collapse:       ${r.collapse ? `${r.collapse.type} (turn ${r.collapse.triggerTurn})` : 'none'}`);
  console.log(`  File:           ${r.filePath}`);
  console.log('');
  for (const turn of r.turns) {
    console.log(`  Turn ${turn.turn}: ${turn.crisisTitle || '?'}`);
    if (turn.failurePattern) console.log(`    Pattern: ${turn.failurePattern}`);
    if (turn.advisorUsed) console.log(`    Advisor: ${turn.advisorUsed}`);
    if (Object.keys(turn.stateDelta).length > 0) {
      const deltas = Object.entries(turn.stateDelta)
        .filter(([_, v]) => v !== 0)
        .map(([k, v]) => `${k}:${v > 0 ? '+' : ''}${v}`)
        .join(', ');
      console.log(`    Δ: ${deltas}`);
    }
    if (turn.confidence) console.log(`    Confidence: ${turn.confidence}`);
    if (turn.interpretiveGloss) {
      const gloss = turn.interpretiveGloss.length > 100
        ? turn.interpretiveGloss.slice(0, 100) + '…'
        : turn.interpretiveGloss;
      console.log(`    Heard: ${gloss}`);
    }
  }
}

function cmdPattern(args) {
  const runs = applyFilters(loadAllRuns(), args);
  if (runs.length === 0) {
    console.log('[run-query] No runs to analyze.');
    return;
  }

  console.log(`[run-query] Pattern analysis across ${runs.length} run(s):\n`);

  // 1. Outcome distribution
  const outcomeDist = {};
  for (const r of runs) {
    outcomeDist[r.outcome] = (outcomeDist[r.outcome] || 0) + 1;
  }
  console.log('  Outcome distribution:');
  for (const [outcome, count] of Object.entries(outcomeDist).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / runs.length) * 100).toFixed(1);
    console.log(`    ${outcome}: ${count} (${pct}%)`);
  }

  // 2. Advisor usage
  const advisorUse = {};
  let advisorTurns = 0;
  for (const r of runs) {
    for (const turn of r.turns) {
      if (turn.advisorUsed) {
        advisorUse[turn.advisorUsed] = (advisorUse[turn.advisorUsed] || 0) + 1;
        advisorTurns += 1;
      }
    }
  }
  const totalTurns = runs.reduce((sum, r) => sum + r.turnsCompleted, 0);
  if (advisorTurns > 0) {
    console.log(`\n  Advisor usage: ${advisorTurns}/${totalTurns} turns (${((advisorTurns / totalTurns) * 100).toFixed(1)}%)`);
    for (const [voice, count] of Object.entries(advisorUse).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${voice}: ${count}`);
    }
  } else {
    console.log('\n  Advisor usage: none recorded');
  }

  // 3. Failure pattern distribution
  const patternDist = {};
  for (const r of runs) {
    for (const turn of r.turns) {
      if (turn.failurePattern) {
        patternDist[turn.failurePattern] = (patternDist[turn.failurePattern] || 0) + 1;
      }
    }
  }
  if (Object.keys(patternDist).length > 0) {
    console.log('\n  Failure pattern distribution (per turn):');
    for (const [pattern, count] of Object.entries(patternDist).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${pattern}: ${count}`);
    }
  }

  // 4. Average delta magnitude per axis (where the most "action" happened)
  const AXES = ['legitimacy', 'fiscal_slack', 'elite_alignment', 'ecological_debt', 'narrative_coherence', 'capability_frontier'];
  const axisDelta = {};
  const axisCount = {};
  for (const r of runs) {
    for (const turn of r.turns) {
      for (const axis of AXES) {
        if (turn.stateDelta[axis] !== undefined && turn.stateDelta[axis] !== 0) {
          axisDelta[axis] = (axisDelta[axis] || 0) + Math.abs(turn.stateDelta[axis]);
          axisCount[axis] = (axisCount[axis] || 0) + 1;
        }
      }
    }
  }
  if (Object.keys(axisDelta).length > 0) {
    console.log('\n  Average |delta| per axis:');
    for (const axis of AXES) {
      if (axisDelta[axis]) {
        const avg = (axisDelta[axis] / axisCount[axis]).toFixed(1);
        console.log(`    ${axis.padEnd(22)} avg=${avg}  (across ${axisCount[axis]} turns)`);
      }
    }
  }

  // 5. Most-cited wiki entries (the grounding trace "concept graph")
  const traceDist = {};
  for (const r of runs) {
    for (const turn of r.turns) {
      for (const t of turn.groundingTrace) {
        traceDist[t] = (traceDist[t] || 0) + 1;
      }
    }
  }
  const topTraces = Object.entries(traceDist).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (topTraces.length > 0) {
    console.log('\n  Top 10 most-cited wiki entries:');
    for (const [trace, count] of topTraces) {
      console.log(`    ${trace}: ${count}`);
    }
  }

  // 6. Ship-criterion check (Phase 5)
  const collapses = runs.filter(r => r.outcome && r.outcome !== 'no-collapse' && r.outcome !== 'player-quit');
  if (collapses.length >= 3) {
    const collapseTypes = collapses.map(r => r.outcome);
    const uniqueTypes = new Set(collapseTypes);
    console.log(`\n  Phase 5 ship-criterion check (collapse-mode distribution):`);
    console.log(`    ${collapses.length} collapses across ${uniqueTypes.size} mode(s)`);
    if (uniqueTypes.size < 2) {
      console.log('    ⚠ distribution skew: only one collapse mode observed (need ≥2 for "balanced")');
    } else {
      console.log('    OK  distribution spans ≥2 modes');
    }
  }
}

function cmdDiff(args) {
  if (args.files.length !== 2) {
    console.error('[run-query] Usage: run-query.js diff <runId1> <runId2>');
    process.exit(1);
  }
  const r1 = loadRun(args.files[0]);
  const r2 = loadRun(args.files[1]);
  if (!r1 || !r2) {
    console.error(`[run-query] Run not found: ${!r1 ? args.files[0] : args.files[1]}`);
    process.exit(1);
  }
  console.log(`Comparing: ${r1.runId}  vs  ${r2.runId}\n`);
  console.log(`  Property        | ${r1.runId.padEnd(28)} | ${r2.runId}`);
  console.log(`  --------------- + ${'-'.repeat(30)} + ${'-'.repeat(30)}`);
  console.log(`  Started         | ${(r1.startedAt || '?').padEnd(30)} | ${r2.startedAt || '?'}`);
  console.log(`  Model           | ${(r1.model || '?').padEnd(30)} | ${r2.model || '?'}`);
  console.log(`  Outcome         | ${(r1.outcome || '?').padEnd(30)} | ${r2.outcome || '?'}`);
  console.log(`  Turns           | ${String(r1.turnsCompleted).padEnd(30)} | ${r2.turnsCompleted}`);

  if (r1.collapse && r2.collapse) {
    console.log(`  Collapse type   | ${(r1.collapse.type || '?').padEnd(30)} | ${r2.collapse.type || '?'}`);
    console.log(`  Collapse turn   | ${String(r1.collapse.triggerTurn || '?').padEnd(30)} | ${r2.collapse.triggerTurn || '?'}`);
  }

  // Compare final states
  const last1 = r1.turns.length > 0 ? r1.turns[r1.turns.length - 1].stateAfter : {};
  const last2 = r2.turns.length > 0 ? r2.turns[r2.turns.length - 1].stateAfter : {};
  console.log(`\n  Final state:`);
  const AXES = ['legitimacy', 'fiscal_slack', 'elite_alignment', 'ecological_debt', 'narrative_coherence', 'capability_frontier'];
  for (const axis of AXES) {
    const v1 = last1[axis]?.value ?? '-';
    const v2 = last2[axis]?.value ?? '-';
    console.log(`    ${axis.padEnd(22)} | ${String(v1).padEnd(28)} | ${v2}`);
  }
}

// ---------------------------------------------------------------
// Help
// ---------------------------------------------------------------

function printHelp() {
  console.log(`Polycrisis run-query (Cycle 4b)

Usage:
  node scripts/run-query.js list                 List all runs (one-line summary each).
  node scripts/run-query.js list --outcome X     Filter by outcome.
  node scripts/run-query.js list --model X       Filter by model (substring match).
  node scripts/run-query.js list --since YYYY-MM-DD --until YYYY-MM-DD
  node scripts/run-query.js list --min-turns N
  node scripts/run-query.js summary              Aggregate stats over filtered runs.
  node scripts/run-query.js show <runId>         Full details of one run.
  node scripts/run-query.js pattern              Pattern analysis across runs.
  node scripts/run-query.js diff <id1> <id2>     Before/after comparison.

Outcomes: legitimacy-collapse | technical-collapse | narrative-capture-collapse | no-collapse | player-quit

Reads from runs/*.md (gitignored operational logs). Each run log is the
output of the simulation's run log writer; see wiki/mechanics/run-log-format.md
for the format spec.`);
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.cmd) { printHelp(); return; }
  switch (args.cmd) {
    case 'list': cmdList(args); break;
    case 'summary': cmdSummary(args); break;
    case 'show': cmdShow(args); break;
    case 'pattern': cmdPattern(args); break;
    case 'diff': cmdDiff(args); break;
    default: printHelp();
  }
}

if (require.main === module) {
  main();
} else {
  module.exports = {
    parseArgs,
    parseRunLog,
    parseTurn,
    parseCollapse,
    listRunFiles,
    loadAllRuns,
    loadRun,
    applyFilters,
    // Commands (for testing)
    cmdList,
    cmdSummary,
    cmdShow,
    cmdPattern,
    cmdDiff,
  };
}