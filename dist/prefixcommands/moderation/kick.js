"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.name = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const databasehandler_1 = require("../../handlers/databasehandler");
exports.name = 'kick';
async function execute(message, args) {
    if (!message.member?.permissions.has(discord_js_1.PermissionFlagsBits.KickMembers)) {
        await message.reply('❌ **Non disponi dei permessi necessari per espellere utenti.**');
        return;
    }
    const target = message.mentions.members?.first();
    if (!target || args.length < 2) {
        await message.reply('⚠️ **Sintassi errata!** Usa: `?kick @utente <motivo>`');
        return;
    }
    const reason = args.slice(1).join(' ');
    try {
        await target.kick(reason);
        await (0, databasehandler_1.saveSanction)({
            userId: target.id,
            moderatorId: message.author.id,
            guildId: message.guild.id,
            type: 'KICK',
            reason,
        });
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('🚪 • SANZIONE APPLICATA: KICK')
            .setThumbnail(target.user.displayAvatarURL())
            .addFields({ name: '👤 Utente Espulso', value: `<@${target.id}>\n\`ID: ${target.id}\``, inline: true }, { name: '🛡️ Moderatore', value: `<@${message.author.id}>`, inline: true }, { name: '📋 Motivo dell\'Espulsione', value: `>>> ${reason}` })
            .setFooter({ text: `Eseguito da ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();
        await message.reply({ embeds: [embed] });
    }
    catch (err) {
        await message.reply('❌ **Impossibile espellere l\'utente.** Controlla la gerarchia dei ruoli.');
    }
}
