import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { saveSanction } from '../../handlers/databasehandler';

export const name = 'untimeout';
export const aliases = ['rto'];

export async function execute(message: Message, args: string[]): Promise<void> {
  if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await message.reply('❌ **Non disponi dei permessi necessari.**');
    return;
  }

  const target = message.mentions.members?.first();
  if (!target || args.length < 2) {
    await message.reply('⚠️ **Sintassi errata!** Usa: `?untimeout @utente <motivo>`');
    return;
  }

  const reason = args.slice(1).join(' ');

  try {
    await target.timeout(null, reason);
    await saveSanction({
      userId: target.id,
      moderatorId: message.author.id,
      guildId: message.guild!.id,
      type: 'UNTIMEOUT',
      reason,
    });

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🔊 • REVOCA SANZIONE: UNTIMEOUT')
      .setThumbnail(target.user.displayAvatarURL())
      .addFields(
        { name: '👤 Utente Riabilitato', value: `<@${target.id}>\n\`ID: ${target.id}\``, inline: true },
        { name: '🛡️ Moderatore', value: `<@${message.author.id}>`, inline: true },
        { name: '📋 Motivo della Revoca', value: `>>> ${reason}` }
      )
      .setFooter({ text: `Eseguito da ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (err) {
    await message.reply('❌ **Si è verificato un errore durante la rimozione del timeout.**');
  }
}