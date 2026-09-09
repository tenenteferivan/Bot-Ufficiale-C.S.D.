"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const userRecord_1 = require("../utils/userRecord");
// Creazione comando
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('resetta-registro')
    .setDescription('Resetta completamente il registro di un utente (Solo OPERATOR).')
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
    // Controlla che il comando venga eseguito dentro un server
    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Questo comando è disponibile solo nei server.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    // Recupera la stringa inserita dall'operatore
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
        // Recupera l'utente Discord
        const targetUser = await interaction.client.users.fetch(userId);
        // Controlla che l'utente faccia effettivamente parte del server
        await interaction.guild.members.fetch(targetUser.id);
        /*
         * ============================================================
         * RESET GLOBALE DEL REGISTRO
         * ============================================================
         *
         * Il registro è globale.
         *
         * Quindi NON utilizziamo guild_id.
         *
         * Il reset elimina:
         * - tutte le sanzioni globali
         * - tutte le note globali
         * - tutti i dati del registro
         *
         * per questo user_id.
         */
        await (0, userRecord_1.resetUserRecord)(targetUser.id);
        // Crea il messaggio di conferma
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🟢 Registro Resettato')
            .setDescription(`Il registro di ${targetUser} è stato completamente resettato.`)
            .addFields({
            name: '👤 Utente',
            value: `${targetUser}`,
            inline: true,
        }, {
            name: '📊 Punti',
            value: '20.0 / 20.0',
            inline: true,
        }, {
            name: '🧹 Sanzioni',
            value: 'Tutte eliminate',
            inline: true,
        })
            .setFooter({
            text: 'Sistema Punti C.S.D.',
        })
            .setTimestamp();
        // Invia il risultato solamente dopo aver completato il reset
        await interaction.reply({
            embeds: [embed],
        });
    }
    catch (error) {
        console.error('Errore durante il reset del registro utente:', error);
        await interaction.reply({
            content: '❌ Si è verificato un errore durante il reset del registro dell\'utente.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
}
