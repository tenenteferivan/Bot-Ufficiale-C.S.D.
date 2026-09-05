import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { getGlobalGuildPartnershipLeaderboard, getGlobalUserPartnershipLeaderboard } from '../utils/partnerships';

export const data = new SlashCommandBuilder()
  .setName('leaderboard-partnership-global')
  .setDescription('Mostra la classifica globale delle partnership.')
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('Tipo di classifica')
      .setRequired(true)
      .addChoices(
        { name: 'Server', value: 'server' },
        { name: 'Utenti', value: 'users' },
      )
  );

function getRankBadge(index: number): string {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `**${index + 1}.**`;
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const type = interaction.options.getString('type', true);

  try {
    const ranks = type === 'server'
      ? await getGlobalGuildPartnershipLeaderboard()
      : await getGlobalUserPartnershipLeaderboard();

    const lines = ranks.length
      ? ranks.map((rank, index) => {
          const target = type === 'server'
            ? `**${rank.name || rank.id}**`
            : `<@${rank.id}>`;
          return `${getRankBadge(index)} ${target} — **${rank.total}** partnership`;
        }).join('\n')
      : 'Non ci sono ancora partnership registrate.';

    const title = type === 'server' ? '🌐 Leaderboard Globale — Server' : '🌐 Leaderboard Globale — Utenti';

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(title)
      .setDescription(lines.slice(0, 4000))
      .setFooter({ text: 'Classifica globale aggiornata in tempo reale' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Errore durante il recupero della leaderboard partnership globale:', error);
    await interaction.reply({
      content: '❌ Si è verificato un errore durante il recupero della classifica globale.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

