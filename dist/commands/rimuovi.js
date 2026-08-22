"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const databasehandler_1 = require("../handlers/databasehandler");
const points_1 = require("../utils/points");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('rimuovi')
    .setDescription('Rimuove punti o un appunto dal registro di un utente.')
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
    .addSubcommandGroup((group) => group
    .setName('punti')
    .setDescription('Rimuove punti dal registro.')
    .addSubcommand((subcommand) => subcommand
    .setName('utente')
    .setDescription('Rimuove punti a un utente.')
    .addUserOption((option) => option.setName('utente').setDescription('Utente interessato').setRequired(true))
    .addStringOption((option) => option.setName('quantita').setDescription('Quantità, ad esempio 1.2 o 1,2').setRequired(true))
    .addStringOption((option) => option.setName('motivo').setDescription('Motivo della modifica').setRequired(true))))
    .addSubcommandGroup((group) => group
    .setName('appunto')
    .setDescription('Rimuove un appunto dal registro.')
    .addSubcommand((subcommand) => subcommand
    .setName('utente')
    .setDescription('Rimuove un appunto tramite il suo ID.')
    .addUserOption((option) => option.setName('utente').setDescription('Utente interessato').setRequired(true))
    .addIntegerOption((option) => option.setName('id').setDescription('ID dell’appunto mostrato nel registro').setRequired(true))));
async function execute(interaction) {
    if (!interaction.guild)
        return;
    const group = interaction.options.getSubcommandGroup(true);
    const targetUser = interaction.options.getUser('utente', true);
    if (group === 'punti') {
        const amount = (0, points_1.parsePointAmount)(interaction.options.getString('quantita', true));
        const reason = interaction.options.getString('motivo', true);
        if (amount === null) {
            await interaction.reply({ content: '❌ Inserisci una quantità positiva con al massimo una cifra decimale, ad esempio 1.2 o 1,2.', flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        try {
            const points = await (0, databasehandler_1.changeUserPoints)(targetUser.id, interaction.guild.id, -amount);
            await savePointChange(interaction, targetUser.id, amount, reason);
            await (0, databasehandler_1.ensureLowPointsNote)(targetUser.id, interaction.guild.id, interaction.client.user?.id || 'SISTEMA');
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('➖ Punti rimossi dal registro')
                .addFields({ name: '👤 Utente', value: `${targetUser}`, inline: true }, { name: '⭐ Punti rimossi', value: `-${amount.toFixed(1)}`, inline: true }, { name: '⭐ Totale punti', value: points.toFixed(1), inline: true }, { name: '📋 Motivo', value: reason })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
            await targetUser.send({ embeds: [embed] }).catch(() => { });
        }
        catch {
            await interaction.reply({ content: '❌ I punti devono rimanere tra 0 e 15.', flags: discord_js_1.MessageFlags.Ephemeral });
        }
        return;
    }
    if (!interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.ModerateMembers)) {
        await interaction.reply({ content: '❌ Solo i moderatori possono rimuovere appunti.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const noteId = interaction.options.getInteger('id', true);
    const deleted = await (0, databasehandler_1.deleteUserNote)(noteId, targetUser.id, interaction.guild.id);
    await interaction.reply({
        content: deleted ? `✅ Appunto #${noteId} rimosso dal registro di ${targetUser}.` : '❌ Appunto non trovato per questo utente.',
        flags: discord_js_1.MessageFlags.Ephemeral,
    });
}
async function savePointChange(interaction, userId, amount, reason) {
    await (0, databasehandler_1.saveSanction)({
        userId,
        moderatorId: interaction.user.id,
        guildId: interaction.guild.id,
        type: 'PUNTI_RIMOSSI',
        reason,
        duration: `-${amount.toFixed(1)}`,
    });
}
