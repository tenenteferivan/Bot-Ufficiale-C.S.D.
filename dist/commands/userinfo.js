"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const userRecord_1 = require("../utils/userRecord");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Mostra le informazioni utente e il relativo Registro.')
    .addUserOption((option) => option
    .setName('utente')
    .setDescription('L\'utente di cui visualizzare le informazioni e il registro')
    .setRequired(false));
async function execute(interaction) {
    const targetUser = interaction.options.getUser('utente') || interaction.user;
    let member = interaction.options.getMember('utente');
    if (!member && interaction.guild) {
        member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    }
    try {
        const embed = await (0, userRecord_1.createUserInfoEmbed)(targetUser, member);
        await interaction.reply({ embeds: [embed] });
    }
    catch (error) {
        console.error('Errore durante l\'esecuzione di /userinfo:', error);
        await interaction.reply({
            content: '❌ Si è verificato un errore durante la generazione del registro utente.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
}
