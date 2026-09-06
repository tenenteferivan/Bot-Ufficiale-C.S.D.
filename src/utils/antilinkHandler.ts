import {
  Message,
} from 'discord.js';

import {
  getAntiLinkConfig,
} from './antilinkManager';

const URL_REGEX =
  /(?:https?:\/\/|www\.|(?:discord\.gg|discord\.com\/invite)\/|(?<![@\w.-])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s]*)?)/i;

export function containsLink(
  content: string
): boolean {
  return URL_REGEX.test(content);
}

export function isAntiLinkWhitelisted(
  message: Message,
  config: ReturnType<typeof getAntiLinkConfig>
): boolean {
  if (
    config.whitelistedUsers.includes(
      message.author.id
    )
  ) {
    return true;
  }

  if (
    message.member
  ) {
    for (const roleId of config.whitelistedRoles) {
      if (
        message.member.roles.cache.has(
          roleId
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

export async function handleAntiLink(
  message: Message
): Promise<void> {
  if (!message.guild) {
    return;
  }

  if (message.author.bot) {
    return;
  }

  const config =
    getAntiLinkConfig(
      message.guild.id
    );

  if (!config.enabled) {
    return;
  }

  if (
    isAntiLinkWhitelisted(
      message,
      config
    )
  ) {
    return;
  }

  if (
    !containsLink(
      message.content
    )
  ) {
    return;
  }

  try {
    await message.delete();

    console.log(
      `[ANTILINK] Link eliminato da ${message.author.tag} (${message.author.id}) nel server ${message.guild.name} (${message.guild.id}).`
    );

if (
  message.channel.isTextBased() &&
  'send' in message.channel
) {
  await message.channel.send({
    content:
      `🚫 ${message.author}, non puoi utilizzare link in questo server.`,
    allowedMentions: {
      users: [
        message.author.id,
      ],
    },
  });
}

  } catch (error) {
    console.error(
      `[ANTILINK] Impossibile eliminare il messaggio di ${message.author.tag} (${message.author.id}) nel server ${message.guild.name} (${message.guild.id}):`,
      error
    );
  }
}