"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const userRecord_1 = require("../utils/userRecord");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('nota')
    .setDescription('Crea una nota per un utente (Solo OPERATOR).')
    .addStringOption((option) => option
    .setName('utente')
    .setDescription('Mention o ID dell\'utente')
    .setRequired(true))
    .addStringOption((option) => option
    .setName('testo')
    .setDescription('Testo della nota')
    .setRequired(true));
async function execute(interaction) {
    if (!(0, userRecord_1.isOperator)(interaction.member)) {
        await interaction.reply({
            content: '❌ Non disponi del ruolo o delle autorizzazioni necessarie per utilizzare questo comando.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Questo comando è disponibile solo nei server.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const input = interaction.options
        .getString('utente', true)
        .trim();
    let userId;
    const mentionMatch = input.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
        userId = mentionMatch[1];
    }
    else if (/^\d+$/.test(input)) {
        userId = input;
    }
    else {
        await interaction.reply({
            content: '❌ Inserisci una mention o un ID utente valido.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const testo = interaction.options
        .getString('testo', true)
        .trim();
    try {
        const targetUser = await interaction.client.users.fetch(userId);
        await (0, userRecord_1.addNote)(interaction.guild.id, userId, testo);
        await interaction.reply({
            content: `✅ Nota aggiunta con successo a ${targetUser}.`,
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
    catch (error) {
        console.error('Errore durante il recupero dell\'utente:', error);
        await interaction.reply({
            content: '❌ Non è stato possibile trovare l\'utente Discord con la mention o l\'ID fornito.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
}
