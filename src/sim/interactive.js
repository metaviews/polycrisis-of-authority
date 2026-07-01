'use strict';

/**
 * interactive.js
 *
 * The interactive CLI for Polycrisis of Authority. Cycle 5b.
 *
 * The play loop, as redesigned in Phase 5b:
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
 *
 * At the end, the 8-section artifact is generated.
 */

const fs = require('fs');
const path = require('path');

const { INITIAL_STATE, applyDelta, checkCollapse, withBands, bandFor } = require('./state');
const { selectCrisis } = require('./crisis-generator');
const { interpret } = require('./grammar');
const { consult, ADVISOR_VOICES } = require('./advisors');
const { generateArtifact } = require('./artifact-generator');
const { renderArtifactHtml } = require('./artifact-render');
const { formatStateBlock, formatStateCompact, formatDeltaBlock, formatVisibleSignalsDisplay, computeVisibleSignals } = require('./state-display');
const { wrap } = require('./cli-format');

const ROOT_DIR = path.join(__dirname, '..', '..');

function generateRunId() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:T]/g, '').replace(/\..+/, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${rand}`;
}

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

// Run an async function while showing a pendulum spinner in the terminal.
// The spinner appears on a fresh line below whatever the player just typed,
// rotates while the function runs, and is cleared when the function returns.
// In piped (non-TTY) mode, prints a single static line instead of rotating.
async function withSpinner(reader, message, fn) {
  if (!reader.isTTY) {
    reader.print(`  ${message}\n`);
    return await fn();
  }
  // TTY mode: pendulum spinner
  // The message is followed by 5 dot-position spaces; the dot oscillates
  // through them. The dot is NEVER placed inside the message text — the
  // message is always intact.
  const dotPositions = [0, 1, 2, 3, 4, 3, 2, 1];
  const prefix = '  ' + message + ' ';
  const totalLen = prefix.length + 4; // 4 dot-position spaces
  const renderFrame = (dotPos) => {
    let line = prefix;
    // Pad with spaces to total length
    while (line.length < totalLen) line += ' ';
    // Place the dot at position (totalLen - 4 + dotPos). The dot is always
    // in the trailing space region, never overlapping the message.
    const dotIdx = totalLen - 4 + dotPos;
    return line.slice(0, dotIdx) + '·' + line.slice(dotIdx + 1);
  };
  let frameIdx = 0;
  let stopped = false;
  // Print the first frame immediately
  reader.print(renderFrame(dotPositions[0]) + '\n');
  // The cursor is now at the start of the line BELOW the spinner.
  // To update, we need to go up one line, rewrite, and go back down.
  // Use \x1b[1A to move up, \r to go to col 0, then write the new frame.
  const tick = async () => {
    while (!stopped) {
      await new Promise(r => setTimeout(r, 800));
      if (stopped) break;
      frameIdx = (frameIdx + 1) % dotPositions.length;
      // Move up to the spinner line, rewrite, move back down
      reader.print('\x1b[1A\r' + renderFrame(dotPositions[frameIdx]) + '\n');
    }
  };
  const tickPromise = tick();
  try {
    return await fn();
  } finally {
    stopped = true;
    await tickPromise;
    // Clear the spinner line: move up, clear with spaces, move down
    const blank = ' '.repeat(totalLen);
    reader.print('\x1b[1A\r' + blank + '\r\n');
  }
}

// Render a single turn's prose (Situation / Pressure / Decision point).
// Returns the formatted string ready for stdout.
function renderCrisisProse(crisis) {
  const lines = [];
  lines.push(`  ${crisis.title}`);
  lines.push('');
  lines.push('  Situation:');
  lines.push('  ' + wrap(crisis.situation, 68).split('\n').map(l => '  ' + l).join('\n').trim());
  lines.push('');
  lines.push('  Pressure:');
  lines.push('  ' + wrap(crisis.pressure, 68).split('\n').map(l => '  ' + l).join('\n').trim());
  lines.push('');
  lines.push('  Decision point:');
  lines.push('  ' + wrap(crisis.decision_point, 68).split('\n').map(l => '  ' + l).join('\n').trim());
  lines.push('');
  return lines.join('\n');
}

// Get a short advisor paragraph (~50 words) for in-loop consults.
// The full corpus-grounded version is still generated and recorded
// in the run log + artifact; the loop version is a quick briefing.
async function consultAdvisorShort(voice, crisis, state) {
  const response = await consult({
    voice,
    crisis,
    state: { ...state },
    playerMove: '[player is consulting before writing their move]',
  });
  // Trim to roughly 50 words for the loop. The full response is still
  // recorded in the run log via the advisorUsed field.
  const words = response.split(/\s+/);
  if (words.length > 60) {
    return words.slice(0, 60).join(' ') + '...';
  }
  return response;
}

async function runInteractive({ maxTurns = 14, model = process.env.OPENROUTER_MODEL || 'minimax/minimax-m3' } = {}) {
  const runId = generateRunId();
  const startedAt = new Date().toISOString();

  console.log('\n  POLYCRISIS OF AUTHORITY');
  console.log('  Simulation begins.');
  console.log(`  Run ID: ${runId}`);
  console.log(`  Model: ${model}`);
  console.log('');
  console.log('  You are in power. Crisis will come. Each turn:');
  console.log('  read the situation, the pressure, and the decision point;');
  console.log('  then write your policy. Type `a` to consult an advisor first.');
  console.log('  End your move with a blank line. The session ends at collapse, or after ' + maxTurns + ' turns.');
  console.log('');

  const reader = createReader();

  let state = { ...INITIAL_STATE };
  let turn = 0;
  const usedCrisisIds = [];
  const turns = [];
  let outcome = 'no-collapse';
  let collapse = null;

  try {
    while (turn < maxTurns) {
      turn += 1;

      // 1. Select crisis
      const crisis = selectCrisis({ state, turn, usedIds: usedCrisisIds });
      usedCrisisIds.push(crisis.id);

      // 2. Render the prose (Situation / Pressure / Decision point)
      console.log(`\n  ─── Turn ${turn} ───\n`);
      console.log(renderCrisisProse(crisis));

      // 3. Get the player's move. The prompt is multi-line: the player
      // types their move and ends with a blank line. As a shortcut,
      // typing `a` on the first line enters advisor mode instead.
      let playerMove = null;
      let advisorUsed = null;
      let advisorFullResponse = null;

      // First, ask the player whether they want to consult an advisor
      // (single line — this is a shortcut, not the move itself).
      const firstLine = await reader.prompt('  Your move (or `a` for an advisor): ');

      if (firstLine.trim().toLowerCase() === 'a') {
        // Advisor flow
        console.log('');
        console.log('  Which advisor? (1-5)');
        for (let i = 0; i < ADVISOR_VOICES.length; i += 1) {
          console.log(`    [${i + 1}] ${ADVISOR_VOICES[i]}`);
        }
        const advisorChoice = (await reader.prompt('  > ')).trim();
        const idx = parseInt(advisorChoice, 10) - 1;
        if (idx >= 0 && idx < ADVISOR_VOICES.length) {
          advisorUsed = ADVISOR_VOICES[idx];
          // Get the short version for the loop
          const shortAdvisor = await consultAdvisorShort(advisorUsed, crisis, state);
          // Get the full version for the run log
          advisorFullResponse = await consult({
            voice: advisorUsed,
            crisis,
            state: { ...state },
            playerMove: '[player is consulting before writing their move]',
          });
          console.log('');
          console.log('  Advisor (' + advisorUsed + '):');
          console.log('  ' + wrap(shortAdvisor, 68).split('\n').map(l => '  ' + l).join('\n').trim());
          console.log('');
          // Now ask for the multi-line move
          playerMove = await reader.promptMove('  Your move:');
        } else {
          console.log('  (invalid choice; writing your own move)');
          playerMove = await reader.promptMove('  Your move:');
        }
      } else {
        // The first line of the move is the line the player already typed.
        // Continue reading more lines until a blank line, treating the
        // first line as part of the multi-line input.
        const collected = [firstLine];
        let more = true;
        while (more) {
          // Check if the first line itself was blank (player just hit enter).
          // In that case, the move is empty and we don't read more.
          if (collected.length === 1 && firstLine === '') {
            more = false;
          } else {
            // Read the next line directly via stdin
            const line = await reader.prompt('  > ');
            if (line === '') {
              more = false;
            } else {
              collected.push(line);
            }
          }
        }
        playerMove = collected.filter(l => l !== '').join('\n').trim();
      }

      if (!playerMove) {
        console.log('  (empty response — using a brief acknowledgment.)');
        playerMove = '[silence]';
      }

      // 4. Real grammar call (async) with a status spinner while waiting
      const turnHistory = turns.slice(-5).map((t) => ({
        crisis: t.crisis,
        playerMove: t.playerMove,
        grammarOutput: t.grammarOutput,
      }));
      const grammarOutput = await withSpinner(reader, 'Interpreting your move', () =>
        interpret({
          crisis,
          state: { ...state },
          playerMove,
          turnHistory,
        }),
      );

      // 5. Apply delta
      const stateAfter = applyDelta(state, grammarOutput.state_delta);

      // 6. Check collapse
      collapse = checkCollapse(stateAfter, turn);
      if (collapse) {
        outcome = collapse.type;
      }

      // 7. Record turn (with full advisor response if applicable)
      turns.push({
        turn,
        crisis,
        playerMove,
        grammarOutput,
        stateBefore: state,
        stateAfter,
        collapse,
        advisorUsed,
        advisorFullResponse,
      });

      state = stateAfter;

      if (collapse) {
        console.log('');
        console.log('  ─── Collapse ───');
        console.log(`  ${collapse.type} on turn ${turn}.`);
        break;
      }
    }

    if (!collapse && outcome === 'no-collapse') {
      console.log('');
      console.log('  ─── Run complete ───');
      console.log('  You reached the end without collapse.');
    }
  } finally {
    reader.close();
  }

  // Build result and generate artifact
  const endedAt = new Date().toISOString();

  const result = {
    runId,
    startedAt,
    endedAt,
    model,
    outcome,
    turnsCompleted: turn,
    turns,
    finalState: state,
  };

  console.log('');
  console.log('  ─── Generating artifact ───');
  const artifact = generateArtifact(result);
  const runLog = buildRunLog(result);
  const outputDir = path.join(ROOT_DIR, 'runs');
  fs.mkdirSync(outputDir, { recursive: true });
  const runLogPath = path.join(outputDir, `${runId}.md`);
  const artifactPath = path.join(outputDir, `${runId}-artifact.md`);
  fs.writeFileSync(runLogPath, runLog);
  fs.writeFileSync(artifactPath, artifact);
  const htmlPath = path.join(outputDir, `${runId}-artifact.html`);
  const html = renderArtifactHtml(artifact, {
    runId,
    model,
    outcome,
    hashOf: runLog,
  });
  fs.writeFileSync(htmlPath, html);
  console.log(`  Run log:    ${runLogPath}`);
  console.log(`  Artifact:   ${artifactPath} (${(artifact.length / 1024).toFixed(1)} KB markdown)`);
  console.log(`  Shareable:  ${htmlPath} (self-contained HTML, ${(html.length / 1024).toFixed(1)} KB)`);

  return result;
}

function buildRunLog(result) {
  // The run log retains the full record (everything that happened during play)
  // so the artifact generator and run-query tool can reconstruct the trajectory.
  // The player just doesn't see all this during the play loop.
  const lines = [];
  lines.push('---');
  lines.push(`run_id: "${result.runId}"`);
  lines.push(`started_at: "${result.startedAt}"`);
  lines.push(`ended_at: "${result.endedAt}"`);
  lines.push(`model: "${result.model}"`);
  lines.push(`outcome: "${result.outcome}"`);
  lines.push(`turns_completed: ${result.turnsCompleted}`);
  lines.push('---');
  lines.push('');
  lines.push('# Run log');
  lines.push('');
  for (const turn of result.turns) {
    lines.push(`## Turn ${turn.turn}`);
    lines.push('');
    lines.push('### Crisis');
    lines.push('');
    lines.push(`**${turn.crisis.title}** (failure pattern: ${turn.crisis.failure_pattern})`);
    lines.push('');
    lines.push('**Situation:** ' + turn.crisis.situation);
    lines.push('');
    lines.push('**Pressure:** ' + turn.crisis.pressure);
    lines.push('');
    lines.push('**Decision point:** ' + turn.crisis.decision_point);
    lines.push('');
    if (turn.advisorUsed) {
      lines.push('### Advisor consulted: ' + turn.advisorUsed);
      lines.push('');
      if (turn.advisorFullResponse) {
        lines.push(turn.advisorFullResponse);
        lines.push('');
      }
    }
    lines.push('### Player move');
    lines.push('');
    lines.push(turn.playerMove);
    lines.push('');
    lines.push('### Grammar output');
    lines.push('');
    lines.push('**state_delta:**');
    for (const [axis, value] of Object.entries(turn.grammarOutput.state_delta)) {
      if (value !== 0) {
        const sign = value > 0 ? '+' : '';
        lines.push(`  - ${axis}: ${sign}${value}`);
      }
    }
    lines.push('');
    lines.push(`**interpretive_gloss:** ${turn.grammarOutput.interpretive_gloss}`);
    lines.push('');
    lines.push(`**narrative_move:** ${turn.grammarOutput.narrative_move}`);
    lines.push('');
    lines.push('**grounding_trace:**');
    for (const p of turn.grammarOutput.grounding_trace) {
      lines.push(`- \`${p}\``);
    }
    lines.push('');
    lines.push(`**confidence:** ${turn.grammarOutput.confidence}`);
    lines.push('');
    lines.push('### State after turn');
    lines.push('');
    for (const [axis, info] of Object.entries(withBands(turn.stateAfter))) {
      lines.push(`- ${axis}: ${info.value} (${info.band})`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

module.exports = { runInteractive, withSpinner, createReader };

if (require.main === module) {
  runInteractive().catch((err) => {
    console.error(`Simulation error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });
}
