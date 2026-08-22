import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { saveSanction } from '../../handlers/databasehandler';

export const name = 'unban';

export async function execute(message: Message, args: string[]): Promise<void> {
  if (!message.member?.permissions.has(PermissionFlagsBits.BanMembers)) {
    await message.reply('❌ **Non disponi dei permessi necessari.**');
    return;
  }

  const userId = args[0];
  const reason = args.slice(1).join(' ');

  if (!userId || !reason) {
    await message.reply('⚠️ **Sintassi errata!** Usa: `?unban <ID_Utente> <motivo>`');
    return;
  }

  try {
    await message.guild?.members.unban(userId, reason);
    await saveSanction({
      userId,
      moderatorId: message.author.id,
      guildId: message.guild!.id,
      type: 'UNBAN',
      reason,
    });

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🔓 • REVOCA SANZIONE: UNBAN')
      .addFields(
        { name: '👤 ID Utente Sbannato', value: `\`${userId}\``, inline: true },
        { name: '🛡️ Moderatore', value: `<@${message.author.id}>`, inline: true },
        { name: '📋 Motivo Revoca', value: `>>> ${reason}` }
      )
      .setFooter({ text: `Eseguito da ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (err) {
    await message.reply('❌ **Impossibile revocare il ban.** Controlla l\'ID dell\'utente.');
  }
}