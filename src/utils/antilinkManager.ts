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
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
      recursive: true,
    });
  }
}

function loadData(): AntiLinkData {
  ensureDataDirectory();

  if (!fs.existsSync(FILE_PATH)) {
    const data: AntiLinkData = {
      guilds: {},
    };

    fs.writeFileSync(
      FILE_PATH,
      JSON.stringify(data, null, 2),
      'utf8'
    );

    return data;
  }

  const raw = fs
    .readFileSync(FILE_PATH, 'utf8')
    .trim();

  if (!raw) {
    return {
      guilds: {},
    };
  }

  return JSON.parse(raw) as AntiLinkData;
}

function saveData(data: AntiLinkData): void {
  ensureDataDirectory();

  fs.writeFileSync(
    FILE_PATH,
    JSON.stringify(data, null, 2),
    'utf8'
  );
}

function createDefaultConfig(): AntiLinkConfig {
  return {
    enabled: false,
    whitelistedUsers: [],
    whitelistedRoles: [],
  };
}

export function getAntiLinkConfig(
  guildId: string
): AntiLinkConfig {
  const data = loadData();

  if (!data.guilds[guildId]) {
    data.guilds[guildId] =
      createDefaultConfig();

    saveData(data);
  }

  return data.guilds[guildId];
}

export function setAntiLinkEnabled(
  guildId: string,
  enabled: boolean
): void {
  const data = loadData();

  if (!data.guilds[guildId]) {
    data.guilds[guildId] =
      createDefaultConfig();
  }

  data.guilds[guildId].enabled =
    enabled;

  saveData(data);
}

export function addWhitelistedUser(
  guildId: string,
  userId: string
): boolean {
  const data = loadData();

  if (!data.guilds[guildId]) {
    data.guilds[guildId] =
      createDefaultConfig();
  }

  const users =
    data.guilds[guildId]
      .whitelistedUsers;

  if (users.includes(userId)) {
    return false;
  }

  users.push(userId);

  saveData(data);

  return true;
}

export function removeWhitelistedUser(
  guildId: string,
  userId: string
): boolean {
  const data = loadData();

  if (!data.guilds[guildId]) {
    data.guilds[guildId] =
      createDefaultConfig();
  }

  const users =
    data.guilds[guildId]
      .whitelistedUsers;

  const index =
    users.indexOf(userId);

  if (index === -1) {
    return false;
  }

  users.splice(index, 1);

  saveData(data);

  return true;
}

export function addWhitelistedRole(
  guildId: string,
  roleId: string
): boolean {
  const data = loadData();

  if (!data.guilds[guildId]) {
    data.guilds[guildId] =
      createDefaultConfig();
  }

  const roles =
    data.guilds[guildId]
      .whitelistedRoles;

  if (roles.includes(roleId)) {
    return false;
  }

  roles.push(roleId);

  saveData(data);

  return true;
}

export function removeWhitelistedRole(
  guildId: string,
  roleId: string
): boolean {
  const data = loadData();

  if (!data.guilds[guildId]) {
    data.guilds[guildId] =
      createDefaultConfig();
  }

  const roles =
    data.guilds[guildId]
      .whitelistedRoles;

  const index =
    roles.indexOf(roleId);

  if (index === -1) {
    return false;
  }

  roles.splice(index, 1);

  saveData(data);

  return true;
}