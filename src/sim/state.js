'use strict';

/**
 * state.js
 *
 * The simulation's state vector. Six axes, each with a hidden value (0-100),
 * a named band, and (eventually) visible signals. Per docs/06-state-model.md
 * and wiki/mechanics/state-axes.md.
 *
 * State updates apply grammar deltas, clamp values, compute bands, and
 * check collapse conditions per wiki/mechanics/collapse-modes.md.
 */

const AXIS_NAMES = [
  'legitimacy',
  'fiscal_slack',
  'elite_alignment',
  'ecological_debt',
  'narrative_coherence',
  'capability_frontier',
];

const BAND_THRESHOLDS = [
  { min: 75, band: 'holding' },
  { min: 50, band: 'strained' },
  { min: 25, band: 'eroded' },
  { min: 0, band: 'collapsed' },
];

const INITIAL_STATE = {
  legitimacy: 65,
  fiscal_slack: 70,
  elite_alignment: 60,
  ecological_debt: 30,
  narrative_coherence: 55,
  capability_frontier: 65,
};

const MIN_TURN_FOR_COLLAPSE = 8;

function bandFor(value) {
  for (const t of BAND_THRESHOLDS) {
    if (value >= t.min) return t.band;
  }
  return 'collapsed';
}

function clamp(value) {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function applyDelta(state, delta) {
  const next = { ...state };
  for (const axis of AXIS_NAMES) {
    if (typeof delta[axis] === 'number' && delta[axis] !== 0) {
      next[axis] = clamp(state[axis] + delta[axis]);
    }
  }
  return next;
}

function withBands(state) {
  const result = {};
  for (const axis of AXIS_NAMES) {
    result[axis] = {
      value: state[axis],
      band: bandFor(state[axis]),
    };
  }
  return result;
}

function checkCollapse(state, turn) {
  if (turn < MIN_TURN_FOR_COLLAPSE) return null;

  // Legitimacy collapse: legitimacy < 20 AND elite_alignment < 30
  if (state.legitimacy < 20 && state.elite_alignment < 30) {
    return {
      type: 'legitimacy-collapse',
      conditions: { legitimacy: state.legitimacy, elite_alignment: state.elite_alignment },
    };
  }

  // Technical collapse: capability_frontier > 80 AND narrative_coherence in 'eroded' band AND scripted event
  // (For the skeleton, we simulate the scripted event by checking if capability_frontier
  // has been > 80 for the last turn — a proxy for the event having been surfaced)
  if (state.capability_frontier > 80 && bandFor(state.narrative_coherence) === 'eroded') {
    return {
      type: 'technical-collapse',
      conditions: {
        capability_frontier: state.capability_frontier,
        narrative_coherence: state.narrative_coherence,
      },
    };
  }

  // Narrative capture collapse: narrative_coherence < 25 AND elite_alignment < 40 AND ecological_debt > 70
  if (
    state.narrative_coherence < 25 &&
    state.elite_alignment < 40 &&
    state.ecological_debt > 70
  ) {
    return {
      type: 'narrative-capture-collapse',
      conditions: {
        narrative_coherence: state.narrative_coherence,
        elite_alignment: state.elite_alignment,
        ecological_debt: state.ecological_debt,
      },
    };
  }

  return null;
}

function formatState(state) {
  return AXIS_NAMES.map((axis) => {
    const v = state[axis];
    return `  ${axis}: ${v} (${bandFor(v)})`;
  }).join('\n');
}

module.exports = {
  AXIS_NAMES,
  INITIAL_STATE,
  BAND_THRESHOLDS,
  MIN_TURN_FOR_COLLAPSE,
  bandFor,
  clamp,
  applyDelta,
  withBands,
  checkCollapse,
  formatState,
};
