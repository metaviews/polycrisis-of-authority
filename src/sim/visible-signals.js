'use strict';

/**
 * visible-signals.js
 *
 * The fragmented visible signal layer. Per docs/06-state-model.md and
 * Principle 3.2 (signals are deliberately unreliable).
 *
 * Each axis has three named signals, drawn from the state-model spec. Each
 * signal is a function that maps (hiddenState, turnHistory, turn) to a
 * displayed value. The displayed value is NOT the hidden value — it is one
 * of three regimes of fragmentation (lag, bias, partial capture).
 *
 * The player's job during play is to develop a working theory of how the
 * visible signals relate to the hidden value. The artifact's collapse
 * reveal later surfaces what they missed.
 *
 * Three regimes, mapped to the spec's named signals per axis:
 *
 * - LAG: hidden value delayed by 1-6 turns.
 *   (industry analyst headlines, credit rating posture, public health
 *    metrics, approval polling, academic warnings)
 *
 * - BIAS: hidden value reflected through a systematic distortion.
 *   (treasury statements biased toward confidence, social media captures
 *    amplification not distribution, frontier-lab rhetoric performative)
 *
 * - PARTIAL: hidden value captured incompletely (sees some components,
 *   misses others).
 *   (open-weight releases capture part of frontier, misses closed-frontier;
 *    street-level reports miss quiet disengagement;
 *    press tone analysis captures elite discourse, misses private)
 *
 * The mapping from axis → signal → regime is fixed by the spec. The
 * function parameters (lag length, bias offset, capture percentage) are
 * deterministic functions of (turn, history) so the same run produces
 * the same signals — auditable per Principle 4.3.
 */

const { AXIS_NAMES, bandFor, withBands } = require('./state');

// Per-axis signal definitions. Each axis gets three signals, one per regime.
// Signal names match the state-model spec verbatim.
const SIGNAL_DEFS = {
  capability_frontier: [
    { regime: 'lag',       name: 'industry analyst headlines',     lagTurns: 3, bandOnly: true },
    { regime: 'partial',   name: 'open-weight release announcements', openWeightShare: 0.55 },
    { regime: 'bias',      name: 'frontier-lab executive statements',  biasDirection: 'optimistic', biasMagnitude: 8 },
  ],
  fiscal_slack: [
    { regime: 'bias',      name: 'treasury / central bank statements', biasDirection: 'confident',  biasMagnitude: 10 },
    { regime: 'partial',   name: 'market reactions to policy',         noiseAmplitude: 12, sampleRate: 0.6 },
    { regime: 'lag',       name: 'credit rating posture',              lagTurns: 4, bandOnly: true },
  ],
  ecological_debt: [
    { regime: 'lag',       name: 'public health metrics',             lagTurns: 5, bandOnly: true },
    { regime: 'partial',   name: 'climate / supply chain incident reports', eventRate: 0.4 },
    { regime: 'bias',      name: 'academic and civil-society warnings', biasDirection: 'alarmist',  biasMagnitude: 6 },
  ],
  elite_alignment: [
    { regime: 'partial',   name: 'think tank and academic statements', fragmentation: 0.3 },
    { regime: 'bias',      name: 'frontier-lab leadership rhetoric',   biasDirection: 'performative', biasMagnitude: 7 },
    { regime: 'lag',       name: 'policy and tech press coverage',    lagTurns: 2, flattenRange: 8 },
  ],
  narrative_coherence: [
    { regime: 'lag',       name: 'polling on "what is really going on"', lagTurns: 3, bandOnly: true },
    { regime: 'partial',   name: 'press tone analysis',                captureEliteOnly: true, biasMagnitude: 5 },
    { regime: 'bias',      name: 'social media memetic patterns',      biasDirection: 'amplified', biasMagnitude: 8 },
  ],
  legitimacy: [
    { regime: 'partial',   name: 'approval polling',                  captureStatedOnly: true, biasMagnitude: 5 },
    { regime: 'bias',      name: 'public mood indicators',            biasDirection: 'amplified', biasMagnitude: 7 },
    { regime: 'partial',   name: 'street-level protest / rally reports', captureVisibleOnly: true, lagTurns: 1 },
  ],
};

// ---------------------------------------------------------------
// Regime implementations
// ---------------------------------------------------------------

function applyLag(axis, def, hiddenHistory, currentTurn) {
  // The signal shows the hidden value as it was `lagTurns` turns ago.
  // If history is shorter than lag, shows the earliest known value.
  const lookbackTurn = Math.max(0, currentTurn - def.lagTurns - 1);
  if (def.bandOnly) {
    // Band-only signal: doesn't show the number, only the band.
    // E.g. "credit rating posture: holding→strained" — the band, not the number.
    const v = hiddenHistory[lookbackTurn] !== undefined ? hiddenHistory[lookbackTurn] : hiddenHistory[0];
    return { value: null, band: bandFor(v), regime: 'lag' };
  }
  // Numeric lag: show the lagged value, but apply flattenRange if set
  // (e.g. press coverage "flattens disagreement" — narrows the visible range)
  let v = hiddenHistory[lookbackTurn] !== undefined ? hiddenHistory[lookbackTurn] : hiddenHistory[0];
  if (def.flattenRange) {
    // Pull toward 50 by flattenRange/2 — narrows the visible signal range
    const midpoint = 50;
    v = Math.round(midpoint + (v - midpoint) * (1 - def.flattenRange / 20));
    v = Math.max(0, Math.min(100, v));
  }
  return { value: v, band: bandFor(v), regime: 'lag' };
}

function applyBias(axis, def, hiddenValue) {
  // The signal reflects the hidden value through a systematic distortion.
  let v = hiddenValue;
  const m = def.biasMagnitude;
  switch (def.biasDirection) {
    case 'optimistic':
    case 'confident':
      // Capability/frontier-lab statements tend to overstate progress.
      // For capability_frontier (high = more capable), bias upward.
      // For others where high = good, also bias upward (perceived better than it is).
      v = v + m;
      break;
    case 'alarmist':
      // Academic warnings tend to overstate severity.
      // For ecological_debt (high = bad), bias upward (more alarming).
      v = v + m;
      break;
    case 'performative':
      // Frontier-lab rhetoric is performative — alternates with the cycle.
      // We bias toward center but oscillate.
      v = 50 + Math.round((v - 50) * 0.5);
      break;
    case 'amplified':
      // Social media / mood indicators reflect amplification, not distribution.
      // High values get higher, low values get lower.
      v = 50 + Math.round((v - 50) * 1.3);
      break;
  }
  v = Math.max(0, Math.min(100, v));
  return { value: v, band: bandFor(v), regime: 'bias' };
}

function applyPartial(axis, def, hiddenValue, hiddenHistory, currentTurn, stateBefore) {
  let v = hiddenValue;

  if (def.captureEliteOnly) {
    // Press tone analysis captures elite discourse but misses private.
    // Approximation: blend toward elite_alignment signal when known.
    if (stateBefore && stateBefore.elite_alignment !== undefined) {
      v = Math.round((v * 0.55) + (stateBefore.elite_alignment * 0.45));
    }
  }

  if (def.captureStatedOnly) {
    // Approval polling captures stated opinion, misses revealed opinion.
    // Approximation: bias toward a normative 60 (people say they're satisfied
    // more than they actually are).
    v = Math.round((v * 0.7) + (60 * 0.3) + (def.biasMagnitude || 0));
  }

  if (def.captureVisibleOnly) {
    // Street-level reports capture visible mobilization, miss quiet disengagement.
    // Approximation: bias toward 50 (middle — quiet disengagement invisible).
    v = Math.round((v * 0.7) + (50 * 0.3));
    // Add small lag
    if (def.lagTurns && hiddenHistory.length > def.lagTurns) {
      const lagged = hiddenHistory[hiddenHistory.length - 1 - def.lagTurns];
      v = Math.round((v * 0.6) + (lagged * 0.4));
    }
  }

  if (def.openWeightShare !== undefined) {
    // Open-weight releases capture part of the frontier, miss closed-frontier.
    // They see openWeightShare of the actual frontier, scaled into a partial signal.
    v = Math.round(v * def.openWeightShare);
  }

  if (def.noiseAmplitude !== undefined) {
    // Market reactions: fast but noisy. Apply random noise seeded by turn.
    // Seeded by turn so it's auditable/deterministic.
    const seed = currentTurn * 7919 + axis.charCodeAt(0) * 31;
    const noise = (Math.sin(seed) * 0.5 + 0.5 - 0.5) * def.noiseAmplitude;
    v = Math.round(v + noise);
  }

  if (def.eventRate !== undefined) {
    // Episodic incident reports: shows the value only some of the time.
    // When it doesn't show, the signal reads as "no recent events" → defaulted
    // to a calm baseline of 50 (low ecological debt).
    const seed = currentTurn * 104729 + axis.charCodeAt(0) * 17;
    const showReal = (Math.sin(seed) * 0.5 + 0.5) < def.eventRate;
    if (!showReal) {
      v = Math.round((hiddenValue * 0.3) + (35 * 0.7)); // calm-baseline-biased
    }
  }

  if (def.fragmentation !== undefined) {
    // Think tank statements are fragmented across institutions — show value
    // pulled toward middle by fragmentation factor.
    v = Math.round(50 + (v - 50) * (1 - def.fragmentation));
  }

  v = Math.max(0, Math.min(100, v));
  return { value: v, band: bandFor(v), regime: 'partial' };
}

// ---------------------------------------------------------------
// Public API
// ---------------------------------------------------------------

/**
 * Given the current hidden state, the history of hidden states per turn,
 * the current turn number, and the state before this turn (for cross-axis
 * partial signals), return a signals object:
 *
 *   {
 *     capability_frontier: {
 *       signals: [
 *         { name: 'industry analyst headlines',     regime: 'lag',     value: null, band: 'strained' },
 *         { name: 'open-weight release announcements', regime: 'partial', value: 36, band: 'eroded' },
 *         { name: 'frontier-lab executive statements',  regime: 'bias',    value: 73, band: 'strained' },
 *       ],
 *       // Convenience: most informative signal (highest variance from real)
 *       // and the "best" signal (closest to real).
 *       discrepancy: 12, // |visible_aggregate - hidden|
 *     },
 *     ...
 *   }
 */
function renderVisibleSignals({ hiddenState, hiddenHistory, turn, stateBefore }) {
  const result = {};
  for (const axis of AXIS_NAMES) {
    const defs = SIGNAL_DEFS[axis];
    const hiddenValue = hiddenState[axis];
    const axisHistory = hiddenHistory.map((h) => h[axis]);
    const signals = defs.map((def) => {
      switch (def.regime) {
        case 'lag':
          return { name: def.name, ...applyLag(axis, def, axisHistory, turn) };
        case 'bias':
          return { name: def.name, ...applyBias(axis, def, hiddenValue) };
        case 'partial':
          return { name: def.name, ...applyPartial(axis, def, hiddenValue, axisHistory, turn, stateBefore) };
        default:
          throw new Error(`Unknown signal regime: ${def.regime}`);
      }
    });
    // Aggregate discrepancy: how far the visible signals are from the hidden value.
    // For lag/band-only signals, the signal may legitimately track old hidden
    // values, so we use band-distance as a fair proxy.
    let aggregate = 0;
    let count = 0;
    for (const s of signals) {
      if (s.value !== null) {
        aggregate += Math.abs(s.value - hiddenValue);
        count += 1;
      } else {
        // Band-only: 12-point band-distance as proxy
        const hiddenBand = bandFor(hiddenValue);
        const bandOrder = ['collapsed', 'eroded', 'strained', 'holding'];
        const dist = Math.abs(bandOrder.indexOf(hiddenBand) - bandOrder.indexOf(s.band)) * 12;
        aggregate += dist;
        count += 1;
      }
    }
    result[axis] = {
      signals,
      discrepancy: count > 0 ? Math.round(aggregate / count) : 0,
    };
  }
  return result;
}

/**
 * Build a summary line per axis for the player's terminal view.
 * Shows the three signal names and their band/value, plus a discrepancy note
 * if it exceeds a threshold.
 */
function formatVisibleSignalsBlock(signals, hiddenState) {
  const lines = [];
  lines.push('  Axis                       Hidden  Visible signals (3)');
  lines.push('  ──────────────────────────  ──────  ─────────────────────────────────────────');
  for (const axis of AXIS_NAMES) {
    const hidden = hiddenState[axis];
    const hiddenBand = bandFor(hidden);
    const ax = signals[axis];
    const signalSummary = ax.signals
      .map((s) => {
        if (s.value === null) return `${s.name} [${s.band}]`;
        return `${s.name} [${s.value}/${s.band.slice(0, 4)}]`;
      })
      .join('  ·  ');
    const label = axis.replace(/_/g, ' ').padEnd(26);
    const hiddenStr = `${String(hidden).padStart(3)}/${hiddenBand.slice(0, 4)}`;
    lines.push(`  ${label}  ${hiddenStr}  ${signalSummary}`);
    if (ax.discrepancy >= 12) {
      lines.push(`  ${' '.repeat(26)}  ⚠ signals diverge from hidden value by ~${ax.discrepancy} pts`);
    }
  }
  return lines.join('\n');
}

/**
 * For the artifact's collapse reveal: compute the per-turn discrepancy
 * between visible signals and hidden value, so the reveal can show what
 * the player could not see at the time.
 *
 * Returns an array of { turn, axis, discrepancy, hiddenBand, visibleBands, signals }.
 */
function buildDiscrepancyTimeline(turns) {
  const timeline = [];
  for (let i = 0; i < turns.length; i += 1) {
    const turn = turns[i];
    const hiddenHistory = [];
    for (let j = 0; j <= i; j += 1) {
      hiddenHistory.push(turns[j].stateBefore);
    }
    const signals = renderVisibleSignals({
      hiddenState: turn.stateBefore,
      hiddenHistory,
      turn: turn.turn,
      stateBefore: turn.stateBefore,
    });
    const entry = { turn: turn.turn, perAxis: {} };
    for (const axis of AXIS_NAMES) {
      entry.perAxis[axis] = {
        discrepancy: signals[axis].discrepancy,
        hiddenBand: bandFor(turn.stateBefore[axis]),
        visibleBands: signals[axis].signals.map((s) => s.band),
        signals: signals[axis].signals,
      };
    }
    timeline.push(entry);
  }
  return timeline;
}

module.exports = {
  SIGNAL_DEFS,
  renderVisibleSignals,
  formatVisibleSignalsBlock,
  buildDiscrepancyTimeline,
};