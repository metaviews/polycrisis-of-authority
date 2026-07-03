'use strict';

/**
 * atmospherics.js
 *
 * Short, indirect lines shown during the LLM wait. Cycle 5f.
 *
 * Two layers (option 3 from the walkthrough-feedback path):
 *   1. An atmospherics line drawn from this file — short, evocative,
 *      not chapter-and-verse. Carries the design sensibility without
 *      naming the tradition. Selected by turn, no repeats within a run.
 *   2. A corpus quote from wiki/signals/ — the dated Pressure Systems
 *      headlines. Tighter rendering than cycle 5e so it doesn't break
 *      the spinner layout.
 *
 * The atmospherics are not quotes from a single source. They are
 * aphorisms in the register the project's design vocabulary has
 * been carrying: water, yielding, simplicity, wu-wei as felt
 * atmospherics rather than as philosophical claims.
 *
 * Selection: cycle through the array by turn number; skip any line
 * already used in this run; if exhausted, repeat by turn modulo.
 */

const ATMOSPHERICS = [
  'water does not argue with the stone.',
  'the soft endures; the hard returns.',
  'emptiness makes the vessel useful.',
  'act by not acting; the work gets done.',
  'a tree taller than the forest draws the wind.',
  'what resists stiffens; what yields bends.',
  'the river wins without fighting the rock.',
  'governing a great nation is like cooking a small fish.',
  'less and less is done, until nothing is left to do.',
  'the master acts without claiming the result.',
  'know when to stop; that is the practice.',
  'a bow pulled too far breaks.',
  'the valley spirit never dies.',
  'give it room and it orders itself.',
  'the wise one knows they do not know.',
];

function selectAtmospherics({ turnNumber, usedLines = [] } = {}) {
  if (ATMOSPHERICS.length === 0) return null;
  const available = ATMOSPHERICS.filter((line) => !usedLines.includes(line));
  if (available.length === 0) {
    return ATMOSPHERICS[turnNumber % ATMOSPHERICS.length];
  }
  return available[turnNumber % available.length];
}

module.exports = {
  ATMOSPHERICS,
  selectAtmospherics,
};