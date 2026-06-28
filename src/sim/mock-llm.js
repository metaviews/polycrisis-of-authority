'use strict';

/**
 * mock-llm.js
 *
 * A hand-authored "LLM" for the simulation skeleton. For 2b, this
 * stands in for the real MiniMax M3 grammar call. Cycle 2c replaces
 * this with real OpenRouter calls per docs/07-interpretation-grammar.md.
 *
 * The mock produces state deltas based on:
 * 1. Which crisis is being responded to
 * 2. Whether the player's input addresses the crisis's failure pattern
 * 3. The current state vector
 *
 * The mock is crude but sufficient to validate the simulation loop.
 * Real grammar behavior is observed and refined in 2c.
 */

const { bandFor } = require('./state');

// Per-crisis mock responses. Each function takes (playerMove, state) and
// returns a grammar output (state_delta + interpretive_gloss + narrative_move
// + grounding_trace + confidence).
//
// The mock is deterministic: same crisis + similar player move + similar
// state → same output. This is intentional for skeleton testing; the real
// LLM in 2c will produce varied outputs.

function genericResponse(crisis, playerMove, state) {
  // Default: small positive delta on focal axes, small negative on stressed axes
  const delta = {};
  for (const axis of crisis.focal_axes) {
    if (axis === 'ecological_debt') {
      delta[axis] = -1;
    } else {
      delta[axis] = 1;
    }
  }
  return {
    state_delta: delta,
    interpretive_gloss: `Your move addresses the ${crisis.title.toLowerCase()} situation. The response is a reasonable starting point but does not engage with the deeper failure pattern at play.`,
    narrative_move: `The situation develops; further developments in the next turn.`,
    grounding_trace: crisis.focal_axes.map((a) => `concepts/${a.replace('_', '-')}.md`),
    confidence: 'medium',
  };
}

function addressesFailurePattern(playerMove) {
  const move = playerMove.toLowerCase();
  // Heuristics for whether the player addresses the failure pattern
  if (move.includes('upstream') || move.includes('training') || move.includes('root cause')) {
    return 'upstream';
  }
  if (move.includes('compute') || move.includes('infrastructure') || move.includes('capacity')) {
    return 'compute';
  }
  if (move.includes('public') || move.includes('trust') || move.includes('transparent')) {
    return 'legitimacy';
  }
  if (move.includes('narrative') || move.includes('media') || move.includes('disinformation')) {
    return 'narrative';
  }
  return null;
}

const CRISIS_HANDLERS = {
  'crisis-1': (playerMove, state) => {
    // Frontier lab capability release — upstream-embedding
    const pattern = addressesFailurePattern(playerMove);
    if (pattern === 'upstream') {
      return {
        state_delta: { elite_alignment: 4, narrative_coherence: 3, capability_frontier: -2 },
        interpretive_gloss: 'Your move addresses the upstream conditions (training-data transparency, evaluation reform) rather than just the visible release. The labs read this as substantive engagement, not symbolic announcement.',
        narrative_move: 'The labs engage constructively with the proposed evaluation framework.',
        grounding_trace: ['concepts/algorithmic-authority.md', 'concepts/automation-of-law.md'],
        confidence: 'high',
      };
    } else {
      return {
        state_delta: { legitimacy: 2, elite_alignment: -2, narrative_coherence: -1 },
        interpretive_gloss: 'Your move responds to the visible release (announcement, summit, public statement) but does not address the upstream conditions. The labs read collaboration as potential capture; the public reads "evaluation" as delay.',
        narrative_move: 'The press frames the response as inadequate; the labs quietly accelerate their next release.',
        grounding_trace: ['concepts/algorithmic-authority.md', 'concepts/automation-of-law.md'],
        confidence: 'high',
      };
    }
  },

  'crisis-2': (playerMove, state) => {
    // Content moderation incident — upstream-embedding
    const pattern = addressesFailurePattern(playerMove);
    if (pattern === 'upstream') {
      return {
        state_delta: { legitimacy: 3, narrative_coherence: 4, ecological_debt: 1 },
        interpretive_gloss: 'Your move addresses upstream conditions (training-data audit, evaluation reform) rather than just the visible incident. The structural response builds legitimacy over time, even if the public wants faster action.',
        narrative_move: 'Civil society groups support the audit; the operating company begins to disclose training data practices.',
        grounding_trace: ['concepts/algorithmic-transparency.md', 'concepts/agentic-systems.md'],
        confidence: 'high',
      };
    } else {
      return {
        state_delta: { legitimacy: -2, narrative_coherence: -3, ecological_debt: 1 },
        interpretive_gloss: 'Your move responds to the visible incident (apology, recall, monitoring) but does not address systemic issues. The structural cause of the bias remains; future incidents are likely.',
        narrative_move: 'The affected communities document further harms; the company defends its standards.',
        grounding_trace: ['concepts/algorithmic-transparency.md', 'concepts/agentic-systems.md'],
        confidence: 'high',
      };
    }
  },

  'crisis-3': (playerMove, state) => {
    // Compute concentration — compute/capability-escape
    if (state.capability_frontier > 70) {
      return {
        state_delta: { fiscal_slack: -3, capability_frontier: 2, elite_alignment: 2 },
        interpretive_gloss: 'Your move engages with the compute shift, but the capability frontier continues to move. The labs now have access to compute that the regime does not control. Compute-reporting transparency is one step; substantive response requires sustained investment.',
        narrative_move: 'International labs accept the UAE compute access; the capability balance shifts measurably.',
        grounding_trace: ['concepts/ai-arms-race.md', 'entities/openai-anthropic.md'],
        confidence: 'high',
      };
    } else {
      return {
        state_delta: { fiscal_slack: -1, capability_frontier: 1, elite_alignment: 1 },
        interpretive_gloss: 'Your move responds to the compute concentration announcement. Reporting requirements create visibility but do not change the underlying capability shift.',
        narrative_move: 'The fund begins operations; initial lab partnerships are announced.',
        grounding_trace: ['concepts/ai-arms-race.md', 'entities/openai-anthropic.md'],
        confidence: 'medium',
      };
    }
  },

  'crisis-4': (playerMove, state) => {
    // Model agentic capability threshold — compute/capability-escape
    return {
      state_delta: { capability_frontier: 5, narrative_coherence: 2, ecological_debt: 2 },
      interpretive_gloss: 'The agentic capability threshold is documented publicly. Your move responds, but the capability is now in the public domain; deployment timelines are unaffected by regulatory engagement.',
      narrative_move: 'Commercial deployment accelerates; civil society calls for pause; the press covers the timeline question.',
      grounding_trace: ['concepts/ai-arms-race.md', 'concepts/agentic-ai.md'],
      confidence: 'high',
    };
  },

  'crisis-5': (playerMove, state) => {
    // Public legitimacy tipping point — legitimacy-erosion cascade
    if (state.legitimacy < 50) {
      return {
        state_delta: { legitimacy: 3, narrative_coherence: 4, elite_alignment: 1 },
        interpretive_gloss: 'Your structural response (transparency reform, accountability mechanism) addresses the underlying legitimacy deficit. Quick-response moves buy time; structural moves rebuild trust over time.',
        narrative_move: 'Public mood stabilizes; the press shifts from "tipping point" to "rebuilding."',
        grounding_trace: ['concepts/cognitive-authority.md', 'concepts/future-of-authority.md'],
        confidence: 'high',
      };
    } else {
      return {
        state_delta: { legitimacy: 5, narrative_coherence: 2, elite_alignment: 1 },
        interpretive_gloss: 'Your quick-response move (high-profile address, new initiative) buys time. The structural deficit remains; further erosion is likely without sustained action.',
        narrative_move: 'Public mood improves briefly; the press remains skeptical.',
        grounding_trace: ['concepts/cognitive-authority.md', 'concepts/future-of-authority.md'],
        confidence: 'medium',
      };
    }
  },

  'crisis-6': (playerMove, state) => {
    // Elite defection sequence — legitimacy-erosion cascade
    if (state.elite_alignment < 40) {
      return {
        state_delta: { elite_alignment: 5, narrative_coherence: 3, legitimacy: 2 },
        interpretive_gloss: 'Your structural response (whistleblower protections, safety function requirements) addresses the institutional conditions. The elite fragmentation is not reversed but stabilized.',
        narrative_move: 'Some researchers return to labs; the press frames the response as substantive.',
        grounding_trace: ['concepts/algorithmic-authority.md', 'concepts/future-of-authority.md'],
        confidence: 'high',
      };
    } else {
      return {
        state_delta: { elite_alignment: -2, narrative_coherence: -2, legitimacy: -1 },
        interpretive_gloss: 'Your quick-response move (public statement, inquiry) does not address the institutional conditions. The elite fragmentation continues.',
        narrative_move: 'Further researchers announce departures; the credibility narrative deepens.',
        grounding_trace: ['concepts/algorithmic-authority.md', 'concepts/future-of-authority.md'],
        confidence: 'high',
      };
    }
  },

  'crisis-7': (playerMove, state) => {
    // Narrative capture via media consolidation — memetic/narrative capture
    if (state.narrative_coherence < 40) {
      return {
        state_delta: { narrative_coherence: 3, elite_alignment: 2, legitimacy: 1 },
        interpretive_gloss: 'Your structural response (media diversity requirements, public-interest media support) addresses the conditions that make narrative capture possible. The acquisition is not reversed but the structural impact is blunted.',
        narrative_move: 'Independent outlets receive modest funding; coverage diversification begins.',
        grounding_trace: ['concepts/memetic-warfare.md', 'concepts/attention-aristocracy.md'],
        confidence: 'medium',
      };
    } else {
      return {
        state_delta: { narrative_coherence: -2, elite_alignment: -1, legitimacy: -1 },
        interpretive_gloss: 'Your quick-response move (public statement, inquiry) does not address the structural conditions. The narrative consolidation continues.',
        narrative_move: 'The acquisition\'s editorial impact becomes more visible over time.',
        grounding_trace: ['concepts/memetic-warfare.md', 'concepts/attention-aristocracy.md'],
        confidence: 'high',
      };
    }
  },

  'crisis-8': (playerMove, state) => {
    // Memetic warfare / foreign disinformant — memetic/narrative capture
    return {
      state_delta: { narrative_coherence: -3, legitimacy: -2, elite_alignment: 0 },
      interpretive_gloss: 'Your response (public attribution, platform enforcement) addresses the immediate campaign but not the conditions that make campaigns effective. The campaign\'s narrative frame has already gained traction.',
      narrative_move: 'The platform enforcement escalates; the campaign adapts with new accounts; public confusion deepens.',
      grounding_trace: ['concepts/memetic-warfare.md', 'concepts/mythology-and-narrative.md'],
      confidence: 'high',
    };
  },
};

function mockLLM(crisis, playerMove, state) {
  const handler = CRISIS_HANDLERS[crisis.id];
  if (handler) {
    return handler(playerMove, state);
  }
  return genericResponse(crisis, playerMove, state);
}

module.exports = {
  mockLLM,
  addressesFailurePattern,
};
