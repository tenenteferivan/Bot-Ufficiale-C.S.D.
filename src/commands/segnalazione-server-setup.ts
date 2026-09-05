import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import { isOperator } from '../utils/userRecord';
import { saveServerReportConfig } from '../handlers/databasehandler';

export const data = new SlashCommandBuilder()
  .setName('segnalazione-server-setup')
  .setDescription(
    'Configura il canale per le segnalazioni dei server.'
  )
  .addChannelOption((option) =>
    option
      .setName('canale')
      .setDescription(
        'Canale dove verranno pubblicate le segnalazioni dei server.'
      )
      .setRequired(true)
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!isOperator(interaction.member)) {
    await interaction.reply({
      content:
        '❌ Non disponi del ruolo o delle autorizzazioni necessarie per utilizzare questo comando.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!interaction.guild) {
    await interaction.reply({
      content:
        '❌ Questo comando è disponibile solo nei server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.options.getChannel(
    'canale',
    true
  );

  try {
    await saveServerReportConfig(
      interaction.guild.id,
      channel.id
    );

    await interaction.reply({
      content:
        `✅ Il canale delle segnalazioni server è stato configurato su ${channel}.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error(
      'Errore durante la configurazione del canale delle segnalazioni server:',
      error
    );

    await interaction.reply({
      content:
        '❌ Si è verificato un errore durante la configurazione del canale.',
      flags: MessageFlags.Ephemeral,
    });
  }
}