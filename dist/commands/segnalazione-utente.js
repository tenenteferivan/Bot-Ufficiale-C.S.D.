"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const userRecord_1 = require("../utils/userRecord");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('segnalazione-utente')
    .setDescription('Crea una segnalazione per un utente (Solo OPERATOR).')
    .addStringOption((option) => option
    .setName('utente')
    .setDescription('Mention o ID dell\'utente')
    .setRequired(true));
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
    // Recupera l'utente inserito
    const input = interaction.options
        .getString('utente', true)
        .trim();
    let userId;
    // Controlla se è una mention Discord
    const mentionMatch = input.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
        userId = mentionMatch[1];
    }
    else if (/^\d+$/.test(input)) {
        // Controlla se è un ID Discord
        userId = input;
    }
    else {
        await interaction.reply({
            content: '❌ Inserisci una mention o un ID utente valido.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    try {
        // Verifica che l'utente esista
        await interaction.client.users.fetch(userId);
        /*
         * ============================================================
         * MODAL SEGNALAZIONE
         * ============================================================
         */
        const modal = new discord_js_1.ModalBuilder()
            .setCustomId(`segnalazione_utente:${userId}`)
            .setTitle('Nuova Segnalazione');
        // 1. ID Dell'Utente
        const idUtente = new discord_js_1.TextInputBuilder()
            .setCustomId('id_utente')
            .setLabel('ID Dell\'Utente')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setValue(userId)
            .setRequired(true);
        // 2. Motivzione
        const motivzione = new discord_js_1.TextInputBuilder()
            .setCustomId('motivzione')
            .setLabel('Motivzione')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setPlaceholder('Inserisci la motivzione della segnalazione...')
            .setRequired(true);
        // 3. Narrazione dei Fatti
        const narrazione = new discord_js_1.TextInputBuilder()
            .setCustomId('narrazione_fatti')
            .setLabel('Narrazione dei Fatti')
            .setStyle(discord_js_1.TextInputStyle.Paragraph)
            .setPlaceholder('Descrivi dettagliatamente i fatti...')
            .setRequired(true);
        // 4. Server del Successo
        const serverSuccesso = new discord_js_1.TextInputBuilder()
            .setCustomId('server_successo')
            .setLabel('Server del Successo')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setPlaceholder('Nome del server dove è avvenuto il fatto...')
            .setRequired(true);
        // 5. Nome file Prove
        const nomeFileProve = new discord_js_1.TextInputBuilder()
            .setCustomId('nome_file_prove')
            .setLabel('Nome file Prove')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setPlaceholder('Nome del file contenente le prove...')
            .setRequired(true);
        /*
         * ============================================================
         * AGGIUNTA DEI CAMPI AL MODAL
         * ============================================================
         */
        modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(idUtente), new discord_js_1.ActionRowBuilder().addComponents(motivzione), new discord_js_1.ActionRowBuilder().addComponents(narrazione), new discord_js_1.ActionRowBuilder().addComponents(serverSuccesso), new discord_js_1.ActionRowBuilder().addComponents(nomeFileProve));
        // Mostra il modal
        await interaction.showModal(modal);
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
