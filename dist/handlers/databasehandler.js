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
exports.saveLogConfig = saveLogConfig;
exports.getLogConfig = getLogConfig;
exports.saveReportConfig = saveReportConfig;
exports.getReportConfigs = getReportConfigs;
exports.saveServerReportConfig = saveServerReportConfig;
exports.getServerReportConfigs = getServerReportConfigs;
exports.getSanctionConfigs = getSanctionConfigs;
exports.saveSanctionConfig = saveSanctionConfig;
const sqlite3 = __importStar(require("sqlite3"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const projectPaths_1 = require("../utils/projectPaths");
if (!fs.existsSync(projectPaths_1.dataDirectory)) {
    fs.mkdirSync(projectPaths_1.dataDirectory, { recursive: true });
}
exports.db = new sqlite3.Database(path.join(projectPaths_1.dataDirectory, 'registro.sqlite'));
exports.db.serialize(() => {
    // ============================================================
    // CONFIGURACIÓN GENERAL
    // ============================================================
    exports.db.run(`
 CREATE TABLE IF NOT EXISTS server_report_configs (
  guild_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL
  )
`);
    exports.db.run('PRAGMA foreign_keys = ON');
    // ============================================================
    // REGISTRO DE USUARIOS - GLOBAL
    // ============================================================
    exports.db.run(`
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
    exports.db.run(`
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
    exports.db.run(`
    CREATE INDEX IF NOT EXISTS idx_sanctions_user
    ON user_sanctions (user_id)
  `);
    // ============================================================
    // NOTAS - GLOBAL
    // ============================================================
    exports.db.run(`
    CREATE TABLE IF NOT EXISTS user_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
    exports.db.run(`
    CREATE INDEX IF NOT EXISTS idx_user_notes_user
    ON user_notes (user_id)
  `);
    // ============================================================
    // SEGNALAZIONI - GLOBAL
    // ============================================================
    exports.db.run(`
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
    exports.db.run(`
    CREATE INDEX IF NOT EXISTS idx_user_reports_user
    ON user_reports (user_id)
  `);
    // ============================================================
    // TICKETS - POR SERVIDOR
    // ============================================================
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
    // ============================================================
    // LOGS - POR SERVIDOR
    // ============================================================
    exports.db.run(`
    CREATE TABLE IF NOT EXISTS log_configs (
      guild_id TEXT PRIMARY KEY,
      log_channel_id TEXT NOT NULL
    )
  `);
    // ============================================================
    // PARTNERSHIPS - POR SERVIDOR
    // ============================================================
    exports.db.run(`
    CREATE TABLE IF NOT EXISTS partnership_configs (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      role_id TEXT NOT NULL
    )
  `);
    exports.db.run(`
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
    exports.db.run(`
    CREATE INDEX IF NOT EXISTS idx_partnership_guild_user
    ON partnership_submissions (guild_id, user_id)
  `);
    exports.db.run(`
    CREATE INDEX IF NOT EXISTS idx_partnership_user
    ON partnership_submissions (user_id)
  `);
    exports.db.run(`
    CREATE INDEX IF NOT EXISTS idx_partnership_guild
    ON partnership_submissions (guild_id)
  `);
    // ============================================================
    // CONFIGURACIÓN DE CANAL DE SEGNALAZIONI - POR SERVIDOR
    // ============================================================
    exports.db.run(`
    CREATE TABLE IF NOT EXISTS report_configs (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL
    )
  `);
});
// ============================================================
// LOG CONFIG
// ============================================================
function saveLogConfig(guildId, logChannelId) {
    return new Promise((resolve, reject) => {
        exports.db.run(`
      INSERT OR REPLACE INTO log_configs (
        guild_id,
        log_channel_id
      )
      VALUES (?, ?)
      `, [guildId, logChannelId], (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}
function getLogConfig(guildId) {
    return new Promise((resolve, reject) => {
        exports.db.get(`
      SELECT log_channel_id
      FROM log_configs
      WHERE guild_id = ?
      `, [guildId], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(row?.log_channel_id ?? null);
        });
    });
}
// ============================================================
// REPORT CONFIG
// ============================================================
function saveReportConfig(guildId, channelId) {
    return new Promise((resolve, reject) => {
        exports.db.run(`
      INSERT OR REPLACE INTO report_configs (
        guild_id,
        channel_id
      )
      VALUES (?, ?)
      `, [guildId, channelId], (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}
function getReportConfigs() {
    return new Promise((resolve, reject) => {
        exports.db.all(`
      SELECT guild_id, channel_id
      FROM report_configs
      `, [], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve((rows || []).map((row) => ({
                guildId: row.guild_id,
                channelId: row.channel_id,
            })));
        });
    });
}
// ============================================================
// HELPERS - SERVER REPORT CONFIG
// ============================================================
function saveServerReportConfig(guildId, channelId) {
    return new Promise((resolve, reject) => {
        exports.db.run(`
      INSERT OR REPLACE INTO server_report_configs (
        guild_id,
        channel_id
      )
      VALUES (?, ?)
      `, [guildId, channelId], (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}
function getServerReportConfigs() {
    return new Promise((resolve, reject) => {
        exports.db.all(`
      SELECT guild_id, channel_id
      FROM server_report_configs
      `, [], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve((rows || []).map((row) => ({
                guildId: row.guild_id,
                channelId: row.channel_id,
            })));
        });
    });
}
// ============================================================
// CONFIGURACIÓN DE CANAL DE SANCIONES - POR SERVIDOR
// ============================================================
exports.db.run(`
    CREATE TABLE IF NOT EXISTS sanction_configs (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL
    )
  `);
// ============================================================
// SANCIONES - GLOBAL
// ============================================================
function getSanctionConfigs() {
    return new Promise((resolve, reject) => {
        exports.db.all(`
      SELECT guild_id, channel_id
      FROM sanction_configs
      `, [], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve((rows || []).map((row) => ({
                guildId: row.guild_id,
                channelId: row.channel_id,
            })));
        });
    });
}
function saveSanctionConfig(guildId, channelId) {
    return new Promise((resolve, reject) => {
        exports.db.run(`
      INSERT OR REPLACE INTO sanction_configs (
        guild_id,
        channel_id
      )
      VALUES (?, ?)
      `, [guildId, channelId], (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}
