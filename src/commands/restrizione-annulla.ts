import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  getRestriction,
  removeRestriction,
} from '../utils/restrictionManager';

export const data =
  new SlashCommandBuilder()
    .setName('restrizione-annulla')
    .setDescription(
      'Annulla la restrizione di un utente.'
    )
    .addUserOption(
      (option) =>
        option
          .setName('utente')
          .setDescription(
            'Utente a cui annullare la restrizione.'
          )
          .setRequired(true)
    );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  /*
   * ==========================================================
   * CONFIGURAZIONE
   * ==========================================================
   */

  const DIRIGENZA_ID =
    process.env.DIRIGENZA_ID;

  const GUILD_ID =
    process.env.GUILD_ID;

  if (!DIRIGENZA_ID) {
    console.error(
      '[RESTRICTION] DIRIGENZA_ID non configurato nel file .env.'
    );

    await interaction.reply({
      content:
        '❌ DIRIGENZA_ID non è configurato. Operazione annullata per sicurezza.',
      flags:
        MessageFlags.Ephemeral,
    });

    return;
  }

  if (!GUILD_ID) {
    console.error(
      '[RESTRICTION] GUILD_ID non configurato nel file .env.'
    );

    await interaction.reply({
      content:
        '❌ GUILD_ID non è configurato. Operazione annullata per sicurezza.',
      flags:
        MessageFlags.Ephemeral,
    });

    return;
  }

  /*
   * ==========================================================
   * SERVER
   * ==========================================================
   */

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
    interaction.guild.id !==
    GUILD_ID
  ) {
    await interaction.reply({
      content:
        '❌ Questo comando può essere utilizzato esclusivamente nel server principale.',
      flags:
        MessageFlags.Ephemeral,
    });

    return;
  }

  /*
   * ==========================================================
   * DIRIGENZA
   * ==========================================================
   */

  const member =
    await interaction.guild.members.fetch(
      interaction.user.id
    );

  if (
    !member.roles.cache.has(
      DIRIGENZA_ID
    )
  ) {
    await interaction.reply({
      content:
        '❌ Non disponi del ruolo DIRIGENZA necessario per utilizzare questo comando.',
      flags:
        MessageFlags.Ephemeral,
    });

    return;
  }

  /*
   * ==========================================================
   * UTENTE
   * ==========================================================
   */

  const user =
    interaction.options.getUser(
      'utente',
      true
    );

  /*
   * ==========================================================
   * VERIFICA
   * ==========================================================
   */

  const restriction =
    getRestriction(
      user.id
    );

  if (!restriction) {
    await interaction.reply({
      content: [
        'ℹ️ **Nessuna restrizione trovata.**',
        '',
        `👤 **Utente:** ${user.tag}`,
        `🆔 **ID:** ${user.id}`,
      ].join('\n'),
      flags:
        MessageFlags.Ephemeral,
    });

    return;
  }

  /*
   * ==========================================================
   * RIMOZIONE
   * ==========================================================
   */

  try {
    const removed =
      removeRestriction(
        user.id
      );

    if (!removed) {
      await interaction.reply({
        content:
          '⚠️ La restrizione non è più presente nel database.',
        flags:
          MessageFlags.Ephemeral,
      });

      return;
    }
  } catch (error) {
    console.error(
      '[RESTRICTION] Impossibile rimuovere la restrizione:',
      error
    );

    await interaction.reply({
      content:
        '❌ Si è verificato un errore durante l\'annullamento della restrizione.',
      flags:
        MessageFlags.Ephemeral,
    });

    return;
  }

  /*
   * ==========================================================
   * RISPOSTA
   * ==========================================================
   */

  await interaction.reply({
    content: [
      '🔓 **RESTRIZIONE ANNULLATA**',
      '',
      `👤 **Utente:** ${user.tag}`,
      `🆔 **ID:** ${user.id}`,
      `📋 **Motivo originale:** ${restriction.motivo}`,
      `⏱️ **Durata originale:** ${restriction.durata}`,
      `👮 **Annullata da:** ${interaction.user.tag}`,
      '',
      '✅ L\'utente potrà nuovamente entrare nei server in cui è presente il bot.',
    ].join('\n'),
    flags:
      MessageFlags.Ephemeral,
  });
}