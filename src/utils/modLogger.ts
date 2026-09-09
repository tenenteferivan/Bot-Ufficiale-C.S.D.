import { ChatInputCommandInteraction, EmbedBuilder, User } from 'discord.js';
import { sendUserNotification } from './userNotification';

const notifiedInteractions = new WeakSet<ChatInputCommandInteraction>();
const dmEligibleCommands = new Set(['ban', 'kick', 'timeout', 'warn']);

export async function sendModNotification(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (!interaction.guild) return false;

  const subcommand = interaction.options.getSubcommand(false);
  if (!dmEligibleCommands.has(interaction.commandName.toLowerCase())) return false;
  if (interaction.commandName === 'warn' && subcommand === 'remove') return false;
  if (notifiedInteractions.has(interaction)) return false;
  notifiedInteractions.add(interaction);

  let targetUser: User | null = null;
  let targetUserId: string | null = null;

  try {
    targetUser = interaction.options.getUser('utente') || interaction.options.getUser('target');
  } catch {
    targetUser = null;
  }

  if (!targetUser) {
    const rawId = interaction.options.getString('utente') || interaction.options.getString('target');
    if (rawId) {
      targetUserId = rawId;
      targetUser = await interaction.client.users.fetch(rawId).catch(() => null);
    }
  } else {
    targetUserId = targetUser.id;
  }

  if (!targetUserId || targetUser?.bot) return false;

  const reason = interaction.options.getString('motivo') 
    || interaction.options.getString('reason') 
    || 'Nessun motivo specificato';

  const commandName = interaction.commandName.toLowerCase();
  let title = 'Notifica di Moderazione';
  let color = 0x5865F2;

  if (commandName === 'warn') {
    if (subcommand === 'remove') {
      title = '✅ Avvertimento rimosso';
      color = 0x57F287;
    } else {
      title = '⚠️ Hai ricevuto un avvertimento';
      color = 0xFEE75C;
    }
  } else if (commandName === 'kick') {
    title = '🚪 Sei stato espulso dal server C.S.D. Se ritieni sia stato un errore, contatta tenente_ferivan';
    color = 0xED4245;
  } else if (commandName === 'ban') {
    title = '🔨 Sei stato bannato dal server C.S.D. Se ritieni sia stato un errore, contatta tenente_ferivan';
    color = 0x992D22;
  } else if (commandName === 'unban') {
    title = '🔓 Sei stato sbannato dal server C.S.D. Se ritieni sia stato un errore, contatta tenente_ferivan';
    color = 0x57F287;
  } else if (commandName === 'mute' || commandName === 'timeout') {
    title = '🔇 Sei stato messo in muto';
    color = 0xE91E63;
  }

  const embed = new EmbedBuilder()
    .setTitle(`${title} in ${interaction.guild.name}`)
    .setColor(color)
    .addFields(
      { name: '📋 Motivo', value: reason, inline: false },
      { name: '🛡️ Moderatore', value: `${interaction.user.tag}`, inline: true }
    )
    .setTimestamp();

  const warnId = interaction.options.getString('warn');
  if (warnId && warnId !== 'none') {
    embed.addFields({ name: '🆔 ID Avvertimento', value: warnId, inline: true });
  }

  return targetUser ? sendUserNotification(targetUser, embed) : false;
}
