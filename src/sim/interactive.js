'use strict';

/**
 * interactive.js
 *
 * The interactive CLI for Polycrisis of Authority. Cycle 5b play loop +
 * cycle 5e walkthrough feedback + cycle 5f atmospherics + cycle 5g
 * spinner + cycle 5h identity + cycle 5j resign.
 *
 * Cycle 6b refactor: the turn loop moved to src/sim/run-loop.js. This
 * file is now the TTY surface adapter. It owns:
 *
 *   - createReader(): stdin/stdout wrapper (TTY and pipe modes)
 *   - withSpinner(): TTY-style pendulum spinner with atmospherics +
 *     corpus quote layers (the "Interpreting your move" wait state)
 *   - runInteractive(): entry point — prints the welcome banner,
 *     captures identity via promptForIdentity, creates a TTY surface,
 *     and hands off to runLoop().
 *
 * The loop, the world generator call, the post-game narration, and the
 * run log + artifact writing all live in run-loop.js now. Both the
 * terminal surface (here) and the discord surface (src/bot/surface.js)
 * drive the same shared loop.
 *
 * The play loop, as redesigned in Phase 5b and kept through 5j:
 *
 *   Turn N
 *     Situation:  <1-2 sentences; what is happening>
 *     Pressure:   <1-2 sentences; what is at stake>
 *     Decision point: <1 sentence; what the regime must answer>
 *     (or)
 *     [player types `a` to consult an advisor before writing their move]
 *     Your move:
 *     > <player types policy, blank line ends>
 *
 *     [LLM call]
 *
 *   Turn N+1
 *     <repeat>
 *
 * Everything else (visible-signal layer, system-interpretation block,
 * state-delta display, previous-turn summary, comedic interlude) has
 * been moved to the artifact and the run log. The play loop is
 * prose-only: situation, pressure, decision point, the player's
 * response, the next turn's situation.
 */

const fs = require('fs');
const path = require('path');

const { withBands } = require('./state');
const { pickCorpusQuote } = require('../../scripts/wiki-query');
const { wrap } = require('./cli-format');
const { promptForIdentity } = require('./identity');
const { formatCrisisForTTY } = require('./surface');
const { runLoop } = require('./run-loop');

const ROOT_DIR = path.join(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// createReader — TTY input reader.
// ---------------------------------------------------------------------------

// Input reader that works for both TTY and piped stdin.
function createReader() {
  const isTTY = process.stdin.isTTY === true;
  if (isTTY) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return {
      isTTY: true,
      // Single-line prompt. Use for short yes/no questions only.
      prompt: (question) => new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer));
      }),
      // Multi-line move prompt. The headerQuestion is printed once.
      // The player types their move; a blank line ends the move.
      // Each non-empty line is preceded by "  > " in the terminal.
      promptMove: (headerQuestion) => new Promise((resolve) => {
        process.stdout.write(headerQuestion + '\n');
        const lines = [];
        process.stdout.write('  > ');
        const onLine = (line) => {
          if (line === '') {
            rl.removeListener('line', onLine);
            resolve(lines.join('\n').trim());
          } else {
            lines.push(line);
            process.stdout.write('  > ');
          }
        };
        rl.on('line', onLine);
      }),
      // Print a single line (no readline prompt involvement).
      print: (text) => {
        process.stdout.write(text);
      },
      close: () => rl.close(),
    };
  }
  const lines = fs.readFileSync(0, 'utf8').split('\n');
  let cursor = 0;
  return {
    isTTY: false,
    prompt: async (question) => {
      process.stdout.write(question);
      const line = lines[cursor++] || '';
      return line;
    },
    promptMove: async (headerQuestion) => {
      process.stdout.write(headerQuestion + '\n');
      const collected = [];
      while (cursor < lines.length) {
        const line = lines[cursor++];
        if (line === '') break;
        collected.push(line);
      }
      return collected.join('\n').trim();
    },
    print: (text) => {
      process.stdout.write(text);
    },
    close: () => {},
  };
}

// ---------------------------------------------------------------------------
// withSpinner — TTY-mode pendulum spinner with atmospherics + corpus quote.
// ---------------------------------------------------------------------------

// Run an async function while showing a pendulum spinner in the terminal.
// The spinner appears on a fresh line below whatever the player just typed,
// rotates while the function runs, and is cleared when the function returns.
// In piped (non-TTY) mode, prints a single static line instead of rotating.
//
// Cycle 5f: the wait state now shows two layers, in order:
//   1. atmospherics — a short indirect line from atmospherics.js
//   2. corpus quote — an informational quote from wiki/signals/ (optional)
// Both are width-budgeted to fit a 70-column terminal after indent.
async function withSpinner(reader, message, fn, { atmospherics = null, corpusQuote = null } = {}) {
  const INDENT = '  ';
  const COL_BUDGET = 70;
  const WRAP_WIDTH = COL_BUDGET - INDENT.length;

  function renderBlock(text) {
    if (!text) return null;
    const wrapped = wrap(text, WRAP_WIDTH);
    return wrapped.split('\n').map((l) => INDENT + l).join('\n');
  }

  const atmosphericsBlock = renderBlock(atmospherics);
  const corpusQuoteBody = corpusQuote ? renderBlock(`"${corpusQuote.text}"`) : null;
  const corpusQuoteTitle = corpusQuote ? `${INDENT}─ ${corpusQuote.title}` : null;

  function countLines(block) {
    if (!block) return 0;
    return block.split('\n').length;
  }
  const atmosphericsLineCount = countLines(atmosphericsBlock);
  const corpusQuoteLineCount = (corpusQuote ? 1 : 0) + countLines(corpusQuoteBody);

  if (!reader.isTTY) {
    reader.print(`  ${message}\n`);
    if (atmosphericsBlock) {
      reader.print(atmosphericsBlock + '\n');
    }
    if (corpusQuote) {
      reader.print(corpusQuoteTitle + '\n' + corpusQuoteBody + '\n');
    }
    return await fn();
  }

  // Cycle 5h: static-line spinner (no cursor movement).
  const pulseChars = ['·', '·', '*', '·', '+', '·', '.', '·'];
  const baseLine = INDENT + message + ' ';
  const renderFrame = (pulseIdx) => {
    return baseLine + pulseChars[pulseIdx % pulseChars.length] + '   ';
  };

  let pulseIdx = 0;
  let stopped = false;
  reader.print(renderFrame(pulseIdx) + '\n');
  if (atmosphericsBlock) {
    reader.print(atmosphericsBlock + '\n');
  }
  if (corpusQuote) {
    reader.print(corpusQuoteTitle + '\n' + corpusQuoteBody + '\n');
  }

  const linesBelowSpinner = atmosphericsLineCount + corpusQuoteLineCount;
  const linesToMoveUp = 1 + linesBelowSpinner;

  const tick = async () => {
    while (!stopped) {
      await new Promise((r) => setTimeout(r, 800));
      if (stopped) break;
      pulseIdx += 1;
      reader.print('\r' + renderFrame(pulseIdx));
    }
  };
  const tickPromise = tick();
  try {
    return await fn();
  } finally {
    stopped = true;
    await tickPromise;
    const upSeq = '\x1b[' + linesToMoveUp + 'A';
    const downSeq = '\x1b[' + linesBelowSpinner + 'B';
    reader.print(upSeq + '\x1b[2K\x1b[J' + downSeq);
  }
}

// ---------------------------------------------------------------------------
// createTtySurface — adapter that wraps createReader + withSpinner into the
// surface contract (see src/sim/surface.js).
// ---------------------------------------------------------------------------

function createTtySurface(reader) {
  // Track whether readMove has been called with continuation: true so we
  // can differentiate the first-line prompt from subsequent multi-line
  // prompts in TTY mode.
  let moveState = { firstLine: true };

  return {
    isTTY: reader.isTTY,

    print: (prose) => {
      reader.print(prose + (prose.endsWith('\n') ? '' : '\n'));
    },

    waitWhileLLM: (message, fn, options) => withSpinner(reader, message, fn, options),

    readMove: async ({ header, continuation = false } = {}) => {
      if (continuation) {
        // Subsequent lines of the multi-line buffer.
        return await reader.prompt('  > ');
      }
      // First line — TTY shows the move-prompt header.
      moveState.firstLine = false;
      return await reader.prompt(header || 'Your move (or `a` for an advisor, `r` to resign): ');
    },

    readChoice: async ({ header, options = [] } = {}) => {
      reader.print('');
      reader.print('  ' + header);
      for (const opt of options) {
        reader.print('    ' + opt);
      }
      const choice = (await reader.prompt('  > ')).trim();
      const idx = parseInt(choice, 10) - 1;
      return idx;
    },

    readConfirm: async ({ header, defaultNo = true } = {}) => {
      const response = (await reader.prompt('  ' + header)).trim().toLowerCase();
      if (defaultNo) {
        return response === 'y' || response === 'yes';
      }
      return response !== 'n' && response !== 'no';
    },

    close: () => reader.close(),
  };
}

// ---------------------------------------------------------------------------
// runInteractive — the TTY entry point.
// ---------------------------------------------------------------------------

async function runInteractive(options = {}) {
  const { maxTurns, model = process.env.OPENROUTER_MODEL || 'minimax/minimax-m3' } = options;

  const runId = options.runId || require('./run-loop').generateRunId();

  console.log('');
  // Cycle 5e: ASCII logo + longer intro frame.
  console.log('          ▄▄▄▄▄▄');
  console.log('        ▄█▀   ▀█▄');
  console.log('       █  ▄▄▄▄▄▄  █');
  console.log('       █ █     █ █');
  console.log('       █ █  A  █ █');
  console.log('       █ █     █ █');
  console.log('       █  ▀▀▀▀▀▀  █');
  console.log('        ▀█▄   ▄█▀');
  console.log('          ▀▀▀▀▀▀');
  console.log('');
  console.log('  POLYCRISIS OF AUTHORITY');
  console.log('  A simulation of governing through AI policy crises.');
  console.log('');
  console.log(`  Run ${runId} · Model: ${model}`);
  console.log('');
  console.log('  You are governing a regime responding to AI policy crises. Each turn,');
  console.log('  you read the situation, the pressure, and the decision point; then');
  console.log('  write your policy. The simulation interprets your words and shifts the');
  console.log('  regime\'s position. There is no victory condition. The regime either');
  console.log('  holds or it falls.');
  console.log('');
  console.log('  End your move with a blank line. Type `a` to consult an advisor first.');
  console.log('  To end the run at any point, type `r` (or `resign`) at the move prompt,');
  console.log('  or include `::resign` on its own line inside a multi-line move.');
  console.log('');

  const reader = createReader();

  // Cycle 5h: capture player + regime identity up-front.
  const identity = await promptForIdentity(reader);
  console.log('');
  console.log(`  Playing as ${identity.player}, governing ${identity.regime}.`);
  console.log('');

  // Create the TTY surface adapter, then hand off to the shared loop.
  const surface = createTtySurface(reader);

  return await runLoop({
    surface,
    model,
    maxTurns,
    identity,
    renderTurn: formatCrisisForTTY,
  });
}

module.exports = { runInteractive, withSpinner, createReader };

if (require.main === module) {
  runInteractive().catch((err) => {
    console.error(`Simulation error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });
}