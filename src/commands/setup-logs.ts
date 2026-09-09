import { ChannelType, ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from 'discord.js';
import { saveLogConfig } from '../handlers/databasehandler';

export const data = new SlashCommandBuilder()
  .setName('setup-logs')
  .setDescription('Configura il canale per i log del server.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild)
  .addChannelOption((option) =>
    option
      .setName('canale')
      .setDescription('Canale testuale per i log')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: '❌ Comando disponibile solo nei server.', flags: MessageFlags.Ephemeral });
    return;
  }
  const canManageLogs = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
  if (!canManageLogs) {
    await interaction.reply({ content: '❌ Sono necessari i permessi Amministratore o Gestisci Server.', flags: MessageFlags.Ephemeral });
    return;
  }

  const channel = interaction.options.getChannel('canale') as TextChannel | null ??
    (interaction.channel?.isTextBased() ? interaction.channel as TextChannel : null);

  if (!channel || channel.guildId !== interaction.guild.id || !channel.isTextBased() || !('send' in channel)) {
    await interaction.reply({ content: '❌ Il canale corrente o selezionato deve essere un canale testuale del server.', flags: MessageFlags.Ephemeral });
    return;
  }

  const botPermissions = channel.permissionsFor(interaction.client.user);
  if (!botPermissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
    await interaction.reply({ content: '❌ Il bot non può visualizzare o inviare messaggi nel canale selezionato.', flags: MessageFlags.Ephemeral });
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
