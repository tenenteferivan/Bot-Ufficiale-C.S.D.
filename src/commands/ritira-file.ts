import { AttachmentBuilder, ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { mkdtemp, rm } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { decryptFileStream, hasArchiveAccess, normalizeArchiveName, notifyArchiveOwner } from '../utils/archive';

export const data = new SlashCommandBuilder()
  .setName('ritira-file')
  .setDescription('Invia tramite DM un file cifrato dell\'archivio.')
  .addStringOption((option) => option.setName('nome_file').setDescription('Nome del file da ritirare').setRequired(true))
  .addStringOption((option) => option.setName('password').setDescription('Password dell\'archivio').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const password = interaction.options.getString('password', true);
  const requestedName = interaction.options.getString('nome_file', true);
  const fileName = normalizeArchiveName(requestedName);

  if (!hasArchiveAccess(interaction.user.id, password)) {
    await notifyArchiveOwner(interaction.client, 'Download', interaction.user.id, false, 'Accesso negato.');
    await interaction.reply({ content: '❌ Credenziali non valide o accesso non autorizzato.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!fileName) {
    await notifyArchiveOwner(interaction.client, 'Download', interaction.user.id, false, 'Nome file non valido.');
    await interaction.reply({ content: '❌ Il nome del file non è valido.', flags: MessageFlags.Ephemeral });
    return;
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'cssd-archive-download-'));
  const tempFile = path.join(tempDir, fileName);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    await decryptFileStream(fileName, tempFile);
    await interaction.user.send({
      content: `📦 File richiesto dall'archivio: **${fileName}**`,
      files: [new AttachmentBuilder(tempFile, { name: fileName })],
    });
    await notifyArchiveOwner(interaction.client, 'Download', interaction.user.id, true, `File: ${fileName}`);
    await interaction.editReply('✅ Il file è stato inviato tramite DM.');
  } catch (error: any) {
    const detail = error?.code === 'ENOENT'
      ? 'File non trovato.'
      : 'Invio DM fallito oppure file non decifrabile.';
    await notifyArchiveOwner(interaction.client, 'Download', interaction.user.id, false, detail);
    await interaction.editReply(`❌ ${detail}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}