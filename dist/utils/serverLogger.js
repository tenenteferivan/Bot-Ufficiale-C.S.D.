"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendServerLog = sendServerLog;
exports.logCommand = logCommand;
exports.logMessageDelete = logMessageDelete;
exports.logMemberJoin = logMemberJoin;
exports.logMemberLeave = logMemberLeave;
exports.logBan = logBan;
exports.logMemberUpdate = logMemberUpdate;
exports.logRoleUpdate = logRoleUpdate;
exports.logRoleCreate = logRoleCreate;
exports.logRoleDelete = logRoleDelete;
exports.logChannelCreate = logChannelCreate;
exports.logChannelDelete = logChannelDelete;
exports.logChannelUpdate = logChannelUpdate;
const discord_js_1 = require("discord.js");
const ignoredCommandNames = new Set(['aggiungi-archivio', 'ritira-file', 'rimuovi-archivio']);
function isArchiveCommand(commandName) {
    return commandName.toLowerCase().includes('archivio') || ignoredCommandNames.has(commandName.toLowerCase());
}
async function getLogChannel(client) {
    const channelId = process.env.CANALE_LOGS?.trim();
    if (!channelId)
        return null;
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
async function sendServerLog(client, title, description, color = 0x5865f2, fields = []) {
    const channel = await getLogChannel(client);
    if (!channel)
        return;
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description.slice(0, 4096))
        .addFields(fields.slice(0, 25).map((field) => ({ ...field, value: field.value.slice(0, 1024) })))
        .setTimestamp();
    await channel.send({ embeds: [embed] }).catch((error) => {
        if (error?.code === 50001 || error?.code === 50013) {
            console.error(`Impossibile inviare il log in CANALE_LOGS=${process.env.CANALE_LOGS}: il bot deve avere ViewChannel e SendMessages.`);
            return;
        }
        console.error('Impossibile inviare il log:', error);
    });
}
function formatUser(user) {
    if (!user)
        return 'Sconosciuto';
    return `${user.user?.tag ?? user.tag ?? user.id} (${user.id})`;
}
function formatAuditExecutor(entry) {
    return entry?.executor ? formatUser(entry.executor) : 'Sconosciuto';
}
async function findRecentAuditEntry(guild, action, targetId) {
    const logs = await guild.fetchAuditLogs({ type: action, limit: 5 }).catch(() => null);
    if (!logs)
        return null;
    const now = Date.now();
    return logs.entries.find((entry) => (!targetId || entry.target?.id === targetId) && now - entry.createdTimestamp < 15_000) ?? null;
}
function diffMap(before, after) {
    const changes = [];
    const keys = new Set([...before.keys(), ...after.keys()]);
    for (const key of keys) {
        const oldValue = before.get(key) ?? 'nessuno';
        const newValue = after.get(key) ?? 'nessuno';
        if (oldValue !== newValue)
            changes.push(`\`${key}\`: ${oldValue} -> ${newValue}`);
    }
    return changes;
}
function rolePermissions(role) {
    return role.permissions.toArray().join(', ') || 'nessun permesso';
}
function channelOverwrites(channel) {
    return new Map(channel.permissionOverwrites.cache.map((overwrite) => [overwrite.id, `${overwrite.type}:${overwrite.allow.toArray().join('|') || '-'}:${overwrite.deny.toArray().join('|') || '-'}`]));
}
async function logCommand(client, commandName, user, guildName) {
    if (isArchiveCommand(commandName))
        return;
    await sendServerLog(client, 'Comando del bot eseguito', `/${commandName}`, 0x3498db, [
        { name: 'Utente', value: formatUser(user), inline: true },
        { name: 'Server', value: guildName ?? 'DM', inline: true },
    ]);
}
async function logMessageDelete(client, message) {
    if (!message.guild)
        return;
    const content = message.content?.trim() || 'Contenuto non disponibile: il messaggio non era nella cache.';
    const channelName = 'name' in message.channel ? message.channel.name : message.channel.id;
    await sendServerLog(client, 'Messaggio eliminato', `Canale: **#${channelName}**`, 0xed4245, [
        { name: 'Autore', value: formatUser(message.author), inline: true },
        { name: 'ID messaggio', value: message.id, inline: true },
        { name: 'Contenuto', value: content },
    ]);
}
async function logMemberJoin(client, member) {
    await sendServerLog(client, 'Membro entrato', `${formatUser(member)} è entrato nel server.`, 0x57f287, [{ name: 'Server', value: member.guild.name }]);
}
async function logMemberLeave(client, member) {
    await sendServerLog(client, 'Membro uscito', `${formatUser(member)} ha lasciato il server.`, 0xed4245, [{ name: 'Server', value: member.guild.name }]);
}
async function logBan(client, guild, user, added) {
    const entry = await findRecentAuditEntry(guild, added ? discord_js_1.AuditLogEvent.MemberBanAdd : discord_js_1.AuditLogEvent.MemberBanRemove, user.id);
    await sendServerLog(client, added ? 'Membro bannato' : 'Ban rimosso', formatUser(user), added ? 0xed4245 : 0x57f287, [
        { name: 'Eseguito da', value: formatAuditExecutor(entry) },
        { name: 'Motivo', value: entry?.reason ?? 'Nessun motivo specificato' },
    ]);
}
async function logMemberUpdate(client, oldMember, newMember) {
    const changes = [];
    if (oldMember.nickname !== newMember.nickname)
        changes.push(`Nickname: ${oldMember.nickname ?? 'nessuno'} -> ${newMember.nickname ?? 'nessuno'}`);
    const oldRoles = new Set(oldMember.roles.cache.keys());
    const newRoles = new Set(newMember.roles.cache.keys());
    const addedRoles = [...newRoles].filter((id) => !oldRoles.has(id)).map((id) => newMember.guild.roles.cache.get(id)?.name ?? id);
    const removedRoles = [...oldRoles].filter((id) => !newRoles.has(id)).map((id) => oldMember.guild.roles.cache.get(id)?.name ?? id);
    if (addedRoles.length)
        changes.push(`Ruoli aggiunti: ${addedRoles.join(', ')}`);
    if (removedRoles.length)
        changes.push(`Ruoli rimossi: ${removedRoles.join(', ')}`);
    if (!changes.length)
        return;
    const entry = await findRecentAuditEntry(newMember.guild, discord_js_1.AuditLogEvent.MemberRoleUpdate, newMember.id) ?? await findRecentAuditEntry(newMember.guild, discord_js_1.AuditLogEvent.MemberUpdate, newMember.id);
    await sendServerLog(client, 'Membro modificato', formatUser(newMember), 0xf1c40f, [
        { name: 'Modifiche', value: changes.join('\n') },
        { name: 'Eseguito da', value: formatAuditExecutor(entry) },
    ]);
}
async function logRoleUpdate(client, oldRole, newRole) {
    const changes = [];
    if (oldRole.name !== newRole.name)
        changes.push(`Nome: ${oldRole.name} -> ${newRole.name}`);
    if (oldRole.color !== newRole.color)
        changes.push(`Colore: ${oldRole.hexColor} -> ${newRole.hexColor}`);
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield)
        changes.push(`Permessi: ${rolePermissions(oldRole)} -> ${rolePermissions(newRole)}`);
    if (!changes.length)
        return;
    const entry = await findRecentAuditEntry(newRole.guild, discord_js_1.AuditLogEvent.RoleUpdate, newRole.id);
    await sendServerLog(client, 'Ruolo modificato', `Ruolo: **${newRole.name}** (${newRole.id})`, 0x9b59b6, [
        { name: 'Modifiche esplicite', value: changes.join('\n') },
        { name: 'Eseguito da', value: formatAuditExecutor(entry) },
    ]);
}
async function logRoleCreate(client, role) {
    const entry = await findRecentAuditEntry(role.guild, discord_js_1.AuditLogEvent.RoleCreate, role.id);
    await sendServerLog(client, 'Ruolo creato', `Ruolo: **${role.name}** (${role.id})`, 0x57f287, [
        { name: 'Permessi', value: rolePermissions(role) },
        { name: 'Eseguito da', value: formatAuditExecutor(entry) },
    ]);
}
async function logRoleDelete(client, role) {
    const entry = await findRecentAuditEntry(role.guild, discord_js_1.AuditLogEvent.RoleDelete, role.id);
    await sendServerLog(client, 'Ruolo eliminato', `Ruolo: **${role.name}** (${role.id})`, 0xed4245, [
        { name: 'Permessi precedenti', value: rolePermissions(role) },
        { name: 'Eseguito da', value: formatAuditExecutor(entry) },
    ]);
}
async function logChannelCreate(client, channel) {
    const entry = await findRecentAuditEntry(channel.guild, discord_js_1.AuditLogEvent.ChannelCreate, channel.id);
    await sendServerLog(client, 'Canale creato', `**${channel.name}** (${channel.id})`, 0x57f287, [
        { name: 'Tipo', value: channel.type.toString(), inline: true },
        { name: 'Eseguito da', value: formatAuditExecutor(entry), inline: true },
    ]);
}
async function logChannelDelete(client, channel) {
    const entry = await findRecentAuditEntry(channel.guild, discord_js_1.AuditLogEvent.ChannelDelete, channel.id);
    await sendServerLog(client, 'Canale eliminato', `**${channel.name}** (${channel.id})`, 0xed4245, [{ name: 'Eseguito da', value: formatAuditExecutor(entry) }]);
}
async function logChannelUpdate(client, oldChannel, newChannel) {
    const changes = [];
    if (oldChannel.name !== newChannel.name)
        changes.push(`Nome: ${oldChannel.name} -> ${newChannel.name}`);
    if (oldChannel.parentId !== newChannel.parentId)
        changes.push(`Categoria: ${oldChannel.parentId ?? 'nessuna'} -> ${newChannel.parentId ?? 'nessuna'}`);
    changes.push(...diffMap(channelOverwrites(oldChannel), channelOverwrites(newChannel)).map((change) => `Permessi canale: ${change}`));
    if (!changes.length)
        return;
    const entry = await findRecentAuditEntry(newChannel.guild, discord_js_1.AuditLogEvent.ChannelUpdate, newChannel.id);
    await sendServerLog(client, 'Canale modificato', `**${newChannel.name}** (${newChannel.id})`, 0xf1c40f, [
        { name: 'Modifiche esplicite', value: changes.join('\n') },
        { name: 'Eseguito da', value: formatAuditExecutor(entry) },
    ]);
}
