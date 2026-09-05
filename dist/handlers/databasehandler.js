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
const sqlite3 = __importStar(require("sqlite3"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const projectPaths_1 = require("../utils/projectPaths");
if (!fs.existsSync(projectPaths_1.dataDirectory)) {
    fs.mkdirSync(projectPaths_1.dataDirectory, { recursive: true });
}
exports.db = new sqlite3.Database(path.join(projectPaths_1.dataDirectory, 'registro.sqlite'));
exports.db.serialize(() => {
    exports.db.run(`CREATE TABLE IF NOT EXISTS user_records (
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
    exports.db.run(`CREATE TABLE IF NOT EXISTS user_sanctions (
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
    exports.db.run('CREATE INDEX IF NOT EXISTS idx_sanctions_guild_user ON user_sanctions (guild_id, user_id)');
    exports.db.run(`CREATE TABLE IF NOT EXISTS automod_configs (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0
  )`);
    exports.db.run(`CREATE TABLE IF NOT EXISTS ticket_configs (
    guild_id TEXT PRIMARY KEY,
    panel_channel_id TEXT NOT NULL,
    staff_role_id TEXT NOT NULL,
    next_number INTEGER NOT NULL DEFAULT 1
  )`);
    exports.db.run(`CREATE TABLE IF NOT EXISTS tickets (
    channel_id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    ticket_number INTEGER NOT NULL,
    opener_id TEXT NOT NULL,
    category TEXT NOT NULL,
    claimed_by TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL
  )`);
    exports.db.run(`
  CREATE TABLE IF NOT EXISTS user_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);
    exports.db.run(`CREATE TABLE IF NOT EXISTS log_configs (
    guild_id TEXT PRIMARY KEY,
    log_channel_id TEXT NOT NULL
  )`);
    exports.db.run(`CREATE TABLE IF NOT EXISTS partnership_configs (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    role_id TEXT NOT NULL
  )`);
    exports.db.run(`CREATE TABLE IF NOT EXISTS partnership_submissions (
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
    exports.db.run('CREATE INDEX IF NOT EXISTS idx_partnership_guild_user ON partnership_submissions (guild_id, user_id)');
    exports.db.run('CREATE INDEX IF NOT EXISTS idx_partnership_user ON partnership_submissions (user_id)');
    exports.db.run('CREATE INDEX IF NOT EXISTS idx_partnership_guild ON partnership_submissions (guild_id)');
});
function saveLogConfig(guildId, logChannelId) {
    return new Promise((resolve, reject) => {
        exports.db.run('INSERT OR REPLACE INTO log_configs (guild_id, log_channel_id) VALUES (?, ?)', [guildId, logChannelId], (err) => (err ? reject(err) : resolve()));
    });
}
function getLogConfig(guildId) {
    return new Promise((resolve, reject) => {
        exports.db.get('SELECT log_channel_id FROM log_configs WHERE guild_id = ?', [guildId], (err, row) => (err ? reject(err) : resolve(row?.log_channel_id ?? null)));
    });
}
