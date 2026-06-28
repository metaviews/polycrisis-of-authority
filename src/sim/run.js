'use strict';

/**
 * run.js
 *
 * The simulation's run loop. Per wiki/mechanics/run-log-format.md
 * and the artifact template spec.
 *
 * For 2b (skeleton), the loop uses the mock LLM. Cycle 2c will swap in
 * the real grammar per docs/07-interpretation-grammar.md.
 */

const fs = require('fs');
const path = require('path');
const { INITIAL_STATE, applyDelta, checkCollapse, formatState, withBands } = require('./state');
const { selectCrisis, CRISIS_DECK } = require('./crisis-generator');
const { mockLLM } = require('./mock-llm');

function generateRunId() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:T]/g, '').replace(/\..+/, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${rand}`;
}

function runIdToTitle(runId) {
  return runId.replace(/[-:T]/g, '-');
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
    }
  }
  lines.push('');
  lines.push(`**interpretive_gloss:** ${grammarOutput.interpretive_gloss}`);
  lines.push('');
  lines.push(`**narrative_move:** ${grammarOutput.narrative_move}`);
  lines.push('');
  lines.push(`**grounding_trace:** ${grammarOutput.grounding_trace.join(', ')}`);
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

function formatRunLog({ runId, startedAt, endedAt, model, wikiVersion, outcome, turns, turnsCompleted, log }) {
  const lines = [];
  lines.push('---');
  lines.push(`run_id: "${runId}"`);
  lines.push(`started_at: "${startedAt}"`);
  lines.push(`ended_at: "${endedAt}"`);
  lines.push(`model: "${model}"`);
  lines.push(`model_version: "skeleton-mock-llm"`);
  lines.push(`wiki_version: "skeleton"`);
  lines.push(`wiki_index_version: "skeleton"`);
  lines.push(`fallback_used: false`);
  lines.push(`outcome: "${outcome}"`);
  lines.push(`turns_completed: ${turnsCompleted}`);
  lines.push('---');
  lines.push('');
  lines.push('# Run log');
  lines.push('');
  for (const section of log) {
    lines.push(section);
    lines.push('');
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

function generatePlayerMove(turnNum, crisis, state) {
  // For 2b skeleton: simulate a player who always tries to address the
  // upstream conditions. This is the "good player" archetype that
  // produces the most pedagogically interesting deltas.
  const move = `Turn ${turnNum}: We need to address the upstream conditions here. The structural response — including training-data transparency, evaluation reform, and sustained engagement — is what the corpus analysis suggests will actually work. Let me convene a working group with allied regulators and civil society to draft a framework that addresses the root cause, not just the visible incident.`;

  // Vary the move per crisis to test the mock's response
  if (crisis.id === 'crisis-3' || crisis.id === 'crisis-4') {
    return `Turn ${turnNum}: We should engage with the compute and infrastructure dimensions directly. Compute reporting requirements, allied coordination on chip access, and sustained investment in domestic capacity. The capability shift is real and we need substantive infrastructure response.`;
  }
  if (crisis.id === 'crisis-7' || crisis.id === 'crisis-8') {
    return `Turn ${turnNum}: This is a narrative problem before it's a policy problem. Media diversity requirements, public-interest media support, and platform accountability. The structural conditions that make narrative capture possible need addressing.`;
  }
  return move;
}

function runSimulation({ maxTurns = 14, model = 'minimax/minimax-m3' } = {}) {
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

    // 2. Generate player move (in 2b, simulated; in 2c, read from stdin)
    const playerMove = generatePlayerMove(turn, crisis, state);

    // 3. Call mock LLM
    const grammarOutput = mockLLM(crisis, playerMove, state);

    // 4. Apply delta
    const stateAfter = applyDelta(state, grammarOutput.state_delta);

    // 5. Check collapse (after applying delta, starting at turn 8)
    collapse = checkCollapse(stateAfter, turn);
    if (collapse) {
      outcome = collapse.type;
    }

    // 6. Log turn
    const section = formatTurnSection(turn, crisis, playerMove, grammarOutput, state, stateAfter);
    log.push(section);
    turns.push({ turn, crisis, playerMove, grammarOutput, stateBefore: state, stateAfter, collapse });

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
    wikiVersion: 'skeleton',
    outcome,
    turns,
    turnsCompleted: turn,
    log,
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

module.exports = {
  runSimulation,
  writeRunLog,
};
