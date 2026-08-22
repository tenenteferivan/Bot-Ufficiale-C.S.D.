import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'registro.sqlite');
export const db = new sqlite3.Database(dbPath);

// Inizializzazione della tabella delle sanzioni
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS sanctions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      type TEXT NOT NULL,
      reason TEXT NOT NULL,
      duration TEXT,
      timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS automod_whitelist (
      guildId TEXT NOT NULL,
      targetId TEXT NOT NULL,
      type TEXT NOT NULL,
      userId TEXT,
      PRIMARY KEY (guildId, targetId)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_points (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      points REAL NOT NULL DEFAULT 15 CHECK (points >= 0 AND points <= 15),
      PRIMARY KEY (user_id, guild_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      note TEXT NOT NULL,
      author_id TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
    )
  `);

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
});

export interface SanctionRecord {
  userId: string;
  moderatorId: string;
  guildId: string;
  type: 'BAN' | 'UNBAN' | 'KICK' | 'TIMEOUT' | 'UNTIMEOUT' | 'WARN' | 'UNWARN' | 'AUTOMOD' | 'PUNTI_AGGIUNTI' | 'PUNTI_RIMOSSI';
  reason: string;
  duration?: string | null;
}

export interface SanctionRow extends SanctionRecord {
  id: number;
  timestamp: string;
}

export interface UserNote {
  id: number;
  note: string;
  authorId: string;
  timestamp: string;
}

export interface UserProfile {
  points: number;
  notes: UserNote[];
}

function ensureUserPoints(userId: string, guildId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR IGNORE INTO user_points (user_id, guild_id, points) VALUES (?, ?, 15)',
      [userId, guildId],
      (err) => (err ? reject(err) : resolve())
    );
  });
}

export async function getUserProfile(userId: string, guildId: string): Promise<UserProfile> {
  await ensureUserPoints(userId, guildId);

  const points = await new Promise<number>((resolve, reject) => {
    db.get(
      'SELECT points FROM user_points WHERE user_id = ? AND guild_id = ?',
      [userId, guildId],
      (err, row: any) => (err ? reject(err) : resolve(Number(row.points)))
    );
  });

  const notes = await new Promise<UserNote[]>((resolve, reject) => {
    db.all(
      `SELECT id, note, author_id AS authorId, timestamp
       FROM user_notes WHERE user_id = ? AND guild_id = ? ORDER BY timestamp DESC, id DESC`,
      [userId, guildId],
      (err, rows) => (err ? reject(err) : resolve(rows as UserNote[]))
    );
  });

  return { points, notes };
}

export function changeUserPoints(userId: string, guildId: string, delta: number): Promise<number> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        'INSERT OR IGNORE INTO user_points (user_id, guild_id, points) VALUES (?, ?, 15)',
        [userId, guildId],
        (insertError) => {
          if (insertError) {
            reject(insertError);
            return;
          }

          db.run(
            'UPDATE user_points SET points = points + ? WHERE user_id = ? AND guild_id = ? AND points + ? BETWEEN 0 AND 15',
            [delta, userId, guildId, delta],
            function (updateError) {
              if (updateError) reject(updateError);
              else if (this.changes === 0) reject(new Error('Il punteggio deve rimanere tra 0 e 15.'));
              else {
                db.get(
                  'SELECT points FROM user_points WHERE user_id = ? AND guild_id = ?',
                  [userId, guildId],
                  (readError, row: any) => readError ? reject(readError) : resolve(Number(row.points))
                );
              }
            }
          );
        }
      );
    });
  });
}

export function addUserNote(userId: string, guildId: string, authorId: string, note: string): Promise<number> {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO user_notes (user_id, guild_id, author_id, note) VALUES (?, ?, ?, ?)',
      [userId, guildId, authorId, note],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

export async function ensureLowPointsNote(userId: string, guildId: string, authorId: string): Promise<void> {
  const profile = await getUserProfile(userId, guildId);
  const requiredNote = 'Questo utente non può essere staff.';
  if (profile.points < 5 && !profile.notes.some((note) => note.note === requiredNote)) {
    await addUserNote(userId, guildId, authorId, requiredNote);
  }
}

export function deleteUserNote(noteId: number, userId: string, guildId: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM user_notes WHERE id = ? AND user_id = ? AND guild_id = ?',
      [noteId, userId, guildId],
      function (err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

export function getSanctions(userId: string, guildId: string): Promise<SanctionRow[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, user_id AS userId, moderator_id AS moderatorId, guild_id AS guildId,
              type, reason, duration, timestamp
       FROM sanctions
       WHERE user_id = ? AND guild_id = ?
       ORDER BY timestamp ASC, id ASC`,
      [userId, guildId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows as SanctionRow[]);
      }
    );
  });
}

export function deleteSanctions(userId: string, guildId: string): Promise<number> {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM sanctions WHERE user_id = ? AND guild_id = ?',
      [userId, guildId],
      function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

export function saveSanction(record: SanctionRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO sanctions (user_id, moderator_id, guild_id, type, reason, duration)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.run(
      query,
      [record.userId, record.moderatorId, record.guildId, record.type, record.reason, record.duration || null],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}
