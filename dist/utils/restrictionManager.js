"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRestrictions = loadRestrictions;
exports.saveRestrictions = saveRestrictions;
exports.getRestriction = getRestriction;
exports.setRestriction = setRestriction;
exports.removeRestriction = removeRestriction;
exports.parseRestrictionDuration = parseRestrictionDuration;
exports.formatRestrictionDuration = formatRestrictionDuration;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.join(process.cwd(), 'data');
const RESTRICTIONS_FILE = path_1.default.join(DATA_DIR, 'restrictions.json');
/*
 * ============================================================
 * UTILITÀ
 * ============================================================
 */
function ensureDataDirectory() {
    if (!fs_1.default.existsSync(DATA_DIR)) {
        fs_1.default.mkdirSync(DATA_DIR, {
            recursive: true,
        });
    }
}
/*
 * ============================================================
 * CARICAMENTO
 * ============================================================
 */
function loadRestrictions() {
    ensureDataDirectory();
    if (!fs_1.default.existsSync(RESTRICTIONS_FILE)) {
        return {
            restrictions: [],
        };
    }
    try {
        const content = fs_1.default.readFileSync(RESTRICTIONS_FILE, 'utf8');
        const data = JSON.parse(content);
        if (!data ||
            !Array.isArray(data.restrictions)) {
            throw new Error('Formato di restrictions.json non valido.');
        }
        return {
            restrictions: data.restrictions.filter((restriction) => {
                if (!restriction ||
                    typeof restriction !== 'object') {
                    return false;
                }
                const record = restriction;
                return (typeof record.userId === 'string' &&
                    /^\d{17,20}$/.test(record.userId) &&
                    typeof record.userTag === 'string' &&
                    typeof record.motivo === 'string' &&
                    typeof record.durata === 'string' &&
                    typeof record.expiresAt === 'number' &&
                    Number.isFinite(record.expiresAt) &&
                    typeof record.operatorId === 'string' &&
                    typeof record.operatorTag === 'string' &&
                    typeof record.createdAt === 'number' &&
                    Number.isFinite(record.createdAt));
            }),
        };
    }
    catch (error) {
        console.error('[RESTRICTION] Impossibile leggere restrictions.json:', error);
        throw new Error('Impossibile leggere il database delle restrizioni.');
    }
}
/*
 * ============================================================
 * SALVATAGGIO
 * ============================================================
 */
function saveRestrictions(data) {
    ensureDataDirectory();
    const tempFile = `${RESTRICTIONS_FILE}.tmp`;
    fs_1.default.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs_1.default.renameSync(tempFile, RESTRICTIONS_FILE);
}
/*
 * ============================================================
 * CERCA RESTRIZIONE
 * ============================================================
 */
function getRestriction(userId) {
    const data = loadRestrictions();
    const restriction = data.restrictions.find((entry) => entry.userId === userId);
    if (!restriction) {
        return null;
    }
    /*
     * La restrizione è scaduta.
     *
     * La rimuoviamo automaticamente dal database.
     */
    if (restriction.expiresAt <=
        Date.now()) {
        data.restrictions =
            data.restrictions.filter((entry) => entry.userId !== userId);
        saveRestrictions(data);
        return null;
    }
    return restriction;
}
/*
 * ============================================================
 * AGGIUNGI / SOSTITUISCI RESTRIZIONE
 * ============================================================
 */
function setRestriction(restriction) {
    const data = loadRestrictions();
    data.restrictions =
        data.restrictions.filter((entry) => entry.userId !==
            restriction.userId);
    data.restrictions.push(restriction);
    saveRestrictions(data);
}
/*
 * ============================================================
 * RIMUOVI RESTRIZIONE
 * ============================================================
 */
function removeRestriction(userId) {
    const data = loadRestrictions();
    const originalLength = data.restrictions.length;
    data.restrictions =
        data.restrictions.filter((entry) => entry.userId !== userId);
    if (data.restrictions.length ===
        originalLength) {
        return false;
    }
    saveRestrictions(data);
    return true;
}
function parseRestrictionDuration(input) {
    const normalized = input
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
    const match = normalized.match(/^(\d+)\s*(min|mins|minuto|minutos|m|d|day|days|giorno|giorni|month|months|mese|mesi|y|year|years|anno|anni)$/);
    if (!match) {
        return null;
    }
    const value = Number.parseInt(match[1], 10);
    if (!Number.isInteger(value) ||
        value <= 0) {
        return null;
    }
    const unitInput = match[2];
    let unit;
    if (unitInput === 'min' ||
        unitInput === 'mins' ||
        unitInput === 'minuto' ||
        unitInput === 'minutos') {
        unit = 'min';
    }
    else if (unitInput === 'd' ||
        unitInput === 'day' ||
        unitInput === 'days' ||
        unitInput === 'giorno' ||
        unitInput === 'giorni') {
        unit = 'd';
    }
    else if (unitInput === 'm' ||
        unitInput === 'month' ||
        unitInput === 'months' ||
        unitInput === 'mese' ||
        unitInput === 'mesi') {
        unit = 'm';
    }
    else {
        unit = 'y';
    }
    const now = new Date();
    /*
     * MINUTI
     */
    if (unit === 'min') {
        return {
            value,
            unit,
            expiresAt: now.getTime() +
                value * 60 * 1000,
        };
    }
    /*
     * GIORNI
     */
    if (unit === 'd') {
        return {
            value,
            unit,
            expiresAt: now.getTime() +
                value *
                    24 *
                    60 *
                    60 *
                    1000,
        };
    }
    /*
     * MESI / ANNI
     */
    const expirationDate = new Date(now);
    if (unit === 'm') {
        expirationDate.setMonth(expirationDate.getMonth() +
            value);
    }
    else {
        expirationDate.setFullYear(expirationDate.getFullYear() +
            value);
    }
    return {
        value,
        unit,
        expiresAt: expirationDate.getTime(),
    };
}
/*
 * ============================================================
 * FORMAT DURATA
 * ============================================================
 */
function formatRestrictionDuration(parsed) {
    if (parsed.unit === 'min') {
        return `${parsed.value} minuto${parsed.value === 1 ? '' : 'i'}`;
    }
    if (parsed.unit === 'd') {
        return `${parsed.value} giorno${parsed.value === 1 ? '' : 'i'}`;
    }
    if (parsed.unit === 'm') {
        return `${parsed.value} mese${parsed.value === 1 ? '' : 'i'}`;
    }
    return `${parsed.value} anno${parsed.value === 1 ? '' : 'i'}`;
}
