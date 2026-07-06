// src/bot/notifications.js
//
// Polycrisis of Authority — discord notification module.
//
// Cycle: 8-deploy-fix-extension — discord run notifications.
//   Posts to a configured channel whenever a run is started or ended.
//   Best-effort: errors are logged but NOT thrown — a missed
//   notification never breaks gameplay.
//
// Optional feature: if DISCORD_NOTIFICATION_CHANNEL_ID is unset,
//   notifyRunStart / notifyRunEnd are silent no-ops. This keeps
//   the deploy optional (similar to the POLYCRISIS_LIVENESS_WEBHOOK
//   pattern in docs/16-deployment.md §6).

const { EmbedBuilder } = require('discord.js');

const NOTIFY_COLOR_START = 0x4f7cac; // muted blue
const NOTIFY_COLOR_END = 0x8a6b6b;   // muted red

/**
 * notifyRunStart: post a run-start notification to the configured
 * channel. Best-effort — errors are caught and logged.
 *
 * @param {Object} opts
 * @param {import('discord.js').Client} opts.client — discord client
 *        (must have channels.cache populated)
 * @param {Object} opts.identity — { player, regime } (or undefined for defaults)
 * @param {string} opts.runId
 * @param {string} [opts.seedId] — seed id, may be undefined
 * @param {string} [opts.model]
 * @param {number} [opts.ts] — start timestamp (Date.now()); defaults to now
 */
async function notifyRunStart({ client, identity, runId, seedId, model, ts }) {
  const channelId = process.env.DISCORD_NOTIFICATION_CHANNEL_ID;
  if (!channelId) return; // notification disabled

  try {
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
      console.warn(`[notify] start: channel ${channelId} not in cache`);
      return;
    }
    const startedAt = ts ? new Date(ts) : new Date();
    const embed = new EmbedBuilder()
      .setTitle('Polycrisis run started')
      .setColor(NOTIFY_COLOR_START)
      .addFields(
        { name: 'Run id', value: '`' + (runId || 'unknown') + '`', inline: true },
        { name: 'Model', value: model || 'unknown', inline: true },
        { name: 'Seed', value: seedId ? '`' + seedId + '`' : '_random_', inline: true },
        {
          name: 'Identity',
          value:
            'player: `' +
            (identity && identity.player ? identity.player : 'default') +
            '`\nregime: `' +
            (identity && identity.regime ? identity.regime : 'default') +
            '`',
          inline: false,
        },
        {
          name: 'Started',
          value: `<t:${Math.floor(startedAt.getTime() / 1000)}:f>`,
          inline: true,
        }
      );
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('[notify] run-start failed (best-effort, ignored):', err);
  }
}

/**
 * notifyRunEnd: post a run-end notification to the configured channel.
 * Best-effort — errors are caught and logged.
 *
 * @param {Object} opts
 * @param {import('discord.js').Client} opts.client
 * @param {Object} opts.identity — { player, regime }
 * @param {string} opts.runId
 * @param {string} opts.outcome — 'collapse' | 'stabilization' | 'no-collapse' |
 *        'player-quit' | 'user-end' | 'error'
 * @param {number} opts.turnCount — turn the run ended on
 * @param {string} [opts.model]
 * @param {number} [opts.ts] — end timestamp (Date.now()); defaults to now
 * @param {string} [opts.endingBy] — alternative source for outcome if
 *        `outcome` not provided (e.g., 'user-end' from /polycrisis end)
 */
async function notifyRunEnd({ client, identity, runId, outcome, turnCount, model, ts, endingBy }) {
  const channelId = process.env.DISCORD_NOTIFICATION_CHANNEL_ID;
  if (!channelId) return;

  // Fall back to endingBy if outcome not provided
  const finalOutcome = outcome || endingBy || 'unknown';

  try {
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
      console.warn(`[notify] end: channel ${channelId} not in cache`);
      return;
    }
    const endedAt = ts ? new Date(ts) : new Date();
    const embed = new EmbedBuilder()
      .setTitle('Polycrisis run ended')
      .setColor(NOTIFY_COLOR_END)
      .addFields(
        { name: 'Run id', value: '`' + (runId || 'unknown') + '`', inline: true },
        { name: 'Outcome', value: '`' + finalOutcome + '`', inline: true },
        { name: 'Turns', value: String(turnCount ?? '?'), inline: true },
        {
          name: 'Identity',
          value:
            'player: `' +
            (identity && identity.player ? identity.player : 'default') +
            '`\nregime: `' +
            (identity && identity.regime ? identity.regime : 'default') +
            '`',
          inline: false,
        },
        {
          name: 'Ended',
          value: `<t:${Math.floor(endedAt.getTime() / 1000)}:f>`,
          inline: true,
        }
      );
    if (model) {
      embed.addFields({ name: 'Model', value: model, inline: true });
    }
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('[notify] run-end failed (best-effort, ignored):', err);
  }
}

module.exports = { notifyRunStart, notifyRunEnd };
