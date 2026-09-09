import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import { parseDuration } from '../../utils/timeParser';
import { requireGuildPermission } from '../../utils/permissions';
import { sendModNotification } from '../../utils/modLogger';

export const data = new SlashCommandBuilder()
  .setName('timeout')
  .setDescription('Mette un utente in isolamento temporaneo.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption((opt) => opt.setName('utente').setDescription('L\'utente da isolare').setRequired(true))
  .addStringOption((opt) => opt.setName('motivo').setDescription('Il motivo dell\'isolamento').setRequired(true))
  .addStringOption((opt) => opt.setName('durata').setDescription('Durata (es. 10m, 1h, 1d)').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!await requireGuildPermission(interaction, PermissionFlagsBits.ModerateMembers)) return;
  const targetUser = interaction.options.getUser('utente', true);
  const reason = interaction.options.getString('motivo', true);
  const durationStr = interaction.options.getString('durata', true);

  if (!interaction.guild) return;

  const durationMs = parseDuration(durationStr);
  if (!durationMs) {
    await interaction.reply({ content: '⚠️ **Formato durata non valido!** Usa sintassi come: `10m`, `1h`, `1d`.', flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    const member = await interaction.guild.members.fetch(targetUser.id);
    await member.timeout(durationMs, reason);

    const embed = new EmbedBuilder()
      .setColor(0xE91E63)
      .setTitle('🔇 • SANZIONE APPLICATA: TIMEOUT')
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: '👤 Utente Isolato', value: `<@${targetUser.id}>\n\`ID: ${targetUser.id}\``, inline: true },
        { name: '🛡️ Moderatore', value: `<@${interaction.user.id}>`, inline: true },
        { name: '⏱️ Durata Isolamento', value: `\`${durationStr}\``, inline: true },
        { name: '📋 Motivo', value: `>>> ${reason}` }
      )
      .setFooter({ text: `Eseguito da ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await sendModNotification(interaction);
  } catch (error) {
    await interaction.reply({ content: '❌ **Impossibile applicare il timeout all\'utente.**', flags: MessageFlags.Ephemeral });
  }
}
