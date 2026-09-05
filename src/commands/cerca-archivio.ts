import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { hasArchiveAccess, listArchiveEntries } from '../utils/archive';

export const data = new SlashCommandBuilder()
  .setName('cerca-archivio')
  .setDescription('Cerca file nell\'archivio per nome.')
  .addStringOption((option) => option.setName('password').setDescription('Password dell\'archivio').setRequired(true))
  .addStringOption((option) => option.setName('file').setDescription('Nome o parte del nome da cercare').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const password = interaction.options.getString('password', true);
  const searchTerm = interaction.options.getString('file', true).toLowerCase();

  if (!hasArchiveAccess(password)) {
    await interaction.reply({ content: '❌ Credenziali non valide.', flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    const entries = await listArchiveEntries();
    const matches = entries.filter((entry) => entry.name.toLowerCase().includes(searchTerm));

    if (!matches.length) {
      await interaction.reply({
        content: `📁 Nessun file trovato corrispondente a **${searchTerm}**.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const lines = matches.map((entry) => [
      `**${entry.name}**`,
      `Inserito da: <@${entry.uploaderId}> (${entry.uploaderId})`,
      `Data: ${entry.uploadedAt}`,
    ].join('\n'));

    const content = `📁 **File trovati (${matches.length})**\n\n${lines.join('\n\n')}`;
    await interaction.reply({ content: content.slice(0, 2000), flags: MessageFlags.Ephemeral });
  } catch (error) {
    console.error('Errore durante la ricerca nell\'archivio:', error);
    await interaction.reply({ content: '❌ Errore durante la ricerca nell\'archivio.', flags: MessageFlags.Ephemeral });
  }
}
