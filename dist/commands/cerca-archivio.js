"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const archive_1 = require("../utils/archive");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('cerca-archivio')
    .setDescription('Cerca file nell\'archivio per nome.')
    .addStringOption((option) => option.setName('password').setDescription('Password dell\'archivio').setRequired(true))
    .addStringOption((option) => option.setName('file').setDescription('Nome o parte del nome da cercare').setRequired(true));
async function execute(interaction) {
    const password = interaction.options.getString('password', true);
    const searchTerm = interaction.options.getString('file', true).toLowerCase();
    if (!(0, archive_1.hasArchiveAccess)(password)) {
        await interaction.reply({ content: '❌ Credenziali non valide.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    try {
        const entries = await (0, archive_1.listArchiveEntries)();
        const matches = entries.filter((entry) => entry.name.toLowerCase().includes(searchTerm));
        if (!matches.length) {
            await interaction.reply({
                content: `📁 Nessun file trovato corrispondente a **${searchTerm}**.`,
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        const lines = matches.map((entry) => [
            `**${entry.name}**`,
            `Inserito da: <@${entry.uploaderId}> (${entry.uploaderId})`,
            `Data: ${entry.uploadedAt}`,
        ].join('\n'));
        const content = `📁 **File trovati (${matches.length})**\n\n${lines.join('\n\n')}`;
        await interaction.reply({ content: content.slice(0, 2000), flags: discord_js_1.MessageFlags.Ephemeral });
    }
    catch (error) {
        console.error('Errore durante la ricerca nell\'archivio:', error);
        await interaction.reply({ content: '❌ Errore durante la ricerca nell\'archivio.', flags: discord_js_1.MessageFlags.Ephemeral });
    }
}
