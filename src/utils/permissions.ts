import { ChatInputCommandInteraction, MessageFlags, PermissionResolvable } from 'discord.js';

export async function requireGuildPermission(interaction: ChatInputCommandInteraction, permission: PermissionResolvable): Promise<boolean> {
  if (!interaction.guild || !interaction.memberPermissions?.has(permission)) {
    await interaction.reply({ content: 'Non disponi dei permessi necessari per questo comando.', flags: MessageFlags.Ephemeral });
    return false;
  }
  return true;
}
