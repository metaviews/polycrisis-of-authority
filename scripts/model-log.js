'use strict';

/**
 * model-log.js
 *
 * Cycle 4d. CLI for the model-version log (wiki/mechanics/model-versions.md).
 * Per the orchestrator-role doc's Activity 5 and the roadmap's Phase 4
 * build order item 5:
 *   "Model-version log: a structured record of every model change,
 *    with before/after comparison runs."
 *
 * Usage:
 *   node scripts/model-log.js current                  # show current .env model + recent log entries
 *   node scripts/model-log.js list                     # show all recorded switches
 *   node scripts/model-log.js record <old> <new> [opts]   # append a switch entry
 *     --reason "..."             why the switch
 *     --before <id1,id2>         comma-separated run IDs from before the switch
 *     --after <id1,id2>          comma-separated run IDs from after the switch
 *     --observation "..."        observed behavior change
 *     --judgment "intervention" | "no-intervention"  orchestrator's call
 *     --linked <ref>             commit ref / wiki update path
 *   node scripts/model-log.js compare <beforeId> <afterId>   # produce a before/after comparison
 *
 * Requires: .env with OPENROUTER_MODEL (current model) and
 *           FALLBACK_OPENROUTER_MODEL (optional, used on 429 responses).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const LOG_PATH = path.join(ROOT, 'wiki', 'mechanics', 'model-versions.md');
const RUNS_DIR = path.join(ROOT, 'runs');

// ---------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    cmd: null,
    oldModel: null,
    newModel: null,
    reason: null,
    before: null,
    after: null,
    observation: null,
    judgment: null,
    linked: null,
    runIds: [],
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === 'current' || a === 'list' || a === 'record' || a === 'compare') {
      args.cmd = a;
    } else if (a === 'help' || a === '--help' || a === '-h') {
      args.help = true;
    } else if (a === '--reason') args.reason = argv[++i];
    else if (a === '--before') args.before = argv[++i];
    else if (a === '--after') args.after = argv[++i];
    else if (a === '--observation') args.observation = argv[++i];
    else if (a === '--judgment') args.judgment = argv[++i];
    else if (a === '--linked') args.linked = argv[++i];
    else if (!a.startsWith('--')) {
      if (args.cmd === 'record' && !args.oldModel) args.oldModel = a;
      else if (args.cmd === 'record' && !args.newModel) args.newModel = a;
      else if (args.cmd === 'compare') args.runIds.push(a);
    }
  }
  return args;
}

// ---------------------------------------------------------------
// .env reading
// ---------------------------------------------------------------

function readEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};
  const env = {};
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

// ---------------------------------------------------------------
// Log reading/writing
// ---------------------------------------------------------------

function readLog() {
  if (!fs.existsSync(LOG_PATH)) return null;
  return fs.readFileSync(LOG_PATH, 'utf8');
}

/**
 * Append a new switch entry to the log. Returns the entry markdown.
 * Existing entries are not edited.
 */
function buildEntry({ date, oldModel, newModel, reason, before, after, observation, judgment, linked }) {
  const lines = [];
  lines.push(`### ${date} — from \`${oldModel}\` to \`${newModel}\``);
  lines.push('');
  if (reason) lines.push(`- **Reason:** ${reason}`);
  if (before) lines.push(`- **Before runs:** ${before}`);
  if (after) lines.push(`- **After runs:** ${after}`);
  if (observation) lines.push(`- **Observed behavior change:** ${observation}`);
  if (judgment) {
    const j = judgment.toLowerCase().trim();
    const validJudgment = j.includes('intervention') ? j : `unclear: ${judgment}`;
    lines.push(`- **Judgment:** ${validJudgment}`);
  }
  if (linked) lines.push(`- **Linked grammar/wiki updates:** ${linked}`);
  lines.push('');
  return lines.join('\n');
}

function appendEntry(entry) {
  const log = readLog();
  if (!log) {
    console.error(`[model-log] Log not found: ${LOG_PATH}`);
    process.exit(1);
  }
  // Append at the end of the file
  const updated = log.replace(/\n*$/, '') + '\n\n' + entry;
  fs.writeFileSync(LOG_PATH, updated);
  return updated;
}

/**
 * Parse log entries back out of the file. Returns an array of:
 *   { date, oldModel, newModel, reason, before, after, observation, judgment, linked }
 *
 * Two entry shapes are accepted:
 *   - "### YYYY-MM-DD — from `OLD` to `NEW`" (the standard record format)
 *   - "### YYYY-MM-DD — initial model: `MODEL`" (a foundational entry, no from/to)
 */
function parseEntries(content) {
  if (!content) return [];
  const out = [];
  // Standard "from X to Y" entries
  const fromToRe = /### (\d{4}-\d{2}-\d{2}) — from `([^`]+)` to `([^`]+)`\n([\s\S]*?)(?=\n### |\s*$)/g;
  let m;
  while ((m = fromToRe.exec(content)) !== null) {
    out.push(buildParsedEntry(m[1], m[2], m[3], m[4]));
  }
  // Initial-model entries
  const initialRe = /### (\d{4}-\d{2}-\d{2}) — initial model: `([^`]+)`\n([\s\S]*?)(?=\n### |\s*$)/g;
  while ((m = initialRe.exec(content)) !== null) {
    out.push(buildParsedEntry(m[1], '(initial)', m[2], m[3]));
  }
  // Sort by date for deterministic ordering
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

function buildParsedEntry(date, oldModel, newModel, body) {
  // Each field is on a single line: "- **Key:** value"
  // Use [^\n]+ instead of .+ to avoid greedy multi-line matches
  const field = (key) => {
    const fm = body.match(new RegExp(`- \\*\\*${key}:\\*\\* ([^\\n]+)`));
    return fm ? fm[1].trim() : null;
  };
  // Judgment is special: it should be a single word ("intervention" or
  // "no-intervention") followed by an optional period and explanation.
  // Extract the marker separately so callers can branch on it.
  const rawJudgment = field('Judgment') || '';
  let judgmentMarker = null;
  let judgmentNote = null;
  if (/^\s*(no-intervention|intervention)\b/i.test(rawJudgment)) {
    judgmentMarker = rawJudgment.match(/^\s*(no-intervention|intervention)\b/i)[1].toLowerCase();
    judgmentNote = rawJudgment.replace(/^\s*(no-intervention|intervention)\b\.?\s*/i, '').trim() || null;
  }
  return {
    date,
    oldModel,
    newModel,
    reason: field('Reason'),
    before: field('Before runs'),
    after: field('After runs'),
    observation: field('Observed behavior change'),
    judgment: judgmentMarker,
    judgmentNote,
    linked: field('Linked grammar/wiki updates'),
  };
}

// ---------------------------------------------------------------
// Run log loading (reuses run-query.js parsing logic)
// ---------------------------------------------------------------

function loadRun(runId) {
  if (!fs.existsSync(RUNS_DIR)) return null;
  for (const f of fs.readdirSync(RUNS_DIR)) {
    if (!f.endsWith('.md') || f.includes('-artifact')) continue;
    const base = path.basename(f, '.md');
    if (base === runId || base.startsWith(runId)) {
      const content = fs.readFileSync(path.join(RUNS_DIR, f), 'utf8');
      // Minimal parser: extract the model + outcome + turns from frontmatter
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const run = { filePath: path.join(RUNS_DIR, f), runId: base };
      if (fmMatch) {
        const fm = fmMatch[1];
        const get = (k) => {
          const r = new RegExp(`^${k}:\\s*['"]?(.+?)['"]?\\s*$`, 'm');
          const m = fm.match(r);
          return m ? m[1].trim() : null;
        };
        run.model = get('model');
        run.outcome = get('outcome');
        const tc = get('turns_completed');
        if (tc) run.turnsCompleted = parseInt(tc, 10);
        const sa = get('started_at');
        if (sa) run.startedAt = sa;
      }
      return run;
    }
  }
  return null;
}

// ---------------------------------------------------------------
// Commands
// ---------------------------------------------------------------

function cmdCurrent() {
  const env = readEnv();
  const current = env.OPENROUTER_MODEL || '(unset)';
  const fallback = env.FALLBACK_OPENROUTER_MODEL || '(unset)';
  console.log('[model-log] Current model configuration:');
  console.log(`  Primary:  ${current}`);
  console.log(`  Fallback: ${fallback}`);
  const log = readLog();
  const entries = parseEntries(log);
  if (entries.length === 0) {
    console.log(`\n  Log: empty (no entries yet at ${path.relative(ROOT, LOG_PATH)})`);
    return;
  }
  console.log(`\n  Log: ${entries.length} switch(es) recorded. Most recent:`);
  const recent = entries.slice(-3).reverse();
  for (const e of recent) {
    console.log(`    ${e.date}  ${e.oldModel}  →  ${e.newModel}  (${e.judgment || 'no judgment recorded'})`);
  }
  if (entries.length > 3) {
    console.log(`    ... ${entries.length - 3} earlier. Run \`node scripts/model-log.js list\` for all.`);
  }
}

function cmdList() {
  const log = readLog();
  const entries = parseEntries(log);
  if (entries.length === 0) {
    console.log('[model-log] No switches recorded yet.');
    return;
  }
  console.log(`[model-log] ${entries.length} switch(es):\n`);
  for (const e of entries) {
    console.log(`  ${e.date}  ${e.oldModel}  →  ${e.newModel}`);
    if (e.reason) console.log(`    reason:  ${e.reason}`);
    if (e.before) console.log(`    before:  ${e.before}`);
    if (e.after) console.log(`    after:   ${e.after}`);
    if (e.observation) console.log(`    observe: ${e.observation}`);
    if (e.judgment) console.log(`    judgment: ${e.judgment}`);
    if (e.linked) console.log(`    linked:  ${e.linked}`);
    console.log('');
  }
}

function cmdRecord(args) {
  if (!args.oldModel || !args.newModel) {
    console.error('[model-log] Usage: model-log.js record <oldModel> <newModel> [--reason ... --before ... --after ... --observation ... --judgment ... --linked ...]');
    process.exit(1);
  }
  const date = new Date().toISOString().slice(0, 10);
  const entry = buildEntry({
    date,
    oldModel: args.oldModel,
    newModel: args.newModel,
    reason: args.reason,
    before: args.before,
    after: args.after,
    observation: args.observation,
    judgment: args.judgment,
    linked: args.linked,
  });
  appendEntry(entry);
  console.log(`[model-log] Appended entry for ${date}: ${args.oldModel} → ${args.newModel}`);
  console.log('\nNew entry:');
  console.log(entry);
}

function cmdCompare(args) {
  if (args.runIds.length !== 2) {
    console.error('[model-log] Usage: model-log.js compare <beforeRunId> <afterRunId>');
    process.exit(1);
  }
  const r1 = loadRun(args.runIds[0]);
  const r2 = loadRun(args.runIds[1]);
  if (!r1 || !r2) {
    console.error(`[model-log] Run not found: ${!r1 ? args.runIds[0] : args.runIds[1]}`);
    process.exit(1);
  }
  console.log(`[model-log] Model-version comparison:\n`);
  console.log(`  Before: ${r1.runId} (model ${r1.model || '?'}, ${(r1.startedAt || '').slice(0, 10)})`);
  console.log(`  After:  ${r2.runId} (model ${r2.model || '?'}, ${(r2.startedAt || '').slice(0, 10)})\n`);
  // Run-level diff
  console.log('  Run-level:');
  console.log(`    Outcome:  ${r1.outcome || '?'}  →  ${r2.outcome || '?'}`);
  console.log(`    Turns:    ${r1.turnsCompleted || '?'}  →  ${r2.turnsCompleted || '?'}`);
  console.log('');
  console.log('  For full before/after (state trajectory, per-turn deltas, etc.), run:');
  console.log(`    node scripts/run-query.js diff ${r1.runId} ${r2.runId}`);
  console.log('  Or, for a changelog-ready comparison, run:');
  console.log(`    node scripts/run-query.js grammar-refine ${r1.runId} ${r2.runId}`);
  console.log('');
  // Now actually print the comparison using the run-query parser, since we have
  // access to it. Imported lazily.
  let rq;
  try {
    rq = require('./run-query');
  } catch (e) {
    return;
  }
  const fullR1 = rq.loadRun(r1.runId);
  const fullR2 = rq.loadRun(r2.runId);
  if (fullR1 && fullR2) {
    console.log(rq.buildGrammarRefine(fullR1, fullR2));
  }
}

// ---------------------------------------------------------------
// Help
// ---------------------------------------------------------------

function printHelp() {
  console.log(`Polycrisis model-log (Cycle 4d)

Usage:
  node scripts/model-log.js current                       Show current .env model + recent log entries.
  node scripts/model-log.js list                          List all recorded switches.
  node scripts/model-log.js record <old> <new> [opts]     Append a switch entry to the log.
  node scripts/model-log.js compare <beforeId> <afterId>  Produce a before/after comparison.

Record options:
  --reason "..."          why the switch
  --before "id1,id2"      comma-separated run IDs from before the switch
  --after "id1,id2"       comma-separated run IDs from after the switch
  --observation "..."     observed behavior change
  --judgment "intervention" | "no-intervention"  orchestrator's call
  --linked "..."          commit ref / wiki update path

The log lives at wiki/mechanics/model-versions.md. It is append-only;
existing entries are never edited.`);
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.cmd) { printHelp(); return; }
  switch (args.cmd) {
    case 'current': cmdCurrent(); break;
    case 'list': cmdList(); break;
    case 'record': cmdRecord(args); break;
    case 'compare': cmdCompare(args); break;
    default: printHelp();
  }
}

if (require.main === module) {
  main();
} else {
  module.exports = {
    parseArgs,
    readEnv,
    readLog,
    buildEntry,
    appendEntry,
    parseEntries,
    loadRun,
    // Commands (for testing)
    cmdCurrent,
    cmdList,
    cmdRecord,
    cmdCompare,
  };
}