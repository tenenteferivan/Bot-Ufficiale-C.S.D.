"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.autocomplete = autocomplete;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const databasehandler_1 = require("../../handlers/databasehandler");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('warn')
    .setDescription('Gestione avanzata degli avvertimenti utente')
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
    .addSubcommand((subcommand) => subcommand
    .setName('add')
    .setDescription('Aggiunge un avvertimento ad un utente')
    .addUserOption((option) => option.setName('utente').setDescription('L\'utente da avvertire').setRequired(true))
    .addStringOption((option) => option.setName('motivo').setDescription('Il motivo dell\'avvertimento').setRequired(true)))
    .addSubcommand((subcommand) => subcommand
    .setName('remove')
    .setDescription('Rimuove un avvertimento specifico')
    .addUserOption((option) => option.setName('utente').setDescription('L\'utente interessato').setRequired(true))
    .addStringOption((option) => option
    .setName('warn')
    .setDescription('Seleziona l\'avvertimento da rimuovere')
    .setRequired(true)
    .setAutocomplete(true)));
async function autocomplete(interaction) {
    try {
        const focusedValue = interaction.options.getFocused(false);
        const utenteOption = interaction.options.get('utente');
        const targetUserId = utenteOption?.value ? String(utenteOption.value) : null;
        if (!targetUserId) {
            await interaction.respond([{ name: '⚠️ Seleziona prima un utente!', value: 'none' }]);
            return;
        }
        const userWarns = await getWarnsFromDatabase(targetUserId, interaction.guild?.id).catch(() => []);
        if (!userWarns || userWarns.length === 0) {
            await interaction.respond([{ name: 'Nessun avvertimento trovato per questo utente.', value: 'none' }]);
            return;
        }
        const choices = userWarns.map((w) => {
            const reason = w.reason || 'Senza motivo';
            return {
                name: `ID: ${w.id} | ${reason}`.substring(0, 100),
                value: String(w.id).substring(0, 100),
            };
        });
        const filtered = choices.filter((choice) => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
        await interaction.respond(filtered.slice(0, 25));
    }
    catch (error) {
        if (!interaction.responded)
            await interaction.respond([]).catch(() => { });
    }
}
async function execute(interaction) {
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'add') {
        const targetUser = interaction.options.getUser('utente', true);
        const reason = interaction.options.getString('motivo', true);
        if (!interaction.guild)
            return;
        await (0, databasehandler_1.saveSanction)({
            userId: targetUser.id,
            moderatorId: interaction.user.id,
            guildId: interaction.guild.id,
            type: 'WARN',
            reason,
        });
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('⚠️ • SANZIONE APPLICATA: WARN')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields({ name: '👤 Utente Avvertito', value: `<@${targetUser.id}>\n\`ID: ${targetUser.id}\``, inline: true }, { name: '🛡️ Moderatore', value: `<@${interaction.user.id}>`, inline: true }, { name: '📋 Motivo', value: `>>> ${reason}` })
            .setFooter({ text: `Eseguito da ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    }
    else if (subcommand === 'remove') {
        const targetUser = interaction.options.getUser('utente', true);
        const warnId = interaction.options.getString('warn', true);
        if (warnId === 'none') {
            await interaction.editReply({ content: '❌ **Selezione non valida o l\'utente non ha avvertimenti.**' });
            return;
        }
        if (!interaction.guild)
            return;
        const warn = (await (0, databasehandler_1.getSanctions)(targetUser.id, interaction.guild.id)).find((record) => record.id === Number(warnId) && record.type === 'WARN');
        if (warn) {
            await (0, databasehandler_1.saveSanction)({
                userId: targetUser.id,
                moderatorId: interaction.user.id,
                guildId: interaction.guild.id,
                type: 'UNWARN',
                reason: `Revoca dell'avvertimento #${warnId}: ${warn.reason}`,
            });
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('✅ • REVOCA WARN')
                .addFields({ name: '👤 Utente', value: `<@${targetUser.id}>`, inline: true }, { name: '🆔 ID Avvertimento Rimosso', value: `\`${warnId}\``, inline: true }, { name: '🛡️ Moderatore', value: `<@${interaction.user.id}>`, inline: true })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            await targetUser.send({
                embeds: [
                    new discord_js_1.EmbedBuilder()
                        .setColor(0x57F287)
                        .setTitle('✅ Avvertimento rimosso')
                        .setDescription(`È stato rimosso l'avvertimento #${warnId} nel server **${interaction.guild.name}**.`)
                        .addFields({ name: '📋 Motivo', value: `Revoca dell'avvertimento: ${warn.reason}`, inline: false }, { name: '🛡️ Moderatore', value: interaction.user.tag, inline: true })
                        .setTimestamp(),
                ],
            }).catch(() => { });
        }
        else {
            await interaction.editReply({ content: `❌ **Impossibile trovare o rimuovere l'avvertimento ID:** \`${warnId}\`.` });
        }
    }
}
async function getWarnsFromDatabase(userId, guildId) {
    if (!guildId)
        return [];
    const sanctions = await (0, databasehandler_1.getSanctions)(userId, guildId);
    return sanctions
        .filter((record) => record.type === 'WARN')
        .map(({ id, reason }) => ({ id, reason }))
        .reverse();
}
