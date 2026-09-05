import { ChannelType, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, PermissionFlagsBits, Role, SlashCommandBuilder, TextChannel } from 'discord.js';
import { isTicketGuild, saveTicketConfig, ticketPanelComponents } from '../utils/ticketManager';

export const data = new SlashCommandBuilder()
  .setName('setup-ticket')
  .setDescription('Configura il pannello di supporto C.S.D.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((option) => option.setName('canale').setDescription('Canale in cui pubblicare il pannello').addChannelTypes(ChannelType.GuildText).setRequired(true))
  .addRoleOption((option) => option.setName('ruolo').setDescription('Ruolo autorizzato a gestire i ticket').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild || !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Solo gli amministratori possono configurare i ticket.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (!isTicketGuild(interaction.guild.id)) {
    await interaction.reply({ content: 'Il sistema ticket e disponibile solo nel server configurato.', flags: MessageFlags.Ephemeral });
    return;
  }

  const channel = interaction.options.getChannel('canale', true);
  const staffRole = interaction.options.getRole('ruolo', true) as Role;
  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: '❌ Il canale deve essere un canale testuale del server.', flags: MessageFlags.Ephemeral });
    return;
  }

  const panel = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle('🎫 Supporto C.S.D.')
    .setDescription('Hai bisogno di aiuto? Seleziona dal menu la categoria più adatta alla tua richiesta.\n\n🛡️ **Amministrazione**\nQuestioni burocratiche, gestionali o riservate.\n\n💬 **Assistenza Generale**\nDubbi, informazioni e supporto sul server.\n\n🤝 **Partnership / Collaborazione**\nProposte commerciali, affiliati o collaborazioni.\n\n🚨 **Segnalazione**\nViolazioni del regolamento o utenti problematici.\n\n📝 **Richiesta Entrata**\nRichiesta entrata Nella Confederazione.')
    .setFooter({ text: 'C.S.D. Supporto | Seleziona una categoria per aprire un ticket' })
    .setTimestamp();

  try {
    await saveTicketConfig(interaction.guild.id, channel.id, staffRole.id);
    await (channel as TextChannel).send({ embeds: [panel], components: ticketPanelComponents() });
    await interaction.reply({ content: `✅ Pannello ticket pubblicato in ${channel} con ruolo staff ${staffRole}.`, flags: MessageFlags.Ephemeral });
  } catch (error) {
    console.error('Errore nella configurazione ticket:', error);
    await interaction.reply({ content: '❌ Impossibile configurare il pannello ticket.', flags: MessageFlags.Ephemeral });
  }
}
