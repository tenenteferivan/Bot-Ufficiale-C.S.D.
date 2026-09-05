import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import { requireGuildPermission } from '../../utils/permissions';

export const data = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Espelle un utente dal server.')
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
  .addUserOption((opt) => opt.setName('utente').setDescription('L\'utente da espellere').setRequired(true))
  .addStringOption((opt) => opt.setName('motivo').setDescription('Il motivo dell\'espulsione').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!await requireGuildPermission(interaction, PermissionFlagsBits.KickMembers)) return;
  const targetUser = interaction.options.getUser('utente', true);
  const reason = interaction.options.getString('motivo', true);

  if (!interaction.guild) return;

  try {
    const member = await interaction.guild.members.fetch(targetUser.id);
    await member.kick(reason);

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle('🚪 • SANZIONE APPLICATA: KICK')
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: '👤 Utente Espulso', value: `<@${targetUser.id}>\n\`ID: ${targetUser.id}\``, inline: true },
        { name: '🛡️ Moderatore', value: `<@${interaction.user.id}>`, inline: true },
        { name: '📋 Motivo dell\'Espulsione', value: `>>> ${reason}` }
      )
      .setFooter({ text: `Eseguito da ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ content: '❌ **Impossibile espellere l\'utente.** Controlla la gerarchia dei ruoli.', flags: MessageFlags.Ephemeral });
  }
}
