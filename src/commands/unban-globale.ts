
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
} from 'discord.js';

import fs from 'fs';
import path from 'path';

const DIRIGENZA_ID = process.env.DIRIGENZA_ID;
const GUILD_ID = process.env.GUILD_ID;

const DATA_DIR = path.join(process.cwd(), 'data');

const GLOBAL_BAN_SERVERS_FILE = path.join(
  DATA_DIR,
  'global-ban-servers.json'
);

interface GlobalBanServers {
  guildIds: string[];
}

function loadGlobalBanServers(): GlobalBanServers {
  if (!fs.existsSync(GLOBAL_BAN_SERVERS_FILE)) {
    throw new Error(
      'Il file data/global-ban-servers.json non esiste.'
    );
  }

  const content = fs.readFileSync(
    GLOBAL_BAN_SERVERS_FILE,
    'utf8'
  );

  const data = JSON.parse(content);

  if (
    !data ||
    !Array.isArray(data.guildIds)
  ) {
    throw new Error(
      'Formato di global-ban-servers.json non valido.'
    );
  }

  const guildIds = data.guildIds.filter(
    (guildId: unknown): guildId is string =>
      typeof guildId === 'string' &&
      /^\d{17,20}$/.test(guildId)
  );

  return {
    guildIds,
  };
}

export const data = new SlashCommandBuilder()
  .setName('unban-globale')
  .setDescription(
    'Rimuove il ban globale di un utente dai server affiliati, solo dirigenza.'
  )
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('Utente da sbannare.')
      .setRequired(true)
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {

  // ============================================================
  // CONTROLLO DIRIGENZA
  // ============================================================

  if (!DIRIGENZA_ID) {
    console.error(
      '[UNBAN GLOBALE] DIRIGENZA_ID non configurato nel file .env.'
    );

    await interaction.reply({
      content:
        '❌ Il sistema di autorizzazione della dirigenza non è configurato correttamente.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  if (!interaction.guild) {
    await interaction.reply({
      content:
        '❌ Questo comando può essere utilizzato solo nei server.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  const member = await interaction.guild.members.fetch(
    interaction.user.id
  );

  if (!member.roles.cache.has(DIRIGENZA_ID)) {
    await interaction.reply({
      content:
        '❌ Non disponi del ruolo DIRIGENZA necessario per utilizzare questo comando.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  // ============================================================
  // CONTROLLO GUILD_ID
  // ============================================================

  if (!GUILD_ID) {
    console.error(
      '[UNBAN GLOBALE] GUILD_ID non configurato nel file .env.'
    );

    await interaction.reply({
      content:
        '❌ GUILD_ID non è configurato. Operazione annullata per sicurezza.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  // ============================================================
  // DATI DEL COMANDO
  // ============================================================

  const user = interaction.options.getUser('user', true);

  /*
   * Fissiamo l'ID del target una sola volta.
   *
   * Tutte le operazioni successive useranno ESCLUSIVAMENTE
   * questo ID.
   */
  const targetUserId = user.id;

  // ============================================================
  // VERIFICA TARGET
  // ============================================================

  if (targetUserId !== user.id) {
    console.error(
      '[UNBAN GLOBALE] BLOCCATO: mismatch dell\'utente target.'
    );

    await interaction.reply({
      content:
        '❌ Operazione bloccata per un errore di sicurezza del target.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  // ============================================================
  // CARICAMENTO WHITELIST SERVER
  // ============================================================

  let globalBanServers: GlobalBanServers;

  try {
    globalBanServers = loadGlobalBanServers();
  } catch (error) {
    console.error(
      '[UNBAN GLOBALE] Impossibile leggere la whitelist dei server:',
      error
    );

    await interaction.reply({
      content:
        '❌ Impossibile leggere la lista dei server autorizzati ai ban globali. Operazione annullata.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  const allowedGuildIds = new Set(
    globalBanServers.guildIds
  );

  if (allowedGuildIds.size === 0) {
    await interaction.reply({
      content:
        '❌ Non ci sono server affiliati ai ban globali. Operazione annullata.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  // ============================================================
  // RISPOSTA INIZIALE
  // ============================================================

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  // ============================================================
  // UNBAN GLOBALE
  // ============================================================

  let riusciti = 0;
  let nonBannati = 0;
  let falliti = 0;
  let nonPresenti = 0;
  let esclusiGuildId = 0;

  const risultati: string[] = [];

  /*
   * IMPORTANTISSIMO:
   *
   * Iteriamo ESCLUSIVAMENTE sui server presenti
   * nel JSON.
   */
  for (const guildId of allowedGuildIds) {

    // ========================================================
    // PROTEZIONE ASSOLUTA GUILD_ID
    // ========================================================

    /*
     * Anche se GUILD_ID fosse accidentalmente presente
     * nel JSON, NON verrà mai modificato.
     */
    if (guildId === GUILD_ID) {
      esclusiGuildId++;

      console.warn(
        `[UNBAN GLOBALE] Guild ${guildId} esclusa perché coincide con GUILD_ID.`
      );

      continue;
    }

    // ========================================================
    // VERIFICA WHITELIST
    // ========================================================

    if (!allowedGuildIds.has(guildId)) {
      console.error(
        `[UNBAN GLOBALE] BLOCCATO: Guild ${guildId} non presente nella whitelist.`
      );

      continue;
    }

    // ========================================================
    // RECUPERA GUILD
    // ========================================================

    const guild =
      interaction.client.guilds.cache.get(guildId);

    if (!guild) {
      nonPresenti++;

      risultati.push(
        `⚠️ **Guild ${guildId}** — Bot non presente nel server.`
      );

      continue;
    }

    try {

      // ======================================================
      // VERIFICA ASSOLUTA DELLA GUILD
      // ======================================================

      if (guild.id !== guildId) {
        console.error(
          `[UNBAN GLOBALE] BLOCCATO: Guild ID mismatch.`
        );

        falliti++;

        risultati.push(
          `❌ **${guild.name}** — Verifica sicurezza server fallita.`
        );

        continue;
      }

      if (guild.id === GUILD_ID) {
        console.error(
          `[UNBAN GLOBALE] BLOCCATO: tentativo di unban su GUILD_ID.`
        );

        esclusiGuildId++;

        continue;
      }

      if (!allowedGuildIds.has(guild.id)) {
        console.error(
          `[UNBAN GLOBALE] BLOCCATO: ${guild.id} non presente nella whitelist.`
        );

        falliti++;

        continue;
      }

      // ======================================================
      // PERMESSI DEL BOT
      // ======================================================

      const botMember = await guild.members.fetch(
        interaction.client.user!.id
      );

      if (!botMember.permissions.has('BanMembers')) {
        falliti++;

        risultati.push(
          `❌ **${guild.name}** — Bot senza permesso Ban Members.`
        );

        continue;
      }

      // ======================================================
      // VERIFICA TARGET
      // ======================================================

      if (targetUserId !== user.id) {
        console.error(
          `[UNBAN GLOBALE] BLOCCATO: target mismatch prima dell'unban.`
        );

        falliti++;

        risultati.push(
          `❌ **${guild.name}** — Unban bloccato dal controllo target.`
        );

        continue;
      }

      // ======================================================
      // CONTROLLO BAN
      // ======================================================

      try {
        await guild.bans.fetch(targetUserId);
      } catch {
        /*
         * L'utente non è bannato in questa guild.
         *
         * Non facciamo alcuna operazione.
         */
        nonBannati++;

        risultati.push(
          `⚪ **${guild.name}** — Utente non bannato.`
        );

        continue;
      }

      // ======================================================
      // ULTIMO CONTROLLO PRIMA DELL'UNBAN
      // ======================================================

      if (targetUserId !== user.id) {
        console.error(
          `[UNBAN GLOBALE] BLOCCATO ALL'ULTIMO CONTROLLO: target mismatch.`
        );

        falliti++;

        continue;
      }

      if (guild.id === GUILD_ID) {
        console.error(
          `[UNBAN GLOBALE] BLOCCATO ALL'ULTIMO CONTROLLO: GUILD_ID.`
        );

        esclusiGuildId++;

        continue;
      }

      if (!allowedGuildIds.has(guild.id)) {
        console.error(
          `[UNBAN GLOBALE] BLOCCATO ALL'ULTIMO CONTROLLO: guild non autorizzata.`
        );

        falliti++;

        continue;
      }

      // ======================================================
      // UNBAN
      // ======================================================

      await guild.bans.remove(
        targetUserId,
        'Rimozione ban globale'
      );

      riusciti++;

      risultati.push(
        `✅ **${guild.name}** — Utente sbannato.`
      );

    } catch (error) {
      falliti++;

      console.error(
        `[UNBAN GLOBALE] Errore nel server ${guild.name} (${guild.id}):`,
        error
      );

      risultati.push(
        `❌ **${guild.name}** — Errore durante l'unban.`
      );
    }
  }

  // ============================================================
  // RISULTATO
  // ============================================================

  const risultatoFinale = [
    `🌐 **UNBAN GLOBALE ESEGUITO**`,
    ``,
    `👤 **Utente:** ${user.tag}`,
    `🆔 **ID:** ${targetUserId}`,
    `👮 **Operatore:** ${interaction.user.tag}`,
    ``,
    `📊 **Risultato:**`,
    `✅ Sbannato: **${riusciti}**`,
    `⚪ Non bannato: **${nonBannati}**`,
    `❌ Falliti: **${falliti}**`,
    `⚠️ Bot non presente: **${nonPresenti}**`,
    `🚫 GUILD_ID esclusa: **${esclusiGuildId}**`,
    ``,
    `**Server autorizzati:**`,
    ...risultati,
  ].join('\n');

  await interaction.editReply({
    content: risultatoFinale.slice(0, 2000),
  });
}
