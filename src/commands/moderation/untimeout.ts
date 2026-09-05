import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import { requireGuildPermission } from '../../utils/permissions';

export const data = new SlashCommandBuilder()
  .setName('untimeout')
  .setDescription('Rimuove l\'isolamento da un utente.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption((opt) => opt.setName('utente').setDescription('L\'utente da riabilitare').setRequired(true))
  .addStringOption((opt) => opt.setName('motivo').setDescription('Motivo della revoca').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!await requireGuildPermission(interaction, PermissionFlagsBits.ModerateMembers)) return;
  const targetUser = interaction.options.getUser('utente', true);
  const reason = interaction.options.getString('motivo', true);

  if (!interaction.guild) return;

  try {
    const member = await interaction.guild.members.fetch(targetUser.id);
    await member.timeout(null, reason);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🔊 • REVOCA SANZIONE: UNTIMEOUT')
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: '👤 Utente Riabilitato', value: `<@${targetUser.id}>\n\`ID: ${targetUser.id}\``, inline: true },
        { name: '🛡️ Moderatore', value: `<@${interaction.user.id}>`, inline: true },
        { name: '📋 Motivo della Revoca', value: `>>> ${reason}` }
      )
      .setFooter({ text: `Eseguito da ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ content: '❌ **Impossibile rimuovere il timeout.**', flags: MessageFlags.Ephemeral });
  }
}
