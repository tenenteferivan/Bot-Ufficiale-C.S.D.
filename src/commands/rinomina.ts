import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { getTicket, getTicketConfig, isStaff, isTicketGuild } from '../utils/ticketManager';

export const data = new SlashCommandBuilder()
  .setName('rinomina')
  .setDescription('Rinomina il ticket corrente.')
  .addStringOption((option) => option.setName('nuovo_nome').setDescription('Suffisso o nuovo nome del ticket').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild || !interaction.channel || !interaction.member || !('setName' in interaction.channel)) return;
  if (!isTicketGuild(interaction.guild.id)) {
    await interaction.reply({ content: 'Il sistema ticket e disponibile solo nel server configurato.', flags: MessageFlags.Ephemeral });
    return;
  }
  const ticket = await getTicket(interaction.channel.id);
  const config = await getTicketConfig(interaction.guild.id);
  if (!ticket || !config) {
    await interaction.reply({ content: '❌ Questo canale non è un ticket attivo.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (!isStaff(interaction.member as any, config)) {
    await interaction.reply({ content: '❌ Solo lo staff configurato può rinominare il ticket.', flags: MessageFlags.Ephemeral });
    return;
  }

  const input = interaction.options.getString('nuovo_nome', true).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  if (!input) {
    await interaction.reply({ content: '❌ Il nome indicato non è valido.', flags: MessageFlags.Ephemeral });
    return;
  }
  const category = ticket.category;
  const prefix = `ticket-${String(ticket.ticketNumber).padStart(4, '0')}-${category}`;
  await interaction.channel.setName(`${prefix}-${input}`.slice(0, 100), 'Rinominazione ticket');
  await interaction.reply({ content: `✅ Ticket rinominato in **${interaction.channel.name}**.` });
}
