"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const databasehandler_1 = require("../../handlers/databasehandler");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('kick')
    .setDescription('Espelle un utente dal server.')
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.KickMembers)
    .addUserOption((opt) => opt.setName('utente').setDescription('L\'utente da espellere').setRequired(true))
    .addStringOption((opt) => opt.setName('motivo').setDescription('Il motivo dell\'espulsione').setRequired(true));
async function execute(interaction) {
    const targetUser = interaction.options.getUser('utente', true);
    const reason = interaction.options.getString('motivo', true);
    if (!interaction.guild)
        return;
    try {
        const member = await interaction.guild.members.fetch(targetUser.id);
        await member.kick(reason);
        await (0, databasehandler_1.saveSanction)({
            userId: targetUser.id,
            moderatorId: interaction.user.id,
            guildId: interaction.guild.id,
            type: 'KICK',
            reason,
        });
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('🚪 • SANZIONE APPLICATA: KICK')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields({ name: '👤 Utente Espulso', value: `<@${targetUser.id}>\n\`ID: ${targetUser.id}\``, inline: true }, { name: '🛡️ Moderatore', value: `<@${interaction.user.id}>`, inline: true }, { name: '📋 Motivo dell\'Espulsione', value: `>>> ${reason}` })
            .setFooter({ text: `Eseguito da ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    catch (error) {
        await interaction.reply({ content: '❌ **Impossibile espellere l\'utente.** Controlla la gerarchia dei ruoli.', flags: discord_js_1.MessageFlags.Ephemeral });
    }
}
