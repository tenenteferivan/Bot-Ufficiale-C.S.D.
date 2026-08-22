import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { hasArchiveAccess, listArchiveEntries } from '../utils/archive';

export const data = new SlashCommandBuilder()
  .setName('vedi-archivio')
  .setDescription('Mostra i file presenti nell\'archivio cifrato.')
  .addStringOption((option) => option.setName('password').setDescription('Password dell\'archivio').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const password = interaction.options.getString('password', true);

  if (!hasArchiveAccess(interaction.user.id, password)) {
    await interaction.reply({ content: '❌ Credenziali non valide o accesso non autorizzato.', flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    const entries = await listArchiveEntries();
    if (!entries.length) {
      await interaction.reply({ content: '📁 L\'archivio è vuoto.', flags: MessageFlags.Ephemeral });
      return;
    }

    const lines = entries.map((entry) => [
      `**${entry.name}**`,
      `Inserito da: <@${entry.uploaderId}> (${entry.uploaderId})`,
      `Data: ${entry.uploadedAt}`,
    ].join('\n'));
    const content = `📁 **File nell'archivio (${entries.length})**\n\n${lines.join('\n\n')}`;
    await interaction.reply({ content: content.slice(0, 2000), flags: MessageFlags.Ephemeral });
  } catch (error) {
    console.error('Errore durante la lettura dell\'archivio:', error);
    await interaction.reply({ content: '❌ Impossibile leggere l\'archivio.', flags: MessageFlags.Ephemeral });
  }
}