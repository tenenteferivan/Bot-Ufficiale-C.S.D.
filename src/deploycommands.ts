import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';

interface CommandModule {
  data: SlashCommandBuilder;
  execute: Function;
}

function getCommandModules(commandModule: unknown): CommandModule[] {
  if (Array.isArray(commandModule)) {
    return commandModule.flatMap((module) => getCommandModules(module));
  }

  if (!commandModule || typeof commandModule !== 'object') {
    return [];
  }

  const moduleRecord = commandModule as Record<string, unknown>;
  if (moduleRecord.default) {
    const defaultModules = getCommandModules(moduleRecord.default);
    if (defaultModules.length > 0) return defaultModules;
  }

  if ('data' in moduleRecord && 'execute' in moduleRecord) {
    return [commandModule as CommandModule];
  }

  return [];
}

function getSubcommandNames(command: SlashCommandBuilder): string[] {
  const commandJson = command.toJSON();
  const options = commandJson.options ?? [];
  return options
    .filter((option) => option.type === 1 || option.type === 2)
    .map((option) => option.name);
}

interface OnlyGuildConfig {
  commands?: unknown;
}

const style = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  blue: '\x1b[34m',
};

// 🔹 Funzione ricorsiva per trovare i comandi.
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function loadOnlyGuildCommands(configPath: string): Set<string> {
  const emptyConfig = JSON.stringify({ commands: [] }, null, 2) + '\n';

  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, emptyConfig, 'utf8');
    return new Set();
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf8').trim();
    if (!configContent) {
      fs.writeFileSync(configPath, emptyConfig, 'utf8');
      return new Set();
    }

    const config = JSON.parse(configContent) as OnlyGuildConfig;
    if (!Array.isArray(config.commands)) {
      throw new Error('onlyguild.json non contiene una lista valida di comandi.');
    }

    return new Set(config.commands.filter((command): command is string => typeof command === 'string' && command.trim().length > 0).map((command) => command.trim()));
  } catch (error) {
    console.error('Impossibile leggere config/onlyguild.json: il deploy verrà annullato.', error);
    throw error;
  }
}

export async function deployCommands(): Promise<void> {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;

  if (!token || !clientId) {
    console.error(`${style.red}Errore: Le credenziali DISCORD_TOKEN o CLIENT_ID non sono state configurate nel file .env.${style.reset}`);
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);

  console.log(`\n${style.cyan}╭─────────────────────────────────────────────────────────────╮${style.reset}`);
  console.log(`${style.cyan}│ ${style.bold}🚀 CARICAMENTO E SINCRONIZZAZIONE DEI COMANDI               ${style.cyan}│${style.reset}`);
  console.log(`${style.cyan}├─────────────────────────────────────────────────────────────┤${style.reset}`);

  try {
    const commandsPayload: object[] = [];
    const commandFilesByName = new Map<string, string[]>();
    let loadFailed = false;

    const commandsPath = path.join(__dirname, 'commands');
    const onlyGuildConfigPath = path.join(__dirname, '../config/onlyguild.json');
    const onlyGuildCommands = loadOnlyGuildCommands(onlyGuildConfigPath);
    
    // 🔹 Cerca tutti i file dei comandi.
    const commandFiles = getAllFiles(commandsPath);

    const registerSingleCommand = (cmd: Partial<CommandModule>, filePath: string) => {
      const fileName = path.basename(filePath);
      if (cmd.data && cmd.execute) {
        const commandName = cmd.data.name;
        const commandFiles = commandFilesByName.get(commandName) ?? [];
        commandFiles.push(filePath);
        commandFilesByName.set(commandName, commandFiles);
        if (commandFiles.length > 1) {
          console.error(`Comando slash duplicato: /${commandName} definito in: ${commandFiles.join(', ')}`);
          loadFailed = true;
          return;
        }
        commandsPayload.push(cmd.data.toJSON());
        const nameFormatted = `/${commandName}`.padEnd(23, ' ');
        const isOnlyGuild = onlyGuildCommands.has(commandName);
        const scope = isOnlyGuild ? 'Guild' : 'Global';
        const status = isOnlyGuild ? '[GUILD_ID]' : '[Caricato]';
        console.log(`${style.cyan}│${style.reset}  ${style.green}✓ ${scope}${style.reset}  ┆ ${nameFormatted} ${style.gray}${status}${style.reset} ${style.cyan}│${style.reset}`);
        const subcommandNames = getSubcommandNames(cmd.data);
        if (subcommandNames.length > 0) {
          console.log(`${style.cyan}│${style.reset}     ${style.gray}↳ Sottocomandi: ${subcommandNames.join(', ')}${style.reset}                              ${style.cyan}│${style.reset}`);
        }
      } else {
        loadFailed = true;
        const nameFormatted = `/${fileName}`.padEnd(23, ' ');
        console.log(`${style.cyan}│${style.reset}  ${style.yellow}⚠ Slash${style.reset}  ┆ ${nameFormatted} ${style.yellow}[Incompleto]${style.reset} ${style.cyan}│${style.reset}`);
      }
    };

    for (const filePath of commandFiles) {
      try {
        const commandModules = getCommandModules(require(filePath));
        if (commandModules.length === 0) {
          registerSingleCommand({}, filePath);
        } else {
          for (const cmd of commandModules) {
            registerSingleCommand(cmd, filePath);
          }
        }
      } catch (err) {
        loadFailed = true;
        const fileName = path.basename(filePath);
        const nameFormatted = `/${fileName}`.padEnd(23, ' ');
        console.log(`${style.cyan}│${style.reset}  ${style.red}✗ Slash${style.reset}  ┆ ${nameFormatted} ${style.red}[Errore]${style.reset}     ${style.cyan}│${style.reset}`);
      }
    }

    if (loadFailed) {
      throw new Error('Il caricamento dei comandi è fallito: nessun comando online è stato modificato.');
    }

    const loadedCommandNames = new Set(commandsPayload.map((cmd: any) => cmd.name));
    for (const commandName of onlyGuildCommands) {
      if (!loadedCommandNames.has(commandName)) {
        console.warn(`Il comando esclusivo "${commandName}" è configurato in onlyguild.json ma non è stato trovato tra i comandi caricati.`);
      }
    }

    const globalCommands = commandsPayload.filter((cmd: any) => !onlyGuildCommands.has(cmd.name));
    const onlyGuildPayload = commandsPayload.filter((cmd: any) => onlyGuildCommands.has(cmd.name));
    const guildId = process.env.GUILD_ID?.trim();

    // Registra comandi globali
    const globalData = (await rest.put(Routes.applicationCommands(clientId), { body: globalCommands })) as object[];

    let deployedOnlyGuildCount = 0;
    if (onlyGuildPayload.length > 0 && guildId) {
      const deployedOnlyGuildCommands = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: onlyGuildPayload }) as object[];
      deployedOnlyGuildCount = deployedOnlyGuildCommands.length;
      console.log(`Comandi esclusivi pubblicati nella guild ${guildId}: ${deployedOnlyGuildCount}.`);
    } else if (onlyGuildPayload.length > 0) {
      console.warn('GUILD_ID non configurato: i comandi esclusivi non verranno pubblicati e non saranno registrati globalmente.');
    }

    console.log(`${style.cyan}├─────────────────────────────────────────────────────────────┤${style.reset}`);
    const guildSummary = guildId || 'GUILD_ID non configurato';
    console.log(`${style.cyan}│${style.reset}  ${style.bold}Riepilogo API:${style.reset} Comandi globali: ${style.green}${globalData.length}${style.reset}    ${style.cyan}│${style.reset}`);
    console.log(`${style.cyan}│${style.reset}  Comandi esclusivi ${guildSummary}: ${style.green}${deployedOnlyGuildCount}${style.reset}                 ${style.cyan}│${style.reset}`);
    console.log(`${style.cyan}╰─────────────────────────────────────────────────────────────╯${style.reset}\n`);
  } catch (error) {
    console.log(`${style.cyan}├─────────────────────────────────────────────────────────────┤${style.reset}`);
    console.log(`${style.cyan}│${style.reset}  ${style.red}✗ Si è verificato un errore critico durante il deploy API.${style.reset}   ${style.cyan}│${style.reset}`);
    console.log(`${style.cyan}╰─────────────────────────────────────────────────────────────╯${style.reset}\n`);
    console.error(error);
    throw error;
  }
}
