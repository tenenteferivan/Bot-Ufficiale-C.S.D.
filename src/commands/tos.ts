
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('tos')
  .setDescription('Mostra i termini di servizio.');

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.reply({
    content: 'Termini di servizio:',
    embeds: [
      new EmbedBuilder()
        .setTitle('Termini di servizio')
        .setDescription(
          'I termini di servizio per l\'utilizzo del bot CSD sono disponibili qui:\n\n' +
          '🔗 [Termini di servizio](https://gist.github.com/tenenteferivan/7331d9ad4e12df97ce00ec78bd21534a)'
        )
        .setColor('Orange')
        .setTimestamp(),
    ],
  });
}

