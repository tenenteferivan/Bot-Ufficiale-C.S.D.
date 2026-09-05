"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aliases = exports.name = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const timeParser_1 = require("../../utils/timeParser");
exports.name = 'timeout';
exports.aliases = ['to'];
async function execute(message, args) {
    if (!message.member?.permissions.has(discord_js_1.PermissionFlagsBits.ModerateMembers)) {
        await message.reply('❌ **Non disponi dei permessi necessari.**');
        return;
    }
    const target = message.mentions.members?.first();
    if (!target || args.length < 3) {
        await message.reply('⚠️ **Sintassi errata!** Usa: `?timeout @utente <durata> <motivo>`');
        return;
    }
    const durationStr = args[1];
    const reason = args.slice(2).join(' ');
    const durationMs = (0, timeParser_1.parseDuration)(durationStr);
    if (!durationMs) {
        await message.reply('⚠️ **Formato durata non valido.** Sintassi accettata: `10m`, `1h`, `1d`.');
        return;
    }
    try {
        await target.timeout(durationMs, reason);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0xE91E63)
            .setTitle('🔇 • SANZIONE APPLICATA: TIMEOUT')
            .setThumbnail(target.user.displayAvatarURL())
            .addFields({ name: '👤 Utente Isolato', value: `<@${target.id}>\n\`ID: ${target.id}\``, inline: true }, { name: '🛡️ Moderatore', value: `<@${message.author.id}>`, inline: true }, { name: '⏱️ Durata', value: `\`${durationStr}\``, inline: true }, { name: '📋 Motivo', value: `>>> ${reason}` })
            .setFooter({ text: `Eseguito da ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();
        await message.reply({ embeds: [embed] });
    }
    catch (err) {
        await message.reply('❌ **Si è verificato un errore durante l\'applicazione del timeout.**');
    }
}
