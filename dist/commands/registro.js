"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const databasehandler_1 = require("../handlers/databasehandler");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('registro')
    .setDescription('Mostra il registro delle sanzioni di un utente.')
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option
    .setName('utente')
    .setDescription('L\'utente di cui visualizzare il registro')
    .setRequired(true));
async function execute(interaction) {
    if (!interaction.guild)
        return;
    const targetUser = interaction.options.getUser('utente', true);
    const records = await (0, databasehandler_1.getSanctions)(targetUser.id, interaction.guild.id);
    const profile = await (0, databasehandler_1.getUserProfile)(targetUser.id, interaction.guild.id);
    if (records.length === 0 && profile.notes.length === 0) {
        await interaction.reply({
            content: `📋 Nessuna sanzione o appunto registrato per ${targetUser}.\n⭐ Punti: ${profile.points.toFixed(1)}/15`,
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const pages = [];
    for (let index = 0; index < Math.max(records.length, 1); index += 8) {
        const pageRecords = records.slice(index, index + 8);
        const description = pageRecords
            .map((record) => {
            const timestamp = Math.floor(new Date(`${record.timestamp.replace(' ', 'T')}Z`).getTime() / 1000);
            const duration = record.duration ? `\n**Durata:** ${record.duration}` : '';
            return `**#${record.id} - ${record.type}**\n**Data:** <t:${timestamp}:F>\n**Esecutore:** <@${record.moderatorId}>\n**Motivo:** ${record.reason}${duration}`;
        })
            .join('\n\n');
        const header = index === 0
            ? `⭐ **Punti:** ${profile.points.toFixed(1)}/15\n\n📌 **Appunti**\n${profile.notes.length > 0
                ? profile.notes.map((note) => `**#${note.id}** ${note.note} — <@${note.authorId}>`).join('\n')
                : 'Nessun appunto.'}\n\n`
            : '';
        pages.push(new discord_js_1.EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📋 Registro sanzioni: ${targetUser.tag}`)
            .setDescription(`${header}${description || 'Nessun evento di sanzione.'}`)
            .setFooter({ text: `Pagina ${pages.length + 1} di ${Math.ceil(records.length / 8)}` }));
    }
    await interaction.reply({ embeds: [pages[0]] });
    for (const page of pages.slice(1)) {
        await interaction.followUp({ embeds: [page] });
    }
}
