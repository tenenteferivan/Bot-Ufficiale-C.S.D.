"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.name = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const userNotification_1 = require("../../utils/userNotification");
exports.name = 'warn';
async function execute(message, args) {
    if (!message.member?.permissions.has(discord_js_1.PermissionFlagsBits.ModerateMembers)) {
        await message.reply('Non disponi dei permessi necessari.');
        return;
    }
    const target = message.mentions.users.first();
    const reason = args.slice(1).join(' ');
    if (!target || !reason) {
        await message.reply('Sintassi: !warn @utente <motivo>');
        return;
    }
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('⚠️ Hai ricevuto un avvertimento')
        .setDescription(`Motivo: ${reason}`)
        .setTimestamp();
    await message.reply(`Avvertimento inviato a ${target}.`);
    await (0, userNotification_1.sendUserNotification)(target, embed);
}
