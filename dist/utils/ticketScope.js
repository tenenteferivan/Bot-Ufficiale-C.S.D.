"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTicketGuildId = getTicketGuildId;
exports.isTicketGuild = isTicketGuild;
function getTicketGuildId() {
    return process.env.GUILD_ID?.trim() || process.env.TICKET_GUILD_ID?.trim() || null;
}
function isTicketGuild(guildId) {
    const ticketGuildId = getTicketGuildId();
    return ticketGuildId !== null && guildId === ticketGuildId;
}
