"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const ticketManager_1 = require("../utils/ticketManager");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('setup-ticket')
    .setDescription('Configura il pannello di supporto C.S.D.')
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator)
    .addChannelOption((option) => option.setName('canale').setDescription('Canale in cui pubblicare il pannello').addChannelTypes(discord_js_1.ChannelType.GuildText).setRequired(true))
    .addRoleOption((option) => option.setName('ruolo').setDescription('Ruolo autorizzato a gestire i ticket').setRequired(true));
async function execute(interaction) {
    if (!interaction.guild || !interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.Administrator)) {
        await interaction.reply({ content: '❌ Solo gli amministratori possono configurare i ticket.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (!(0, ticketManager_1.isTicketGuild)(interaction.guild.id)) {
        await interaction.reply({ content: 'Il sistema ticket e disponibile solo nel server configurato.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const channel = interaction.options.getChannel('canale', true);
    const staffRole = interaction.options.getRole('ruolo', true);
    if (channel.type !== discord_js_1.ChannelType.GuildText) {
        await interaction.reply({ content: '❌ Il canale deve essere un canale testuale del server.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const textChannel = channel;
    const botPermissions = textChannel.permissionsFor(interaction.client.user);
    if (!botPermissions?.has([discord_js_1.PermissionFlagsBits.ViewChannel, discord_js_1.PermissionFlagsBits.SendMessages])) {
        await interaction.reply({ content: '❌ Il bot non può visualizzare o inviare messaggi nel canale selezionato.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const panel = new discord_js_1.EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle('🎫 Supporto C.S.D.')
        .setDescription('Hai bisogno di aiuto? Seleziona dal menu la categoria più adatta alla tua richiesta.\n\n🛡️ **Amministrazione**\nQuestioni burocratiche, gestionali o riservate.\n\n💬 **Assistenza Generale**\nDubbi, informazioni e supporto sul server.\n\n🤝 **Partnership / Collaborazione**\nProposte commerciali, affiliati o collaborazioni.\n\n🚨 **Segnalazione**\nViolazioni del regolamento o utenti problematici.\n\n📝 **Richiesta Entrata**\nRichiesta entrata Nella Confederazione.\n\n⚖️ **Mediazione Conflitto**\nMediazione e risoluzione di conflitti tra utenti o server.')
        .setFooter({ text: 'C.S.D. Supporto | Seleziona una categoria per aprire un ticket' })
        .setTimestamp();
    try {
        await (0, ticketManager_1.saveTicketConfig)(interaction.guild.id, channel.id, staffRole.id);
        await channel.send({ embeds: [panel], components: (0, ticketManager_1.ticketPanelComponents)() });
        await interaction.reply({ content: `✅ Pannello ticket pubblicato in ${channel} con ruolo staff ${staffRole}.`, flags: discord_js_1.MessageFlags.Ephemeral });
    }
    catch (error) {
        console.error('Errore nella configurazione ticket:', error);
        await interaction.reply({ content: '❌ Impossibile configurare il pannello ticket.', flags: discord_js_1.MessageFlags.Ephemeral });
    }
}
