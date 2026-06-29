#!/usr/bin/env node
'use strict';

/**
 * index-async.js
 *
 * Real-LLM CLI for the simulation. Cycle 2d.
 *
 * Usage:
 *   node src/sim/index-async.js --script <file>
 *   node src/sim/index-async.js --turns <n> --script <file>
 *
 * The --script file contains one player move per line. Blank lines
 * separate moves; consecutive non-blank lines are joined into a
 * single move.
 *
 * Cycle 2e will replace this with a more interactive UI. For now,
 * this is the canonical way to run an end-to-end session against
 * the real grammar.
 */

const fs = require('fs');
const path = require('path');
const { runSimulationAsync, writeRunLog, writeArtifact } = require('./run-async');
const { generateArtifact } = require('./artifact-generator');
const { renderArtifactHtml } = require('./artifact-render');

function parseScript(scriptPath) {
  const content = fs.readFileSync(scriptPath, 'utf8');
  // Strip out '---' separator lines (used between moves in the script).
  const stripped = content
    .split('\n')
    .filter((line) => line.trim() !== '---')
    .join('\n');
  // Split on blank lines; each non-empty block is one move.
  const blocks = stripped.split(/\n\s*\n/);
  const moves = blocks
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter((move) => move.length > 0);
  return moves;
}

function parseArgs(argv) {
  const args = { turns: 14, script: null, output: './runs' };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--turns' || arg === '-t') {
      args.turns = parseInt(argv[++i], 10);
    } else if (arg === '--script' || arg === '-s') {
      args.script = argv[++i];
    } else if (arg === '--output' || arg === '-o') {
      args.output = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(`Polycrisis simulation — Real LLM mode (Cycle 2d)

Usage:
  node src/sim/index-async.js --script <file>

Options:
  --turns, -t <n>      Maximum number of turns (default: 14)
  --script, -s <file>  File containing one player move per blank-separated block
  --output, -o <dir>   Output directory for run logs and artifacts (default: ./runs)
  --help, -h           Show this help

The simulation calls MiniMax M3 (or whatever OPENROUTER_MODEL is set to)
for each turn. Run logs and artifacts are written to the output directory.
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  if (!args.script) {
    console.error('Error: --script <file> is required');
    console.error('Run with --help for usage');
    process.exit(1);
  }

  const scriptPath = path.isAbsolute(args.script)
    ? args.script
    : path.join(process.cwd(), args.script);

  if (!fs.existsSync(scriptPath)) {
    console.error(`Error: script file not found: ${scriptPath}`);
    process.exit(1);
  }

  const playerMoves = parseScript(scriptPath);
  if (playerMoves.length === 0) {
    console.error('Error: script file is empty');
    process.exit(1);
  }

  const rootDir = path.resolve(__dirname, '..', '..');
  const outputDir = path.isAbsolute(args.output)
    ? args.output
    : path.join(rootDir, args.output);

  console.log(`Starting real-LLM simulation...`);
  console.log(`Script: ${scriptPath} (${playerMoves.length} moves)`);
  console.log(`Max turns: ${args.turns}`);
  console.log(`Output: ${outputDir}`);
  console.log('');

  const result = await runSimulationAsync({
    maxTurns: Math.min(args.turns, playerMoves.length),
    playerMoves,
    onTurnStart: (turnNum, crisis) => {
      console.log(`=== Turn ${turnNum}: ${crisis.title} ===`);
      console.log(`Pattern: ${crisis.failure_pattern}`);
    },
    onTurnEnd: (turnNum, crisis, playerMove, grammarOutput, stateAfter) => {
      const deltaStr = Object.entries(grammarOutput.state_delta)
        .filter(([_, v]) => v !== 0)
        .map(([k, v]) => `${k}:${v > 0 ? '+' : ''}${v}`)
        .join(', ');
      console.log(`  → state_delta: ${deltaStr}`);
      console.log(`  → gloss: ${grammarOutput.interpretive_gloss.slice(0, 100)}...`);
      console.log(`  → confidence: ${grammarOutput.confidence}`);
      console.log('');
    },
  });

  const runLogPath = writeRunLog(result, outputDir);
  console.log(`Run completed.`);
  console.log(`  Run ID: ${result.runId}`);
  console.log(`  Outcome: ${result.outcome}`);
  console.log(`  Turns: ${result.turnsCompleted}`);
  console.log(`  Run log: ${runLogPath}`);

  // Generate artifact (markdown + self-contained HTML)
  const artifact = generateArtifact(result);
  const artifactPath = path.join(outputDir, `${result.runId}-artifact.md`);
  fs.writeFileSync(artifactPath, artifact);
  const html = renderArtifactHtml(artifact, {
    runId: result.runId,
    model: result.model,
    outcome: result.outcome,
    hashOf: result.runLog,
  });
  const htmlPath = path.join(outputDir, `${result.runId}-artifact.html`);
  fs.writeFileSync(htmlPath, html);
  console.log(`  Artifact:   ${artifactPath} (${(artifact.length / 1024).toFixed(1)} KB markdown)`);
  console.log(`  Shareable:  ${htmlPath} (${(html.length / 1024).toFixed(1)} KB self-contained HTML)`);
  console.log('');

  // Brief summary
  console.log('Final state:');
  for (const [axis, value] of Object.entries(result.finalState)) {
    console.log(`  ${axis}: ${value}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`Simulation error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });
}