import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';

import { isOperator, addNote } from '../utils/userRecord';

export const data = new SlashCommandBuilder()
  .setName('nota')
  .setDescription('Crea una nota per un utente (Solo OPERATOR).')
  .addStringOption((option) =>
    option
      .setName('utente')
      .setDescription('Mention o ID dell\'utente')
      .setRequired(true)
  )

  .addStringOption((option) =>
    option
      .setName('testo')
      .setDescription('Testo della nota')
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
      content: '❌ Questo comando è disponibile solo nei server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const input = interaction.options
    .getString('utente', true)
    .trim();

  let userId: string;

  const mentionMatch = input.match(/^<@!?(\d+)>$/);

  if (mentionMatch) {
    userId = mentionMatch[1];
  } else if (/^\d+$/.test(input)) {
    userId = input;
  } else {
    await interaction.reply({
      content: '❌ Inserisci una mention o un ID utente valido.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }



  const testo = interaction.options
    .getString('testo', true)
    .trim();

  try {
    const targetUser = await interaction.client.users.fetch(userId);
await addNote(
  interaction.guild.id,
  userId,
  testo
);

await interaction.reply({
  content: `✅ Nota aggiunta con successo a ${targetUser}.`,
  flags: MessageFlags.Ephemeral,
});
  
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