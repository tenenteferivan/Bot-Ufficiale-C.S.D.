import { Events, Interaction, ChatInputCommandInteraction } from 'discord.js';
import { sendModNotification } from '../utils/modLogger';
import { SlashCommand } from '../index';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction): Promise<void> {
    // 1. Gestione dell'autocompletamento
    if (interaction.isAutocomplete()) {
      const client = interaction.client as any;
      const command: SlashCommand | undefined = client.commands.get(interaction.commandName);
      if (!command || !command.autocomplete) return;

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(`Errore durante l'autocomplete del comando /${interaction.commandName}:`, error);
      }
      return;
    }

    // 2. Gestione dei comandi chat (/comando)
    if (!interaction.isChatInputCommand()) return;

    // Usa interaction.client per accedere alla raccolta dei comandi in memoria.
    const client = interaction.client as any;
    const command: SlashCommand | undefined = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      // Esecuzione del comando Slash
      await command.execute(interaction);

      // Notifica automaticamente tramite messaggio privato l'utente interessato.
      await sendModNotification(interaction);
    } catch (error) {
      console.error(`Errore durante l'esecuzione del comando Slash /${interaction.commandName}:`, error);
    }
  },
};