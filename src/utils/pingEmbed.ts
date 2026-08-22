import { EmbedBuilder } from 'discord.js';

function getStatusIndicator(ms: number): string {
  if (ms < 150) {
    return '🟢'; // Latenza bassa (Ottima)
  } else if (ms < 300) {
    return '🟠'; // Latenza media (Accettabile)
  } else {
    return '🔴'; // Latenza elevata (Critica)
  }
}

function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor((uptimeMs / 1000) % 60);
  const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
  const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
}

export function createPingEmbed(botPing: number, apiPing: number, uptimeMs: number): EmbedBuilder {
  const botIndicator = getStatusIndicator(botPing);
  const apiIndicator = getStatusIndicator(apiPing);
  const formattedUptime = formatUptime(uptimeMs);

  return new EmbedBuilder()
    .setColor(0x0a192f) // Blu scuro elegante (Dark Navy)
    .setTitle('📊 Stato della Connessione e Prestazioni')
    .setDescription('Di seguito sono riportati i dati dettagliati relativi alla latenza e al tempo di attività del servizio.')
    .addFields(
      {
        name: '📡 Latenza Bot',
        value: `${botIndicator} **${botPing} ms**`,
        inline: true,
      },
      {
        name: '🌐 Latenza API Discord',
        value: `${apiIndicator} **${apiPing} ms**`,
        inline: true,
      },
      {
        name: '⏱️ Tempo di Attività (Uptime)',
        value: `⌛ **${formattedUptime}**`,
        inline: false,
      }
    )
    .setFooter({ text: 'Sistema di Monitoraggio delle Prestazioni' })
    .setTimestamp();
}