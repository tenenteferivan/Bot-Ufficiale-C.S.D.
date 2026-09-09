"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const restrictionManager_1 = require("../utils/restrictionManager");
const userNotification_1 = require("../utils/userNotification");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('restrizione')
    .setDescription('Impedisce a un utente di entrare nei server affiliati.')
    .addUserOption((option) => option
    .setName('utente')
    .setDescription('Utente da restringere.')
    .setRequired(true))
    .addStringOption((option) => option
    .setName('motivo')
    .setDescription('Motivo della restrizione.')
    .setRequired(true))
    .addStringOption((option) => option
    .setName('durata')
    .setDescription('Durata: 10min, 7d, 2m, 1y.')
    .setRequired(true));
async function execute(interaction) {
    /*
     * ==========================================================
     * CONFIGURAZIONE
     * ==========================================================
     */
    const DIRIGENZA_ID = process.env.DIRIGENZA_ID;
    const GUILD_ID = process.env.GUILD_ID;
    if (!DIRIGENZA_ID) {
        console.error('[RESTRICTION] DIRIGENZA_ID non configurato nel file .env.');
        await interaction.reply({
            content: '❌ DIRIGENZA_ID non è configurato. Operazione annullata per sicurezza.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    if (!GUILD_ID) {
        console.error('[RESTRICTION] GUILD_ID non configurato nel file .env.');
        await interaction.reply({
            content: '❌ GUILD_ID non è configurato. Operazione annullata per sicurezza.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    /*
     * ==========================================================
     * CONTROLLO SERVER
     * ==========================================================
     *
     * Il comando /restrizione può essere utilizzato
     * esclusivamente nel GUILD_ID configurato nel .env.
     *
     * ==========================================================
     */
    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Questo comando può essere utilizzato solo nei server.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    if (interaction.guild.id !==
        GUILD_ID) {
        await interaction.reply({
            content: '❌ Questo comando può essere utilizzato esclusivamente nel server principale.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    /*
     * ==========================================================
     * CONTROLLO DIRIGENZA
     * ==========================================================
     */
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(DIRIGENZA_ID)) {
        await interaction.reply({
            content: '❌ Non disponi del ruolo DIRIGENZA necessario per utilizzare questo comando.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    /*
     * ==========================================================
     * DATI
     * ==========================================================
     */
    const user = interaction.options.getUser('utente', true);
    const motivo = interaction.options.getString('motivo', true);
    const durataInput = interaction.options.getString('durata', true);
    /*
     * ==========================================================
     * DURATA
     * ==========================================================
     */
    const parsedDuration = (0, restrictionManager_1.parseRestrictionDuration)(durataInput);
    if (!parsedDuration) {
        await interaction.reply({
            content: [
                '❌ **Durata non valida.**',
                '',
                '**Formati supportati:**',
                '• `10min`',
                '• `30min`',
                '• `7d`',
                '• `30d`',
                '• `2m`',
                '• `6m`',
                '• `1y`',
                '',
                'Puoi anche utilizzare forme come `10 minutos`, `7 giorni`, `2 mesi` o `1 anno`.',
            ].join('\n'),
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const durata = (0, restrictionManager_1.formatRestrictionDuration)(parsedDuration);
    /*
     * ==========================================================
     * SALVATAGGIO
     * ==========================================================
     */
    const restriction = {
        userId: user.id,
        userTag: user.tag,
        motivo,
        durata,
        expiresAt: parsedDuration.expiresAt,
        operatorId: interaction.user.id,
        operatorTag: interaction.user.tag,
        createdAt: Date.now(),
    };
    try {
        (0, restrictionManager_1.setRestriction)(restriction);
        await (0, userNotification_1.sendUserNotification)(user, new discord_js_1.EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🚫 Restrizione applicata')
            .setDescription('È stata applicata una restrizione al tuo account.')
            .addFields({ name: 'Motivo', value: motivo }, { name: 'Durata', value: durata, inline: true }, { name: 'Operatore', value: interaction.user.tag, inline: true })
            .setTimestamp());
    }
    catch (error) {
        console.error('[RESTRICTION] Impossibile salvare la restrizione:', error);
        await interaction.reply({
            content: '❌ Si è verificato un errore durante il salvataggio della restrizione.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    /*
     * ==========================================================
     * RISPOSTA
     * ==========================================================
     */
    await interaction.reply({
        content: [
            '🔒 **RESTRIZIONE UTENTE CREATA**',
            '',
            `👤 **Utente:** ${user.tag}`,
            `🆔 **ID:** ${user.id}`,
            `📋 **Motivo:** ${motivo}`,
            `⏱️ **Durata:** ${durata}`,
            `📅 **Scadenza:** <t:${Math.floor(parsedDuration.expiresAt / 1000)}:F>`,
            `👮 **Operatore:** ${interaction.user.tag}`,
            '',
            '🚫 L\'utente verrà espulso automaticamente quando tenterà di entrare in un server in cui è presente il bot.',
            `🛡️ **Server principale:** potrà sempre entrare e rimanere nel server configurato come \`GUILD_ID\`.`,
        ].join('\n'),
        flags: discord_js_1.MessageFlags.Ephemeral,
    });
}
