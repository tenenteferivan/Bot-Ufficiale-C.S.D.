"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const userRecord_1 = require("../utils/userRecord");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('avvertimento-formale')
    .setDescription('Emette un avvertimento formale a un utente (Solo OPERATOR).')
    .addStringOption((option) => option
    .setName('utente')
    .setDescription('Mention o ID dell\'utente')
    .setRequired(true))
    .addStringOption((option) => option
    .setName('motivo')
    .setDescription('Motivo dell\'avvertimento formale')
    .setRequired(true))
    .addStringOption((option) => option
    .setName('durata')
    .setDescription('Durata dell\'avvertimento in giorni (es. 1d, 7g, 30d - min 1d, max 30d)')
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
    // Recupera l'utente Discord
    const targetUser = await interaction.client.users.fetch(userId);
    // Recupera il motivo
    const motivo = interaction.options
        .getString('motivo', true)
        .trim();
    // Recupera la durata
    const durataStr = interaction.options
        .getString('durata', true);
    // Converte la durata in giorni
    const durationDays = (0, userRecord_1.parseWarningDuration)(durataStr);
    if (durationDays === null) {
        await interaction.reply({
            content: '⚠️ **Durata non valida!** Specifica la durata con `d` o `g` (es. `1d`, `7g`, `30d`). Il valore deve essere compreso tra **1** e **30** giorni.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    try {
        // Registra l'avvertimento formale nel database
        const expiresAt = await (0, userRecord_1.addFormalWarning)(userId, motivo, durationDays);
        // Converte la scadenza nel formato timestamp di Discord
        const expiresTimestamp = Math.floor(expiresAt.getTime() / 1000);
        // Crea il messaggio di conferma
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('⚠️ Avvertimento Formale Emesso')
            .setDescription(`È stato registrato un avvertimento formale per ${targetUser}.`)
            .addFields({
            name: '👤 Utente',
            value: `${targetUser} (\`${targetUser.id}\`)`,
            inline: true,
        }, {
            name: '⏱️ Durata',
            value: `\`${durationDays} giorni\``,
            inline: true,
        }, {
            name: '📅 Scadenza',
            value: `<t:${expiresTimestamp}:F> (<t:${expiresTimestamp}:R>)`,
            inline: true,
        }, {
            name: '📋 Motivo',
            value: motivo,
            inline: false,
        })
            .setFooter({
            text: 'Registro Sanzioni C.S.D. • Scadenza Automatica',
        })
            .setTimestamp();
        await interaction.reply({
            embeds: [embed],
        });
    }
    catch (error) {
        console.error('Errore durante l\'esecuzione di /avvertimento-formale:', error);
        await interaction.reply({
            content: '❌ Si è verificato un errore durante la registrazione dell\'avvertimento formale.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
}
