"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const permissions_1 = require("../../utils/permissions");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('unban')
    .setDescription('Rimuove il ban di un utente tramite il suo ID.')
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.BanMembers)
    .addStringOption((opt) => opt.setName('utente').setDescription('ID dell\'utente da sbannare').setRequired(true))
    .addStringOption((opt) => opt.setName('motivo').setDescription('Motivo della revoca del ban').setRequired(true));
async function execute(interaction) {
    if (!await (0, permissions_1.requireGuildPermission)(interaction, discord_js_1.PermissionFlagsBits.BanMembers))
        return;
    const userId = interaction.options.getString('utente', true);
    const reason = interaction.options.getString('motivo', true);
    if (!interaction.guild)
        return;
    try {
        await interaction.guild.members.unban(userId, reason);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🔓 • REVOCA SANZIONE: UNBAN')
            .addFields({ name: '👤 ID Utente Sbannato', value: `\`${userId}\``, inline: true }, { name: '🛡️ Moderatore', value: `<@${interaction.user.id}>`, inline: true }, { name: '📋 Motivo Revoca', value: `>>> ${reason}` })
            .setFooter({ text: `Eseguito da ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    catch (error) {
        await interaction.reply({
            content: '❌ **Impossibile sbannare l\'utente.** Verificare che l\'ID fornito sia corretto e che l\'utente sia effettivamente bandito.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
}
