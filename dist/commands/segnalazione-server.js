"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const userRecord_1 = require("../utils/userRecord");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('segnalazione-server')
    .setDescription('Crea una segnalazione relativa a un server (Solo OPERATOR).');
async function execute(interaction) {
    // Controlla che chi esegue il comando abbia il ruolo OPERATOR
    if (!(0, userRecord_1.isOperator)(interaction.member)) {
        await interaction.reply({
            content: '❌ Non disponi del ruolo o delle autorizzazioni necessarie per utilizzare questo comando.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    // Controlla che il comando venga eseguito in un server
    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Questo comando è disponibile solo nei server.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('segnalazione_server')
        .setTitle('Nuova Segnalazione Server');
    const server = new discord_js_1.TextInputBuilder()
        .setCustomId('server')
        .setLabel('Nome o ID del Server')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setPlaceholder('Inserisci il nome o l\'ID del server segnalato...')
        .setRequired(true);
    const motivazione = new discord_js_1.TextInputBuilder()
        .setCustomId('motivazione')
        .setLabel('Motivazione')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setPlaceholder('Inserisci la motivazione della segnalazione...')
        .setRequired(true);
    const narrazione = new discord_js_1.TextInputBuilder()
        .setCustomId('narrazione_fatti')
        .setLabel('Narrazione dei Fatti')
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setPlaceholder('Descrivi dettagliatamente i fatti...')
        .setRequired(true);
    const prove = new discord_js_1.TextInputBuilder()
        .setCustomId('nome_file_prove')
        .setLabel('Nome File Prove')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setPlaceholder('Nome del file contenente le prove...')
        .setRequired(true);
    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(server), new discord_js_1.ActionRowBuilder().addComponents(motivazione), new discord_js_1.ActionRowBuilder().addComponents(narrazione), new discord_js_1.ActionRowBuilder().addComponents(prove));
    await interaction.showModal(modal);
}
