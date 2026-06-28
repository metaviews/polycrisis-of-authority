'use strict';

/**
 * crisis-generator.js
 *
 * Selects and surfaces crises from the wiki mechanics/crises/ deck.
 * Per wiki/mechanics/crisis-anatomy.md.
 *
 * For 2b (skeleton), the deck is loaded from hard-coded metadata
 * rather than from the wiki files. Cycle 2c can replace this with
 * a real wiki loader.
 */

const { AXIS_NAMES } = require('./state');

// Crisis deck — hand-extracted from wiki/mechanics/crises/*.md frontmatter
// (transition to wiki loading in 2c)
const CRISIS_DECK = [
  {
    id: 'crisis-1',
    title: 'Frontier lab capability release',
    trigger: 'Anthropic has released Claude Mythos, a new frontier model with agentic capabilities exceeding the regulator\'s current evaluation framework. The release was announced with a 14-day notice; the regulator\'s safety team cannot complete a meaningful evaluation in that window.',
    failure_pattern: 'upstream-embedding',
    focal_axes: ['elite_alignment', 'narrative_coherence', 'capability_frontier'],
    trigger_kind: 'capability-driven',
  },
  {
    id: 'crisis-2',
    title: 'Content moderation incident',
    trigger: 'A widely-shared social media post documents an AI content moderation system producing systematically biased outputs against dialectal English varieties. The post goes viral with screenshots. Civil society organizations are calling for an immediate investigation.',
    failure_pattern: 'upstream-embedding',
    focal_axes: ['legitimacy', 'narrative_coherence', 'elite_alignment'],
    trigger_kind: 'incident-driven',
  },
  {
    id: 'crisis-3',
    title: 'Compute concentration announcement',
    trigger: 'The UAE has announced a sovereign AI compute fund backed by oil revenue, sized at $80 billion over five years. The fund will provide compute access to international AI labs at below-market rates.',
    failure_pattern: 'compute-capability-escape',
    focal_axes: ['fiscal_slack', 'capability_frontier', 'elite_alignment'],
    trigger_kind: 'capability-driven',
  },
  {
    id: 'crisis-4',
    title: 'Model agentic capability threshold',
    trigger: 'OpenAI has published a paper demonstrating an agentic capability threshold: a model that can complete a multi-step economic task (procurement, contracting, payment) with human-level reliability. Industry analysts are calling this "the agentic moment."',
    failure_pattern: 'compute-capability-escape',
    focal_axes: ['capability_frontier', 'narrative_coherence', 'ecological_debt'],
    trigger_kind: 'capability-driven',
  },
  {
    id: 'crisis-5',
    title: 'Public legitimacy tipping point',
    trigger: 'Polling this week shows that public trust in AI governance has dropped 12 points in three months. The drop is concentrated among voters who previously expressed moderate confidence. The press is framing the moment as "the legitimacy crisis arriving."',
    failure_pattern: 'legitimacy-erosion',
    focal_axes: ['legitimacy', 'narrative_coherence', 'elite_alignment'],
    trigger_kind: 'legitimacy-driven',
  },
  {
    id: 'crisis-6',
    title: 'Elite defection sequence',
    trigger: 'Three senior safety researchers have left major AI labs in the past month, citing concerns about deployment decisions. Their departures have been characterized in press coverage as "a credibility crisis for the labs\' internal safety functions."',
    failure_pattern: 'legitimacy-erosion',
    focal_axes: ['elite_alignment', 'narrative_coherence', 'legitimacy'],
    trigger_kind: 'elite-driven',
  },
  {
    id: 'crisis-7',
    title: 'Narrative capture via media consolidation',
    trigger: 'A major media acquisition has been completed: a single corporate entity now controls a substantial share of the AI-policy-adjacent press. Coverage in the past week has shifted noticeably toward framing AI policy debates in terms the industry\'s preferred narrative.',
    failure_pattern: 'memetic-narrative-capture',
    focal_axes: ['narrative_coherence', 'elite_alignment', 'legitimacy'],
    trigger_kind: 'elite-driven',
  },
  {
    id: 'crisis-8',
    title: 'Memetic warfare / foreign disinformant',
    trigger: 'Coordinated inauthentic behavior has been detected across major platforms, framing the current AI policy debate around a narrative that conflates several distinct policy questions. The campaign has been attributed to a state actor. The narrative frame has gained traction faster than fact-checkers can respond.',
    failure_pattern: 'memetic-narrative-capture',
    focal_axes: ['narrative_coherence', 'legitimacy', 'elite_alignment'],
    trigger_kind: 'incident-driven',
  },
];

function selectCrisis({ state, turn, usedIds = [] }) {
  // Selection criteria per crisis-anatomy.md:
  // 1. Failure pattern most active in current state
  // 2. Focal axes should be the most stressed axes
  // 3. Don't repeat the same crisis

  const available = CRISIS_DECK.filter((c) => !usedIds.includes(c.id));
  if (available.length === 0) {
    // All crises used — pick the first one (cycle back)
    return CRISIS_DECK[0];
  }

  // Score each crisis by how well its focal axes match stressed axes
  const scored = available.map((crisis) => {
    let score = 0;
    for (const axis of crisis.focal_axes) {
      const v = state[axis];
      // Higher score for crises that focus on axes under pressure
      if (axis === 'ecological_debt') {
        // High ecological_debt is bad; high values are stressed
        if (v > 50) score += 2;
        if (v > 70) score += 2;
      } else {
        // For other axes, low values are stressed
        if (v < 50) score += 1;
        if (v < 30) score += 2;
        if (v < 20) score += 1;
      }
    }
    // Bonus for capability-driven crises when frontier is high
    if (crisis.trigger_kind === 'capability-driven' && state.capability_frontier > 70) {
      score += 2;
    }
    // Bonus for legitimacy-driven crises when legitimacy is low
    if (crisis.trigger_kind === 'legitimacy-driven' && state.legitimacy < 40) {
      score += 2;
    }
    return { crisis, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].crisis;
}

function listCrises() {
  return CRISIS_DECK.map((c) => ({ id: c.id, title: c.title, failure_pattern: c.failure_pattern }));
}

module.exports = {
  CRISIS_DECK,
  selectCrisis,
  listCrises,
};
