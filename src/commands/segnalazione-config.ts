import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  MessageFlags,
} from 'discord.js';

import {
  isOperator,
} from '../utils/userRecord';

import {
  saveReportConfig,
} from '../handlers/databasehandler';

export const data = new SlashCommandBuilder()
  .setName('segnalazione-setup')
  .setDescription(
    'Configura il canale per le segnalazioni di questo server.'
  )
  .addChannelOption((option) =>
    option
      .setName('canale')
      .setDescription(
        'Canale dove verranno pubblicate le segnalazioni.'
      )
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
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

  const configuredChannel = channel as any;
  if (configuredChannel.guildId !== interaction.guild.id || !configuredChannel.isTextBased() || typeof configuredChannel.send !== 'function') {
    await interaction.reply({ content: '❌ Il canale deve essere testuale e appartenere a questo server.', flags: MessageFlags.Ephemeral });
    return;
  }

  const botPermissions = configuredChannel.permissionsFor(interaction.client.user);
  if (!botPermissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
    await interaction.reply({ content: '❌ Il bot non può visualizzare o inviare messaggi nel canale selezionato.', flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    await saveReportConfig(
      interaction.guild.id,
      channel.id
    );

    await interaction.reply({
      content:
        `✅ Il canale delle segnalazioni è stato configurato su ${channel}.`,
      flags: MessageFlags.Ephemeral,
    });

  } catch (error) {
    console.error(
      'Errore durante la configurazione del canale delle segnalazioni:',
      error
    );

    await interaction.reply({
      content:
        '❌ Si è verificato un errore durante la configurazione del canale.',
      flags: MessageFlags.Ephemeral,
    });
  }
}