"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const permissions_1 = require("../../utils/permissions");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Rimuove l\'isolamento da un utente.')
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('utente').setDescription('L\'utente da riabilitare').setRequired(true))
    .addStringOption((opt) => opt.setName('motivo').setDescription('Motivo della revoca').setRequired(true));
async function execute(interaction) {
    if (!await (0, permissions_1.requireGuildPermission)(interaction, discord_js_1.PermissionFlagsBits.ModerateMembers))
        return;
    const targetUser = interaction.options.getUser('utente', true);
    const reason = interaction.options.getString('motivo', true);
    if (!interaction.guild)
        return;
    try {
        const member = await interaction.guild.members.fetch(targetUser.id);
        await member.timeout(null, reason);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🔊 • REVOCA SANZIONE: UNTIMEOUT')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields({ name: '👤 Utente Riabilitato', value: `<@${targetUser.id}>\n\`ID: ${targetUser.id}\``, inline: true }, { name: '🛡️ Moderatore', value: `<@${interaction.user.id}>`, inline: true }, { name: '📋 Motivo della Revoca', value: `>>> ${reason}` })
            .setFooter({ text: `Eseguito da ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    catch (error) {
        await interaction.reply({ content: '❌ **Impossibile rimuovere il timeout.**', flags: discord_js_1.MessageFlags.Ephemeral });
    }
}
