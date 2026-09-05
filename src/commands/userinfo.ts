import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { createUserInfoEmbed } from '../utils/userRecord';

export const data = new SlashCommandBuilder()
  .setName('userinfo')
  .setDescription('Mostra le informazioni utente e il relativo Registro.')
  .addUserOption((option) =>
    option
      .setName('utente')
      .setDescription('L\'utente di cui visualizzare le informazioni e il registro')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser('utente') || interaction.user;

  let member = interaction.options.getMember('utente') as any;
  if (!member && interaction.guild) {
    member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  }

  try {
    const embed = await createUserInfoEmbed(targetUser, member, interaction.guildId ?? undefined);
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Errore durante l\'esecuzione di /userinfo:', error);
    await interaction.reply({
      content: '❌ Si è verificato un errore durante la generazione del registro utente.',
      flags: MessageFlags.Ephemeral,
    });
  }
}
