"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const partnerships_1 = require("../utils/partnerships");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('setup-partnership')
    .setDescription('Configura il canale e il ruolo per le partnership del server.')
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator)
    .addChannelOption((option) => option
    .setName('canale')
    .setDescription('Canale testuale in cui pubblicare le partnership')
    .addChannelTypes(discord_js_1.ChannelType.GuildText)
    .setRequired(true))
    .addRoleOption((option) => option
    .setName('ruolo')
    .setDescription('Ruolo autorizzato a gestire e pubblicare partnership')
    .setRequired(true));
async function execute(interaction) {
    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Questo comando è disponibile solo all\'interno di un server.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    if (!interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.Administrator)) {
        await interaction.reply({
            content: '❌ Solo gli amministratori possono configurare le partnership.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const channel = interaction.options.getChannel('canale', true);
    const role = interaction.options.getRole('ruolo', true);
    if (channel.type !== discord_js_1.ChannelType.GuildText) {
        await interaction.reply({
            content: '❌ Il canale selezionato deve essere un canale testuale del server.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const botPermissions = channel.permissionsFor(interaction.client.user);
    if (!botPermissions?.has([discord_js_1.PermissionFlagsBits.ViewChannel, discord_js_1.PermissionFlagsBits.SendMessages])) {
        await interaction.reply({ content: '❌ Il bot non può visualizzare o inviare messaggi nel canale selezionato.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    try {
        await (0, partnerships_1.savePartnershipConfig)(interaction.guild.id, channel.id, role.id);
        await interaction.reply({
            content: `✅ Sistema partnership configurato con successo!\n📢 **Canale:** ${channel}\n🛡️ **Ruolo autorizzato:** ${role}`,
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
    catch (error) {
        console.error('Errore durante la configurazione delle partnership:', error);
        await interaction.reply({
            content: '❌ Si è verificato un errore durante il salvataggio della configurazione nel database.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
}
