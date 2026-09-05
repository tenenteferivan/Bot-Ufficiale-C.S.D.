"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const archive_1 = require("../utils/archive");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('rimuovi-archivio')
    .setDescription('Elimina definitivamente un file dall\'archivio cifrato.')
    .addStringOption((option) => option.setName('nome').setDescription('Nome del file da eliminare').setRequired(true))
    .addStringOption((option) => option.setName('password').setDescription('Password dell\'archivio').setRequired(true));
async function execute(interaction) {
    const password = interaction.options.getString('password', true);
    const requestedName = interaction.options.getString('nome', true);
    const fileName = (0, archive_1.normalizeArchiveName)(requestedName);
    if (!(0, archive_1.hasArchiveAccess)(password)) {
        await (0, archive_1.notifyArchiveOwner)(interaction.client, 'Eliminazione', interaction.user.id, false, 'Accesso negato.');
        await interaction.reply({ content: '❌ Credenziali non valide o accesso non autorizzato.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (!fileName) {
        await (0, archive_1.notifyArchiveOwner)(interaction.client, 'Eliminazione', interaction.user.id, false, 'Nome file non valido.');
        await interaction.reply({ content: '❌ Il nome del file non è valido.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    try {
        await (0, archive_1.deleteEncryptedArchive)(fileName);
        await (0, archive_1.notifyArchiveOwner)(interaction.client, 'Eliminazione', interaction.user.id, true, `File eliminato: ${fileName}`);
        await interaction.reply({ content: `✅ Il file **${fileName}** è stato eliminato definitivamente dall'archivio.`, flags: discord_js_1.MessageFlags.Ephemeral });
    }
    catch (error) {
        const detail = error?.code === 'ENOENT' ? 'File non trovato.' : 'Impossibile eliminare il file.';
        await (0, archive_1.notifyArchiveOwner)(interaction.client, 'Eliminazione', interaction.user.id, false, detail);
        await interaction.reply({ content: `❌ ${detail}`, flags: discord_js_1.MessageFlags.Ephemeral });
    }
}
