"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const userRecord_1 = require("../utils/userRecord");
const databasehandler_1 = require("../handlers/databasehandler");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('segnalazione-server-setup')
    .setDescription('Configura il canale per le segnalazioni dei server.')
    .addChannelOption((option) => option
    .setName('canale')
    .setDescription('Canale dove verranno pubblicate le segnalazioni dei server.')
    .addChannelTypes(discord_js_1.ChannelType.GuildText, discord_js_1.ChannelType.GuildAnnouncement)
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
    try {
        await (0, databasehandler_1.saveServerReportConfig)(interaction.guild.id, channel.id);
        await interaction.reply({
            content: `✅ Il canale delle segnalazioni server è stato configurato su ${channel}.`,
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
    catch (error) {
        console.error('Errore durante la configurazione del canale delle segnalazioni server:', error);
        await interaction.reply({
            content: '❌ Si è verificato un errore durante la configurazione del canale.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
}
