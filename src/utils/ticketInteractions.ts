import {
  ButtonInteraction,
  ChannelType,
  EmbedBuilder,
  GuildMember,
  Interaction,
  MessageFlags,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import {
  applyClaim,
  categoryFromValue,
  closeTicketRecord,
  createTicketRecord,
  getTicket,
  getTicketConfig,
  isStaff,
  releaseClaim,
  reserveTicketNumber,
  ticketCategories,
  ticketEmbed,
  ticketOverwrites,
  ticketWelcomeComponents,
  closeModal,
} from './ticketManager';
import { sendTicketTranscript } from './ticketTranscript';

function safeChannelPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'utente';
}

export async function handleTicketInteraction(interaction: Interaction): Promise<boolean> {
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket:category') {
    await createTicketFromSelection(interaction);
    return true;
  }
  if (interaction.isButton() && interaction.customId === 'ticket:claim') {
    await claimTicket(interaction);
    return true;
  }
  if (interaction.isButton() && interaction.customId === 'ticket:close') {
    await closeTicketRequest(interaction);
    return true;
  }
  if (interaction.isModalSubmit() && interaction.customId === 'ticket:close-modal') {
    await closeTicket(interaction);
    return true;
  }
  return false;
}

async function createTicketFromSelection(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: '❌ I ticket possono essere aperti solo in un server.', flags: MessageFlags.Ephemeral });
    return;
  }
  const category = categoryFromValue(interaction.values[0]);
  const config = await getTicketConfig(interaction.guild.id);
  if (!category || !config) {
    await interaction.reply({ content: '❌ Il sistema ticket non è configurato.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const panelChannel = await interaction.guild.channels.fetch(config.panelChannelId).catch(() => null);
  const parentId = panelChannel?.parentId ?? undefined;
  const username = safeChannelPart(interaction.user.username);
  let ticketChannel;

  try {
    const reservedNumber = await reserveTicketNumber(interaction.guild.id);
    const details = ticketCategories[category];
    ticketChannel = await interaction.guild.channels.create({
      name: `${details.emoji}-${String(reservedNumber).padStart(4, '0')}-${category}-${username}`.slice(0, 100),
      type: ChannelType.GuildText,
      parent: parentId,
      permissionOverwrites: ticketOverwrites(interaction.guild, interaction.user.id, config.staffRoleId),
      reason: `Apertura ticket ${category} da ${interaction.user.tag}`,
    });

    const ticket = await createTicketRecord(ticketChannel.id, interaction.guild.id, interaction.user.id, category, reservedNumber);
    await ticketChannel.send({
      content: `<@&${config.staffRoleId}> ${interaction.user}`,
      embeds: [ticketEmbed(category, ticket.ticketNumber)],
      components: ticketWelcomeComponents(),
    });
    await interaction.editReply(`✅ Ticket creato: ${ticketChannel}`);
  } catch (error) {
    if (ticketChannel) await ticketChannel.delete('Rollback apertura ticket').catch(() => undefined);
    console.error('Errore durante la creazione del ticket:', error);
    await interaction.editReply('❌ Non è stato possibile creare il ticket. Riprova tra poco.');
  }
}

async function claimTicket(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !interaction.channel || !interaction.member) {
    await interaction.reply({ content: '❌ Azione disponibile solo nei server.', flags: MessageFlags.Ephemeral });
    return;
  }
  const ticket = await getTicket(interaction.channel.id);
  const config = await getTicketConfig(interaction.guild.id);
  if (!ticket || !config) {
    await interaction.reply({ content: '❌ Questo canale non è un ticket attivo.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (!isStaff(interaction.member as GuildMember, config)) {
    await interaction.reply({ content: '❌ Solo lo staff configurato può reclamare il ticket.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (ticket.claimedBy) {
    await interaction.reply({ content: `ℹ️ Ticket già preso in carico da <@${ticket.claimedBy}>.`, flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply();
  await applyClaim(interaction.channel, ticket, config, interaction.member as GuildMember);
  await interaction.editReply(`🙋 Ticket preso in carico da ${interaction.user}. Gli altri membri dello staff non possono più visualizzarlo.`);
}

async function closeTicketRequest(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !interaction.channel || !interaction.member) {
    await interaction.reply({ content: '❌ Azione disponibile solo nei server.', flags: MessageFlags.Ephemeral });
    return;
  }
  const ticket = await getTicket(interaction.channel.id);
  const config = await getTicketConfig(interaction.guild.id);
  if (!ticket || !config) {
    await interaction.reply({ content: '❌ Questo canale non è un ticket attivo.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (interaction.user.id !== ticket.openerId && !isStaff(interaction.member as GuildMember, config)) {
    await interaction.reply({ content: '❌ Solo il richiedente o lo staff può chiudere il ticket.', flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.showModal(closeModal());
}

async function closeTicket(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.guild || !interaction.channel) {
    await interaction.reply({ content: '❌ Azione disponibile solo nei server.', flags: MessageFlags.Ephemeral });
    return;
  }
  const ticket = await getTicket(interaction.channel.id);
  if (!ticket) {
    await interaction.reply({ content: '❌ Questo ticket non è più attivo.', flags: MessageFlags.Ephemeral });
    return;
  }
  const reason = interaction.fields.getTextInputValue('reason').trim();
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    await sendTicketTranscript(interaction.client, interaction.channel as any, ticket, interaction.user, reason);
  } catch (error) {
    console.error('Errore durante la generazione del transcript ticket:', error);
  }
  await closeTicketRecord(ticket.channelId);
  await interaction.editReply(`🔒 Ticket chiuso. Il transcript è stato inviato nei log e in DM.`);
  await interaction.channel.delete(`Ticket chiuso da ${interaction.user.tag}: ${reason.slice(0, 400)}`);
}
