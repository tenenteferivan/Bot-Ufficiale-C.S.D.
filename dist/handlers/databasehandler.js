"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.getUserProfile = getUserProfile;
exports.changeUserPoints = changeUserPoints;
exports.addUserNote = addUserNote;
exports.ensureLowPointsNote = ensureLowPointsNote;
exports.deleteUserNote = deleteUserNote;
exports.getSanctions = getSanctions;
exports.deleteSanctions = deleteSanctions;
exports.saveSanction = saveSanction;
const sqlite3 = __importStar(require("sqlite3"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'registro.sqlite');
exports.db = new sqlite3.Database(dbPath);
// Inizializzazione della tabella delle sanzioni
exports.db.serialize(() => {
    exports.db.run(`
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
    exports.db.run(`
    CREATE TABLE IF NOT EXISTS automod_whitelist (
      guildId TEXT NOT NULL,
      targetId TEXT NOT NULL,
      type TEXT NOT NULL,
      userId TEXT,
      PRIMARY KEY (guildId, targetId)
    )
  `);
    exports.db.run(`
    CREATE TABLE IF NOT EXISTS user_points (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      points REAL NOT NULL DEFAULT 15 CHECK (points >= 0 AND points <= 15),
      PRIMARY KEY (user_id, guild_id)
    )
  `);
    exports.db.run(`
    CREATE TABLE IF NOT EXISTS user_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      note TEXT NOT NULL,
      author_id TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
    )
  `);
    exports.db.run(`
    CREATE TABLE IF NOT EXISTS ticket_configs (
      guild_id TEXT PRIMARY KEY,
      panel_channel_id TEXT NOT NULL,
      staff_role_id TEXT NOT NULL,
      next_number INTEGER NOT NULL DEFAULT 1
    )
  `);
    exports.db.run(`
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
function ensureUserPoints(userId, guildId) {
    return new Promise((resolve, reject) => {
        exports.db.run('INSERT OR IGNORE INTO user_points (user_id, guild_id, points) VALUES (?, ?, 15)', [userId, guildId], (err) => (err ? reject(err) : resolve()));
    });
}
async function getUserProfile(userId, guildId) {
    await ensureUserPoints(userId, guildId);
    const points = await new Promise((resolve, reject) => {
        exports.db.get('SELECT points FROM user_points WHERE user_id = ? AND guild_id = ?', [userId, guildId], (err, row) => (err ? reject(err) : resolve(Number(row.points))));
    });
    const notes = await new Promise((resolve, reject) => {
        exports.db.all(`SELECT id, note, author_id AS authorId, timestamp
       FROM user_notes WHERE user_id = ? AND guild_id = ? ORDER BY timestamp DESC, id DESC`, [userId, guildId], (err, rows) => (err ? reject(err) : resolve(rows)));
    });
    return { points, notes };
}
function changeUserPoints(userId, guildId, delta) {
    return new Promise((resolve, reject) => {
        exports.db.serialize(() => {
            exports.db.run('INSERT OR IGNORE INTO user_points (user_id, guild_id, points) VALUES (?, ?, 15)', [userId, guildId], (insertError) => {
                if (insertError) {
                    reject(insertError);
                    return;
                }
                exports.db.run('UPDATE user_points SET points = points + ? WHERE user_id = ? AND guild_id = ? AND points + ? BETWEEN 0 AND 15', [delta, userId, guildId, delta], function (updateError) {
                    if (updateError)
                        reject(updateError);
                    else if (this.changes === 0)
                        reject(new Error('Il punteggio deve rimanere tra 0 e 15.'));
                    else {
                        exports.db.get('SELECT points FROM user_points WHERE user_id = ? AND guild_id = ?', [userId, guildId], (readError, row) => readError ? reject(readError) : resolve(Number(row.points)));
                    }
                });
            });
        });
    });
}
function addUserNote(userId, guildId, authorId, note) {
    return new Promise((resolve, reject) => {
        exports.db.run('INSERT INTO user_notes (user_id, guild_id, author_id, note) VALUES (?, ?, ?, ?)', [userId, guildId, authorId, note], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.lastID);
        });
    });
}
async function ensureLowPointsNote(userId, guildId, authorId) {
    const profile = await getUserProfile(userId, guildId);
    const requiredNote = 'Questo utente non può essere staff.';
    if (profile.points < 5 && !profile.notes.some((note) => note.note === requiredNote)) {
        await addUserNote(userId, guildId, authorId, requiredNote);
    }
}
function deleteUserNote(noteId, userId, guildId) {
    return new Promise((resolve, reject) => {
        exports.db.run('DELETE FROM user_notes WHERE id = ? AND user_id = ? AND guild_id = ?', [noteId, userId, guildId], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.changes > 0);
        });
    });
}
function getSanctions(userId, guildId) {
    return new Promise((resolve, reject) => {
        exports.db.all(`SELECT id, user_id AS userId, moderator_id AS moderatorId, guild_id AS guildId,
              type, reason, duration, timestamp
       FROM sanctions
       WHERE user_id = ? AND guild_id = ?
       ORDER BY timestamp ASC, id ASC`, [userId, guildId], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}
function deleteSanctions(userId, guildId) {
    return new Promise((resolve, reject) => {
        exports.db.run('DELETE FROM sanctions WHERE user_id = ? AND guild_id = ?', [userId, guildId], function (err) {
            if (err)
                reject(err);
            else
                resolve(this.changes);
        });
    });
}
function saveSanction(record) {
    return new Promise((resolve, reject) => {
        const query = `
      INSERT INTO sanctions (user_id, moderator_id, guild_id, type, reason, duration)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
        exports.db.run(query, [record.userId, record.moderatorId, record.guildId, record.type, record.reason, record.duration || null], (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
