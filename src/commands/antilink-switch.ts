import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  getAntiLinkConfig,
  setAntiLinkEnabled,
} from '../utils/antilinkManager';

export const data =
  new SlashCommandBuilder()
    .setName('antilink-switch')
    .setDescription(
      'Attiva o disattiva il sistema AntiLink.'
    );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content:
        '❌ Questo comando può essere utilizzato solo nei server.',
      flags:
        MessageFlags.Ephemeral,
    });

    return;
  }

  if (
    !interaction.memberPermissions?.has(
      'ManageGuild'
    )
  ) {
    await interaction.reply({
      content:
        '❌ Non disponi dei permessi necessari per utilizzare questo comando.',
      flags:
        MessageFlags.Ephemeral,
    });

    return;
  }

  const config =
    getAntiLinkConfig(
      interaction.guild.id
    );

  const newState =
    !config.enabled;

  setAntiLinkEnabled(
    interaction.guild.id,
    newState
  );

  await interaction.reply({
    content: newState
      ? '🔗 **AntiLink attivato.** Da questo momento i link inviati dagli utenti non autorizzati verranno eliminati.'
      : '🔗 **AntiLink disattivato.** I link non verranno più eliminati automaticamente.',
    flags:
      MessageFlags.Ephemeral,
  });
}