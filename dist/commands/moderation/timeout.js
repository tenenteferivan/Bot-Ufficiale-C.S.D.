"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const timeParser_1 = require("../../utils/timeParser");
const permissions_1 = require("../../utils/permissions");
const modLogger_1 = require("../../utils/modLogger");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Mette un utente in isolamento temporaneo.')
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('utente').setDescription('L\'utente da isolare').setRequired(true))
    .addStringOption((opt) => opt.setName('motivo').setDescription('Il motivo dell\'isolamento').setRequired(true))
    .addStringOption((opt) => opt.setName('durata').setDescription('Durata (es. 10m, 1h, 1d)').setRequired(true));
async function execute(interaction) {
    if (!await (0, permissions_1.requireGuildPermission)(interaction, discord_js_1.PermissionFlagsBits.ModerateMembers))
        return;
    const targetUser = interaction.options.getUser('utente', true);
    const reason = interaction.options.getString('motivo', true);
    const durationStr = interaction.options.getString('durata', true);
    if (!interaction.guild)
        return;
    const durationMs = (0, timeParser_1.parseDuration)(durationStr);
    if (!durationMs) {
        await interaction.reply({ content: '⚠️ **Formato durata non valido!** Usa sintassi come: `10m`, `1h`, `1d`.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    try {
        const member = await interaction.guild.members.fetch(targetUser.id);
        await member.timeout(durationMs, reason);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0xE91E63)
            .setTitle('🔇 • SANZIONE APPLICATA: TIMEOUT')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields({ name: '👤 Utente Isolato', value: `<@${targetUser.id}>\n\`ID: ${targetUser.id}\``, inline: true }, { name: '🛡️ Moderatore', value: `<@${interaction.user.id}>`, inline: true }, { name: '⏱️ Durata Isolamento', value: `\`${durationStr}\``, inline: true }, { name: '📋 Motivo', value: `>>> ${reason}` })
            .setFooter({ text: `Eseguito da ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
        await (0, modLogger_1.sendModNotification)(interaction);
    }
    catch (error) {
        await interaction.reply({ content: '❌ **Impossibile applicare il timeout all\'utente.**', flags: discord_js_1.MessageFlags.Ephemeral });
    }
}
