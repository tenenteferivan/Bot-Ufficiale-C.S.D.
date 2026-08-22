"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const ticketManager_1 = require("../utils/ticketManager");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('rinomina')
    .setDescription('Rinomina il ticket corrente.')
    .addStringOption((option) => option.setName('nuovo_nome').setDescription('Suffisso o nuovo nome del ticket').setRequired(true));
async function execute(interaction) {
    if (!interaction.guild || !interaction.channel || !interaction.member || !('setName' in interaction.channel))
        return;
    const ticket = await (0, ticketManager_1.getTicket)(interaction.channel.id);
    const config = await (0, ticketManager_1.getTicketConfig)(interaction.guild.id);
    if (!ticket || !config) {
        await interaction.reply({ content: '❌ Questo canale non è un ticket attivo.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (!(0, ticketManager_1.isStaff)(interaction.member, config)) {
        await interaction.reply({ content: '❌ Solo lo staff configurato può rinominare il ticket.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const input = interaction.options.getString('nuovo_nome', true).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    if (!input) {
        await interaction.reply({ content: '❌ Il nome indicato non è valido.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const category = ticket.category;
    const prefix = `ticket-${String(ticket.ticketNumber).padStart(4, '0')}-${category}`;
    await interaction.channel.setName(`${prefix}-${input}`.slice(0, 100), 'Rinominazione ticket');
    await interaction.reply({ content: `✅ Ticket rinominato in **${interaction.channel.name}**.` });
}
