import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { dataDirectory } from '../utils/projectPaths';

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

export const db = new sqlite3.Database(path.join(dataDirectory, 'registro.sqlite'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS user_records (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    points REAL NOT NULL DEFAULT 20.0,
    max_points REAL NOT NULL DEFAULT 20.0,
    sanctions_history TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    reports TEXT DEFAULT '',
    status TEXT DEFAULT '',
    PRIMARY KEY (guild_id, user_id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS user_sanctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    reason TEXT NOT NULL,
    points_removed REAL DEFAULT 0.0,
    duration_days INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    expires_at TEXT
  )`);
  db.run('CREATE INDEX IF NOT EXISTS idx_sanctions_guild_user ON user_sanctions (guild_id, user_id)');
  db.run(`CREATE TABLE IF NOT EXISTS automod_configs (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ticket_configs (
    guild_id TEXT PRIMARY KEY,
    panel_channel_id TEXT NOT NULL,
    staff_role_id TEXT NOT NULL,
    next_number INTEGER NOT NULL DEFAULT 1
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS tickets (
    channel_id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    ticket_number INTEGER NOT NULL,
    opener_id TEXT NOT NULL,
    category TEXT NOT NULL,
    claimed_by TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL
  )`);
  db.run(`
  CREATE TABLE IF NOT EXISTS user_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);
  db.run(`CREATE TABLE IF NOT EXISTS log_configs (
    guild_id TEXT PRIMARY KEY,
    log_channel_id TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS partnership_configs (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    role_id TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS partnership_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    guild_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    manager_id TEXT NOT NULL,
    ping_id TEXT,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
  )`);
  db.run('CREATE INDEX IF NOT EXISTS idx_partnership_guild_user ON partnership_submissions (guild_id, user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_partnership_user ON partnership_submissions (user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_partnership_guild ON partnership_submissions (guild_id)');
});

export function saveLogConfig(guildId: string, logChannelId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run('INSERT OR REPLACE INTO log_configs (guild_id, log_channel_id) VALUES (?, ?)', [guildId, logChannelId], (err) => (err ? reject(err) : resolve()));
  });
}

export function getLogConfig(guildId: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    db.get('SELECT log_channel_id FROM log_configs WHERE guild_id = ?', [guildId], (err, row: { log_channel_id?: string } | undefined) => (err ? reject(err) : resolve(row?.log_channel_id ?? null)));
  });
}
