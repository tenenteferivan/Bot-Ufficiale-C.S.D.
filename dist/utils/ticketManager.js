"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketCategories = void 0;
exports.getTicketConfig = getTicketConfig;
exports.saveTicketConfig = saveTicketConfig;
exports.reserveTicketNumber = reserveTicketNumber;
exports.createTicketRecord = createTicketRecord;
exports.getTicket = getTicket;
exports.setTicketClaim = setTicketClaim;
exports.closeTicketRecord = closeTicketRecord;
exports.listOpenTickets = listOpenTickets;
exports.ticketPanelComponents = ticketPanelComponents;
exports.ticketWelcomeComponents = ticketWelcomeComponents;
exports.ticketEmbed = ticketEmbed;
exports.ticketOverwrites = ticketOverwrites;
exports.applyClaim = applyClaim;
exports.releaseClaim = releaseClaim;
exports.isStaff = isStaff;
exports.closeModal = closeModal;
exports.categoryFromValue = categoryFromValue;
const discord_js_1 = require("discord.js");
const databasehandler_1 = require("../handlers/databasehandler");
exports.ticketCategories = {
    amministrazione: { label: 'Amministrazione', emoji: '🛡️', description: 'Questioni burocratiche, gestionali o riservate.' },
    assistenza: { label: 'Assistenza Generale', emoji: '💬', description: 'Dubbi, informazioni e supporto sul server.' },
    partnership: { label: 'Partnership / Collaborazione', emoji: '🤝', description: 'Proposte commerciali, affiliati o collaborazioni.' },
    segnalazione: { label: 'Segnalazione', emoji: '🚨', description: 'Violazioni del regolamento o utenti problematici.' },
    servizi: { label: 'Servizi', emoji: '⚙️', description: 'Supporto sui servizi della community.' },
};
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        databasehandler_1.db.run(sql, params, (error) => error ? reject(error) : resolve());
    });
}
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        databasehandler_1.db.get(sql, params, (error, row) => error ? reject(error) : resolve(row));
    });
}
function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        databasehandler_1.db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
    });
}
async function getTicketConfig(guildId) {
    const row = await get('SELECT guild_id, panel_channel_id, staff_role_id, next_number FROM ticket_configs WHERE guild_id = ?', [guildId]);
    if (!row)
        return null;
    return { guildId: row.guild_id, panelChannelId: row.panel_channel_id, staffRoleId: row.staff_role_id, nextNumber: row.next_number };
}
function saveTicketConfig(guildId, panelChannelId, staffRoleId) {
    return run(`INSERT INTO ticket_configs (guild_id, panel_channel_id, staff_role_id)
      VALUES (?, ?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET panel_channel_id = excluded.panel_channel_id, staff_role_id = excluded.staff_role_id`, [guildId, panelChannelId, staffRoleId]);
}
async function reserveTicketNumber(guildId) {
    return new Promise((resolve, reject) => {
        databasehandler_1.db.serialize(() => {
            databasehandler_1.db.run('BEGIN IMMEDIATE', (beginError) => {
                if (beginError)
                    return reject(beginError);
                databasehandler_1.db.get('SELECT next_number FROM ticket_configs WHERE guild_id = ?', [guildId], (getError, row) => {
                    if (getError || !row) {
                        databasehandler_1.db.run('ROLLBACK');
                        return reject(getError ?? new Error('Configurazione ticket non trovata.'));
                    }
                    databasehandler_1.db.run('UPDATE ticket_configs SET next_number = next_number + 1 WHERE guild_id = ?', [guildId], (updateError) => {
                        if (updateError) {
                            databasehandler_1.db.run('ROLLBACK');
                            return reject(updateError);
                        }
                        databasehandler_1.db.run('COMMIT', (commitError) => commitError ? reject(commitError) : resolve(row.next_number));
                    });
                });
            });
        });
    });
}
async function createTicketRecord(channelId, guildId, openerId, category, reservedNumber) {
    const ticketNumber = reservedNumber ?? await reserveTicketNumber(guildId);
    const createdAt = new Date().toISOString();
    await run(`INSERT INTO tickets (channel_id, guild_id, ticket_number, opener_id, category, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`, [channelId, guildId, ticketNumber, openerId, category, createdAt]);
    return { channelId, guildId, ticketNumber, openerId, category, claimedBy: null, status: 'open', createdAt };
}
async function getTicket(channelId) {
    const row = await get('SELECT * FROM tickets WHERE channel_id = ? AND status = \'open\'', [channelId]);
    if (!row)
        return null;
    return {
        channelId: row.channel_id,
        guildId: row.guild_id,
        ticketNumber: row.ticket_number,
        openerId: row.opener_id,
        category: row.category,
        claimedBy: row.claimed_by,
        status: 'open',
        createdAt: row.created_at,
    };
}
function setTicketClaim(channelId, claimedBy) {
    return run('UPDATE tickets SET claimed_by = ? WHERE channel_id = ? AND status = \'open\'', [claimedBy, channelId]);
}
function closeTicketRecord(channelId) {
    return run('UPDATE tickets SET status = \'closed\' WHERE channel_id = ?', [channelId]);
}
async function listOpenTickets(guildId) {
    const rows = await all('SELECT * FROM tickets WHERE guild_id = ? AND status = \'open\'', [guildId]);
    return rows.map((row) => ({
        channelId: row.channel_id,
        guildId: row.guild_id,
        ticketNumber: row.ticket_number,
        openerId: row.opener_id,
        category: row.category,
        claimedBy: row.claimed_by,
        status: 'open',
        createdAt: row.created_at,
    }));
}
function ticketPanelComponents() {
    const menu = new discord_js_1.StringSelectMenuBuilder()
        .setCustomId('ticket:category')
        .setPlaceholder('Seleziona il motivo della richiesta')
        .addOptions(Object.entries(exports.ticketCategories).map(([value, category]) => ({
        value,
        label: category.label,
        description: category.description,
        emoji: category.emoji,
    })));
    return [new discord_js_1.ActionRowBuilder().addComponents(menu)];
}
function ticketWelcomeComponents() {
    return [new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId('ticket:claim').setLabel('Reclama').setEmoji('🙋').setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder().setCustomId('ticket:close').setLabel('Chiudi').setEmoji('🔒').setStyle(discord_js_1.ButtonStyle.Danger))];
}
function ticketEmbed(category, ticketNumber) {
    const details = exports.ticketCategories[category];
    return new discord_js_1.EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle(`${details.emoji} Supporto C.S.S.D. ${ticketNumber ? `#${String(ticketNumber).padStart(4, '0')}` : ''}`)
        .setDescription(`Categoria: **${details.label}**\n${details.description}\n\nDescrivi qui la tua richiesta in modo dettagliato. Un membro dello staff ti risponderà appena possibile.`)
        .setFooter({ text: 'C.S.S.D. Supporto' })
        .setTimestamp();
}
function ticketOverwrites(guild, openerId, staffRoleId) {
    return [
        { id: guild.roles.everyone.id, type: discord_js_1.OverwriteType.Role, deny: [discord_js_1.PermissionFlagsBits.ViewChannel] },
        { id: openerId, type: discord_js_1.OverwriteType.Member, allow: [discord_js_1.PermissionFlagsBits.ViewChannel, discord_js_1.PermissionFlagsBits.SendMessages, discord_js_1.PermissionFlagsBits.AttachFiles, discord_js_1.PermissionFlagsBits.ReadMessageHistory] },
        { id: staffRoleId, type: discord_js_1.OverwriteType.Role, allow: [discord_js_1.PermissionFlagsBits.ViewChannel, discord_js_1.PermissionFlagsBits.SendMessages, discord_js_1.PermissionFlagsBits.AttachFiles, discord_js_1.PermissionFlagsBits.ReadMessageHistory] },
    ];
}
async function applyClaim(channel, ticket, config, member) {
    await channel.permissionOverwrites.edit(config.staffRoleId, { ViewChannel: false, SendMessages: false, AttachFiles: false, ReadMessageHistory: false });
    await channel.permissionOverwrites.edit(ticket.openerId, { ViewChannel: true, SendMessages: true, AttachFiles: true, ReadMessageHistory: true });
    await channel.permissionOverwrites.edit(member.id, { ViewChannel: true, SendMessages: true, AttachFiles: true, ReadMessageHistory: true });
    await setTicketClaim(ticket.channelId, member.id);
}
async function releaseClaim(channel, ticket, config) {
    await channel.permissionOverwrites.delete(ticket.claimedBy ?? '');
    await channel.permissionOverwrites.edit(config.staffRoleId, { ViewChannel: true, SendMessages: true, AttachFiles: true, ReadMessageHistory: true });
    await setTicketClaim(ticket.channelId, null);
}
function isStaff(member, config) {
    return member.roles.cache.has(config.staffRoleId) || member.permissions.has(discord_js_1.PermissionFlagsBits.Administrator);
}
function closeModal(customId = 'ticket:close-modal') {
    return new discord_js_1.ModalBuilder()
        .setCustomId(customId)
        .setTitle('Chiudi ticket')
        .addComponents(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder().setCustomId('reason').setLabel('Motivazione della chiusura').setStyle(discord_js_1.TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000)));
}
function categoryFromValue(value) {
    return value in exports.ticketCategories ? value : null;
}
