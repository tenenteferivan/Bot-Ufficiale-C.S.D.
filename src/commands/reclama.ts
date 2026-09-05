import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { applyClaim, getTicket, getTicketConfig, isStaff, isTicketGuild } from '../utils/ticketManager';

export const data = new SlashCommandBuilder().setName('reclama').setDescription('Prende in carico il ticket corrente.');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild || !interaction.channel || !interaction.member) return;
  if (!isTicketGuild(interaction.guild.id)) {
    await interaction.reply({ content: 'Il sistema ticket e disponibile solo nel server configurato.', flags: MessageFlags.Ephemeral });
    return;
  }
  const ticket = await getTicket(interaction.channel.id);
  const config = await getTicketConfig(interaction.guild.id);
  if (!ticket || !config) {
    await interaction.reply({ content: 'Questo canale non e un ticket attivo.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (!isStaff(interaction.member as any, config)) {
    await interaction.reply({ content: 'Solo lo staff configurato puo reclamare il ticket.', flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.deferReply();
  const claimed = await applyClaim(interaction.channel, ticket, config, interaction.member as any);
  await interaction.editReply(claimed ? `Ticket preso in carico da ${interaction.user}.` : 'Il ticket e gia stato preso in carico da un altro membro dello staff.');
}
