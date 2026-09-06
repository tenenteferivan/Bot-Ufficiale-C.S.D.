
import {
  Client,
  GatewayIntentBits,
  Collection,
  Message,
  Interaction,
  MessageFlags,
  EmbedBuilder,
  InteractionReplyOptions,
} from 'discord.js';

import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import { deployCommands } from './deploycommands';
import { sendModNotification } from './utils/modLogger';

import {
  handleTicketInteraction,
} from './utils/ticketInteractions';

import {
  handlePartnershipInteraction,
} from './utils/partnershipInteractions';

import modalInteractionHandler from './events/interactionCreate';

import {
  getServerReportConfigs,
} from './handlers/databasehandler';

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

import { handleRestrictionJoin } from './handlers/restrictionHandler';

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

import {
  initializeGlobalBanExpirationSystem,
} from './commands/ban-globale';


/*
 * ============================================================
 * DOTENV
 * ============================================================
 */

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});


/*
 * ============================================================
 * TOKEN
 * ============================================================
 */

const token =
  process.env.DISCORD_TOKEN?.trim();

if (!token) {
  console.error(
    'Errore: DISCORD_TOKEN mancante o vuoto in botcsd/.env.'
  );

  process.exitCode = 1;
}


/*
 * ============================================================
 * INTERFACCE
 * ============================================================
 */

export interface SlashCommand {
  data: {
    name: string;
  };

  execute: (
    interaction: Interaction
  ) => Promise<void>;

  autocomplete?: (
    interaction: Interaction
  ) => Promise<void>;
}

export interface PrefixCommand {
  name: string;

  aliases?: string[];

  execute: (
    message: Message,
    args: string[]
  ) => Promise<void>;
}


/*
 * ============================================================
 * CLIENT
 * ============================================================
 */

class ExtendedClient extends Client {
  public commands:
    Collection<string, SlashCommand> =
    new Collection();

  public prefixCommands:
    Collection<string, PrefixCommand> =
    new Collection();
}


const client =
  new ExtendedClient({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.MessageContent,
    ],
  });


/*
 * ============================================================
 * PREFIX
 * ============================================================
 */

const PREFIX =
  process.env.PREFIX || '!';


/*
 * ============================================================
 * RICERCA FILE
 * ============================================================
 */

function getAllFiles(
  dirPath: string,
  arrayOfFiles: string[] = []
): string[] {

  if (!fs.existsSync(dirPath)) {
    return arrayOfFiles;
  }

  const files =
    fs.readdirSync(dirPath);

  files.forEach((file) => {

    const fullPath =
      path.join(
        dirPath,
        file
      );

    if (
      fs.statSync(fullPath).isDirectory()
    ) {

      arrayOfFiles =
        getAllFiles(
          fullPath,
          arrayOfFiles
        );

    } else if (
      (
        file.endsWith('.ts') ||
        file.endsWith('.js')
      ) &&
      !file.endsWith('.d.ts')
    ) {

      arrayOfFiles.push(
        fullPath
      );
    }
  });

  return arrayOfFiles;
}


/*
 * ============================================================
 * CARICAMENTO COMANDI SLASH
 * ============================================================
 */

function loadSlashCommands(): void {

  const commandsPath =
    path.join(
      __dirname,
      'commands'
    );

  const commandFiles =
    getAllFiles(
      commandsPath
    );

  for (
    const filePath
    of commandFiles
  ) {

    const required =
      require(filePath);

    const command:
      SlashCommand =
      required.default ||
      required;

    if (
      command &&
      command.data &&
      'name' in command.data &&
      'execute' in command
    ) {

      client.commands.set(
        command.data.name,
        command
      );

      console.log(
        `Caricato comando Slash: ${command.data.name}`
      );
    }
  }
}


/*
 * ============================================================
 * CARICAMENTO COMANDI PREFIX
 * ============================================================
 */

function loadPrefixCommands(): void {

  const prefixPath =
    path.join(
      __dirname,
      'prefixcommands'
    );

  const prefixFiles =
    getAllFiles(
      prefixPath
    );

  for (
    const filePath
    of prefixFiles
  ) {

    const required =
      require(filePath);

    const command:
      PrefixCommand =
      required.default ||
      required;

    if (
      command &&
      'name' in command &&
      'execute' in command
    ) {

      client.prefixCommands.set(
        command.name,
        command
      );

      console.log(
        `Caricato comando con prefisso: ${command.name}`
      );

      if (
        command.aliases &&
        Array.isArray(command.aliases)
      ) {

        for (
          const alias
          of command.aliases
        ) {

          client.prefixCommands.set(
            alias,
            command
          );
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

client.once(
  'clientReady',
  async () => {

    if (!client.user) {
      return;
    }

    console.log(
      `Autenticazione riuscita. Bot attivo come: ${client.user.tag}`
    );


    /*
     * ========================================================
     * DEPLOY COMANDI
     * ========================================================
     */

    await deployCommands();


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

    initializeGlobalBanExpirationSystem(
      client
    );


    /*
     * ========================================================
     * INIZIALIZZAZIONE COMPLETATA
     * ========================================================
     */

    console.log(
      'Inizializzazione completata con successo. Il servizio è operativo.'
    );
  }
);


/*
 * ============================================================
 * GESTORE UNICO DELLE INTERAZIONI
 * ============================================================
 */

client.on(
  'interactionCreate',
  async (interaction: Interaction) => {

    // --------------------------------------------------------
    // Partnership
    // --------------------------------------------------------

    if (
      await handlePartnershipInteraction(
        interaction
      )
    ) {
      return;
    }


    // --------------------------------------------------------
    // Ticket
    // --------------------------------------------------------

    if (
      await handleTicketInteraction(
        interaction
      )
    ) {
      return;
    }


    // --------------------------------------------------------
    // MODALI
    // --------------------------------------------------------

    if (
      interaction.isModalSubmit()
    ) {

      // ======================================================
      // SEGNALAZIONE SERVER
      // ======================================================

      if (
        interaction.customId ===
        'segnalazione_server'
      ) {

        try {

          await interaction.deferReply({
            flags:
              MessageFlags.Ephemeral,
          });


          const server =
            interaction.fields
              .getTextInputValue(
                'server'
              )
              .trim();


          const motivazione =
            interaction.fields
              .getTextInputValue(
                'motivazione'
              )
              .trim();


          const fatti =
            interaction.fields
              .getTextInputValue(
                'narrazione_fatti'
              )
              .trim();


          const prove =
            interaction.fields
              .getTextInputValue(
                'nome_file_prove'
              )
              .trim();


          console.log(
            '[SEGNALAZIONE SERVER] Modal ricevuto correttamente.'
          );


          const configs =
            await getServerReportConfigs();


          if (
            configs.length === 0
          ) {

            await interaction.editReply({
              content:
                '❌ Nessun server ha configurato un canale per le segnalazioni server.',
            });

            return;
          }


          const embed =
            new EmbedBuilder()
              .setTitle(
                '🚨 Nuova Segnalazione Server'
              )
              .setDescription(
                'È stata ricevuta una nuova segnalazione relativa a un server.'
              )
              .addFields(
                {
                  name:
                    '🖥️ Server Segnalato',

                  value:
                    server.slice(
                      0,
                      1024
                    ),

                  inline: false,
                },

                {
                  name:
                    '👤 Operatore',

                  value:
                    `<@${interaction.user.id}>`,

                  inline: true,
                },

                {
                  name:
                    '📌 Motivazione',

                  value:
                    motivazione.slice(
                      0,
                      1024
                    ),

                  inline: false,
                },

                {
                  name:
                    '📖 Narrazione dei Fatti',

                  value:
                    fatti.slice(
                      0,
                      1024
                    ),

                  inline: false,
                },

                {
                  name:
                    '📎 Prove',

                  value:
                    prove.slice(
                      0,
                      1024
                    ),

                  inline: false,
                }
              )
              .setFooter({
                text:
                  'Confederazione Server Discord • Segnalazione Server',
              })
              .setTimestamp();


          let successCount = 0;
          let errorCount = 0;


          // --------------------------------------------------
          // INVIO A TUTTI I SERVER CONFIGURATI
          // --------------------------------------------------

          for (
            const config
            of configs
          ) {

            try {

              const guild =
                await interaction.client.guilds
                  .fetch(
                    config.guildId
                  )
                  .catch(
                    () => null
                  );


              if (!guild) {

                console.warn(
                  `⚠️ Server ${config.guildId} non trovato.`
                );

                errorCount++;
                continue;
              }


              const channel =
                await guild.channels
                  .fetch(
                    config.channelId
                  )
                  .catch(
                    () => null
                  );


              if (
                !channel ||
                !channel.isTextBased() ||
                !('send' in channel)
              ) {

                console.warn(
                  `⚠️ Canale ${config.channelId} non valido nel server ${config.guildId}.`
                );

                errorCount++;
                continue;
              }


              await channel.send({
                embeds: [embed],
              });

              successCount++;

            } catch (error) {

              errorCount++;

              console.error(
                `Errore durante l'invio della segnalazione server alla guild ${config.guildId}:`,
                error
              );
            }
          }


          await interaction.editReply({
            content:
              `✅ Segnalazione server inviata correttamente a ${successCount} server.` +
              (
                errorCount > 0
                  ? `\n⚠️ ${errorCount} configurazioni non hanno potuto ricevere la segnalazione.`
                  : ''
              ),
          });


          console.log(
            `🚨 Segnalazione server inviata: ${successCount} successo/i, ${errorCount} errore/i.`
          );

        } catch (error) {

          console.error(
            'Errore durante la gestione della segnalazione server:',
            error
          );


          const errorMessage =
            error instanceof Error
              ? error.message
              : String(error);


          if (
            interaction.deferred ||
            interaction.replied
          ) {

            await interaction.editReply({
              content:
                `❌ Si è verificato un errore: ${errorMessage}`,
            }).catch(
              () => {}
            );

          } else {

            await interaction.reply({
              content:
                `❌ Si è verificato un errore: ${errorMessage}`,

              flags:
                MessageFlags.Ephemeral,
            }).catch(
              () => {}
            );
          }
        }

        return;
      }


      // ======================================================
      // TUTTI GLI ALTRI MODALI
      // ======================================================

      try {

        await modalInteractionHandler.execute(
          interaction
        );

      } catch (error) {

        console.error(
          'Errore nel gestore del modal:',
          error
        );


        if (
          interaction.deferred ||
          interaction.replied
        ) {

          await interaction.editReply({
            content:
              '❌ Si è verificato un errore durante l\'elaborazione del modal.',
          }).catch(
            () => {}
          );

        } else {

          await interaction.reply({
            content:
              '❌ Si è verificato un errore durante l\'elaborazione del modal.',

            flags:
              MessageFlags.Ephemeral,
          }).catch(
            () => {}
          );
        }
      }

      return;
    }


    // ========================================================
    // AUTOCOMPLETE
    // ========================================================

    if (
      interaction.isAutocomplete()
    ) {

      const command =
        client.commands.get(
          interaction.commandName
        );


      if (
        !command ||
        !command.autocomplete
      ) {
        return;
      }


      try {

        await command.autocomplete(
          interaction
        );

      } catch (error) {

        console.error(
          `Errore durante l'autocomplete del comando /${interaction.commandName}:`,
          error
        );
      }

      return;
    }


    // ========================================================
    // SLASH COMMAND
    // ========================================================

    if (
      !interaction.isChatInputCommand()
    ) {
      return;
    }


    const command =
      client.commands.get(
        interaction.commandName
      );


    if (!command) {
      return;
    }


    try {

      await command.execute(
        interaction
      );


      await sendModNotification(
        interaction
      );


      if (
        interaction.guild
      ) {

        await logCommand(
          client,
          interaction.commandName,
          interaction.user,
          interaction.guild.id
        );
      }

    } catch (error) {

      console.error(
        `Errore durante l'esecuzione del comando Slash /${interaction.commandName}:`,
        error
      );


      const errorPayload:
        InteractionReplyOptions = {

        content:
          'Si è verificato un errore durante l\'elaborazione del comando.',

        flags:
          MessageFlags.Ephemeral,
      };


      if (
        interaction.replied ||
        interaction.deferred
      ) {

        await interaction
          .followUp(
            errorPayload
          )
          .catch(
            () => {}
          );

      } else {

        await interaction
          .reply(
            errorPayload
          )
          .catch(
            () => {}
          );
      }
    }
  }
);


/*
 * ============================================================
 * PREFIX COMMANDS
 * ============================================================
 */

client.on(
  'messageCreate',
  async (message) => {

    if (
      message.author.bot
    ) {
      return;
    }


    const prefix =
      PREFIX;


    if (
      !message.content.startsWith(
        prefix
      )
    ) {
      return;
    }


    const args =
      message.content
        .slice(prefix.length)
        .trim()
        .split(/ +/g);


    const commandName =
      args
        .shift()
        ?.toLowerCase();


    if (!commandName) {
      return;
    }


    const command =
      client.prefixCommands.get(
        commandName
      );


    if (!command) {
      return;
    }


    try {

      await command.execute(
        message,
        args
      );


      if (
        message.guild
      ) {

        await logCommand(
          client,
          command.name,
          message.author,
          message.guild.id
        );
      }

    } catch (error) {

      console.error(
        `Errore durante l'esecuzione del comando con prefisso ${commandName}:`,
        error
      );


      try {

        await message.reply(
          'Si è verificato un errore durante l\'esecuzione del comando.'
        );

      } catch {}
    }
  }
);


/*
 * ============================================================
 * EVENTI SERVER
 * ============================================================
 */

client.on(
  'messageDelete',
  (message) =>
    logMessageDelete(
      client,
      message
    )
);


client.on(
  'guildMemberAdd',
  async (member) => {

    // --------------------------------------------------------
    // SISTEMA DE RESTRICCIONES
    // --------------------------------------------------------

    try {

      await handleRestrictionJoin(
        member
      );

    } catch (error) {

      console.error(
        '[RESTRICTION] Errore durante il controllo della restrizione:',
        error
      );
    }


    // --------------------------------------------------------
    // LOG ENTRADA AL SERVIDOR
    // --------------------------------------------------------

    try {

      await logMemberJoin(
        client,
        member
      );

    } catch (error) {

      console.error(
        '[SERVER LOG] Errore durante il log dell\'ingresso:',
        error
      );
    }

  }
);

client.on(
  'guildMemberRemove',
  (member) =>
    logMemberLeave(
      client,
      member
    )
);


client.on(
  'guildBanAdd',
  (ban) =>
    logBan(
      client,
      ban.guild,
      ban.user,
      true
    )
);


client.on(
  'guildBanRemove',
  (ban) =>
    logBan(
      client,
      ban.guild,
      ban.user,
      false
    )
);


client.on(
  'guildMemberUpdate',
  (oldMember, newMember) =>
    logMemberUpdate(
      client,
      oldMember,
      newMember
    )
);


client.on(
  'roleCreate',
  (role) =>
    logRoleCreate(
      client,
      role
    )
);


client.on(
  'roleDelete',
  (role) =>
    logRoleDelete(
      client,
      role
    )
);


client.on(
  'roleUpdate',
  (oldRole, newRole) =>
    logRoleUpdate(
      client,
      oldRole,
      newRole
    )
);


client.on(
  'channelCreate',
  (channel) => {

    if (
      channel.isDMBased()
    ) {
      return;
    }

    logChannelCreate(
      client,
      channel
    );
  }
);


client.on(
  'channelDelete',
  (channel) => {

    if (
      channel.isDMBased()
    ) {
      return;
    }

    logChannelDelete(
      client,
      channel
    );
  }
);


client.on(
  'channelUpdate',
  (oldChannel, newChannel) => {

    if (
      oldChannel.isDMBased() ||
      newChannel.isDMBased()
    ) {
      return;
    }

    logChannelUpdate(
      client,
      oldChannel,
      newChannel
    );
  }
);


/*
 * ============================================================
 * ERRORI DEL CLIENT
 * ============================================================
 */

client.on(
  'error',
  (error) => {

    console.error(
      'Errore del client Discord:',
      error
    );
  }
);


client.on(
  'shardError',
  (error) => {

    console.error(
      'Errore della connessione Discord:',
      error
    );
  }
);


/*
 * ============================================================
 * LOGIN
 * ============================================================
 */

if (token) {

  client.login(token)
    .catch((error) => {

      if (
        error?.code ===
        'TokenInvalid'
      ) {

        console.error(
          'Login Discord fallito: il token è invalido o revocato. Generane uno nuovo dal Developer Portal.'
        );

      } else {

        console.error(
          'Login Discord fallito:',
          error
        );
      }

      process.exitCode = 1;
    });
}

