import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { applyClaim, getTicket, getTicketConfig, isStaff } from '../utils/ticketManager';

export const data = new SlashCommandBuilder().setName('reclama').setDescription('Prende in carico il ticket corrente.');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild || !interaction.channel || !interaction.member) return;
  const ticket = await getTicket(interaction.channel.id);
  const config = await getTicketConfig(interaction.guild.id);
  const member = interaction.member;
  if (!ticket || !config) {
    await interaction.reply({ content: '❌ Questo canale non è un ticket attivo.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (!isStaff(member as any, config)) {
    await interaction.reply({ content: '❌ Solo lo staff configurato può reclamare il ticket.', flags: MessageFlags.Ephemeral });
    return;
  }
  await applyClaim(interaction.channel, ticket, config, member as any);
  await interaction.reply({ content: `🙋 Ticket preso in carico da ${interaction.user}.` });
}
