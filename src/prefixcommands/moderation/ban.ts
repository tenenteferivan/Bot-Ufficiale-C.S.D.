import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { sendUserNotification } from '../../utils/userNotification';

export const name = 'ban';

export async function execute(message: Message, args: string[]): Promise<void> {
  if (!message.member?.permissions.has(PermissionFlagsBits.BanMembers)) {
    await message.reply('❌ **Non disponi dei permessi necessari per bannare utenti.**');
    return;
  }

  const target = message.mentions.users.first();
  if (!target || args.length < 2) {
    await message.reply('⚠️ **Sintassi errata!** Usa: `?ban @utente <motivo>`');
    return;
  }

  const reason = args.slice(1).join(' ');

  try {
    await message.guild?.members.ban(target.id, { reason });
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🔨 • SANZIONE APPLICATA: BAN')
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '👤 Utente Bandito', value: `<@${target.id}>\n\`ID: ${target.id}\``, inline: true },
        { name: '🛡️ Moderatore', value: `<@${message.author.id}>`, inline: true },
        { name: '📋 Motivo del Ban', value: `>>> ${reason}` }
      )
      .setFooter({ text: `Eseguito da ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    await sendUserNotification(target, embed);
  } catch (err) {
    await message.reply('❌ **Errore durante l\'esecuzione del ban.** Verifica i permessi.');
  }
}
