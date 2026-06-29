'use strict';

/**
 * interactive.js
 *
 * The interactive CLI for Polycrisis of Authority. Cycle 3a.
 *
 * This is the player experience: turn-based, terminal-native, real-time.
 * Each turn:
 *   1. State vector is shown.
 *   2. Crisis is presented.
 *   3. Player chooses: write policy OR consult an advisor (easy mode).
 *   4. Player provides the move.
 *   5. Comedic interlude displays during LLM wait.
 *   6. System interpretation reveals (gloss, narrative, delta).
 *   7. State updates.
 *   8. Move to next turn or collapse.
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
const { selectInterlude, formatInterlude } = require('./interlude');
const { formatStateBlock, formatStateCompact, formatDeltaBlock, formatVisibleSignalsDisplay } = require('./state-display');
const { section, subsection, indent, wrap, numberedChoice, pause } = require('./cli-format');

const ROOT_DIR = path.join(__dirname, '..', '..');

function generateRunId() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:T]/g, '').replace(/\..+/, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${rand}`;
}

// Input reader that works for both TTY and piped stdin.
// Uses readline for TTY, line-by-line for piped.
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
      prompt: (question) => new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer));
      }),
      promptMultiLine: (headerQuestion) => new Promise((resolve) => {
        const lines = [];
        rl.question(headerQuestion + '\n', () => {});
        // Switch to line-by-line mode for multi-line
        const onLine = (line) => {
          if (line === '') {
            rl.removeListener('line', onLine);
            resolve(lines.join('\n').trim());
          } else {
            lines.push(line);
          }
        };
        rl.on('line', onLine);
      }),
      close: () => reader.close(),
    };
  }

  // Piped mode: read stdin line-by-line synchronously
  const lines = fs.readFileSync(0, 'utf8').split('\n');
  let cursor = 0;

  return {
    isTTY: false,
    prompt: async (question) => {
      process.stdout.write(question);
      const line = lines[cursor++] || '';
      return line;
    },
    promptMultiLine: async () => {
      const collected = [];
      while (cursor < lines.length) {
        const line = lines[cursor++];
        if (line === '') break;
        collected.push(line);
      }
      return collected.join('\n').trim();
    },
    close: () => {},
  };
}

function displayState(state, label = 'CURRENT STATE', { hiddenHistory = [], turn = 1, stateBefore = null } = {}) {
  console.log(section(label));
  console.log(formatVisibleSignalsDisplay({
    hiddenState: state,
    hiddenHistory,
    turn,
    stateBefore: stateBefore || state,
  }));
}

function displayPreviousTurnSummary(turn) {
  if (!turn) return;
  console.log(subsection(`RECENT — Turn ${turn.turn}`));
  console.log(`  Crisis: ${turn.crisis.title}`);
  console.log(`  Move: ${turn.playerMove.split('\n')[0].slice(0, 70)}${turn.playerMove.length > 70 ? '...' : ''}`);
  console.log(`  Heard: ${turn.grammarOutput.interpretive_gloss.slice(0, 120)}${turn.grammarOutput.interpretive_gloss.length > 120 ? '...' : ''}`);
  // Show the delta that was applied
  const deltas = [];
  for (const [axis, value] of Object.entries(turn.grammarOutput.state_delta)) {
    if (value !== 0) {
      const sign = value > 0 ? '+' : '';
      deltas.push(`${axis.replace('_', ' ')}: ${sign}${value}`);
    }
  }
  if (deltas.length > 0) {
    console.log(`  State Δ applied: ${deltas.join(', ')}`);
  }
}

function displayCrisis(crisis, turn) {
  console.log(section(`TURN ${turn}`));
  console.log(`  Crisis:   ${crisis.title}`);
  console.log(`  Pattern:  ${crisis.failure_pattern}`);
  console.log(`  Trigger:  ${crisis.trigger_kind}`);
  console.log('');
  console.log(indent(wrap(crisis.trigger, 68), 2));
}

function displayAdvisorResponse(voice, response) {
  console.log(subsection(`Advisor: ${voice}`));
  console.log(indent(wrap(response, 68), 2));
}

function displayInterlude(signal) {
  const formatted = formatInterlude(signal);
  if (formatted) {
    console.log(`\n  · ${formatted}\n`);
  }
}

function displaySystemResponse(grammarOutput, stateAfter) {
  console.log(section('SYSTEM INTERPRETATION'));

  console.log(subsection('The system heard'));
  console.log(indent(wrap(grammarOutput.interpretive_gloss, 68), 2));

  console.log(subsection('What happens next'));
  console.log(indent(wrap(grammarOutput.narrative_move, 68), 2));

  console.log(subsection('State changes'));
  console.log(formatDeltaBlock(grammarOutput.state_delta));

  console.log(subsection('After this turn'));
  console.log(formatStateBlock(stateAfter));

  console.log(subsection('Sources the model drew on'));
  for (const path of grammarOutput.grounding_trace) {
    console.log(`  · ${path}`);
  }

  console.log(subsection('Confidence'));
  console.log(`  ${grammarOutput.confidence}`);
}

function displayCollapse(collapse, turn) {
  console.log(section('COLLAPSE'));
  console.log(`  Collapse fired: ${collapse.type}`);
  console.log(`  Trigger turn:   ${turn}`);
  console.log('');
  console.log('  Conditions:');
  for (const [k, v] of Object.entries(collapse.conditions)) {
    console.log(`    ${k}: ${v}`);
  }
}

async function runInteractive({ maxTurns = 14, model = process.env.OPENROUTER_MODEL || 'minimax/minimax-m3' } = {}) {
  const runId = generateRunId();
  const startedAt = new Date().toISOString();

  console.log(section('POLYCRISIS OF AUTHORITY'));
  console.log('  Simulation begins.');
  console.log(`  Model: ${model}`);
  console.log(`  Run ID: ${runId}`);
  console.log('');
  console.log('  You are in power. Crisis will come.');
  console.log('  Type your policy in response, or consult an advisor for a quick take.');
  console.log('');

  const reader = createReader();

  let state = { ...INITIAL_STATE };
  let turn = 0;
  const usedCrisisIds = [];
  const usedInterludeFilenames = [];
  const turns = [];
  let outcome = 'no-collapse';
  let collapse = null;

  try {
    while (turn < maxTurns) {
      turn += 1;

      // 1. Select crisis
      const crisis = selectCrisis({ state, turn, usedIds: usedCrisisIds });
      usedCrisisIds.push(crisis.id);

      // 2. Display previous turn summary (if any), state, then crisis
      // The "previousState" for the delta display is the state at the END
      // of the previous turn. For turn 1, there's no previous state, so
      // pass null to suppress the delta display.
      displayPreviousTurnSummary(turns.length > 0 ? turns[turns.length - 1] : null);
      // Visible signal display: shows the three named signals per axis
      // (deliberately unreliable per Principle 3.2). The hidden value
      // is not shown during play — that's the literacy device.
      // History of hidden states feeds the lag-based signals.
      displayState(state, `STATE BEFORE TURN ${turn}`, {
        hiddenHistory: turns.map((t) => t.stateBefore),
        turn,
        stateBefore: state,
      });
      displayCrisis(crisis, turn);

      // 3. Player chooses: write own policy OR consult advisor
      const choices = [
        { key: '0', label: 'Write your own policy response (literacy mode)' },
        ...ADVISOR_VOICES.map((voice, i) => ({
          key: String(i + 1),
          label: `Consult the ${voice} advisor (easy mode)`,
        })),
      ];
      const choiceAnswer = await reader.prompt( numberedChoice('  Your move:', choices));
      const choice = choiceAnswer.trim();

      let playerMove = null;
      let advisorUsed = null;

      if (choice === '0' || choice === '') {
        // Literacy mode: player writes
        console.log(section('YOUR POLICY RESPONSE'));
        console.log('  Type your response. End with a blank line when done.');
        console.log('');
        playerMove = await reader.promptMultiLine('  > ');
        if (!playerMove) {
          console.log('  (Empty response — using a brief acknowledgment.)');
          playerMove = '[silence]';
        }
      } else {
        const idx = parseInt(choice, 10) - 1;
        if (idx >= 0 && idx < ADVISOR_VOICES.length) {
          // Easy mode: advisor consulted
          advisorUsed = ADVISOR_VOICES[idx];
          console.log(section(`CONSULTING ADVISOR: ${advisorUsed.toUpperCase()}`));
          console.log('  The system is reaching the advisor...');

          const interludeBeforeAdvisor = selectInterlude({ turnNumber: turn, usedFilenames: usedInterludeFilenames });
          displayInterlude(interludeBeforeAdvisor);
          if (interludeBeforeAdvisor) usedInterludeFilenames.push(interludeBeforeAdvisor.filename);

          const advisorResponse = await consult({
            voice: advisorUsed,
            crisis,
            state: { ...state },
            playerMove: playerMove || '[no player move yet — advisor speaking first]',
          });
          displayAdvisorResponse(advisorUsed, advisorResponse);

          // Easy mode: the advisor's response IS the move
          // (player can commit or rewrite)
          console.log('');
          const commit = await reader.prompt('  Use this advisor take as your policy move? [y/n, default y] > ');
          if (commit.trim() === 'n') {
            console.log('  (Rewriting your own...)');
            playerMove = await reader.promptMultiLine('  > ');
          } else {
            playerMove = `[${advisorUsed} advisor]: ${advisorResponse}`;
          }
        } else {
          console.log('  (Invalid choice — defaulting to your own policy.)');
          playerMove = await reader.promptMultiLine('  > ');
        }
      }

      // 4. Comedic interlude during LLM wait
      const interlude = selectInterlude({ turnNumber: turn, usedFilenames: usedInterludeFilenames });
      if (interlude) usedInterludeFilenames.push(interlude.filename);

      console.log(section('SYSTEM RESPONDING'));
      console.log('  The system is interpreting your move...');
      displayInterlude(interlude);

      // 5. Real grammar call (async)
      const turnHistory = turns.slice(-5).map((t) => ({
        crisis: t.crisis,
        playerMove: t.playerMove,
        grammarOutput: t.grammarOutput,
      }));
      const grammarOutput = await interpret({
        crisis,
        state: { ...state },
        playerMove,
        turnHistory,
      });

      // 6. Apply delta
      const stateAfter = applyDelta(state, grammarOutput.state_delta);

      // 7. Check collapse
      collapse = checkCollapse(stateAfter, turn);
      if (collapse) {
        outcome = collapse.type;
      }

      // 8. Record turn
      turns.push({
        turn,
        crisis,
        playerMove,
        grammarOutput,
        stateBefore: state,
        stateAfter,
        collapse,
        advisorUsed,
      });

      state = stateAfter;

      // 9. Display system response
      displaySystemResponse(grammarOutput, stateAfter);

      if (collapse) {
        displayCollapse(collapse, turn);
        break;
      }

      // Continue
      const continueAnswer = await reader.prompt( '\n  Press Enter to continue (or "q" to quit)... ');
      if (continueAnswer.trim() === 'q') {
        outcome = 'player-quit';
        break;
      }
    }

    if (!collapse && outcome === 'no-collapse') {
      console.log(section('RUN COMPLETE'));
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

  console.log(section('GENERATING ARTIFACT'));
  const artifact = generateArtifact(result);
  const runLog = buildRunLog(result);
  const outputDir = path.join(ROOT_DIR, 'runs');
  fs.mkdirSync(outputDir, { recursive: true });
  const runLogPath = path.join(outputDir, `${runId}.md`);
  const artifactPath = path.join(outputDir, `${runId}-artifact.md`);
  fs.writeFileSync(runLogPath, runLog);
  fs.writeFileSync(artifactPath, artifact);
  // Self-contained HTML for distribution per docs/09-artifact-template.md
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
  // Reuse the run log format from run-async.js
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
  lines.push('# Run log (interactive)');
  lines.push('');
  for (const turn of result.turns) {
    lines.push(`## Turn ${turn.turn}`);
    lines.push('');
    lines.push(`### Crisis`);
    lines.push('');
    lines.push(`**${turn.crisis.title}** (failure pattern: ${turn.crisis.failure_pattern})`);
    lines.push('');
    lines.push(turn.crisis.trigger);
    lines.push('');
    if (turn.advisorUsed) {
      lines.push(`### Advisor consulted: ${turn.advisorUsed}`);
      lines.push('');
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

module.exports = { runInteractive };

if (require.main === module) {
  runInteractive().catch((err) => {
    console.error(`Simulation error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });
}