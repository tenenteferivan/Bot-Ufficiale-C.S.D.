import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  Guild,
  GuildMember,
  Interaction,
  ModalBuilder,
  OverwriteType,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { db } from '../handlers/databasehandler';
export { isTicketGuild } from './ticketScope';

export const ticketCategories = {
  amministrazione: { label: 'Amministrazione', emoji: '🛡️', description: 'Questioni burocratiche, gestionali o riservate.' },
  assistenza: { label: 'Assistenza Generale', emoji: '💬', description: 'Dubbi, informazioni e supporto sul server.' },
  partnership: { label: 'Partnership / Collaborazione', emoji: '🤝', description: 'Proposte commerciali, affiliati o collaborazioni.' },
  segnalazione: { label: 'Segnalazione', emoji: '🚨', description: 'Violazioni del regolamento o utenti problematici.' },
  richiesta_entrata: { label: 'Richiesta Entrata', emoji: '📝', description: 'Richiesta entrata Nella Confederazione.' },
  mediazione_conflitto: { label: 'Mediazione Conflitto', emoji: '⚖️', description: 'Mediazione e risoluzione di conflitti tra utenti o server.' },
} as const;

export type TicketCategory = keyof typeof ticketCategories;

export interface TicketConfig {
  guildId: string;
  panelChannelId: string;
  staffRoleId: string;
  nextNumber: number;
}

export interface TicketRecord {
  channelId: string;
  guildId: string;
  ticketNumber: number;
  openerId: string;
  category: TicketCategory;
  claimedBy: string | null;
  status: 'open';
  createdAt: string;
}

function run(sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (error) => error ? reject(error) : resolve());
  });
}

function get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => error ? reject(error) : resolve(row as T | undefined));
  });
}

function all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows as T[]));
  });
}

export async function getTicketConfig(guildId: string): Promise<TicketConfig | null> {
  const row = await get<{ guild_id: string; panel_channel_id: string; staff_role_id: string; next_number: number }>(
    'SELECT guild_id, panel_channel_id, staff_role_id, next_number FROM ticket_configs WHERE guild_id = ?',
    [guildId],
  );
  if (!row) return null;
  return { guildId: row.guild_id, panelChannelId: row.panel_channel_id, staffRoleId: row.staff_role_id, nextNumber: row.next_number };
}

export function saveTicketConfig(guildId: string, panelChannelId: string, staffRoleId: string): Promise<void> {
  return run(
    `INSERT INTO ticket_configs (guild_id, panel_channel_id, staff_role_id)
      VALUES (?, ?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET panel_channel_id = excluded.panel_channel_id, staff_role_id = excluded.staff_role_id`,
    [guildId, panelChannelId, staffRoleId],
  );
}

export async function reserveTicketNumber(guildId: string): Promise<number> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN IMMEDIATE', (beginError) => {
        if (beginError) return reject(beginError);
        db.get<{ next_number: number }>('SELECT next_number FROM ticket_configs WHERE guild_id = ?', [guildId], (getError, row) => {
          if (getError || !row) {
            db.run('ROLLBACK');
            return reject(getError ?? new Error('Configurazione ticket non trovata.'));
          }
          db.run('UPDATE ticket_configs SET next_number = next_number + 1 WHERE guild_id = ?', [guildId], (updateError) => {
            if (updateError) {
              db.run('ROLLBACK');
              return reject(updateError);
            }
            db.run('COMMIT', (commitError) => commitError ? reject(commitError) : resolve(row.next_number));
          });
        });
      });
    });
  });
}

export async function releaseTicketNumber(guildId: string, reservedNumber: number): Promise<void> {
  await run(
    `UPDATE ticket_configs
     SET next_number = next_number - 1
     WHERE guild_id = ? AND next_number = ?`,
    [guildId, reservedNumber + 1],
  );
}

export async function createTicketRecord(
  channelId: string,
  guildId: string,
  openerId: string,
  category: TicketCategory,
  reservedNumber?: number,
): Promise<TicketRecord> {
  const ticketNumber = reservedNumber ?? await reserveTicketNumber(guildId);
  const createdAt = new Date().toISOString();
  await run(
    `INSERT INTO tickets (channel_id, guild_id, ticket_number, opener_id, category, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [channelId, guildId, ticketNumber, openerId, category, createdAt],
  );
  return { channelId, guildId, ticketNumber, openerId, category, claimedBy: null, status: 'open', createdAt };
}

export async function getTicket(channelId: string): Promise<TicketRecord | null> {
  const row = await get<any>('SELECT * FROM tickets WHERE channel_id = ? AND status = \'open\'', [channelId]);
  if (!row) return null;
  return {
    channelId: row.channel_id,
    guildId: row.guild_id,
    ticketNumber: row.ticket_number,
    openerId: row.opener_id,
    category: row.category as TicketCategory,
    claimedBy: row.claimed_by,
    status: 'open',
    createdAt: row.created_at,
  };
}

export function closeTicketRecord(channelId: string): Promise<void> {
  return run('UPDATE tickets SET status = \'closed\' WHERE channel_id = ?', [channelId]);
}

export function deleteTicketRecord(channelId: string): Promise<void> {
  return run('DELETE FROM tickets WHERE channel_id = ?', [channelId]);
}

export async function listOpenTickets(guildId: string): Promise<TicketRecord[]> {
  const rows = await all<any>('SELECT * FROM tickets WHERE guild_id = ? AND status = \'open\'', [guildId]);
  return rows.map((row) => ({
    channelId: row.channel_id,
    guildId: row.guild_id,
    ticketNumber: row.ticket_number,
    openerId: row.opener_id,
    category: row.category as TicketCategory,
    claimedBy: row.claimed_by,
    status: 'open' as const,
    createdAt: row.created_at,
  }));
}

export function ticketPanelComponents(): ActionRowBuilder<StringSelectMenuBuilder>[] {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket:category')
    .setPlaceholder('Seleziona il motivo della richiesta')
    .addOptions(Object.entries(ticketCategories).map(([value, category]) => ({
      value,
      label: category.label,
      description: category.description,
      emoji: category.emoji,
    })));
  return [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)];
}

export function ticketWelcomeComponents(): ActionRowBuilder<ButtonBuilder>[] {
  return [new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('ticket:claim').setLabel('Reclama').setEmoji('🙋').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket:close').setLabel('Chiudi').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  )];
}

export function ticketEmbed(category: TicketCategory, ticketNumber?: number): EmbedBuilder {
  const details = ticketCategories[category];
  return new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`${details.emoji} Supporto C.S.D. ${ticketNumber ? `#${String(ticketNumber).padStart(4, '0')}` : ''}`)
    .setDescription(`Categoria: **${details.label}**\n${details.description}\n\nDescrivi qui la tua richiesta in modo dettagliato. Un membro dello staff ti risponderà appena possibile.`)
    .setFooter({ text: 'C.S.D. Supporto' })
    .setTimestamp();
}

export function ticketOverwrites(guild: Guild, openerId: string, staffRoleId: string) {
  return [
    { id: guild.roles.everyone.id, type: OverwriteType.Role, deny: [PermissionFlagsBits.ViewChannel] },
    { id: openerId, type: OverwriteType.Member, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
    { id: staffRoleId, type: OverwriteType.Role, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
  ];
}

export async function applyClaim(channel: any, ticket: TicketRecord, config: TicketConfig, member: GuildMember): Promise<boolean> {
  const claimed = await new Promise<boolean>((resolve, reject) => {
    db.run(
      "UPDATE tickets SET claimed_by = ? WHERE channel_id = ? AND status = 'open' AND claimed_by IS NULL",
      [member.id, ticket.channelId],
      function (error) { error ? reject(error) : resolve(this.changes === 1); },
    );
  });
  if (!claimed) return false;

  const overwriteIds = [config.staffRoleId, ticket.openerId, member.id];
  const previousOverwrites = new Map<string, { allow: string[]; deny: string[] } | null>();
  for (const id of overwriteIds) {
    const overwrite = channel.permissionOverwrites.cache.get(id);
    previousOverwrites.set(id, overwrite ? {
      allow: overwrite.allow.toArray(),
      deny: overwrite.deny.toArray(),
    } : null);
  }

  const restoreOverwrites = async (): Promise<void> => {
    const previousValue = (previous: { allow: string[]; deny: string[] }, permission: string): true | false | null => {
      if (previous.allow.includes(permission)) return true;
      if (previous.deny.includes(permission)) return false;
      return null;
    };

    for (const id of overwriteIds) {
      const previous = previousOverwrites.get(id);
      if (!previous) {
        await channel.permissionOverwrites.delete(id);
      } else {
        await channel.permissionOverwrites.edit(id, {
          ViewChannel: previousValue(previous, 'ViewChannel'),
          SendMessages: previousValue(previous, 'SendMessages'),
          AttachFiles: previousValue(previous, 'AttachFiles'),
          ReadMessageHistory: previousValue(previous, 'ReadMessageHistory'),
        });
      }
    }
  };

  try {
    await channel.permissionOverwrites.edit(config.staffRoleId, { ViewChannel: false, SendMessages: false, AttachFiles: false, ReadMessageHistory: false });
    await channel.permissionOverwrites.edit(ticket.openerId, { ViewChannel: true, SendMessages: true, AttachFiles: true, ReadMessageHistory: true });
    await channel.permissionOverwrites.edit(member.id, { ViewChannel: true, SendMessages: true, AttachFiles: true, ReadMessageHistory: true });
    return true;
  } catch (error) {
    try {
      await restoreOverwrites();
    } catch (restoreError) {
      console.error('Impossibile ripristinare completamente i permessi del ticket:', restoreError);
    }
    await run("UPDATE tickets SET claimed_by = NULL WHERE channel_id = ? AND claimed_by = ?", [ticket.channelId, member.id]);
    throw error;
  }
}

export async function releaseClaim(channel: any, ticket: TicketRecord, config: TicketConfig): Promise<void> {
  await channel.permissionOverwrites.delete(ticket.claimedBy ?? '');
  await channel.permissionOverwrites.edit(config.staffRoleId, { ViewChannel: true, SendMessages: true, AttachFiles: true, ReadMessageHistory: true });
  await run("UPDATE tickets SET claimed_by = NULL WHERE channel_id = ? AND status = 'open'", [ticket.channelId]);
}

export function isStaff(member: GuildMember, config: TicketConfig): boolean {
  return member.roles.cache.has(config.staffRoleId) || member.permissions.has(PermissionFlagsBits.Administrator);
}

export function closeModal(customId = 'ticket:close-modal'): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle('Chiudi ticket')
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId('reason').setLabel('Motivazione della chiusura').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000),
    ));
}

export function categoryFromValue(value: string): TicketCategory | null {
  return value in ticketCategories ? value as TicketCategory : null;
}
