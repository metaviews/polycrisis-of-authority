'use strict';

/**
 * run-async.js
 *
 * The async simulation loop using the real grammar. Cycle 2d.
 *
 * Differences from run.js:
 * - async/await throughout
 * - real grammar.js call instead of mock
 * - accepts an array of pre-scripted player moves (one per turn)
 *   OR a function that returns moves on demand
 *
 * Output: a complete run log including the actual grammar output
 * (interpretive glosses, narrative moves, grounding traces).
 */

const fs = require('fs');
const path = require('path');
const { INITIAL_STATE, applyDelta, checkCollapse, withBands, bandFor } = require('./state');
const { selectCrisis } = require('./crisis-generator');
const { interpret } = require('./grammar');

function generateRunId() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:T]/g, '').replace(/\..+/, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${rand}`;
}

function formatTurnSection(turnNum, crisis, playerMove, grammarOutput, stateBefore, stateAfter) {
  const lines = [];
  lines.push(`## Turn ${turnNum}`);
  lines.push('');
  lines.push('### Crisis');
  lines.push('');
  lines.push(`**${crisis.title}** (failure pattern: ${crisis.failure_pattern})`);
  lines.push('');
  lines.push(crisis.trigger);
  lines.push('');
  lines.push('### Player move');
  lines.push('');
  lines.push(playerMove);
  lines.push('');
  lines.push('### Grammar output');
  lines.push('');
  lines.push('**state_delta:**');
  for (const [axis, value] of Object.entries(grammarOutput.state_delta)) {
    if (value !== 0) {
      const sign = value > 0 ? '+' : '';
      lines.push(`  - ${axis}: ${sign}${value}`);
    } else {
      lines.push(`  - ${axis}: 0`);
    }
  }
  lines.push('');
  lines.push(`**interpretive_gloss:** ${grammarOutput.interpretive_gloss}`);
  lines.push('');
  lines.push(`**narrative_move:** ${grammarOutput.narrative_move}`);
  lines.push('');
  lines.push('**grounding_trace:**');
  for (const path of grammarOutput.grounding_trace) {
    lines.push(`- \`${path}\``);
  }
  lines.push('');
  lines.push(`**confidence:** ${grammarOutput.confidence}`);
  lines.push('');
  lines.push('### State after turn');
  lines.push('');
  for (const [axis, info] of Object.entries(withBands(stateAfter))) {
    lines.push(`- ${axis}: ${info.value} (${info.band})`);
  }
  lines.push('');
  return lines.join('\n');
}

function formatRunLog({ runId, startedAt, endedAt, model, modelVersion, wikiVersion, outcome, turns, turnsCompleted }) {
  const lines = [];
  lines.push('---');
  lines.push(`run_id: "${runId}"`);
  lines.push(`started_at: "${startedAt}"`);
  lines.push(`ended_at: "${endedAt}"`);
  lines.push(`model: "${model}"`);
  lines.push(`model_version: "${modelVersion}"`);
  lines.push(`wiki_version: "${wikiVersion}"`);
  lines.push(`wiki_index_version: "${wikiVersion}"`);
  lines.push(`fallback_used: false`);
  lines.push(`outcome: "${outcome}"`);
  lines.push(`turns_completed: ${turnsCompleted}`);
  lines.push('---');
  lines.push('');
  lines.push('# Run log');
  lines.push('');
  for (const turn of turns) {
    lines.push(formatTurnSection(turn.turn, turn.crisis, turn.playerMove, turn.grammarOutput, turn.stateBefore, turn.stateAfter));
  }
  if (outcome !== 'no-collapse') {
    lines.push('## Collapse');
    lines.push('');
    lines.push(`- **Type:** ${outcome}`);
    lines.push(`- **Trigger turn:** ${turnsCompleted}`);
    const lastTurn = turns[turns.length - 1];
    lines.push(`- **Conditions met:** ${JSON.stringify(lastTurn.collapse?.conditions || {})}`);
    lines.push('- **Final state vector:**');
    for (const [axis, info] of Object.entries(withBands(lastTurn.stateAfter))) {
      lines.push(`  - ${axis}: ${info.value} (${info.band})`);
    }
  }
  return lines.join('\n');
}

async function runSimulationAsync({
  maxTurns = 14,
  model = process.env.OPENROUTER_MODEL || 'minimax/minimax-m3',
  playerMoves, // array of strings, one per turn
  onTurnStart = null, // callback(turnNum, crisis, stateBefore)
  onTurnEnd = null, // callback(turnNum, crisis, playerMove, grammarOutput, stateAfter)
} = {}) {
  if (!Array.isArray(playerMoves) || playerMoves.length === 0) {
    throw new Error('runSimulationAsync requires playerMoves array');
  }

  const runId = generateRunId();
  const startedAt = new Date().toISOString();

  let state = { ...INITIAL_STATE };
  let turn = 0;
  const usedCrisisIds = [];
  const turns = [];
  const log = [];
  let outcome = 'no-collapse';
  let collapse = null;

  while (turn < maxTurns) {
    turn += 1;

    // 1. Select crisis
    const crisis = selectCrisis({ state, turn, usedIds: usedCrisisIds });
    usedCrisisIds.push(crisis.id);

    // 2. Notify start
    if (onTurnStart) {
      onTurnStart(turn, crisis, { ...state });
    }

    // 3. Player move
    const playerMove = playerMoves[turn - 1] || playerMoves[playerMoves.length - 1];
    if (!playerMove) {
      throw new Error(`No player move available for turn ${turn}`);
    }

    // 4. Call real grammar (async)
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

    // 5. Apply delta
    const stateAfter = applyDelta(state, grammarOutput.state_delta);

    // 6. Check collapse (after applying delta, starting at turn 8)
    collapse = checkCollapse(stateAfter, turn);
    if (collapse) {
      outcome = collapse.type;
    }

    // 7. Log turn
    const turnRecord = {
      turn,
      crisis,
      playerMove,
      grammarOutput,
      stateBefore: state,
      stateAfter,
      collapse,
    };
    turns.push(turnRecord);

    // 8. Notify end
    if (onTurnEnd) {
      onTurnEnd(turn, crisis, playerMove, grammarOutput, stateAfter);
    }

    state = stateAfter;

    if (collapse) {
      break;
    }
  }

  const endedAt = new Date().toISOString();

  const runLog = formatRunLog({
    runId,
    startedAt,
    endedAt,
    model,
    modelVersion: model,
    wikiVersion: 'current',
    outcome,
    turns,
    turnsCompleted: turn,
  });

  return {
    runId,
    startedAt,
    endedAt,
    model,
    outcome,
    turnsCompleted: turn,
    turns,
    finalState: state,
    runLog,
  };
}

function writeRunLog(result, outputDir = './runs') {
  fs.mkdirSync(outputDir, { recursive: true });
  const filename = `${result.runId}.md`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, result.runLog);
  return filepath;
}

function writeArtifact(result, outputDir = './runs') {
  fs.mkdirSync(outputDir, { recursive: true });
  const { generateArtifact } = require('./artifact-generator');
  const { renderArtifactHtml } = require('./artifact-render');
  const md = generateArtifact(result);
  const mdPath = path.join(outputDir, `${result.runId}-artifact.md`);
  fs.writeFileSync(mdPath, md);
  // Self-contained HTML for distribution per docs/09-artifact-template.md
  const html = renderArtifactHtml(md, {
    runId: result.runId,
    model: result.model,
    outcome: result.outcome,
    hashOf: result.runLog,
  });
  const htmlPath = path.join(outputDir, `${result.runId}-artifact.html`);
  fs.writeFileSync(htmlPath, html);
  return { mdPath, htmlPath };
}

module.exports = {
  runSimulationAsync,
  writeRunLog,
  writeArtifact,
  generateRunId,
};