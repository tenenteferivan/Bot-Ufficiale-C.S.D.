"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partnershipDescriptionModal = partnershipDescriptionModal;
exports.handlePartnershipInteraction = handlePartnershipInteraction;
const discord_js_1 = require("discord.js");
const partnerships_1 = require("./partnerships");
const DESCRIPTION_ID = 'description';
function partnershipDescriptionModal(managerId, pingType = 'none', pingId = 'none') {
    return new discord_js_1.ModalBuilder()
        .setCustomId(`partnership:submit:${managerId}:${pingType}:${pingId}`)
        .setTitle('Nuova partnership')
        .addComponents(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder()
        .setCustomId(DESCRIPTION_ID)
        .setLabel('Descrizione della partnership')
        .setStyle(discord_js_1.TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(1900)
        .setPlaceholder('Inserisci qui il testo e l\'invito della partnership...')));
}
async function handlePartnershipInteraction(interaction) {
    if (!interaction.isModalSubmit() || !interaction.customId.startsWith('partnership:submit:'))
        return false;
    const parts = interaction.customId.split(':');
    // Formato atteso: partnership:submit:managerId:pingType:pingId (5 parti)
    // Oppure legacy: partnership:submit:managerId:pingId (4 parti)
    const managerId = parts[2];
    let pingType = 'none';
    let pingId = null;
    if (parts.length === 4) {
        const legacyPing = parts[3];
        if (legacyPing && legacyPing !== 'none') {
            pingType = 'u';
            pingId = legacyPing;
        }
    }
    else if (parts.length >= 5) {
        pingType = parts[3];
        pingId = parts[4] === 'none' ? null : parts[4];
    }
    if (!interaction.guild || !managerId) {
        await interaction.reply({ content: '❌ Dati della partnership non validi.', flags: discord_js_1.MessageFlags.Ephemeral });
        return true;
    }
    const config = await (0, partnerships_1.getPartnershipConfig)(interaction.guild.id);
    if (!config || !interaction.member || !(0, partnerships_1.canPublishPartnership)(interaction.member, config.roleId)) {
        await interaction.reply({ content: '❌ Non sei autorizzato a pubblicare questa partnership o il sistema non è configurato.', flags: discord_js_1.MessageFlags.Ephemeral });
        return true;
    }
    const description = interaction.fields.getTextInputValue(DESCRIPTION_ID).trim();
    const targetChannel = await interaction.guild.channels.fetch(config.channelId).catch(() => null);
    if (!targetChannel?.isTextBased() || !('send' in targetChannel)) {
        await interaction.reply({ content: '❌ Il canale delle partnership non è disponibile o non è un canale testuale.', flags: discord_js_1.MessageFlags.Ephemeral });
        return true;
    }
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    let pingContent = '';
    if (pingId) {
        if (pingType === 'r') {
            pingContent = `<@&${pingId}>\n`;
        }
        else {
            pingContent = `<@${pingId}>\n`;
        }
    }
    const manager = await interaction.client.users.fetch(managerId).catch(() => null);
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🤝 Nuova Partnership')
        .addFields({ name: '👤 Creata da', value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: true }, { name: '💼 Manager', value: manager ? `${manager} (\`${manager.tag}\`)` : `<@${managerId}>`, inline: true })
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
        await (0, partnerships_1.savePartnershipSubmission)({
            guildId: interaction.guild.id,
            guildName: interaction.guild.name,
            userId: interaction.user.id,
            userName: interaction.user.tag,
            managerId,
            pingId,
            description,
        });
        await interaction.editReply('✅ Partnership pubblicata con successo.');
    }
    catch (error) {
        console.error('Errore durante la pubblicazione della partnership:', error);
        let errorMessage = '❌ Si è verificato un errore durante la pubblicazione della partnership.';
        if (error?.code === 50013) {
            errorMessage = '❌ Il bot non dispone dei permessi necessari per inviare messaggi nel canale configurato.';
        }
        else if (error?.code === 50035) {
            errorMessage = '❌ Il testo della partnership supera la lunghezza massima consentita da Discord.';
        }
        await interaction.editReply(errorMessage);
    }
    return true;
}
