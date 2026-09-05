"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aliases = exports.name = void 0;
exports.execute = execute;
const userRecord_1 = require("../utils/userRecord");
exports.name = 'userinfo';
exports.aliases = ['user', 'uinfo', 'registro'];
async function execute(message, args) {
    let targetUser = message.mentions.users.first() || null;
    if (!targetUser && args[0]) {
        const rawId = args[0].replace(/[^0-9]/g, '');
        if (rawId) {
            targetUser = await message.client.users.fetch(rawId).catch(() => null);
        }
    }
    if (!targetUser) {
        targetUser = message.author;
    }
    let member = null;
    if (message.guild) {
        member = await message.guild.members.fetch(targetUser.id).catch(() => null);
    }
    try {
        const embed = await (0, userRecord_1.createUserInfoEmbed)(targetUser, member, message.guild?.id);
        await message.reply({ embeds: [embed] });
    }
    catch (error) {
        console.error('Errore durante l\'esecuzione del comando con prefisso userinfo:', error);
        await message.reply('❌ Si è verificato un errore durante il recupero delle informazioni dell\'utente.');
    }
}
