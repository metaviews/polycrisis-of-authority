'use strict';

/**
 * surface.js
 *
 * Cycle 6b: surface adapter contract + formatCrisisForDiscord helper.
 *
 * The simulation engine produces events (turn-start, player-move, world-response,
 * collapse, end-of-run report). Different player surfaces (terminal, discord,
 * future web) consume those events through a documented adapter shape.
 *
 * Why this exists:
 *
 * Before cycle 6b, src/sim/interactive.js owned both the turn loop AND all
 * TTY I/O (console.log, readline, stdout). The terminal surface was the only
 * one that worked, and the engine's behavior was entangled with how the
 * terminal prints things. Adding a second player surface (discord) required
 * a refactor.
 *
 * Cycle 6b extracts the I/O contract into this module. The engine code that
 * drives a turn now calls `surface.print(...)`, `surface.waitWhileLLM(...)`,
 * `surface.readMove()`, etc. The TTY surface (src/sim/interactive.js's
 * createReader + stdout) implements these methods. The discord surface
 * (src/bot/surface.js) implements them against discord.js channel/message.
 *
 * The shape is documented but not enforced — JavaScript doesn't have
 * nominal typing. Callers that pass a partial surface will get runtime
 * errors at the call site of the missing method. For step 2 (cycle 6b),
 * the discord surface is intentionally partial: only `print` and `close`
 * are implemented. The `read*` methods throw "not yet implemented" so
 * it's obvious what's left for steps 3+ to fill in.
 *
 * --------------------------------------------------------------------------
 * Surface adapter contract
 * --------------------------------------------------------------------------
 *
 * Required methods (all surfaces must implement):
 *
 *   surface.isTTY: boolean
 *     True if the surface should use the TTY-style spinner / cursor / readline
 *     plumbing. False for piped / discord / web surfaces. The terminal surface
 *     in pipe mode returns false; the discord surface always returns false.
 *
 *   surface.print(prose): void | Promise<void>
 *     Display a block of prose to the player. In TTY mode, this writes to
 *     stdout. In discord mode, this posts an embed. In web mode, this
 *     appends to the DOM. The prose is already formatted for this surface
 *     (caller decides whether to wrap / escape / split into fields).
 *
 *   surface.waitWhileLLM(message, fn, { atmospherics, corpusQuote }): Promise<T>
 *     Show a "thinking" indicator while fn() resolves. Returns whatever fn
 *     resolves with. The TTY surface animates a pendulum spinner with the
 *     atmospherics + corpus quote layers; the discord surface sends the
 *     typing indicator and waits silently; the web surface shows a CSS
 *     spinner. The atmospherics + corpusQuote args are optional layers
 *     surfaced only on the TTY surface for now (the discord/web surfaces
 *     can add equivalent affordances in later steps).
 *
 *   surface.close(): void
 *     Tear down the surface. For TTY, closes readline. For discord, no-op
 *     (the bot lifecycle is separate). For web, no-op (the DOM owns cleanup).
 *
 * Read methods (only required once the surface handles player input — step 3+):
 *
 *   surface.readMove({ header }): Promise<string>
 *     Read the player's move (multi-line). Returns the trimmed, joined
 *     text. Throws or returns "" on empty input — caller decides.
 *
 *   surface.readChoice({ header, options }): Promise<number>
 *     Show a numbered list of options and read the player's pick.
 *     Returns the 0-indexed choice. The TTY surface uses a single-line
 *     read; the discord surface uses button interactions.
 *
 *   surface.readConfirm({ header, defaultNo = true }): Promise<boolean>
 *     Yes/no prompt. Returns true if the player confirms. defaultNo
 *     controls whether an empty / no-input answer counts as "no".
 *
 * --------------------------------------------------------------------------
 * Formatting helpers
 * --------------------------------------------------------------------------
 *
 * The engine produces a crisis object with `{ title, situation, pressure,
 * decision_point, headlines }`. Different surfaces want different
 * representations of this object. The helpers below are the canonical
 * formatters; callers should NOT format crisis objects inline.
 *
 *   formatCrisisForTTY(crisis, identity) -> string
 *     The terminal-style prose block. Matches the existing renderCrisisProse
 *     output (with wrap at 68 cols, 2-char indent, headlines above situation
 *     when present).
 *
 *   formatCrisisForDiscord(crisis, identity) -> { embed: object }
 *     A discord.js embed payload object (NOT posted — caller posts).
 *     Title is the crisis title; description is a short status line;
 *     fields are situation / pressure / decision point with value strings
 *     truncated to the per-field limit (1024 chars). For turn-1 seed-driven
 *     crises, pressure and decision_point are deferred (the LLM generates
 *     them after the first move), so the embed notes that explicitly.
 */

const { wrap } = require('./cli-format');

// ---------------------------------------------------------------------------
// formatCrisisForTTY — port of the existing renderCrisisProse logic.
// ---------------------------------------------------------------------------

function formatCrisisForTTY(crisis, identity = null) {
  const lines = [];
  lines.push(`  ${crisis.title}`);
  lines.push('');
  // Headlines (committed events) precede Situation. Only show when present
  // (turn 2+; turn 1 with the seed has no headlines yet).
  if (crisis.headlines && crisis.headlines.length > 0) {
    lines.push('  Headlines:');
    for (const h of crisis.headlines) {
      lines.push('    • ' + h);
    }
    lines.push('');
  }
  // Seed-driven crises (turn 1) carry a 5-6 sentence briefing as the
  // situation block. Pressure and decision_point are deferred until the
  // world generator runs after the first move.
  if (crisis.fromSeed) {
    if (identity) {
      lines.push(`  You are ${identity.player}. You govern ${identity.regime}.`);
      lines.push('');
    }
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

// ---------------------------------------------------------------------------
// formatCrisisForDiscord — returns a discord.js embed payload object.
// ---------------------------------------------------------------------------

const DISCORD_FIELD_VALUE_MAX = 1024;
const DISCORD_EMBED_DESCRIPTION_MAX = 4096;

function truncateForDiscord(value, max) {
  if (!value) return '';
  if (value.length <= max) return value;
  return value.slice(0, max - 1).trimEnd() + '…';
}

function formatCrisisForDiscord(crisis, identity = null) {
  const fields = [];
  const descriptionLines = [];

  // Identity one-liner sits above the situation in the description so
  // the player knows whose seat they're in before reading the crisis.
  if (identity && crisis.fromSeed) {
    descriptionLines.push(`*You are ${identity.player}. You govern ${identity.regime}.*`);
    descriptionLines.push('');
  }

  // Headlines (turn 2+ only).
  if (crisis.headlines && crisis.headlines.length > 0) {
    fields.push({
      name: 'Headlines',
      value: truncateForDiscord(
        crisis.headlines.map(h => `• ${h}`).join('\n'),
        DISCORD_FIELD_VALUE_MAX,
      ),
      inline: false,
    });
  }

  // Situation is always present.
  fields.push({
    name: 'Situation',
    value: truncateForDiscord(crisis.situation || '', DISCORD_FIELD_VALUE_MAX),
    inline: false,
  });

  // Pressure + Decision point: only when the crisis has them (turn 2+).
  // For turn 1 (fromSeed), they're deferred until after the player's
  // first move; the embed says so explicitly.
  if (crisis.fromSeed) {
    fields.push({
      name: 'Pressure & Decision point',
      value: '_Pressure and decision point will be generated after your first move._',
      inline: false,
    });
  } else {
    if (crisis.pressure) {
      fields.push({
        name: 'Pressure',
        value: truncateForDiscord(crisis.pressure, DISCORD_FIELD_VALUE_MAX),
        inline: false,
      });
    }
    if (crisis.decision_point) {
      fields.push({
        name: 'Decision point',
        value: truncateForDiscord(crisis.decision_point, DISCORD_FIELD_VALUE_MAX),
        inline: false,
      });
    }
  }

  const embed = {
    title: crisis.title || 'Crisis',
    description: truncateForDiscord(descriptionLines.join('\n'), DISCORD_EMBED_DESCRIPTION_MAX),
    fields,
    color: crisis.fromSeed ? 0x8a7f5c : 0x9a6b3f, // muted archival palette
  };

  return { embed };
}

module.exports = {
  formatCrisisForTTY,
  formatCrisisForDiscord,
  // Constants exposed for surfaces that want to honor the same limits
  DISCORD_FIELD_VALUE_MAX,
  DISCORD_EMBED_DESCRIPTION_MAX,
};