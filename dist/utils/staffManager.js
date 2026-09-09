"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOperatore = isOperatore;
exports.isDirigenza = isDirigenza;
exports.addOperatore = addOperatore;
exports.removeOperatore = removeOperatore;
exports.addDirigenza = addDirigenza;
exports.removeDirigenza = removeDirigenza;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.resolve(__dirname, '../../data');
const FILE_PATH = path_1.default.join(DATA_DIR, 'staff.json');
function ensureDataDirectory() {
    if (!fs_1.default.existsSync(DATA_DIR)) {
        fs_1.default.mkdirSync(DATA_DIR, {
            recursive: true,
        });
    }
}
function loadStaff() {
    ensureDataDirectory();
    if (!fs_1.default.existsSync(FILE_PATH)) {
        const data = {
            operatori: [],
            dirigenza: [],
        };
        fs_1.default.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
        return data;
    }
    const raw = fs_1.default.readFileSync(FILE_PATH, 'utf8').trim();
    if (!raw) {
        const emptyData = {
            operatori: [],
            dirigenza: [],
        };
        saveStaff(emptyData);
        return emptyData;
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch (error) {
        console.error('[STAFF] JSON corrotto in staff.json:', error);
        throw new Error('Il file staff.json contiene JSON non valido.');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
        !('operatori' in parsed) || !('dirigenza' in parsed) ||
        !Array.isArray(parsed.operatori) || !Array.isArray(parsed.dirigenza) ||
        !parsed.operatori.every((id) => typeof id === 'string') ||
        !parsed.dirigenza.every((id) => typeof id === 'string')) {
        console.error('[STAFF] Struttura non valida in staff.json.');
        throw new Error('La struttura di staff.json non è valida.');
    }
    return { operatori: [...parsed.operatori], dirigenza: [...parsed.dirigenza] };
}
function saveStaff(data) {
    ensureDataDirectory();
    const temporaryPath = `${FILE_PATH}.tmp`;
    fs_1.default.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), 'utf8');
    fs_1.default.renameSync(temporaryPath, FILE_PATH);
}
function isOperatore(userId) {
    const data = loadStaff();
    return data.operatori.includes(userId);
}
function isDirigenza(userId) {
    const data = loadStaff();
    return data.dirigenza.includes(userId);
}
function addOperatore(userId) {
    const data = loadStaff();
    if (data.operatori.includes(userId)) {
        return false;
    }
    data.operatori.push(userId);
    saveStaff(data);
    return true;
}
function removeOperatore(userId) {
    const data = loadStaff();
    const index = data.operatori.indexOf(userId);
    if (index === -1) {
        return false;
    }
    data.operatori.splice(index, 1);
    saveStaff(data);
    return true;
}
function addDirigenza(userId) {
    const data = loadStaff();
    if (data.dirigenza.includes(userId)) {
        return false;
    }
    data.dirigenza.push(userId);
    saveStaff(data);
    return true;
}
function removeDirigenza(userId) {
    const data = loadStaff();
    const index = data.dirigenza.indexOf(userId);
    if (index === -1) {
        return false;
    }
    data.dirigenza.splice(index, 1);
    saveStaff(data);
    return true;
}
