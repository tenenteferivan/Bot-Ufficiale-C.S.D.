"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAntiLinkConfig = getAntiLinkConfig;
exports.setAntiLinkEnabled = setAntiLinkEnabled;
exports.addWhitelistedUser = addWhitelistedUser;
exports.removeWhitelistedUser = removeWhitelistedUser;
exports.addWhitelistedRole = addWhitelistedRole;
exports.removeWhitelistedRole = removeWhitelistedRole;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.resolve(__dirname, '../../data');
const FILE_PATH = path_1.default.join(DATA_DIR, 'antilink.json');
function ensureDataDirectory() {
    if (!fs_1.default.existsSync(DATA_DIR))
        fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
}
function createDefaultConfig() {
    return { enabled: false, whitelistedUsers: [], whitelistedRoles: [] };
}
function saveData(data) {
    ensureDataDirectory();
    const temporaryPath = `${FILE_PATH}.tmp`;
    fs_1.default.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), 'utf8');
    fs_1.default.renameSync(temporaryPath, FILE_PATH);
}
function loadData() {
    ensureDataDirectory();
    if (!fs_1.default.existsSync(FILE_PATH)) {
        const emptyData = { guilds: {} };
        saveData(emptyData);
        return emptyData;
    }
    const raw = fs_1.default.readFileSync(FILE_PATH, 'utf8').trim();
    if (!raw) {
        const emptyData = { guilds: {} };
        saveData(emptyData);
        return emptyData;
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch (error) {
        console.error('[ANTILINK] JSON corrotto in antilink.json:', error);
        throw new Error('Il file antilink.json contiene JSON non valido.');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
        !('guilds' in parsed) || !parsed.guilds || typeof parsed.guilds !== 'object' || Array.isArray(parsed.guilds)) {
        console.error('[ANTILINK] Struttura non valida in antilink.json.');
        throw new Error('La struttura di antilink.json non è valida.');
    }
    const guilds = {};
    for (const [guildId, value] of Object.entries(parsed.guilds)) {
        const config = value;
        if (typeof config.enabled !== 'boolean' ||
            !Array.isArray(config.whitelistedUsers) ||
            !Array.isArray(config.whitelistedRoles) ||
            !config.whitelistedUsers.every((id) => typeof id === 'string') ||
            !config.whitelistedRoles.every((id) => typeof id === 'string')) {
            console.error(`[ANTILINK] Configurazione non valida per la guild ${guildId}.`);
            throw new Error('La struttura di antilink.json non è valida.');
        }
        guilds[guildId] = {
            enabled: config.enabled,
            whitelistedUsers: [...config.whitelistedUsers],
            whitelistedRoles: [...config.whitelistedRoles],
        };
    }
    return { guilds };
}
const cachedData = loadData();
function getCachedConfig(guildId) {
    if (!cachedData.guilds[guildId]) {
        cachedData.guilds[guildId] = createDefaultConfig();
    }
    return cachedData.guilds[guildId];
}
function getAntiLinkConfig(guildId) {
    return getCachedConfig(guildId);
}
function setAntiLinkEnabled(guildId, enabled) {
    getCachedConfig(guildId).enabled = enabled;
    saveData(cachedData);
}
function addWhitelistedUser(guildId, userId) {
    const users = getCachedConfig(guildId).whitelistedUsers;
    if (users.includes(userId))
        return false;
    users.push(userId);
    saveData(cachedData);
    return true;
}
function removeWhitelistedUser(guildId, userId) {
    const users = getCachedConfig(guildId).whitelistedUsers;
    const index = users.indexOf(userId);
    if (index === -1)
        return false;
    users.splice(index, 1);
    saveData(cachedData);
    return true;
}
function addWhitelistedRole(guildId, roleId) {
    const roles = getCachedConfig(guildId).whitelistedRoles;
    if (roles.includes(roleId))
        return false;
    roles.push(roleId);
    saveData(cachedData);
    return true;
}
function removeWhitelistedRole(guildId, roleId) {
    const roles = getCachedConfig(guildId).whitelistedRoles;
    const index = roles.indexOf(roleId);
    if (index === -1)
        return false;
    roles.splice(index, 1);
    saveData(cachedData);
    return true;
}
