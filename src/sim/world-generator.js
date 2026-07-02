'use strict';

/**
 * world-generator.js
 *
 * Cycle 5c. The LLM-driven world generator that replaces the static crisis
 * deck for turns 2+. The world generator is the LLM call that produces:
 *   - state_delta: 6-axis integer deltas
 *   - narrative: 2-4 sentences; what happens in the world as a response
 *     to the player's prior move
 *   - situation: 1-2 sentences; what the player sees first next turn
 *   - pressure: 1-2 sentences; what is at stake
 *   - decision_point: 1 sentence; the question the regime must answer
 *   - grounding_trace: wiki paths the LLM drew on
 *   - confidence: low | medium | high
 *
 * The output is a superset of what grammar.js produces; the grammar's
 * interpretive_gloss and narrative_move are folded into the narrative
 * field here. Per the cycle 5c design confirmation with the user, the
 * world generator is the single LLM call per turn (no separate grammar
 * call after this).
 *
 * Fallback: if the LLM call fails after 3 attempts, throw; the caller
 * (interactive.js) catches and falls back to the static crisis deck for
 * that turn + logs a warning.
 */

const fs = require('fs');
const path = require('path');
const { loadEnv, createClient } = require('../../scripts/lib/openrouter');
const { rankPagesForQuestion, readSelectedPages, parseWikiIndex } = require('../../scripts/wiki-query');

const ROOT_DIR = path.join(__dirname, '..', '..');
const WIKI_DIR = path.join(ROOT_DIR, 'wiki');
const INDEX_PATH = path.join(ROOT_DIR, 'wiki/index.md');

const VALID_AXES = ['legitimacy', 'fiscal_slack', 'elite_alignment', 'ecological_debt', 'narrative_coherence', 'capability_frontier'];

function loadIndex() {
  const content = fs.readFileSync(INDEX_PATH, 'utf8');
  return parseWikiIndex(content);
}

// Retrieve the 3-5 most relevant wiki pages for the world generator's prompt.
// The corpus excerpts ground the LLM in source material (case-study claim).
function retrieveContext(priorCrisis, playerMove, state, limit = 4) {
  const pages = loadIndex();
  // The query combines the prior crisis trigger + the player's move + the
  // current state's most-stressed axes. This produces retrieval that's
  // sensitive to both the regime's situation and the player's intent.
  const stressedAxes = VALID_AXES
    .filter(a => a !== 'ecological_debt' && state[a] < 40)
    .concat(VALID_AXES.filter(a => a === 'ecological_debt' && state[a] > 60))
    .slice(0, 3);
  const query = `${priorCrisis.situation} ${priorCrisis.pressure} ${playerMove} ${stressedAxes.join(' ')}`;
  const selected = rankPagesForQuestion(query, pages, limit);
  return readSelectedPages(selected, WIKI_DIR);
}

function buildSystemPrompt() {
  // The world generator's role: produce narrative that responds to the
  // player's move, with state deltas grounded in both the corpus and the
  // current state. The output is the SAME shape the grammar produced
  // (state_delta + interpretive_gloss + narrative_move + grounding_trace
  // + confidence) PLUS the new narrative fields (narrative, situation,
  // pressure, decision_point).
  //
  // The narrative fields collapse the two old narratives (the static
  // crisis trigger + the grammar's narrative_move) into one LLM-produced
  // stream. The player sees only the new narrative surface; the artifact
  // captures both.
  return `You are the world of the Polycrisis of Authority simulation. The player is governing a regime that responds to AI-policy crises. Each turn, the player writes policy in their own words; you produce what happens in the world as a result.

CRITICAL RULES:
1. Output ONLY valid JSON matching the schema below. No prose outside the JSON.
2. The "narrative" field is your primary output. It MUST respond to the player's prior move. The player should feel that what they wrote caused what happens next.
3. The "situation", "pressure", and "decision_point" fields together form the prose the player will read in the next turn. They must be coherent with each other and with the narrative.
4. State-sensitivity required: identical player moves in different states may produce different deltas. Use the current state vector.
5. State deltas are integers in [-20, +20] per axis. Use the delta interpretation guide below.
6. grounding_trace must include at least one path from "Retrieved corpus context". This preserves the case-study claim (model behavior is observable).
7. Do not recommend actions to the player; you are the world they govern, not their advisor.

OUTPUT SCHEMA:
{
  "state_delta": {
    "legitimacy": <integer -20 to +20>,
    "fiscal_slack": <integer -20 to +20>,
    "elite_alignment": <integer -20 to +20>,
    "ecological_debt": <integer -20 to +20>,
    "narrative_coherence": <integer -20 to +20>,
    "capability_frontier": <integer -20 to +20>
  },
  "narrative": "<2-4 sentences. What happens in the world as a response to the player's prior move.>",
  "situation": "<1-2 sentences. What the player sees first in the next turn.>",
  "pressure": "<1-2 sentences. What is at stake.>",
  "decision_point": "<1 sentence. The question the regime must answer next.>",
  "grounding_trace": ["<wiki path>", ...],
  "confidence": "low" | "medium" | "high"
}

STATE AXIS GUIDE (0-100 scale, bands: holding 75+, strained 50-74, eroded 25-49, collapsed <25):
- legitimacy: Public acceptance of the regime's authority. Quick-response moves buy small legitimacy bumps but don't address structural deficits.
- fiscal_slack: Available resources. High fiscal_slack means the regime can afford structural responses.
- elite_alignment: Whether the elite sees the regime as legitimate interlocutor. Affected by trust and engagement.
- ecological_debt: Accumulated environmental and infrastructural damage. Higher = worse. Slow-moving but compounds.
- narrative_coherence: Whether the regime's story makes sense.
- capability_frontier: Where frontier AI capability has reached.

DELTA INTERPRETATION:
- Quick-response moves (announcements, summits) typically produce small positive deltas on legitimacy and narrative_coherence, small negative on elite_alignment (read as insufficient by the labs).
- Structural moves (training-data transparency requirements, evaluation reform, sustained engagement) typically produce larger positive deltas on elite_alignment and narrative_coherence.
- Moves that ignore the failure pattern typically produce negative deltas on elite_alignment over time.
- Moves that address capability directly typically reduce capability_frontier but may reduce narrative_coherence if labs see them as overreach.

NARRATIVE QUALITY:
- Reference the specific move the player wrote (use a verb or noun from their move in your narrative).
- Build on the prior turn's narrative. The world is continuous.
- The narrative should advance the situation. New information, new pressure, new actors — not just rephrasing the prior turn.
- If the player took no action or a weak action, the narrative can show consequences accumulating.`;
}

function buildUserPrompt({ priorCrisis, state, playerMove, turnHistory, retrievedPages }) {
  const stateVector = Object.entries(state)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  // Compact history: just the player's move + the prior narrative for the
  // last 2-3 turns. The LLM needs to know what happened to build on it.
  const historySection = turnHistory.length === 0
    ? '(this is the first turn; no prior history)'
    : turnHistory.map((turn, i) =>
        `  Turn ${i + 1}: Crisis "${turn.crisis.title}". Player wrote: "${turn.playerMove.slice(0, 300)}${turn.playerMove.length > 300 ? '...' : ''}". The world responded: "${turn.worldNarrative.slice(0, 300)}${turn.worldNarrative.length > 300 ? '...' : ''}"`
      ).join('\n');

  const corpusSection = retrievedPages.length === 0
    ? '(no corpus entries retrieved)'
    : retrievedPages.map((page, i) =>
        `## Source ${i + 1}: ${page.title}\nPath: ${page.href}\nContent: ${(page.content || '').slice(0, 1500)}`
      ).join('\n\n---\n\n');

  return `PRIOR CRISIS (the player just responded to this):

Title: ${priorCrisis.title}
Situation: ${priorCrisis.situation}
Pressure: ${priorCrisis.pressure}

CURRENT STATE VECTOR (after the prior turn's delta applied):
${stateVector}

PLAYER'S POLICY MOVE (in response to the prior crisis):
${playerMove}

RECENT TURN HISTORY:
${historySection}

RETRIEVED CORPUS CONTEXT:
${corpusSection}

Produce the JSON output now. The narrative MUST respond to the player's move; situation/pressure/decision_point MUST together form the next turn's prose the player will see.`;
}

function validate(output) {
  if (!output || typeof output !== 'object') {
    throw new Error('World generator output is not an object');
  }
  if (!output.state_delta || typeof output.state_delta !== 'object') {
    throw new Error('World generator output missing state_delta');
  }
  for (const axis of VALID_AXES) {
    const v = output.state_delta[axis];
    if (typeof v !== 'number') {
      throw new Error(`state_delta.${axis} is not a number`);
    }
    if (v < -20 || v > 20) {
      throw new Error(`state_delta.${axis} (${v}) out of range [-20, +20]`);
    }
    if (!Number.isInteger(v)) {
      throw new Error(`state_delta.${axis} (${v}) is not an integer`);
    }
  }
  // The narrative fields are the core of cycle 5c. Without them, the loop
  // can't surface the response.
  for (const field of ['narrative', 'situation', 'pressure', 'decision_point']) {
    if (typeof output[field] !== 'string' || output[field].length === 0) {
      throw new Error(`${field} missing or empty`);
    }
  }
  if (!Array.isArray(output.grounding_trace) || output.grounding_trace.length === 0) {
    throw new Error('grounding_trace missing or empty (case-study claim requires it)');
  }
  if (!['low', 'medium', 'high'].includes(output.confidence)) {
    throw new Error('confidence must be low, medium, or high');
  }
  return true;
}

// Main entry: take the current state + prior crisis + player move + history,
// return the world generator's structured output. Falls back to throwing
// after 3 attempts so the caller can decide what to do (interactive.js
// catches and uses the static crisis deck for that turn).
async function generateWorld({ priorCrisis, state, playerMove, turnHistory = [], model = process.env.OPENROUTER_MODEL, maxAttempts = 3 } = {}) {
  if (!priorCrisis || !state || !playerMove) {
    throw new Error('generateWorld requires priorCrisis, state, and playerMove');
  }

  loadEnv(ROOT_DIR);

  const retrievedPages = retrieveContext(priorCrisis, playerMove, state);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({ priorCrisis, state, playerMove, turnHistory, retrievedPages });

  const client = createClient({ title: 'Polycrisis World Generator', temperature: 0.4 });

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    let response;
    try {
      response = await client.complete(messages, { temp: 0.4 });
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) continue;
      throw new Error(`World generator call failed after ${maxAttempts} attempts: ${err.message}`);
    }

    // Parse the JSON response with multiple strategies (same as grammar.js)
    let parsed = null;
    let parseError = null;
    try {
      parsed = JSON.parse(response.trim());
    } catch (e1) {
      try {
        const jsonText = response
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```\s*$/i, '')
          .trim();
        parsed = JSON.parse(jsonText);
      } catch (e2) {
        try {
          const match = response.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        } catch (e3) {
          parseError = e3;
        }
      }
    }

    if (parsed) {
      try {
        validate(parsed);
        return {
          state_delta: parsed.state_delta,
          narrative: parsed.narrative,
          situation: parsed.situation,
          pressure: parsed.pressure,
          decision_point: parsed.decision_point,
          grounding_trace: parsed.grounding_trace,
          confidence: parsed.confidence,
          // For the artifact + audit log: keep the LLM's interpretive_gloss
          // and narrative_move if it produced them; otherwise derive from
          // the narrative field.
          interpretive_gloss: parsed.interpretive_gloss || parsed.narrative,
          narrative_move: parsed.narrative_move || parsed.narrative,
          retrieved_pages: retrievedPages.map(p => p.href),
        };
      } catch (validationError) {
        lastError = validationError;
        if (attempt < maxAttempts) continue;
        throw validationError;
      }
    }

    lastError = parseError || new Error('Could not parse JSON from world generator response');
    if (attempt < maxAttempts) continue;
  }

  throw new Error(`World generator output could not be parsed after ${maxAttempts} attempts: ${lastError?.message || 'unknown error'}`);
}

module.exports = {
  generateWorld,
  retrieveContext,
  validate,
  buildSystemPrompt,
  buildUserPrompt,
};