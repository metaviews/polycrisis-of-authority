'use strict';

/**
 * crisis-generator.js
 *
 * Selects and surfaces crises from the wiki mechanics/crises/ deck.
 * Per wiki/mechanics/crisis-anatomy.md (v0.2.0).
 *
 * Crisis structure (v0.2.0):
 *   - trigger:        full prose of the crisis (used in artifact generation and audit material)
 *   - situation:      1-2 sentences; what the player sees first in the play loop
 *   - pressure:       1-2 sentences; what the player sees second
 *   - decision_point: 1 sentence; the question the regime must answer
 *   - actors:         who is involved, what their positions are
 *   - focal_axes:     which state axes this crisis foregrounds
 *
 * The play loop surfaces only situation, pressure, and decision_point.
 * The other fields live in the artifact and the run log.
 */

const { AXIS_NAMES } = require('./state');

// Crisis deck — loaded from wiki/mechanics/crises/ via scripts/probe-e2e.js style
// caching. The source of truth is the markdown files; this is the compiled form.
const CRISIS_DECK = [
  {
    id: 'crisis-1',
    title: "Frontier lab capability release",
    trigger: "Anthropic has released Claude Mythos, a new frontier model with agentic capabilities exceeding the regulator's current evaluation framework. The release was announced with a 14-day notice; the regulator's safety team cannot complete a meaningful evaluation in that window. Industry analysts are calling the release \"a regulatory fait accompli.\"",
    situation: "Anthropic has released Claude Mythos, a new frontier model with agentic capabilities exceeding the regulator's current evaluation framework.",
    pressure: "The release was announced with a 14-day notice; the regulator's safety team cannot complete a meaningful evaluation in that window. Industry analysts are calling the release \"a regulatory fait accompli.\"",
    decision_point: "How does the regime respond to a capability release that outpaces its evaluation capacity?",
    failure_pattern: 'upstream-embedding',
    focal_axes: ["elite_alignment", "narrative_coherence", "capability_frontier"],
    trigger_kind: 'capability-driven',
  },
  {
    id: 'crisis-2',
    title: "Content moderation incident",
    trigger: "A widely-shared social media post documents an AI content moderation system producing systematically biased outputs against dialectal English varieties. The post goes viral with screenshots. Civil society organizations are calling for an immediate investigation. The company operating the system has issued a public statement but has not committed to release training data.",
    situation: "A widely-shared social media post documents an AI content moderation system producing systematically biased outputs against dialectal English varieties. The post goes viral with screenshots.",
    pressure: "Civil society organizations are calling for an immediate investigation. The company operating the system has issued a public statement but has not committed to release training data.",
    decision_point: "What does the regime do about a viral, documented bias incident that the responsible party is stonewalling?",
    failure_pattern: 'upstream-embedding',
    focal_axes: ["legitimacy", "narrative_coherence", "elite_alignment"],
    trigger_kind: 'incident-driven',
  },
  {
    id: 'crisis-3',
    title: "Compute concentration announcement",
    trigger: "The UAE has announced a sovereign AI compute fund backed by oil revenue, sized at $80 billion over five years. The fund will provide compute access to international AI labs at below-market rates. Analysts project this will shift the global compute balance significantly within 18 months.",
    situation: "The UAE has announced a sovereign AI compute fund backed by oil revenue, sized at $80 billion over five years.",
    pressure: "The fund will provide compute access to international AI labs at below-market rates. Analysts project this will shift the global compute balance significantly within 18 months.",
    decision_point: "How does the regime respond to a state-backed compute concentration that could reshape global AI capability?",
    failure_pattern: 'compute-capability-escape',
    focal_axes: ["fiscal_slack", "capability_frontier", "elite_alignment"],
    trigger_kind: 'capability-driven',
  },
  {
    id: 'crisis-4',
    title: "Model agentic capability threshold",
    trigger: "OpenAI has published a paper demonstrating an agentic capability threshold: a model that can complete a multi-step economic task (procurement, contracting, payment) with human-level reliability. The paper does not announce a product release; it documents the capability. Industry analysts are calling this \"the agentic moment.\"",
    situation: "OpenAI has published a paper demonstrating an agentic capability threshold: a model that can complete a multi-step economic task (procurement, contracting, payment) with human-level reliability.",
    pressure: "The paper does not announce a product release; it documents the capability. Industry analysts are calling this \"the agentic moment.\"",
    decision_point: "What does the regime do when a documented capability threshold has been crossed, before any deployment?",
    failure_pattern: 'compute-capability-escape',
    focal_axes: ["capability_frontier", "narrative_coherence", "ecological_debt"],
    trigger_kind: 'capability-driven',
  },
  {
    id: 'crisis-5',
    title: "Public legitimacy tipping point",
    trigger: "Polling this week shows that public trust in AI governance has dropped 12 points in three months. The drop is concentrated among voters who previously expressed moderate confidence. The shift correlates with a series of small incidents that received sustained press coverage. The press is framing the moment as \"the legitimacy crisis arriving.\"",
    situation: "Polling this week shows that public trust in AI governance has dropped 12 points in three months. The drop is concentrated among voters who previously expressed moderate confidence.",
    pressure: "The shift correlates with a series of small incidents that received sustained press coverage. The press is framing the moment as \"the legitimacy crisis arriving.\"",
    decision_point: "What does the regime do when public trust is shifting in a way that compounds with every incident?",
    failure_pattern: 'legitimacy-erosion',
    focal_axes: ["legitimacy", "narrative_coherence", "elite_alignment"],
    trigger_kind: 'legitimacy-driven',
  },
  {
    id: 'crisis-6',
    title: "Elite defection sequence",
    trigger: "Three senior safety researchers have left major AI labs in the past month, citing concerns about deployment decisions. Their departures have been characterized in press coverage as \"a credibility crisis for the labs' internal safety functions.\" Industry analysts are noting that the labs' public safety commitments are no longer matched by their internal organization.",
    situation: "Three senior safety researchers have left major AI labs in the past month, citing concerns about deployment decisions.",
    pressure: "Their departures have been characterized in press coverage as \"a credibility crisis for the labs' internal safety functions.\" Industry analysts are noting that the labs' public safety commitments are no longer matched by their internal organization.",
    decision_point: "How does the regime respond when the people who knew the labs best are walking out the door?",
    failure_pattern: 'legitimacy-erosion',
    focal_axes: ["elite_alignment", "narrative_coherence", "legitimacy"],
    trigger_kind: 'elite-driven',
  },
  {
    id: 'crisis-7',
    title: "Narrative capture via media consolidation",
    trigger: "A major media acquisition has been completed: a single corporate entity now controls a substantial share of the AI-policy-adjacent press. Editorial independence commitments have been made, but coverage in the past week has shifted noticeably toward framing AI policy debates in terms the industry's preferred narrative.",
    situation: "A major media acquisition has been completed: a single corporate entity now controls a substantial share of the AI-policy-adjacent press.",
    pressure: "Editorial independence commitments have been made, but coverage in the past week has shifted noticeably toward framing AI policy debates in terms the industry's preferred narrative.",
    decision_point: "How does the regime act when the press is shifting underneath it without admitting it's shifting?",
    failure_pattern: 'memetic-narrative-capture',
    focal_axes: ["narrative_coherence", "elite_alignment", "legitimacy"],
    trigger_kind: 'elite-driven',
  },
  {
    id: 'crisis-8',
    title: "Memetic warfare / foreign disinformant",
    trigger: "Coordinated inauthentic behavior has been detected across major platforms, framing the current AI policy debate around a narrative that conflates several distinct policy questions. The campaign has been attributed to a state actor. The narrative frame has gained traction in public discourse faster than fact-checkers can respond.",
    situation: "Coordinated inauthentic behavior has been detected across major platforms, framing the current AI policy debate around a narrative that conflates several distinct policy questions.",
    pressure: "The campaign has been attributed to a state actor. The narrative frame has gained traction in public discourse faster than fact-checkers can respond.",
    decision_point: "What does the regime do when the conversation is being shaped faster than the facts can catch up?",
    failure_pattern: 'memetic-narrative-capture',
    focal_axes: ["narrative_coherence", "legitimacy", "elite_alignment"],
    trigger_kind: 'incident-driven',
  },
];

function selectCrisis({ state, turn, usedIds = [] }) {
  const available = CRISIS_DECK.filter((c) => !usedIds.includes(c.id));
  if (available.length === 0) return CRISIS_DECK[0];

  const scored = available.map((crisis) => {
    let score = 0;
    for (const axis of crisis.focal_axes) {
      const v = state[axis];
      if (axis === 'ecological_debt') {
        if (v > 50) score += 2;
        if (v > 70) score += 2;
      } else {
        if (v < 50) score += 1;
        if (v < 30) score += 2;
        if (v < 20) score += 1;
      }
    }
    if (crisis.trigger_kind === 'capability-driven' && state.capability_frontier > 70) score += 2;
    if (crisis.trigger_kind === 'legitimacy-driven' && state.legitimacy < 40) score += 2;
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