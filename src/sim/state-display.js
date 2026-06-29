'use strict';

/**
 * state-display.js
 *
 * Formats the state vector for terminal display during interactive play.
 *
 * Two modes:
 *   - formatStateBlock: shows the hidden state (used in artifact only,
 *     since the artifact is the transparency surface per Principle 2.1).
 *   - formatVisibleSignalsBlock: shows the visible-signal layer (used
 *     during play, per Principle 3.2). The player does NOT see the
 *     hidden value during play — that's the literacy device.
 *
 * Per docs/06-state-model.md: "Visible signals... deliberately unreliable
 * (per Principle 3.2). The player reads the signals critically; the
 * simulation's hidden value may be different."
 */

const { AXIS_NAMES, bandFor } = require('./state');
const { renderVisibleSignals, formatVisibleSignalsBlock: renderVSB } = require('./visible-signals');

const AXIS_LABELS = {
  legitimacy: 'Legitimacy',
  fiscal_slack: 'Fiscal slack',
  elite_alignment: 'Elite alignment',
  ecological_debt: 'Ecological debt',
  narrative_coherence: 'Narrative coherence',
  capability_frontier: 'Capability frontier',
};

const BAND_INDICATORS = {
  holding: '●',
  strained: '◐',
  eroded: '◌',
  collapsed: '○',
};

function formatStateCompact(state) {
  // Single-line summary: each axis name + value + band indicator
  // Uses hidden value (artifact surface only).
  const parts = AXIS_NAMES.map((axis) => {
    const v = state[axis];
    const band = bandFor(v);
    const label = AXIS_LABELS[axis].toLowerCase().replace(' ', '');
    const indicator = BAND_INDICATORS[band];
    return `${label}:${v}${indicator}`;
  });
  return parts.join('  ');
}

function formatStateBlock(state) {
  // Multi-line table of HIDDEN state. Used in the artifact (transparency
  // surface). NOT used during play — the player sees the visible-signal
  // layer instead.
  const lines = [];
  lines.push('  Axis                       Value  Band');
  lines.push('  ──────────────────────────  ─────  ─────────');
  for (const axis of AXIS_NAMES) {
    const v = state[axis];
    const band = bandFor(v);
    const indicator = BAND_INDICATORS[band];
    const label = AXIS_LABELS[axis].padEnd(26);
    lines.push(`  ${label}  ${String(v).padStart(3)}    ${indicator} ${band}`);
  }
  return lines.join('\n');
}

function formatDeltaBlock(delta) {
  const lines = [];
  for (const axis of AXIS_NAMES) {
    const v = delta[axis];
    if (v !== 0) {
      const label = AXIS_LABELS[axis].padEnd(26);
      const sign = v > 0 ? '+' : '';
      const arrow = v > 0 ? '↑' : '↓';
      lines.push(`  ${label}  ${sign}${v}  ${arrow}`);
    }
  }
  if (lines.length === 0) {
    return '  (no state change)';
  }
  return lines.join('\n');
}

/**
 * Format the visible-signal layer for play. The player sees the three
 * named signals per axis, with band/value, plus a discrepancy warning
 * when signals diverge from the hidden value by >= 12 points.
 *
 * The hidden value is NOT shown — that's the literacy device.
 */
function formatVisibleSignalsDisplay({ hiddenState, hiddenHistory, turn, stateBefore }) {
  const signals = renderVisibleSignals({ hiddenState, hiddenHistory, turn, stateBefore });
  return renderVSB(signals, hiddenState);
}

module.exports = {
  AXIS_LABELS,
  BAND_INDICATORS,
  formatStateCompact,
  formatStateBlock,
  formatDeltaBlock,
  formatVisibleSignalsDisplay,
};