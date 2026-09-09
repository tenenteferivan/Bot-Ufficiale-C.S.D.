"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const announcementDistributor_1 = require("../utils/announcementDistributor");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('annuncio')
    .setDescription('Invia un annuncio ai canali log configurati.')
    .addStringOption((option) => option
    .setName('messaggio')
    .setDescription('Contenuto dell\'annuncio')
    .setMaxLength(4096)
    .setRequired(true));
async function execute(interaction) {
    const configuredGuildId = process.env.GUILD_ID?.trim();
    const dirigenzaRoleId = process.env.DIRIGENZA_ID?.trim();
    if (!interaction.guild || !configuredGuildId || interaction.guild.id !== configuredGuildId) {
        await interaction.reply({
            content: '❌ Questo comando è disponibile solo nel server principale configurato.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    if (!dirigenzaRoleId) {
        await interaction.reply({
            content: '❌ DIRIGENZA_ID non è configurato correttamente.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!(member instanceof discord_js_1.GuildMember) || !member.roles.cache.has(dirigenzaRoleId)) {
        await interaction.reply({
            content: '❌ Non possiedi il ruolo di dirigenza necessario per usare questo comando.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const message = interaction.options.getString('messaggio', true);
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    try {
        const result = await (0, announcementDistributor_1.distributeAnnouncement)(interaction.client, (0, announcementDistributor_1.buildAnnouncementEmbed)('📢 Annuncio ufficiale', message, 0x3498db), '@here');
        await interaction.editReply({
            content: `✅ Annuncio distribuito in ${result.sent} server.` +
                (result.failed ? `\n⚠️ ${result.failed} destinazioni non hanno potuto riceverlo.` : ''),
        });
    }
    catch (error) {
        console.error('Errore durante la distribuzione dell\'annuncio:', error);
        await interaction.editReply({
            content: '❌ Non è stato possibile distribuire l\'annuncio.',
        });
    }
}
