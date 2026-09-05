import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { getGuildPartnershipLeaderboard } from '../utils/partnerships';

export const data = new SlashCommandBuilder()
  .setName('leaderboard-partnership')
  .setDescription('Mostra i primi 30 utenti del server per partnership pubblicate.');

function getRankBadge(index: number): string {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `**${index + 1}.**`;
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ Questo comando è disponibile solo nei server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const ranks = await getGuildPartnershipLeaderboard(interaction.guild.id);
    const lines = ranks.length
      ? ranks.map((rank, index) => `${getRankBadge(index)} <@${rank.id}> — **${rank.total}** partnership`).join('\n')
      : 'Nessuna partnership pubblicata in questo server.';

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🏆 Leaderboard Partnership — ${interaction.guild.name}`)
      .setDescription(lines.slice(0, 4000))
      .setFooter({ text: 'Classifica aggiornata in tempo reale' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Errore durante il recupero della leaderboard partnership:', error);
    await interaction.reply({
      content: '❌ Si è verificato un errore durante il recupero della classifica.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

