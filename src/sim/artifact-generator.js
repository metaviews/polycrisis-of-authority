'use strict';

/**
 * artifact-generator.js
 *
 * Generates the 8-section shareable artifact from a run log.
 * Per docs/09-artifact-template.md and wiki/mechanics/artifact-template.md.
 *
 * Sections:
 *   1. Header
 *   2. Run summary (3-5 sentences)
 *   3. State trajectory (table per axis: start, end, max excursion, bands crossed)
 *   4. Crisis log (chronological)
 *   5. Interpretive chain (collapse turn + 2-3 key turns)
 *   6. Grounding references (sorted by frequency)
 *   7. Collapse reveal (if collapse fired)
 *   8. Play invitation (3 parts)
 */

const { AXIS_NAMES, bandFor } = require('./state');
const { buildDiscrepancyTimeline } = require('./visible-signals');

const AXIS_LABELS = {
  legitimacy: 'Legitimacy',
  fiscal_slack: 'Fiscal slack',
  elite_alignment: 'Elite alignment',
  ecological_debt: 'Ecological debt',
  narrative_coherence: 'Narrative coherence',
  capability_frontier: 'Capability frontier',
};

function formatHeader(runResult) {
  const lines = [];
  lines.push('# Polycrisis of Authority — Run report');
  lines.push('');
  lines.push(`**Run ID:** ${runResult.runId}`);
  lines.push(`**Date:** ${runResult.startedAt.slice(0, 10)}`);
  lines.push(`**Model:** ${runResult.model}`);
  lines.push(`**Outcome:** ${runResult.outcome}`);
  lines.push(`**Turns completed:** ${runResult.turnsCompleted}`);
  lines.push('');
  return lines.join('\n');
}

function formatRunSummary(runResult) {
  const lines = [];
  const turns = runResult.turns;
  const firstState = turns[0].stateBefore;
  const lastState = turns[turns.length - 1].stateAfter;
  const outcome = runResult.outcome;

  const openingDescriptor = describeStateOpening(firstState);
  const crisisCount = turns.length;
  const crisisList = turns.map((t) => `"${t.crisis.title}"`).join(', ');
  const outcomeDescriptor = outcome === 'no-collapse'
    ? `The simulation ran to completion (${runResult.turnsCompleted} turns) without triggering a collapse condition.`
    : `The simulation ended with ${outcome.replace(/-/g, ' ')} on turn ${runResult.turnsCompleted}.`;

  const closingDescriptor = describeStateClosing(lastState);

  lines.push('## Run summary');
  lines.push('');
  lines.push(`You governed for ${crisisCount} turns. The regime began in a ${openingDescriptor} position. Over the course of the run, you faced: ${crisisList}. ${outcomeDescriptor} The closing state was ${closingDescriptor}.`);
  lines.push('');
  return lines.join('\n');
}

function describeStateOpening(state) {
  const descriptors = [];
  if (state.legitimacy < 50) descriptors.push('strained legitimacy');
  if (state.elite_alignment < 50) descriptors.push('fragile elite alignment');
  if (state.narrative_coherence < 50) descriptors.push('competing narrative frames');
  if (state.ecological_debt > 50) descriptors.push('accumulating ecological debt');
  if (state.capability_frontier > 70) descriptors.push('an advanced capability frontier');
  if (descriptors.length === 0) return 'broadly stable';
  return descriptors.join(', ');
}

function describeStateClosing(state) {
  if (state.legitimacy < 20) return 'collapsed legitimacy';
  if (state.elite_alignment < 20) return 'collapsed elite alignment';
  if (state.narrative_coherence < 20) return 'collapsed narrative coherence';
  const descriptors = [];
  for (const axis of AXIS_NAMES) {
    const band = bandFor(state[axis]);
    if (band === 'eroded') descriptors.push(`${AXIS_LABELS[axis]} eroded`);
    if (band === 'collapsed') descriptors.push(`${AXIS_LABELS[axis]} collapsed`);
  }
  if (descriptors.length === 0) return 'broadly stable';
  return descriptors.join(', ');
}

function formatStateTrajectory(runResult) {
  const lines = [];
  lines.push('## State trajectory');
  lines.push('');
  lines.push('| Axis | Start | End | Max excursion | Bands crossed |');
  lines.push('|------|-------|-----|---------------|----------------|');
  for (const axis of AXIS_NAMES) {
    const startVal = runResult.turns[0].stateBefore[axis];
    const endVal = runResult.turns[runResult.turns.length - 1].stateAfter[axis];
    let minVal = startVal;
    let maxVal = startVal;
    const bandsCrossed = new Set([bandFor(startVal)]);
    for (const turn of runResult.turns) {
      const v = turn.stateAfter[axis];
      if (axis === 'ecological_debt') {
        // Ecological_debt: high values are bad
        maxVal = Math.max(maxVal, v);
        minVal = Math.min(minVal, v);
      } else {
        minVal = Math.min(minVal, v);
        maxVal = Math.max(maxVal, v);
      }
      bandsCrossed.add(bandFor(v));
    }
    const excursion = axis === 'ecological_debt' ? maxVal - minVal : minVal - startVal;
    const excursionStr = excursion === 0 ? '0' : `${excursion > 0 ? '+' : ''}${excursion}`;
    lines.push(`| ${AXIS_LABELS[axis]} | ${startVal} | ${endVal} | ${excursionStr} | ${[...bandsCrossed].join(' → ')} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function formatCrisisLog(runResult) {
  const lines = [];
  lines.push('## Crisis log');
  lines.push('');
  for (const turn of runResult.turns) {
    lines.push(`### Turn ${turn.turn}: ${turn.crisis.title}`);
    lines.push('');
    lines.push(`*Failure pattern: ${turn.crisis.failure_pattern}*`);
    lines.push('');
    // The crisis surfaced to the player as Situation / Pressure / Decision point.
    // The artifact retains the canonical play-loop prose for the audit record.
    if (turn.crisis.situation) {
      lines.push('**Situation.**');
      lines.push(turn.crisis.situation);
      lines.push('');
    }
    if (turn.crisis.pressure) {
      lines.push('**Pressure.**');
      lines.push(turn.crisis.pressure);
      lines.push('');
    }
    if (turn.crisis.decision_point) {
      lines.push('**Decision point.**');
      lines.push(turn.crisis.decision_point);
      lines.push('');
    }
    if (turn.advisorUsed) {
      lines.push(`*Advisor consulted: ${turn.advisorUsed}*`);
      lines.push('');
    }
    lines.push('**Player move (verbatim):**');
    lines.push(`> ${turn.playerMove}`);
    lines.push('');
    lines.push('**System interpretation:**');
    lines.push(`> ${turn.grammarOutput.interpretive_gloss}`);
    lines.push('');
    lines.push('**State delta:**');
    for (const [axis, value] of Object.entries(turn.grammarOutput.state_delta)) {
      if (value !== 0) {
        const sign = value > 0 ? '+' : '';
        lines.push(`- ${AXIS_LABELS[axis]}: ${sign}${value}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function formatInterpretiveChain(runResult) {
  const lines = [];
  lines.push('## Interpretive chain');
  lines.push('');
  lines.push('For the collapse turn (if any) and two other key turns, this section traces what the player wrote, what corpus the model retrieved, what the model heard, what the model did, and what happened next. This is the literacy device made concrete: a reader can follow the run from intent through interpretation to state change.');
  lines.push('');

  // Pick turns: collapse turn (if any) + first + middle
  const turns = runResult.turns;
  const collapseTurn = runResult.outcome !== 'no-collapse' ? turns[turns.length - 1] : null;
  const firstTurn = turns[0];
  const middleTurn = turns[Math.floor(turns.length / 2)];

  const selectedTurns = [];
  if (collapseTurn) selectedTurns.push(collapseTurn);
  if (firstTurn && (!collapseTurn || firstTurn.turn !== collapseTurn.turn)) {
    selectedTurns.push(firstTurn);
  }
  if (middleTurn && selectedTurns.length < 3) {
    selectedTurns.push(middleTurn);
  }
  // Deduplicate
  const seen = new Set();
  const uniqueTurns = selectedTurns.filter((t) => {
    if (seen.has(t.turn)) return false;
    seen.add(t.turn);
    return true;
  });

  for (const turn of uniqueTurns) {
    lines.push(`### Turn ${turn.turn}: ${turn.crisis.title}`);
    lines.push('');
    lines.push('**Player wrote:**');
    lines.push(`> ${turn.playerMove}`);
    lines.push('');
    lines.push('**Model knew (corpus retrieved):**');
    for (const path of turn.grammarOutput.grounding_trace) {
      lines.push(`- \`${path}\``);
    }
    lines.push('');
    lines.push('**Model heard (interpretive gloss):**');
    lines.push(`> ${turn.grammarOutput.interpretive_gloss}`);
    lines.push('');
    lines.push('**Model did (state delta):**');
    for (const [axis, value] of Object.entries(turn.grammarOutput.state_delta)) {
      if (value !== 0) {
        const sign = value > 0 ? '+' : '';
        lines.push(`- ${AXIS_LABELS[axis]}: ${sign}${value}`);
      }
    }
    lines.push('');
    lines.push('**Happened next (narrative move):**');
    lines.push(`> ${turn.grammarOutput.narrative_move}`);
    lines.push('');
  }

  return lines.join('\n');
}

function formatGroundingReferences(runResult) {
  const lines = [];
  lines.push('## Grounding references');
  lines.push('');
  lines.push('Wiki entries cited in this run, sorted by frequency. These are the corpus pages the model drew on to interpret your policy. Following them outward connects the run to the broader Metaviews corpus.');
  lines.push('');

  const refs = new Map();
  for (const turn of runResult.turns) {
    for (const path of turn.grammarOutput.grounding_trace) {
      refs.set(path, (refs.get(path) || 0) + 1);
    }
  }

  const sorted = [...refs.entries()].sort((a, b) => b[1] - a[1]);
  lines.push('| Wiki path | References |');
  lines.push('|-----------|------------|');
  for (const [path, count] of sorted) {
    lines.push(`| \`${path}\` | ${count} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function formatCollapseReveal(runResult) {
  const lines = [];
  lines.push('## Collapse reveal');
  lines.push('');

  // Player quit mid-run
  if (runResult.outcome === 'player-quit') {
    lines.push('You exited the simulation before completion. The conditions for any of the three collapse modes (legitimacy, technical, narrative capture) had not been met when you stopped.');
    lines.push('');
    lines.push('A player-quit is a kind of meta-collapse: the regime did not fall; the player chose to disengage. The hidden state at the moment of exit may have been drifting toward any of several trajectories, but the simulation never resolved.');
    lines.push('');
    lines.push('**Visible signals vs hidden value at exit:**');
    lines.push('');
    lines.push('| Axis | Hidden band | Visible bands (3 signals) | Discrepancy |');
    lines.push('|------|-------------|---------------------------|-------------|');
    const timeline = buildDiscrepancyTimeline(runResult.turns);
    const lastEntry = timeline[timeline.length - 1];
    for (const [axis, info] of Object.entries(lastEntry.perAxis)) {
      if (info.discrepancy >= 8) {
        const visibleBands = info.visibleBands.join(' / ');
        lines.push(`| ${AXIS_LABELS[axis]} | ${info.hiddenBand} | ${visibleBands} | ${info.discrepancy} pts |`);
      }
    }
    lines.push('');
    return lines.join('\n');
  }

  if (runResult.outcome === 'no-collapse') {
    lines.push('No collapse fired during this run. The simulation completed without the threshold conditions for any of the three collapse modes (legitimacy, technical, narrative capture) being met.');
    lines.push('');
    lines.push('This outcome is rarer than it might seem. Most runs that reach turn 12-14 see at least one axis enter an eroded or collapsed band, even when full collapse does not fire. Reaching the end of the run without collapse suggests that the policy moves made (or the failure patterns present in the crises faced) did not push the regime to a tipping point.');
    lines.push('');
    lines.push('**Visible signals vs hidden value at end of run:**');
    lines.push('');
    lines.push('| Axis | Hidden band | Visible bands (3 signals) | Discrepancy |');
    lines.push('|------|-------------|---------------------------|-------------|');
    const timeline = buildDiscrepancyTimeline(runResult.turns);
    const lastEntry = timeline[timeline.length - 1];
    for (const [axis, info] of Object.entries(lastEntry.perAxis)) {
      if (info.discrepancy >= 8) {
        const visibleBands = info.visibleBands.join(' / ');
        lines.push(`| ${AXIS_LABELS[axis]} | ${info.hiddenBand} | ${visibleBands} | ${info.discrepancy} pts |`);
      }
    }
    lines.push('');
    lines.push('The discrepancy column is the average point-distance between the visible signals and the hidden value. Even on runs that did not collapse, the visible signals reported a different band on at least one axis at the end of play. The literacy device holds across outcomes.');
    lines.push('');
    return lines.join('\n');
  }

  // Collapse fired
  const lastTurn = runResult.turns[runResult.turns.length - 1];
  lines.push(`Collapse fired as **${runResult.outcome.replace(/-/g, ' ')}** on turn ${runResult.turnsCompleted}.`);
  lines.push('');
  lines.push('**Conditions met:**');
  if (lastTurn.collapse && lastTurn.collapse.conditions) {
    for (const [k, v] of Object.entries(lastTurn.collapse.conditions)) {
      lines.push(`- ${AXIS_LABELS[k]}: ${v}`);
    }
  } else {
    lines.push('- (no specific condition recorded)');
  }
  lines.push('');
  lines.push('**Timeline of hidden shifts:**');
  lines.push('');
  lines.push('The collapse was not visible at the time of any single policy move. The state changes that produced the threshold conditions accumulated across turns, often in axes the player was not directly responding to. The interpretive chain section above traces the visible moves and their immediate effects; this section names the hidden accumulation.');
  lines.push('');
  // Visible-vs-hidden discrepancy timeline: this is the literacy device made
  // material. For each turn, the player saw the visible signal bands; the
  // hidden value was different. The discrepancy column shows the gap.
  lines.push('**Visible signals vs hidden value, per turn:**');
  lines.push('');
  lines.push('| Turn | Axis | Hidden band | Visible bands (3 signals) | Discrepancy |');
  lines.push('|------|------|-------------|---------------------------|-------------|');
  const timeline = buildDiscrepancyTimeline(runResult.turns);
  // Show only the largest discrepancies (where the player was misled)
  const rows = [];
  for (const entry of timeline) {
    for (const [axis, info] of Object.entries(entry.perAxis)) {
      if (info.discrepancy >= 12) {
        const visibleBands = info.visibleBands.join(' / ');
        rows.push({
          turn: entry.turn,
          axis: AXIS_LABELS[axis],
          hidden: info.hiddenBand,
          visible: visibleBands,
          discrepancy: info.discrepancy,
        });
      }
    }
  }
  // Sort by discrepancy descending, then by turn ascending
  rows.sort((a, b) => b.discrepancy - a.discrepancy || a.turn - b.turn);
  for (const row of rows.slice(0, 12)) {
    lines.push(`| ${row.turn} | ${row.axis} | ${row.hidden} | ${row.visible} | ${row.discrepancy} pts |`);
  }
  lines.push('');
  lines.push('Reading the table: in each row, the hidden value was in the band shown, but the three visible signals reported a different band. The discrepancy column is the average point-distance between the signals and the hidden value. These are the moments when the literacy device was doing its work — and when reading the signals critically would have changed the policy move.');
  lines.push('');
  return lines.join('\n');
}

function formatPlayInvitation(runResult) {
  const lines = [];
  lines.push('## Play invitation');
  lines.push('');
  lines.push('**What was interesting about this run:**');
  lines.push('');
  // Pick a turn with the largest single-axis delta
  let interestingTurn = runResult.turns[0];
  let maxDelta = 0;
  for (const turn of runResult.turns) {
    for (const value of Object.values(turn.grammarOutput.state_delta)) {
      if (Math.abs(value) > maxDelta) {
        maxDelta = Math.abs(value);
        interestingTurn = turn;
      }
    }
  }
  lines.push(`On turn ${interestingTurn.turn} (${interestingTurn.crisis.title}), the model produced a ${maxDelta > 0 ? '+' : ''}${maxDelta} delta on a single axis. This was the largest single-axis shift in the run. Reading the gloss for that turn shows what the model heard in your policy that produced this magnitude — a useful moment for thinking about which words register as substantive versus which read as symbolic.`);
  lines.push('');
  lines.push('**What other readings were possible:**');
  lines.push('');
  if (runResult.outcome !== 'no-collapse') {
    lines.push(`This run ended in ${runResult.outcome.replace(/-/g, ' ')}. Consider what would have happened if you had consulted the ${runResult.outcome.includes('legitimacy') ? 'civil-society' : runResult.outcome.includes('technical') ? 'international-ally' : 'state-security'} advisor before turn ${Math.max(1, runResult.turnsCompleted - 3)}, and what state shifts that reading might have produced. The advisor voices are corpus-grounded; they describe how a represented position sees the crisis without recommending action.`);
  } else {
    lines.push(`This run reached the end without collapse. Consider what would have happened if you had faced ${runResult.turns[0].crisis.id === 'crisis-1' ? 'crisis 7 (narrative capture)' : 'crisis 1 (frontier lab release)'} earlier in the run — the memetic failure pattern is harder to address than the upstream-embedding pattern, and surfacing it earlier would have tested different axes.`);
  }
  lines.push('');
  lines.push('**Play link:**');
  lines.push('');
  lines.push('Polycrisis of Authority is at [github.com/metaviews/polycrisis-of-authority](https://github.com/metaviews/polycrisis-of-authority). To run your own session, clone the repo, set up your OpenRouter API key in `.env`, and run `node src/sim/index-async.js`. The simulation uses MiniMax M3 as its default model; you can switch to any OpenRouter-supported model by changing `OPENROUTER_MODEL` in `.env`.');
  lines.push('');
  return lines.join('\n');
}

function generateArtifact(runResult) {
  const sections = [
    formatHeader(runResult),
    formatRunSummary(runResult),
    formatStateTrajectory(runResult),
    formatCrisisLog(runResult),
    formatInterpretiveChain(runResult),
    formatGroundingReferences(runResult),
    formatCollapseReveal(runResult),
    formatPlayInvitation(runResult),
  ];
  return sections.join('\n');
}

module.exports = {
  generateArtifact,
  formatHeader,
  formatRunSummary,
  formatStateTrajectory,
  formatCrisisLog,
  formatInterpretiveChain,
  formatGroundingReferences,
  formatCollapseReveal,
  formatPlayInvitation,
};