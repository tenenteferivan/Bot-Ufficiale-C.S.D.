import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  Role,
  SlashCommandBuilder,
  TextChannel,
} from 'discord.js';
import { savePartnershipConfig } from '../utils/partnerships';

export const data = new SlashCommandBuilder()
  .setName('setup-partnership')
  .setDescription('Configura il canale e il ruolo per le partnership del server.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((option) =>
    option
      .setName('canale')
      .setDescription('Canale testuale in cui pubblicare le partnership')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .addRoleOption((option) =>
    option
      .setName('ruolo')
      .setDescription('Ruolo autorizzato a gestire e pubblicare partnership')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ Questo comando è disponibile solo all\'interno di un server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: '❌ Solo gli amministratori possono configurare le partnership.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.options.getChannel('canale', true) as TextChannel;
  const role = interaction.options.getRole('ruolo', true) as Role;

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: '❌ Il canale selezionato deve essere un canale testuale del server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await savePartnershipConfig(interaction.guild.id, channel.id, role.id);
    await interaction.reply({
      content: `✅ Sistema partnership configurato con successo!\n📢 **Canale:** ${channel}\n🛡️ **Ruolo autorizzato:** ${role}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('Errore durante la configurazione delle partnership:', error);
    await interaction.reply({
      content: '❌ Si è verificato un errore durante il salvataggio della configurazione nel database.',
      flags: MessageFlags.Ephemeral,
    });
  }
}
