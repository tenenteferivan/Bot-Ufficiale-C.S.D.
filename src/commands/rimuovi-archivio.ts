import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { deleteEncryptedArchive, hasArchiveAccess, normalizeArchiveName, notifyArchiveOwner } from '../utils/archive';

export const data = new SlashCommandBuilder()
  .setName('rimuovi-archivio')
  .setDescription('Elimina definitivamente un file dall\'archivio cifrato.')
  .addStringOption((option) => option.setName('nome').setDescription('Nome del file da eliminare').setRequired(true))
  .addStringOption((option) => option.setName('password').setDescription('Password dell\'archivio').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const password = interaction.options.getString('password', true);
  const requestedName = interaction.options.getString('nome', true);
  const fileName = normalizeArchiveName(requestedName);

  if (!hasArchiveAccess(password)) {
    await notifyArchiveOwner(interaction.client, 'Eliminazione', interaction.user.id, false, 'Accesso negato.');
    await interaction.reply({ content: '❌ Credenziali non valide o accesso non autorizzato.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!fileName) {
    await notifyArchiveOwner(interaction.client, 'Eliminazione', interaction.user.id, false, 'Nome file non valido.');
    await interaction.reply({ content: '❌ Il nome del file non è valido.', flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    await deleteEncryptedArchive(fileName);
    await notifyArchiveOwner(interaction.client, 'Eliminazione', interaction.user.id, true, `File eliminato: ${fileName}`);
    await interaction.reply({ content: `✅ Il file **${fileName}** è stato eliminato definitivamente dall'archivio.`, flags: MessageFlags.Ephemeral });
  } catch (error: any) {
    const detail = error?.code === 'ENOENT' ? 'File non trovato.' : 'Impossibile eliminare il file.';
    await notifyArchiveOwner(interaction.client, 'Eliminazione', interaction.user.id, false, detail);
    await interaction.reply({ content: `❌ ${detail}`, flags: MessageFlags.Ephemeral });
  }
}
