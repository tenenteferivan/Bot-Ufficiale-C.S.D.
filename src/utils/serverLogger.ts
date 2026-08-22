import {
  AuditLogEvent,
  Client,
  EmbedBuilder,
  Guild,
  GuildAuditLogsEntry,
  GuildChannel,
  GuildMember,
  Message,
  PartialGuildMember,
  PartialMessage,
  Role,
  User,
} from 'discord.js';

const ignoredCommandNames = new Set(['aggiungi-archivio', 'ritira-file', 'rimuovi-archivio']);

interface LoggableUser {
  id: string;
  tag?: string;
  user?: { tag?: string };
}

function isArchiveCommand(commandName: string): boolean {
  return commandName.toLowerCase().includes('archivio') || ignoredCommandNames.has(commandName.toLowerCase());
}

async function getLogChannel(client: Client) {
  const channelId = process.env.CANALE_LOGS?.trim();
  if (!channelId) return null;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    console.error(`CANALE_LOGS=${channelId}: canale non trovato o bot senza accesso.`);
    return null;
  }
  if (!channel.isTextBased() || !('send' in channel)) {
    console.error(`CANALE_LOGS=${channelId}: il canale non è testuale.`);
    return null;
  }
  return channel;
}

export async function sendServerLog(client: Client, title: string, description: string, color = 0x5865f2, fields: { name: string; value: string; inline?: boolean }[] = []): Promise<void> {
  const channel = await getLogChannel(client);
  if (!channel) return;
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description.slice(0, 4096))
    .addFields(fields.slice(0, 25).map((field) => ({ ...field, value: field.value.slice(0, 1024) })))
    .setTimestamp();
  await channel.send({ embeds: [embed] }).catch((error: any) => {
    if (error?.code === 50001 || error?.code === 50013) {
      console.error(`Impossibile inviare il log in CANALE_LOGS=${process.env.CANALE_LOGS}: il bot deve avere ViewChannel e SendMessages.`);
      return;
    }
    console.error('Impossibile inviare il log:', error);
  });
}

function formatUser(user: LoggableUser | null | undefined): string {
  if (!user) return 'Sconosciuto';
  return `${user.user?.tag ?? user.tag ?? user.id} (${user.id})`;
}

function formatAuditExecutor(entry: GuildAuditLogsEntry | null): string {
  return entry?.executor ? formatUser(entry.executor) : 'Sconosciuto';
}

async function findRecentAuditEntry(guild: Guild, action: AuditLogEvent, targetId?: string): Promise<GuildAuditLogsEntry | null> {
  const logs = await guild.fetchAuditLogs({ type: action, limit: 5 }).catch(() => null);
  if (!logs) return null;
  const now = Date.now();
  return logs.entries.find((entry) => (!targetId || entry.target?.id === targetId) && now - entry.createdTimestamp < 15_000) ?? null;
}

function diffMap(before: Map<string, string>, after: Map<string, string>): string[] {
  const changes: string[] = [];
  const keys = new Set([...before.keys(), ...after.keys()]);
  for (const key of keys) {
    const oldValue = before.get(key) ?? 'nessuno';
    const newValue = after.get(key) ?? 'nessuno';
    if (oldValue !== newValue) changes.push(`\`${key}\`: ${oldValue} -> ${newValue}`);
  }
  return changes;
}

function rolePermissions(role: Role): string {
  return role.permissions.toArray().join(', ') || 'nessun permesso';
}

function channelOverwrites(channel: GuildChannel): Map<string, string> {
  return new Map(channel.permissionOverwrites.cache.map((overwrite) => [overwrite.id, `${overwrite.type}:${overwrite.allow.toArray().join('|') || '-'}:${overwrite.deny.toArray().join('|') || '-'}`]));
}

export async function logCommand(client: Client, commandName: string, user: User, guildName?: string): Promise<void> {
  if (isArchiveCommand(commandName)) return;
  await sendServerLog(client, 'Comando del bot eseguito', `/${commandName}`, 0x3498db, [
    { name: 'Utente', value: formatUser(user), inline: true },
    { name: 'Server', value: guildName ?? 'DM', inline: true },
  ]);
}

export async function logMessageDelete(client: Client, message: Message | PartialMessage): Promise<void> {
  if (!message.guild) return;

  const content = message.content?.trim() || 'Contenuto non disponibile: il messaggio non era nella cache.';
  const channelName = 'name' in message.channel ? message.channel.name : message.channel.id;
  await sendServerLog(client, 'Messaggio eliminato', `Canale: **#${channelName}**`, 0xed4245, [
    { name: 'Autore', value: formatUser(message.author), inline: true },
    { name: 'ID messaggio', value: message.id, inline: true },
    { name: 'Contenuto', value: content },
  ]);
}

export async function logMemberJoin(client: Client, member: GuildMember): Promise<void> {
  await sendServerLog(client, 'Membro entrato', `${formatUser(member)} è entrato nel server.`, 0x57f287, [{ name: 'Server', value: member.guild.name }]);
}

export async function logMemberLeave(client: Client, member: GuildMember | PartialGuildMember): Promise<void> {
  await sendServerLog(client, 'Membro uscito', `${formatUser(member)} ha lasciato il server.`, 0xed4245, [{ name: 'Server', value: member.guild.name }]);
}

export async function logBan(client: Client, guild: Guild, user: User, added: boolean): Promise<void> {
  const entry = await findRecentAuditEntry(guild, added ? AuditLogEvent.MemberBanAdd : AuditLogEvent.MemberBanRemove, user.id);
  await sendServerLog(client, added ? 'Membro bannato' : 'Ban rimosso', formatUser(user), added ? 0xed4245 : 0x57f287, [
    { name: 'Eseguito da', value: formatAuditExecutor(entry) },
    { name: 'Motivo', value: entry?.reason ?? 'Nessun motivo specificato' },
  ]);
}

export async function logMemberUpdate(client: Client, oldMember: GuildMember | PartialGuildMember, newMember: GuildMember | PartialGuildMember): Promise<void> {
  const changes: string[] = [];
  if (oldMember.nickname !== newMember.nickname) changes.push(`Nickname: ${oldMember.nickname ?? 'nessuno'} -> ${newMember.nickname ?? 'nessuno'}`);
  const oldRoles = new Set(oldMember.roles.cache.keys());
  const newRoles = new Set(newMember.roles.cache.keys());
  const addedRoles = [...newRoles].filter((id) => !oldRoles.has(id)).map((id) => newMember.guild.roles.cache.get(id)?.name ?? id);
  const removedRoles = [...oldRoles].filter((id) => !newRoles.has(id)).map((id) => oldMember.guild.roles.cache.get(id)?.name ?? id);
  if (addedRoles.length) changes.push(`Ruoli aggiunti: ${addedRoles.join(', ')}`);
  if (removedRoles.length) changes.push(`Ruoli rimossi: ${removedRoles.join(', ')}`);
  if (!changes.length) return;
  const entry = await findRecentAuditEntry(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id) ?? await findRecentAuditEntry(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
  await sendServerLog(client, 'Membro modificato', formatUser(newMember), 0xf1c40f, [
    { name: 'Modifiche', value: changes.join('\n') },
    { name: 'Eseguito da', value: formatAuditExecutor(entry) },
  ]);
}

export async function logRoleUpdate(client: Client, oldRole: Role, newRole: Role): Promise<void> {
  const changes: string[] = [];
  if (oldRole.name !== newRole.name) changes.push(`Nome: ${oldRole.name} -> ${newRole.name}`);
  if (oldRole.color !== newRole.color) changes.push(`Colore: ${oldRole.hexColor} -> ${newRole.hexColor}`);
  if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push(`Permessi: ${rolePermissions(oldRole)} -> ${rolePermissions(newRole)}`);
  if (!changes.length) return;
  const entry = await findRecentAuditEntry(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
  await sendServerLog(client, 'Ruolo modificato', `Ruolo: **${newRole.name}** (${newRole.id})`, 0x9b59b6, [
    { name: 'Modifiche esplicite', value: changes.join('\n') },
    { name: 'Eseguito da', value: formatAuditExecutor(entry) },
  ]);
}

export async function logRoleCreate(client: Client, role: Role): Promise<void> {
  const entry = await findRecentAuditEntry(role.guild, AuditLogEvent.RoleCreate, role.id);
  await sendServerLog(client, 'Ruolo creato', `Ruolo: **${role.name}** (${role.id})`, 0x57f287, [
    { name: 'Permessi', value: rolePermissions(role) },
    { name: 'Eseguito da', value: formatAuditExecutor(entry) },
  ]);
}

export async function logRoleDelete(client: Client, role: Role): Promise<void> {
  const entry = await findRecentAuditEntry(role.guild, AuditLogEvent.RoleDelete, role.id);
  await sendServerLog(client, 'Ruolo eliminato', `Ruolo: **${role.name}** (${role.id})`, 0xed4245, [
    { name: 'Permessi precedenti', value: rolePermissions(role) },
    { name: 'Eseguito da', value: formatAuditExecutor(entry) },
  ]);
}

export async function logChannelCreate(client: Client, channel: GuildChannel): Promise<void> {
  const entry = await findRecentAuditEntry(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
  await sendServerLog(client, 'Canale creato', `**${channel.name}** (${channel.id})`, 0x57f287, [
    { name: 'Tipo', value: channel.type.toString(), inline: true },
    { name: 'Eseguito da', value: formatAuditExecutor(entry), inline: true },
  ]);
}

export async function logChannelDelete(client: Client, channel: GuildChannel): Promise<void> {
  const entry = await findRecentAuditEntry(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
  await sendServerLog(client, 'Canale eliminato', `**${channel.name}** (${channel.id})`, 0xed4245, [{ name: 'Eseguito da', value: formatAuditExecutor(entry) }]);
}

export async function logChannelUpdate(client: Client, oldChannel: GuildChannel, newChannel: GuildChannel): Promise<void> {
  const changes: string[] = [];
  if (oldChannel.name !== newChannel.name) changes.push(`Nome: ${oldChannel.name} -> ${newChannel.name}`);
  if (oldChannel.parentId !== newChannel.parentId) changes.push(`Categoria: ${oldChannel.parentId ?? 'nessuna'} -> ${newChannel.parentId ?? 'nessuna'}`);
  changes.push(...diffMap(channelOverwrites(oldChannel), channelOverwrites(newChannel)).map((change) => `Permessi canale: ${change}`));
  if (!changes.length) return;
  const entry = await findRecentAuditEntry(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
  await sendServerLog(client, 'Canale modificato', `**${newChannel.name}** (${newChannel.id})`, 0xf1c40f, [
    { name: 'Modifiche esplicite', value: changes.join('\n') },
    { name: 'Eseguito da', value: formatAuditExecutor(entry) },
  ]);
}