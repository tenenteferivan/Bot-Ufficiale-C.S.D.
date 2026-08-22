"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const databasehandler_1 = require("../../handlers/databasehandler");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bandisce un utente dal server in modo temporaneo o permanente.')
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.BanMembers)
    .addUserOption((opt) => opt.setName('utente').setDescription('L\'utente da bannare').setRequired(true))
    .addStringOption((opt) => opt.setName('motivo').setDescription('Il motivo del ban').setRequired(true))
    .addStringOption((opt) => opt.setName('durata').setDescription('Durata temporanea (es. 1d, 2h). Lascia vuoto per permanente').setRequired(false));
async function execute(interaction) {
    const targetUser = interaction.options.getUser('utente', true);
    const reason = interaction.options.getString('motivo', true);
    const durationStr = interaction.options.getString('durata') || 'Permanente';
    if (!interaction.guild)
        return;
    try {
        await interaction.guild.members.ban(targetUser.id, { reason });
        await (0, databasehandler_1.saveSanction)({
            userId: targetUser.id,
            moderatorId: interaction.user.id,
            guildId: interaction.guild.id,
            type: 'BAN',
            reason,
            duration: durationStr,
        });
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🔨 • SANZIONE APPLICATA: BAN')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields({ name: '👤 Utente Colpito', value: `<@${targetUser.id}>\n\`ID: ${targetUser.id}\``, inline: true }, { name: '🛡️ Moderatore', value: `<@${interaction.user.id}>`, inline: true }, { name: '⏱️ Durata', value: `\`${durationStr}\``, inline: true }, { name: '📋 Motivo della Sanzione', value: `>>> ${reason}` })
            .setFooter({ text: `Eseguito da ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    catch (error) {
        await interaction.reply({
            content: '❌ **Errore nell\'esecuzione del ban!** Verifica che il bot abbia i permessi necessari e che il ruoli dell\'utente siano inferiori a quelli del bot.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
}
