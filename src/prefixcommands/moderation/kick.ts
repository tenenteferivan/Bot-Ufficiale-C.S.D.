import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const name = 'kick';

export async function execute(message: Message, args: string[]): Promise<void> {
  if (!message.member?.permissions.has(PermissionFlagsBits.KickMembers)) {
    await message.reply('❌ **Non disponi dei permessi necessari per espellere utenti.**');
    return;
  }

  const target = message.mentions.members?.first();
  if (!target || args.length < 2) {
    await message.reply('⚠️ **Sintassi errata!** Usa: `?kick @utente <motivo>`');
    return;
  }

  const reason = args.slice(1).join(' ');

  try {
    await target.kick(reason);
    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle('🚪 • SANZIONE APPLICATA: KICK')
      .setThumbnail(target.user.displayAvatarURL())
      .addFields(
        { name: '👤 Utente Espulso', value: `<@${target.id}>\n\`ID: ${target.id}\``, inline: true },
        { name: '🛡️ Moderatore', value: `<@${message.author.id}>`, inline: true },
        { name: '📋 Motivo dell\'Espulsione', value: `>>> ${reason}` }
      )
      .setFooter({ text: `Eseguito da ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (err) {
    await message.reply('❌ **Impossibile espellere l\'utente.** Controlla la gerarchia dei ruoli.');
  }
}
