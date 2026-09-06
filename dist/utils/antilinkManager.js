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
    if (!fs_1.default.existsSync(DATA_DIR)) {
        fs_1.default.mkdirSync(DATA_DIR, {
            recursive: true,
        });
    }
}
function loadData() {
    ensureDataDirectory();
    if (!fs_1.default.existsSync(FILE_PATH)) {
        const data = {
            guilds: {},
        };
        fs_1.default.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
        return data;
    }
    const raw = fs_1.default
        .readFileSync(FILE_PATH, 'utf8')
        .trim();
    if (!raw) {
        return {
            guilds: {},
        };
    }
    return JSON.parse(raw);
}
function saveData(data) {
    ensureDataDirectory();
    fs_1.default.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
}
function createDefaultConfig() {
    return {
        enabled: false,
        whitelistedUsers: [],
        whitelistedRoles: [],
    };
}
function getAntiLinkConfig(guildId) {
    const data = loadData();
    if (!data.guilds[guildId]) {
        data.guilds[guildId] =
            createDefaultConfig();
        saveData(data);
    }
    return data.guilds[guildId];
}
function setAntiLinkEnabled(guildId, enabled) {
    const data = loadData();
    if (!data.guilds[guildId]) {
        data.guilds[guildId] =
            createDefaultConfig();
    }
    data.guilds[guildId].enabled =
        enabled;
    saveData(data);
}
function addWhitelistedUser(guildId, userId) {
    const data = loadData();
    if (!data.guilds[guildId]) {
        data.guilds[guildId] =
            createDefaultConfig();
    }
    const users = data.guilds[guildId]
        .whitelistedUsers;
    if (users.includes(userId)) {
        return false;
    }
    users.push(userId);
    saveData(data);
    return true;
}
function removeWhitelistedUser(guildId, userId) {
    const data = loadData();
    if (!data.guilds[guildId]) {
        data.guilds[guildId] =
            createDefaultConfig();
    }
    const users = data.guilds[guildId]
        .whitelistedUsers;
    const index = users.indexOf(userId);
    if (index === -1) {
        return false;
    }
    users.splice(index, 1);
    saveData(data);
    return true;
}
function addWhitelistedRole(guildId, roleId) {
    const data = loadData();
    if (!data.guilds[guildId]) {
        data.guilds[guildId] =
            createDefaultConfig();
    }
    const roles = data.guilds[guildId]
        .whitelistedRoles;
    if (roles.includes(roleId)) {
        return false;
    }
    roles.push(roleId);
    saveData(data);
    return true;
}
function removeWhitelistedRole(guildId, roleId) {
    const data = loadData();
    if (!data.guilds[guildId]) {
        data.guilds[guildId] =
            createDefaultConfig();
    }
    const roles = data.guilds[guildId]
        .whitelistedRoles;
    const index = roles.indexOf(roleId);
    if (index === -1) {
        return false;
    }
    roles.splice(index, 1);
    saveData(data);
    return true;
}
