

import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  ChannelType,
} from 'discord.js';

import { isOperator } from '../utils/userRecord';
import { saveSanctionConfig } from '../handlers/databasehandler';

export const data = new SlashCommandBuilder()
  .setName('registra-sanzione-setup')
  .setDescription(
    'Configura il canale per la pubblicazione delle sanzioni disciplinari.'
  )
  .addChannelOption((option) =>
    option
      .setName('canale')
      .setDescription(
        'Canale dove verranno pubblicate le sanzioni disciplinari.'
      )
      .addChannelTypes(
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement
      )
      .setRequired(true)
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {

  // ============================================================
  // VERIFICA OPERATORE
  // ============================================================

  if (!isOperator(interaction.member)) {
    await interaction.reply({
      content:
        '❌ Non disponi del ruolo o delle autorizzazioni necessarie per configurare il canale delle sanzioni.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }


  // ============================================================
  // VERIFICA SERVER
  // ============================================================

  if (!interaction.guild) {
    await interaction.reply({
      content:
        '❌ Questo comando è disponibile solo nei server.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }


  // ============================================================
  // VERIFICA GUILD_ID AUTORIZZATA
  // ============================================================

  const configuredGuildId = process.env.GUILD_ID;

  if (!configuredGuildId) {
    console.error(
      '[SANZIONE SETUP] GUILD_ID non configurato nel file .env.'
    );

    await interaction.reply({
      content:
        '❌ Il server autorizzato non è stato configurato correttamente.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }


  if (interaction.guild.id !== configuredGuildId) {
    await interaction.reply({
      content:
        '❌ Questo comando può essere utilizzato solo nel server autorizzato.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }


  // ============================================================
  // RECUPERA CANALE
  // ============================================================

  const channel =
    interaction.options.getChannel('canale', true);


  // ============================================================
  // SALVA CONFIGURAZIONE
  // ============================================================

  try {

    await saveSanctionConfig(
      interaction.guild.id,
      channel.id
    );


    await interaction.reply({
      content:
        `✅ Il canale per le sanzioni disciplinari è stato configurato correttamente su ${channel}.`,
      flags: MessageFlags.Ephemeral,
    });


    console.log(
      `[SANZIONE SETUP] Canale configurato: ` +
      `Guild ${interaction.guild.id} | ` +
      `Channel ${channel.id}`
    );

  } catch (error) {

    console.error(
      '[SANZIONE SETUP] Errore durante la configurazione del canale:',
      error
    );

    await interaction.reply({
      content:
        '❌ Si è verificato un errore durante la configurazione del canale delle sanzioni.',
      flags: MessageFlags.Ephemeral,
    });
  }
}