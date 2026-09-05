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
  .setName('segnalazione-utente')
  .setDescription(
    'Crea una segnalazione per un utente (Solo OPERATOR).'
  )
  .addStringOption((option) =>
    option
      .setName('utente')
      .setDescription('Mention o ID dell\'utente')
      .setRequired(true)
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

  // Recupera l'utente inserito
  const input = interaction.options
    .getString('utente', true)
    .trim();

  let userId: string;

  // Controlla se è una mention Discord
  const mentionMatch = input.match(/^<@!?(\d+)>$/);

  if (mentionMatch) {
    userId = mentionMatch[1];
  } else if (/^\d+$/.test(input)) {
    // Controlla se è un ID Discord
    userId = input;
  } else {
    await interaction.reply({
      content:
        '❌ Inserisci una mention o un ID utente valido.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    // Verifica che l'utente esista
    await interaction.client.users.fetch(userId);

    /*
     * ============================================================
     * MODAL SEGNALAZIONE
     * ============================================================
     */

    const modal = new ModalBuilder()
      .setCustomId(`segnalazione_utente:${userId}`)
      .setTitle('Nuova Segnalazione');

    // 1. ID Dell'Utente
    const idUtente = new TextInputBuilder()
      .setCustomId('id_utente')
      .setLabel('ID Dell\'Utente')
      .setStyle(TextInputStyle.Short)
      .setValue(userId)
      .setRequired(true);

    // 2. Motivzione
    const motivzione = new TextInputBuilder()
      .setCustomId('motivzione')
      .setLabel('Motivzione')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Inserisci la motivzione della segnalazione...')
      .setRequired(true);

    // 3. Narrazione dei Fatti
    const narrazione = new TextInputBuilder()
      .setCustomId('narrazione_fatti')
      .setLabel('Narrazione dei Fatti')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Descrivi dettagliatamente i fatti...')
      .setRequired(true);

    // 4. Server del Successo
    const serverSuccesso = new TextInputBuilder()
      .setCustomId('server_successo')
      .setLabel('Server del Successo')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Nome del server dove è avvenuto il fatto...')
      .setRequired(true);

    // 5. Nome file Prove
    const nomeFileProve = new TextInputBuilder()
      .setCustomId('nome_file_prove')
      .setLabel('Nome file Prove')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Nome del file contenente le prove...')
      .setRequired(true);

    /*
     * ============================================================
     * AGGIUNTA DEI CAMPI AL MODAL
     * ============================================================
     */

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        idUtente
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        motivzione
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        narrazione
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        serverSuccesso
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        nomeFileProve
      )
    );

    // Mostra il modal
    await interaction.showModal(modal);

  } catch (error) {
    console.error(
      'Errore durante il recupero dell\'utente:',
      error
    );

    await interaction.reply({
      content:
        '❌ Non è stato possibile trovare l\'utente Discord con la mention o l\'ID fornito.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }
}