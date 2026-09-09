"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const userRecord_1 = require("../utils/userRecord");
const databasehandler_1 = require("../handlers/databasehandler");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('registra-sanzione-setup')
    .setDescription('Configura il canale per la pubblicazione delle sanzioni disciplinari.')
    .addChannelOption((option) => option
    .setName('canale')
    .setDescription('Canale dove verranno pubblicate le sanzioni disciplinari.')
    .addChannelTypes(discord_js_1.ChannelType.GuildText, discord_js_1.ChannelType.GuildAnnouncement)
    .setRequired(true));
async function execute(interaction) {
    // ============================================================
    // VERIFICA OPERATORE
    // ============================================================
    if (!(0, userRecord_1.isOperator)(interaction.member)) {
        await interaction.reply({
            content: '❌ Non disponi del ruolo o delle autorizzazioni necessarie per configurare il canale delle sanzioni.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    // ============================================================
    // VERIFICA SERVER
    // ============================================================
    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Questo comando è disponibile solo nei server.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    // ============================================================
    // VERIFICA GUILD_ID AUTORIZZATA
    // ============================================================
    const configuredGuildId = process.env.GUILD_ID;
    if (!configuredGuildId) {
        console.error('[SANZIONE SETUP] GUILD_ID non configurato nel file .env.');
        await interaction.reply({
            content: '❌ Il server autorizzato non è stato configurato correttamente.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    if (interaction.guild.id !== configuredGuildId) {
        await interaction.reply({
            content: '❌ Questo comando può essere utilizzato solo nel server autorizzato.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    // ============================================================
    // RECUPERA CANALE
    // ============================================================
    const channel = interaction.options.getChannel('canale', true);
    const configuredChannel = channel;
    if (configuredChannel.guildId !== interaction.guild.id || !configuredChannel.isTextBased() || typeof configuredChannel.send !== 'function') {
        await interaction.reply({ content: '❌ Il canale deve essere testuale e appartenere a questo server.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const botPermissions = configuredChannel.permissionsFor(interaction.client.user);
    if (!botPermissions?.has([discord_js_1.PermissionFlagsBits.ViewChannel, discord_js_1.PermissionFlagsBits.SendMessages])) {
        await interaction.reply({ content: '❌ Il bot non può visualizzare o inviare messaggi nel canale selezionato.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    // ============================================================
    // SALVA CONFIGURAZIONE
    // ============================================================
    try {
        await (0, databasehandler_1.saveSanctionConfig)(interaction.guild.id, channel.id);
        await interaction.reply({
            content: `✅ Il canale per le sanzioni disciplinari è stato configurato correttamente su ${channel}.`,
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        console.log(`[SANZIONE SETUP] Canale configurato: ` +
            `Guild ${interaction.guild.id} | ` +
            `Channel ${channel.id}`);
    }
    catch (error) {
        console.error('[SANZIONE SETUP] Errore durante la configurazione del canale:', error);
        await interaction.reply({
            content: '❌ Si è verificato un errore durante la configurazione del canale delle sanzioni.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
}
