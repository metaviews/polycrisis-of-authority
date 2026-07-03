'use strict';

/**
 * post-game-narrator.js
 *
 * Cycle 5e. The post-game narrator. After a run ends (collapse,
 * stabilization, or max-turns), this module produces an end-of-run report
 * for the player:
 *
 *   - one-line outcome summary ("Your regime fell to legitimacy collapse
 *     on turn 6.")
 *   - 3-5 sentence narrative of how the run went ("You opened with a
 *     60-day review, which bought time but didn't address the upstream
 *     conditions. The press treated your summit as theater...")
 *   - the final state (6 axes with bands)
 *   - the key moment (highest-impact single move, or the move before collapse)
 *   - a one-line invitation to play again
 *
 * The narrative is LLM-generated (one LLM call at run end). If the LLM
 * call fails, falls back to a hand-built summary that uses the run log
 * mechanically (no prose, just the data).
 */

const fs = require('fs');
const path = require('path');
const { loadEnv, createClient } = require('../../scripts/lib/openrouter');
const { parseWikiIndex, readSelectedPages } = require('../../scripts/wiki-query');

const ROOT_DIR = path.join(__dirname, '..', '..');
const WIKI_DIR = path.join(ROOT_DIR, 'wiki');
const INDEX_PATH = path.join(ROOT_DIR, 'wiki/index.md');

const VALID_AXES = ['legitimacy', 'fiscal_slack', 'elite_alignment', 'ecological_debt', 'narrative_coherence', 'capability_frontier'];
const AXIS_LABELS = {
  legitimacy: 'Legitimacy',
  fiscal_slack: 'Fiscal slack',
  elite_alignment: 'Elite alignment',
  ecological_debt: 'Ecological debt',
  narrative_coherence: 'Narrative coherence',
  capability_frontier: 'Capability frontier',
};

function buildNarratorSystemPrompt(identity = null) {
  // The narrator's role: produce an end-of-run report that leaves the
  // player wanting to play again (Principle 6). The litmus test outcome
  // depends on this report's quality.
  const player = identity ? identity.player : 'the player';
  const regime = identity ? identity.regime : 'the regime';
  return `You are the post-game narrator for the Polycrisis of Authority simulation. The player's run has ended. Your job is to write a brief end-of-run report that captures what just happened.

PLAYER AND REGIME (cycle 5h):
- The player is called "${player}".
- The institution they governed was "${regime}".
- Refer to them by name in the outcome_line, narrative, key_moment, and invitation. "Your ${regime} fell to..." reads better than "Your regime fell to...". If both names are the default ("the player" / "the regime"), you may use them as-is or rephrase.

CRITICAL RULES:
1. Output ONLY valid JSON matching the schema below. No prose outside the JSON.
2. The "narrative" field is your primary output. It should be 3-5 sentences, written in accessible register (short sentences, concrete actors, active voice — same as the world generator).
3. The narrative should make the run feel like a story, not a debrief. The player should want to start another run after reading it.
4. Reference specific moves the player made (use a verb or noun from their move in your narrative).
5. Reference specific events that happened (the prior turn narratives are provided in the user prompt).
6. If the run ended in collapse, name what caused the collapse. Don't be euphemistic.
7. If the run ended in stabilization, name what held.

OUTPUT SCHEMA:
{
  "outcome_line": "<one sentence. What happened, when, and why.>",
  "narrative": "<3-5 sentences. Accessible register. The story of the run.>",
  "key_moment": "<1-2 sentences. The single move that mattered most, or the moment the run turned.>",
  "invitation": "<1 sentence. The player-facing line that closes the report — should make them want to play again.>"
}`;
}

function buildNarratorUserPrompt({ outcome, turnsCompleted, finalState, turns, collapse, identity = null }) {
  const player = identity ? identity.player : null;
  const regime = identity ? identity.regime : 'the regime';
  const stateVector = Object.entries(finalState)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  // Compact history: each turn's player move + the world's narrative response.
  // The narrator weaves these into the story.
  const historySection = turns.map((turn, i) =>
    `  Turn ${i + 1}: Player wrote: "${turn.playerMove.slice(0, 200)}${turn.playerMove.length > 200 ? '...' : ''}". World responded: "${(turn.world?.narrative || turn.grammarOutput?.interpretive_gloss || '').slice(0, 200)}${turn.world?.narrative?.length > 200 ? '...' : ''}"`
  ).join('\n');

  let outcomeContext = '';
  if (outcome === 'player-quit') {
    // Cycle 5j: player resigned mid-run. The regime did not fall; the
    // player disengaged. The narrator should describe what was happening
    // at the moment of resignation without framing it as collapse.
    outcomeContext = `${player || 'The player'} resigned from ${regime} on turn ${turnsCompleted}. The simulation did not reach a collapse condition, stabilization, or the 30-turn cap. The state at resignation is captured below.`;
  } else if (collapse) {
    outcomeContext = `The run ended in collapse (${collapse.type}) on turn ${turnsCompleted}. The collapse conditions were: ${JSON.stringify(collapse.conditions)}.`;
  } else if (outcome === 'stabilized') {
    outcomeContext = `The run ended in stabilization — the regime held its posture for 5 consecutive turns in the holding/strained band on all axes. The player successfully governed through ${turnsCompleted} turns.`;
  } else {
    outcomeContext = `The run ended after ${turnsCompleted} turns without collapse or stabilization. The simulation has a 30-turn runaway cap that the run reached.`;
  }

  return `${outcomeContext}

FINAL STATE VECTOR:
${stateVector}

TURN-BY-TURN HISTORY:
${historySection}

Produce the JSON output now. The narrative should reference specific moves the player made and specific events that happened. The invitation should make the player want to start another run.`;
}

function buildHandBuiltSummary({ outcome, turnsCompleted, finalState, collapse, turns, identity = null }) {
  // Fallback when the LLM call fails. Mechanical — no prose.
  const regime = identity ? identity.regime : 'the regime';
  const player = identity ? identity.player : 'the player';
  let outcomeLine;
  if (outcome === 'player-quit') {
    // Cycle 5j: player resigned mid-run. Distinct prose from collapse or
    // stabilization — the regime did not fall; the player disengaged.
    outcomeLine = `${player} resigned from ${regime} after ${turnsCompleted} turn${turnsCompleted === 1 ? '' : 's'}.`;
  } else if (collapse) {
    outcomeLine = `Your ${regime} fell to ${collapse.type} on turn ${turnsCompleted}.`;
  } else if (outcome === 'stabilized') {
    outcomeLine = `Your ${regime} stabilized after ${turnsCompleted} turns.`;
  } else {
    outcomeLine = `The run ended after ${turnsCompleted} turns without collapse or stabilization.`;
  }

  // Build narrative from the turn-by-turn data we have.
  const turnsPlayed = turns.length;
  const lastMove = turns.length > 0 ? turns[turns.length - 1].playerMove : null;
  let narrative;
  if (turnsPlayed === 0 && outcome === 'player-quit') {
    // Player resigned without playing any turns (e.g. resignation
    // immediately after identity capture). Skip the "final move" line.
    narrative = `You resigned before writing any moves. The simulation never resolved.`;
  } else if (turnsPlayed === 0) {
    narrative = `You did not write any moves before the run ended.`;
  } else {
    narrative = `You governed for ${turnsPlayed} turn${turnsPlayed === 1 ? '' : 's'}. Your final move was: "${lastMove.slice(0, 200)}${lastMove.length > 200 ? '...' : ''}".`;
  }

  // Key moment: the move with the largest |delta| (or the move before collapse).
  let keyMoment = 'No key moment recorded.';
  let maxDelta = 0;
  let keyTurn = null;
  for (const turn of turns) {
    const totalDelta = Math.abs(Object.values(turn.grammarOutput?.state_delta || {}).reduce((s, v) => s + Math.abs(v), 0));
    if (totalDelta > maxDelta) {
      maxDelta = totalDelta;
      keyTurn = turn;
    }
  }
  if (keyTurn) {
    const totalDelta = Math.abs(Object.values(keyTurn.grammarOutput.state_delta).reduce((s, v) => s + Math.abs(v), 0));
    keyMoment = `Your highest-impact move was on turn ${keyTurn.turn} (total |delta|=${totalDelta}). You wrote: "${keyTurn.playerMove.slice(0, 150)}${keyTurn.playerMove.length > 150 ? '...' : ''}"`;
  }

  const invitation = 'Run the simulation again to see what changes with different choices.';

  return { outcome_line: outcomeLine, narrative, key_moment: keyMoment, invitation };
}

// Main entry: produce the end-of-run report. Returns the report object
// (or the hand-built summary if the LLM call fails).
async function narrateRunEnd({ outcome, turnsCompleted, finalState, turns, collapse, identity = null, model = process.env.OPENROUTER_MODEL, maxAttempts = 2 } = {}) {
  loadEnv(ROOT_DIR);

  const systemPrompt = buildNarratorSystemPrompt(identity);
  const userPrompt = buildNarratorUserPrompt({ outcome, turnsCompleted, finalState, turns, collapse, identity });

  const client = createClient({ title: 'Polycrisis Post-Game Narrator', temperature: 0.5 });

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    let response;
    try {
      response = await client.complete(messages, { temp: 0.5 });
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) continue;
      // Fall back to hand-built summary
      return { ...buildHandBuiltSummary({ outcome, turnsCompleted, finalState, collapse, turns, identity }), fallback: true };
    }

    let parsed = null;
    try {
      parsed = JSON.parse(response.trim());
    } catch (e1) {
      try {
        const jsonText = response
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```\s*$/i, '')
          .trim();
        parsed = JSON.parse(jsonText);
      } catch (e2) {
        try {
          const match = response.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        } catch (e3) {}
      }
    }

    if (parsed && parsed.narrative && parsed.outcome_line) {
      return {
        outcome_line: parsed.outcome_line,
        narrative: parsed.narrative,
        key_moment: parsed.key_moment || parsed.narrative,
        invitation: parsed.invitation || 'Run the simulation again to see what changes with different choices.',
        fallback: false,
      };
    }

    lastError = new Error('Could not parse narrator response');
    if (attempt < maxAttempts) continue;
  }

  return { ...buildHandBuiltSummary({ outcome, turnsCompleted, finalState, collapse, turns, identity }), fallback: true };
}

// Render the report for terminal display. Returns the formatted string.
function renderEndOfRunReport(report, { outcome, turnsCompleted, finalState, bands }) {
  const lines = [];
  lines.push('');
  lines.push('  ─── Run ended ───');
  lines.push('');
  lines.push('  ' + report.outcome_line);
  lines.push('');
  lines.push('  ' + report.narrative);
  lines.push('');
  if (report.key_moment) {
    lines.push('  Key moment:');
    lines.push('  ' + report.key_moment);
    lines.push('');
  }
  // Final state
  lines.push('  Final state:');
  for (const [axis, info] of Object.entries(bands)) {
    lines.push(`    ${AXIS_LABELS[axis]}: ${info.value} (${info.band})`);
  }
  lines.push('');
  lines.push('  ' + report.invitation);
  lines.push('');
  if (report.fallback) {
    lines.push('  (Note: narrator LLM call failed; using mechanical summary.)');
    lines.push('');
  }
  return lines.join('\n');
}

module.exports = {
  narrateRunEnd,
  renderEndOfRunReport,
  buildHandBuiltSummary,
};