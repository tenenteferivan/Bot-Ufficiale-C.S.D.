import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { deleteSanctions } from '../handlers/databasehandler';

export const data = new SlashCommandBuilder()
  .setName('pulisci')
  .setDescription('Gestisce la pulizia del registro.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommandGroup((group) =>
    group
      .setName('registro')
      .setDescription('Gestisce il registro delle sanzioni.')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('utente')
          .setDescription('Elimina tutte le sanzioni registrate per un utente.')
          .addUserOption((option) =>
            option
              .setName('utente')
              .setDescription('L\'utente da rimuovere dal registro.')
              .setRequired(true)
          )
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: '❌ Solo gli amministratori possono pulire il registro.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const targetUser = interaction.options.getUser('utente', true);

  try {
    const deletedCount = await deleteSanctions(targetUser.id, interaction.guild.id);
    await interaction.reply({
      content: deletedCount > 0
        ? `✅ Eliminati ${deletedCount} record dal registro di ${targetUser}.`
        : `📋 Nessun record trovato nel registro di ${targetUser}.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('Errore durante la pulizia del registro:', error);
    await interaction.reply({
      content: '❌ Impossibile pulire il registro dell\'utente.',
      flags: MessageFlags.Ephemeral,
    });
  }
}