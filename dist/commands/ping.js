"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const pingEmbed_1 = require("../utils/pingEmbed");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('ping')
    .setDescription('Mostra la latenza corrente e il tempo di attività del bot.');
async function execute(interaction) {
    await interaction.deferReply();
    const sent = await interaction.fetchReply();
    const botPing = sent.createdTimestamp - interaction.createdTimestamp;
    const apiPing = interaction.client.ws.ping;
    const uptime = interaction.client.uptime ?? 0;
    const embed = (0, pingEmbed_1.createPingEmbed)(botPing, apiPing, uptime);
    await interaction.editReply({ embeds: [embed] });
}
