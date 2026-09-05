import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { getTicketGuildId, ticketCommandNames } from './utils/ticketScope';

interface CommandModule {
  data: SlashCommandBuilder;
  execute: Function;
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
    let slashCount = 0;

    const commandsPath = path.join(__dirname, 'commands');
    
    // 🔹 Cerca tutti i file dei comandi.
    const commandFiles = getAllFiles(commandsPath);

    const registerSingleCommand = (cmd: CommandModule, filePath: string) => {
      const fileName = path.basename(filePath);
      if ('data' in cmd && 'execute' in cmd) {
        commandsPayload.push(cmd.data.toJSON());
        slashCount++;
        const nameFormatted = `/${cmd.data.name}`.padEnd(23, ' ');
        console.log(`${style.cyan}│${style.reset}  ${style.green}✓ Slash${style.reset}  ┆ ${nameFormatted} ${style.gray}[Caricato]${style.reset} ${style.cyan}│${style.reset}`);
      } else {
        const nameFormatted = `/${fileName}`.padEnd(23, ' ');
        console.log(`${style.cyan}│${style.reset}  ${style.yellow}⚠ Slash${style.reset}  ┆ ${nameFormatted} ${style.yellow}[Incompleto]${style.reset} ${style.cyan}│${style.reset}`);
      }
    };

    for (const filePath of commandFiles) {
      try {
        const commandModule = require(filePath);

        if (Array.isArray(commandModule)) {
          for (const cmd of commandModule) {
            registerSingleCommand(cmd, filePath);
          }
        } else {
          registerSingleCommand(commandModule, filePath);
        }
      } catch (err) {
        const fileName = path.basename(filePath);
        const nameFormatted = `/${fileName}`.padEnd(23, ' ');
        console.log(`${style.cyan}│${style.reset}  ${style.red}✗ Slash${style.reset}  ┆ ${nameFormatted} ${style.red}[Errore]${style.reset}     ${style.cyan}│${style.reset}`);
      }
    }

    const ticketGuildId = getTicketGuildId();
    
    const globalCommands = commandsPayload.filter((cmd: any) => !ticketCommandNames.has(cmd.name));
    const ticketCommands = commandsPayload.filter((cmd: any) => ticketCommandNames.has(cmd.name));

    // Registra comandi globali
    const globalData = (await rest.put(Routes.applicationCommands(clientId), { body: globalCommands })) as object[];

    // Registra comandi di ticket a livello di guild (se configurato)
    if (ticketGuildId && ticketCommands.length > 0) {
      const deployedTicketCommands = await rest.put(Routes.applicationGuildCommands(clientId, ticketGuildId), { body: ticketCommands }) as object[];
      console.log(`Comandi ticket pubblicati nella guild configurata: ${deployedTicketCommands.length}.`);
    } else if (!ticketGuildId) {
      console.warn('TICKET_GUILD_ID non configurato: i comandi ticket non verranno pubblicati.');
    }

    console.log(`${style.cyan}├─────────────────────────────────────────────────────────────┤${style.reset}`);
    console.log(`${style.cyan}│${style.reset}  ${style.bold}Riepilogo API:${style.reset} ${style.green}${globalData.length}${style.reset} Comandi globali + ${style.green}${ticketCommands.length}${style.reset} Comandi ticket${style.reset}    ${style.cyan}│${style.reset}`);
    console.log(`${style.cyan}╰─────────────────────────────────────────────────────────────╯${style.reset}\n`);
  } catch (error) {
    console.log(`${style.cyan}├─────────────────────────────────────────────────────────────┤${style.reset}`);
    console.log(`${style.cyan}│${style.reset}  ${style.red}✗ Si è verificato un errore critico durante il deploy API.${style.reset}   ${style.cyan}│${style.reset}`);
    console.log(`${style.cyan}╰─────────────────────────────────────────────────────────────╯${style.reset}\n`);
    console.error(error);
  }
}
