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
// opening title (cycle 13)
//
// the opening title sequence (assets/videos/prototype-2026-08/
// polycrisis-of-authority-opening.mp4, ~12.5s, 2K) is played at the
// boundary moments of the run: cold-start and end-of-run. not on
// active runs (the player is mid-play, not arriving) and not on
// /status (subordinate to the run page).
//
// the video is autoplay-muted with a small "skip" link visible from
// the start. autoplay-muted works without a user gesture on modern
// browsers; if a browser blocks it, the page is still readable.
//
// the inline <style> block lives inside this element (rather than
// in the page shell) so this helper is self-contained — the page
// shell doesn't need to know about it. matches the precedent set
// by the cycle 12c-12e inline <style> blocks elsewhere in this file.
// ---------------------------------------------------------------

const OPENING_VIDEO_SRC = '/assets/videos/prototype-2026-08/polycrisis-of-authority-opening.mp4';

function renderOpeningTitle() {
  return `<div class="opening-title">
    <style>
      .opening-title {
        position: relative;
        max-width: 68ch;
        margin: 0 auto 2rem;
        padding: 1.5rem 1.5rem 0;
      }
      .opening-title video {
        display: block;
        width: 100%;
        height: auto;
        border-bottom: 1px solid var(--rule);
      }
      .opening-title .skip-link {
        position: absolute;
        top: 1.7rem;
        right: 1.7rem;
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        font-size: 0.7em;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        text-decoration: underline;
        text-underline-offset: 3px;
        background: rgba(251, 250, 247, 0.85);
        padding: 0.15rem 0.4rem;
        cursor: pointer;
      }
      .opening-title .skip-link:hover { color: var(--ink); }
    </style>
    <video autoplay muted playsinline loop preload="auto" aria-label="Opening title">
      <source src="${OPENING_VIDEO_SRC}" type="video/mp4">
    </video>
    <a href="#" class="skip-link" onclick="polycrisisSkipOpening(event); return false;">skip</a>
  </div>
  <script>
    // cycle 13: skip-link removes the opening title element. the video is
    // already autoplaying; this just hides it. no state, no animation,
    // matches the austere register.
    function polycrisisSkipOpening(event) {
      if (event && event.preventDefault) event.preventDefault();
      var el = document.querySelector('.opening-title');
      if (el) el.parentNode.removeChild(el);
      return false;
    }
  </script>`;
}

// ---------------------------------------------------------------
// per-failure-pattern decision questions (cycle 12e)
//
// the engine's seed crises have placeholder pressure and decision_point
// fields ("(LLM-generated)"). the LLM elaborates them after the player's
// first move, but on turn 1 the player never sees the elaboration —
// they'd see the placeholder text in the decision dock. this is a
// cycle 12e fix: substitute a per-failure-pattern question so the
// player sees a real, specific decision to make on turn 1.
//
// the questions are surface adapter data, not engine data. the engine
// produces a `failure_pattern` string; the surface adapter maps it
// to a question. the engine stays unchanged.
// ---------------------------------------------------------------

const PATTERN_QUESTIONS = {
  'upstream-embedding': 'How does the regime respond to a capability release that outpaces its evaluation capacity?',
  'compute-capability-escape': 'How does the regime address a lab whose capabilities exceed disclosed evaluation thresholds?',
  'legitimacy-erosion': 'How does the regime rebuild trust in the safety institutions whose credibility has eroded?',
  'memetic-narrative-capture': 'How does the regime counter a coordinated narrative that distorts the public record?',
};

const PATTERN_PRESSURES = {
  'upstream-embedding': "The lab's capabilities have outpaced the regulator's evaluation capacity, and the next capability release is announced before the prior review is complete.",
  'compute-capability-escape': "The disclosed evaluation thresholds have been exceeded in production, and the gap is widening with each capability release.",
  'legitimacy-erosion': "Public trust in the safety institutions has eroded, and the regime's evaluation process is no longer seen as credible by the press, the public, or the labs.",
  'memetic-narrative-capture': "A coordinated narrative has distorted the public record, and the regime's response is being interpreted through that frame before any policy action is taken.",
};

const FALLBACK_QUESTION = 'How do you respond to this situation?';
const FALLBACK_PRESSURE = 'The current situation demands a response, and the regime has limited time to act.';
const PLACEHOLDER_PATTERN = /\(LLM-generated\)/i;

function resolveDecisionQuestion(decisionQuestion, failurePattern) {
  // if the engine produced a real question (not a placeholder), use it
  if (decisionQuestion && !PLACEHOLDER_PATTERN.test(decisionQuestion)) {
    return decisionQuestion;
  }
  // placeholder: substitute a per-failure-pattern question
  if (failurePattern && PATTERN_QUESTIONS[failurePattern]) {
    return PATTERN_QUESTIONS[failurePattern];
  }
  // unknown pattern: use the generic fallback
  return FALLBACK_QUESTION;
}

function resolveDecisionPressure(pressure, failurePattern) {
  // same logic: substitute a per-failure-pattern pressure if the engine
  // produced a placeholder.
  if (pressure && !PLACEHOLDER_PATTERN.test(pressure)) {
    return pressure;
  }
  if (failurePattern && PATTERN_PRESSURES[failurePattern]) {
    return PATTERN_PRESSURES[failurePattern];
  }
  return FALLBACK_PRESSURE;
}

// ---------------------------------------------------------------
// turn card — the B chat-thread layout. Prior turns get the
// `turn-prior` class (muted); current turn is full-strength.
// ---------------------------------------------------------------

function renderTurnCard({ turn, isPrior, corpusQuote }) {
  const cls = isPrior ? 'turn turn-prior' : 'turn';
  const headlines = (turn.headlines || []).map(h => `<li>${inlineMarkdown(h)}</li>`).join('');

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
    ${turn.pressure ? `<div class="pressure"><p>${inlineMarkdown(resolveDecisionPressure(turn.pressure, turn.crisis_kind))}</p></div>` : ''}
    ${turn.decision_question ? `<p style="margin-top: 1rem; font-style: italic; color: var(--muted);">${inlineMarkdown(resolveDecisionQuestion(turn.decision_question, turn.crisis_kind))}</p>` : ''}
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

function renderDecisionDock({ currentTurn, runId, advisorRead, consultedVoice }) {
  if (!currentTurn || !currentTurn.decision_question) return '';
  if (!runId) return '';

  // resolve the decision question (cycle 12e): if the engine produced
  // a placeholder, substitute a per-failure-pattern question.
  const resolvedQuestion = resolveDecisionQuestion(currentTurn.decision_question, currentTurn.crisis_kind);

  // the read area shows the most recent consult (if any), or a hint.
  // consultedVoice is the voice the player has clicked (if any) for
  // the current turn. advisorRead is the rendered read object.
  let readArea = '';
  if (advisorRead) {
    const pagesList = (advisorRead.retrievedPages || []).slice(0, 4).map(p => {
      const title = escapeHtml(p.title || p.href || 'page');
      const href = escapeHtml(p.href || '#');
      return `<a href="${href}" class="advisor-source">${title}</a>`;
    }).join(', ');
    readArea = `
      <div class="advisor-read-panel" id="advisor-read-panel">
        <p class="advisor-read-voice">${escapeHtml(advisorRead.voiceLabel || advisorRead.voice)}${advisorRead.fromCache ? ' <span class="cached-tag">(cached)</span>' : ''}</p>
        <p class="advisor-read-body">${inlineMarkdown(advisorRead.read)}</p>
        ${pagesList ? `<p class="advisor-read-sources">Sources: ${pagesList}</p>` : ''}
      </div>
    `;
  } else {
    readArea = `<div class="advisor-read-panel empty" id="advisor-read-panel">
      <p class="advisor-read-empty">Consult an advisor to see how this position sees the current crisis. (Read does not consume a turn.)</p>
    </div>`;
  }

  // 5 advisor voices (matches the engine's ADVISOR_VOICES)
  const voices = [
    { key: 'frontier-lab', label: 'Frontier Lab' },
    { key: 'civil-society', label: 'Civil Society' },
    { key: 'state-security', label: 'State Security' },
    { key: 'open-source', label: 'Open Source' },
    { key: 'international-ally', label: 'Intl. Ally' },
  ];
  const buttons = voices.map(v => {
    const active = consultedVoice === v.key ? 'true' : 'false';
    return `<button class="advisor-button" data-voice="${v.key}" data-active="${active}" onclick="return polycrisisConsultAdvisor('${escapeHtml(runId)}', '${v.key}');">${v.label}</button>`;
  }).join('');

  return `<div class="decision-dock">
    <div class="decision-dock-inner">
      <p class="decision-question">${inlineMarkdown(resolvedQuestion)}</p>
      <form id="move-form" onsubmit="return polycrisisSubmitMove(event, '${escapeHtml(runId)}');">
        <div class="decision-row">
          <textarea id="move-text" name="text" placeholder=""></textarea>
          <button type="submit">Submit move</button>
        </div>
        <p class="dock-hint">End your move with a blank line. Type freely; the regime interprets prose, not keywords.</p>
      </form>
      <div class="advisor-panel">
        <p class="advisor-label">Consult an advisor</p>
        <div class="advisor-buttons">${buttons}</div>
        ${readArea}
      </div>
    </div>
  </div>
  <script>
    // v1: blank-line-to-submit on the client, JSON POST to /runs/:id/move.
    function polycrisisSubmitMove(event, runId) {
      event.preventDefault();
      var ta = document.getElementById('move-text');
      var text = (ta.value || '').replace(/\\n+$/, ''); // strip trailing blank lines
      if (!text.trim()) { ta.focus(); return false; }
      var btn = event.target.querySelector('button[type=submit]');
      if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }
      fetch('/runs/' + encodeURIComponent(runId) + '/move', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: text })
      }).then(function(r) {
        if (!r.ok) { return r.text().then(function(t) { throw new Error('HTTP ' + r.status + ': ' + t); }); }
        return r.text();
      }).then(function(html) {
        document.open();
        document.write(html);
        document.close();
        window.scrollTo(0, document.body.scrollHeight);
      }).catch(function(err) {
        if (btn) { btn.disabled = false; btn.textContent = 'Submit move'; }
        var hint = event.target.querySelector('.dock-hint');
        if (hint) { hint.textContent = 'Submit failed: ' + err.message; hint.style.color = '#8a2a1f'; }
      });
      return false;
    }

    // 12d+1: advisor consult. POSTs to /runs/:id/advisor, renders the read.
    function polycrisisConsultAdvisor(runId, voice) {
      var panel = document.getElementById('advisor-read-panel');
      if (panel) { panel.classList.remove('empty'); panel.innerHTML = '<p class="advisor-read-empty">Consulting ' + voice + '…</p>'; }
      var buttons = document.querySelectorAll('.advisor-button');
      buttons.forEach(function(b) { b.disabled = true; });
      fetch('/runs/' + encodeURIComponent(runId) + '/advisor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ voice: voice })
      }).then(function(r) {
        if (!r.ok) { return r.text().then(function(t) { throw new Error('HTTP ' + r.status + ': ' + t); }); }
        return r.json();
      }).then(function(data) {
        // build the read panel
        var html = '<p class="advisor-read-voice">' + escapeHtml(data.voice) + (data.fromCache ? ' <span class="cached-tag">(cached)</span>' : '') + '</p>';
        html += '<p class="advisor-read-body">' + data.read + '</p>';
        if (data.retrievedPages && data.retrievedPages.length > 0) {
          html += '<p class="advisor-read-sources">Sources: ';
          for (var i = 0; i < Math.min(data.retrievedPages.length, 4); i++) {
            var p = data.retrievedPages[i];
            html += '<a href="' + escapeHtml(p.href || '#') + '" class="advisor-source">' + escapeHtml(p.title || p.href || 'page') + '</a>';
            if (i < Math.min(data.retrievedPages.length, 4) - 1) html += ', ';
          }
          html += '</p>';
        }
        if (panel) { panel.innerHTML = html; panel.classList.remove('empty'); }
        // mark the active button
        buttons.forEach(function(b) {
          b.disabled = false;
          b.dataset.active = (b.dataset.voice === voice) ? 'true' : 'false';
        });
      }).catch(function(err) {
        if (panel) { panel.innerHTML = '<p class="advisor-read-error">Consult failed: ' + escapeHtml(err.message) + '</p>'; }
        buttons.forEach(function(b) { b.disabled = false; });
      });
      return false;
    }

    // small client-side escape (used in advisor consult)
    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  </script>`;
}

// ---------------------------------------------------------------
// the page shell — <html>, <head>, CSS, body
// ---------------------------------------------------------------

function renderPageShell({ title, body, runMeta, isActive, preMeta }) {
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

.advisor-panel {
  margin-top: 1.2rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--rule);
}
.advisor-label {
  font-family: ${FONTS.mono};
  font-size: 0.7em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin: 0 0 0.6rem;
}
.advisor-buttons {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.8rem;
}
.advisor-button {
  font-family: ${FONTS.mono};
  font-size: 0.7em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  border: 1px solid var(--rule);
  background: var(--bg);
  padding: 0.4rem 0.7rem;
  cursor: pointer;
}
.advisor-button:hover { color: var(--ink); border-color: var(--ink); }
.advisor-button[data-active="true"] {
  color: var(--accent);
  border-color: var(--accent);
  border-width: 1px;
}
.advisor-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.advisor-read-panel {
  background: var(--card-bg);
  border-left: 2px solid var(--rule);
  padding: 0.8rem 1rem;
  margin-top: 0.4rem;
  min-height: 2.5rem;
}
.advisor-read-panel.empty {
  background: transparent;
  border-left-style: dashed;
  font-style: italic;
}
.advisor-read-voice {
  font-family: ${FONTS.mono};
  font-size: 0.7em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
  margin: 0 0 0.4rem;
}
.advisor-read-voice .cached-tag {
  color: var(--muted);
  font-style: italic;
  text-transform: none;
  letter-spacing: 0;
}
.advisor-read-body {
  font-family: ${FONTS.serif};
  font-size: 0.95em;
  line-height: 1.55;
  color: var(--ink);
  margin: 0 0 0.5rem;
}
.advisor-read-sources {
  font-family: ${FONTS.mono};
  font-size: 0.7em;
  color: var(--muted);
  margin: 0;
  letter-spacing: 0.02em;
}
.advisor-source {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
}
.advisor-read-empty {
  font-family: ${FONTS.serif};
  font-size: 0.85em;
  color: var(--muted);
  margin: 0;
}
.advisor-read-error {
  font-family: ${FONTS.serif};
  font-size: 0.9em;
  color: #8a2a1f;
  margin: 0;
}

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
${preMeta || ''}
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
function renderRunPage({ run, turns, corpusQuotes, isActive, endProse, advisorRead, consultedVoice }) {
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
  const dock = isActive ? renderDecisionDock({ currentTurn, runId: run.run_id, advisorRead, consultedVoice }) : '';

  // cycle 13: opening title on end-of-run only. it sits ABOVE the
  // run-meta header, so we pass it as preMeta (rendered before meta
  // inside the page wrapper, not inside <main>).
  const preMeta = !isActive ? renderOpeningTitle() : '';

  return renderPageShell({
    title: `Run ${run.run_id} — Polycrisis of Authority`,
    body,
    runMeta: { run, currentTurn: currentTurnNum },
    isActive,
    preMeta,
  }) + dock;
}

// ---------------------------------------------------------------
// bandFor — small helper, mirrors src/sim/state.js#bandFor so the
// surface adapter can render state bands without a hard import of
// the engine. The bands are: holding, strained, eroded, collapsed.
// The thresholds are: 0-49 collapsed, 50-59 eroded, 60-79 strained,
// 80-100 holding. (Same as the engine.)
// ---------------------------------------------------------------

function bandFor(value) {
  if (value < 50) return 'collapsed';
  if (value < 60) return 'eroded';
  if (value < 80) return 'strained';
  return 'holding';
}

const BAND_COLOR = {
  holding: 'var(--ink)',
  strained: '#a87842',
  eroded: '#8a4a1f',
  collapsed: '#8a2a1f',
};

const BAND_LABEL = {
  holding: 'holding',
  strained: 'strained',
  eroded: 'eroded',
  collapsed: 'collapsed',
};

const STATE_AXES = [
  { key: 'legitimacy', label: 'legitimacy' },
  { key: 'fiscal_slack', label: 'fiscal slack' },
  { key: 'elite_alignment', label: 'elite alignment' },
  { key: 'ecological_debt', label: 'ecological debt' },
  { key: 'narrative_coherence', label: 'narrative coherence' },
  { key: 'capability_frontier', label: 'capability frontier' },
];

/**
 * renderStatusPage — the /status page. Cycle 12d.
 *
 * Per spec decision 4: the system is hidden during play; /status is
 * one click away but not on the main surface. This page is the only
 * place the 6 axes become visible. It is austere — no charts, no
 * sparklines, just the data and a back-link.
 *
 * @param {Object} opts
 * @param {Object}  opts.run - the run record (run_id, started_at, ended_at, model, outcome, currentTurn)
 * @param {Object}  opts.state - the current state (6 axes)
 * @returns {string} HTML
 */
function renderStatusPage({ run, state }) {
  if (!run || !state) {
    return renderPageShell({
      title: 'Status — Polycrisis of Authority',
      body: '<p>No run loaded.</p>',
      runMeta: null,
      isActive: false,
    });
  }

  const stateRows = STATE_AXES.map(axis => {
    const v = state[axis.key];
    const band = (v === undefined || v === null) ? '?' : bandFor(v);
    const color = BAND_COLOR[band];
    const pct = Math.max(0, Math.min(100, v || 0));
    return `<div class="status-row">
      <div class="status-axis">${escapeHtml(axis.label)}</div>
      <div class="status-bar"><div class="status-fill" style="width: ${pct}%; background: ${color};"></div></div>
      <div class="status-num">${v === undefined || v === null ? '—' : v}</div>
      <div class="status-band" style="color: ${color};">${BAND_LABEL[band] || band}</div>
    </div>`;
  }).join('');

  const turnLabel = run.outcome
    ? `ended · ${run.outcome}`
    : (run.endedAt ? 'ended' : `turn ${run.currentTurn || '?'}`);

  const body = `
    <h1 style="font-family: ${FONTS.serif}; font-weight: normal; font-size: 1.4em; margin: 0 0 0.4rem;">System status</h1>
    <p class="mono" style="font-size: 0.78em; color: var(--muted); margin: 0 0 1.5rem; text-transform: uppercase; letter-spacing: 0.06em;">${escapeHtml(run.run_id)} · ${escapeHtml(turnLabel)} · ${escapeHtml(run.model || '')}</p>

    <p class="mono" style="font-size: 0.78em; color: var(--muted); margin: 0 0 1rem; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--rule); padding-bottom: 0.4rem;">Axes</p>
    <div class="status-grid">${stateRows}</div>

    <p class="mono" style="margin-top: 2rem; font-size: 0.7em; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em;"><a href="/runs/${escapeHtml(run.run_id)}">← back to the run</a></p>
  `;

  // the status page has its own chrome — the run-meta header is too active-run-shaped.
  // simpler: minimal header with the run id and a back link.
  const minimalMeta = `<header class="run-meta">
    <span><a href="/" class="status-link">Polycrisis of Authority</a></span>
    <span>Status · <span class="crisis-id">${escapeHtml(run.run_id)}</span></span>
    <span><a href="/runs/${escapeHtml(run.run_id)}" class="status-link">← run</a></span>
  </header>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Status — Run ${escapeHtml(run.run_id)}</title>
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

.page { max-width: 72ch; margin: 0 auto; padding: 3rem 1.5rem 6rem; }

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

.status-grid { margin: 0 0 2rem; }
.status-row {
  display: grid;
  grid-template-columns: 13rem 1fr 3rem 8rem;
  gap: 0.8rem;
  align-items: center;
  margin: 0 0 0.6rem;
  font-family: ${FONTS.mono};
  font-size: 0.85em;
}
.status-axis {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink);
}
.status-bar {
  height: 0.7rem;
  background: var(--card-bg);
  border: 1px solid var(--rule);
  position: relative;
}
.status-fill {
  position: absolute;
  left: 0; top: 0; bottom: 0;
}
.status-num {
  text-align: right;
  color: var(--ink);
}
.status-band {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.85em;
}

main { animation: fadein 0.2s ease-out; }
@keyframes fadein { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: none; } }
</style>
</head>
<body>
<div class="page">
${minimalMeta}
<main>
${body}
</main>
</div>
</body>
</html>`;
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
    <p class="mono" style="font-size: 0.78em; color: var(--muted); margin: 0 0 2rem; text-transform: uppercase; letter-spacing: 0.06em;">v1 surface · interactive</p>

    <div class="cold-start-frame">${inlineMarkdown(simulation || '')}</div>

    <h2 class="mono" style="font-size: 0.78em; font-weight: normal; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 0 0 0.9rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--rule);">Runs</h2>
    ${list ? `<ul class="run-list">${list}</ul>` : '<p class="mono" style="color: var(--muted); font-size: 0.85em;">(no runs yet)</p>'}

    <p class="mono" style="margin-top: 2.5rem; font-size: 0.7em; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em;">v1 is the interactive surface. click any run to view or play.</p>
  `;

  return renderPageShell({
    title: 'Polycrisis of Authority',
    body,
    runMeta: null,
    isActive: false,
    preMeta: renderOpeningTitle(),
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
  renderDecisionDock,        // cycle 12d+1: exposed for the verifier
  renderColdStart,
  renderStatusPage,        // cycle 12d: /status page
  renderArtifact,
  renderOpeningTitle,       // cycle 13: opening title sequence
  OPENING_VIDEO_SRC,        // cycle 13: video asset path (for verifier)
  // export helpers for downstream use
  escapeHtml,
  inlineMarkdown,
  bandFor,                 // cycle 12d: matches engine's bandFor
  resolveDecisionQuestion, // cycle 12e: per-failure-pattern question substitution
  resolveDecisionPressure, // cycle 12e: per-failure-pattern pressure substitution
  PATTERN_QUESTIONS,       // cycle 12e: per-pattern question map
  PATTERN_PRESSURES,       // cycle 12e: per-pattern pressure map
  PALETTE,
  FONTS,
};
