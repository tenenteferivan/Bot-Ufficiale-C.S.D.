import {
  ActionRowBuilder,
  EmbedBuilder,
  Interaction,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { canPublishPartnership, getPartnershipConfig, savePartnershipSubmission } from './partnerships';

const DESCRIPTION_ID = 'description';

export function partnershipDescriptionModal(
  managerId: string,
  pingType: 'none' | 'u' | 'r' = 'none',
  pingId: string = 'none'
): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`partnership:submit:${managerId}:${pingType}:${pingId}`)
    .setTitle('Nuova partnership')
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId(DESCRIPTION_ID)
        .setLabel('Descrizione della partnership')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(1900)
        .setPlaceholder('Inserisci qui il testo e l\'invito della partnership...'),
    ));
}

export async function handlePartnershipInteraction(interaction: Interaction): Promise<boolean> {
  if (!interaction.isModalSubmit() || !interaction.customId.startsWith('partnership:submit:')) return false;

  const parts = interaction.customId.split(':');
  // Formato atteso: partnership:submit:managerId:pingType:pingId (5 parti)
  // Oppure legacy: partnership:submit:managerId:pingId (4 parti)
  const managerId = parts[2];
  let pingType: 'none' | 'u' | 'r' = 'none';
  let pingId: string | null = null;

  if (parts.length === 4) {
    const legacyPing = parts[3];
    if (legacyPing && legacyPing !== 'none') {
      pingType = 'u';
      pingId = legacyPing;
    }
  } else if (parts.length >= 5) {
    pingType = parts[3] as 'none' | 'u' | 'r';
    pingId = parts[4] === 'none' ? null : parts[4];
  }

  if (!interaction.guild || !managerId) {
    await interaction.reply({ content: '❌ Dati della partnership non validi.', flags: MessageFlags.Ephemeral });
    return true;
  }

  const config = await getPartnershipConfig(interaction.guild.id);
  if (!config || !interaction.member || !canPublishPartnership(interaction.member, config.roleId)) {
    await interaction.reply({ content: '❌ Non sei autorizzato a pubblicare questa partnership o il sistema non è configurato.', flags: MessageFlags.Ephemeral });
    return true;
  }

  const description = interaction.fields.getTextInputValue(DESCRIPTION_ID).trim();
  const targetChannel = await interaction.guild.channels.fetch(config.channelId).catch(() => null);
  if (!targetChannel?.isTextBased() || !('send' in targetChannel)) {
    await interaction.reply({ content: '❌ Il canale delle partnership non è disponibile o non è un canale testuale.', flags: MessageFlags.Ephemeral });
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let pingContent = '';
  if (pingId) {
    if (pingType === 'r') {
      pingContent = `<@&${pingId}>\n`;
    } else {
      pingContent = `<@${pingId}>\n`;
    }
  }

  const manager = await interaction.client.users.fetch(managerId).catch(() => null);
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('🤝 Nuova Partnership')
    .addFields(
      { name: '👤 Creata da', value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: true },
      { name: '💼 Manager', value: manager ? `${manager} (\`${manager.tag}\`)` : `<@${managerId}>`, inline: true },
    )
    .setFooter({ text: `Partnership • ${interaction.guild.name}` })
    .setTimestamp();

  try {
    await targetChannel.send({
      content: `${pingContent}${description}`,
      embeds: [embed],
      allowedMentions: {
        parse: ['users', 'roles'],
      },
    });

    await savePartnershipSubmission({
      guildId: interaction.guild.id,
      guildName: interaction.guild.name,
      userId: interaction.user.id,
      userName: interaction.user.tag,
      managerId,
      pingId,
      description,
    });

    await interaction.editReply('✅ Partnership pubblicata con successo.');
  } catch (error: any) {
    console.error('Errore durante la pubblicazione della partnership:', error);
    let errorMessage = '❌ Si è verificato un errore durante la pubblicazione della partnership.';
    if (error?.code === 50013) {
      errorMessage = '❌ Il bot non dispone dei permessi necessari per inviare messaggi nel canale configurato.';
    } else if (error?.code === 50035) {
      errorMessage = '❌ Il testo della partnership supera la lunghezza massima consentita da Discord.';
    }
    await interaction.editReply(errorMessage);
  }
  return true;
}
