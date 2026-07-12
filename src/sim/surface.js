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
 *   surface.singleMessage: boolean
 *     True if the surface treats one user input unit as a complete move (no
 *     multi-line continuation). The discord surface returns true; the TTY
 *     surface returns false (or omits the flag, treated as false).
 *
 *   surface.endOfRunMode: 'banner-and-files' | 'embed-and-files' | undefined
 *     Controls how the runLoop's end-of-run block presents the report +
 *     artifact. Defaults to undefined (treated as 'banner-and-files').
 *     - 'banner-and-files' (TTY default): verbose plain-text banner with
 *       filesystem paths + narrate-run-end output printed via surface.print.
 *     - 'embed-and-files' (discord): the loop posts a polished discord embed
 *       (built via formatEndOfRunEmbed) + 2 file attachments (markdown +
 *       html artifacts). The verbose plain-text lines are suppressed.
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
 *   surface.postEndOfRun({ result, embed, files, paths }): Promise<void>
 *     Called by the loop once at run end, after artifact files are written
 *     to disk. The TTY surface no-ops (the verbose banner is handled
 *     separately via surface.print inside the loop, gated on
 *     endOfRunMode). The discord surface posts the embed + file attachments
 *     + a "play again" followup hint. The default (no flag) is treated as
 *     'banner-and-files', which means the discord surface should set
 *     endOfRunMode explicitly.
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
 *
 *   formatEndOfRunEmbed({ result, report, bands, paths }) -> { embed: object }
 *     A discord.js embed payload for the end-of-run summary. Built from
 *     the narrate-run-end report (outcome_line, narrative, key_moment,
 *     invitation). Title includes runId; description is the narrative
 *     (truncated to 4096 chars); fields include outcome, turns completed,
 *     player / regime, key moment, invitation. Color varies by outcome
 *     (collapse = warm red, stabilized = muted green, no-collapse =
 *     neutral, player-quit = muted gray).
 *
 *   formatAdvisorResponseEmbed({ voice, response }) -> { embed: object }
 *     A discord.js embed payload for an advisor consultation response.
 *     Title is "Advisor: <voice>"; description is the response text
 *     (truncated to 4096 chars). Used by the discord bot's advisor button
 *     click handler.
 */

const { wrap } = require('./cli-format');
const { withBands } = require('./state');

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
    // Cycle 11: footer hints the player about help commands. The footer
    // reads on every crisis embed, so the affordance is discoverable
    // without a separate announcement. (Help itself works via the message
    // body — type `?` to re-read context, `?? <question>` to ask.)
    footer: {
      text: 'Type your move to continue. `?` for context, `?? <question>` for Q&A (env-gated), `/end` to stop.',
    },
  };

  return { embed };
}

// ---------------------------------------------------------------------------
// formatEndOfRunEmbed — end-of-run summary embed payload.
// ---------------------------------------------------------------------------

// Outcome → embed color. Discord colors are 24-bit integers.
const END_OF_RUN_COLORS = {
  collapse: 0xb5563a,        // warm red — collapse is failure
  stabilized: 0x6b8a7a,      // muted green — held the posture
  'no-collapse': 0x8a7f5c,   // muted archival neutral
  'player-quit': 0x9a9a9a,   // muted gray — the player walked away
};

const END_OF_RUN_TITLES = {
  collapse: 'The regime fell',
  stabilized: 'The regime held',
  'no-collapse': 'The run ended',
  'player-quit': 'You resigned',
};

/**
 * formatEndOfRunEmbed({ result, report, bands }) -> { embed }
 *
 * Builds a discord.js embed for the end-of-run summary. Pure function —
 * does not post or otherwise interact with discord.
 *
 * @param {object} options
 * @param {object} options.result - the runLoop result object (runId,
 *   outcome, turnsCompleted, player, regime, model, etc.)
 * @param {object} options.report - the narrateRunEnd report
 *   (outcome_line, narrative, key_moment, invitation).
 * @param {object} [options.bands] - optional state-with-bands for the
 *   "final state" field.
 * @returns {{ embed: object }} - the embed payload. Caller posts it.
 */
function formatEndOfRunEmbed({ result, report, bands = null }) {
  if (!result) throw new Error('formatEndOfRunEmbed: result is required');
  if (!report) throw new Error('formatEndOfRunEmbed: report is required');

  const outcome = result.outcome || 'no-collapse';
  const color = END_OF_RUN_COLORS[outcome] || END_OF_RUN_COLORS['no-collapse'];
  const titlePrefix = END_OF_RUN_TITLES[outcome] || END_OF_RUN_TITLES['no-collapse'];

  // Description = the narrative (the curated story of the run). Capped at
  // discord's 4096-char embed description limit.
  const description = truncateForDiscord(
    report.narrative || report.outcome_line || '(no narrative)',
    DISCORD_EMBED_DESCRIPTION_MAX,
  );

  // Fields: outcome line, turns completed, player/regime, key moment, invitation.
  const fields = [];

  fields.push({
    name: 'Outcome',
    value: truncateForDiscord(report.outcome_line || outcome, DISCORD_FIELD_VALUE_MAX),
    inline: false,
  });

  fields.push({
    name: 'Turns completed',
    value: String(result.turnsCompleted ?? '?'),
    inline: true,
  });

  fields.push({
    name: 'Player / Regime',
    value: truncateForDiscord(
      `${result.player || 'the player'} / ${result.regime || 'the regime'}`,
      DISCORD_FIELD_VALUE_MAX,
    ),
    inline: true,
  });

  if (report.key_moment) {
    fields.push({
      name: 'Key moment',
      value: truncateForDiscord(report.key_moment, DISCORD_FIELD_VALUE_MAX),
      inline: false,
    });
  }

  if (report.invitation) {
    fields.push({
      name: 'Invitation',
      value: truncateForDiscord(report.invitation, DISCORD_FIELD_VALUE_MAX),
      inline: false,
    });
  }

  // Final state bands: short summary of the 6 axes at run end. Helps the
  // reader see what was lost / held at a glance.
  if (bands && typeof bands === 'object') {
    const stateLines = Object.entries(bands).map(
      ([axis, info]) => `• ${axis}: ${info.value} (${info.band})`,
    );
    if (stateLines.length > 0) {
      fields.push({
        name: 'Final state',
        value: truncateForDiscord(stateLines.join('\n'), DISCORD_FIELD_VALUE_MAX),
        inline: false,
      });
    }
  }

  // Fallback note when the narrator used the hand-built summary.
  if (report.fallback) {
    fields.push({
      name: 'Note',
      value: '_Narrator unavailable; using the mechanical summary._',
      inline: false,
    });
  }

  return {
    embed: {
      title: `${titlePrefix} — run ${result.runId}`,
      description,
      fields,
      color,
      footer: result.model ? { text: `Model: ${result.model}` } : undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// formatStatusEmbed — mid-run status snapshot embed payload.
// ---------------------------------------------------------------------------

// Status colors are band-driven, not outcome-driven (status is mid-run).
// The state.js band system has 4 bands: 'holding', 'strained', 'eroded',
// 'collapsed' (from highest to lowest value). We map:
// - all axes in 'holding' band → muted green (regime looks stable)
// - any axis in 'collapsed' band → warm red (regime is at risk)
// - otherwise → muted archival neutral
const STATUS_COLORS = {
  stable: 0x6b8a7a,    // all holding
  critical: 0xb5563a,  // any collapsed
  neutral: 0x8a7f5c,   // mixed
};

const VALID_AXES = ['legitimacy', 'fiscal_slack', 'elite_alignment', 'ecological_debt', 'narrative_coherence', 'capability_frontier'];

// Order of the 'Axes' field — must match VALID_AXES so the embed reads top-down.
const AXIS_ORDER = VALID_AXES;

/**
 * Compute the embed color based on the current state bands.
 * Pure function: takes a bands object (from withBands(state)) and returns
 * one of the STATUS_COLORS hex values.
 */
function pickStatusColor(bands) {
  if (!bands || typeof bands !== 'object') {
    return STATUS_COLORS.neutral;
  }
  let anyCollapsed = false;
  let allHolding = true;
  for (const axis of VALID_AXES) {
    const info = bands[axis];
    if (!info) continue;
    if (info.band === 'collapsed') {
      anyCollapsed = true;
    }
    if (info.band !== 'holding') {
      allHolding = false;
    }
  }
  if (anyCollapsed) return STATUS_COLORS.critical;
  if (allHolding) return STATUS_COLORS.stable;
  return STATUS_COLORS.neutral;
}

/**
 * formatStatusEmbed({ runState }) -> { embed }
 *
 * Builds a discord.js embed for the mid-run status snapshot. Pure function —
 * does not post or otherwise interact with discord.
 *
 * @param {object} options
 * @param {object} options.runState - the run state with:
 *   - currentTurn (number, 0 if not yet started)
 *   - currentState (state vector with 6 axes)
 *   - currentCrisis (crisis object — title + situation, used for the embed title)
 *   - runId, player, regime, model (from the original run state)
 *   - bands (optional — computed from currentState if not provided)
 * @returns {{ embed: object }}
 */
function formatStatusEmbed({ runState }) {
  if (!runState) {
    throw new Error('formatStatusEmbed: runState is required');
  }

  const turn = runState.currentTurn ?? 0;
  const crisis = runState.currentCrisis;
  const bands = runState.bands || (runState.currentState ? computeBands(runState.currentState) : null);

  const color = pickStatusColor(bands);

  // Title: "Status — Turn N — <crisis title>" or "Status — Turn N" if no crisis yet.
  let titleSuffix = '';
  if (crisis && crisis.title) {
    titleSuffix = ` — ${truncateForDiscord(crisis.title, 200)}`;
  }
  const title = `Status — Turn ${turn}${titleSuffix}`;

  // Axes field: multi-line `legitimacy: 45 (strained) / fiscal_slack: 60 (holding) / ...`
  const axesLines = bands
    ? AXIS_ORDER.map((axis) => {
        const info = bands[axis];
        if (!info) return `• ${axis}: ?`;
        return `• ${axis}: ${info.value} (${info.band})`;
      })
    : AXIS_ORDER.map((axis) => `• ${axis}: ?`);
  const axesField = {
    name: 'Axes',
    value: truncateForDiscord(axesLines.join('\n'), DISCORD_FIELD_VALUE_MAX),
    inline: false,
  };

  // Build fields array.
  const fields = [axesField];

  fields.push({
    name: 'Turn',
    value: String(turn),
    inline: true,
  });

  fields.push({
    name: 'Player / Regime',
    value: truncateForDiscord(
      `${runState.player || 'the player'} / ${runState.regime || 'the regime'}`,
      DISCORD_FIELD_VALUE_MAX,
    ),
    inline: true,
  });

  if (runState.model) {
    fields.push({
      name: 'Model',
      value: runState.model,
      inline: true,
    });
  }

  // Brief situation snippet from the current crisis (helps the player
  // recall what they're deciding on after scrolling away).
  if (crisis && crisis.situation) {
    fields.push({
      name: 'Current situation',
      value: truncateForDiscord(crisis.situation, DISCORD_FIELD_VALUE_MAX),
      inline: false,
    });
  }

  return {
    embed: {
      title,
      color,
      fields,
      footer: runState.runId ? { text: `Run ${runState.runId}` } : undefined,
    },
  };
}

// Helper: compute bands for a state vector. Used by formatStatusEmbed when
// the caller didn't pre-compute bands. withBands is imported at the top of
// this file (state.js is pure — no circular import risk).
function computeBands(state) {
  return withBands(state);
}

// ---------------------------------------------------------------------------
// formatAdvisorResponseEmbed — advisor consultation response embed.
// ---------------------------------------------------------------------------

/**
 * formatAdvisorResponseEmbed({ voice, response }) -> { embed }
 *
 * Builds a discord.js embed for an advisor's consultation response. Used
 * by the discord bot's advisor button click handler.
 *
 * @param {object} options
 * @param {string} options.voice - the advisor voice identifier
 *   (e.g. "frontier-lab").
 * @param {string} options.response - the advisor's text response.
 * @returns {{ embed: object }}
 */
function formatAdvisorResponseEmbed({ voice, response }) {
  if (!voice) throw new Error('formatAdvisorResponseEmbed: voice is required');
  if (response == null) throw new Error('formatAdvisorResponseEmbed: response is required');

  return {
    embed: {
      title: `Advisor: ${voice}`,
      description: truncateForDiscord(response, DISCORD_EMBED_DESCRIPTION_MAX),
      color: 0x6b8a7a, // muted archival green — same as the surface.readMove in 6d
    },
  };
}

module.exports = {
  formatCrisisForTTY,
  formatCrisisForDiscord,
  formatEndOfRunEmbed,
  formatAdvisorResponseEmbed,
  formatStatusEmbed,
  pickStatusColor,
  // Constants exposed for surfaces that want to honor the same limits
  DISCORD_FIELD_VALUE_MAX,
  DISCORD_EMBED_DESCRIPTION_MAX,
  END_OF_RUN_COLORS,
  END_OF_RUN_TITLES,
  STATUS_COLORS,
  VALID_AXES,
};