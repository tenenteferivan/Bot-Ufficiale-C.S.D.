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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const deploycommands_1 = require("./deploycommands");
const modLogger_1 = require("./utils/modLogger");
const ticketInteractions_1 = require("./utils/ticketInteractions");
const partnershipInteractions_1 = require("./utils/partnershipInteractions");
dotenv_1.default.config({ path: path.resolve(__dirname, '../.env') });
const token = process.env.DISCORD_TOKEN?.trim();
if (!token) {
    console.error('Errore: DISCORD_TOKEN mancante o vuoto in botcssd/.env.');
    process.exitCode = 1;
}
// Estensione del Client per contenere le raccolte in memoria
class ExtendedClient extends discord_js_1.Client {
    commands = new discord_js_1.Collection();
    prefixCommands = new discord_js_1.Collection();
}
const client = new ExtendedClient({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.GuildModeration,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
});
const PREFIX = process.env.PREFIX || '!';
// Funzione ricorsiva per cercare file TS/JS nelle sottocartelle
function getAllFiles(dirPath, arrayOfFiles = []) {
    if (!fs.existsSync(dirPath))
        return arrayOfFiles;
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        }
        else if ((file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts')) {
            arrayOfFiles.push(fullPath);
        }
    });
    return arrayOfFiles;
}
// 1. Caricamento dinamico dei comandi Slash
function loadSlashCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = getAllFiles(commandsPath);
    for (const filePath of commandFiles) {
        const required = require(filePath);
        const command = required.default || required;
        if (command && command.data && 'name' in command.data && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`Caricato comando Slash: ${command.data.name}`);
        }
    }
}
// 2. Caricamento dinamico dei comandi con prefisso
function loadPrefixCommands() {
    const prefixPath = path.join(__dirname, 'prefixcommands');
    const prefixFiles = getAllFiles(prefixPath);
    for (const filePath of prefixFiles) {
        const required = require(filePath);
        const command = required.default || required;
        if (command && 'name' in command && 'execute' in command) {
            client.prefixCommands.set(command.name, command);
            console.log(`Caricato comando con prefisso: ${command.name}`);
            if (command.aliases && Array.isArray(command.aliases)) {
                for (const alias of command.aliases) {
                    client.prefixCommands.set(alias, command);
                }
            }
        }
    }
}
// Evento di inizializzazione
client.once('clientReady', async () => {
    if (!client.user)
        return;
    console.log(`Autenticazione riuscita. Bot attivo come: ${client.user.tag}`);
    await (0, deploycommands_1.deployCommands)();
    loadSlashCommands();
    loadPrefixCommands();
    console.log('Inizializzazione completata con successo. Il servizio è operativo.');
});
// Gestore unico delle interazioni (Slash + autocompletamento)
client.on('interactionCreate', async (interaction) => {
    if (await (0, partnershipInteractions_1.handlePartnershipInteraction)(interaction))
        return;
    if (await (0, ticketInteractions_1.handleTicketInteraction)(interaction))
        return;
    // Gestione dell'autocompletamento
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete)
            return;
        try {
            await command.autocomplete(interaction);
        }
        catch (error) {
            console.error(`Errore durante l'autocomplete del comando /${interaction.commandName}:`, error);
        }
        return;
    }
    // Gestione dei comandi chat (/comando)
    if (!interaction.isChatInputCommand())
        return;
    const command = client.commands.get(interaction.commandName);
    if (!command)
        return;
    try {
        // 1. Esecuzione standard del comando
        await command.execute(interaction);
        // 2. Intercettore globale di moderazione: valuta e invia il messaggio privato quando necessario.
        await (0, modLogger_1.sendModNotification)(interaction);
        if (interaction.guild) {
            await (0, serverLogger_1.logCommand)(client, interaction.commandName, interaction.user, interaction.guild.id);
        }
    }
    catch (error) {
        console.error(`Errore durante l'esecuzione del comando Slash /${interaction.commandName}:`, error);
        // Asignación de tipo explícito para que tsc reconozca el valor del bitfield de MessageFlags.Ephemeral
        const errorPayload = {
            content: 'Si è verificato un errore durante l\'elaborazione del comando.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorPayload).catch(() => { });
        }
        else {
            await interaction.reply(errorPayload).catch(() => { });
        }
    }
});
// Gestore dei messaggi per i comandi con prefisso
client.on('messageCreate', async (message) => {
    // Ignora i bot
    if (message.author.bot)
        return;
    // Logica per i comandi con prefisso
    const prefix = PREFIX; // Usa il prefisso configurato.
    if (!message.content.startsWith(prefix))
        return;
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName)
        return;
    const command = client.prefixCommands.get(commandName);
    if (!command)
        return;
    try {
        await command.execute(message, args);
        if (message.guild) {
            await (0, serverLogger_1.logCommand)(client, command.name, message.author, message.guild.id);
        }
    }
    catch (error) {
        console.error(`Errore durante l'esecuzione del comando con prefisso ${commandName}:`, error);
        try {
            await message.reply('Si è verificato un errore durante l\'esecuzione del comando.');
        }
        catch { }
    }
});
const serverLogger_1 = require("./utils/serverLogger");
client.on('messageDelete', (message) => (0, serverLogger_1.logMessageDelete)(client, message));
client.on('guildMemberAdd', (member) => (0, serverLogger_1.logMemberJoin)(client, member));
client.on('guildMemberRemove', (member) => (0, serverLogger_1.logMemberLeave)(client, member));
client.on('guildBanAdd', (ban) => (0, serverLogger_1.logBan)(client, ban.guild, ban.user, true));
client.on('guildBanRemove', (ban) => (0, serverLogger_1.logBan)(client, ban.guild, ban.user, false));
client.on('guildMemberUpdate', (oldMember, newMember) => (0, serverLogger_1.logMemberUpdate)(client, oldMember, newMember));
client.on('roleCreate', (role) => (0, serverLogger_1.logRoleCreate)(client, role));
client.on('roleDelete', (role) => (0, serverLogger_1.logRoleDelete)(client, role));
client.on('roleUpdate', (oldRole, newRole) => (0, serverLogger_1.logRoleUpdate)(client, oldRole, newRole));
client.on('channelCreate', (channel) => {
    if (channel.isDMBased())
        return;
    (0, serverLogger_1.logChannelCreate)(client, channel);
});
client.on('channelDelete', (channel) => {
    if (channel.isDMBased())
        return;
    (0, serverLogger_1.logChannelDelete)(client, channel);
});
client.on('channelUpdate', (oldChannel, newChannel) => {
    if (oldChannel.isDMBased() || newChannel.isDMBased())
        return;
    (0, serverLogger_1.logChannelUpdate)(client, oldChannel, newChannel);
});
client.on('error', (error) => {
    console.error('Errore del client Discord:', error);
});
client.on('shardError', (error) => {
    console.error('Errore della connessione Discord:', error);
});
if (token) {
    client.login(token).catch((error) => {
        if (error?.code === 'TokenInvalid') {
            console.error('Login Discord fallito: il token è invalido o revocato. Generane uno nuovo dal Developer Portal.');
        }
        else {
            console.error('Login Discord fallito:', error);
        }
        process.exitCode = 1;
    });
}
