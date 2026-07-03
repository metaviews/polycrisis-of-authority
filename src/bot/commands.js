// src/bot/commands.js
//
// Polycrisis discord command handlers + state.
//
// The bot entrypoint (src/bot/bot.js) wires slash commands to these
// handlers. This module owns:
//   - the slash command definitions (PING, POLYCRISIS_START, future ones)
//   - the in-memory run state (Map<runKey, runState>)
//   - the per-command handler functions
//
// Why factored out: verification scripts (cycle 6b's hermes-verify-6b-*.sh)
// need to test handler logic without starting the bot. They require this
// module, call the exported handlers with mock interactions, and assert on
// the returned / side-effected values.
//
// Step 2 (cycle 6b) ships the /polycrisis start handler. Future steps
// (6c+) add /polycrisis move, advisor, status, end, artifact.

const { selectSeed, SEED_VARIANTS } = require('../../scripts/seed-variants');
const { formatCrisisForDiscord } = require('../sim/surface');

// ---------------------------------------------------------------------------
// command definitions
// ---------------------------------------------------------------------------

const PING_COMMAND = {
  name: 'ping',
  description: 'Polycrisis bot health check. Replies with pong and gateway latency.',
};

const POLYCRISIS_COMMAND = {
  name: 'polycrisis',
  description: 'Polycrisis of Authority — the AI policy simulation game.',
  options: [
    {
      name: 'start',
      description: 'Start a new run in this channel/DM. Posts the seed/turn-1 crisis as an embed.',
      type: 1, // SUB_COMMAND
      options: [
        {
          name: 'seed_id',
          description: '(Optional) seed id from the curated seed set. If omitted, a seed is chosen at random.',
          type: 3, // STRING
          required: false,
        },
      ],
    },
    {
      name: 'advisor',
      description: 'Consult an advisor during an active run. Posts 5 buttons; click one to see the advisor\'s view.',
      type: 1, // SUB_COMMAND
      // No options — the choice is made via buttons, not slash options.
    },
    // Future subcommands (cycle 6c+): move, status, end, artifact.
  ],
};

const ALL_COMMANDS = [PING_COMMAND, POLYCRISIS_COMMAND];

// ---------------------------------------------------------------------------
// in-memory run state
// ---------------------------------------------------------------------------

// Per-user-per-channel-or-DM run state. Spec: "one run per channel-or-DM
// per user." Key shape: `${channelOrDmId}:${userId}`. For v1 this is
// in-memory only — if the bot restarts mid-run, the run is lost (acceptable
// for v1; sqlite persistence is a v2 feature).
//
// Each entry: { runId, userId, channelId, seed, crisis, startedAt }
const activeRuns = new Map();

function runKey(interaction) {
  return `${interaction.channelId}:${interaction.user.id}`;
}

// ---------------------------------------------------------------------------
// /ping handler
// ---------------------------------------------------------------------------

// Returns { content: string } — the message to send back. The bot wraps
// this in a discord.js roundtrip latency measurement. Tests mock the
// interaction and assert on the returned content.
function buildPingReply(interaction, { roundtripMs = 0, wsLatencyMs = 0 } = {}) {
  return {
    content:
      `pong — roundtrip ${roundtripMs}ms, websocket ${wsLatencyMs}ms, ` +
      `user ${interaction.user.tag}, channel ${interaction.channelId}`,
  };
}

// ---------------------------------------------------------------------------
// /polycrisis start handler
// ---------------------------------------------------------------------------

// Returns { kind: 'started', seed, crisis, embed, key, runId, warning? }
//   or { kind: 'already_active', key }
// Tests mock the interaction and assert on the returned shape.
//
// The bot translates this into the appropriate discord.js calls
// (interaction.editReply / interaction.followUp).
function buildPolycrisisStartReply(interaction, { seedVariants = SEED_VARIANTS } = {}) {
  const seedIdArg = interaction.options.getString('seed_id');
  const key = runKey(interaction);

  if (activeRuns.has(key)) {
    return { kind: 'already_active', key };
  }

  const usedSeedIds = [];
  const usedActors = [];

  let seed;
  let seedWarning = null;

  if (seedIdArg) {
    const matched = seedVariants.find((s) => s.id === seedIdArg);
    if (matched) {
      const availableActors = matched.actors.filter((a) => !usedActors.includes(a));
      const actorPool = availableActors.length > 0 ? availableActors : matched.actors;
      const actor = actorPool[Math.floor(Math.random() * actorPool.length)];
      seed = {
        id: matched.id,
        fragment: matched.fragment,
        failurePattern: matched.failurePattern,
        focalAxes: matched.focalAxes,
        actor,
        allActors: matched.actors,
      };
    } else {
      seedWarning = `Unknown seed id "${seedIdArg}". Falling back to a random seed.`;
      seed = selectSeed({ usedIds: usedSeedIds, usedActors });
    }
  } else {
    seed = selectSeed({ usedIds: usedSeedIds, usedActors });
  }

  // Build the turn-1 crisis object (matches the shape produced by
  // runLoop's turn-1 path in src/sim/run-loop.js).
  const crisis = {
    id: seed.id,
    title: `${seed.actor} seed`,
    trigger: seed.fragment,
    headlines: [],
    situation: seed.fragment,
    pressure: '(LLM-generated)',
    decision_point: '(LLM-generated)',
    failure_pattern: seed.failurePattern,
    focal_axes: seed.focalAxes,
    trigger_kind: 'seed-parameterized',
    fromSeed: true,
    seedFragment: seed.fragment,
    actor: seed.actor,
  };

  const { embed } = formatCrisisForDiscord(crisis, null);

  const runId = `discord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const runState = {
    runId,
    userId: interaction.user.id,
    channelId: interaction.channelId,
    seed,
    crisis,
    startedAt: new Date().toISOString(),
  };
  activeRuns.set(key, runState);

  return { kind: 'started', seed, crisis, embed, key, runId, warning: seedWarning };
}

// ---------------------------------------------------------------------------
// /polycrisis advisor handler (cycle 6d)
// ---------------------------------------------------------------------------

// The 5 advisor voice identifiers from src/sim/advisors.js. We hard-code them
// here (rather than importing) to keep the pure command builder decoupled
// from the engine — the engine can be touched without forcing this file
// to change. The bot's button handler imports the engine directly when it
// actually calls consult().
const ADVISOR_VOICES_FOR_BUTTONS = [
  'frontier-lab',
  'civil-society',
  'state-security',
  'open-source',
  'international-ally',
];

// Human-readable button labels. Short — discord button labels max at 80 chars
// but we keep these brief so they read at a glance in a row of 5.
const ADVISOR_BUTTON_LABELS = {
  'frontier-lab': 'Frontier Lab',
  'civil-society': 'Civil Society',
  'state-security': 'State Security',
  'open-source': 'Open Source',
  'international-ally': 'International Ally',
};

const ADVISOR_BUTTON_PREFIX = 'advisor:';

/**
 * Pure builder for the advisor button row data. Returns a plain object array
 * (one per voice). The bot's discord-aware wrapper translates this into
 * discord.js ButtonBuilder instances.
 *
 * Each entry: { customId, label, voice }
 */
function buildAdvisorButtons() {
  return ADVISOR_VOICES_FOR_BUTTONS.map((voice) => ({
    customId: ADVISOR_BUTTON_PREFIX + voice,
    label: ADVISOR_BUTTON_LABELS[voice] || voice,
    voice,
  }));
}

/**
 * /polycrisis advisor slash command — pure builder.
 *
 * Returns:
 *   { kind: 'no_active_run', key }            — no run for this user/channel
 *   { kind: 'post_buttons', runState, buttons, headerText } — ready to post
 *
 * The bot wraps the post_buttons branch in a channel.send + ActionRowBuilder,
 * and rejects the no_active_run branch with an ephemeral reply.
 */
function buildPolycrisisAdvisorReply(interaction) {
  const key = runKey(interaction);
  const runState = activeRuns.get(key);
  if (!runState) {
    return { kind: 'no_active_run', key };
  }
  return {
    kind: 'post_buttons',
    runState,
    buttons: buildAdvisorButtons(),
    headerText: ADVISOR_HEADER_TEXT,
  };
}

/**
 * Button click handler — pure builder.
 *
 * Returns:
 *   { kind: 'not_active_user', runState }   — clicked by a non-active user (silent ignore)
 *   { kind: 'unknown_button', runState }    — customId doesn't match advisor prefix
 *   { kind: 'consult', voice, runState }    — ready to call consult() with this voice
 *
 * The bot wraps the consult branch in a deferReply + consult() + editReply flow.
 */
function buildAdvisorButtonClickReply(interaction) {
  // Find the active run for this channel. The channel may have multiple
  // runs (one per user), but the spec says "one run per channel-or-DM per
  // user" — so there can be at most one run per (channel, user) pair.
  // For the button click, we look up the run that THIS interaction's user
  // owns; if there's no run for this user, the click doesn't apply to them.
  const key = runKey(interaction);
  const runState = activeRuns.get(key);
  if (!runState) {
    // No run for this user. This can mean either:
    //   (a) no run is active in this channel at all, OR
    //   (b) a run IS active but it belongs to a different user in the same channel.
    // Both cases are "not your button" from this clicker's perspective — we
    // surface as not_active_user so the clicker doesn't see a confusing
    // ephemeral about "no active run" when actually someone else is playing.
    // (Strictly: if the channel is a DM there's only ever one user, so
    // case (b) is impossible — but the unified return is fine.)
    return { kind: 'not_active_user', key };
  }

  // From here on, there IS an active run for this user.

  // Defensive: filter the click to confirm the customId prefix matches.
  // (The bot's interactionCreate handler should already dispatch only
  // advisor:* clicks to this builder, but defense in depth is cheap.)
  const customId = interaction.customId || '';
  if (!customId.startsWith(ADVISOR_BUTTON_PREFIX)) {
    return { kind: 'unknown_button', runState };
  }

  const voice = customId.slice(ADVISOR_BUTTON_PREFIX.length);
  if (!ADVISOR_VOICES_FOR_BUTTONS.includes(voice)) {
    return { kind: 'unknown_button', runState };
  }

  return { kind: 'consult', voice, runState };
}

const ADVISOR_HEADER_TEXT = 'Which advisor would you like to consult? Their view is corpus-grounded and describes how that position sees the current crisis — it does not recommend an action.';

const ADVISOR_NOT_ACTIVE_RUN_TEXT =
  'No active run in this channel. Start one with `/polycrisis start` first, ' +
  'then `/polycrisis advisor` will post the button row.';

const ADVISOR_IGNORED_CLICK_TEXT =
  '_Only the user with the active run can click advisor buttons._';

// Step-2 followup hint for the bot to send after the embed (deprecated in 6c;
// STEP3_HINT_TEXT replaces it once free-text moves work).
const STEP2_FOLLOWUP_TEXT =
  '_Step 2 ships the crisis display only. Free-text move handling ' +
  'arrives in step 3 (cycle 6c) — for now, type `/ping` or `/polycrisis start` again._';

// Step-3 hint: tells the player to type their policy as a message in the channel.
// The bot's MessageCollector (inside surface.readMove) is waiting for the next
// message from this user. The "this is a move" framing is important — players
// might otherwise expect menu-style interaction.
const STEP3_HINT_TEXT =
  '_Type your policy as a message in this channel. The simulation will interpret your words and ' +
  'post the next crisis. Send `::resign` to end the run (no confirmation required). ' +
  'The run ends after a collapse or ~10 minutes of inactivity._';

// Already-active message text (sent as ephemeral reply).
const ALREADY_ACTIVE_TEXT =
  'You already have an active run in this channel. ' +
  'Type your next move as a message to continue, or send `::resign` to end the run. ' +
  'For now, the run state is in-memory and resets on bot restart.';

module.exports = {
  // Command definitions
  PING_COMMAND,
  POLYCRISIS_COMMAND,
  ALL_COMMANDS,
  // State
  activeRuns,
  runKey,
  // Handler builders (pure functions returning discord-shaped payloads)
  buildPingReply,
  buildPolycrisisStartReply,
  buildPolycrisisAdvisorReply,
  buildAdvisorButtonClickReply,
  buildAdvisorButtons,
  // Display text
  STEP2_FOLLOWUP_TEXT,
  STEP3_HINT_TEXT,
  ALREADY_ACTIVE_TEXT,
  ADVISOR_HEADER_TEXT,
  ADVISOR_NOT_ACTIVE_RUN_TEXT,
  ADVISOR_IGNORED_CLICK_TEXT,
  ADVISOR_BUTTON_PREFIX,
};