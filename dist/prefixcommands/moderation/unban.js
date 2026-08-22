"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.name = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const databasehandler_1 = require("../../handlers/databasehandler");
exports.name = 'unban';
async function execute(message, args) {
    if (!message.member?.permissions.has(discord_js_1.PermissionFlagsBits.BanMembers)) {
        await message.reply('❌ **Non disponi dei permessi necessari.**');
        return;
    }
    const userId = args[0];
    const reason = args.slice(1).join(' ');
    if (!userId || !reason) {
        await message.reply('⚠️ **Sintassi errata!** Usa: `?unban <ID_Utente> <motivo>`');
        return;
    }
    try {
        await message.guild?.members.unban(userId, reason);
        await (0, databasehandler_1.saveSanction)({
            userId,
            moderatorId: message.author.id,
            guildId: message.guild.id,
            type: 'UNBAN',
            reason,
        });
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🔓 • REVOCA SANZIONE: UNBAN')
            .addFields({ name: '👤 ID Utente Sbannato', value: `\`${userId}\``, inline: true }, { name: '🛡️ Moderatore', value: `<@${message.author.id}>`, inline: true }, { name: '📋 Motivo Revoca', value: `>>> ${reason}` })
            .setFooter({ text: `Eseguito da ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();
        await message.reply({ embeds: [embed] });
    }
    catch (err) {
        await message.reply('❌ **Impossibile revocare il ban.** Controlla l\'ID dell\'utente.');
    }
}
