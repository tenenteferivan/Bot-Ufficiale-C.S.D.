import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import { saveSanction } from '../../handlers/databasehandler';

export const data = new SlashCommandBuilder()
  .setName('unban')
  .setDescription('Rimuove il ban di un utente tramite il suo ID.')
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .addStringOption((opt) => opt.setName('utente').setDescription('ID dell\'utente da sbannare').setRequired(true))
  .addStringOption((opt) => opt.setName('motivo').setDescription('Motivo della revoca del ban').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const userId = interaction.options.getString('utente', true);
  const reason = interaction.options.getString('motivo', true);

  if (!interaction.guild) return;

  try {
    await interaction.guild.members.unban(userId, reason);

    await saveSanction({
      userId,
      moderatorId: interaction.user.id,
      guildId: interaction.guild.id,
      type: 'UNBAN',
      reason,
    });

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🔓 • REVOCA SANZIONE: UNBAN')
      .addFields(
        { name: '👤 ID Utente Sbannato', value: `\`${userId}\``, inline: true },
        { name: '🛡️ Moderatore', value: `<@${interaction.user.id}>`, inline: true },
        { name: '📋 Motivo Revoca', value: `>>> ${reason}` }
      )
      .setFooter({ text: `Eseguito da ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({
      content: '❌ **Impossibile sbannare l\'utente.** Verificare che l\'ID fornito sia corretto e che l\'utente sia effettivamente bandito.',
      flags: MessageFlags.Ephemeral,
    });
  }
}