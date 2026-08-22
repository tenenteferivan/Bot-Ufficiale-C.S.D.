import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { addUserNote, changeUserPoints, ensureLowPointsNote, saveSanction } from '../handlers/databasehandler';
import { parsePointAmount } from '../utils/points';

export const data = new SlashCommandBuilder()
  .setName('aggiungi')
  .setDescription('Aggiunge punti o un appunto al registro di un utente.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommandGroup((group) =>
    group
      .setName('punti')
      .setDescription('Aggiunge punti al registro.')
      .addSubcommand((subcommand) => subcommand
        .setName('utente')
        .setDescription('Aggiunge punti a un utente.')
        .addUserOption((option) => option.setName('utente').setDescription('Utente interessato').setRequired(true))
        .addStringOption((option) => option.setName('quantita').setDescription('Quantità, ad esempio 1.2 o 1,2').setRequired(true))
        .addStringOption((option) => option.setName('motivo').setDescription('Motivo della modifica').setRequired(true)))
  )
  .addSubcommandGroup((group) =>
    group
      .setName('appunto')
      .setDescription('Aggiunge un appunto al registro.')
      .addSubcommand((subcommand) => subcommand
        .setName('utente')
        .setDescription('Aggiunge un appunto a un utente.')
        .addUserOption((option) => option.setName('utente').setDescription('Utente interessato').setRequired(true))
        .addStringOption((option) => option.setName('appunto').setDescription('Testo dell’appunto').setRequired(true)))
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;

  const group = interaction.options.getSubcommandGroup(true);
  const targetUser = interaction.options.getUser('utente', true);

  if (group === 'punti') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: '❌ Solo gli amministratori possono aggiungere punti.', flags: MessageFlags.Ephemeral });
      return;
    }

    const amountText = interaction.options.getString('quantita', true);
    const amount = parsePointAmount(amountText);
    const reason = interaction.options.getString('motivo', true);
    if (amount === null) {
      await interaction.reply({ content: '❌ Inserisci una quantità positiva con al massimo una cifra decimale, ad esempio 1.2 o 1,2.', flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      const points = await changeUserPoints(targetUser.id, interaction.guild.id, amount);
      await savePointChange(interaction, targetUser.id, amount, reason);
      await ensureLowPointsNote(targetUser.id, interaction.guild.id, interaction.client.user?.id || 'SISTEMA');
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('➕ Punti aggiunti al registro')
        .addFields(
          { name: '👤 Utente', value: `${targetUser}`, inline: true },
          { name: '⭐ Punti aggiunti', value: `+${amount.toFixed(1)}`, inline: true },
          { name: '⭐ Totale punti', value: points.toFixed(1), inline: true },
          { name: '📋 Motivo', value: reason }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      await targetUser.send({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      await interaction.reply({ content: '❌ I punti devono rimanere tra 0 e 15.', flags: MessageFlags.Ephemeral });
    }
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({ content: '❌ Solo i moderatori possono aggiungere appunti.', flags: MessageFlags.Ephemeral });
    return;
  }

  const note = interaction.options.getString('appunto', true);
  try {
    await addUserNote(targetUser.id, interaction.guild.id, interaction.user.id, note);
    await interaction.reply({ content: `✅ Appunto aggiunto al registro di ${targetUser}.`, flags: MessageFlags.Ephemeral });
    await targetUser.send(`📌 È stato aggiunto un appunto al tuo registro: ${note}`).catch(() => {});
  } catch {
    await interaction.reply({ content: '❌ Impossibile aggiungere l’appunto.', flags: MessageFlags.Ephemeral });
  }
}

async function savePointChange(interaction: ChatInputCommandInteraction, userId: string, amount: number, reason: string): Promise<void> {
  await saveSanction({
    userId,
    moderatorId: interaction.user.id,
    guildId: interaction.guild!.id,
    type: 'PUNTI_AGGIUNTI',
    reason,
    duration: `+${amount.toFixed(1)}`,
  });
}