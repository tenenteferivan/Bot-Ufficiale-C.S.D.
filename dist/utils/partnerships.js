"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePartnershipConfig = savePartnershipConfig;
exports.getPartnershipConfig = getPartnershipConfig;
exports.canPublishPartnership = canPublishPartnership;
exports.savePartnershipSubmission = savePartnershipSubmission;
exports.getGuildPartnershipLeaderboard = getGuildPartnershipLeaderboard;
exports.getGlobalUserPartnershipLeaderboard = getGlobalUserPartnershipLeaderboard;
exports.getGlobalGuildPartnershipLeaderboard = getGlobalGuildPartnershipLeaderboard;
const discord_js_1 = require("discord.js");
const databasehandler_1 = require("../handlers/databasehandler");
function run(sql, params = []) {
    return new Promise((resolve, reject) => databasehandler_1.db.run(sql, params, (error) => error ? reject(error) : resolve()));
}
function all(sql, params = []) {
    return new Promise((resolve, reject) => databasehandler_1.db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
}
async function savePartnershipConfig(guildId, channelId, roleId) {
    await run(`INSERT INTO partnership_configs (guild_id, channel_id, role_id) VALUES (?, ?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id, role_id = excluded.role_id`, [guildId, channelId, roleId]);
}
async function getPartnershipConfig(guildId) {
    const rows = await all('SELECT guild_id, channel_id, role_id FROM partnership_configs WHERE guild_id = ?', [guildId]);
    const row = rows[0];
    return row ? { guildId: row.guild_id, channelId: row.channel_id, roleId: row.role_id } : null;
}
function canPublishPartnership(member, roleId) {
    if (!member)
        return false;
    // Verifica del ruolo: supporta GuildMember (roles.cache) e APIInteractionGuildMember (roles: string[])
    let hasRole = false;
    if (Array.isArray(member.roles)) {
        hasRole = member.roles.includes(roleId);
    }
    else if (member.roles?.cache) {
        hasRole = member.roles.cache.has(roleId);
    }
    if (hasRole)
        return true;
    // Verifica dei permessi di amministratore
    if (member.permissions) {
        if (typeof member.permissions.has === 'function') {
            if (member.permissions.has(discord_js_1.PermissionFlagsBits.Administrator) ||
                member.permissions.has('Administrator')) {
                return true;
            }
        }
        else if (typeof member.permissions === 'string' || typeof member.permissions === 'bigint') {
            const bitfield = BigInt(member.permissions);
            if ((bitfield & discord_js_1.PermissionFlagsBits.Administrator) === discord_js_1.PermissionFlagsBits.Administrator) {
                return true;
            }
        }
    }
    return false;
}
async function savePartnershipSubmission(input) {
    await run(`INSERT INTO partnership_submissions
      (guild_id, guild_name, user_id, user_name, manager_id, ping_id, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [input.guildId, input.guildName, input.userId, input.userName, input.managerId, input.pingId, input.description]);
}
function getGuildPartnershipLeaderboard(guildId) {
    return all(`SELECT user_id AS id, MAX(user_name) AS name, COUNT(*) AS total
     FROM partnership_submissions WHERE guild_id = ?
     GROUP BY user_id ORDER BY total DESC, name COLLATE NOCASE ASC LIMIT 30`, [guildId]);
}
function getGlobalUserPartnershipLeaderboard() {
    return all(`SELECT user_id AS id, MAX(user_name) AS name, COUNT(*) AS total
     FROM partnership_submissions
     GROUP BY user_id ORDER BY total DESC, name COLLATE NOCASE ASC LIMIT 30`);
}
function getGlobalGuildPartnershipLeaderboard() {
    return all(`SELECT guild_id AS id, MAX(guild_name) AS name, COUNT(*) AS total
     FROM partnership_submissions
     GROUP BY guild_id ORDER BY total DESC, name COLLATE NOCASE ASC LIMIT 30`);
}
