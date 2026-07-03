'use strict';

/**
 * identity.js
 *
 * Cycle 5h. Player + regime identity captured at the start of a run.
 *
 * The simulation previously referred to the player as "you" and to the
 * governing body as "the regime." Both are abstract — they hold the
 * prose at arm's length from the person running it.
 *
 * Cycle 5h asks for two free-form strings at the start of every run:
 *   - player: who the player is. A name, a title, whatever they want.
 *   - regime: the institutional body the player governs. A coalition,
 *     an administration, an office, a council, a future — flexible.
 *
 * Both default to "the player" and "the regime" if the player leaves
 * the field blank. No validation, no format enforcement. Fun over
 * formality.
 *
 * The identity is propagated to:
 *   - the world generator (LLM prompt), so generated prose uses both
 *   - the briefing augmentation (one-liner identifying player + regime
 *     before the turn 1 Situation block)
 *   - the post-game narrator (regime name in summary lines)
 *   - the artifact generator (same)
 *   - advisors (regime name in their corpus references)
 *
 * Returns: { player, regime }
 *   - player: string, what the player calls themselves
 *   - regime: string, what the player calls the institution
 *
 * Threading: identity is captured once at the start of runInteractive
 * and passed as a parameter to functions that produce prose. Default
 * values match the legacy wording so that run logs / artifacts from
 * earlier cycles remain readable.
 */

const DEFAULT_PLAYER = 'the player';
const DEFAULT_REGIME = 'the regime';

async function promptForIdentity(reader) {
  // Multi-line prompt screen. The player types their name (or skips with
  // a blank line), then the regime (or skips). Both end with a blank
  // line. Echoes to stdout so the player can see what they typed.
  const playerInput = await reader.promptMove(
    '  What shall we call you? (blank for default)'
  );
  const regimeInput = await reader.promptMove(
    '  And what do you call the institution you govern? (blank for default)'
  );
  const player = (playerInput || '').trim() || DEFAULT_PLAYER;
  const regime = (regimeInput || '').trim() || DEFAULT_REGIME;
  return { player, regime };
}

module.exports = {
  DEFAULT_PLAYER,
  DEFAULT_REGIME,
  promptForIdentity,
};