"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const databasehandler_1 = require("../handlers/databasehandler");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('pulisci')
    .setDescription('Gestisce la pulizia del registro.')
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator)
    .addSubcommandGroup((group) => group
    .setName('registro')
    .setDescription('Gestisce il registro delle sanzioni.')
    .addSubcommand((subcommand) => subcommand
    .setName('utente')
    .setDescription('Elimina tutte le sanzioni registrate per un utente.')
    .addUserOption((option) => option
    .setName('utente')
    .setDescription('L\'utente da rimuovere dal registro.')
    .setRequired(true))));
async function execute(interaction) {
    if (!interaction.guild)
        return;
    if (!interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.Administrator)) {
        await interaction.reply({
            content: '❌ Solo gli amministratori possono pulire il registro.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const targetUser = interaction.options.getUser('utente', true);
    try {
        const deletedCount = await (0, databasehandler_1.deleteSanctions)(targetUser.id, interaction.guild.id);
        await interaction.reply({
            content: deletedCount > 0
                ? `✅ Eliminati ${deletedCount} record dal registro di ${targetUser}.`
                : `📋 Nessun record trovato nel registro di ${targetUser}.`,
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
    catch (error) {
        console.error('Errore durante la pulizia del registro:', error);
        await interaction.reply({
            content: '❌ Impossibile pulire il registro dell\'utente.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
}
