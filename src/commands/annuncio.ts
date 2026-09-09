import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import {
  buildAnnouncementEmbed,
  distributeAnnouncement,
} from '../utils/announcementDistributor';

export const data = new SlashCommandBuilder()
  .setName('annuncio')
  .setDescription('Invia un annuncio ai canali log configurati.')
  .addStringOption((option) =>
    option
      .setName('messaggio')
      .setDescription('Contenuto dell\'annuncio')
      .setMaxLength(4096)
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const configuredGuildId = process.env.GUILD_ID?.trim();
  const dirigenzaRoleId = process.env.DIRIGENZA_ID?.trim();

  if (!interaction.guild || !configuredGuildId || interaction.guild.id !== configuredGuildId) {
    await interaction.reply({
      content: '❌ Questo comando è disponibile solo nel server principale configurato.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!dirigenzaRoleId) {
    await interaction.reply({
      content: '❌ DIRIGENZA_ID non è configurato correttamente.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!(member instanceof GuildMember) || !member.roles.cache.has(dirigenzaRoleId)) {
    await interaction.reply({
      content: '❌ Non possiedi il ruolo di dirigenza necessario per usare questo comando.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const message = interaction.options.getString('messaggio', true);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const result = await distributeAnnouncement(
      interaction.client,
      buildAnnouncementEmbed('📢 Annuncio ufficiale', message, 0x3498db),
      '@here',
    );

    await interaction.editReply({
      content: `✅ Annuncio distribuito in ${result.sent} server.` +
        (result.failed ? `\n⚠️ ${result.failed} destinazioni non hanno potuto riceverlo.` : ''),
    });
  } catch (error) {
    console.error('Errore durante la distribuzione dell\'annuncio:', error);
    await interaction.editReply({
      content: '❌ Non è stato possibile distribuire l\'annuncio.',
    });
  }
}
