'use strict';

/**
 * seed-variants.js
 *
 * Cycle 5d. The parameterized seed variants. Each of the 8 authored seeds
 * has an actor pool and a seed fragment. selectSeed() picks a (seed, actor)
 * pair per run; the world generator writes the full situation/pressure/
 * decision-point prose given the fragment + actor + state.
 *
 * Why parameterize: the original 8 seeds had identical situation prose
 * every time they surfaced. A player running the simulation multiple times
 * would see the same Anthropic/OpenAI/etc. names, same event framing. The
 * actor pool gives variation across runs while keeping the curated failure
 * pattern + axes + theme.
 *
 * Actor selection: random-with-no-repeat per run. If a seed has 5 actors
 * in its pool and the seed is used 3 times across the run (rare — seeds
 * don't repeat within a run), the actors don't repeat within that run.
 *
 * Across runs: same seed pool, different actor picked each time. The
 * player will see "Anthropic released..." one run and "OpenAI released..."
 * the next.
 */

// Each seed: { id, fragment, failurePattern, focalAxes, actors }
//   - id: matches the wiki/mechanics/crises/<id>-*.md filename prefix
//   - fragment: 1 sentence; the LLM's prompt anchor (not the situation prose)
//   - failurePattern: matches crisis-anatomy's four patterns
//   - focalAxes: which axes this seed foregrounds
//   - actors: pool of 3-5 actor identities; one is picked per run

const SEED_VARIANTS = [
  {
    id: 'crisis-1',
    fragment: 'A frontier AI lab has released a new model that can do things the regulator hasn\'t learned to evaluate yet.',
    failurePattern: 'upstream-embedding',
    focalAxes: ['elite_alignment', 'narrative_coherence', 'capability_frontier'],
    actors: ['Anthropic', 'OpenAI', 'DeepMind', 'Meta AI', 'Mistral'],
  },
  {
    id: 'crisis-2',
    fragment: 'A widely-shared post documents an AI content moderation system producing systematically biased outputs.',
    failurePattern: 'upstream-embedding',
    focalAxes: ['legitimacy', 'narrative_coherence', 'elite_alignment'],
    actors: ['Twitter/X', 'Meta', 'TikTok', 'Reddit', 'OpenAI\'s moderation API'],
  },
  {
    id: 'crisis-3',
    fragment: 'A foreign government has announced a sovereign AI compute fund backed by state resources.',
    failurePattern: 'compute-capability-escape',
    focalAxes: ['fiscal_slack', 'capability_frontier', 'elite_alignment'],
    actors: ['UAE', 'Saudi Arabia', 'Singapore', 'EU sovereign cloud', 'US federal program'],
  },
  {
    id: 'crisis-4',
    fragment: 'A research lab has published a paper demonstrating that an AI model has crossed a capability threshold.',
    failurePattern: 'compute-capability-escape',
    focalAxes: ['capability_frontier', 'narrative_coherence', 'ecological_debt'],
    actors: ['OpenAI', 'Anthropic', 'DeepMind', 'Academic preprint', 'Allen AI Institute'],
  },
  {
    id: 'crisis-5',
    fragment: 'Public polling shows trust in AI governance has dropped sharply in the past quarter.',
    failurePattern: 'legitimacy-erosion',
    focalAxes: ['legitimacy', 'narrative_coherence', 'elite_alignment'],
    actors: ['US polling', 'UK polling', 'EU polling', 'Canadian polling', 'Australian polling'],
  },
  {
    id: 'crisis-6',
    fragment: 'Several senior safety researchers have left major AI labs, citing concerns about deployment decisions.',
    failurePattern: 'legitimacy-erosion',
    focalAxes: ['elite_alignment', 'narrative_coherence', 'legitimacy'],
    actors: ['Anthropic', 'OpenAI', 'DeepMind', 'Google DeepMind', 'Meta AI'],
  },
  {
    id: 'crisis-7',
    fragment: 'A major media acquisition has shifted how AI policy debates are covered.',
    failurePattern: 'memetic-narrative-capture',
    focalAxes: ['narrative_coherence', 'elite_alignment', 'legitimacy'],
    actors: ['Vox Media', 'Semafor', 'Axios', 'TechCrunch', 'A Substack acquisition'],
  },
  {
    id: 'crisis-8',
    fragment: 'Coordinated inauthentic behavior has shaped the AI policy debate faster than fact-checkers can respond.',
    failurePattern: 'memetic-narrative-capture',
    focalAxes: ['narrative_coherence', 'legitimacy', 'elite_alignment'],
    actors: ['Russia-attributed', 'China-attributed', 'Iran-attributed', 'Unattributed but state-aligned', 'Domestic partisan'],
  },
];

/**
 * Pick a seed and actor for a given turn. Seeds don't repeat within a run
 * (tracked via `usedIds`). The actor is chosen randomly from the seed's
 * pool; if `usedActors` is provided, the chosen actor is excluded so
 * actors don't repeat within a run either.
 *
 * Returns: { id, fragment, failurePattern, focalAxes, actor, allActors }
 */
function selectSeed({ state = null, usedIds = [], usedActors = [] } = {}) {
  const available = SEED_VARIANTS.filter(s => !usedIds.includes(s.id));
  if (available.length === 0) {
    // All seeds used — pick the first one (cycle back, but the world is
    // already different by this point in the run).
    return null;
  }
  // Pick the seed whose failure pattern most matches the active axes.
  // This keeps the deck-selection logic from crisis-generator.js but uses
  // the new seed shape. The selection is weighted-random: seeds that
  // match the state's most-stressed axes get higher weight, but every seed
  // has a non-zero chance of being selected so the deck varies across runs.
  const stateScores = available.map((seed) => {
    let score = 0;
    if (state) {
      for (const axis of seed.focalAxes) {
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
    }
    return { seed, score };
  });
  // Add a baseline of 1.0 to every seed so even the worst-scoring seed
  // has a non-zero chance of being picked. Then weighted random selection.
  const totalWeight = stateScores.reduce((sum, s) => sum + s.score + 1.0, 0);
  let r = Math.random() * totalWeight;
  let chosen = stateScores[0].seed;
  for (const { seed, score } of stateScores) {
    r -= (score + 1.0);
    if (r <= 0) {
      chosen = seed;
      break;
    }
  }

  // Pick an actor the run hasn't seen yet, if possible.
  const availableActors = chosen.actors.filter(a => !usedActors.includes(a));
  const actorPool = availableActors.length > 0 ? availableActors : chosen.actors;
  const actor = actorPool[Math.floor(Math.random() * actorPool.length)];

  return {
    id: chosen.id,
    fragment: chosen.fragment,
    failurePattern: chosen.failurePattern,
    focalAxes: chosen.focalAxes,
    actor,
    allActors: chosen.actors,
  };
}

module.exports = {
  SEED_VARIANTS,
  selectSeed,
};