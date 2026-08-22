import { Message, PermissionFlagsBits, EmbedBuilder, TextChannel } from 'discord.js';
import path from 'path';
import fs from 'fs';
import { db, saveSanction } from '../handlers/databasehandler';

// Inizializzazione della directory /data e di SQLite
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '!': 'i', '3': 'e', '4': 'a',
  '@': 'a', '5': 's', '$': 's', '7': 't', '8': 'b',
};

function normalizeText(text: string): string {
  let normalized = text.toLowerCase();
  normalized = normalized.replace(/[01!34@5$78]/g, (char) => LEET_MAP[char] || char);
  return normalized.replace(/\s+/g, ' ').trim();
}

function getBadWords(): string[] {
  try {
    const configPath = path.join(process.cwd(), 'config/badwords.json');
    if (!fs.existsSync(configPath)) return [];

    const rawData = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(rawData);

    if (!parsed.badwords) return [];

    return parsed.badwords
      .split(',')
      .map((w: string) => w.trim().toLowerCase())
      .filter((w: string) => w.length > 0);
  } catch {
    return [];
  }
}

/**
 * Verifica se un utente è nella lista di esclusione del server.
 */
function isUserWhitelisted(guildId: string, userId: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Supporta schemi precedenti in cui l'ID utente può essere in targetId o userId.
    const query = 'SELECT 1 FROM automod_whitelist WHERE guildId = ? AND (userId = ? OR targetId = ?) LIMIT 1';
    db.get(query, [guildId, userId, userId], (err, row) => {
      if (err || !row) resolve(false);
      else resolve(true);
    });
  });
}

export async function checkAutoMod(message: Message): Promise<boolean> {
  if (message.author.bot || !message.guild || !message.member) return false;

  // Gli utenti nella lista di esclusione non vengono controllati da AutoMod.
  const whitelisted = await isUserWhitelisted(message.guild.id, message.author.id);
  if (whitelisted) return false;

  const badWords = getBadWords();
  if (badWords.length === 0) return false;

  const cleanContent = normalizeText(message.content);
  const detectedWord = badWords.find((word) => cleanContent.includes(word));

  if (!detectedWord) return false;

  if (message.deletable) {
    await message.delete().catch(() => {});
  }

  const reason = `AutoMod: parola vietata rilevata (${detectedWord})`;

  const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
  if (!isAdmin && message.member.moderatable) {
    const ONE_MINUTE_MS = 60 * 1000;
    await message.member.timeout(ONE_MINUTE_MS, reason).catch(() => {});
  }

  await saveSanction({
    userId: message.author.id,
    moderatorId: message.client.user?.id || 'AUTOMOD',
    guildId: message.guild.id,
    type: 'AUTOMOD',
    reason,
    duration: isAdmin ? null : '1m',
  }).catch(() => {});

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('⚠️ • AUTOMOD: LINGUAGGIO NON CONSENTITO')
    .setDescription(
      `Hey ${message.author}, il tuo messaggio è stato rimosso perché conteneva termini non consentiti nel server.`
    )
    .addFields(
      { name: '⏱️ Sanzione', value: isAdmin ? '`Nessuna (Amministratore)`' : '`Timeout (1 Minuto)`', inline: true },
      { name: '📋 Motivo', value: reason, inline: false },
      { name: '📋 Registro Aggiornato', value: '`L\'infrazione è stata aggiunta al tuo registro.`', inline: true }
    )
    .setFooter({ text: 'Sistema di Moderazione Automatica' })
    .setTimestamp();

  if (message.channel.isTextBased()) {
    const channel = message.channel as TextChannel;
    const warningMsg = await channel.send({
      content: `<@${message.author.id}>`,
      embeds: [embed],
    }).catch(() => null);

    if (warningMsg) {
      setTimeout(() => {
        warningMsg.delete().catch(() => {});
      }, 8000);
    }
  }

  await message.author.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('⚠️ Sanzione AutoMod')
        .setDescription('Il tuo messaggio è stato rimosso e la sanzione è stata registrata.')
        .addFields(
          { name: '📋 Motivo', value: reason, inline: false },
          { name: '⏱️ Sanzione', value: isAdmin ? 'Nessuna' : 'Timeout di 1 minuto', inline: true }
        )
        .setTimestamp(),
    ],
  }).catch(() => {});

  return true;
}