"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const partnerships_1 = require("../utils/partnerships");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('leaderboard-partnership-global')
    .setDescription('Mostra la classifica globale delle partnership.')
    .addStringOption((option) => option
    .setName('type')
    .setDescription('Tipo di classifica')
    .setRequired(true)
    .addChoices({ name: 'Server', value: 'server' }, { name: 'Utenti', value: 'users' }));
function getRankBadge(index) {
    if (index === 0)
        return '🥇';
    if (index === 1)
        return '🥈';
    if (index === 2)
        return '🥉';
    return `**${index + 1}.**`;
}
async function execute(interaction) {
    const type = interaction.options.getString('type', true);
    try {
        const ranks = type === 'server'
            ? await (0, partnerships_1.getGlobalGuildPartnershipLeaderboard)()
            : await (0, partnerships_1.getGlobalUserPartnershipLeaderboard)();
        const lines = ranks.length
            ? ranks.map((rank, index) => {
                const target = type === 'server'
                    ? `**${rank.name || rank.id}**`
                    : `<@${rank.id}>`;
                return `${getRankBadge(index)} ${target} — **${rank.total}** partnership`;
            }).join('\n')
            : 'Non ci sono ancora partnership registrate.';
        const title = type === 'server' ? '🌐 Leaderboard Globale — Server' : '🌐 Leaderboard Globale — Utenti';
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(title)
            .setDescription(lines.slice(0, 4000))
            .setFooter({ text: 'Classifica globale aggiornata in tempo reale' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    catch (error) {
        console.error('Errore durante il recupero della leaderboard partnership globale:', error);
        await interaction.reply({
            content: '❌ Si è verificato un errore durante il recupero della classifica globale.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
}
