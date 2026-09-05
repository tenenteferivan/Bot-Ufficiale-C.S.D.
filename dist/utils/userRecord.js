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
exports.addUserReport = addUserReport;
exports.getUserReports = getUserReports;
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
    if (!/^\d+(\.\d)?$/.test(normalized)) {
        return null;
    }
    const val = parseFloat(normalized);
    if (isNaN(val) || val <= 0) {
        return null;
    }
    return val;
}
function parseWarningDuration(input) {
    if (!input)
        return null;
    const match = input.trim().match(/^(\d+)\s*(d|g|giorni|days)$/i);
    if (!match) {
        return null;
    }
    const days = parseInt(match[1], 10);
    if (isNaN(days) || days < 1 || days > 30) {
        return null;
    }
    return days;
}
function getUserSanctions(userId) {
    return new Promise((resolve, reject) => {
        databasehandler_1.db.all(`
      SELECT *
      FROM user_sanctions
      WHERE user_id = ?
      ORDER BY id ASC
      `, [userId], (err, rows) => {
            if (err) {
                return reject(err);
            }
            if (!rows) {
                return resolve([]);
            }
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
async function getUserRecord(userId) {
    const reports = await getUserReports(userId);
    const notes = await new Promise((resolve, reject) => {
        databasehandler_1.db.all(`
      SELECT *
      FROM user_notes
      WHERE user_id = ?
      ORDER BY id ASC
      `, [userId], (err, rows) => {
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
        databasehandler_1.db.get(`
      SELECT *
      FROM user_records
      WHERE user_id = ?
      `, [userId], (err, row) => {
            if (err || !row) {
                resolve({
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
                    userId: row.user_id,
                    points: typeof row.points === 'number'
                        ? row.points
                        : 20.0,
                    maxPoints: typeof row.max_points === 'number'
                        ? row.max_points
                        : 20.0,
                    sanctionsHistory: row.sanctions_history ?? '',
                    notes: row.notes ?? '',
                    reports: row.reports ?? '',
                    status: row.status ?? '',
                });
            }
        });
    });
    const sanctions = await getUserSanctions(userId);
    const lines = sanctions.map((s) => {
        const formattedCreated = formatDate(s.createdAt);
        if (s.type === 'POINTS_REMOVAL') {
            return `• [${formattedCreated}] Rimozione di ${s.pointsRemoved.toFixed(1)} punti | Motivo: ${s.reason}`;
        }
        const formattedExpires = s.expiresAt
            ? formatDate(s.expiresAt)
            : 'N/A';
        return `• [${formattedCreated}] Avvertimento Formale (${s.durationDays}g) | Motivo: ${s.reason} | Scadenza: ${formattedExpires}`;
    });
    const compiledHistory = lines.length
        ? lines.join('\n')
        : (record.sanctionsHistory || '');
    const compiledReports = reports.length
        ? reports
            .map((r) => {
            const date = formatDate(r.createdAt);
            return (`• [${date}] Segnalazione #${r.id}\n` +
                `Motivzione: ${r.motivation}\n` +
                `Server: ${r.successServer}\n` +
                `Prove: ${r.evidenceFile}\n` +
                `Fatti: ${r.facts}`);
        })
            .join('\n\n')
        : '';
    return {
        ...record,
        sanctionsHistory: compiledHistory,
        notes: compiledNotes,
        reports: compiledReports,
    };
}
function updateUserPoints(userId, newPoints) {
    return new Promise((resolve, reject) => {
        databasehandler_1.db.run(`
      INSERT INTO user_records (
        user_id,
        points,
        max_points
      )
      VALUES (?, ?, 20.0)

      ON CONFLICT(user_id)
      DO UPDATE SET points = excluded.points
      `, [userId, newPoints], (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}
async function removePoints(userId, amount, reason) {
    const current = await getUserRecord(userId);
    const newPoints = Math.max(0, Math.round((current.points - amount) * 10) / 10);
    await updateUserPoints(userId, newPoints);
    const createdAt = new Date().toISOString();
    await new Promise((resolve, reject) => {
        databasehandler_1.db.run(`
      INSERT INTO user_sanctions (
        user_id,
        type,
        reason,
        points_removed,
        created_at
      )
      VALUES (?, 'POINTS_REMOVAL', ?, ?, ?)
      `, [
            userId,
            reason,
            amount,
            createdAt,
        ], (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
    return newPoints;
}
async function addPoints(userId, amount) {
    const current = await getUserRecord(userId);
    const newPoints = Math.min(current.maxPoints, Math.round((current.points + amount) * 10) / 10);
    await updateUserPoints(userId, newPoints);
    return newPoints;
}
async function addNote(userId, note) {
    return new Promise((resolve, reject) => {
        databasehandler_1.db.run(`
      INSERT INTO user_notes (
        user_id,
        note,
        created_at
      )
      VALUES (?, ?, ?)
      `, [
            userId,
            note,
            new Date().toISOString(),
        ], (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}
function addUserReport(userId, operatorId, motivation, facts, successServer, evidenceFile) {
    return new Promise((resolve, reject) => {
        databasehandler_1.db.run(`
      INSERT INTO user_reports (
        user_id,
        operator_id,
        motivation,
        facts,
        success_server,
        evidence_file,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
            userId,
            operatorId,
            motivation,
            facts,
            successServer,
            evidenceFile,
            new Date().toISOString(),
        ], function (err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.lastID);
        });
    });
}
function getUserReports(userId) {
    return new Promise((resolve, reject) => {
        databasehandler_1.db.all(`
      SELECT
        id,
        user_id,
        operator_id,
        motivation,
        facts,
        success_server,
        evidence_file,
        created_at
      FROM user_reports
      WHERE user_id = ?
      ORDER BY id ASC
      `, [userId], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve((rows || []).map((row) => ({
                id: row.id,
                userId: row.user_id,
                operatorId: row.operator_id,
                motivation: row.motivation,
                facts: row.facts,
                successServer: row.success_server,
                evidenceFile: row.evidence_file,
                createdAt: row.created_at,
            })));
        });
    });
}
async function addFormalWarning(userId, reason, durationDays) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() +
        durationDays * 24 * 60 * 60 * 1000);
    await new Promise((resolve, reject) => {
        databasehandler_1.db.run(`
      INSERT INTO user_sanctions (
        user_id,
        type,
        reason,
        duration_days,
        created_at,
        expires_at
      )
      VALUES (
        ?,
        'FORMAL_WARNING',
        ?,
        ?,
        ?,
        ?
      )
      `, [
            userId,
            reason,
            durationDays,
            now.toISOString(),
            expiresAt.toISOString(),
        ], (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
    return expiresAt;
}
async function createUserInfoEmbed(user, member) {
    /*
     * IMPORTANTE:
     * El registro del usuario es GLOBAL.
     *
     * Por eso NO usamos guildId para obtener:
     * - puntos
     * - máximo de puntos
     * - sanciones
     * - notas
     * - reports
     * - status
     *
     * El único dato dependiente del servidor aquí es:
     * "Entrato nel Server"
     */
    const record = await getUserRecord(user.id);
    const createdTimestamp = Math.floor(user.createdTimestamp / 1000);
    let joinedTimestamp = null;
    if (member &&
        'joinedTimestamp' in member &&
        typeof member.joinedTimestamp === 'number' &&
        member.joinedTimestamp) {
        joinedTimestamp = Math.floor(member.joinedTimestamp / 1000);
    }
    else if (member &&
        'joined_at' in member &&
        member.joined_at) {
        const parsed = new Date(member.joined_at).getTime();
        if (!isNaN(parsed)) {
            joinedTimestamp = Math.floor(parsed / 1000);
        }
    }
    const formattedPoints = `${(record.points ?? 20.0).toFixed(1)}/` +
        `${(record.maxPoints ?? 20.0).toFixed(1)}`;
    const sanctionsHistory = record.sanctionsHistory?.trim() || 'Nessuna';
    const notes = record.notes?.trim() || 'Nessuna';
    const reports = record.reports?.trim() || 'Nessuna';
    const status = record.status?.trim() || 'Nessuno';
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📋 Informazioni Utente & Registro — ${user.username}`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields({
        name: '👤 Nome Discord',
        value: user.globalName
            ? `${user.globalName} (\`${user.username}\`)`
            : user.username,
        inline: true,
    }, {
        name: '🏷️ Handle (@)',
        value: `@${user.username}`,
        inline: true,
    }, {
        name: '🆔 ID',
        value: `\`${user.id}\``,
        inline: true,
    }, {
        name: '📅 Creazione Account',
        value: `<t:${createdTimestamp}:F> ` +
            `(<t:${createdTimestamp}:R>)`,
        inline: true,
    }, {
        name: '📥 Entrato nel Server',
        value: joinedTimestamp
            ? `<t:${joinedTimestamp}:F> ` +
                `(<t:${joinedTimestamp}:R>)`
            : 'Non disponibile',
        inline: true,
    }, {
        name: '──────────────',
        value: '📁 **Registro Utente**',
        inline: false,
    }, {
        name: '📜 Storico Sanzioni',
        value: sanctionsHistory.slice(0, 1024),
        inline: false,
    }, {
        name: '🪙 Totale punti',
        value: `\`${formattedPoints}\``,
        inline: true,
    }, {
        name: '📝 Note',
        value: notes.slice(0, 1024),
        inline: true,
    }, {
        name: '🚨 Segnalazioni a Carico',
        value: reports.slice(0, 1024),
        inline: true,
    }, {
        name: '📌 Status',
        value: status.slice(0, 1024),
        inline: true,
    })
        .setFooter({
        text: 'Sistema Registro Utenti C.S.D.',
    })
        .setTimestamp();
    return embed;
}
