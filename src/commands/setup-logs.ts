import { ChannelType, ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from 'discord.js';
import { saveLogConfig } from '../handlers/databasehandler';

export const data = new SlashCommandBuilder()
  .setName('setup-logs')
  .setDescription('Configura il canale per i log del server.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((option) =>
    option
      .setName('canale')
      .setDescription('Canale testuale per i log')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: '❌ Comando disponibile solo nei server.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Solo gli amministratori possono configurare i log.', flags: MessageFlags.Ephemeral });
    return;
  }

  const channel = interaction.options.getChannel('canale', true) as TextChannel;

  if (!channel.isTextBased()) {
    await interaction.reply({ content: '❌ Il canale deve essere un canale testuale.', flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    await saveLogConfig(interaction.guild.id, channel.id);
    await interaction.reply({
      content: `✅ Canale log configurato: ${channel}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('Errore durante la configurazione del log:', error);
    await interaction.reply({
      content: '❌ Errore durante la configurazione del canale log.',
      flags: MessageFlags.Ephemeral,
    });
  }
}
