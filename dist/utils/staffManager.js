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
        return {
            operatori: [],
            dirigenza: [],
        };
    }
    return JSON.parse(raw);
}
function saveStaff(data) {
    ensureDataDirectory();
    fs_1.default.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
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
