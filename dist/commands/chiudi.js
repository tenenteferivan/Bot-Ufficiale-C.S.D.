"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const ticketManager_1 = require("../utils/ticketManager");
exports.data = new discord_js_1.SlashCommandBuilder().setName('chiudi').setDescription('Avvia la chiusura del ticket corrente.');
async function execute(interaction) {
    if (!interaction.guild || !interaction.channel || !interaction.member)
        return;
    const ticket = await (0, ticketManager_1.getTicket)(interaction.channel.id);
    const config = await (0, ticketManager_1.getTicketConfig)(interaction.guild.id);
    if (!ticket || !config) {
        await interaction.reply({ content: '❌ Questo canale non è un ticket attivo.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const member = interaction.member;
    if (interaction.user.id !== ticket.openerId && !(0, ticketManager_1.isStaff)(member, config)) {
        await interaction.reply({ content: '❌ Solo il richiedente o lo staff può chiudere il ticket.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    await interaction.showModal((0, ticketManager_1.closeModal)());
}
