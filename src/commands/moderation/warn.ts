import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { requireGuildPermission } from '../../utils/permissions';
import { sendModNotification } from '../../utils/modLogger';

export const data = new SlashCommandBuilder()
  .setName('warn')
  .setDescription('Invia un avvertimento a un utente.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption((option) => option.setName('utente').setDescription('Utente da avvertire').setRequired(true))
  .addStringOption((option) => option.setName('motivo').setDescription('Motivo dell avvertimento').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!await requireGuildPermission(interaction, PermissionFlagsBits.ModerateMembers)) return;
  const targetUser = interaction.options.getUser('utente', true);
  await interaction.reply({ content: `Avvertimento inviato a ${targetUser}.`, ephemeral: true });
  await sendModNotification(interaction);
}
