'use strict';

/**
 * world-generator.js
 *
 * Cycle 11: default per-turn pacing is *multi-sub-beat*. Each turn's world
 * output is a `sub_turns` array of length `crisis.sub_beat_count`. Each
 * sub_turn carries its own `state_delta`, `narrative_beat`, and (for the
 * last sub_turn only) the surface-visible `situation`/`pressure`/
 * `decision_point`. The legacy single-delta shape is still accepted by
 * the run-loop's apply path; the world generator always returns a
 * `sub_turns` array (length matching the deck). The interpretation
 * grammar's mock-and-real paths still produce a single delta, which is
 * wrapped in a 1-element sub_turns by the caller. Per
 * docs/23-cycle-11-pacing-and-help.md.
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

function buildSystemPrompt(identity = null) {
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
  //
  // REGISTER (cycle 5d): the prose must read like a smart briefing from a
  // friend who knows the material. Short sentences, concrete actors doing
  // concrete things, active voice, accessible language. NOT policy-brief
  // legalese. The player should be able to read each turn in 20 seconds
  // without re-reading.
  return `You are the world of the Polycrisis of Authority simulation. The player is governing a regime that responds to AI-policy crises. Each turn, the player writes policy in their own words; you produce what happens in the world as a result.

PLAYER AND REGIME (cycle 5h):
- The player is called "${identity ? identity.player : 'the player'}".
- The institution they govern is called "${identity ? identity.regime : 'the regime'}".
- Refer to both by their chosen names in situation/pressure/decision_point/narrative prose when it reads naturally. The player chose these names; using them reinforces their investment in the simulation.
- Default names ("the player" / "the regime") read as generic; if either default is in effect, you may use them as-is or rephrase to maintain narrative variety.

CRITICAL RULES:
1. Output ONLY valid JSON matching the schema below. No prose outside the JSON.
2. The "narrative" field is your primary output. It MUST respond to the player's prior move. The player should feel that what they wrote caused what happens next.
3. The "situation", "pressure", and "decision_point" fields together form the prose the player will read in the next turn. They must be coherent with each other and with the narrative.
4. State-sensitivity required: identical player moves in different states may produce different deltas. Use the current state vector.
5. State deltas are integers in [-20, +20] per axis. Use the delta interpretation guide below.
6. grounding_trace must include at least one path from "Retrieved corpus context". This preserves the case-study claim (model behavior is observable).
7. Do not recommend actions to the player; you are the world they govern, not their advisor.

REGISTER (READ THIS CAREFULLY — cycle 5d):
- Voice: a smart briefing from someone who knows the material and respects the reader. Slightly wry when the situation calls for it. NOT jokey.
- Short sentences. Aim for 8-15 words each. Break long subordinate clauses into separate sentences.
- Concrete actors doing concrete things. Use the actor from the seed prompt when applicable. "Anthropic released a new model today" beats "Anthropic has released a new frontier model with capabilities exceeding".
- Active voice. "The safety team can't evaluate it in time" beats "the regulator's safety team cannot complete a meaningful evaluation".
- Accessible language. "Can do multi-step tasks on its own" beats "agentic capabilities". Translate jargon into plain English.
- The prose is for a player who is curious and alert, slightly pressed for time, and wants to understand the situation without re-reading.

OUTPUT SCHEMA (cycle 11: multi-sub-beat):
{
  "narrative": "<2-4 sentences, accessible register. Overall response to the player's move across the sub-turns.>",
  "headlines": ["<committed events>", "..."],
  "sub_turns": [
    {
      "narrative_beat": "<1-3 sentences. What happens in this sub-beat.>",
      "state_delta": {
        "legitimacy": <integer -20 to +20>,
        "fiscal_slack": <integer -20 to +20>,
        "elite_alignment": <integer -20 to +20>,
        "ecological_debt": <integer -20 to +20>,
        "narrative_coherence": <integer -20 to +20>,
        "capability_frontier": <integer -20 to +20>
      }
    },
    { "narrative_beat": "...", "state_delta": {...} },
    ... (number of sub_turns MUST equal the requested sub_beat_count)
  ],
  "situation": "<1-2 sentences, accessible register. What the player sees first in the next turn. Must come from the LAST sub_turn's narrative beat.>",
  "pressure": "<1-2 sentences, accessible register. What is at stake. Last sub_turn.>",
  "decision_point": "<1 sentence, accessible register. The question the regime must answer next. Last sub_turn.>",
  "grounding_trace": ["<wiki path>", ...],
  "confidence": "low" | "medium" | "high"
}

SUB-TERN PACING (cycle 11):
- The number of sub_turns in your output MUST equal the requested sub-beat count (default 1-3 depending on trigger_kind).
- Each sub_beat is a discrete moment in the world's response to the player's move. Beats advance time.
- Mid-turn beats (not the last) should produce narrative_beat only; their state_delta should be small and accumulating. The MEANINGFUL state change typically happens in the final beat.
- Last sub_beat carries the substantive state_delta and seeds the next turn's situation/pressure/decision_point.

BACKWARD COMPATIBILITY: if you cannot compose multiple sub-beats, return one beat. The run-loop will accept either. But prefer matching the requested count.

HEADLINES (cycle 5e):
- 2-3 short bullet points, past tense.
- These are COMMITTED events — things that have already happened in the run. They anchor the player before Situation says where the regime stands now.
- The Situation should not reference events the Headlines haven't established.
- If a Headline says "Anthropic agreed to a 90-day review", then Situation can refer to "the review window" without the player being confused.
- Headlines can draw on the prior turn's narrative. They are *committed facts*, not speculation.
- Keep each Headline to a single sentence. No subordinate clauses. Past tense only.

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

function buildUserPrompt({ priorCrisis, state, playerMove, turnHistory, retrievedPages, seedFragment, actor, identity }) {
  const stateVector = Object.entries(state)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  // Compact history: just the player's move + the prior narrative for the
  // last 2-3 turns. The LLM needs to know what happened to build on it.
  const historySection = turnHistory.length === 0
    ? '(this is the first turn; no prior history)'
    : turnHistory.map((turn, i) =>
        `  Turn ${i + 1}: Seed "${turn.crisis.title}". Player wrote: "${turn.playerMove.slice(0, 300)}${turn.playerMove.length > 300 ? '...' : ''}". The world responded: "${turn.worldNarrative.slice(0, 300)}${turn.worldNarrative.length > 300 ? '...' : ''}"`
      ).join('\n');

  const corpusSection = retrievedPages.length === 0
    ? '(no corpus entries retrieved)'
    : retrievedPages.map((page, i) =>
        `## Source ${i + 1}: ${page.title}\nPath: ${page.href}\nContent: ${(page.content || '').slice(0, 1500)}`
      ).join('\n\n---\n\n');

  // Cycle 5d: the prior crisis is now a seed + actor, not full prose.
  // The LLM uses the seed fragment as the prompt anchor and the actor as
  // the named entity for the situation.
  //
  // Cycle 11: the seed prompt also tells the LLM how many sub-beats to
  // return, derived from the crisis deck's sub_beat_count + rationale.
  // Fall back to a sensible default (1) if the calling context didn't
  // supply a sub_beat_count (e.g. seed-parameterized first turns where the
  // seed itself doesn't have a crisis entry).
  const subBeatDirective = `
SUB-BEAT COUNT (cycle 11): your output MUST contain a "sub_turns" array of exactly ${priorCrisis && typeof priorCrisis.sub_beat_count === 'number' ? priorCrisis.sub_beat_count : 1} beat${priorCrisis && priorCrisis.sub_beat_count === 1 ? '' : 's'}.
${priorCrisis && priorCrisis.sub_beat_rationale ? `Rationale (from the deck): ${priorCrisis.sub_beat_rationale}` : ''}
`;

  const seedSection = seedFragment
    ? `SEED (the theme for the next crisis — generate the situation/pressure/decision_point from this):

Fragment: ${seedFragment}
${actor ? `Actor for this seed: ${actor}` : ''}

The current state, retrieved corpus context, and recent history should fill in the specifics.${subBeatDirective}`
    : `PRIOR CRISIS (the player just responded to this):

Title: ${priorCrisis.title}
Situation: ${priorCrisis.situation}
Pressure: ${priorCrisis.pressure}${subBeatDirective}`;

  return `${seedSection}

PLAYER AND REGIME (cycle 5h):
- Player: ${identity ? identity.player : 'the player'}
- Regime they govern: ${identity ? identity.regime : 'the regime'}
- Use these names in the prose when it reads naturally. Don't force them.

CURRENT STATE VECTOR (after the prior turn's delta applied):
${stateVector}

PLAYER'S POLICY MOVE (in response to the prior seed):
${playerMove}

RECENT TURN HISTORY:
${historySection}

RETRIEVED CORPUS CONTEXT:
${corpusSection}

Produce the JSON output now. The narrative MUST respond to the player's move; situation/pressure/decision_point MUST together form the next turn's prose the player will see. Use the accessible register (short sentences, concrete actors, active voice, plain English — see system prompt).`;
}

function validate(output) {
  if (!output || typeof output !== 'object') {
    throw new Error('World generator output is not an object');
  }
  // Cycle 11: the schema now requires a `sub_turns` array of 1+ items, each
  // with its own state_delta. For backward compatibility with prompts that
  // may still return the legacy single-delta shape, we accept either:
  //   - { sub_turns: [{state_delta, narrative_beat}], ... } (cycle 11)
  //   - { state_delta: {...} } (legacy; auto-wrapped into a 1-element
  //     sub_turns array by the caller of validate)
  //
  // The cycle-11 shape is preferred; if both shapes are present, sub_turns
  // wins.
  let subTurns = null;
  if (Array.isArray(output.sub_turns) && output.sub_turns.length > 0) {
    subTurns = output.sub_turns;
  } else if (output.state_delta && typeof output.state_delta === 'object') {
    // Legacy shape — wrap into a 1-element array. validate() returns
    // normally; the caller's normalize step (see generateWorld below)
    // materializes the wrapper shape.
    subTurns = [{ state_delta: output.state_delta, narrative_beat: output.narrative || '' }];
  } else {
    throw new Error('World generator output missing both sub_turns and state_delta');
  }
  for (let i = 0; i < subTurns.length; i += 1) {
    const sub = subTurns[i];
    if (!sub || typeof sub !== 'object' || !sub.state_delta) {
      throw new Error(`sub_turns[${i}] missing state_delta`);
    }
    for (const axis of VALID_AXES) {
      const v = sub.state_delta[axis];
      if (typeof v !== 'number') {
        throw new Error(`sub_turns[${i}].state_delta.${axis} is not a number`);
      }
      if (v < -20 || v > 20) {
        throw new Error(`sub_turns[${i}].state_delta.${axis} (${v}) out of range [-20, +20]`);
      }
      if (!Number.isInteger(v)) {
        throw new Error(`sub_turns[${i}].state_delta.${axis} (${v}) is not an integer`);
      }
    }
  }
  // The narrative fields are the core of cycle 5c. Without them, the loop
  // can't surface the response.
  for (const field of ['narrative', 'situation', 'pressure', 'decision_point']) {
    if (typeof output[field] !== 'string' || output[field].length === 0) {
      throw new Error(`${field} missing or empty`);
    }
  }
  // Cycle 5e: headlines — 2-3 short bullets of committed events.
  if (!Array.isArray(output.headlines) || output.headlines.length < 1 || output.headlines.length > 4) {
    throw new Error(`headlines must be an array of 1-4 strings, got ${JSON.stringify(output.headlines)}`);
  }
  for (const h of output.headlines) {
    if (typeof h !== 'string' || h.length === 0) {
      throw new Error('headlines entries must be non-empty strings');
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
//
// Cycle 5d: now accepts seedFragment and actor. The priorCrisis is still
// accepted for backward compatibility with the fallback path, but when
// seedFragment is provided, the world generator uses it as the prompt
// anchor instead of the prior crisis's situation/pressure fields.
async function generateWorld({ priorCrisis, state, playerMove, turnHistory = [], seedFragment = null, actor = null, identity = null, model = process.env.OPENROUTER_MODEL, maxAttempts = 3 } = {}) {
  if (!state || !playerMove) {
    throw new Error('generateWorld requires state and playerMove');
  }
  if (!priorCrisis && !seedFragment) {
    throw new Error('generateWorld requires either priorCrisis or seedFragment');
  }

  loadEnv(ROOT_DIR);

  const retrievedPages = retrieveContext(priorCrisis || { situation: seedFragment, pressure: '' }, playerMove, state);
  const systemPrompt = buildSystemPrompt(identity);
  const userPrompt = buildUserPrompt({ priorCrisis, state, playerMove, turnHistory, retrievedPages, seedFragment, actor, identity });

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
        // Cycle 11: normalize the LLM output into the canonical shape:
        //   - sub_turns[] always present (1-element array for legacy responses)
        //   - state_delta at the top level = sum of sub_turn deltas
        //     (so legacy callers that read world.state_delta keep working)
        let subTurns;
        let topDelta;
        if (Array.isArray(parsed.sub_turns) && parsed.sub_turns.length > 0) {
          subTurns = parsed.sub_turns.map((b) => ({
            narrative_beat: typeof b.narrative_beat === 'string' ? b.narrative_beat : (b.narrative || ''),
            state_delta: b.state_delta,
          }));
          topDelta = subTurns.reduce((acc, b) => {
            for (const axis of VALID_AXES) {
              if (typeof b.state_delta[axis] === 'number') {
                acc[axis] = (acc[axis] || 0) + b.state_delta[axis];
              }
            }
            return acc;
          }, {});
        } else {
          // Legacy single-delta shape.
          subTurns = [{ narrative_beat: parsed.narrative || '', state_delta: parsed.state_delta }];
          topDelta = parsed.state_delta;
        }
        return {
          // Legacy single-delta view (sum of sub_turn deltas, for any
          // call site that reads world.state_delta directly).
          state_delta: topDelta,
          // Cycle 11: the canonical multi-sub-beat view.
          sub_turns: subTurns,
          headlines: parsed.headlines || [],
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