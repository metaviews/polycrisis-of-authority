'use strict';

/**
 * run-loop.js
 *
 * Cycle 6b: the surface-agnostic turn loop.
 *
 * Before cycle 6b, the turn loop lived entirely inside src/sim/interactive.js,
 * intermixed with console.log calls and readline reads. The terminal surface
 * was the only one that worked.
 *
 * Cycle 6b extracted the loop into this module. The loop takes a `surface`
 * adapter (see src/sim/surface.js for the contract) and calls surface.print,
 * surface.readMove, etc., instead of touching stdout or stdin directly.
 *
 * Cycle 6c adds `surface.singleMessage` handling: surfaces that set this flag
 * (e.g. discord) skip the multi-line continuation flow — one readMove call
 * returns the complete move. The `a`/`r` shortcut detection and the
 * blank-line-to-submit flow are TTY-only affordances; discord's chat model
 * (one message = one move) doesn't need them. Advisors and resign become
 * buttons / slash commands on discord (steps 4+).
 *
 * The TTY surface is constructed by src/sim/interactive.js's createReader +
 * stdout wrapper; the discord surface is constructed by src/bot/surface.js.
 * Both entry points now share this same loop.
 *
 * The run-loop:
 *
 *   1. Generates runId + startedAt + identity (via surface.promptIdentity or
 *      surface.readConfirm — depending on what the surface supports)
 *   2. Loops over turns:
 *      a. Select crisis (seed for turn 1; converted prior-world for turn 2+)
 *      b. Format + display the crisis via surface.print
 *      c. Read the player's move (or detect resign / advisor shortcuts) via
 *         surface.readMove / readChoice / readConfirm
 *      d. Call generateWorld (with interpret() fallback) via surface.waitWhileLLM
 *      e. Apply delta, check collapse + stabilization
 *      f. Record the turn into the `turns` array
 *      g. If collapse / stabilization / player-quit: break and run the
 *         end-of-run flow
 *   3. Run end-of-run narration via narrateRunEnd, formatted into an end-of-run
 *      report. The surface decides how to present the report (TTY: console.log
 *      block; discord: embed).
 *   4. Write the run log + artifact files to ./runs/. Both surfaces share this.
 *
 * For step 3 (cycle 6c): the discord version of runLoop() runs end-to-end
 * (turn 1, player move via readMove, turn 2, ... collapse or max-turns).
 * Collapse announcements + artifact writing happen via surface.print, which
 * the discord surface renders as plain text. Step 5 will upgrade the
 * end-of-run experience to embeds + file attachments.
 */

const fs = require('fs');
const path = require('path');

const { INITIAL_STATE, applyDelta, checkCollapse, withBands } = require('./state');
const { selectSeed } = require('../../scripts/seed-variants');
const { pickCorpusQuote } = require('../../scripts/wiki-query');
const { interpret } = require('./grammar');
const { generateWorld } = require('./world-generator');
const { narrateRunEnd, renderEndOfRunReport } = require('./post-game-narrator');
const { consult, ADVISOR_VOICES } = require('./advisors');
const { selectAtmospherics } = require('./atmospherics');
const { generateArtifact } = require('./artifact-generator');
const { renderArtifactHtml } = require('./artifact-render');
const { formatCrisisForTTY, formatCrisisForDiscord, formatEndOfRunEmbed, formatStatusEmbed } = require('./surface');

// cycle 5d: dynamic turn count + stabilization
const MAX_TURNS = 30;
const STABILIZATION_THRESHOLD = 5;
const STABILIZING_BANDS = new Set(['holding', 'strained']);
const VALID_AXES = ['legitimacy', 'fiscal_slack', 'elite_alignment', 'ecological_debt', 'narrative_coherence', 'capability_frontier'];

const ROOT_DIR = path.join(__dirname, '..', '..');

function generateRunId() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:T]/g, '').replace(/\..+/, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${rand}`;
}

// Convert a world generator output into the crisis shape the loop displays.
// For turn 1 (static crisis), this is a no-op pass-through.
// For turns 2+, this converts the prior turn's world output into a crisis
// the current turn displays.
function crisisFromWorld(worldOrCrisis, fallbackTitle) {
  if (worldOrCrisis.title && worldOrCrisis.situation && worldOrCrisis.pressure && worldOrCrisis.decision_point) {
    return worldOrCrisis;
  }
  return {
    id: `world-${worldOrCrisis.turn || 0}`,
    title: fallbackTitle || 'Continuing crisis',
    trigger: worldOrCrisis.narrative || '',
    headlines: worldOrCrisis.headlines || [],
    situation: worldOrCrisis.situation,
    pressure: worldOrCrisis.pressure,
    decision_point: worldOrCrisis.decision_point,
    failure_pattern: worldOrCrisis.failure_pattern || 'unknown',
    focal_axes: worldOrCrisis.focal_axes || [],
    trigger_kind: worldOrCrisis.trigger_kind || 'unknown',
    fromWorld: true,
  };
}

// Get a short advisor paragraph (~50 words) for in-loop consults.
// The full corpus-grounded version is still generated and recorded in the
// run log + artifact; the loop version is a quick briefing.
async function consultAdvisorShort(voice, crisis, state, identity = null) {
  const response = await consult({
    voice,
    crisis,
    state: { ...state },
    playerMove: '[player is consulting before writing their move]',
    identity,
  });
  const words = response.split(/\s+/);
  if (words.length > 60) {
    return words.slice(0, 60).join(' ') + '...';
  }
  return response;
}

// ---------------------------------------------------------------------------
// runLoop — the surface-agnostic turn loop.
//
// options:
//   surface: SurfaceAdapter (required)
//   model: string (optional, for run log metadata)
//   maxTurns: number (optional, default 30)
//   seed: object (optional, use a specific seed object at turn 1; otherwise
//         random). Shape: { id, fragment, actor, failurePattern, focalAxes,
//         allActors } — produced by buildPolycrisisStartReply and reused
//         by runLoop. If you only have an id, prefer seedId + let the loop
//         look up the metadata in SEED_VARIANTS (v1 backward-compat path).
//   seedId: string (optional, used only when `seed` is not supplied;
//         looks up the seed metadata from SEED_VARIANTS by id)
//   identity: { player: string, regime: string } (optional — if omitted, the
//             loop will ask the surface to capture it via surface.readIdentity
//             or fall back to defaults)
//   renderTurn: function(crisis, identity) -> formatted output (required).
//             This is the surface-specific formatter. TTY uses
//             formatCrisisForTTY; discord uses formatCrisisForDiscord.
//   onTurnStart: function({ turn, state, crisis, bands, identity }) (optional).
//             Called at the top of each turn, after the crisis is built but
//             before renderTurn runs. The discord surface uses this to
//             snapshot the current turn / state / crisis so /polycrisis
//             status can read them later. The state passed is the PRE-delta
//             state (what the player is reasoning about this turn). TTY
//             passes nothing (no status command to support).
// ---------------------------------------------------------------------------

async function runLoop(options) {
  const {
    surface,
    model = process.env.OPENROUTER_MODEL || 'minimax/minimax-m3',
    maxTurns = MAX_TURNS,
    seed: seedArg = null,
    seedId: seedIdArg = null,
    identity: identityArg = null,
    renderTurn = null,
    onTurnStart = null,
  } = options;

  if (!surface || typeof surface.print !== 'function') {
    throw new Error('runLoop: surface adapter with .print() is required');
  }
  if (typeof renderTurn !== 'function') {
    throw new Error('runLoop: renderTurn(crisis, identity) -> formatted is required');
  }
  if (onTurnStart !== null && typeof onTurnStart !== 'function') {
    throw new Error('runLoop: onTurnStart, if provided, must be a function');
  }

  const runId = generateRunId();
  const startedAt = new Date().toISOString();

  // Capture identity: caller can pass it in (discord will pass a pre-built
  // one for step 2 — no need to ask the player interactively). If omitted,
  // fall back to defaults — terminal surface captures identity via
  // promptForIdentity before calling runLoop.
  const identity = identityArg || { player: 'the player', regime: 'the regime' };

  let state = { ...INITIAL_STATE };
  let turn = 0;
  const seedId = (seedArg && seedArg.id) || seedIdArg || null;
  let usedSeedIds = seedId ? [seedId] : [];
  let usedActors = (seedArg && seedArg.actor) ? [seedArg.actor] : [];
  let usedAtmospherics = [];
  const turns = [];
  let outcome = 'no-collapse';
  let collapse = null;
  let priorWorld = null;
  let fallbackWarnings = 0;
  let consecutiveStableTurns = 0;
  // End-of-run report + effective turn count. Hoisted outside the try block
  // so the artifact-building code (which runs after the finally) can reference
  // them when building the discord embed payload.
  let report = null;
  let effectiveTurnsCompleted = 0;
  // Surface end-of-run mode. Captured at start of run so the artifact-building
  // code below the finally block can gate the verbose path-listing prints.
  const endOfRunMode = (surface && surface.endOfRunMode) || 'banner-and-files';

  try {
    while (turn < maxTurns) {
      turn += 1;

      // 1. Determine the current crisis.
      let crisis;
      let seedFragment = null;
      let actor = null;
      if (turn === 1) {
        // The caller (discord bot's buildPolycrisisStartReply) can supply a
        // pre-selected `seed` object so the engine's turn-1 crisis matches
        // exactly what the user saw as the seed preview. If only `seedId`
        // is supplied (legacy / TTY path), look the seed up by id in
        // SEED_VARIANTS. Otherwise, do a fresh random selection.
        let seed;
        if (seedArg) {
          seed = seedArg;
        } else if (seedId) {
          const seeds = require('../../scripts/seed-variants').SEED_VARIANTS;
          seed = seeds.find((s) => s.id === seedId);
          if (!seed) {
            surface.print(`(unknown seed id "${seedId}"; using random selection)`);
            seed = selectSeed({ state, usedIds: usedSeedIds, usedActors });
          }
        } else {
          seed = selectSeed({ state, usedIds: usedSeedIds, usedActors });
        }
        usedSeedIds.push(seed.id);
        usedActors.push(seed.actor);
        crisis = {
          id: seed.id,
          title: `${seed.actor} seed`,
          trigger: seed.fragment,
          headlines: [],
          situation: seed.fragment,
          pressure: '(LLM-generated)',
          decision_point: '(LLM-generated)',
          failure_pattern: seed.failurePattern,
          focal_axes: seed.focalAxes,
          trigger_kind: 'seed-parameterized',
          fromSeed: true,
          seedFragment: seed.fragment,
          actor: seed.actor,
        };
        seedFragment = seed.fragment;
        actor = seed.actor;
      } else {
        crisis = crisisFromWorld(priorWorld, `Turn ${turn}`);
      }

      // Snapshot the pre-delta state + current crisis before renderTurn
      // runs. The discord surface uses this to power /polycrisis status
      // mid-run. TTY passes no onTurnStart, so this is a no-op for TTY.
      if (typeof onTurnStart === 'function') {
        try {
          onTurnStart({
            turn,
            state,           // pre-delta state (what the player is reasoning about)
            crisis,
            bands: withBands(state),
            identity,
          });
        } catch (err) {
          // The callback is best-effort — don't let a bug in the snapshot
          // path break the turn loop. Log and continue.
          console.error('[runLoop] onTurnStart callback threw:', err);
        }
      }

      // 2. Render the crisis to the surface.
      surface.print(renderTurn(crisis, identity));

      // 3. Read the player's move.
      const moveResult = await readPlayerMove(surface, crisis, state, identity, ADVISOR_VOICES, consultAdvisorShort);
      const { playerMove, advisorUsed, advisorFullResponse, resignedThisTurn, outcome: readOutcome } = moveResult;
      if (resignedThisTurn) {
        outcome = readOutcome || 'player-quit';
        break;
      }
      if (!playerMove) {
        surface.print('  (empty response — using a brief acknowledgment.)');
      }

      // 4. World generator call (with interpret fallback).
      const turnHistory = turns.slice(-3).map((t) => ({
        crisis: t.crisis,
        playerMove: t.playerMove,
        worldNarrative: t.world?.narrative || t.grammarOutput?.interpretive_gloss || '(no narrative)',
      }));

      const atmospheric = selectAtmospherics({
        turnNumber: turn,
        usedLines: usedAtmospherics,
      });
      if (atmospheric) {
        usedAtmospherics.push(atmospheric);
      }
      const preferredHref = (priorWorld && priorWorld.grounding_trace && priorWorld.grounding_trace[0]) || null;
      const corpusQuote = pickCorpusQuote(preferredHref);

      let world;
      let usedFallback = false;
      try {
        world = await surface.waitWhileLLM('Interpreting your move', () =>
          generateWorld({
            priorCrisis: crisis,
            state: { ...state },
            playerMove: playerMove || '[silence]',
            turnHistory,
            seedFragment,
            actor,
            identity,
          }),
          { atmospherics: atmospheric, corpusQuote },
        );
      } catch (worldErr) {
        // Fallback path: LLM world generator failed. Use the static crisis
        // deck for the next crisis (we already used this one for the current
        // turn's display) and the grammar for the delta. Log a warning so
        // the case-study claim is preserved.
        fallbackWarnings += 1;
        usedFallback = true;
        surface.print('  (world generator unavailable; using static fallback)');
        const grammarOutput = await surface.waitWhileLLM('Interpreting your move', () =>
          interpret({
            crisis,
            state: { ...state },
            playerMove: playerMove || '[silence]',
            turnHistory,
            identity,
          }),
          { atmospherics: atmospheric, corpusQuote },
        );
        world = {
          state_delta: grammarOutput.state_delta,
          headlines: [],
          narrative: grammarOutput.interpretive_gloss,
          situation: crisis.situation,
          pressure: crisis.pressure,
          decision_point: crisis.decision_point,
          grounding_trace: grammarOutput.grounding_trace,
          confidence: grammarOutput.confidence,
          interpretive_gloss: grammarOutput.interpretive_gloss,
          narrative_move: grammarOutput.narrative_move,
          retrieved_pages: [],
          fallback: true,
        };
      }

      // 5. Apply delta.
      const stateAfter = applyDelta(state, world.state_delta);

      // 6. Check collapse + stabilization.
      collapse = checkCollapse(stateAfter, turn);
      if (collapse) {
        outcome = collapse.type;
      }
      if (!collapse) {
        const bands = withBands(stateAfter);
        const allStable = VALID_AXES.every((axis) => STABILIZING_BANDS.has(bands[axis].band));
        if (allStable) {
          consecutiveStableTurns += 1;
        } else {
          consecutiveStableTurns = 0;
        }
        if (consecutiveStableTurns >= STABILIZATION_THRESHOLD) {
          outcome = 'stabilized';
        }
      }

      // 7. Record turn.
      const grammarOutputForRecord = {
        state_delta: world.state_delta,
        interpretive_gloss: world.interpretive_gloss,
        narrative_move: world.narrative_move,
        grounding_trace: world.grounding_trace,
        confidence: world.confidence,
      };
      turns.push({
        turn,
        crisis,
        playerMove: playerMove || '[silence]',
        grammarOutput: grammarOutputForRecord,
        world,
        worldFallback: usedFallback,
        stateBefore: state,
        stateAfter,
        collapse,
        advisorUsed,
        advisorFullResponse,
      });

      state = stateAfter;
      priorWorld = world;

      if (collapse) {
        surface.print(`\n  ─── Collapse ───\n  ${collapse.type} on turn ${turn}.`);
        break;
      }
      if (outcome === 'stabilized') {
        surface.print(`\n  ─── Regime stabilized ───\n  The regime has held its posture for ${STABILIZATION_THRESHOLD} consecutive turns.`);
        break;
      }
    }

    if (!collapse && outcome === 'no-collapse') {
      surface.print(`\n  ─── Run complete ───\n  You reached ${turn} turns without collapse or stabilization.`);
    }

    // End-of-run narration. Runs for every outcome (collapse, stabilized,
    // no-collapse, player-quit). Result is stored in the hoisted `report`
    // variable so the artifact-building code below the finally block can
    // include it in the discord embed payload.
    effectiveTurnsCompleted = outcome === 'player-quit' ? turns.length : turn;
    report = await narrateRunEnd({
      outcome,
      turnsCompleted: effectiveTurnsCompleted,
      finalState: state,
      turns,
      collapse,
      identity,
    });

    // TTY-only: print the rendered report (the full narrate-run-end output).
    // Discord skips this — its end-of-run embed contains the same content
    // (formatted via formatEndOfRunEmbed below), plus file attachments.
    if (endOfRunMode === 'banner-and-files') {
      surface.print(renderEndOfRunReport(report, {
        outcome,
        turnsCompleted: effectiveTurnsCompleted,
        finalState: state,
        identity,
        bands: withBands(state),
      }));
    }
  } finally {
    surface.close();
  }

  // Build the run result. The artifact + run log files are written here
  // so both surfaces share the same on-disk artifacts.
  const endedAt = new Date().toISOString();

  const result = {
    runId,
    startedAt,
    endedAt,
    model,
    outcome,
    turnsCompleted: outcome === 'player-quit' ? turns.length : turn,
    turns,
    finalState: state,
    fallbackWarnings,
    player: identity.player,
    regime: identity.regime,
  };

  // Build artifact files (always, regardless of surface).
  const artifact = generateArtifact(result);
  const runLog = buildRunLog(result);
  const outputDir = path.join(ROOT_DIR, 'runs');
  fs.mkdirSync(outputDir, { recursive: true });
  const runLogPath = path.join(outputDir, `${runId}.md`);
  const artifactPath = path.join(outputDir, `${runId}-artifact.md`);
  fs.writeFileSync(runLogPath, runLog);
  fs.writeFileSync(artifactPath, artifact);
  const htmlPath = path.join(outputDir, `${runId}-artifact.html`);
  const html = renderArtifactHtml(artifact, {
    runId,
    model,
    outcome,
    hashOf: runLog,
  });
  fs.writeFileSync(htmlPath, html);

  // Build the end-of-run embed payload (pure function over result + report).
  // Always built — TTY ignores it; discord uses it.
  // `bands` is computed here in case the loop's `withBands(state)` isn't
  // already cached. (It's pure and cheap.)
  const bands = withBands(state);
  const endOfRunEmbedPayload = formatEndOfRunEmbed({
    result,
    report,
    bands,
  });

  // Surface-specific end-of-run posting.
  // - TTY ('banner-and-files'): the postEndOfRun is a no-op; the verbose
  //   banner is printed below.
  // - Discord ('embed-and-files'): postEndOfRun posts the embed + 2 file
  //   attachments + play-again hint. The verbose banner is suppressed.
  if (typeof surface.postEndOfRun === 'function') {
    await surface.postEndOfRun({
      result,
      embed: endOfRunEmbedPayload.embed,
      files: { markdown: artifact, html, runLog },
      paths: { runLogPath, artifactPath, htmlPath },
    });
  }

  // TTY-only: print the verbose banner with filesystem paths.
  // Suppressed on discord (or any 'embed-and-files' surface).
  if (endOfRunMode === 'banner-and-files') {
    surface.print('\n  ─── Generating artifact ───');
    surface.print(`  Run log:    ${runLogPath}`);
    surface.print(`  Artifact:   ${artifactPath} (${(artifact.length / 1024).toFixed(1)} KB markdown)`);
    surface.print(`  Shareable:  ${htmlPath} (self-contained HTML, ${(html.length / 1024).toFixed(1)} KB)`);
  }

  return result;
}
// readPlayerMove — surface-agnostic prompt flow.
//
// The TTY surface implements surface.readMove / readChoice / readConfirm.
// The discord surface for step 2 doesn't implement them yet, so calling this
// throws "not yet implemented" — which is the point: step 2 ships no input
// handling, so the discord version of runLoop displays turn 1 and then stops.
//
// For TTY: this replicates the exact behavior of the previous runInteractive
// prompt flow (multi-line input, blank-line-to-submit, `a` for advisor
// selection with 5 buttons, `r` for resign with confirmation, `::resign`
// inside the buffer as the only resign-without-confirmation path).
// ---------------------------------------------------------------------------

async function readPlayerMove(surface, crisis, state, identity, advisorVoices, consultAdvisorShort) {
  // Cycle 6c: single-message surfaces (e.g. discord) skip the multi-line
  // continuation flow. One readMove call returns the complete move. The
  // `a`/`r` shortcuts are TTY-only affordances; on discord, advisors will
  // be buttons (step 4) and resign will be a slash command / button
  // (step 4+).
  if (surface.singleMessage) {
    const moveText = await surface.readMove({ header: 'Your move:' });
    if ((moveText || '').trim().toLowerCase() === '::resign') {
      return { playerMove: null, advisorUsed: null, advisorFullResponse: null, resignedThisTurn: true, outcome: 'player-quit' };
    }
    return { playerMove: moveText, advisorUsed: null, advisorFullResponse: null, resignedThisTurn: false };
  }

  // First-line prompt: move OR shortcut (`a` for advisor, `r` to resign).
  const firstLineRaw = await surface.readMove({ header: 'Your move (or `a` for an advisor, `r` to resign):' });
  // TTY reader uses prompt(); some surfaces return a single line, others
  // return the full buffer. Standardize by splitting on newlines.
  const lines = firstLineRaw.split('\n');
  const firstLine = lines[0] || '';

  // Resign shortcut.
  if (['r', 'resign'].includes(firstLine.trim().toLowerCase())) {
    const confirm = await surface.readConfirm({
      header: 'Resign? The regime will be recorded as player-quit. (y/N):',
      defaultNo: true,
    });
    if (confirm) {
      return { playerMove: null, advisorUsed: null, advisorFullResponse: null, resignedThisTurn: true, outcome: 'player-quit' };
    }
    surface.print('  (resign cancelled — continuing.)');
  }

  // Advisor shortcut.
  if (firstLine.trim().toLowerCase() === 'a') {
    const options = advisorVoices.map((v, i) => `[${i + 1}] ${v}`);
    const idx = await surface.readChoice({
      header: 'Which advisor? (1-5)',
      options,
    });
    let advisorUsed = null;
    let advisorFullResponse = null;
    let playerMove = null;
    if (idx >= 0 && idx < advisorVoices.length) {
      advisorUsed = advisorVoices[idx];
      // Get the short version for the loop, the full version for the run log.
      const shortAdvisor = await consultAdvisorShort(advisorUsed, crisis, state, identity);
      advisorFullResponse = await consult({
        voice: advisorUsed,
        crisis,
        state: { ...state },
        playerMove: '[player is consulting before writing their move]',
        identity,
      });
      surface.print(`\n  Advisor (${advisorUsed}):\n  ${shortAdvisor}\n`);
      // Now read the move. ::resign on its own line triggers resign.
      const moveText = await surface.readMove({ header: 'Your move:' });
      if (moveText.trim() === '::resign') {
        return { playerMove: null, advisorUsed, advisorFullResponse, resignedThisTurn: true, outcome: 'player-quit' };
      }
      playerMove = moveText;
    } else {
      surface.print('  (invalid choice; writing your own move)');
      const moveText = await surface.readMove({ header: 'Your move:' });
      if (moveText.trim() === '::resign') {
        return { playerMove: null, advisorUsed: null, advisorFullResponse: null, resignedThisTurn: true, outcome: 'player-quit' };
      }
      playerMove = moveText;
    }
    return { playerMove, advisorUsed, advisorFullResponse, resignedThisTurn: false };
  }

  // Normal move: first line was the start of the multi-line buffer.
  // Keep reading lines until blank-line-to-submit (or surface decides it's done).
  const collected = [firstLine];
  let more = collected.length === 1 && firstLine === '' ? false : true;
  while (more) {
    const next = await surface.readMove({ header: '  > ', continuation: true });
    if (next === '' || next === null || next === undefined) {
      more = false;
    } else {
      collected.push(next);
    }
  }
  const playerMove = collected.filter((l) => l !== '').join('\n').trim();
  if (playerMove === '::resign') {
    return { playerMove: null, advisorUsed: null, advisorFullResponse: null, resignedThisTurn: true, outcome: 'player-quit' };
  }
  return { playerMove, advisorUsed: null, advisorFullResponse: null, resignedThisTurn: false };
}

// ---------------------------------------------------------------------------
// buildRunLog — identical to the previous implementation, exported so both
// surfaces share the same on-disk artifact format.
// ---------------------------------------------------------------------------

function buildRunLog(result) {
  const lines = [];
  lines.push('---');
  lines.push(`run_id: "${result.runId}"`);
  lines.push(`started_at: "${result.startedAt}"`);
  lines.push(`ended_at: "${result.endedAt}"`);
  lines.push(`model: "${result.model}"`);
  lines.push(`outcome: "${result.outcome}"`);
  lines.push(`turns_completed: ${result.turnsCompleted}`);
  lines.push('---');
  lines.push('');
  lines.push('# Run log');
  lines.push('');
  if (result.fallbackWarnings && result.fallbackWarnings > 0) {
    lines.push(`> Note: ${result.fallbackWarnings} turn(s) used the static crisis + grammar fallback because the world generator call failed. The case-study claim is preserved (the fallback paths still record grounding traces).`);
    lines.push('');
  }
  for (const turn of result.turns) {
    lines.push(`## Turn ${turn.turn}`);
    lines.push('');
    if (turn.worldFallback) {
      lines.push('> *This turn used the static fallback path (world generator unavailable).*');
      lines.push('');
    }
    lines.push('### Crisis');
    lines.push('');
    lines.push(`**${turn.crisis.title}** (failure pattern: ${turn.crisis.failure_pattern}${turn.crisis.fromWorld ? '; from world generator' : '; static seeded crisis'})`);
    lines.push('');
    lines.push('**Situation:** ' + turn.crisis.situation);
    lines.push('');
    lines.push('**Pressure:** ' + turn.crisis.pressure);
    lines.push('');
    lines.push('**Decision point:** ' + turn.crisis.decision_point);
    lines.push('');
    if (turn.advisorUsed) {
      lines.push('### Advisor consulted: ' + turn.advisorUsed);
      lines.push('');
      if (turn.advisorFullResponse) {
        lines.push(turn.advisorFullResponse);
        lines.push('');
      }
    }
    lines.push('### Player move');
    lines.push('');
    lines.push(turn.playerMove);
    lines.push('');
    if (turn.world && turn.world.narrative) {
      lines.push('### World response (narrative)');
      lines.push('');
      lines.push(turn.world.narrative);
      lines.push('');
    }
    lines.push('### Grammar output');
    lines.push('');
    lines.push('**state_delta:**');
    for (const [axis, value] of Object.entries(turn.grammarOutput.state_delta)) {
      if (value !== 0) {
        const sign = value > 0 ? '+' : '';
        lines.push(`  - ${axis}: ${sign}${value}`);
      }
    }
    lines.push('');
    lines.push(`**interpretive_gloss:** ${turn.grammarOutput.interpretive_gloss}`);
    lines.push('');
    lines.push(`**narrative_move:** ${turn.grammarOutput.narrative_move}`);
    lines.push('');
    lines.push('**grounding_trace:**');
    for (const p of turn.grammarOutput.grounding_trace) {
      lines.push(`- \`${p}\``);
    }
    lines.push('');
    lines.push(`**confidence:** ${turn.grammarOutput.confidence}`);
    lines.push('');
    lines.push('### State after turn');
    lines.push('');
    for (const [axis, info] of Object.entries(withBands(turn.stateAfter))) {
      lines.push(`- ${axis}: ${info.value} (${info.band})`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

module.exports = {
  runLoop,
  generateRunId,
  crisisFromWorld,
  readPlayerMove,
  buildRunLog,
  MAX_TURNS,
  STABILIZATION_THRESHOLD,
  STABILIZING_BANDS,
  VALID_AXES,
  // Re-export the formatters for convenience.
  formatCrisisForTTY,
  formatCrisisForDiscord,
  formatEndOfRunEmbed,
  formatStatusEmbed,
};