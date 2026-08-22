"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const archive_1 = require("../utils/archive");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('vedi-archivio')
    .setDescription('Mostra i file presenti nell\'archivio cifrato.')
    .addStringOption((option) => option.setName('password').setDescription('Password dell\'archivio').setRequired(true));
async function execute(interaction) {
    const password = interaction.options.getString('password', true);
    if (!(0, archive_1.hasArchiveAccess)(interaction.user.id, password)) {
        await interaction.reply({ content: '❌ Credenziali non valide o accesso non autorizzato.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    try {
        const entries = await (0, archive_1.listArchiveEntries)();
        if (!entries.length) {
            await interaction.reply({ content: '📁 L\'archivio è vuoto.', flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const lines = entries.map((entry) => [
            `**${entry.name}**`,
            `Inserito da: <@${entry.uploaderId}> (${entry.uploaderId})`,
            `Data: ${entry.uploadedAt}`,
        ].join('\n'));
        const content = `📁 **File nell'archivio (${entries.length})**\n\n${lines.join('\n\n')}`;
        await interaction.reply({ content: content.slice(0, 2000), flags: discord_js_1.MessageFlags.Ephemeral });
    }
    catch (error) {
        console.error('Errore durante la lettura dell\'archivio:', error);
        await interaction.reply({ content: '❌ Impossibile leggere l\'archivio.', flags: discord_js_1.MessageFlags.Ephemeral });
    }
}
