"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const staffManager_1 = require("../utils/staffManager");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('aggiungi-operatore')
    .setDescription('Nomina un utente come Operatore Ufficiale C.S.D.')
    .addUserOption((option) => option
    .setName('utente')
    .setDescription('Utente da nominare Operatore Ufficiale C.S.D.')
    .setRequired(true));
async function execute(interaction) {
    const OWNER_ID = process.env.OWNER_ID;
    if (!OWNER_ID) {
        console.error('[STAFF] OWNER_ID non configurato nel file .env.');
        await interaction.reply({
            content: '❌ OWNER_ID non è configurato. Operazione annullata per sicurezza.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    if (interaction.user.id !== OWNER_ID) {
        await interaction.reply({
            content: '❌ Solo il proprietario del bot può utilizzare questo comando.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const user = interaction.options.getUser('utente', true);
    const added = (0, staffManager_1.addOperatore)(user.id);
    if (!added) {
        await interaction.reply({
            content: `⚠️ ${user} è già un Operatore Ufficiale C.S.D.`,
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    await interaction.reply({
        content: `✅ ${user} è stato nominato **Operatore Ufficiale C.S.D.**`,
        flags: discord_js_1.MessageFlags.Ephemeral,
    });
}
