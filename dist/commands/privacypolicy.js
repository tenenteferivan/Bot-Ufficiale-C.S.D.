"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('privacypolicy')
    .setDescription('Mostra la politica sulla privacy.');
async function execute(interaction) {
    await interaction.reply({
        content: 'Politica sulla privacy:',
        embeds: [
            new discord_js_1.EmbedBuilder()
                .setTitle('Politica sulla privacy')
                .setDescription('La politica sulla privacy relativa al bot CSD è disponibile qui:\n\n' +
                '🔗 [Privacy Policy](https://gist.github.com/tenenteferivan/01537056b6cb6129464a19393cf63285)')
                .setColor('Orange')
                .setTimestamp(),
        ],
    });
}
