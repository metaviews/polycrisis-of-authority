'use strict';

/**
 * surface.js — the web surface adapter for Polycrisis of Authority.
 *
 * Modeled on src/bot/surface.js (the discord surface adapter). Same shape:
 *   createWebSurface({ ... }) returns an object with render* methods that
 *   take engine state and emit HTML strings.
 *
 * The web surface is read-only in v0 (cycle 12b). It does NOT accept
 * player input. The render* methods here take a finished run (or a
 * single run's data) and produce the per-run page in the B chat-thread
 * layout. Cycle 12c will add the active-run path with the decision dock
 * and the move-submission flow.
 *
 * Engine commitment: this file does not import from src/sim/. It takes
 * plain JSON-shaped data ({ run, turns, advisors, corpusQuote, ... })
 * and emits HTML. The server (src/web/server.js) is the only place that
 * knows how to fetch engine state — the surface adapter is renderer-
 * only, like the discord surface adapter.
 *
 * v0 surface contract:
 *   renderRunPage({ run, turns, priorTurns, corpusQuotes, isActive })
 *     -> HTML string. Renders the B chat-thread layout. If isActive,
 *     the page includes the decision dock placeholder (no input
 *     handling in v0; the dock is rendered, the form posts to a
 *     404 in v0, the v0 surface is read-only).
 *   renderColdStart({ runs, simulation })
 *     -> HTML string. Renders the cold-start page with a list of
 *     finished runs.
 *   renderArtifact({ run, artifactPath })
 *     -> resolves with the existing artifact HTML file contents
 *     (passed through; the surface adapter does not re-render
 *     the artifact — it serves the existing self-contained file).
 *
 * The visual language is the spec's austere mono/serif/no-gradient
 * language. See docs/24-web-architecture.md §"Aesthetic" for the rules.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------
// visual constants — kept in JS (not CSS) so the surface adapter
// can emit the same values inline in iframes / og previews etc.
// ---------------------------------------------------------------

const PALETTE = {
  bg: '#fbfaf7',
  ink: '#1a1a1a',
  rule: '#c8c5be',
  muted: '#6b6862',
  accent: '#2a4d6e',
  cardBg: '#f4f2ec',
};

const FONTS = {
  serif: 'Georgia, "Iowan Old Style", "Charter", serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
};

// ---------------------------------------------------------------
// small HTML helpers
// ---------------------------------------------------------------

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMarkdown(text) {
  // minimal inline markdown: **bold**, *italic*, `code`
  let s = escapeHtml(text);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

// ---------------------------------------------------------------
// run-meta header — the same chrome across cold-start, run, report
// ---------------------------------------------------------------

function renderRunMeta({ run, isActive, currentTurn }) {
  const turnLabel = isActive
    ? `turn ${currentTurn} of ~`
    : `ended · ${run.turns_completed || 0} turns`;
  return `<header class="run-meta">
    <span><a href="/" class="status-link">Polycrisis of Authority</a></span>
    <span>Run <span class="crisis-id">${escapeHtml(run.run_id)}</span> · ${escapeHtml(turnLabel)}</span>
    ${isActive ? '<span><a href="/runs/' + escapeHtml(run.run_id) + '/status" class="status-link">/status</a></span>' : '<span></span>'}
  </header>`;
}

// ---------------------------------------------------------------
// turn card — the B chat-thread layout. Prior turns get the
// `turn-prior` class (muted); current turn is full-strength.
// ---------------------------------------------------------------

function renderTurnCard({ turn, isPrior, corpusQuote }) {
  const cls = isPrior ? 'turn turn-prior' : 'turn';
  const headlines = (turn.headlines || []).map(h => `<li>${inlineMarkdown(h)}</li>`).join('');

  let advisorList = '';
  if (turn.advisors && Array.isArray(turn.advisors)) {
    advisorList = turn.advisors.map(a =>
      `<button class="advisor" data-active="${a.active ? 'true' : 'false'}" data-voice="${escapeHtml(a.voice)}">${escapeHtml(a.label)}</button>`
    ).join('');
  }

  let corpus = '';
  if (corpusQuote) {
    corpus = `<p class="corpus-inline"><span class="q-label">corpus</span><span class="q">${inlineMarkdown(corpusQuote.text)}</span><a href="${escapeHtml(corpusQuote.href)}">— ${escapeHtml(corpusQuote.title)}</a></p>`;
  }

  const playerMove = turn.player_move
    ? `<p class="turn-marker"><span class="turn-num">turn ${turn.turn_number}</span> · your move: <em>"${escapeHtml(turn.player_move)}"</em></p>`
    : `<p class="turn-marker"><span class="turn-num">turn ${turn.turn_number}</span> · ${escapeHtml(turn.crisis_kind || '')}</p>`;

  return `<section class="${cls}">
    ${playerMove}
    <h1>${inlineMarkdown(turn.heading || '')}</h1>
    ${headlines ? `<div class="headlines"><span class="label">Headlines</span><ul>${headlines}</ul></div>` : ''}
    <div class="situation">
      <p>${inlineMarkdown(turn.situation || '')}</p>
    </div>
    ${turn.pressure ? `<div class="pressure"><p>${inlineMarkdown(turn.pressure)}</p></div>` : ''}
    ${turn.decision_question ? `<p style="margin-top: 1rem; font-style: italic; color: var(--muted);">${inlineMarkdown(turn.decision_question)}</p>` : ''}
    ${advisorList ? `<div class="advisor-strip">${advisorList}</div>` : ''}
    ${corpus}
  </section>`;
}

// ---------------------------------------------------------------
// end-of-run prose — appended to the run page when state='ended'
// ---------------------------------------------------------------

function renderEndOfRun({ run, endProse }) {
  if (!endProse) return '';
  return `<section class="end-of-run" style="margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--rule);">
    <p class="turn-marker"><span class="turn-num">run ended</span> · ${escapeHtml(run.outcome || '')}</p>
    <div class="end-prose" style="font-family: ${FONTS.serif}; color: var(--ink);">
      ${endProse}
    </div>
  </section>`;
}

// ---------------------------------------------------------------
// decision dock — rendered for active runs. v0 has no input
// handling, so the form is non-functional; the v0 surface is
// read-only. cycle 12c wires the form to POST /runs/:id/move.
// ---------------------------------------------------------------

function renderDecisionDock({ currentTurn }) {
  if (!currentTurn || !currentTurn.decision_question) return '';
  return `<div class="decision-dock">
    <div class="decision-dock-inner">
      <p class="decision-question">${inlineMarkdown(currentTurn.decision_question)}</p>
      <div class="decision-row">
        <textarea placeholder="(v0: read-only. run-start lands in cycle 12c.)" disabled></textarea>
        <button type="button" disabled>Submit</button>
      </div>
      <p class="dock-hint">v0 surface is read-only. The full v1 (run-start, move submission, advisor responses) lands in cycles 12c–12d.</p>
    </div>
  </div>`;
}

// ---------------------------------------------------------------
// the page shell — <html>, <head>, CSS, body
// ---------------------------------------------------------------

function renderPageShell({ title, body, runMeta, isActive }) {
  const meta = runMeta ? renderRunMeta({ run: runMeta.run, isActive, currentTurn: runMeta.currentTurn }) : '';
  const mockupBadge = process.env.POLYCRISIS_WEB_MOCKUP_BADGE ? `<div class="mockup-badge">${escapeHtml(process.env.POLYCRISIS_WEB_MOCKUP_BADGE)}</div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
:root {
  --bg: ${PALETTE.bg};
  --ink: ${PALETTE.ink};
  --rule: ${PALETTE.rule};
  --muted: ${PALETTE.muted};
  --accent: ${PALETTE.accent};
  --card-bg: ${PALETTE.cardBg};
}
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: ${FONTS.serif};
  font-size: 17px;
  line-height: 1.55;
}
.mono { font-family: ${FONTS.mono}; font-size: 0.85em; }
a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
a:hover { text-decoration-thickness: 2px; }

.page { max-width: 68ch; margin: 0 auto; padding: 3rem 1.5rem 14rem; }

.run-meta {
  font-family: ${FONTS.mono};
  font-size: 0.75em;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--rule);
  padding-bottom: 0.7rem;
  margin-bottom: 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.run-meta .crisis-id { color: var(--ink); }
.status-link {
  font-family: ${FONTS.mono};
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  text-decoration: none;
}
.status-link:hover { color: var(--ink); }

.turn { margin: 0 0 2.5rem; border-left: 2px solid var(--rule); padding-left: 1.4rem; padding-bottom: 0.5rem; }
.turn-prior { color: var(--muted); margin-bottom: 2.5rem; }
.turn-marker {
  font-family: ${FONTS.mono};
  font-size: 0.7em;
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0 0 0.4rem;
}
.turn-marker .turn-num { color: var(--ink); }
.turn h1 { font-family: ${FONTS.serif}; font-weight: normal; font-size: 1.3em; margin: 0 0 0.5rem; }

.headlines {
  font-size: 0.92em;
  color: var(--muted);
  margin: 0.6rem 0 1rem;
  padding: 0.6rem 0.8rem;
  background: var(--card-bg);
  border-left: 2px solid var(--rule);
  font-family: ${FONTS.mono};
}
.headlines .label {
  display: block;
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.3rem;
  color: var(--muted);
}
.headlines ul { margin: 0; padding-left: 1.1rem; color: var(--ink); }
.headlines li { margin: 0.2rem 0; }

.situation p { margin: 0 0 0.9rem; }
.pressure {
  font-style: italic;
  color: var(--muted);
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--rule);
}

.decision-dock {
  position: fixed; left: 0; right: 0; bottom: 0;
  background: var(--bg);
  border-top: 1px solid var(--rule);
  padding: 1rem 1.5rem 1.2rem;
  z-index: 10;
}
.decision-dock-inner { max-width: 68ch; margin: 0 auto; }
.decision-question { font-size: 0.95em; font-style: italic; color: var(--muted); margin: 0 0 0.5rem; }
.decision-row { display: flex; gap: 0.6rem; align-items: stretch; }
.decision-row textarea {
  flex: 1; min-height: 3.4rem;
  font-family: ${FONTS.serif}; font-size: 0.95em;
  border: 1px solid var(--rule); background: var(--bg);
  padding: 0.6rem 0.8rem; resize: vertical; color: var(--ink);
}
.decision-row button {
  font-family: ${FONTS.mono}; font-size: 0.78em;
  text-transform: uppercase; letter-spacing: 0.08em;
  background: var(--ink); color: var(--bg); border: 1px solid var(--ink);
  padding: 0 1.2rem; cursor: pointer; align-self: stretch;
}
.decision-row button:disabled { opacity: 0.4; cursor: not-allowed; }
.dock-hint {
  font-family: ${FONTS.mono}; font-size: 0.7em;
  color: var(--muted); margin: 0.4rem 0 0; letter-spacing: 0.04em;
}

.advisor-strip { display: flex; gap: 0.4rem; margin-top: 0.6rem; flex-wrap: wrap; }
.advisor {
  font-family: ${FONTS.mono}; font-size: 0.7em;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--muted); border: 1px solid var(--rule);
  background: var(--bg); padding: 0.4rem 0.7rem; cursor: pointer;
}
.advisor:hover { color: var(--ink); border-color: var(--ink); }
.advisor[data-active="true"] { color: var(--accent); border-color: var(--accent); }

.corpus-inline {
  font-family: ${FONTS.mono}; font-size: 0.7em;
  color: var(--muted); letter-spacing: 0.04em;
  margin-top: 0.5rem; padding: 0.5rem 0.7rem;
  background: var(--card-bg); border-left: 2px solid var(--rule);
}
.corpus-inline .q { font-family: ${FONTS.serif}; font-size: 1em; color: var(--ink); font-style: italic; display: block; margin-bottom: 0.3rem; }
.corpus-inline .q-label { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.85em; color: var(--muted); }

@keyframes fadein { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: none; } }
main { animation: fadein 0.2s ease-out; }

.mockup-badge {
  position: fixed; bottom: 0.5rem; right: 0.5rem;
  font-family: ${FONTS.mono}; font-size: 0.65em;
  color: var(--muted); letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--bg); border: 1px solid var(--rule);
  padding: 0.2rem 0.5rem; z-index: 20;
}

/* cold-start specific */
.cold-start-frame {
  font-family: ${FONTS.serif};
  font-size: 1.05em;
  color: var(--ink);
  margin: 0 0 2.5rem;
  max-width: 64ch;
  line-height: 1.6;
}
.run-list { margin: 0; padding: 0; list-style: none; }
.run-list li {
  margin: 0 0 0.6rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--rule);
  background: var(--bg);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.run-list a { text-decoration: none; }
.run-list a:hover { text-decoration: underline; }
.run-list .run-id { font-family: ${FONTS.mono}; font-size: 0.85em; color: var(--ink); }
.run-list .run-meta-line { font-family: ${FONTS.mono}; font-size: 0.75em; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
</style>
</head>
<body>
<div class="page">
${meta}
<main>
${body}
</main>
</div>
${mockupBadge}
</body>
</html>`;
}

// ---------------------------------------------------------------
// public surface methods
// ---------------------------------------------------------------

/**
 * renderRunPage — the B chat-thread layout. v0: read-only.
 *
 * @param {Object} opts
 * @param {Object} opts.run - the run record (run_id, started_at, ended_at, model, outcome, turns_completed)
 * @param {Array}  opts.turns - the turn records (turn_number, heading, situation, pressure, decision_question, headlines, player_move, crisis_kind, advisors)
 * @param {Array}  opts.corpusQuotes - parallel to opts.turns, the corpus quote per turn (or null for turn 1)
 * @param {boolean} opts.isActive - true if the run is active (decision dock shown, placeholder for v0)
 * @param {Object}  opts.endProse - optional HTML for the end-of-run section (only for ended runs)
 * @returns {string} HTML
 */
function renderRunPage({ run, turns, corpusQuotes, isActive, endProse }) {
  if (!run) throw new Error('renderRunPage: run is required');
  if (!Array.isArray(turns)) turns = [];

  const currentTurnNum = isActive ? (turns.length || 0) + 1 : null;
  const currentTurn = isActive ? turns[turns.length - 1] : null;

  const cards = turns.map((turn, i) => {
    const isPrior = !(isActive && i === turns.length - 1);
    const quote = corpusQuotes ? corpusQuotes[i] : null;
    return renderTurnCard({ turn, isPrior, corpusQuote: quote });
  }).join('');

  const body = cards + renderEndOfRun({ run, endProse });
  const dock = isActive ? renderDecisionDock({ currentTurn }) : '';

  return renderPageShell({
    title: `Run ${run.run_id} — Polycrisis of Authority`,
    body,
    runMeta: { run, currentTurn: currentTurnNum },
    isActive,
  }) + dock;
}

/**
 * renderColdStart — the cold-start page. v0: list finished runs + frame paragraph.
 *
 * @param {Object} opts
 * @param {Array}  opts.runs - the list of run records (id, ended_at, outcome, turns_completed)
 * @param {string} opts.simulation - the simulation's frame paragraph (markdown allowed)
 * @returns {string} HTML
 */
function renderColdStart({ runs, simulation }) {
  const list = (runs || []).map(r => {
    const ended = r.ended_at ? escapeHtml(r.ended_at.slice(0, 10)) : '—';
    return `<li>
      <a href="/runs/${escapeHtml(r.run_id)}">
        <span class="run-id">${escapeHtml(r.run_id)}</span>
      </a>
      <span class="run-meta-line">${escapeHtml(r.outcome || '')} · ${r.turns_completed || 0} turns · ${ended}</span>
    </li>`;
  }).join('');

  const body = `
    <h1 style="font-family: ${FONTS.serif}; font-weight: normal; font-size: 1.6em; margin: 0 0 0.4rem;">Polycrisis of Authority</h1>
    <p class="mono" style="font-size: 0.78em; color: var(--muted); margin: 0 0 2rem; text-transform: uppercase; letter-spacing: 0.06em;">v0 surface · read-only</p>

    <div class="cold-start-frame">${inlineMarkdown(simulation || '')}</div>

    <h2 class="mono" style="font-size: 0.78em; font-weight: normal; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 0 0 0.9rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--rule);">Finished runs</h2>
    ${list ? `<ul class="run-list">${list}</ul>` : '<p class="mono" style="color: var(--muted); font-size: 0.85em;">(no runs yet)</p>'}

    <p class="mono" style="margin-top: 2.5rem; font-size: 0.7em; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em;">v0 is the read-only surface. run-start and move submission land in cycles 12c–12d.</p>
  `;

  return renderPageShell({
    title: 'Polycrisis of Authority',
    body,
    runMeta: null,
    isActive: false,
  });
}

/**
 * renderArtifact — the artifact page. v0: serves the existing self-contained
 * artifact HTML file as-is. The surface adapter does not re-render it.
 *
 * @param {Object} opts
 * @param {string} opts.artifactPath - absolute path to the artifact HTML file
 * @returns {string|null} HTML string, or null if the file doesn't exist
 */
function renderArtifact({ artifactPath }) {
  if (!artifactPath) return null;
  try {
    return fs.readFileSync(artifactPath, 'utf8');
  } catch (err) {
    return null;
  }
}

// ---------------------------------------------------------------
// the createWebSurface factory — same shape as createDiscordSurface
// ---------------------------------------------------------------

function createWebSurface({ runId } = {}) {
  if (!runId) throw new Error('createWebSurface: runId is required');
  return {
    renderRunPage,
    renderColdStart,
    renderArtifact,
  };
}

module.exports = {
  createWebSurface,
  // also export the render* functions for direct use (e.g. in tests)
  renderRunPage,
  renderColdStart,
  renderArtifact,
  // export helpers for downstream use
  escapeHtml,
  inlineMarkdown,
  PALETTE,
  FONTS,
};
