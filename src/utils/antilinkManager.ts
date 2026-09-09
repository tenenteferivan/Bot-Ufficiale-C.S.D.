import fs from 'fs';
import path from 'path';

export interface AntiLinkConfig {
  enabled: boolean;
  whitelistedUsers: string[];
  whitelistedRoles: string[];
}

interface AntiLinkData {
  guilds: Record<string, AntiLinkConfig>;
}

const DATA_DIR = path.resolve(__dirname, '../../data');
const FILE_PATH = path.join(DATA_DIR, 'antilink.json');

function ensureDataDirectory(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function createDefaultConfig(): AntiLinkConfig {
  return { enabled: false, whitelistedUsers: [], whitelistedRoles: [] };
}

function saveData(data: AntiLinkData): void {
  ensureDataDirectory();
  const temporaryPath = `${FILE_PATH}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(temporaryPath, FILE_PATH);
}

function loadData(): AntiLinkData {
  ensureDataDirectory();
  if (!fs.existsSync(FILE_PATH)) {
    const emptyData = { guilds: {} };
    saveData(emptyData);
    return emptyData;
  }

  const raw = fs.readFileSync(FILE_PATH, 'utf8').trim();
  if (!raw) {
    const emptyData = { guilds: {} };
    saveData(emptyData);
    return emptyData;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error('[ANTILINK] JSON corrotto in antilink.json:', error);
    throw new Error('Il file antilink.json contiene JSON non valido.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
    !('guilds' in parsed) || !parsed.guilds || typeof parsed.guilds !== 'object' || Array.isArray(parsed.guilds)) {
    console.error('[ANTILINK] Struttura non valida in antilink.json.');
    throw new Error('La struttura di antilink.json non è valida.');
  }

  const guilds: Record<string, AntiLinkConfig> = {};
  for (const [guildId, value] of Object.entries(parsed.guilds)) {
    const config = value as Partial<AntiLinkConfig>;
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

function getCachedConfig(guildId: string): AntiLinkConfig {
  if (!cachedData.guilds[guildId]) {
    cachedData.guilds[guildId] = createDefaultConfig();
  }
  return cachedData.guilds[guildId];
}

export function getAntiLinkConfig(guildId: string): AntiLinkConfig {
  return getCachedConfig(guildId);
}

export function setAntiLinkEnabled(guildId: string, enabled: boolean): void {
  getCachedConfig(guildId).enabled = enabled;
  saveData(cachedData);
}

export function addWhitelistedUser(guildId: string, userId: string): boolean {
  const users = getCachedConfig(guildId).whitelistedUsers;
  if (users.includes(userId)) return false;
  users.push(userId);
  saveData(cachedData);
  return true;
}

export function removeWhitelistedUser(guildId: string, userId: string): boolean {
  const users = getCachedConfig(guildId).whitelistedUsers;
  const index = users.indexOf(userId);
  if (index === -1) return false;
  users.splice(index, 1);
  saveData(cachedData);
  return true;
}

export function addWhitelistedRole(guildId: string, roleId: string): boolean {
  const roles = getCachedConfig(guildId).whitelistedRoles;
  if (roles.includes(roleId)) return false;
  roles.push(roleId);
  saveData(cachedData);
  return true;
}

export function removeWhitelistedRole(guildId: string, roleId: string): boolean {
  const roles = getCachedConfig(guildId).whitelistedRoles;
  const index = roles.indexOf(roleId);
  if (index === -1) return false;
  roles.splice(index, 1);
  saveData(cachedData);
  return true;
}
