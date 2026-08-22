"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployCommands = deployCommands;
const discord_js_1 = require("discord.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
function getAllFiles(dirPath, arrayOfFiles = []) {
    if (!fs.existsSync(dirPath))
        return arrayOfFiles;
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        }
        else if (file.endsWith('.ts') || file.endsWith('.js')) {
            arrayOfFiles.push(fullPath);
        }
    });
    return arrayOfFiles;
}
async function deployCommands() {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;
    if (!token || !clientId) {
        console.error(`${style.red}Errore: Le credenziali DISCORD_TOKEN o CLIENT_ID non sono state configurate nel file .env.${style.reset}`);
        return;
    }
    const rest = new discord_js_1.REST({ version: '10' }).setToken(token);
    console.log(`\n${style.cyan}╭─────────────────────────────────────────────────────────────╮${style.reset}`);
    console.log(`${style.cyan}│ ${style.bold}🚀 CARICAMENTO E SINCRONIZZAZIONE DEI COMANDI               ${style.cyan}│${style.reset}`);
    console.log(`${style.cyan}├─────────────────────────────────────────────────────────────┤${style.reset}`);
    try {
        await rest.put(discord_js_1.Routes.applicationCommands(clientId), { body: [] });
        const commandsPayload = [];
        let slashCount = 0;
        const commandsPath = path.join(__dirname, 'commands');
        // 🔹 Cerca tutti i file dei comandi.
        const commandFiles = getAllFiles(commandsPath);
        const registerSingleCommand = (cmd, filePath) => {
            const fileName = path.basename(filePath);
            if ('data' in cmd && 'execute' in cmd) {
                commandsPayload.push(cmd.data.toJSON());
                slashCount++;
                const nameFormatted = `/${cmd.data.name}`.padEnd(23, ' ');
                console.log(`${style.cyan}│${style.reset}  ${style.green}✓ Slash${style.reset}  ┆ ${nameFormatted} ${style.gray}[Caricato]${style.reset} ${style.cyan}│${style.reset}`);
            }
            else {
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
                }
                else {
                    registerSingleCommand(commandModule, filePath);
                }
            }
            catch (err) {
                const fileName = path.basename(filePath);
                const nameFormatted = `/${fileName}`.padEnd(23, ' ');
                console.log(`${style.cyan}│${style.reset}  ${style.red}✗ Slash${style.reset}  ┆ ${nameFormatted} ${style.red}[Errore]${style.reset}     ${style.cyan}│${style.reset}`);
            }
        }
        const data = (await rest.put(discord_js_1.Routes.applicationCommands(clientId), { body: commandsPayload }));
        console.log(`${style.cyan}├─────────────────────────────────────────────────────────────┤${style.reset}`);
        console.log(`${style.cyan}│${style.reset}  ${style.bold}Riepilogo API:${style.reset} ${style.green}${data.length}${style.reset} Comandi Sincronizzati con Successo     ${style.cyan}│${style.reset}`);
        console.log(`${style.cyan}╰─────────────────────────────────────────────────────────────╯${style.reset}\n`);
    }
    catch (error) {
        console.log(`${style.cyan}├─────────────────────────────────────────────────────────────┤${style.reset}`);
        console.log(`${style.cyan}│${style.reset}  ${style.red}✗ Si è verificato un errore critico durante il deploy API.${style.reset}   ${style.cyan}│${style.reset}`);
        console.log(`${style.cyan}╰─────────────────────────────────────────────────────────────╯${style.reset}\n`);
        console.error(error);
    }
}
