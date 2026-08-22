"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aliases = exports.name = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
exports.name = 'purge';
exports.aliases = ['prune', 'clear'];
async function execute(message, args) {
    if (!message.member?.permissions.has(discord_js_1.PermissionFlagsBits.ManageMessages)) {
        await message.reply('❌ **Non disponi dei permessi necessari (Manage Messages).**');
        return;
    }
    const amountArg = args[0];
    if (!amountArg) {
        await message.reply('⚠️ **Sintassi errata!** Usa: `?purge <numero>`');
        return;
    }
    const requested = parseInt(amountArg, 10);
    if (isNaN(requested)) {
        await message.reply('⚠️ **Inserisci un numero valido tra 1 e 100.**');
        return;
    }
    // Discord bulkDelete supports 1-100 messages; enforce bounds
    const amount = Math.min(Math.max(requested, 1), 100);
    if (!message.channel || !(message.channel instanceof discord_js_1.TextChannel)) {
        await message.reply('❌ **Questo comando può essere usato solo in canali di testo del server.**');
        return;
    }
    try {
        const deleted = await message.channel.bulkDelete(amount, true);
        const reply = await message.channel.send(`✅ Eliminati ${deleted.size} messaggi.`);
        setTimeout(() => reply.delete().catch(() => { }), 5000);
    }
    catch (err) {
        console.error('Error executing purge:', err);
        await message.channel.send("❌ **Errore durante l'eliminazione dei messaggi.** Assicurati che i messaggi non siano più vecchi di 14 giorni.");
    }
}
