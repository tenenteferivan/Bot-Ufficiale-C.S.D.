
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('privacypolicy')
  .setDescription('Mostra la politica sulla privacy.');

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.reply({
    content: 'Politica sulla privacy:',
    embeds: [
      new EmbedBuilder()
        .setTitle('Politica sulla privacy')
        .setDescription(
          'La politica sulla privacy relativa al bot CSD è disponibile qui:\n\n' +
          '🔗 [Privacy Policy](https://gist.github.com/tenenteferivan/01537056b6cb6129464a19393cf63285)'
        )
        .setColor('Orange')
        .setTimestamp(),
    ],
  });
}

