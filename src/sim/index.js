#!/usr/bin/env node
'use strict';

/**
 * index.js
 *
 * CLI entry point for the simulation skeleton (Cycle 2b).
 *
 * Usage:
 *   node src/sim/index.js
 *   node src/sim/index.js --turns 20
 *   node src/sim/index.js --output ./runs
 *
 * Cycle 2c will replace the mock LLM with real grammar calls; this
 * CLI is the placeholder for the real simulation runner.
 */

const path = require('path');
const { runSimulation, writeRunLog } = require('./run');

function parseArgs(argv) {
  const args = { turns: 14, output: './runs' };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--turns' || arg === '-t') {
      args.turns = parseInt(argv[++i], 10);
    } else if (arg === '--output' || arg === '-o') {
      args.output = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(`Polycrisis simulation skeleton (Cycle 2b)

Usage:
  node src/sim/index.js [options]

Options:
  --turns, -t <n>      Maximum number of turns (default: 14)
  --output, -o <dir>   Output directory for run logs (default: ./runs)
  --help, -h           Show this help

The skeleton uses a hand-authored mock LLM. Cycle 2c will replace
this with real grammar calls against OpenRouter.
`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const rootDir = path.resolve(__dirname, '..', '..');
  const outputDir = path.isAbsolute(args.output)
    ? args.output
    : path.join(rootDir, args.output);

  console.log(`Starting simulation skeleton...`);
  console.log(`Max turns: ${args.turns}`);
  console.log(`Output: ${outputDir}`);
  console.log('');

  const result = runSimulation({ maxTurns: args.turns });
  const filepath = writeRunLog(result, outputDir);

  console.log(`Run completed.`);
  console.log(`  Run ID: ${result.runId}`);
  console.log(`  Outcome: ${result.outcome}`);
  console.log(`  Turns: ${result.turnsCompleted}`);
  console.log(`  Log: ${filepath}`);
  console.log('');
  console.log('Final state:');
  console.log(result.turns[result.turns.length - 1].stateAfter
    ? Object.entries(result.turns[result.turns.length - 1].stateAfter)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join('\n')
    : '(no turns)');
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`Simulation error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

module.exports = { main, parseArgs };
