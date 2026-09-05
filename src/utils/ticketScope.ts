export const ticketCommandNames = new Set([
  'setup-ticket',
  'chiudi',
  'reclama',
  'rilascia',
  'rinomina',
]);

export function getTicketGuildId(): string | null {
  return process.env.TICKET_GUILD_ID?.trim() || null;
}

export function isTicketGuild(guildId: string | null | undefined): boolean {
  const ticketGuildId = getTicketGuildId();
  return ticketGuildId !== null && guildId === ticketGuildId;
}
