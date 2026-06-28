'use strict';

/**
 * interlude.js
 *
 * Curated corpus pulls displayed during LLM wait. The wait state in
 * an interactive CLI is normally dead time; this makes it intentional.
 *
 * The interlude is a single line drawn from wiki/signals/ — a dated
 * Pressure Systems headline. Short, evocative, dated. Connects the
 * player to the parent corpus without being didactic.
 *
 * Selection: cycle through the signal files in the wiki; pick one
 * based on the current turn number. Avoid repeats within a run.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const SIGNALS_DIR = path.join(ROOT_DIR, 'wiki', 'signals');

function loadSignals() {
  if (!fs.existsSync(SIGNALS_DIR)) return [];
  return fs.readdirSync(SIGNALS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const filepath = path.join(SIGNALS_DIR, f);
      const content = fs.readFileSync(filepath, 'utf8');
      // Extract date: try frontmatter `date:`, then `Date:` body line, then filename prefix
      let dateMatch = content.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m);
      if (!dateMatch) {
        dateMatch = content.match(/^Date:\s*(\d{4}-\d{2}-\d{2})/m);
      }
      if (!dateMatch) {
        const fnMatch = f.match(/^(\d{4}-\d{2}-\d{2})/);
        if (fnMatch) dateMatch = fnMatch;
      }
      // First H1 heading as headline
      const lines = content.split('\n');
      let firstHeading = '';
      for (const line of lines) {
        if (line.startsWith('# ')) {
          firstHeading = line.slice(2).trim();
          break;
        }
      }
      return {
        filename: f,
        date: dateMatch ? dateMatch[1] : '',
        headline: firstHeading,
      };
    });
}

function selectInterlude({ turnNumber, usedFilenames = [] }) {
  const signals = loadSignals();
  if (signals.length === 0) return null;

  const available = signals.filter((s) => !usedFilenames.includes(s.filename));
  if (available.length === 0) {
    // All used; pick by turn modulo
    return signals[turnNumber % signals.length];
  }
  return available[turnNumber % available.length];
}

function formatInterlude(signal) {
  if (!signal) return '';
  // Format: "[date] — headline"
  const datePrefix = signal.date ? `[${signal.date}] ` : '';
  return `${datePrefix}— ${signal.headline}`;
}

module.exports = {
  loadSignals,
  selectInterlude,
  formatInterlude,
};