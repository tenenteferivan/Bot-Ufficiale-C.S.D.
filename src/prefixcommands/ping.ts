import { Message } from 'discord.js';
import { createPingEmbed } from '../utils/pingEmbed';

export const name = 'ping';

export async function execute(message: Message, _args: string[]): Promise<void> {
  const sentMessage = await message.reply('Rilevamento della latenza in corso...');

  const botPing = sentMessage.createdTimestamp - message.createdTimestamp;
  const apiPing = message.client.ws.ping;
  const uptime = message.client.uptime ?? 0;

  const embed = createPingEmbed(botPing, apiPing, uptime);

  await sentMessage.edit({ content: null, embeds: [embed] });
}