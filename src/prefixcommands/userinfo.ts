import { Message, User } from 'discord.js';
import { createUserInfoEmbed } from '../utils/userRecord';

export const name = 'userinfo';
export const aliases = ['user', 'uinfo', 'registro'];

export async function execute(message: Message, args: string[]): Promise<void> {
  let targetUser: User | null = message.mentions.users.first() || null;

  if (!targetUser && args[0]) {
    const rawId = args[0].replace(/[^0-9]/g, '');
    if (rawId) {
      targetUser = await message.client.users.fetch(rawId).catch(() => null);
    }
  }

  if (!targetUser) {
    targetUser = message.author;
  }

  let member = null;
  if (message.guild) {
    member = await message.guild.members.fetch(targetUser.id).catch(() => null);
  }

  try {
    const embed = await createUserInfoEmbed(targetUser, member);
    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Errore durante l\'esecuzione del comando con prefisso userinfo:', error);
    await message.reply('❌ Si è verificato un errore durante il recupero delle informazioni dell\'utente.');
  }
}
