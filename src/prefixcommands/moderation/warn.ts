import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { saveSanction } from '../../handlers/databasehandler';

export const name = 'warn';

export async function execute(message: Message, args: string[]): Promise<void> {
  if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await message.reply('❌ **Non disponi dei permessi necessari.**');
    return;
  }

  const target = message.mentions.users.first();
  if (!target || args.length < 2) {
    await message.reply('⚠️ **Sintassi errata!** Usa: `?warn @utente <motivo>`');
    return;
  }

  const reason = args.slice(1).join(' ');

  try {
    await saveSanction({
      userId: target.id,
      moderatorId: message.author.id,
      guildId: message.guild!.id,
      type: 'WARN',
      reason,
    });

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle('⚠️ • SANZIONE APPLICATA: WARN')
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '👤 Utente Avvertito', value: `<@${target.id}>\n\`ID: ${target.id}\``, inline: true },
        { name: '🛡️ Moderatore', value: `<@${message.author.id}>`, inline: true },
        { name: '📋 Motivo', value: `>>> ${reason}` }
      )
      .setFooter({ text: `Eseguito da ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (err) {
    await message.reply('❌ **Errore durante il salvataggio dell\'avvertimento.**');
  }
}