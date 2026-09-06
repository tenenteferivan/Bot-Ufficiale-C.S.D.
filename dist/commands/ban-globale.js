"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.initializeGlobalBanExpirationSystem = initializeGlobalBanExpirationSystem;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.join(process.cwd(), 'data');
const GLOBAL_BAN_SERVERS_FILE = path_1.default.join(DATA_DIR, 'global-ban-servers.json');
const GLOBAL_BANS_FILE = path_1.default.join(DATA_DIR, 'global-bans.json');
/*
 * ============================================================
 * UTILITÀ FILE
 * ============================================================
 */
function ensureDataDirectory() {
    if (!fs_1.default.existsSync(DATA_DIR)) {
        fs_1.default.mkdirSync(DATA_DIR, {
            recursive: true,
        });
    }
}
/*
 * ============================================================
 * CARICAMENTO SERVER AUTORIZZATI
 * ============================================================
 */
function loadGlobalBanServers() {
    if (!fs_1.default.existsSync(GLOBAL_BAN_SERVERS_FILE)) {
        throw new Error('Il file data/global-ban-servers.json non esiste.');
    }
    const content = fs_1.default.readFileSync(GLOBAL_BAN_SERVERS_FILE, 'utf8');
    const data = JSON.parse(content);
    if (!data ||
        !Array.isArray(data.guildIds)) {
        throw new Error('Formato di global-ban-servers.json non valido.');
    }
    const guildIds = data.guildIds.filter((guildId) => typeof guildId === 'string' &&
        /^\d{17,20}$/.test(guildId));
    return {
        guildIds,
    };
}
/*
 * ============================================================
 * CARICAMENTO BAN TEMPORANEI
 * ============================================================
 */
function loadGlobalBans() {
    ensureDataDirectory();
    if (!fs_1.default.existsSync(GLOBAL_BANS_FILE)) {
        return {
            bans: [],
        };
    }
    try {
        const content = fs_1.default.readFileSync(GLOBAL_BANS_FILE, 'utf8');
        const data = JSON.parse(content);
        if (!data ||
            !Array.isArray(data.bans)) {
            throw new Error('Formato di global-bans.json non valido.');
        }
        const bans = data.bans.filter((ban) => {
            if (!ban || typeof ban !== 'object') {
                return false;
            }
            const record = ban;
            return (typeof record.userId === 'string' &&
                /^\d{17,20}$/.test(record.userId) &&
                typeof record.userTag === 'string' &&
                typeof record.motivo === 'string' &&
                typeof record.durata === 'string' &&
                typeof record.expiresAt === 'number' &&
                Number.isFinite(record.expiresAt) &&
                typeof record.operatorTag === 'string' &&
                typeof record.createdAt === 'number' &&
                Number.isFinite(record.createdAt) &&
                typeof record.notified === 'boolean');
        });
        return {
            bans,
        };
    }
    catch (error) {
        console.error('[BAN GLOBALE] Impossibile leggere global-bans.json:', error);
        throw new Error('Impossibile leggere il database dei ban globali temporanei.');
    }
}
/*
 * ============================================================
 * SALVATAGGIO BAN TEMPORANEI
 * ============================================================
 */
function saveGlobalBans(data) {
    ensureDataDirectory();
    const tempFile = `${GLOBAL_BANS_FILE}.tmp`;
    fs_1.default.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs_1.default.renameSync(tempFile, GLOBAL_BANS_FILE);
}
function parseDuration(input) {
    const normalized = input
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
    const match = normalized.match(/^(\d+)\s*(d|day|days|giorno|giorni|m|month|months|mese|mesi|y|year|years|anno|anni)$/);
    if (!match) {
        return null;
    }
    const value = Number.parseInt(match[1], 10);
    if (!Number.isInteger(value) ||
        value <= 0) {
        return null;
    }
    const unitInput = match[2];
    let unit;
    if (unitInput === 'd' ||
        unitInput === 'day' ||
        unitInput === 'days' ||
        unitInput === 'giorno' ||
        unitInput === 'giorni') {
        unit = 'd';
    }
    else if (unitInput === 'm' ||
        unitInput === 'month' ||
        unitInput === 'months' ||
        unitInput === 'mese' ||
        unitInput === 'mesi') {
        unit = 'm';
    }
    else {
        unit = 'y';
    }
    const now = new Date();
    /*
     * ==========================================================
     * GIORNI
     * ==========================================================
     */
    if (unit === 'd') {
        const expiresAt = now.getTime() +
            value * 24 * 60 * 60 * 1000;
        return {
            value,
            unit,
            expiresAt,
        };
    }
    /*
     * ==========================================================
     * MESI / ANNI
     * ==========================================================
     */
    const expirationDate = new Date(now);
    if (unit === 'm') {
        expirationDate.setMonth(expirationDate.getMonth() + value);
    }
    else {
        expirationDate.setFullYear(expirationDate.getFullYear() + value);
    }
    return {
        value,
        unit,
        expiresAt: expirationDate.getTime(),
    };
}
/*
 * ============================================================
 * FORMAT DURATA
 * ============================================================
 */
function formatDuration(parsed) {
    if (parsed.unit === 'd') {
        return `${parsed.value} giorno${parsed.value === 1 ? '' : 'i'}`;
    }
    if (parsed.unit === 'm') {
        return `${parsed.value} mese${parsed.value === 1 ? '' : 'i'}`;
    }
    return `${parsed.value} anno${parsed.value === 1 ? '' : 'i'}`;
}
/*
 * ============================================================
 * TIMER DEI BAN
 * ============================================================
 */
const expirationTimers = new Map();
/*
 * ============================================================
 * NOTIFICA SCADENZA BAN
 * ============================================================
 */
async function notifyGlobalBanExpiration(client, ban) {
    /*
     * Leggiamo il valore qui e non a livello globale.
     * Questo garantisce che dotenv sia già stato caricato.
     */
    const UNBAN_MESSAGE_CHANNEL = process.env.UNBAN_MESSAGE_CHANNEL;
    if (!UNBAN_MESSAGE_CHANNEL) {
        console.error(`[BAN GLOBALE] UNBAN_MESSAGE_CHANNEL non configurato. Impossibile notificare la scadenza del ban di ${ban.userId}.`);
        return;
    }
    try {
        const channel = await client.channels.fetch(UNBAN_MESSAGE_CHANNEL);
        if (!channel) {
            throw new Error('Canale UNBAN_MESSAGE_CHANNEL non trovato.');
        }
        /*
         * Discord.js restituisce un'unione di molti tipi
         * di canale. Non tutti garantiscono .send().
         *
         * Il controllo "send in channel" restringe
         * correttamente il tipo per TypeScript.
         */
        if (!channel.isTextBased() ||
            !('send' in channel) ||
            typeof channel.send !== 'function') {
            throw new Error('UNBAN_MESSAGE_CHANNEL non è un canale testuale utilizzabile per l\'invio di messaggi.');
        }
        const expirationDate = `<t:${Math.floor(ban.expiresAt / 1000)}:F>`;
        await channel.send({
            content: [
                '@everyone',
                '',
                '🌐 **BAN GLOBALE SCADUTO**',
                '',
                `👤 **Utente:** ${ban.userTag}`,
                `🆔 **ID:** ${ban.userId}`,
                `📋 **Motivo:** ${ban.motivo}`,
                `⏱️ **Durata:** ${ban.durata}`,
                `📅 **Scaduto:** ${expirationDate}`,
                `👮 **Operatore:** ${ban.operatorTag}`,
                '',
                '⚠️ **È necessario procedere con l\'unban dell\'utente nei server interessati.**',
            ].join('\n'),
            allowedMentions: {
                parse: ['everyone'],
            },
        });
        console.log(`[BAN GLOBALE] Notifica di scadenza inviata per ${ban.userId}.`);
    }
    catch (error) {
        console.error(`[BAN GLOBALE] Impossibile inviare la notifica di scadenza per ${ban.userId}:`, error);
        throw error;
    }
}
/*
 * ============================================================
 * GESTIONE SCADENZA
 * ============================================================
 */
async function handleGlobalBanExpiration(client, userId) {
    let data;
    try {
        data = loadGlobalBans();
    }
    catch (error) {
        console.error('[BAN GLOBALE] Impossibile caricare i ban alla scadenza:', error);
        return;
    }
    const ban = data.bans.find((entry) => entry.userId === userId &&
        !entry.notified);
    if (!ban) {
        expirationTimers.delete(userId);
        return;
    }
    /*
     * Se il timer è arrivato troppo presto,
     * viene nuovamente programmato.
     */
    const remaining = ban.expiresAt - Date.now();
    if (remaining > 0) {
        scheduleGlobalBanExpiration(client, ban);
        return;
    }
    try {
        await notifyGlobalBanExpiration(client, ban);
        /*
         * Segniamo la notifica come eseguita.
         */
        ban.notified = true;
        saveGlobalBans(data);
        expirationTimers.delete(userId);
        console.log(`[BAN GLOBALE] Ban temporaneo scaduto per ${userId}.`);
    }
    catch {
        /*
         * Non eliminiamo il record se la notifica fallisce.
         * Riproveremo tra 60 secondi.
         */
        expirationTimers.delete(userId);
        setTimeout(() => {
            void handleGlobalBanExpiration(client, userId);
        }, 60_000);
    }
}
/*
 * ============================================================
 * PROGRAMMAZIONE SCADENZA
 * ============================================================
 */
function scheduleGlobalBanExpiration(client, ban) {
    /*
     * Elimina eventuale timer precedente.
     */
    const existingTimer = expirationTimers.get(ban.userId);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }
    const remaining = ban.expiresAt - Date.now();
    /*
     * Node.js ha un limite massimo per setTimeout.
     */
    const MAX_TIMEOUT = 2_147_483_647;
    /*
     * Se il ban è già scaduto,
     * il timer viene impostato a 0.
     */
    const timeout = Math.min(Math.max(remaining, 0), MAX_TIMEOUT);
    const timer = setTimeout(() => {
        /*
         * Se la scadenza è oltre il limite
         * di setTimeout, rischeduliamo.
         */
        if (remaining >
            MAX_TIMEOUT) {
            scheduleGlobalBanExpiration(client, ban);
            return;
        }
        void handleGlobalBanExpiration(client, ban.userId);
    }, timeout);
    expirationTimers.set(ban.userId, timer);
}
/*
 * ============================================================
 * RIPRISTINO TIMER ALLO STARTUP
 * ============================================================
 *
 * Deve essere chiamata una volta quando il bot è pronto.
 *
 * Permette al sistema di sopravvivere ai restart.
 */
function initializeGlobalBanExpirationSystem(client) {
    let data;
    try {
        data = loadGlobalBans();
    }
    catch (error) {
        console.error('[BAN GLOBALE] Impossibile inizializzare il sistema delle scadenze:', error);
        return;
    }
    for (const ban of data.bans) {
        if (ban.notified) {
            continue;
        }
        scheduleGlobalBanExpiration(client, ban);
    }
    console.log(`[BAN GLOBALE] Sistema scadenze inizializzato. Ban temporanei caricati: ${data.bans.filter((ban) => !ban.notified).length}.`);
}
/*
 * ============================================================
 * COMANDO SLASH
 * ============================================================
 */
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('ban-globale')
    .setDescription('Banna un utente da tutti i server affiliati, solo dirigenza.')
    .addUserOption((option) => option
    .setName('user')
    .setDescription('Utente da bannare.')
    .setRequired(true))
    .addStringOption((option) => option
    .setName('motivo')
    .setDescription('Motivo del ban.')
    .setRequired(true))
    .addStringOption((option) => option
    .setName('durata')
    .setDescription('Durata: 7d, 30 giorni, 2m, 6 mesi, 1y, 2 anni.')
    .setRequired(true));
/*
 * ============================================================
 * EXECUTE
 * ============================================================
 */
async function execute(interaction) {
    /*
     * Leggiamo le variabili .env qui.
     * In questo modo dotenv ha già avuto modo di essere caricato
     * da index.ts.
     */
    const DIRIGENZA_ID = process.env.DIRIGENZA_ID;
    const GUILD_ID = process.env.GUILD_ID;
    const UNBAN_MESSAGE_CHANNEL = process.env.UNBAN_MESSAGE_CHANNEL;
    // ==========================================================
    // CONTROLLO DIRIGENZA
    // ==========================================================
    if (!DIRIGENZA_ID) {
        console.error('[BAN GLOBALE] DIRIGENZA_ID non configurato nel file .env.');
        await interaction.reply({
            content: '❌ Il sistema di autorizzazione della dirigenza non è configurato correttamente.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Questo comando può essere utilizzato solo nei server.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(DIRIGENZA_ID)) {
        await interaction.reply({
            content: '❌ Non disponi del ruolo DIRIGENZA necessario per utilizzare questo comando.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    // ==========================================================
    // CONTROLLO GUILD_ID
    // ==========================================================
    if (!GUILD_ID) {
        console.error('[BAN GLOBALE] GUILD_ID non configurato nel file .env.');
        await interaction.reply({
            content: '❌ GUILD_ID non è configurato. Operazione annullata per sicurezza.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    // ==========================================================
    // CONTROLLO CANALE UNBAN
    // ==========================================================
    if (!UNBAN_MESSAGE_CHANNEL) {
        console.error('[BAN GLOBALE] UNBAN_MESSAGE_CHANNEL non configurato nel file .env.');
        await interaction.reply({
            content: '❌ UNBAN_MESSAGE_CHANNEL non è configurato. Operazione annullata per sicurezza.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    // ==========================================================
    // CONTROLLO BOT
    // ==========================================================
    if (!interaction.client.user) {
        await interaction.reply({
            content: '❌ Impossibile identificare il bot in questo momento.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    // ==========================================================
    // DATI DEL COMANDO
    // ==========================================================
    const user = interaction.options.getUser('user', true);
    const motivo = interaction.options.getString('motivo', true);
    const durataInput = interaction.options.getString('durata', true);
    // ==========================================================
    // PARSING DURATA
    // ==========================================================
    const parsedDuration = parseDuration(durataInput);
    if (!parsedDuration) {
        await interaction.reply({
            content: [
                '❌ **Durata non valida.**',
                '',
                '**Formati supportati:**',
                '• `7d`',
                '• `7 giorni`',
                '• `30d`',
                '• `2m`',
                '• `6 mesi`',
                '• `1y`',
                '• `2 anni`',
            ].join('\n'),
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const durata = formatDuration(parsedDuration);
    // ==========================================================
    // BLOCCO TARGET
    // ==========================================================
    const targetUserId = user.id;
    if (targetUserId !==
        user.id) {
        console.error('[BAN GLOBALE] BLOCCATO: mismatch dell\'utente target.');
        await interaction.reply({
            content: '❌ Operazione bloccata per un errore di sicurezza del target.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    // ==========================================================
    // CARICAMENTO WHITELIST
    // ==========================================================
    let globalBanServers;
    try {
        globalBanServers =
            loadGlobalBanServers();
    }
    catch (error) {
        console.error('[BAN GLOBALE] Impossibile leggere la whitelist dei server:', error);
        await interaction.reply({
            content: '❌ Impossibile leggere la lista dei server autorizzati ai ban globali. Operazione annullata.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const allowedGuildIds = new Set(globalBanServers.guildIds);
    if (allowedGuildIds.size === 0) {
        await interaction.reply({
            content: '❌ Non ci sono server affiliati ai ban globali. Operazione annullata.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    // ==========================================================
    // RISPOSTA INIZIALE
    // ==========================================================
    await interaction.deferReply({
        flags: discord_js_1.MessageFlags.Ephemeral,
    });
    // ==========================================================
    // BAN GLOBALE
    // ==========================================================
    let riusciti = 0;
    let falliti = 0;
    let nonPresenti = 0;
    let esclusiGuildId = 0;
    let giaBannato = 0;
    const risultati = [];
    /*
     * Gli unici server possibili sono quelli presenti
     * nel JSON.
     */
    for (const guildId of allowedGuildIds) {
        // ========================================================
        // PROTEZIONE GUILD_ID
        // ========================================================
        if (guildId ===
            GUILD_ID) {
            esclusiGuildId++;
            console.warn(`[BAN GLOBALE] Guild ${guildId} esclusa perché coincide con GUILD_ID.`);
            continue;
        }
        // ========================================================
        // VERIFICA WHITELIST
        // ========================================================
        if (!allowedGuildIds.has(guildId)) {
            console.error(`[BAN GLOBALE] BLOCCATO: Guild ${guildId} non presente nella whitelist.`);
            continue;
        }
        // ========================================================
        // RECUPERA GUILD
        // ========================================================
        const guild = interaction.client.guilds.cache.get(guildId);
        if (!guild) {
            nonPresenti++;
            risultati.push(`⚠️ **Guild ${guildId}** — Bot non presente nel server.`);
            continue;
        }
        try {
            // ======================================================
            // VERIFICA FINALE GUILD
            // ======================================================
            if (guild.id !==
                guildId) {
                console.error('[BAN GLOBALE] BLOCCATO: Guild ID mismatch.');
                falliti++;
                risultati.push(`❌ **${guild.name}** — Verifica sicurezza server fallita.`);
                continue;
            }
            if (guild.id ===
                GUILD_ID) {
                console.error('[BAN GLOBALE] BLOCCATO: tentativo di ban su GUILD_ID.');
                esclusiGuildId++;
                continue;
            }
            if (!allowedGuildIds.has(guild.id)) {
                console.error(`[BAN GLOBALE] BLOCCATO: ${guild.id} non presente nella whitelist.`);
                falliti++;
                continue;
            }
            // ======================================================
            // PERMESSI BOT
            // ======================================================
            const botMember = await guild.members.fetch(interaction.client.user.id);
            if (!botMember.permissions.has('BanMembers')) {
                falliti++;
                risultati.push(`❌ **${guild.name}** — Bot senza permesso Ban Members.`);
                continue;
            }
            // ======================================================
            // VERIFICA TARGET
            // ======================================================
            if (targetUserId !==
                user.id) {
                console.error('[BAN GLOBALE] BLOCCATO: target mismatch prima del ban.');
                falliti++;
                risultati.push(`❌ **${guild.name}** — Ban bloccato dal controllo target.`);
                continue;
            }
            // ======================================================
            // CONTROLLO BAN ESISTENTE
            // ======================================================
            try {
                await guild.bans.fetch(targetUserId);
                giaBannato++;
                risultati.push(`⚠️ **${guild.name}** — Utente già bannato.`);
                continue;
            }
            catch {
                /*
                 * L'utente non è bannato.
                 */
            }
            // ======================================================
            // ULTIMO CONTROLLO
            // ======================================================
            if (targetUserId !==
                user.id) {
                console.error('[BAN GLOBALE] BLOCCATO ALL\'ULTIMO CONTROLLO: target mismatch.');
                falliti++;
                continue;
            }
            if (guild.id ===
                GUILD_ID) {
                console.error('[BAN GLOBALE] BLOCCATO ALL\'ULTIMO CONTROLLO: GUILD_ID.');
                esclusiGuildId++;
                continue;
            }
            if (!allowedGuildIds.has(guild.id)) {
                console.error('[BAN GLOBALE] BLOCCATO ALL\'ULTIMO CONTROLLO: guild non autorizzata.');
                falliti++;
                continue;
            }
            // ======================================================
            // BAN
            // ======================================================
            await guild.bans.create(targetUserId, {
                reason: `[BAN GLOBALE] ${motivo} | Durata: ${durata} | Scadenza: ${new Date(parsedDuration.expiresAt).toISOString()} | Operatore: ${interaction.user.tag}`,
            });
            riusciti++;
            risultati.push(`✅ **${guild.name}** — Utente bannato.`);
        }
        catch (error) {
            falliti++;
            console.error(`[BAN GLOBALE] Errore nel server ${guild.name} (${guild.id}):`, error);
            risultati.push(`❌ **${guild.name}** — Errore durante il ban.`);
        }
    }
    // ==========================================================
    // SALVATAGGIO SCADENZA
    // ==========================================================
    /*
     * Salviamo la scadenza solo se almeno un server
     * ha ricevuto effettivamente il ban.
     */
    if (riusciti > 0) {
        try {
            const data = loadGlobalBans();
            /*
             * Se esiste già un record per lo stesso utente,
             * lo sostituiamo.
             */
            data.bans =
                data.bans.filter((ban) => ban.userId !==
                    targetUserId);
            const banRecord = {
                userId: targetUserId,
                userTag: user.tag,
                motivo,
                durata,
                expiresAt: parsedDuration.expiresAt,
                operatorTag: interaction.user.tag,
                createdAt: Date.now(),
                notified: false,
            };
            data.bans.push(banRecord);
            saveGlobalBans(data);
            scheduleGlobalBanExpiration(interaction.client, banRecord);
            console.log(`[BAN GLOBALE] Scadenza registrata per ${targetUserId}: ${new Date(parsedDuration.expiresAt).toISOString()}`);
        }
        catch (error) {
            /*
             * Il ban è già stato eseguito.
             * Non fingiamo che il ban non sia avvenuto.
             */
            console.error(`[BAN GLOBALE] ERRORE CRITICO: ban eseguito ma impossibile salvare la scadenza per ${targetUserId}:`, error);
            risultati.push('🚨 **ATTENZIONE:** il ban è stato eseguito, ma non è stato possibile registrare automaticamente la scadenza.');
        }
    }
    // ==========================================================
    // RISULTATO
    // ==========================================================
    const risultatoFinale = [
        '🌐 **BAN GLOBALE ESEGUITO**',
        '',
        `👤 **Utente:** ${user.tag}`,
        `🆔 **ID:** ${targetUserId}`,
        `📋 **Motivo:** ${motivo}`,
        `⏱️ **Durata:** ${durata}`,
        `📅 **Scadenza:** <t:${Math.floor(parsedDuration.expiresAt / 1000)}:F>`,
        `👮 **Operatore:** ${interaction.user.tag}`,
        '',
        '📊 **Risultato:**',
        `✅ Bannato: **${riusciti}**`,
        `⚠️ Già bannato: **${giaBannato}**`,
        `❌ Falliti: **${falliti}**`,
        `⚠️ Bot non presente: **${nonPresenti}**`,
        `🚫 GUILD_ID esclusa: **${esclusiGuildId}**`,
        '',
        '**Server autorizzati:**',
        ...risultati,
    ].join('\n');
    await interaction.editReply({
        content: risultatoFinale.slice(0, 2000),
    });
}
