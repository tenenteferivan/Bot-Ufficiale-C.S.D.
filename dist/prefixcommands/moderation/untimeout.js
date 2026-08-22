"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aliases = exports.name = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const databasehandler_1 = require("../../handlers/databasehandler");
exports.name = 'untimeout';
exports.aliases = ['rto'];
async function execute(message, args) {
    if (!message.member?.permissions.has(discord_js_1.PermissionFlagsBits.ModerateMembers)) {
        await message.reply('❌ **Non disponi dei permessi necessari.**');
        return;
    }
    const target = message.mentions.members?.first();
    if (!target || args.length < 2) {
        await message.reply('⚠️ **Sintassi errata!** Usa: `?untimeout @utente <motivo>`');
        return;
    }
    const reason = args.slice(1).join(' ');
    try {
        await target.timeout(null, reason);
        await (0, databasehandler_1.saveSanction)({
            userId: target.id,
            moderatorId: message.author.id,
            guildId: message.guild.id,
            type: 'UNTIMEOUT',
            reason,
        });
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🔊 • REVOCA SANZIONE: UNTIMEOUT')
            .setThumbnail(target.user.displayAvatarURL())
            .addFields({ name: '👤 Utente Riabilitato', value: `<@${target.id}>\n\`ID: ${target.id}\``, inline: true }, { name: '🛡️ Moderatore', value: `<@${message.author.id}>`, inline: true }, { name: '📋 Motivo della Revoca', value: `>>> ${reason}` })
            .setFooter({ text: `Eseguito da ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();
        await message.reply({ embeds: [embed] });
    }
    catch (err) {
        await message.reply('❌ **Si è verificato un errore durante la rimozione del timeout.**');
    }
}
