import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  addDirigenza,
} from '../utils/staffManager';

export const data =
  new SlashCommandBuilder()
    .setName('aggiungi-dirigenza')
    .setDescription(
      'Nomina un utente alla Dirigenza Esecutiva di C.S.D.'
    )
    .addUserOption(
      (option) =>
        option
          .setName('utente')
          .setDescription(
            'Utente da nominare alla Dirigenza Esecutiva di C.S.D.'
          )
          .setRequired(true)
    );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const OWNER_ID =
    process.env.OWNER_ID;

  if (!OWNER_ID) {
    console.error(
      '[STAFF] OWNER_ID non configurato nel file .env.'
    );

    await interaction.reply({
      content:
        '❌ OWNER_ID non è configurato. Operazione annullata per sicurezza.',
      flags:
        MessageFlags.Ephemeral,
    });

    return;
  }

  if (
    interaction.user.id !== OWNER_ID
  ) {
    await interaction.reply({
      content:
        '❌ Solo il proprietario del bot può utilizzare questo comando.',
      flags:
        MessageFlags.Ephemeral,
    });

    return;
  }

  const user =
    interaction.options.getUser(
      'utente',
      true
    );

  const added =
    addDirigenza(user.id);

  if (!added) {
    await interaction.reply({
      content:
        `⚠️ ${user} è già membro della **Dirigenza Esecutiva di C.S.D.**`,
      flags:
        MessageFlags.Ephemeral,
    });

    return;
  }

  await interaction.reply({
    content:
      `✅ ${user} è stato nominato alla **Dirigenza Esecutiva di C.S.D.**`,
    flags:
      MessageFlags.Ephemeral,
  });
}