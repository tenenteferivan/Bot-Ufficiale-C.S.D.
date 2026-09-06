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
const interactionCreate_1 = __importDefault(require("./events/interactionCreate"));
const databasehandler_1 = require("./handlers/databasehandler");
const serverLogger_1 = require("./utils/serverLogger");
const restrictionHandler_1 = require("./handlers/restrictionHandler");
/*
 * ============================================================
 * BAN GLOBALE
 * ============================================================
 *
 * Importiamo esclusivamente il sistema che gestisce
 * le scadenze dei ban globali.
 *
 * Il comando /ban-globale rimane nel proprio file.
 *
 * Questo sistema:
 *
 * - carica i ban temporanei salvati
 * - ricrea i timer dopo un restart
 * - rileva ban già scaduti
 * - invia la notifica nel canale configurato
 * - evita di perdere le scadenze al riavvio del bot
 *
 * ============================================================
 */
const ban_globale_1 = require("./commands/ban-globale");
/*
 * ============================================================
 * DOTENV
 * ============================================================
 */
dotenv_1.default.config({
    path: path.resolve(__dirname, '../.env'),
});
/*
 * ============================================================
 * TOKEN
 * ============================================================
 */
const token = process.env.DISCORD_TOKEN?.trim();
if (!token) {
    console.error('Errore: DISCORD_TOKEN mancante o vuoto in botcsd/.env.');
    process.exitCode = 1;
}
/*
 * ============================================================
 * CLIENT
 * ============================================================
 */
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
/*
 * ============================================================
 * PREFIX
 * ============================================================
 */
const PREFIX = process.env.PREFIX || '!';
/*
 * ============================================================
 * RICERCA FILE
 * ============================================================
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
    if (!fs.existsSync(dirPath)) {
        return arrayOfFiles;
    }
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles =
                getAllFiles(fullPath, arrayOfFiles);
        }
        else if ((file.endsWith('.ts') ||
            file.endsWith('.js')) &&
            !file.endsWith('.d.ts')) {
            arrayOfFiles.push(fullPath);
        }
    });
    return arrayOfFiles;
}
/*
 * ============================================================
 * CARICAMENTO COMANDI SLASH
 * ============================================================
 */
function loadSlashCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = getAllFiles(commandsPath);
    for (const filePath of commandFiles) {
        const required = require(filePath);
        const command = required.default ||
            required;
        if (command &&
            command.data &&
            'name' in command.data &&
            'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`Caricato comando Slash: ${command.data.name}`);
        }
    }
}
/*
 * ============================================================
 * CARICAMENTO COMANDI PREFIX
 * ============================================================
 */
function loadPrefixCommands() {
    const prefixPath = path.join(__dirname, 'prefixcommands');
    const prefixFiles = getAllFiles(prefixPath);
    for (const filePath of prefixFiles) {
        const required = require(filePath);
        const command = required.default ||
            required;
        if (command &&
            'name' in command &&
            'execute' in command) {
            client.prefixCommands.set(command.name, command);
            console.log(`Caricato comando con prefisso: ${command.name}`);
            if (command.aliases &&
                Array.isArray(command.aliases)) {
                for (const alias of command.aliases) {
                    client.prefixCommands.set(alias, command);
                }
            }
        }
    }
}
/*
 * ============================================================
 * AVVIO
 * ============================================================
 */
client.once('clientReady', async () => {
    if (!client.user) {
        return;
    }
    console.log(`Autenticazione riuscita. Bot attivo come: ${client.user.tag}`);
    /*
     * ========================================================
     * DEPLOY COMANDI
     * ========================================================
     */
    await (0, deploycommands_1.deployCommands)();
    /*
     * ========================================================
     * CARICAMENTO COMANDI
     * ========================================================
     */
    loadSlashCommands();
    loadPrefixCommands();
    /*
     * ========================================================
     * INIZIALIZZAZIONE BAN GLOBALI
     * ========================================================
     *
     * IMPORTANTE:
     *
     * Questo viene eseguito dopo che il bot è autenticato.
     *
     * Il sistema legge:
     *
     * data/global-bans.json
     *
     * e ricrea tutti i timer delle scadenze.
     *
     * Se il bot era spento durante la scadenza di un ban,
     * il sistema rileverà comunque che expiresAt è passato
     * e procederà con la notifica.
     *
     * ========================================================
     */
    (0, ban_globale_1.initializeGlobalBanExpirationSystem)(client);
    /*
     * ========================================================
     * INIZIALIZZAZIONE COMPLETATA
     * ========================================================
     */
    console.log('Inizializzazione completata con successo. Il servizio è operativo.');
});
/*
 * ============================================================
 * GESTORE UNICO DELLE INTERAZIONI
 * ============================================================
 */
client.on('interactionCreate', async (interaction) => {
    // --------------------------------------------------------
    // Partnership
    // --------------------------------------------------------
    if (await (0, partnershipInteractions_1.handlePartnershipInteraction)(interaction)) {
        return;
    }
    // --------------------------------------------------------
    // Ticket
    // --------------------------------------------------------
    if (await (0, ticketInteractions_1.handleTicketInteraction)(interaction)) {
        return;
    }
    // --------------------------------------------------------
    // MODALI
    // --------------------------------------------------------
    if (interaction.isModalSubmit()) {
        // ======================================================
        // SEGNALAZIONE SERVER
        // ======================================================
        if (interaction.customId ===
            'segnalazione_server') {
            try {
                await interaction.deferReply({
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                const server = interaction.fields
                    .getTextInputValue('server')
                    .trim();
                const motivazione = interaction.fields
                    .getTextInputValue('motivazione')
                    .trim();
                const fatti = interaction.fields
                    .getTextInputValue('narrazione_fatti')
                    .trim();
                const prove = interaction.fields
                    .getTextInputValue('nome_file_prove')
                    .trim();
                console.log('[SEGNALAZIONE SERVER] Modal ricevuto correttamente.');
                const configs = await (0, databasehandler_1.getServerReportConfigs)();
                if (configs.length === 0) {
                    await interaction.editReply({
                        content: '❌ Nessun server ha configurato un canale per le segnalazioni server.',
                    });
                    return;
                }
                const embed = new discord_js_1.EmbedBuilder()
                    .setTitle('🚨 Nuova Segnalazione Server')
                    .setDescription('È stata ricevuta una nuova segnalazione relativa a un server.')
                    .addFields({
                    name: '🖥️ Server Segnalato',
                    value: server.slice(0, 1024),
                    inline: false,
                }, {
                    name: '👤 Operatore',
                    value: `<@${interaction.user.id}>`,
                    inline: true,
                }, {
                    name: '📌 Motivazione',
                    value: motivazione.slice(0, 1024),
                    inline: false,
                }, {
                    name: '📖 Narrazione dei Fatti',
                    value: fatti.slice(0, 1024),
                    inline: false,
                }, {
                    name: '📎 Prove',
                    value: prove.slice(0, 1024),
                    inline: false,
                })
                    .setFooter({
                    text: 'Confederazione Server Discord • Segnalazione Server',
                })
                    .setTimestamp();
                let successCount = 0;
                let errorCount = 0;
                // --------------------------------------------------
                // INVIO A TUTTI I SERVER CONFIGURATI
                // --------------------------------------------------
                for (const config of configs) {
                    try {
                        const guild = await interaction.client.guilds
                            .fetch(config.guildId)
                            .catch(() => null);
                        if (!guild) {
                            console.warn(`⚠️ Server ${config.guildId} non trovato.`);
                            errorCount++;
                            continue;
                        }
                        const channel = await guild.channels
                            .fetch(config.channelId)
                            .catch(() => null);
                        if (!channel ||
                            !channel.isTextBased() ||
                            !('send' in channel)) {
                            console.warn(`⚠️ Canale ${config.channelId} non valido nel server ${config.guildId}.`);
                            errorCount++;
                            continue;
                        }
                        await channel.send({
                            embeds: [embed],
                        });
                        successCount++;
                    }
                    catch (error) {
                        errorCount++;
                        console.error(`Errore durante l'invio della segnalazione server alla guild ${config.guildId}:`, error);
                    }
                }
                await interaction.editReply({
                    content: `✅ Segnalazione server inviata correttamente a ${successCount} server.` +
                        (errorCount > 0
                            ? `\n⚠️ ${errorCount} configurazioni non hanno potuto ricevere la segnalazione.`
                            : ''),
                });
                console.log(`🚨 Segnalazione server inviata: ${successCount} successo/i, ${errorCount} errore/i.`);
            }
            catch (error) {
                console.error('Errore durante la gestione della segnalazione server:', error);
                const errorMessage = error instanceof Error
                    ? error.message
                    : String(error);
                if (interaction.deferred ||
                    interaction.replied) {
                    await interaction.editReply({
                        content: `❌ Si è verificato un errore: ${errorMessage}`,
                    }).catch(() => { });
                }
                else {
                    await interaction.reply({
                        content: `❌ Si è verificato un errore: ${errorMessage}`,
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    }).catch(() => { });
                }
            }
            return;
        }
        // ======================================================
        // TUTTI GLI ALTRI MODALI
        // ======================================================
        try {
            await interactionCreate_1.default.execute(interaction);
        }
        catch (error) {
            console.error('Errore nel gestore del modal:', error);
            if (interaction.deferred ||
                interaction.replied) {
                await interaction.editReply({
                    content: '❌ Si è verificato un errore durante l\'elaborazione del modal.',
                }).catch(() => { });
            }
            else {
                await interaction.reply({
                    content: '❌ Si è verificato un errore durante l\'elaborazione del modal.',
                    flags: discord_js_1.MessageFlags.Ephemeral,
                }).catch(() => { });
            }
        }
        return;
    }
    // ========================================================
    // AUTOCOMPLETE
    // ========================================================
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command ||
            !command.autocomplete) {
            return;
        }
        try {
            await command.autocomplete(interaction);
        }
        catch (error) {
            console.error(`Errore durante l'autocomplete del comando /${interaction.commandName}:`, error);
        }
        return;
    }
    // ========================================================
    // SLASH COMMAND
    // ========================================================
    if (!interaction.isChatInputCommand()) {
        return;
    }
    const command = client.commands.get(interaction.commandName);
    if (!command) {
        return;
    }
    try {
        await command.execute(interaction);
        await (0, modLogger_1.sendModNotification)(interaction);
        if (interaction.guild) {
            await (0, serverLogger_1.logCommand)(client, interaction.commandName, interaction.user, interaction.guild.id);
        }
    }
    catch (error) {
        console.error(`Errore durante l'esecuzione del comando Slash /${interaction.commandName}:`, error);
        const errorPayload = {
            content: 'Si è verificato un errore durante l\'elaborazione del comando.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        };
        if (interaction.replied ||
            interaction.deferred) {
            await interaction
                .followUp(errorPayload)
                .catch(() => { });
        }
        else {
            await interaction
                .reply(errorPayload)
                .catch(() => { });
        }
    }
});
/*
 * ============================================================
 * PREFIX COMMANDS
 * ============================================================
 */
client.on('messageCreate', async (message) => {
    if (message.author.bot) {
        return;
    }
    const prefix = PREFIX;
    if (!message.content.startsWith(prefix)) {
        return;
    }
    const args = message.content
        .slice(prefix.length)
        .trim()
        .split(/ +/g);
    const commandName = args
        .shift()
        ?.toLowerCase();
    if (!commandName) {
        return;
    }
    const command = client.prefixCommands.get(commandName);
    if (!command) {
        return;
    }
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
/*
 * ============================================================
 * EVENTI SERVER
 * ============================================================
 */
client.on('messageDelete', (message) => (0, serverLogger_1.logMessageDelete)(client, message));
client.on('guildMemberAdd', async (member) => {
    // --------------------------------------------------------
    // SISTEMA DE RESTRICCIONES
    // --------------------------------------------------------
    try {
        await (0, restrictionHandler_1.handleRestrictionJoin)(member);
    }
    catch (error) {
        console.error('[RESTRICTION] Errore durante il controllo della restrizione:', error);
    }
    // --------------------------------------------------------
    // LOG ENTRADA AL SERVIDOR
    // --------------------------------------------------------
    try {
        await (0, serverLogger_1.logMemberJoin)(client, member);
    }
    catch (error) {
        console.error('[SERVER LOG] Errore durante il log dell\'ingresso:', error);
    }
});
client.on('guildMemberRemove', (member) => (0, serverLogger_1.logMemberLeave)(client, member));
client.on('guildBanAdd', (ban) => (0, serverLogger_1.logBan)(client, ban.guild, ban.user, true));
client.on('guildBanRemove', (ban) => (0, serverLogger_1.logBan)(client, ban.guild, ban.user, false));
client.on('guildMemberUpdate', (oldMember, newMember) => (0, serverLogger_1.logMemberUpdate)(client, oldMember, newMember));
client.on('roleCreate', (role) => (0, serverLogger_1.logRoleCreate)(client, role));
client.on('roleDelete', (role) => (0, serverLogger_1.logRoleDelete)(client, role));
client.on('roleUpdate', (oldRole, newRole) => (0, serverLogger_1.logRoleUpdate)(client, oldRole, newRole));
client.on('channelCreate', (channel) => {
    if (channel.isDMBased()) {
        return;
    }
    (0, serverLogger_1.logChannelCreate)(client, channel);
});
client.on('channelDelete', (channel) => {
    if (channel.isDMBased()) {
        return;
    }
    (0, serverLogger_1.logChannelDelete)(client, channel);
});
client.on('channelUpdate', (oldChannel, newChannel) => {
    if (oldChannel.isDMBased() ||
        newChannel.isDMBased()) {
        return;
    }
    (0, serverLogger_1.logChannelUpdate)(client, oldChannel, newChannel);
});
/*
 * ============================================================
 * ERRORI DEL CLIENT
 * ============================================================
 */
client.on('error', (error) => {
    console.error('Errore del client Discord:', error);
});
client.on('shardError', (error) => {
    console.error('Errore della connessione Discord:', error);
});
/*
 * ============================================================
 * LOGIN
 * ============================================================
 */
if (token) {
    client.login(token)
        .catch((error) => {
        if (error?.code ===
            'TokenInvalid') {
            console.error('Login Discord fallito: il token è invalido o revocato. Generane uno nuovo dal Developer Portal.');
        }
        else {
            console.error('Login Discord fallito:', error);
        }
        process.exitCode = 1;
    });
}
