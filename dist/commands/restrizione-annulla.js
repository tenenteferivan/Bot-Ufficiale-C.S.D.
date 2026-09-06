"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const restrictionManager_1 = require("../utils/restrictionManager");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('restrizione-annulla')
    .setDescription('Annulla la restrizione di un utente.')
    .addUserOption((option) => option
    .setName('utente')
    .setDescription('Utente a cui annullare la restrizione.')
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
     * SERVER
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
     * DIRIGENZA
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
     * UTENTE
     * ==========================================================
     */
    const user = interaction.options.getUser('utente', true);
    /*
     * ==========================================================
     * VERIFICA
     * ==========================================================
     */
    const restriction = (0, restrictionManager_1.getRestriction)(user.id);
    if (!restriction) {
        await interaction.reply({
            content: [
                'ℹ️ **Nessuna restrizione trovata.**',
                '',
                `👤 **Utente:** ${user.tag}`,
                `🆔 **ID:** ${user.id}`,
            ].join('\n'),
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    /*
     * ==========================================================
     * RIMOZIONE
     * ==========================================================
     */
    try {
        const removed = (0, restrictionManager_1.removeRestriction)(user.id);
        if (!removed) {
            await interaction.reply({
                content: '⚠️ La restrizione non è più presente nel database.',
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
    }
    catch (error) {
        console.error('[RESTRICTION] Impossibile rimuovere la restrizione:', error);
        await interaction.reply({
            content: '❌ Si è verificato un errore durante l\'annullamento della restrizione.',
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
            '🔓 **RESTRIZIONE ANNULLATA**',
            '',
            `👤 **Utente:** ${user.tag}`,
            `🆔 **ID:** ${user.id}`,
            `📋 **Motivo originale:** ${restriction.motivo}`,
            `⏱️ **Durata originale:** ${restriction.durata}`,
            `👮 **Annullata da:** ${interaction.user.tag}`,
            '',
            '✅ L\'utente potrà nuovamente entrare nei server in cui è presente il bot.',
        ].join('\n'),
        flags: discord_js_1.MessageFlags.Ephemeral,
    });
}
