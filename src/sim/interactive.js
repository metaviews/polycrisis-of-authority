'use strict';

/**
 * interactive.js
 *
 * The interactive CLI for Polycrisis of Authority. Cycle 5b.
 *
 * The play loop, as redesigned in Phase 5b:
 *
 *   Turn N
 *     Situation:  <1-2 sentences; what is happening>
 *     Pressure:   <1-2 sentences; what is at stake>
 *     Decision point: <1 sentence; what the regime must answer>
 *     (or)
 *     [player types `a` to consult an advisor before writing their move]
 *     Your move:
 *     > <player types policy, blank line ends>
 *
 *     [LLM call]
 *
 *   Turn N+1
 *     <repeat>
 *
 * Everything else (visible-signal layer, system-interpretation block,
 * state-delta display, previous-turn summary, comedic interlude) has
 * been moved to the artifact and the run log. The play loop is
 * prose-only: situation, pressure, decision point, the player's
 * response, the next turn's situation.
 *
 * At the end, the 8-section artifact is generated.
 */

const fs = require('fs');
const path = require('path');

const { INITIAL_STATE, applyDelta, checkCollapse, withBands, bandFor } = require('./state');
const { selectSeed } = require('../../scripts/seed-variants');
const { pickCorpusQuote } = require('../../scripts/wiki-query');
const { interpret } = require('./grammar');
const { generateWorld } = require('./world-generator');
const { narrateRunEnd, renderEndOfRunReport } = require('./post-game-narrator');
const { consult, ADVISOR_VOICES } = require('./advisors');
const { generateArtifact } = require('./artifact-generator');
const { renderArtifactHtml } = require('./artifact-render');
const { formatStateBlock, formatStateCompact, formatDeltaBlock, formatVisibleSignalsDisplay, computeVisibleSignals } = require('./state-display');
const { wrap } = require('./cli-format');
const { selectAtmospherics } = require('./atmospherics');

const ROOT_DIR = path.join(__dirname, '..', '..');

// Cycle 5d: dynamic turn count. The run ends on:
// - collapse
// - player quit
// - stabilization (5 consecutive turns with all axes in holding/strained)
// Hard ceiling: MAX_TURNS as a runaway cap.
const MAX_TURNS = 30;
const STABILIZATION_THRESHOLD = 5; // consecutive non-collapsing turns in holding/strained band
const STABILIZING_BANDS = new Set(['holding', 'strained']);
const VALID_AXES = ['legitimacy', 'fiscal_slack', 'elite_alignment', 'ecological_debt', 'narrative_coherence', 'capability_frontier'];

function generateRunId() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:T]/g, '').replace(/\..+/, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${rand}`;
}

// Input reader that works for both TTY and piped stdin.
function createReader() {
  const isTTY = process.stdin.isTTY === true;
  if (isTTY) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return {
      isTTY: true,
      // Single-line prompt. Use for short yes/no questions only.
      prompt: (question) => new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer));
      }),
      // Multi-line move prompt. The headerQuestion is printed once.
      // The player types their move; a blank line ends the move.
      // Each non-empty line is preceded by "  > " in the terminal.
      promptMove: (headerQuestion) => new Promise((resolve) => {
        process.stdout.write(headerQuestion + '\n');
        const lines = [];
        process.stdout.write('  > ');
        const onLine = (line) => {
          if (line === '') {
            rl.removeListener('line', onLine);
            resolve(lines.join('\n').trim());
          } else {
            lines.push(line);
            process.stdout.write('  > ');
          }
        };
        rl.on('line', onLine);
      }),
      // Print a single line (no readline prompt involvement).
      print: (text) => {
        process.stdout.write(text);
      },
      close: () => rl.close(),
    };
  }
  const lines = fs.readFileSync(0, 'utf8').split('\n');
  let cursor = 0;
  return {
    isTTY: false,
    prompt: async (question) => {
      process.stdout.write(question);
      const line = lines[cursor++] || '';
      return line;
    },
    promptMove: async (headerQuestion) => {
      process.stdout.write(headerQuestion + '\n');
      const collected = [];
      while (cursor < lines.length) {
        const line = lines[cursor++];
        if (line === '') break;
        collected.push(line);
      }
      return collected.join('\n').trim();
    },
    print: (text) => {
      process.stdout.write(text);
    },
    close: () => {},
  };
}

// Run an async function while showing a pendulum spinner in the terminal.
// The spinner appears on a fresh line below whatever the player just typed,
// rotates while the function runs, and is cleared when the function returns.
// In piped (non-TTY) mode, prints a single static line instead of rotating.
//
// Cycle 5f: the wait state now shows two layers, in order:
//   1. atmospherics — a short indirect line from atmospherics.js
//   2. corpus quote — an informational quote from wiki/signals/ (optional)
// Both are width-budgeted to fit a 70-column terminal after indent.
async function withSpinner(reader, message, fn, { atmospherics = null, corpusQuote = null } = {}) {
  // Render budget: terminal can be as narrow as 60 cols. The prose block
  // wraps at 68 (after a 2-char indent, so rendered width is 70). The
  // spinner / quote / atmospherics stay inside that same 70-col budget
  // so they never overflow into adjacent output.
  const INDENT = '  ';
  const COL_BUDGET = 70; // rendered width including the indent
  const WRAP_WIDTH = COL_BUDGET - INDENT.length; // 68

  // Helper: wrap a string at WRAP_WIDTH, then prepend INDENT to each line.
  // Indent is applied AFTER wrap so wrapped line widths stay ≤ COL_BUDGET.
  function renderBlock(text) {
    if (!text) return null;
    const wrapped = wrap(text, WRAP_WIDTH);
    return wrapped.split('\n').map((l) => INDENT + l).join('\n');
  }

  // Atmospherics: short, no title, no attribution. Just the line.
  const atmosphericsBlock = renderBlock(atmospherics);

  // Corpus quote: title line + wrapped body.
  const corpusQuoteBody = corpusQuote ? renderBlock(`"${corpusQuote.text}"`) : null;
  const corpusQuoteTitle = corpusQuote ? `${INDENT}─ ${corpusQuote.title}` : null;

  // Count lines of each block (for the cleanup pass).
  // atmospherics: N lines where N = number of wrapped lines
  // corpus quote: 1 title + N body lines
  function countLines(block) {
    if (!block) return 0;
    return block.split('\n').length;
  }
  const atmosphericsLineCount = countLines(atmosphericsBlock);
  const corpusQuoteLineCount = (corpusQuote ? 1 : 0) + countLines(corpusQuoteBody);

  if (!reader.isTTY) {
    reader.print(`  ${message}\n`);
    if (atmosphericsBlock) {
      reader.print(atmosphericsBlock + '\n');
    }
    if (corpusQuote) {
      reader.print(corpusQuoteTitle + '\n' + corpusQuoteBody + '\n');
    }
    return await fn();
  }

  // TTY mode: pendulum spinner.
  // The message is followed by 5 dot-position spaces; the dot oscillates
  // through them. The dot is NEVER placed inside the message text — the
  // message is always intact.
  const dotPositions = [0, 1, 2, 3, 4, 3, 2, 1];
  const prefix = INDENT + message + ' ';
  const totalLen = prefix.length + 4; // 4 dot-position spaces
  const renderFrame = (dotPos) => {
    let line = prefix;
    while (line.length < totalLen) line += ' ';
    const dotIdx = totalLen - 4 + dotPos;
    return line.slice(0, dotIdx) + '·' + line.slice(dotIdx + 1);
  };

  // Track how many lines we print below the spinner so the cleanup pass
  // can move up the right number of lines.
  let frameIdx = 0;
  let stopped = false;
  // Print the first frame immediately, then the layers below it.
  // The initial print ends in '\n' so the spinner sits on its own line.
  reader.print(renderFrame(dotPositions[0]) + '\n');
  if (atmosphericsBlock) {
    reader.print(atmosphericsBlock + '\n');
  }
  if (corpusQuote) {
    reader.print(corpusQuoteTitle + '\n' + corpusQuoteBody + '\n');
  }

  const linesBelowSpinner = atmosphericsLineCount + corpusQuoteLineCount;
  const linesToMoveUp = 1 + linesBelowSpinner;

  // The tick overwrites the spinner line in place — NO trailing newline.
  // This is the difference vs cycle 5f's spinner: previous version added
  // one line of scrollback per tick because the redraw ended with '\n'.
  // Across a 15-turn run that's ~30-60 phantom lines accumulating between
  // the player and the next turn's prose, which read as 'interpreting
  // your move keeps showing up the page.'
  const tick = async () => {
    while (!stopped) {
      await new Promise(r => setTimeout(r, 800));
      if (stopped) break;
      frameIdx = (frameIdx + 1) % dotPositions.length;
      const upSeq = '\x1b[' + linesToMoveUp + 'A';
      // \r returns to col 0 of the spinner line; the rewritten frame
      // ends with \r (NOT \n) so we stay on the same line.
      reader.print(upSeq + '\r' + renderFrame(dotPositions[frameIdx]) + '\r');
    }
  };
  const tickPromise = tick();
  try {
    return await fn();
  } finally {
    stopped = true;
    await tickPromise;
    // Cleanup uses ANSI clear-to-end-of-screen so no scrollback is added.
    // Previous version wrote (linesBelowSpinner + 1) '\r\n' sequences,
    // each of which added a phantom line to the terminal scrollback and
    // separated this turn from the next with blank lines.
    //
    // Sequence:
    //   \x1b[NA  — move cursor up to the spinner line
    //   \x1b[2K  — clear the entire spinner line
    //   \x1b[J   — clear from cursor to end of screen (everything below)
    //   \x1b[NB  — move cursor down past the cleared block, ready for
    //              the next turn's prose
    const upSeq = '\x1b[' + linesToMoveUp + 'A';
    const downSeq = '\x1b[' + linesBelowSpinner + 'B';
    reader.print(upSeq + '\x1b[2K\x1b[J' + downSeq);
  }
}

// Render a single turn's prose (Situation / Pressure / Decision point).
// Returns the formatted string ready for stdout.
function renderCrisisProse(crisis) {
  const lines = [];
  lines.push(`  ${crisis.title}`);
  lines.push('');
  // Cycle 5e: Headlines (committed events) precede Situation.
  // Only show when there are headlines (turn 2+; turn 1 with the seed
  // has no headlines yet).
  if (crisis.headlines && crisis.headlines.length > 0) {
    lines.push('  Headlines:');
    for (const h of crisis.headlines) {
      lines.push('    • ' + h);
    }
    lines.push('');
  }
  // Cycle 5g: seed-driven crises (turn 1) now carry a 5-6 sentence
  // briefing as the situation block. Rendered as a normal Situation
  // section; Pressure and Decision point are deferred until after the
  // player's first move (still produced by the world generator).
  if (crisis.fromSeed) {
    lines.push('  Situation:');
    lines.push('  ' + wrap(crisis.situation, 68).split('\n').map(l => '  ' + l).join('\n').trim());
    lines.push('');
    lines.push('  (Pressure and decision point will be generated after your first move.)');
    lines.push('');
    return lines.join('\n');
  }
  lines.push('  Situation:');
  lines.push('  ' + wrap(crisis.situation, 68).split('\n').map(l => '  ' + l).join('\n').trim());
  lines.push('');
  lines.push('  Pressure:');
  lines.push('  ' + wrap(crisis.pressure, 68).split('\n').map(l => '  ' + l).join('\n').trim());
  lines.push('');
  lines.push('  Decision point:');
  lines.push('  ' + wrap(crisis.decision_point, 68).split('\n').map(l => '  ' + l).join('\n').trim());
  lines.push('');
  return lines.join('\n');
}

// Convert a world generator output (or a static crisis) into the crisis shape
// the loop displays. For turn 1 (static crisis), this is a no-op pass-through.
// For turns 2+, this converts the prior turn's world output into a crisis the
// current turn displays.
function crisisFromWorld(worldOrCrisis, fallbackTitle) {
  // If it has all the crisis fields, it's already a crisis (turn 1 path)
  if (worldOrCrisis.title && worldOrCrisis.situation && worldOrCrisis.pressure && worldOrCrisis.decision_point) {
    return worldOrCrisis;
  }
  // Otherwise, it's a world generator output. Convert it to a crisis shape.
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
// The full corpus-grounded version is still generated and recorded
// in the run log + artifact; the loop version is a quick briefing.
async function consultAdvisorShort(voice, crisis, state) {
  const response = await consult({
    voice,
    crisis,
    state: { ...state },
    playerMove: '[player is consulting before writing their move]',
  });
  // Trim to roughly 50 words for the loop. The full response is still
  // recorded in the run log via the advisorUsed field.
  const words = response.split(/\s+/);
  if (words.length > 60) {
    return words.slice(0, 60).join(' ') + '...';
  }
  return response;
}

async function runInteractive({ maxTurns = MAX_TURNS, model = process.env.OPENROUTER_MODEL || 'minimax/minimax-m3' } = {}) {
  const runId = generateRunId();
  const startedAt = new Date().toISOString();

  console.log('');
  // Cycle 5e: ASCII logo + longer intro frame.
  console.log('          ▄▄▄▄▄▄');
  console.log('        ▄█▀   ▀█▄');
  console.log('       █  ▄▄▄▄▄▄  █');
  console.log('       █ █     █ █');
  console.log('       █ █  A  █ █');
  console.log('       █ █     █ █');
  console.log('       █  ▀▀▀▀▀▀  █');
  console.log('        ▀█▄   ▄█▀');
  console.log('          ▀▀▀▀▀▀');
  console.log('');
  console.log('  POLYCRISIS OF AUTHORITY');
  console.log('  A simulation of governing through AI policy crises.');
  console.log('');
  console.log(`  Run ${runId} · Model: ${model}`);
  console.log('');
  console.log('  You are governing a regime responding to AI policy crises. Each turn,');
  console.log('  you read the situation, the pressure, and the decision point; then');
  console.log('  write your policy. The simulation interprets your words and shifts the');
  console.log('  regime\'s position. There is no victory condition. The regime either');
  console.log('  holds or it falls.');
  console.log('');
  console.log('  End your move with a blank line. Type `a` to consult an advisor first.');
  console.log('');

  const reader = createReader();

  let state = { ...INITIAL_STATE };
  let turn = 0;
  let usedSeedIds = []; // Cycle 5d: track seeds used in this run (no repeats)
  let usedActors = []; // Cycle 5d: track actors used (no repeats within run)
  let usedAtmospherics = []; // Cycle 5f: track atmospherics lines used (no repeats within run)
  const turns = [];
  let outcome = 'no-collapse';
  let collapse = null;
  let priorWorld = null; // The most recent world generator output. Turn 1 has none.
  let fallbackWarnings = 0; // Count of LLM failures that triggered fallback.
  let consecutiveStableTurns = 0; // For stabilization detection

  try {
    while (turn < maxTurns) {
      turn += 1;

      // 1. Determine the current "crisis" — what the player sees at the
      // top of this turn. For turn 1, this is a parameterized seed (cycle
      // 5d). For turns 2+, this is the prior turn's world generator output.
      let crisis;
      let seedFragment = null;
      let actor = null;
      if (turn === 1) {
        const seed = selectSeed({ state, usedIds: usedSeedIds, usedActors });
        usedSeedIds.push(seed.id);
        usedActors.push(seed.actor);
        // Build a crisis-like object from the seed for display.
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

      // 2. Render the prose (Situation / Pressure / Decision point)
      console.log(`\n  ─── Turn ${turn} ───\n`);
      console.log(renderCrisisProse(crisis));

      // 3. Get the player's move. The prompt is multi-line: the player
      // types their move and ends with a blank line. As a shortcut,
      // typing `a` on the first line enters advisor mode instead.
      let playerMove = null;
      let advisorUsed = null;
      let advisorFullResponse = null;

      // First, ask the player whether they want to consult an advisor
      // (single line — this is a shortcut, not the move itself).
      const firstLine = await reader.prompt('  Your move (or `a` for an advisor): ');

      if (firstLine.trim().toLowerCase() === 'a') {
        // Advisor flow
        console.log('');
        console.log('  Which advisor? (1-5)');
        for (let i = 0; i < ADVISOR_VOICES.length; i += 1) {
          console.log(`    [${i + 1}] ${ADVISOR_VOICES[i]}`);
        }
        const advisorChoice = (await reader.prompt('  > ')).trim();
        const idx = parseInt(advisorChoice, 10) - 1;
        if (idx >= 0 && idx < ADVISOR_VOICES.length) {
          advisorUsed = ADVISOR_VOICES[idx];
          // Get the short version for the loop
          const shortAdvisor = await consultAdvisorShort(advisorUsed, crisis, state);
          // Get the full version for the run log
          advisorFullResponse = await consult({
            voice: advisorUsed,
            crisis,
            state: { ...state },
            playerMove: '[player is consulting before writing their move]',
          });
          console.log('');
          console.log('  Advisor (' + advisorUsed + '):');
          console.log('  ' + wrap(shortAdvisor, 68).split('\n').map(l => '  ' + l).join('\n').trim());
          console.log('');
          // Now ask for the multi-line move
          playerMove = await reader.promptMove('  Your move:');
        } else {
          console.log('  (invalid choice; writing your own move)');
          playerMove = await reader.promptMove('  Your move:');
        }
      } else {
        // The first line of the move is the line the player already typed.
        // Continue reading more lines until a blank line, treating the
        // first line as part of the multi-line input.
        const collected = [firstLine];
        let more = true;
        while (more) {
          // Check if the first line itself was blank (player just hit enter).
          // In that case, the move is empty and we don't read more.
          if (collected.length === 1 && firstLine === '') {
            more = false;
          } else {
            // Read the next line directly via stdin
            const line = await reader.prompt('  > ');
            if (line === '') {
              more = false;
            } else {
              collected.push(line);
            }
          }
        }
        playerMove = collected.filter(l => l !== '').join('\n').trim();
      }

      if (!playerMove) {
        console.log('  (empty response — using a brief acknowledgment.)');
        playerMove = '[silence]';
      }

      // 4. World generator call. For turn 1, the prior crisis is the static
      // seeded one. For turns 2+, it's the prior turn's world generator
      // output (already converted to crisis shape above).
      const turnHistory = turns.slice(-3).map((t) => ({
        crisis: t.crisis,
        playerMove: t.playerMove,
        worldNarrative: t.world?.narrative || t.grammarOutput?.interpretive_gloss || '(no narrative)',
      }));

      let world;
      let usedFallback = false;
      // Cycle 5f: pick the two layers for the wait state.
      // 1. atmospherics — short indirect line from atmospherics.js.
      //    Selected by turn, no repeats within this run.
      // 2. corpus quote — an informational quote from wiki/signals/.
      //    Prefer one of the prior turn's grounding entries if available;
      //    otherwise pick a random page.
      const atmospheric = selectAtmospherics({
        turnNumber: turn,
        usedLines: usedAtmospherics,
      });
      if (atmospheric) {
        usedAtmospherics.push(atmospheric);
      }
      const preferredHref = (priorWorld && priorWorld.grounding_trace && priorWorld.grounding_trace[0]) || null;
      const corpusQuote = pickCorpusQuote(preferredHref);
      try {
        world = await withSpinner(reader, 'Interpreting your move', () =>
          generateWorld({
            priorCrisis: crisis,
            state: { ...state },
            playerMove,
            turnHistory,
            seedFragment,
            actor,
          }),
          { atmospherics: atmospheric, corpusQuote },
        );
      } catch (worldErr) {
        // Fallback path: LLM world generator failed. Use the static crisis
        // deck for the next crisis (we already used this one for the
        // current turn's display) and the grammar for the delta. Log a
        // warning to the run log so the case-study claim is preserved.
        fallbackWarnings += 1;
        usedFallback = true;
        console.log('');
        console.log('  (world generator unavailable; using static fallback)');
        const grammarOutput = await withSpinner(reader, 'Interpreting your move', () =>
          interpret({
            crisis,
            state: { ...state },
            playerMove,
            turnHistory,
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

      // 5. Apply delta
      const stateAfter = applyDelta(state, world.state_delta);

      // 6. Check collapse
      collapse = checkCollapse(stateAfter, turn);
      if (collapse) {
        outcome = collapse.type;
      }

      // 6b. Check stabilization (cycle 5d). If all 6 axes are in the
      // holding or strained band for STABILIZATION_THRESHOLD consecutive
      // turns, the regime has stabilized. The run ends with outcome
      // 'stabilized' — distinct from 'no-collapse' (which means we just
      // hit maxTurns without collapse or stabilization).
      if (!collapse) {
        const bands = withBands(stateAfter);
        const allStable = VALID_AXES.every(axis => STABILIZING_BANDS.has(bands[axis].band));
        if (allStable) {
          consecutiveStableTurns += 1;
        } else {
          consecutiveStableTurns = 0;
        }
        if (consecutiveStableTurns >= STABILIZATION_THRESHOLD) {
          outcome = 'stabilized';
        }
      }

      // 7. Record turn (with full advisor response if applicable)
      // We keep the legacy `grammarOutput` field name on the turn record for
      // artifact-generator + run-query compatibility, but populate it from
      // the world generator's output.
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
        playerMove,
        grammarOutput: grammarOutputForRecord,
        // New fields specific to cycle 5c
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
        console.log('');
        console.log('  ─── Collapse ───');
        console.log(`  ${collapse.type} on turn ${turn}.`);
        break;
      }

      // Cycle 5d: stabilization end-of-run.
      if (outcome === 'stabilized') {
        console.log('');
        console.log('  ─── Regime stabilized ───');
        console.log(`  The regime has held its posture for ${STABILIZATION_THRESHOLD} consecutive turns.`);
        break;
      }
    }

    if (!collapse && outcome === 'no-collapse') {
      console.log('');
      console.log('  ─── Run complete ───');
      console.log(`  You reached ${turn} turns without collapse or stabilization.`);
    }

    // Cycle 5e: post-game narrator. Generates the end-of-run report that
    // makes the run feel like a story, not a debrief. Principle 6's litmus
    // test depends on this report's quality.
    const report = await narrateRunEnd({
      outcome,
      turnsCompleted: turn,
      finalState: state,
      turns,
      collapse,
    });
    console.log(renderEndOfRunReport(report, {
      outcome,
      turnsCompleted: turn,
      finalState: state,
      bands: withBands(state),
    }));
  } finally {
    reader.close();
  }

  // Build result and generate artifact
  const endedAt = new Date().toISOString();

  const result = {
    runId,
    startedAt,
    endedAt,
    model,
    outcome,
    turnsCompleted: turn,
    turns,
    finalState: state,
    fallbackWarnings,
  };

  console.log('');
  console.log('  ─── Generating artifact ───');
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
  console.log(`  Run log:    ${runLogPath}`);
  console.log(`  Artifact:   ${artifactPath} (${(artifact.length / 1024).toFixed(1)} KB markdown)`);
  console.log(`  Shareable:  ${htmlPath} (self-contained HTML, ${(html.length / 1024).toFixed(1)} KB)`);

  return result;
}

function buildRunLog(result) {
  // The run log retains the full record (everything that happened during play)
  // so the artifact generator and run-query tool can reconstruct the trajectory.
  // The player just doesn't see all this during the play loop.
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
    // Cycle 5c: surface the world generator's narrative prominently.
    // This is what makes the loop feel like the prose responds to the move.
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

module.exports = { runInteractive, withSpinner, createReader };

if (require.main === module) {
  runInteractive().catch((err) => {
    console.error(`Simulation error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });
}
