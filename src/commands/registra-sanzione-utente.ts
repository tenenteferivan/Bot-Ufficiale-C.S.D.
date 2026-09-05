import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
  ActionRowBuilder,
} from 'discord.js';

import { isOperator } from '../utils/userRecord';

export const data = new SlashCommandBuilder()
  .setName('registra-sanzione-utente')
  .setDescription(
    'Registra una nueva sanzione disciplinare a carico di un utente.'
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  // ============================================================
  // CONTROLLO OPERATORE
  // ============================================================

  if (!isOperator(interaction.member)) {
    await interaction.reply({
      content:
        '❌ Non disponi del ruolo o delle autorizzazioni necessarie per registrare una sanzione.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  // ============================================================
  // CONTROLLO SERVER
  // ============================================================

  if (!interaction.guild) {
    await interaction.reply({
      content:
        '❌ Questo comando è disponibile solo nei server.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  try {
    // ============================================================
    // CREAZIONE MODAL
    // ============================================================

    const modal = new ModalBuilder()
      .setCustomId('registra_sanzione_utente')
      .setTitle('Registrazione Sanzione Utente');

    // ============================================================
    // UTENTE SANZIONATO
    // ============================================================

    const utente = new TextInputBuilder()
      .setCustomId('utente')
      .setLabel('Utente Sanzionato')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(
        'Inserisci il nome o l\'ID dell\'utente sanzionato...'
      )
      .setRequired(true)
      .setMaxLength(100);

    // ============================================================
    // OPERATORE
    // ============================================================

    const operatore = new TextInputBuilder()
      .setCustomId('operatore')
      .setLabel('Operatore')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(
        'Inserisci il nome o l\'ID dell\'operatore che ha applicato la sanzione...'
      )
      .setRequired(true)
      .setMaxLength(100);

    // ============================================================
    // MOTIVAZIONE DELLA SANZIONE
    // ============================================================

    const motivazione = new TextInputBuilder()
      .setCustomId('motivazione')
      .setLabel('Motivazione della Sanzione')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(
        'Indica il motivo per cui è stata applicata la sanzione...'
      )
      .setRequired(true)
      .setMaxLength(1024);

    // ============================================================
    // DESCRIZIONE DEI FATTI
    // ============================================================

    const descrizioneFatti = new TextInputBuilder()
      .setCustomId('descrizione_fatti')
      .setLabel('Descrizione dei Fatti')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(
        'Descrivi dettagliatamente i fatti che hanno portato alla sanzione...'
      )
      .setRequired(true)
      .setMaxLength(4000);

    // ============================================================
    // FIRMA
    // ============================================================

    const firma = new TextInputBuilder()
      .setCustomId('firma')
      .setLabel('Firma dell\'Operatore')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(
        'Inserisci la firma dell\'operatore...'
      )
      .setRequired(true)
      .setMaxLength(100);

    // ============================================================
    // COMPONENTI DEL MODAL
    // ============================================================

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        utente
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        operatore
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        motivazione
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        descrizioneFatti
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        firma
      )
    );

    // ============================================================
    // MOSTRA MODAL
    // ============================================================

    await interaction.showModal(modal);
  } catch (error) {
    console.error(
      'Errore durante la registrazione della sanzione utente:',
      error
    );

    if (interaction.replied || interaction.deferred) {
      return;
    }

    await interaction.reply({
      content:
        '❌ Si è verificato un errore durante la registrazione della sanzione.',
      flags: MessageFlags.Ephemeral,
    });
  }
}