"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('tos')
    .setDescription('Mostra i termini di servizio.');
async function execute(interaction) {
    await interaction.reply({
        content: 'Termini di servizio:',
        embeds: [
            new discord_js_1.EmbedBuilder()
                .setTitle('Termini di servizio')
                .setDescription('I termini di servizio per l\'utilizzo del bot CSD sono disponibili qui:\n\n' +
                '🔗 [Termini di servizio](https://gist.github.com/tenenteferivan/7331d9ad4e12df97ce00ec78bd21534a)')
                .setColor('Orange')
                .setTimestamp(),
        ],
    });
}
