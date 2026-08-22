"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTicketInteraction = handleTicketInteraction;
const discord_js_1 = require("discord.js");
const ticketManager_1 = require("./ticketManager");
const ticketTranscript_1 = require("./ticketTranscript");
function safeChannelPart(value) {
    return value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'utente';
}
async function handleTicketInteraction(interaction) {
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
async function createTicketFromSelection(interaction) {
    if (!interaction.guild) {
        await interaction.reply({ content: '❌ I ticket possono essere aperti solo in un server.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const category = (0, ticketManager_1.categoryFromValue)(interaction.values[0]);
    const config = await (0, ticketManager_1.getTicketConfig)(interaction.guild.id);
    if (!category || !config) {
        await interaction.reply({ content: '❌ Il sistema ticket non è configurato.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    const panelChannel = await interaction.guild.channels.fetch(config.panelChannelId).catch(() => null);
    const parentId = panelChannel?.parentId ?? undefined;
    const username = safeChannelPart(interaction.user.username);
    let ticketChannel;
    try {
        const reservedNumber = await (0, ticketManager_1.reserveTicketNumber)(interaction.guild.id);
        const details = ticketManager_1.ticketCategories[category];
        ticketChannel = await interaction.guild.channels.create({
            name: `${details.emoji}-${String(reservedNumber).padStart(4, '0')}-${category}-${username}`.slice(0, 100),
            type: discord_js_1.ChannelType.GuildText,
            parent: parentId,
            permissionOverwrites: (0, ticketManager_1.ticketOverwrites)(interaction.guild, interaction.user.id, config.staffRoleId),
            reason: `Apertura ticket ${category} da ${interaction.user.tag}`,
        });
        const ticket = await (0, ticketManager_1.createTicketRecord)(ticketChannel.id, interaction.guild.id, interaction.user.id, category, reservedNumber);
        await ticketChannel.send({
            content: `<@&${config.staffRoleId}> ${interaction.user}`,
            embeds: [(0, ticketManager_1.ticketEmbed)(category, ticket.ticketNumber)],
            components: (0, ticketManager_1.ticketWelcomeComponents)(),
        });
        await interaction.editReply(`✅ Ticket creato: ${ticketChannel}`);
    }
    catch (error) {
        if (ticketChannel)
            await ticketChannel.delete('Rollback apertura ticket').catch(() => undefined);
        console.error('Errore durante la creazione del ticket:', error);
        await interaction.editReply('❌ Non è stato possibile creare il ticket. Riprova tra poco.');
    }
}
async function claimTicket(interaction) {
    if (!interaction.guild || !interaction.channel || !interaction.member) {
        await interaction.reply({ content: '❌ Azione disponibile solo nei server.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const ticket = await (0, ticketManager_1.getTicket)(interaction.channel.id);
    const config = await (0, ticketManager_1.getTicketConfig)(interaction.guild.id);
    if (!ticket || !config) {
        await interaction.reply({ content: '❌ Questo canale non è un ticket attivo.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (!(0, ticketManager_1.isStaff)(interaction.member, config)) {
        await interaction.reply({ content: '❌ Solo lo staff configurato può reclamare il ticket.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (ticket.claimedBy) {
        await interaction.reply({ content: `ℹ️ Ticket già preso in carico da <@${ticket.claimedBy}>.`, flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    await interaction.deferReply();
    await (0, ticketManager_1.applyClaim)(interaction.channel, ticket, config, interaction.member);
    await interaction.editReply(`🙋 Ticket preso in carico da ${interaction.user}. Gli altri membri dello staff non possono più visualizzarlo.`);
}
async function closeTicketRequest(interaction) {
    if (!interaction.guild || !interaction.channel || !interaction.member) {
        await interaction.reply({ content: '❌ Azione disponibile solo nei server.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const ticket = await (0, ticketManager_1.getTicket)(interaction.channel.id);
    const config = await (0, ticketManager_1.getTicketConfig)(interaction.guild.id);
    if (!ticket || !config) {
        await interaction.reply({ content: '❌ Questo canale non è un ticket attivo.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (interaction.user.id !== ticket.openerId && !(0, ticketManager_1.isStaff)(interaction.member, config)) {
        await interaction.reply({ content: '❌ Solo il richiedente o lo staff può chiudere il ticket.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    await interaction.showModal((0, ticketManager_1.closeModal)());
}
async function closeTicket(interaction) {
    if (!interaction.guild || !interaction.channel) {
        await interaction.reply({ content: '❌ Azione disponibile solo nei server.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const ticket = await (0, ticketManager_1.getTicket)(interaction.channel.id);
    if (!ticket) {
        await interaction.reply({ content: '❌ Questo ticket non è più attivo.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const reason = interaction.fields.getTextInputValue('reason').trim();
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    try {
        await (0, ticketTranscript_1.sendTicketTranscript)(interaction.client, interaction.channel, ticket, interaction.user, reason);
    }
    catch (error) {
        console.error('Errore durante la generazione del transcript ticket:', error);
    }
    await (0, ticketManager_1.closeTicketRecord)(ticket.channelId);
    await interaction.editReply(`🔒 Ticket chiuso. Il transcript è stato inviato nei log e in DM.`);
    await interaction.channel.delete(`Ticket chiuso da ${interaction.user.tag}: ${reason.slice(0, 400)}`);
}
