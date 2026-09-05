"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const partnerships_1 = require("../utils/partnerships");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('leaderboard-partnership')
    .setDescription('Mostra i primi 30 utenti del server per partnership pubblicate.');
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
    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Questo comando è disponibile solo nei server.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    try {
        const ranks = await (0, partnerships_1.getGuildPartnershipLeaderboard)(interaction.guild.id);
        const lines = ranks.length
            ? ranks.map((rank, index) => `${getRankBadge(index)} <@${rank.id}> — **${rank.total}** partnership`).join('\n')
            : 'Nessuna partnership pubblicata in questo server.';
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`🏆 Leaderboard Partnership — ${interaction.guild.name}`)
            .setDescription(lines.slice(0, 4000))
            .setFooter({ text: 'Classifica aggiornata in tempo reale' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    catch (error) {
        console.error('Errore durante il recupero della leaderboard partnership:', error);
        await interaction.reply({
            content: '❌ Si è verificato un errore durante il recupero della classifica.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
}
