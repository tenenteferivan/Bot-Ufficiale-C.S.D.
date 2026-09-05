import { 
  Client, 
  GatewayIntentBits, 
  Collection, 
  Message, 
  Interaction, 
  MessageFlags,
  InteractionReplyOptions
} from 'discord.js';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { deployCommands } from './deploycommands';
import { sendModNotification } from './utils/modLogger';
import { handleTicketInteraction } from './utils/ticketInteractions';
import { handlePartnershipInteraction } from './utils/partnershipInteractions';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const token = process.env.DISCORD_TOKEN?.trim();
if (!token) {
  console.error('Errore: DISCORD_TOKEN mancante o vuoto in botcssd/.env.');
  process.exitCode = 1;
}

// Interfacce per la gestione dei comandi
export interface SlashCommand {
  data: { name: string };
  execute: (interaction: Interaction) => Promise<void>;
  autocomplete?: (interaction: Interaction) => Promise<void>;
}

export interface PrefixCommand {
  name: string;
  aliases?: string[];
  execute: (message: Message, args: string[]) => Promise<void>;
}

// Estensione del Client per contenere le raccolte in memoria
class ExtendedClient extends Client {
  public commands: Collection<string, SlashCommand> = new Collection();
  public prefixCommands: Collection<string, PrefixCommand> = new Collection();
}

const client = new ExtendedClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = process.env.PREFIX || '!';

// Funzione ricorsiva per cercare file TS/JS nelle sottocartelle
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if ((file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// 1. Caricamento dinamico dei comandi Slash
function loadSlashCommands(): void {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = getAllFiles(commandsPath);

  for (const filePath of commandFiles) {
    const required = require(filePath);
    const command: SlashCommand = required.default || required;

    if (command && command.data && 'name' in command.data && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`Caricato comando Slash: ${command.data.name}`);
    }
  }
}

// 2. Caricamento dinamico dei comandi con prefisso
function loadPrefixCommands(): void {
  const prefixPath = path.join(__dirname, 'prefixcommands');
  const prefixFiles = getAllFiles(prefixPath);

  for (const filePath of prefixFiles) {
    const required = require(filePath);
    const command: PrefixCommand = required.default || required;

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
  if (!client.user) return;
  console.log(`Autenticazione riuscita. Bot attivo come: ${client.user.tag}`);

  await deployCommands();
  
  loadSlashCommands();
  loadPrefixCommands();
  
  console.log('Inizializzazione completata con successo. Il servizio è operativo.');
});

// Gestore unico delle interazioni (Slash + autocompletamento)
client.on('interactionCreate', async (interaction: Interaction) => {
  if (await handlePartnershipInteraction(interaction)) return;
  if (await handleTicketInteraction(interaction)) return;

  // Gestione dell'autocompletamento
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command || !command.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(`Errore durante l'autocomplete del comando /${interaction.commandName}:`, error);
    }
    return;
  }

  // Gestione dei comandi chat (/comando)
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    // 1. Esecuzione standard del comando
    await command.execute(interaction);

    // 2. Intercettore globale di moderazione: valuta e invia il messaggio privato quando necessario.
    await sendModNotification(interaction);
    if (interaction.guild) {
      await logCommand(client, interaction.commandName, interaction.user, interaction.guild.id);
    }
  } catch (error) {
    console.error(`Errore durante l'esecuzione del comando Slash /${interaction.commandName}:`, error);
    
    // Asignación de tipo explícito para que tsc reconozca el valor del bitfield de MessageFlags.Ephemeral
    const errorPayload: InteractionReplyOptions = {
      content: 'Si è verificato un errore durante l\'elaborazione del comando.',
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorPayload).catch(() => {});
    } else {
      await interaction.reply(errorPayload).catch(() => {});
    }
  }
});

  // Gestore dei messaggi per i comandi con prefisso
client.on('messageCreate', async (message) => {
  // Ignora i bot
  if (message.author.bot) return;



  // Logica per i comandi con prefisso
  const prefix = PREFIX; // Usa il prefisso configurato.
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  const command = client.prefixCommands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args);
    if (message.guild) {
      await logCommand(client, command.name, message.author, message.guild.id);
    }
  } catch (error) {
    console.error(`Errore durante l'esecuzione del comando con prefisso ${commandName}:`, error);
    try {
      await message.reply('Si è verificato un errore durante l\'esecuzione del comando.');
    } catch {}
  }

});

import {
  logBan,
  logChannelCreate,
  logChannelDelete,
  logChannelUpdate,
  logMemberJoin,
  logMemberLeave,
  logMemberUpdate,
  logCommand,
  logMessageDelete,
  logRoleCreate,
  logRoleDelete,
  logRoleUpdate,
} from './utils/serverLogger';

client.on('messageDelete', (message) => logMessageDelete(client, message));
client.on('guildMemberAdd', (member) => logMemberJoin(client, member));
client.on('guildMemberRemove', (member) => logMemberLeave(client, member));
client.on('guildBanAdd', (ban) => logBan(client, ban.guild, ban.user, true));
client.on('guildBanRemove', (ban) => logBan(client, ban.guild, ban.user, false));
client.on('guildMemberUpdate', (oldMember, newMember) => logMemberUpdate(client, oldMember, newMember));
client.on('roleCreate', (role) => logRoleCreate(client, role));
client.on('roleDelete', (role) => logRoleDelete(client, role));
client.on('roleUpdate', (oldRole, newRole) => logRoleUpdate(client, oldRole, newRole));
client.on('channelCreate', (channel) => {
  if (channel.isDMBased()) return;
  logChannelCreate(client, channel);
});
client.on('channelDelete', (channel) => {
  if (channel.isDMBased()) return;
  logChannelDelete(client, channel);
});
client.on('channelUpdate', (oldChannel, newChannel) => {
  if (oldChannel.isDMBased() || newChannel.isDMBased()) return;
  logChannelUpdate(client, oldChannel, newChannel);
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
    } else {
      console.error('Login Discord fallito:', error);
    }
    process.exitCode = 1;
  });
}
