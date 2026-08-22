import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { createWriteStream } from 'fs';
import { mkdtemp, rm } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { encryptFileStream, hasArchiveAccess, normalizeArchiveName, notifyArchiveOwner, saveArchiveMetadata } from '../utils/archive';

export const data = new SlashCommandBuilder()
  .setName('aggiungi-archivio')
  .setDescription('Carica un file cifrato nell\'archivio.')
  .addStringOption((option) => option.setName('password').setDescription('Password dell\'archivio').setRequired(true))
  .addStringOption((option) => option.setName('nome').setDescription('Nome con cui salvare il file').setRequired(true))
  .addAttachmentOption((option) => option.setName('file_allegato').setDescription('File da cifrare').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const password = interaction.options.getString('password', true);
  const requestedName = interaction.options.getString('nome', true);
  const attachment = interaction.options.getAttachment('file_allegato', true);
  const fileName = normalizeArchiveName(requestedName);

  if (!hasArchiveAccess(interaction.user.id, password)) {
    await notifyArchiveOwner(interaction.client, 'Caricamento', interaction.user.id, false, 'Accesso negato.');
    await interaction.reply({ content: '❌ Credenziali non valide o accesso non autorizzato.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!fileName) {
    await notifyArchiveOwner(interaction.client, 'Caricamento', interaction.user.id, false, 'Nome file non valido.');
    await interaction.reply({ content: '❌ Il nome del file non è valido.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'cssd-archive-upload-'));
  const tempFile = path.join(tempDir, 'source.bin');

  try {
    const response = await fetch(attachment.url);
    if (!response.ok) throw new Error(`Download allegato fallito: HTTP ${response.status}`);
    if (!response.body) throw new Error('Nessun corpo di risposta disponibile.');

    const output = createWriteStream(tempFile, { flags: 'wx' });
    await pipeline(Readable.fromWeb(response.body as any), output);
    await encryptFileStream(tempFile, fileName);
    await saveArchiveMetadata(fileName, interaction.user.id);

    await notifyArchiveOwner(interaction.client, 'Caricamento', interaction.user.id, true, `File: ${fileName}`);
    await interaction.editReply(`✅ File **${fileName}** cifrato e salvato nell'archivio.`);
  } catch (error: any) {
    const detail = error?.code === 'EEXIST' ? 'Nome file già presente.' : 'Errore durante il salvataggio.';
    await notifyArchiveOwner(interaction.client, 'Caricamento', interaction.user.id, false, detail);
    await interaction.editReply(`❌ ${detail}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}