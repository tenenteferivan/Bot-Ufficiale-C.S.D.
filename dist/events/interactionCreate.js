"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const modLogger_1 = require("../utils/modLogger");
exports.default = {
    name: discord_js_1.Events.InteractionCreate,
    async execute(interaction) {
        // 1. Gestione dell'autocompletamento
        if (interaction.isAutocomplete()) {
            const client = interaction.client;
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
        // 2. Gestione dei comandi chat (/comando)
        if (!interaction.isChatInputCommand())
            return;
        // Usa interaction.client per accedere alla raccolta dei comandi in memoria.
        const client = interaction.client;
        const command = client.commands.get(interaction.commandName);
        if (!command)
            return;
        try {
            // Esecuzione del comando Slash
            await command.execute(interaction);
            // Notifica automaticamente tramite messaggio privato l'utente interessato.
            await (0, modLogger_1.sendModNotification)(interaction);
        }
        catch (error) {
            console.error(`Errore durante l'esecuzione del comando Slash /${interaction.commandName}:`, error);
        }
    },
};
