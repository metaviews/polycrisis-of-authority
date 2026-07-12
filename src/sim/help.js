'use strict';

/**
 * help.js
 *
 * Cycle 11: read-only help mode. Two flavours:
 *
 *   ? (passive)
 *     Re-prints the current crisis surface, the regime's state bands, the
 *     advisors consulted so far in this run, and a short state-axis
 *     glossary drawn from the corpus. No LLM call. Instant.
 *
 *   ?? <question> (active, gated by POLYCRISIS_HELP_QA_ENABLED)
 *     Calls a small LLM Q&A helper with {playerQuestion, crisis, state,
 *     retrievedCorpus} and returns a 2-3 sentence plain-English answer.
 *     One LLM round-trip. Disabled by default (env-gated) — deployments
 *     that don't want the extra latency + LLM call can opt out cleanly.
 *
 * The help commands are surfaced via src/sim/run-loop.js's readPlayerMove
 * (`?` and `?? <question>` prefixes). The surface adapter (TTY or
 * discord) re-prompts the player for a move; the loop's `turn` counter
 * is rolled back so help consumes zero in-game time.
 */

const fs = require('fs');
const path = require('path');

const { AXIS_NAMES, withBands, formatState } = require('./state');
const { ADVISOR_VOICES } = require('./advisors');

const ROOT_DIR = path.join(__dirname, '..', '..');
const WIKI_DIR = path.join(ROOT_DIR, 'wiki');
const INDEX_PATH = path.join(WIKI_DIR, 'index.md');

// Best-effort wikiquery import. If the project's wiki-query module is
// unavailable for any reason, the help layer falls back to plain-text
// rendering without corpus excerpts.
let wikiQuery = null;
try {
  wikiQuery = require('../../scripts/wiki-query');
} catch (wikiErr) {
  // best-effort; fall back to no-corpus rendering below
}

// Glossary snippets drawn from wiki/mechanics/state-axes.md intent. Kept
// short and player-facing. The corpus-driven Q&A path (??) reads from
// the wiki at run-time; this static glossary is the floor.
const AXIS_GLOSSARY = {
  legitimacy: 'Public acceptance of the regime\'s authority. Quick moves buy small bumps; structural moves rebuild trust.',
  fiscal_slack: 'Available resources (compute, energy, public capital). Affects what the regime can afford.',
  elite_alignment: 'Whether the labs + civil society + allied regulators see the regime as a legitimate interlocutor.',
  ecological_debt: 'Accumulated environmental and infrastructural damage. Slow-moving but compounds.',
  narrative_coherence: 'Whether the regime\'s story makes sense. Affected by transparency and consistency.',
  capability_frontier: 'Where frontier AI capability has reached. Moves when labs release or evaluate.',
};

// Heuristic: detect which help prefix the player used.
function parseHelpPrefix(rawInput) {
  if (typeof rawInput !== 'string') return null;
  const trimmed = rawInput.trim();
  if (trimmed === '?' || trimmed === 'help') {
    return { kind: 'passive', question: null };
  }
  if (trimmed.startsWith('??')) {
    const question = trimmed.slice(2).trim();
    if (question.length === 0) {
      // `??` with no question — treat as passive (the most useful default).
      return { kind: 'passive', question: null };
    }
    return { kind: 'active', question };
  }
  return null;
}

// Build the passive help context. Pure function over inputs — testable.
function buildHelpContext({ crisis, state, identity, turns = [], corpusTitle = null } = {}) {
  const sections = [];
  sections.push('─── Help: context summary ───');
  sections.push('');

  if (identity) {
    sections.push(`You are governing "${identity.regime}" as "${identity.player}".`);
    sections.push('');
  }

  if (crisis) {
    sections.push(`Current crisis: ${crisis.title || '(unnamed)'}`);
    sections.push(`  ${crisis.situation || ''}`);
    sections.push(`  ${crisis.pressure || ''}`);
    if (crisis.decision_point) {
      sections.push(`  Decision: ${crisis.decision_point}`);
    }
    sections.push('');
  }

  if (state && typeof state === 'object') {
    sections.push('Regime state (bands):');
    const bands = withBands(state);
    for (const axis of AXIS_NAMES) {
      const v = bands[axis];
      sections.push(`  ${axis}: ${v.value} (${v.band})`);
    }
    sections.push('');
  }

  // Advisors consulted so far in this run.
  const consulted = new Set();
  for (const t of turns) {
    if (t && t.advisorUsed) consulted.add(t.advisorUsed);
  }
  if (consulted.size > 0) {
    sections.push(`Advisors consulted this run: ${Array.from(consulted).sort().join(', ')}.`);
    sections.push(`Available voices: ${ADVISOR_VOICES.join(', ')}.`);
  } else {
    sections.push(`Advisors available: ${ADVISOR_VOICES.join(', ')}. (Consult before writing your move with the \`a\` shortcut.)`);
  }
  sections.push('');

  // Mini glossary for the state axes.
  sections.push('State axes (cheat-sheet):');
  for (const axis of AXIS_NAMES) {
    sections.push(`  ${axis}: ${AXIS_GLOSSARY[axis]}`);
  }
  sections.push('');

  if (corpusTitle) {
    sections.push(`(Grounded in wiki entries: ${corpusTitle})`);
  }

  sections.push('─── End help ───');
  return sections.join('\n');
}

// Best-effort corpus context retrieval for `?? <question>`. Returns an
// array of {title, path, content} snippets. If wiki-query is unavailable,
// returns an empty array — never throws.
function retrieveHelpCorpus(question, limit = 3) {
  if (!wikiQuery || !question) return [];
  try {
    const idxText = fs.readFileSync(INDEX_PATH, 'utf8');
    const pages = wikiQuery.parseWikiIndex(idxText);
    const selected = wikiQuery.rankPagesForQuestion(question, pages, limit);
    return wikiQuery.readSelectedPages(selected, WIKI_DIR);
  } catch (err) {
    // best-effort
    return [];
  }
}

// Active `?? <question>` helper. Env-gated by POLYCRISIS_HELP_QA_ENABLED
// (default: disabled). When disabled, returns a friendly "disabled by
// configuration" message. When enabled, attempts the LLM call; on any
// failure, returns a useful error message — never throws.
async function answerHelpQuestion({ question, crisis, state, identity = null, model = process.env.OPENROUTER_MODEL, client = null } = {}) {
  if (!process.env.POLYCRISIS_HELP_QA_ENABLED || process.env.POLYCRISIS_HELP_QA_ENABLED === '0') {
    return [
      `(? ? help Q&A is disabled by configuration.)`,
      `The "?" command alone (no LLM call) shows context — try that.`,
      `To enable ?? Q&A, set POLYCRISIS_HELP_QA_ENABLED=1 in .env.`,
    ].join('\n');
  }

  const snippets = retrieveHelpCorpus(question, 3);
  const prompt = [
    'You are a Polycrisis of Authority help-system assistant. The player is mid-run and wants a short plain-English answer to a question about what they are seeing.',
    '',
    'RULES: 2-3 sentences max. Plain English. No jargon. Reference the crisis + state when relevant. If you can\'t ground the answer in the corpus snippets or the state below, say so; do not invent.',
    '',
    `PLAYER QUESTION: ${question}`,
    '',
    crisis ? `CURRENT CRISIS:\n  ${crisis.situation || ''}\n  ${crisis.pressure || ''}` : '(no crisis)',
    '',
    `STATE (axis: value):`,
    state ? Object.entries(state).map(([k, v]) => `  ${k}: ${v}`).join('\n') : '(no state)',
    '',
    identity ? `PLAYER: ${identity.player}. REGIME: ${identity.regime}.` : '',
    '',
    'CORPUS SNIPPETS:',
    snippets.length === 0 ? '(none retrieved for this question)' : snippets.map((p, i) => `## ${i + 1} ${p.title} (${p.href})\n${(p.content || '').slice(0, 800)}`).join('\n\n'),
  ].filter(Boolean).join('\n');

  if (!client) {
    try {
      const { loadEnv, createClient } = require('../../scripts/lib/openrouter');
      loadEnv(ROOT_DIR);
      client = createClient({ title: 'Polycrisis Help Q&A', temperature: 0.2 });
    } catch (clientErr) {
      return `(? ? help Q&A could not initialize the LLM client: ${clientErr.message}. Falling back to passive ?)`.trim();
    }
  }

  try {
    const response = await client.complete(
      [{ role: 'system', content: 'You are the Polycrisis help assistant. Answer concisely.' }, { role: 'user', content: prompt }],
      { temp: 0.2 },
    );
    return response.trim();
  } catch (llmErr) {
    return `(? ? help Q&A failed: ${llmErr.message}. Try ? instead.)`.trim();
  }
}

// Dispatcher used by run-loop.js to render the help response and re-prompt
// the player. Returns true if a help command was handled; false otherwise
// (so the caller knows to continue normally — e.g. on a malformed input).
async function runHelp(command, { surface, crisis, state, identity, turns = [] }) {
  if (!command || typeof command !== 'object') return false;
  const { kind, question } = command;

  try {
    if (kind === 'passive') {
      const corpusTitle = pickHelpCorpusTitle(crisis, state);
      const prose = buildHelpContext({ crisis, state, identity, turns, corpusTitle });
      surface.print(prose);
      return true;
    }
    if (kind === 'active') {
      const answer = await answerHelpQuestion({ question, crisis, state, identity });
      surface.print(`─── Help: ${question} ───\n${answer}\n─── End help ───`);
      return true;
    }
  } catch (err) {
    surface.print(`(? ? help layer error: ${err.message})`.trim());
    return true;
  }
  return false;
}

// Pick a small corpus-title hint for the passive help context. Best-effort.
function pickHelpCorpusTitle(crisis, state) {
  if (!wikiQuery) return null;
  try {
    const query = `${(crisis && crisis.situation) || ''} ${AXIS_NAMES.filter((a) => a !== 'ecological_debt' && state && state[a] < 40).join(' ')}`;
    const idxText = fs.readFileSync(INDEX_PATH, 'utf8');
    const pages = wikiQuery.parseWikiIndex(idxText);
    const selected = wikiQuery.rankPagesForQuestion(query, pages, 1);
    if (selected && selected.length > 0) return selected[0];
    return null;
  } catch (err) {
    return null;
  }
}

module.exports = {
  parseHelpPrefix,
  buildHelpContext,
  answerHelpQuestion,
  runHelp,
  retrieveHelpCorpus,
  AXIS_GLOSSARY,
};
