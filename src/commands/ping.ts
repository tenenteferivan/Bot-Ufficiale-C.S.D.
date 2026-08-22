import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { createPingEmbed } from '../utils/pingEmbed';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Mostra la latenza corrente e il tempo di attività del bot.');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  const sent = await interaction.fetchReply();

  const botPing = (sent as any).createdTimestamp - interaction.createdTimestamp;
  const apiPing = interaction.client.ws.ping;
  const uptime = interaction.client.uptime ?? 0;

  const embed = createPingEmbed(botPing, apiPing, uptime);

  await interaction.editReply({ embeds: [embed] });
}