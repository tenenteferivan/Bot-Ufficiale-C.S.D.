import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  isOperator,
  parsePointAmount,
  removePoints,
} from '../utils/userRecord';

export const data = new SlashCommandBuilder()
  .setName('rimuovi-punti')
  .setDescription('Rimuove punti dal registro di un utente (Solo OPERATOR).')
  .addStringOption((option) =>
    option
      .setName('utente')
      .setDescription('Mention o ID dell\'utente')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('quantita')
      .setDescription('Quantità di punti da rimuovere (es. 2, 2.3)')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('motivo')
      .setDescription('Motivo della rimozione punti')
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
      content: '❌ Questo comando è disponibile solo nei server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Recupera l'input dell'utente
  const input = interaction.options
    .getString('utente', true)
    .trim();

  let userId: string;

  // Controlla se l'input è una mention Discord
  const mentionMatch = input.match(/^<@!?(\d+)>$/);

  if (mentionMatch) {
    userId = mentionMatch[1];
  } else if (/^\d+$/.test(input)) {
    // Se è composto solamente da numeri, lo considera un ID
    userId = input;
  } else {
    await interaction.reply({
      content:
        '❌ Inserisci una mention o un ID utente valido.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Recupera l'utente Discord
  const targetUser = await interaction.client.users.fetch(userId);

  // Recupera la quantità
  const quantitaStr = interaction.options
    .getString('quantita', true);

  // Recupera il motivo
  const motivo = interaction.options
    .getString('motivo', true)
    .trim();

  // Converte la quantità
  const amount = parsePointAmount(quantitaStr);

  if (amount === null) {
    await interaction.reply({
      content:
        '⚠️ **Quantità non valida!** Inserisci un numero positivo con al massimo un decimale (es. `2`, `2.3` o `2,3`).',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {

    // Rimuove i punti dal database
    const newPoints = await removePoints(
      interaction.guild.id,
      userId,
      amount,
      motivo
    );

    // Crea il messaggio di conferma
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🔻 Rimozione Punti Applicata')
      .setDescription(
        `Sono stati rimossi punti dal registro di ${targetUser}.`
      )
      .addFields(
        {
          name: '👤 Utente',
          value: `${targetUser} (\`${targetUser.id}\`)`,
          inline: true,
        },
        {
          name: '📉 Punti Rimossi',
          value: `\`-${amount.toFixed(1)}\``,
          inline: true,
        },
        {
          name: '🪙 Nuovo Totale Punti',
          value: `\`${newPoints.toFixed(1)}/20.0\``,
          inline: true,
        },
        {
          name: '📋 Motivo',
          value: motivo,
          inline: false,
        }
      )
      .setFooter({
        text: 'Registro Sanzioni C.S.D.',
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
    });

  } catch (error) {

    console.error(
      'Errore durante l\'esecuzione di /rimuovi-punti:',
      error
    );

    await interaction.reply({
      content:
        '❌ Si è verificato un errore durante la rimozione dos pontos.',
      flags: MessageFlags.Ephemeral,
    });
  }
}