"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const modLogger_1 = require("../utils/modLogger");
const userRecord_1 = require("../utils/userRecord");
const databasehandler_1 = require("../handlers/databasehandler");
exports.default = {
    name: discord_js_1.Events.InteractionCreate,
    async execute(interaction) {
        // ============================================================
        // AUTOCOMPLETE
        // ============================================================
        if (interaction.isAutocomplete()) {
            const client = interaction.client;
            const command = client.commands.get(interaction.commandName);
            if (!command || !command.autocomplete) {
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
        // ============================================================
        // MODALS
        // ============================================================
        if (interaction.isModalSubmit()) {
            // ==========================================================
            // MODAL: SEGNALAZIONE UTENTE
            // ==========================================================
            if (interaction.customId.startsWith('segnalazione_utente:')) {
                try {
                    await interaction.deferReply({
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                    console.log('[SEGNALAZIONE] Modal ricevuto correttamente.');
                    // ------------------------------------------------------
                    // Recupera ID utente dal customId
                    // ------------------------------------------------------
                    const userId = interaction.customId.split(':')[1];
                    // ------------------------------------------------------
                    // Recupera dati modal
                    // ------------------------------------------------------
                    const motivation = interaction.fields.getTextInputValue('motivzione');
                    const facts = interaction.fields.getTextInputValue('narrazione_fatti');
                    const successServer = interaction.fields.getTextInputValue('server_successo');
                    const evidenceFile = interaction.fields.getTextInputValue('nome_file_prove');
                    // ------------------------------------------------------
                    // Salva segnalazione
                    // ------------------------------------------------------
                    const reportId = await (0, userRecord_1.addUserReport)(userId, interaction.user.id, motivation, facts, successServer, evidenceFile);
                    console.log(`[SEGNALAZIONE] Segnalazione salvata con ID #${reportId}.`);
                    // ------------------------------------------------------
                    // Crea embed
                    // ------------------------------------------------------
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor(0xED4245)
                        .setTitle(`🚨 Nuova Segnalazione #${reportId}`)
                        .addFields({
                        name: '👤 Utente Segnalato',
                        value: `<@${userId}>\n` +
                            `\`${userId}\``,
                        inline: true,
                    }, {
                        name: '👮 Operatore',
                        value: `${interaction.user}`,
                        inline: true,
                    }, {
                        name: '📌 Motivzione',
                        value: motivation.slice(0, 1024),
                        inline: false,
                    }, {
                        name: '📖 Narrazione dei Fatti',
                        value: facts.slice(0, 1024),
                        inline: false,
                    }, {
                        name: '🌐 Server del Successo',
                        value: successServer.slice(0, 1024),
                        inline: true,
                    }, {
                        name: '📁 Nome file Prove',
                        value: evidenceFile.slice(0, 1024),
                        inline: true,
                    })
                        .setFooter({
                        text: 'Sistema Segnalazioni C.S.D.',
                    })
                        .setTimestamp();
                    // ------------------------------------------------------
                    // Recupera configurazioni
                    // ------------------------------------------------------
                    const configs = await (0, databasehandler_1.getReportConfigs)();
                    let sent = 0;
                    let failed = 0;
                    // ------------------------------------------------------
                    // Pubblica in tutti i server configurati
                    // ------------------------------------------------------
                    for (const config of configs) {
                        try {
                            const guild = await interaction.client.guilds
                                .fetch(config.guildId)
                                .catch(() => null);
                            if (!guild) {
                                console.error(`[SEGNALAZIONE] Server non trovato: ${config.guildId}`);
                                failed++;
                                continue;
                            }
                            const channel = await guild.channels
                                .fetch(config.channelId)
                                .catch(() => null);
                            if (!channel ||
                                !channel.isTextBased() ||
                                !('send' in channel)) {
                                console.error(`[SEGNALAZIONE] Canale non valido: ${config.channelId}`);
                                failed++;
                                continue;
                            }
                            await channel.send({
                                embeds: [embed],
                            });
                            sent++;
                        }
                        catch (error) {
                            failed++;
                            console.error(`[SEGNALAZIONE] Errore nel server ${config.guildId}:`, error);
                        }
                    }
                    // ------------------------------------------------------
                    // Risposta privata
                    // ------------------------------------------------------
                    await interaction.editReply({
                        content: `✅ Segnalazione **#${reportId}** registrata correttamente.\n\n` +
                            `📡 Pubblicata in **${sent}** server.` +
                            (failed > 0
                                ? `\n⚠️ Non è stato possibile pubblicarla in **${failed}** server.`
                                : ''),
                    });
                    console.log(`[SEGNALAZIONE] Operazione completata. ` +
                        `ID #${reportId} | Inviate: ${sent} | Fallite: ${failed}`);
                }
                catch (error) {
                    console.error('[SEGNALAZIONE] ERRORE GENERALE:', error);
                    const errMsg = error instanceof Error
                        ? error.message
                        : String(error);
                    if (interaction.deferred ||
                        interaction.replied) {
                        await interaction.editReply({
                            content: `❌ Si è verificato un errore: ${errMsg}`,
                        }).catch(() => { });
                    }
                    else {
                        await interaction.reply({
                            content: `❌ Si è verificato un errore: ${errMsg}`,
                            flags: discord_js_1.MessageFlags.Ephemeral,
                        }).catch(() => { });
                    }
                }
                return;
            }
            // ==========================================================
            // MODAL: REGISTRAZIONE SANZIONE UTENTE
            // ==========================================================
            if (interaction.customId ===
                'registra_sanzione_utente') {
                try {
                    console.log('[SANZIONE] Modal ricevuto correttamente.');
                    // ------------------------------------------------------
                    // Risposta immediata a Discord
                    // ------------------------------------------------------
                    await interaction.deferReply({
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                    // ------------------------------------------------------
                    // Recupera dati della sanzione
                    // ------------------------------------------------------
                    const utente = interaction.fields
                        .getTextInputValue('utente')
                        .trim();
                    const operatore = interaction.fields
                        .getTextInputValue('operatore')
                        .trim();
                    const motivazione = interaction.fields
                        .getTextInputValue('motivazione')
                        .trim();
                    const descrizioneFatti = interaction.fields
                        .getTextInputValue('descrizione_fatti')
                        .trim();
                    const firma = interaction.fields
                        .getTextInputValue('firma')
                        .trim();
                    console.log('[SANZIONE] Dati della sanzione recuperati.');
                    // ------------------------------------------------------
                    // Crea embed della SANZIONE
                    // ------------------------------------------------------
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor(0xC0392B)
                        .setTitle('⚖️ Nuova Sanzione Disciplinare')
                        .setDescription('È stata registrata una nuova sanzione disciplinare a carico di un utente.')
                        .addFields({
                        name: '👤 Utente Sanzionato',
                        value: utente.slice(0, 1024),
                        inline: true,
                    }, {
                        name: '👮 Operatore',
                        value: operatore.slice(0, 1024),
                        inline: true,
                    }, {
                        name: '📌 Motivazione della Sanzione',
                        value: motivazione.slice(0, 1024),
                        inline: false,
                    }, {
                        name: '📖 Descrizione dei Fatti',
                        value: descrizioneFatti.slice(0, 1024),
                        inline: false,
                    }, {
                        name: '✍️ Firma dell\'Operatore',
                        value: firma.slice(0, 1024),
                        inline: true,
                    }, {
                        name: '🕐 Registrata da',
                        value: `${interaction.user}`,
                        inline: true,
                    })
                        .setFooter({
                        text: 'Sistema Sanzioni Disciplinari C.S.D.',
                    })
                        .setTimestamp();
                    // ------------------------------------------------------
                    // Recupera canali configurati
                    // ------------------------------------------------------
                    console.log('[SANZIONE] Recupero configurazioni canali...');
                    const configs = await (0, databasehandler_1.getSanctionConfigs)();
                    console.log(`[SANZIONE] Canali configurati: ${configs.length}`);
                    // ------------------------------------------------------
                    // Nessun canale configurato
                    // ------------------------------------------------------
                    if (configs.length === 0) {
                        await interaction.editReply({
                            content: '❌ Non è stato configurato alcun canale per la pubblicazione delle sanzioni.',
                        });
                        return;
                    }
                    // ------------------------------------------------------
                    // Pubblica la sanzione
                    // ------------------------------------------------------
                    let sent = 0;
                    let failed = 0;
                    for (const config of configs) {
                        try {
                            console.log(`[SANZIONE] Invio al server ${config.guildId}, ` +
                                `canale ${config.channelId}...`);
                            // Recupera server
                            const guild = await interaction.client.guilds
                                .fetch(config.guildId)
                                .catch(() => null);
                            if (!guild) {
                                console.error(`[SANZIONE] Server non trovato: ${config.guildId}`);
                                failed++;
                                continue;
                            }
                            // Recupera canale
                            const channel = await guild.channels
                                .fetch(config.channelId)
                                .catch(() => null);
                            if (!channel ||
                                !channel.isTextBased() ||
                                !('send' in channel)) {
                                console.error(`[SANZIONE] Canale non valido: ${config.channelId}`);
                                failed++;
                                continue;
                            }
                            // Invia sanzione
                            await channel.send({
                                embeds: [embed],
                            });
                            sent++;
                            console.log(`[SANZIONE] Sanzione pubblicata correttamente ` +
                                `nel server ${config.guildId}.`);
                        }
                        catch (error) {
                            failed++;
                            console.error(`[SANZIONE] Errore nel server ${config.guildId}:`, error);
                        }
                    }
                    // ------------------------------------------------------
                    // Risposta privata all'operatore
                    // ------------------------------------------------------
                    await interaction.editReply({
                        content: `✅ Sanzione disciplinare registrata correttamente.\n\n` +
                            `📡 Pubblicata in **${sent}** server.` +
                            (failed > 0
                                ? `\n⚠️ Non è stato possibile pubblicarla in **${failed}** server.`
                                : ''),
                    });
                    console.log(`[SANZIONE] Operazione completata. ` +
                        `Pubblicate: ${sent} | Fallite: ${failed}`);
                }
                catch (error) {
                    console.error('[SANZIONE] ERRORE GENERALE:', error);
                    const errMsg = error instanceof Error
                        ? error.message
                        : String(error);
                    if (interaction.deferred ||
                        interaction.replied) {
                        await interaction.editReply({
                            content: `❌ Si è verificato un errore durante la registrazione della sanzione: ${errMsg}`,
                        }).catch(() => { });
                    }
                    else {
                        await interaction.reply({
                            content: `❌ Si è verificato un errore durante la registrazione della sanzione: ${errMsg}`,
                            flags: discord_js_1.MessageFlags.Ephemeral,
                        }).catch(() => { });
                    }
                }
                return;
            }
            // ==========================================================
            // MODAL NON RICONOSCIUTO
            // ==========================================================
            return;
        }
        // ============================================================
        // COMANDI SLASH
        // ============================================================
        if (!interaction.isChatInputCommand()) {
            return;
        }
        const client = interaction.client;
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            return;
        }
        try {
            // Esegue il comando
            await command.execute(interaction);
            // Notifica privata/moderazione
            await (0, modLogger_1.sendModNotification)(interaction);
        }
        catch (error) {
            console.error(`Errore durante l'esecuzione del comando Slash /${interaction.commandName}:`, error);
        }
    },
};
