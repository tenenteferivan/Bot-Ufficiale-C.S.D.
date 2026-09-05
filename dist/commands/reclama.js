"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const ticketManager_1 = require("../utils/ticketManager");
exports.data = new discord_js_1.SlashCommandBuilder().setName('reclama').setDescription('Prende in carico il ticket corrente.');
async function execute(interaction) {
    if (!interaction.guild || !interaction.channel || !interaction.member)
        return;
    if (!(0, ticketManager_1.isTicketGuild)(interaction.guild.id)) {
        await interaction.reply({ content: 'Il sistema ticket e disponibile solo nel server configurato.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const ticket = await (0, ticketManager_1.getTicket)(interaction.channel.id);
    const config = await (0, ticketManager_1.getTicketConfig)(interaction.guild.id);
    if (!ticket || !config) {
        await interaction.reply({ content: 'Questo canale non e un ticket attivo.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (!(0, ticketManager_1.isStaff)(interaction.member, config)) {
        await interaction.reply({ content: 'Solo lo staff configurato puo reclamare il ticket.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    await interaction.deferReply();
    const claimed = await (0, ticketManager_1.applyClaim)(interaction.channel, ticket, config, interaction.member);
    await interaction.editReply(claimed ? `Ticket preso in carico da ${interaction.user}.` : 'Il ticket e gia stato preso in carico da un altro membro dello staff.');
}
