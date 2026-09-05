import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { canPublishPartnership, getPartnershipConfig } from '../utils/partnerships';
import { partnershipDescriptionModal } from '../utils/partnershipInteractions';

export const data = new SlashCommandBuilder()
  .setName('partnership')
  .setDescription('Crea e pubblica una nuova partnership nel canale dedicato.')
  .addUserOption((option) =>
    option
      .setName('manager')
      .setDescription('Manager o referente della partnership')
      .setRequired(true)
  )
  .addMentionableOption((option) =>
    option
      .setName('ping')
      .setDescription('Ruolo o utente da menzionare nella pubblicazione')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ Questo comando è disponibile solo all\'interno di un server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const config = await getPartnershipConfig(interaction.guild.id);
  if (!config) {
    await interaction.reply({
      content: '❌ Le partnership non sono ancora configurate. Un amministratore deve prima configurarle con `/setup-partnership`.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!interaction.member || !canPublishPartnership(interaction.member, config.roleId)) {
    await interaction.reply({
      content: '❌ Non disponi del ruolo o dei permessi necessari per pubblicare partnership.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const manager = interaction.options.getUser('manager', true);
  const role = interaction.options.getRole('ping');
  const user = interaction.options.getUser('ping');

  let pingType: 'none' | 'u' | 'r' = 'none';
  let pingId = 'none';

  if (role) {
    pingType = 'r';
    pingId = role.id;
  } else if (user) {
    pingType = 'u';
    pingId = user.id;
  }

  await interaction.showModal(partnershipDescriptionModal(manager.id, pingType, pingId));
}
