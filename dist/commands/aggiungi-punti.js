"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const userRecord_1 = require("../utils/userRecord");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('aggiungi-punti')
    .setDescription('Aggiunge punti al registro di un utente (Solo OPERATOR).')
    .addStringOption((option) => option
    .setName('utente')
    .setDescription('Mention o ID dell\'utente')
    .setRequired(true))
    .addStringOption((option) => option
    .setName('motivo')
    .setDescription('Motivo dell\'accredito punti')
    .setRequired(true))
    .addStringOption((option) => option
    .setName('quantita')
    .setDescription('Quantità di punti da aggiungere (es. 2, 2.3)')
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
    // Recupera l'input dell'utente
    const input = interaction.options
        .getString('utente', true)
        .trim();
    let userId;
    // Controlla se l'input è una mention Discord
    const mentionMatch = input.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
        userId = mentionMatch[1];
    }
    else if (/^\d+$/.test(input)) {
        // Se è composto solamente da numeri, lo considera un ID
        userId = input;
    }
    else {
        await interaction.reply({
            content: '❌ Inserisci una mention o un ID utente valido.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    // Recupera il motivo
    const motivo = interaction.options
        .getString('motivo', true)
        .trim();
    // Recupera la quantità
    const quantitaStr = interaction.options
        .getString('quantita', true);
    // Converte la quantità
    const amount = (0, userRecord_1.parsePointAmount)(quantitaStr);
    if (amount === null) {
        await interaction.reply({
            content: '⚠️ **Quantità non valida!** Inserisci un numero positivo con al massimo un decimale (es. `2`, `2.3` o `2,3`).',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    try {
        // Recupera l'utente Discord tramite il suo ID
        const targetUser = await interaction.client.users.fetch(userId);
        // Aggiunge i punti al database
        const newPoints = await (0, userRecord_1.addPoints)(interaction.guild.id, userId, amount);
        // Crea il messaggio di conferma
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🟢 Accreditation Punti Effettuata')
            .setDescription(`Sono stati aggiunti punti a ${targetUser}.`)
            .addFields({
            name: '👤 Utente',
            value: `${targetUser} (\`${targetUser.id}\`)`,
            inline: true,
        }, {
            name: '📈 Punti Aggiunti',
            value: `\`+${amount.toFixed(1)}\``,
            inline: true,
        }, {
            name: '🪙 Nuovo Totale Punti',
            value: `\`${newPoints.toFixed(1)}/20.0\``,
            inline: true,
        }, {
            name: '📋 Motivo',
            value: motivo,
            inline: false,
        })
            .setFooter({
            text: 'Sistema Punti C.S.D.',
        })
            .setTimestamp();
        await interaction.reply({
            embeds: [embed],
        });
    }
    catch (error) {
        console.error('Errore durante l\'esecuzione di /aggiungi-punti:', error);
        await interaction.reply({
            content: '❌ Si è verificato un errore durante l\'aggiunta dei punti.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
}
