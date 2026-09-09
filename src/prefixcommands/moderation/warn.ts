import { EmbedBuilder, Message, PermissionFlagsBits } from 'discord.js';
import { sendUserNotification } from '../../utils/userNotification';

export const name = 'warn';

export async function execute(message: Message, args: string[]): Promise<void> {
  if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await message.reply('Non disponi dei permessi necessari.');
    return;
  }
  const target = message.mentions.users.first();
  const reason = args.slice(1).join(' ');
  if (!target || !reason) {
    await message.reply('Sintassi: !warn @utente <motivo>');
    return;
  }
  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('⚠️ Hai ricevuto un avvertimento')
    .setDescription(`Motivo: ${reason}`)
    .setTimestamp();
  await message.reply(`Avvertimento inviato a ${target}.`);
  await sendUserNotification(target, embed);
}
