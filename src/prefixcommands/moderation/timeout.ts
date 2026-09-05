import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { parseDuration } from '../../utils/timeParser';

export const name = 'timeout';
export const aliases = ['to'];

export async function execute(message: Message, args: string[]): Promise<void> {
  if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await message.reply('❌ **Non disponi dei permessi necessari.**');
    return;
  }

  const target = message.mentions.members?.first();
  if (!target || args.length < 3) {
    await message.reply('⚠️ **Sintassi errata!** Usa: `?timeout @utente <durata> <motivo>`');
    return;
  }

  const durationStr = args[1];
  const reason = args.slice(2).join(' ');

  const durationMs = parseDuration(durationStr);
  if (!durationMs) {
    await message.reply('⚠️ **Formato durata non valido.** Sintassi accettata: `10m`, `1h`, `1d`.');
    return;
  }

  try {
    await target.timeout(durationMs, reason);
    const embed = new EmbedBuilder()
      .setColor(0xE91E63)
      .setTitle('🔇 • SANZIONE APPLICATA: TIMEOUT')
      .setThumbnail(target.user.displayAvatarURL())
      .addFields(
        { name: '👤 Utente Isolato', value: `<@${target.id}>\n\`ID: ${target.id}\``, inline: true },
        { name: '🛡️ Moderatore', value: `<@${message.author.id}>`, inline: true },
        { name: '⏱️ Durata', value: `\`${durationStr}\``, inline: true },
        { name: '📋 Motivo', value: `>>> ${reason}` }
      )
      .setFooter({ text: `Eseguito da ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (err) {
    await message.reply('❌ **Si è verificato un errore durante l\'applicazione del timeout.**');
  }
}
