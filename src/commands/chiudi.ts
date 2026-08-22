import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { closeModal, getTicket, getTicketConfig, isStaff } from '../utils/ticketManager';

export const data = new SlashCommandBuilder().setName('chiudi').setDescription('Avvia la chiusura del ticket corrente.');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild || !interaction.channel || !interaction.member) return;
  const ticket = await getTicket(interaction.channel.id);
  const config = await getTicketConfig(interaction.guild.id);
  if (!ticket || !config) {
    await interaction.reply({ content: '❌ Questo canale non è un ticket attivo.', flags: MessageFlags.Ephemeral });
    return;
  }
  const member = interaction.member as any;
  if (interaction.user.id !== ticket.openerId && !isStaff(member, config)) {
    await interaction.reply({ content: '❌ Solo il richiedente o lo staff può chiudere il ticket.', flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.showModal(closeModal());
}
