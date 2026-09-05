import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { dataDirectory } from '../utils/projectPaths';

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

export const db = new sqlite3.Database(
  path.join(dataDirectory, 'registro.sqlite')
);

db.serialize(() => {
  // ============================================================
  // CONFIGURACIÓN GENERAL
  // ============================================================

  db.run(`
 CREATE TABLE IF NOT EXISTS server_report_configs (
  guild_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL
  )
`);

  db.run('PRAGMA foreign_keys = ON');

  // ============================================================
  // REGISTRO DE USUARIOS - GLOBAL
  // ============================================================

  db.run(`
    CREATE TABLE IF NOT EXISTS user_records (
      user_id TEXT PRIMARY KEY,
      points REAL NOT NULL DEFAULT 20.0,
      max_points REAL NOT NULL DEFAULT 20.0,
      sanctions_history TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      reports TEXT DEFAULT '',
      status TEXT DEFAULT ''
    )
  `);

  // ============================================================
  // SANCIONES - GLOBAL
  // ============================================================

  db.run(`
    CREATE TABLE IF NOT EXISTS user_sanctions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      reason TEXT NOT NULL,
      points_removed REAL DEFAULT 0.0,
      duration_days INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      expires_at TEXT
    )
  `);

  

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_sanctions_user
    ON user_sanctions (user_id)
  `);

  // ============================================================
  // NOTAS - GLOBAL
  // ============================================================

  db.run(`
    CREATE TABLE IF NOT EXISTS user_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_user_notes_user
    ON user_notes (user_id)
  `);

  // ============================================================
  // SEGNALAZIONI - GLOBAL
  // ============================================================

  db.run(`
    CREATE TABLE IF NOT EXISTS user_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      operator_id TEXT NOT NULL,
      motivation TEXT NOT NULL,
      facts TEXT NOT NULL,
      success_server TEXT NOT NULL,
      evidence_file TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_user_reports_user
    ON user_reports (user_id)
  `);

  // ============================================================
  // TICKETS - POR SERVIDOR
  // ============================================================

  db.run(`
    CREATE TABLE IF NOT EXISTS ticket_configs (
      guild_id TEXT PRIMARY KEY,
      panel_channel_id TEXT NOT NULL,
      staff_role_id TEXT NOT NULL,
      next_number INTEGER NOT NULL DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      channel_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      ticket_number INTEGER NOT NULL,
      opener_id TEXT NOT NULL,
      category TEXT NOT NULL,
      claimed_by TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL
    )
  `);

  // ============================================================
  // LOGS - POR SERVIDOR
  // ============================================================

  db.run(`
    CREATE TABLE IF NOT EXISTS log_configs (
      guild_id TEXT PRIMARY KEY,
      log_channel_id TEXT NOT NULL
    )
  `);

  // ============================================================
  // PARTNERSHIPS - POR SERVIDOR
  // ============================================================

  db.run(`
    CREATE TABLE IF NOT EXISTS partnership_configs (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      role_id TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS partnership_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      guild_name TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      manager_id TEXT NOT NULL,
      ping_id TEXT,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL
        DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_partnership_guild_user
    ON partnership_submissions (guild_id, user_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_partnership_user
    ON partnership_submissions (user_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_partnership_guild
    ON partnership_submissions (guild_id)
  `);

  // ============================================================
  // CONFIGURACIÓN DE CANAL DE SEGNALAZIONI - POR SERVIDOR
  // ============================================================

  db.run(`
    CREATE TABLE IF NOT EXISTS report_configs (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL
    )
  `);
});

// ============================================================
// LOG CONFIG
// ============================================================

export function saveLogConfig(
  guildId: string,
  logChannelId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT OR REPLACE INTO log_configs (
        guild_id,
        log_channel_id
      )
      VALUES (?, ?)
      `,
      [guildId, logChannelId],
      (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      }
    );
  });
}

export function getLogConfig(
  guildId: string
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT log_channel_id
      FROM log_configs
      WHERE guild_id = ?
      `,
      [guildId],
      (
        err,
        row: { log_channel_id?: string } | undefined
      ) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(row?.log_channel_id ?? null);
      }
    );
  });
}

// ============================================================
// REPORT CONFIG
// ============================================================

export function saveReportConfig(
  guildId: string,
  channelId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT OR REPLACE INTO report_configs (
        guild_id,
        channel_id
      )
      VALUES (?, ?)
      `,
      [guildId, channelId],
      (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      }
    );
  });
}

export function getReportConfigs(): Promise<
  { guildId: string; channelId: string }[]
> {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT guild_id, channel_id
      FROM report_configs
      `,
      [],
      (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(
          (rows || []).map((row) => ({
            guildId: row.guild_id,
            channelId: row.channel_id,
          }))
        );
      }
    );
  });
}

// ============================================================
// HELPERS - SERVER REPORT CONFIG
// ============================================================

export function saveServerReportConfig(
  guildId: string,
  channelId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT OR REPLACE INTO server_report_configs (
        guild_id,
        channel_id
      )
      VALUES (?, ?)
      `,
      [guildId, channelId],
      (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      }
    );
  });
}

export function getServerReportConfigs(): Promise<
  { guildId: string; channelId: string }[]
> {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT guild_id, channel_id
      FROM server_report_configs
      `,
      [],
      (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(
          (rows || []).map((row) => ({
            guildId: row.guild_id,
            channelId: row.channel_id,
          }))
        );
      }
    );
  });
}

  // ============================================================
  // CONFIGURACIÓN DE CANAL DE SANCIONES - POR SERVIDOR
  // ============================================================

  db.run(`
    CREATE TABLE IF NOT EXISTS sanction_configs (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL
    )
  `);

// ============================================================
// SANCIONES - GLOBAL
// ============================================================

export function getSanctionConfigs(): Promise<
  { guildId: string; channelId: string }[]
> {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT guild_id, channel_id
      FROM sanction_configs
      `,
      [],
      (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(
          (rows || []).map((row) => ({
            guildId: row.guild_id,
            channelId: row.channel_id,
          }))
        );        
      }
    );
  });
}
export function saveSanctionConfig(
  guildId: string,
  channelId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT OR REPLACE INTO sanction_configs (
        guild_id,
        channel_id
      )
      VALUES (?, ?)
      `,
      [guildId, channelId],
      (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      }
    );
  });
}
