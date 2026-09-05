"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOperator = isOperator;
exports.parsePointAmount = parsePointAmount;
exports.parseWarningDuration = parseWarningDuration;
exports.getUserSanctions = getUserSanctions;
exports.getUserRecord = getUserRecord;
exports.updateUserPoints = updateUserPoints;
exports.removePoints = removePoints;
exports.addPoints = addPoints;
exports.addNote = addNote;
exports.addFormalWarning = addFormalWarning;
exports.createUserInfoEmbed = createUserInfoEmbed;
const discord_js_1 = require("discord.js");
const databasehandler_1 = require("../handlers/databasehandler");
function isOperator(member) {
    const operatorRoleId = process.env.OPERATOR_ID?.trim();
    if (!operatorRoleId || !member) {
        return false;
    }
    if (Array.isArray(member.roles)) {
        return member.roles.includes(operatorRoleId);
    }
    if (member.roles?.cache) {
        return member.roles.cache.has(operatorRoleId);
    }
    return false;
}
function parsePointAmount(input) {
    if (!input)
        return null;
    const normalized = input.trim().replace(',', '.');
    if (!/^\d+(\.\d)?$/.test(normalized))
        return null;
    const val = parseFloat(normalized);
    if (isNaN(val) || val <= 0)
        return null;
    return val;
}
function parseWarningDuration(input) {
    if (!input)
        return null;
    const match = input.trim().match(/^(\d+)\s*(d|g|giorni|days)$/i);
    if (!match)
        return null;
    const days = parseInt(match[1], 10);
    if (isNaN(days) || days < 1 || days > 30)
        return null;
    return days;
}
function getUserSanctions(guildId, userId) {
    return new Promise((resolve, reject) => {
        databasehandler_1.db.all('SELECT * FROM user_sanctions WHERE guild_id = ? AND user_id = ? ORDER BY id ASC', [guildId, userId], (err, rows) => {
            if (err)
                return reject(err);
            if (!rows)
                return resolve([]);
            const now = new Date();
            const activeRows = rows.filter((row) => {
                if (row.type === 'FORMAL_WARNING' && row.expires_at) {
                    const expires = new Date(row.expires_at);
                    return expires > now;
                }
                return true;
            });
            resolve(activeRows.map((row) => ({
                id: row.id,
                guildId: row.guild_id,
                userId: row.user_id,
                type: row.type,
                reason: row.reason,
                pointsRemoved: row.points_removed,
                durationDays: row.duration_days,
                createdAt: row.created_at,
                expiresAt: row.expires_at,
            })));
        });
    });
}
function formatDate(isoString) {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}
async function getUserRecord(guildId, userId) {
    const notes = await new Promise((resolve, reject) => {
        databasehandler_1.db.all(`SELECT * FROM user_notes
       WHERE guild_id = ? AND user_id = ?
       ORDER BY id ASC`, [guildId, userId], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows || []);
        });
    });
    const compiledNotes = notes.length
        ? notes
            .map((n) => `• [${formatDate(n.created_at)}] ${n.note}`)
            .join('\n')
        : '';
    const record = await new Promise((resolve) => {
        databasehandler_1.db.get('SELECT * FROM user_records WHERE guild_id = ? AND user_id = ?', [guildId, userId], (err, row) => {
            if (err || !row) {
                resolve({
                    guildId,
                    userId,
                    points: 20.0,
                    maxPoints: 20.0,
                    sanctionsHistory: '',
                    notes: '',
                    reports: '',
                    status: '',
                });
            }
            else {
                resolve({
                    guildId: row.guild_id,
                    userId: row.user_id,
                    points: typeof row.points === 'number' ? row.points : 20.0,
                    maxPoints: typeof row.max_points === 'number' ? row.max_points : 20.0,
                    sanctionsHistory: row.sanctions_history ?? '',
                    notes: row.notes ?? '',
                    reports: row.reports ?? '',
                    status: row.status ?? '',
                });
            }
        });
    });
    const sanctions = await getUserSanctions(guildId, userId);
    const lines = sanctions.map((s) => {
        const formattedCreated = formatDate(s.createdAt);
        if (s.type === 'POINTS_REMOVAL') {
            return `• [${formattedCreated}] Rimozione di ${s.pointsRemoved.toFixed(1)} punti | Motivo: ${s.reason}`;
        }
        else {
            const formattedExpires = s.expiresAt ? formatDate(s.expiresAt) : 'N/A';
            return `• [${formattedCreated}] Avvertimento Formale (${s.durationDays}g) | Motivo: ${s.reason} | Scadenza: ${formattedExpires}`;
        }
    });
    const compiledHistory = lines.length
        ? lines.join('\n')
        : (record.sanctionsHistory || '');
    return {
        ...record,
        sanctionsHistory: compiledHistory,
        notes: compiledNotes,
    };
}
function updateUserPoints(guildId, userId, newPoints) {
    return new Promise((resolve, reject) => {
        databasehandler_1.db.run(`INSERT INTO user_records (guild_id, user_id, points, max_points)
       VALUES (?, ?, ?, 20.0)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET points = excluded.points`, [guildId, userId, newPoints], (err) => (err ? reject(err) : resolve()));
    });
}
async function removePoints(guildId, userId, amount, reason) {
    const current = await getUserRecord(guildId, userId);
    const newPoints = Math.max(0, Math.round((current.points - amount) * 10) / 10);
    await updateUserPoints(guildId, userId, newPoints);
    const createdAt = new Date().toISOString();
    await new Promise((resolve, reject) => {
        databasehandler_1.db.run(`INSERT INTO user_sanctions (guild_id, user_id, type, reason, points_removed, created_at)
       VALUES (?, ?, 'POINTS_REMOVAL', ?, ?, ?)`, [guildId, userId, reason, amount, createdAt], (err) => (err ? reject(err) : resolve()));
    });
    return newPoints;
}
async function addPoints(guildId, userId, amount) {
    const current = await getUserRecord(guildId, userId);
    const newPoints = Math.min(current.maxPoints, Math.round((current.points + amount) * 10) / 10);
    await updateUserPoints(guildId, userId, newPoints);
    return newPoints;
}
async function addNote(guildId, userId, note) {
    return new Promise((resolve, reject) => {
        databasehandler_1.db.run(`INSERT INTO user_notes (guild_id, user_id, note, created_at)
       VALUES (?, ?, ?, ?)`, [guildId, userId, note, new Date().toISOString()], (err) => (err ? reject(err) : resolve()));
    });
}
async function addFormalWarning(guildId, userId, reason, durationDays) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    await new Promise((resolve, reject) => {
        databasehandler_1.db.run(`INSERT INTO user_sanctions (guild_id, user_id, type, reason, duration_days, created_at, expires_at)
       VALUES (?, ?, 'FORMAL_WARNING', ?, ?, ?, ?)`, [guildId, userId, reason, durationDays, now.toISOString(), expiresAt.toISOString()], (err) => (err ? reject(err) : resolve()));
    });
    return expiresAt;
}
async function createUserInfoEmbed(user, member, guildId) {
    const record = guildId ? await getUserRecord(guildId, user.id) : null;
    const createdTimestamp = Math.floor(user.createdTimestamp / 1000);
    let joinedTimestamp = null;
    if (member && 'joinedTimestamp' in member && typeof member.joinedTimestamp === 'number' && member.joinedTimestamp) {
        joinedTimestamp = Math.floor(member.joinedTimestamp / 1000);
    }
    else if (member && 'joined_at' in member && member.joined_at) {
        const parsed = new Date(member.joined_at).getTime();
        if (!isNaN(parsed)) {
            joinedTimestamp = Math.floor(parsed / 1000);
        }
    }
    const formattedPoints = `${(record?.points ?? 20.0).toFixed(1)}/${(record?.maxPoints ?? 20.0).toFixed(1)}`;
    const sanctionsHistory = record?.sanctionsHistory?.trim() || 'Nessuna';
    const notes = record?.notes?.trim() || 'Nessuna';
    const reports = record?.reports?.trim() || 'Nessuna';
    const status = record?.status?.trim() || 'Nessuno';
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📋 Informazioni Utente & Registro — ${user.username}`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields({ name: '👤 Nome Discord', value: user.globalName ? `${user.globalName} (\`${user.username}\`)` : user.username, inline: true }, { name: '🏷️ Handle (@)', value: `@${user.username}`, inline: true }, { name: '🆔 ID', value: `\`${user.id}\``, inline: true }, { name: '📅 Creazione Account', value: `<t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)`, inline: true }, { name: '📥 Entrato nel Server', value: joinedTimestamp ? `<t:${joinedTimestamp}:F> (<t:${joinedTimestamp}:R>)` : 'Non disponibile', inline: true }, { name: '──────────────', value: '📁 **Registro Utente**', inline: false }, { name: '📜 Storico Sanzioni', value: sanctionsHistory.slice(0, 1024), inline: false }, { name: '🪙 Totale punti', value: `\`${formattedPoints}\``, inline: true }, { name: '📝 Note', value: notes, inline: true }, { name: '🚨 Segnalazioni a Carico', value: reports, inline: true }, { name: '📌 Status', value: status, inline: true })
        .setFooter({ text: 'Sistema Registro Utenti C.S.D.' })
        .setTimestamp();
    return embed;
}
