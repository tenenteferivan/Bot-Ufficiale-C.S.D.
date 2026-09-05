import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { db } from '../handlers/databasehandler';

export interface PartnershipConfig {
  guildId: string;
  channelId: string;
  roleId: string;
}

export interface PartnershipRank {
  id: string;
  name: string;
  total: number;
}

function run(sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => db.run(sql, params, (error) => error ? reject(error) : resolve()));
}

function all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows as T[])));
}

export async function savePartnershipConfig(guildId: string, channelId: string, roleId: string): Promise<void> {
  await run(
    `INSERT INTO partnership_configs (guild_id, channel_id, role_id) VALUES (?, ?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id, role_id = excluded.role_id`,
    [guildId, channelId, roleId],
  );
}

export async function getPartnershipConfig(guildId: string): Promise<PartnershipConfig | null> {
  const rows = await all<{ guild_id: string; channel_id: string; role_id: string }>(
    'SELECT guild_id, channel_id, role_id FROM partnership_configs WHERE guild_id = ?', [guildId],
  );
  const row = rows[0];
  return row ? { guildId: row.guild_id, channelId: row.channel_id, roleId: row.role_id } : null;
}

export function canPublishPartnership(member: GuildMember | any, roleId: string): boolean {
  if (!member) return false;

  // Verifica del ruolo: supporta GuildMember (roles.cache) e APIInteractionGuildMember (roles: string[])
  let hasRole = false;
  if (Array.isArray(member.roles)) {
    hasRole = member.roles.includes(roleId);
  } else if (member.roles?.cache) {
    hasRole = member.roles.cache.has(roleId);
  }

  if (hasRole) return true;

  // Verifica dei permessi di amministratore
  if (member.permissions) {
    if (typeof member.permissions.has === 'function') {
      if (
        member.permissions.has(PermissionFlagsBits.Administrator) ||
        member.permissions.has('Administrator')
      ) {
        return true;
      }
    } else if (typeof member.permissions === 'string' || typeof member.permissions === 'bigint') {
      const bitfield = BigInt(member.permissions);
      if ((bitfield & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator) {
        return true;
      }
    }
  }

  return false;
}

export async function savePartnershipSubmission(input: {
  guildId: string;
  guildName: string;
  userId: string;
  userName: string;
  managerId: string;
  pingId: string | null;
  description: string;
}): Promise<void> {
  await run(
    `INSERT INTO partnership_submissions
      (guild_id, guild_name, user_id, user_name, manager_id, ping_id, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.guildId, input.guildName, input.userId, input.userName, input.managerId, input.pingId, input.description],
  );
}

export function getGuildPartnershipLeaderboard(guildId: string): Promise<PartnershipRank[]> {
  return all<PartnershipRank>(
    `SELECT user_id AS id, MAX(user_name) AS name, COUNT(*) AS total
     FROM partnership_submissions WHERE guild_id = ?
     GROUP BY user_id ORDER BY total DESC, name COLLATE NOCASE ASC LIMIT 30`,
    [guildId],
  );
}

export function getGlobalUserPartnershipLeaderboard(): Promise<PartnershipRank[]> {
  return all<PartnershipRank>(
    `SELECT user_id AS id, MAX(user_name) AS name, COUNT(*) AS total
     FROM partnership_submissions
     GROUP BY user_id ORDER BY total DESC, name COLLATE NOCASE ASC LIMIT 30`,
  );
}

export function getGlobalGuildPartnershipLeaderboard(): Promise<PartnershipRank[]> {
  return all<PartnershipRank>(
    `SELECT guild_id AS id, MAX(guild_name) AS name, COUNT(*) AS total
     FROM partnership_submissions
     GROUP BY guild_id ORDER BY total DESC, name COLLATE NOCASE ASC LIMIT 30`,
  );
}
