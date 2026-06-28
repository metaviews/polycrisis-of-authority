'use strict';

/**
 * state-display.js
 *
 * Formats the state vector for terminal display during interactive play.
 * Player sees state at every turn — full visibility, not summary.
 */

const { AXIS_NAMES, bandFor } = require('./state');

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
  // Multi-line table
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

module.exports = {
  AXIS_LABELS,
  BAND_INDICATORS,
  formatStateCompact,
  formatStateBlock,
  formatDeltaBlock,
};