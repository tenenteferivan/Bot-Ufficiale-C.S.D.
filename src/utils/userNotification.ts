import { EmbedBuilder, User } from 'discord.js';

export async function sendUserNotification(user: User, embed: EmbedBuilder): Promise<boolean> {
  if (user.bot) return false;

  try {
    await user.send({ embeds: [embed] });
    return true;
  } catch (error: any) {
    if (error?.code === 50007 || error?.code === 50278) {
      console.warn(`[UserNotice] Impossibile inviare DM a ${user.tag}.`);
    } else {
      console.error(`[UserNotice] Errore invio DM a ${user.tag}:`, error);
    }
    return false;
  }
}
