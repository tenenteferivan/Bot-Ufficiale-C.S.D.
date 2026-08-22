import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { getTicket, getTicketConfig, isStaff, releaseClaim } from '../utils/ticketManager';

export const data = new SlashCommandBuilder().setName('rilascia').setDescription('Rilascia il claim del ticket corrente.');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild || !interaction.channel || !interaction.member) return;
  const ticket = await getTicket(interaction.channel.id);
  const config = await getTicketConfig(interaction.guild.id);
  if (!ticket || !config) {
    await interaction.reply({ content: '❌ Questo canale non è un ticket attivo.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (!isStaff(interaction.member as any, config)) {
    await interaction.reply({ content: '❌ Solo lo staff configurato può rilasciare il ticket.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (!ticket.claimedBy) {
    await interaction.reply({ content: 'ℹ️ Questo ticket non è reclamato.', flags: MessageFlags.Ephemeral });
    return;
  }
  await releaseClaim(interaction.channel, ticket, config);
  await interaction.reply({ content: '↩️ Il ticket è stato rilasciato ed è nuovamente visibile allo staff.' });
}
