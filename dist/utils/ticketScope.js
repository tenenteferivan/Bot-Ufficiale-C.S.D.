"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketCommandNames = void 0;
exports.getTicketGuildId = getTicketGuildId;
exports.isTicketGuild = isTicketGuild;
exports.ticketCommandNames = new Set([
    'setup-ticket',
    'chiudi',
    'reclama',
    'rilascia',
    'rinomina',
]);
function getTicketGuildId() {
    return process.env.TICKET_GUILD_ID?.trim() || null;
}
function isTicketGuild(guildId) {
    const ticketGuildId = getTicketGuildId();
    return ticketGuildId !== null && guildId === ticketGuildId;
}
