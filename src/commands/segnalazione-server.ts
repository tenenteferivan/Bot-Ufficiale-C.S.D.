import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

import { isOperator } from '../utils/userRecord';

export const data = new SlashCommandBuilder()
  .setName('segnalazione-server')
  .setDescription(
    'Crea una segnalazione relativa a un server (Solo OPERATOR).'
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  // Controlla che chi esegue il comando abbia il ruolo OPERATOR
  if (!isOperator(interaction.member)) {
    await interaction.reply({
      content:
        '❌ Non disponi del ruolo o delle autorizzazioni necessarie per utilizzare questo comando.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Controlla che il comando venga eseguito in un server
  if (!interaction.guild) {
    await interaction.reply({
      content:
        '❌ Questo comando è disponibile solo nei server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId('segnalazione_server')
    .setTitle('Nuova Segnalazione Server');

  const server = new TextInputBuilder()
    .setCustomId('server')
    .setLabel('Nome o ID del Server')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(
      'Inserisci il nome o l\'ID del server segnalato...'
    )
    .setRequired(true);

  const motivazione = new TextInputBuilder()
    .setCustomId('motivazione')
    .setLabel('Motivazione')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(
      'Inserisci la motivazione della segnalazione...'
    )
    .setRequired(true);

  const narrazione = new TextInputBuilder()
    .setCustomId('narrazione_fatti')
    .setLabel('Narrazione dei Fatti')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(
      'Descrivi dettagliatamente i fatti...'
    )
    .setRequired(true);

  const prove = new TextInputBuilder()
    .setCustomId('nome_file_prove')
    .setLabel('Nome File Prove')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(
      'Nome del file contenente le prove...'
    )
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      server
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      motivazione
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      narrazione
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      prove
    )
  );

  await interaction.showModal(modal);
}