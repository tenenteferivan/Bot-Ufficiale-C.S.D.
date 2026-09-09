"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const databasehandler_1 = require("../handlers/databasehandler");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('setup-logs')
    .setDescription('Configura il canale per i log del server.')
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator | discord_js_1.PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) => option
    .setName('canale')
    .setDescription('Canale testuale per i log')
    .addChannelTypes(discord_js_1.ChannelType.GuildText)
    .setRequired(false));
async function execute(interaction) {
    if (!interaction.guild) {
        await interaction.reply({ content: '❌ Comando disponibile solo nei server.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const canManageLogs = interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.Administrator) ||
        interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.ManageGuild);
    if (!canManageLogs) {
        await interaction.reply({ content: '❌ Sono necessari i permessi Amministratore o Gestisci Server.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const channel = interaction.options.getChannel('canale') ??
        (interaction.channel?.isTextBased() ? interaction.channel : null);
    if (!channel || channel.guildId !== interaction.guild.id || !channel.isTextBased() || !('send' in channel)) {
        await interaction.reply({ content: '❌ Il canale corrente o selezionato deve essere un canale testuale del server.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const botPermissions = channel.permissionsFor(interaction.client.user);
    if (!botPermissions?.has([discord_js_1.PermissionFlagsBits.ViewChannel, discord_js_1.PermissionFlagsBits.SendMessages])) {
        await interaction.reply({ content: '❌ Il bot non può visualizzare o inviare messaggi nel canale selezionato.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    try {
        await (0, databasehandler_1.saveLogConfig)(interaction.guild.id, channel.id);
        await interaction.reply({
            content: `✅ Canale log configurato: ${channel}`,
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
    catch (error) {
        console.error('Errore durante la configurazione del log:', error);
        await interaction.reply({
            content: '❌ Errore durante la configurazione del canale log.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
}
