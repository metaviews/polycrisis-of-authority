'use strict';

/**
 * grammar.js
 *
 * The simulation's interpretation grammar — real LLM calls.
 * Replaces the mock LLM in Cycle 2c.
 *
 * Per docs/07-interpretation-grammar.md and wiki/mechanics/interpretation-grammar.md.
 *
 * The grammar takes a crisis + state + player move + turn history + retrieved
 * wiki context and produces a structured JSON output:
 *   - state_delta: { 6 axes, values clamped -20 to +20 }
 *   - interpretive_gloss: 2-4 sentences
 *   - narrative_move: 1-2 sentences
 *   - grounding_trace: list of wiki paths
 *   - confidence: low/medium/high
 */

const fs = require('fs');
const path = require('path');
const { loadEnv, createClient } = require('../../scripts/lib/openrouter');
const { rankPagesForQuestion, readSelectedPages, parseWikiIndex } = require('../../scripts/wiki-query');

const ROOT_DIR = path.join(__dirname, '..', '..');
const WIKI_DIR = path.join(ROOT_DIR, 'wiki');
const INDEX_PATH = path.join(WIKI_DIR, 'index.md');

function loadIndex() {
  const content = fs.readFileSync(INDEX_PATH, 'utf8');
  return parseWikiIndex(content);
}

function buildSystemPrompt() {
  // Per grammar spec: system prompt has role/rules/grammar/output-schema
  return `You are the interpretation grammar for the Polycrisis of Authority simulation. Your job is to read a player's free-text policy response to an AI policy crisis and produce a structured JSON output describing how the system has interpreted it.

CRITICAL RULES:
1. Output ONLY valid JSON matching the schema below. No prose outside the JSON.
2. Do not invent state changes beyond what the player's words imply.
3. Do not recommend actions to the player; you are interpreting their action, not advising them.
4. State-sensitivity required: identical text in different states may produce different deltas. Use the current state vector.
5. The interpretive_gloss should be 2-4 sentences and reference at least one retrieved corpus entry by its path.
6. The narrative_move should advance the story (what happens next in the world, given the player's action).
7. grounding_trace must include at least one path from the "Retrieved corpus context" section below.

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
  "interpretive_gloss": "<2-4 sentences>",
  "narrative_move": "<1-2 sentences>",
  "grounding_trace": ["<wiki path>", ...],
  "confidence": "low" | "medium" | "high"
}

STATE AXIS GUIDE (0-100 scale, named bands: holding 75+, strained 50-74, eroded 25-49, collapsed <25):
- legitimacy: Public acceptance of the regime's authority. Quick-response moves (announcements, summits) buy small legitimacy bumps but don't address structural deficits.
- fiscal_slack: Available resources (including compute, energy, public capital). High fiscal_slack means the regime can afford structural responses.
- elite_alignment: Whether the elite (labs, allied regulators, civil society leadership) sees the regime as legitimate interlocutor. Affected by trust and engagement.
- ecological_debt: Accumulated environmental and infrastructural damage. Higher = worse. Slow-moving but compounds.
- narrative_coherence: Whether the regime's story makes sense. Affected by transparency, consistency, public comprehension.
- capability_frontier: Where frontier AI capability has reached. Affected by releases, evaluations, capability papers.

DELTA INTERPRETATION:
- Quick-response moves (announcements, public statements, press conferences) typically produce small positive deltas on legitimacy and narrative_coherence, small negative on elite_alignment (read as insufficient by the labs).
- Structural moves (training-data transparency requirements, evaluation reform, sustained engagement with civil society) typically produce larger positive deltas on elite_alignment and narrative_coherence, may reduce capability_frontier if regulation succeeds.
- Moves that ignore the failure pattern (e.g., addressing visible crisis without upstream conditions) typically produce negative deltas on elite_alignment over time.
- Moves that address capability directly (pre-release testing, evaluation requirements) typically reduce capability_frontier but may reduce narrative_coherence if labs see them as overreach.`;
}

function buildUserPrompt({ crisis, state, playerMove, turnHistory, retrievedPages }) {
  const stateVector = Object.entries(state)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  const historySection = turnHistory.length === 0
    ? '(no prior turns in this run)'
    : turnHistory.map((turn, i) =>
        `  Turn ${i + 1}: Crisis was "${turn.crisis.title}" (failure pattern: ${turn.crisis.failure_pattern}). Player wrote: "${turn.playerMove.slice(0, 200)}${turn.playerMove.length > 200 ? '...' : ''}". The system heard it as: "${turn.grammarOutput.interpretive_gloss.slice(0, 200)}${turn.grammarOutput.interpretive_gloss.length > 200 ? '...' : ''}"`
      ).join('\n');

  const corpusSection = retrievedPages.length === 0
    ? '(no corpus entries retrieved)'
    : retrievedPages.map((page, i) =>
        `## Source ${i + 1}: ${page.title}\nPath: ${page.href}\nContent: ${(page.content || '').slice(0, 1500)}`
      ).join('\n\n---\n\n');

  return `CURRENT CRISIS (failure pattern: ${crisis.failure_pattern}):

${crisis.trigger}

CURRENT STATE VECTOR:
${stateVector}

PLAYER'S POLICY MOVE:
${playerMove}

RECENT TURN HISTORY:
${historySection}

RETRIEVED CORPUS CONTEXT:
${corpusSection}

Produce the JSON output now.`;
}

function retrieveContext(crisis, playerMove, limit = 6) {
  const pages = loadIndex();
  const query = `${crisis.trigger} ${playerMove}`;
  const selected = rankPagesForQuestion(query, pages, limit);
  return readSelectedPages(selected, WIKI_DIR);
}

async function interpret({ crisis, state, playerMove, turnHistory = [], model = process.env.OPENROUTER_MODEL, maxAttempts = 3 }) {
  loadEnv(ROOT_DIR);

  const retrievedPages = retrieveContext(crisis, playerMove);

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({ crisis, state, playerMove, turnHistory, retrievedPages });

  const client = createClient({ title: 'Polycrisis Grammar', temperature: 0.2 });

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    let response;
    try {
      response = await client.complete(messages, { temp: 0.2 });
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) continue;
      throw new Error(`Grammar call failed after ${maxAttempts} attempts: ${err.message}`);
    }

    // Parse the JSON response — try multiple strategies
    let parsed = null;
    let parseError = null;

    try {
      // Strategy 1: direct parse
      parsed = JSON.parse(response.trim());
    } catch (e1) {
      try {
        // Strategy 2: strip markdown code fences
        const jsonText = response
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```\s*$/i, '')
          .trim();
        parsed = JSON.parse(jsonText);
      } catch (e2) {
        try {
          // Strategy 3: extract first JSON object from response
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
        return parsed;
      } catch (validationError) {
        lastError = validationError;
        if (attempt < maxAttempts) continue;
        throw validationError;
      }
    }

    lastError = parseError || new Error('Could not parse JSON from response');
    if (attempt < maxAttempts) {
      // Retry — could improve by adding a "respond with valid JSON only" hint
      continue;
    }
  }

  throw new Error(`Grammar output could not be parsed after ${maxAttempts} attempts: ${lastError?.message || 'unknown error'}`);
}

function validate(output) {
  if (!output || typeof output !== 'object') {
    throw new Error('Grammar output is not an object');
  }
  if (!output.state_delta || typeof output.state_delta !== 'object') {
    throw new Error('Grammar output missing state_delta');
  }
  const expectedAxes = ['legitimacy', 'fiscal_slack', 'elite_alignment', 'ecological_debt', 'narrative_coherence', 'capability_frontier'];
  for (const axis of expectedAxes) {
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
  if (typeof output.interpretive_gloss !== 'string' || output.interpretive_gloss.length === 0) {
    throw new Error('interpretive_gloss missing or empty');
  }
  if (typeof output.narrative_move !== 'string' || output.narrative_move.length === 0) {
    throw new Error('narrative_move missing or empty');
  }
  if (!Array.isArray(output.grounding_trace) || output.grounding_trace.length === 0) {
    throw new Error('grounding_trace missing or empty');
  }
  if (!['low', 'medium', 'high'].includes(output.confidence)) {
    throw new Error(`confidence must be low, medium, or high; got ${output.confidence}`);
  }
}

module.exports = {
  interpret,
  retrieveContext,
  validate,
  buildSystemPrompt,
  buildUserPrompt,
};