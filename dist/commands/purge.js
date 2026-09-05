"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('purge')
    .setDescription('Elimina la quantità di messaggi specificata.')
    .addStringOption((option) => option
    .setName('messaggi')
    .setDescription('Numero di messaggi da eliminare')
    .setRequired(true));
async function execute(interaction) {
    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Questo comando è disponibile solo nei server.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const input = interaction.options
        .getString('messaggi', true)
        .trim();
    const amountMatch = input.match(/^(\d+)$/);
    if (!amountMatch) {
        await interaction.reply({
            content: '❌ Inserisci un numero valido.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const amount = parseInt(amountMatch[1], 10);
    if (amount < 1 || amount > 100) {
        await interaction.reply({
            content: '❌ Inserisci un numero compreso tra **1 e 100**.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    try {
        if (!interaction.channel ||
            !interaction.channel.isTextBased() ||
            !('bulkDelete' in interaction.channel)) {
            await interaction.reply({
                content: '❌ Questo comando non può essere utilizzato in questo canale.',
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        const messages = await interaction.channel.messages.fetch({
            limit: amount,
        });
        await interaction.channel.bulkDelete(messages);
        await interaction.reply({
            content: `✅ **${messages.size}** messaggi eliminati con successo.`,
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
    catch (error) {
        console.error('Errore durante l\'esecuzione di /purge:', error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: '❌ Si è verificato un errore durante l\'eliminazione dei messaggi.',
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
        }
        else {
            await interaction.reply({
                content: '❌ Si è verificato un errore durante l\'eliminazione dei messaggi.',
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
        }
    }
}
