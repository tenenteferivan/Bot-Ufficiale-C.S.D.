import { Client, EmbedBuilder } from 'discord.js';
import { getLogConfigs } from '../handlers/databasehandler';

const ANNOUNCEMENT_INTERVAL_MS = 350;

export interface AnnouncementResult {
  sent: number;
  failed: number;
}

export async function sendWithRateLimitRetry(
  channel: { send: (payload: any) => Promise<unknown> },
  payload: any,
  maxRetries = 3,
): Promise<void> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await channel.send(payload);
      return;
    } catch (error: any) {
      const retryAfter = error?.rawError?.retry_after ?? error?.data?.retry_after ?? error?.retryAfter;
      if (error?.status !== 429 && error?.code !== 429 && retryAfter === undefined) throw error;
      if (attempt === maxRetries) throw error;
      const delay = Math.max(100, Number(retryAfter ?? 1) * 1000);
      console.warn(`Rate limit Discord rilevato: nuovo tentativo tra ${delay} ms.`);
      await wait(delay);
    }
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function distributeAnnouncement(
  client: Client,
  embed: EmbedBuilder,
  mention: '@here' | '@everyone',
): Promise<AnnouncementResult> {
  const configs = await getLogConfigs();
  let sent = 0;
  let failed = 0;

  for (const config of configs) {
    try {
      const guild = await client.guilds.fetch(config.guildId).catch(() => null);
      if (!guild) {
        console.warn(`Server ${config.guildId} non disponibile: annuncio saltato.`);
        failed++;
        continue;
      }

      const channel = await guild.channels.fetch(config.channelId).catch(() => null);
      if (!channel || !channel.isTextBased() || !('send' in channel)) {
        console.warn(`Canale log ${config.channelId} non valido nel server ${config.guildId}: annuncio saltato.`);
        failed++;
        continue;
      }

      await sendWithRateLimitRetry(channel, {
        content: mention,
        embeds: [embed],
        allowedMentions: { parse: ['everyone'] },
      });
      sent++;
      await wait(ANNOUNCEMENT_INTERVAL_MS);
    } catch (error) {
      failed++;
      console.error(`Errore durante l'invio dell'annuncio al server ${config.guildId}:`, error);
    }
  }

  return { sent, failed };
}

export function buildAnnouncementEmbed(
  title: string,
  message: string,
  color: number,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(message.slice(0, 4096))
    .setFooter({ text: 'Comunicazione ufficiale C.S.D.' })
    .setTimestamp();
}
