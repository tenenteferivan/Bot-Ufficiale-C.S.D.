
import {
  Message,
  GuildMember,
} from 'discord.js';

import fs from 'fs';
import path from 'path';

const DIRIGENZA_ID = process.env.DIRIGENZA_ID;

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(
  DATA_DIR,
  'global-ban-servers.json'
);

interface GlobalBanServers {
  guildIds: string[];
}

function loadGlobalBanServers(): GlobalBanServers {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(FILE_PATH)) {
    const initialData: GlobalBanServers = {
      guildIds: [],
    };

    fs.writeFileSync(
      FILE_PATH,
      JSON.stringify(initialData, null, 2),
      'utf8'
    );

    return initialData;
  }

  try {
    const content = fs.readFileSync(
      FILE_PATH,
      'utf8'
    );

    const data = JSON.parse(content);

    if (
      !data ||
      !Array.isArray(data.guildIds)
    ) {
      throw new Error(
        'Formato global-ban-servers.json non valido.'
      );
    }

    if (!data.guildIds.every((guildId: unknown) => typeof guildId === 'string' && /^\d{17,20}$/.test(guildId))) {
      throw new Error('global-ban-servers.json contiene ID guild non validi.');
    }

    return { guildIds: [...data.guildIds] };
  } catch (error) {
    console.error(
      '[BAN GLOBALE] Errore durante la lettura del file:',
      error
    );

    throw error;
  }
}

function saveGlobalBanServers(
  data: GlobalBanServers
): void {
  fs.writeFileSync(
    FILE_PATH,
    JSON.stringify(data, null, 2),
    'utf8'
  );
}

const command = {
  name: 'aggiungi-ban-globale',

  async execute(
    message: Message,
    args: string[]
  ): Promise<void> {

    // ============================================================
    // CONTROLLO DIRIGENZA
    // ============================================================

    if (!DIRIGENZA_ID) {
      console.error(
        '[BAN GLOBALE] DIRIGENZA_ID non configurato nel file .env.'
      );

      await message.reply(
        '❌ Il sistema di autorizzazione della dirigenza non è configurato correttamente.'
      );

      return;
    }

    if (!message.guild) {
      await message.reply(
        '❌ Questo comando può essere utilizzato solo nei server.'
      );

      return;
    }

    const member = message.member as GuildMember;

    if (!member.roles.cache.has(DIRIGENZA_ID)) {
      await message.reply(
        '❌ Non disponi del ruolo DIRIGENZA necessario per utilizzare questo comando.'
      );

      return;
    }

    // ============================================================
    // CONTROLLO ARGOMENTO
    // ============================================================

    const guildId = args[0];

    if (!guildId) {
      await message.reply(
        '❌ Devi specificare il Guild ID del server.\n\n' +
        'Esempio: `?aggiungi-ban-globale 123456789012345678`'
      );

      return;
    }

    // Discord Snowflake: controllo base dell'ID
    if (!/^\d{17,20}$/.test(guildId)) {
      await message.reply(
        '❌ Il Guild ID specificato non è valido.'
      );

      return;
    }

    // ============================================================
    // SALVATAGGIO
    // ============================================================

    try {
      const data = loadGlobalBanServers();

      if (data.guildIds.includes(guildId)) {
        await message.reply(
          '⚠️ Questo server è già presente nell\'elenco dei server affiliati ai ban globali.'
        );

        return;
      }

      data.guildIds.push(guildId);

      saveGlobalBanServers(data);

      await message.reply(
        `✅ Server aggiunto correttamente ai ban globali.\n` +
        `🆔 Guild ID: \`${guildId}\``
      );

      console.log(
        `[BAN GLOBALE] Server aggiunto: ${guildId} | ` +
        `Operatore: ${message.author.id}`
      );

    } catch (error) {
      console.error(
        '[BAN GLOBALE] Errore durante il salvataggio del server:',
        error
      );

      await message.reply(
        '❌ Si è verificato un errore durante il salvataggio del server.'
      );
    }
  },
};

export default command;
