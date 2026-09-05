"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const userRecord_1 = require("../utils/userRecord");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('registra-sanzione-utente')
    .setDescription('Registra una nueva sanzione disciplinare a carico di un utente.');
async function execute(interaction) {
    // ============================================================
    // CONTROLLO OPERATORE
    // ============================================================
    if (!(0, userRecord_1.isOperator)(interaction.member)) {
        await interaction.reply({
            content: '❌ Non disponi del ruolo o delle autorizzazioni necessarie per registrare una sanzione.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    // ============================================================
    // CONTROLLO SERVER
    // ============================================================
    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Questo comando è disponibile solo nei server.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    try {
        // ============================================================
        // CREAZIONE MODAL
        // ============================================================
        const modal = new discord_js_1.ModalBuilder()
            .setCustomId('registra_sanzione_utente')
            .setTitle('Registrazione Sanzione Utente');
        // ============================================================
        // UTENTE SANZIONATO
        // ============================================================
        const utente = new discord_js_1.TextInputBuilder()
            .setCustomId('utente')
            .setLabel('Utente Sanzionato')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setPlaceholder('Inserisci il nome o l\'ID dell\'utente sanzionato...')
            .setRequired(true)
            .setMaxLength(100);
        // ============================================================
        // OPERATORE
        // ============================================================
        const operatore = new discord_js_1.TextInputBuilder()
            .setCustomId('operatore')
            .setLabel('Operatore')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setPlaceholder('Inserisci il nome o l\'ID dell\'operatore che ha applicato la sanzione...')
            .setRequired(true)
            .setMaxLength(100);
        // ============================================================
        // MOTIVAZIONE DELLA SANZIONE
        // ============================================================
        const motivazione = new discord_js_1.TextInputBuilder()
            .setCustomId('motivazione')
            .setLabel('Motivazione della Sanzione')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setPlaceholder('Indica il motivo per cui è stata applicata la sanzione...')
            .setRequired(true)
            .setMaxLength(1024);
        // ============================================================
        // DESCRIZIONE DEI FATTI
        // ============================================================
        const descrizioneFatti = new discord_js_1.TextInputBuilder()
            .setCustomId('descrizione_fatti')
            .setLabel('Descrizione dei Fatti')
            .setStyle(discord_js_1.TextInputStyle.Paragraph)
            .setPlaceholder('Descrivi dettagliatamente i fatti che hanno portato alla sanzione...')
            .setRequired(true)
            .setMaxLength(4000);
        // ============================================================
        // FIRMA
        // ============================================================
        const firma = new discord_js_1.TextInputBuilder()
            .setCustomId('firma')
            .setLabel('Firma dell\'Operatore')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setPlaceholder('Inserisci la firma dell\'operatore...')
            .setRequired(true)
            .setMaxLength(100);
        // ============================================================
        // COMPONENTI DEL MODAL
        // ============================================================
        modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(utente), new discord_js_1.ActionRowBuilder().addComponents(operatore), new discord_js_1.ActionRowBuilder().addComponents(motivazione), new discord_js_1.ActionRowBuilder().addComponents(descrizioneFatti), new discord_js_1.ActionRowBuilder().addComponents(firma));
        // ============================================================
        // MOSTRA MODAL
        // ============================================================
        await interaction.showModal(modal);
    }
    catch (error) {
        console.error('Errore durante la registrazione della sanzione utente:', error);
        if (interaction.replied || interaction.deferred) {
            return;
        }
        await interaction.reply({
            content: '❌ Si è verificato un errore durante la registrazione della sanzione.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
}
