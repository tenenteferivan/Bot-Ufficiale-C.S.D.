"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const databasehandler_1 = require("../handlers/databasehandler");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('automod')
    .setDescription('Gestione della configurazione di AutoMod')
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator)
    .addSubcommandGroup((group) => group
    .setName('wl')
    .setDescription('Gestione della lista di esclusione utenti per AutoMod')
    .addSubcommand((subcommand) => subcommand
    .setName('add')
    .setDescription('Aggiunge un utente alla lista di esclusione di AutoMod')
    .addUserOption((option) => option
    .setName('utente')
    .setDescription('Utente da escludere dai controlli di AutoMod')
    .setRequired(true)))
    .addSubcommand((subcommand) => subcommand
    .setName('remove')
    .setDescription('Rimuove un utente dalla lista di esclusione di AutoMod')
    .addUserOption((option) => option
    .setName('utente')
    .setDescription('Utente da rimuovere dalla lista di esclusione')
    .setRequired(true))));
async function execute(interaction) {
    if (!interaction.guild)
        return;
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();
    if (subcommandGroup === 'wl') {
        const targetUser = interaction.options.getUser('utente', true);
        const guildId = interaction.guild.id;
        if (subcommand === 'add') {
            databasehandler_1.db.run('INSERT OR IGNORE INTO automod_whitelist (guildId, targetId, type, userId) VALUES (?, ?, ?, ?)', [guildId, targetUser.id, 'USER', targetUser.id], async function (err) {
                if (err) {
                    console.error('Errore database lista di esclusione, aggiunta:', err);
                    return interaction.reply({ content: '❌ Errore durante il salvataggio nel database.', flags: discord_js_1.MessageFlags.Ephemeral });
                }
                // 1. Invia un messaggio privato all'utente
                let dmSent = true;
                const dmEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(0x57F287)
                    .setTitle('🛡️ Lista di esclusione AutoMod')
                    .setDescription(`Sei stato aggiunto alla lista di esclusione di AutoMod nel server **${interaction.guild?.name}**. I tuoi messaggi non saranno più filtrati dal sistema.`)
                    .setTimestamp();
                await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
                    dmSent = false;
                });
                // 2. Risponde pubblicamente nel canale
                const publicEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(0x57F287)
                    .setTitle('✅ Utente aggiunto alla lista di esclusione')
                    .setDescription(`L'utente ${targetUser} è stato aggiunto con successo alla lista di esclusione di AutoMod.`)
                    .addFields({
                    name: '📬 Notifica DM',
                    value: dmSent ? '`Inviata con successo`' : '`Impossibile inviare (DM Chiusi)`',
                    inline: true
                })
                    .setFooter({ text: 'AutoMod Config' })
                    .setTimestamp();
                return interaction.reply({ embeds: [publicEmbed] });
            });
        }
        else if (subcommand === 'remove') {
            databasehandler_1.db.run('DELETE FROM automod_whitelist WHERE guildId = ? AND (userId = ? OR targetId = ?)', [guildId, targetUser.id, targetUser.id], async function (err) {
                if (err) {
                    console.error('Errore database lista di esclusione, rimozione:', err);
                    return interaction.reply({ content: '❌ Errore durante la rimozione dal database.', flags: discord_js_1.MessageFlags.Ephemeral });
                }
                if (this.changes === 0) {
                    return interaction.reply({
                        content: `⚠️ L'utente ${targetUser} non era presente nella lista di esclusione.`,
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                }
                // 1. Invia un messaggio privato all'utente
                let dmSent = true;
                const dmEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle('⚠️ Lista di esclusione AutoMod')
                    .setDescription(`Sei stato rimosso dalla lista di esclusione di AutoMod nel server **${interaction.guild?.name}**. I tuoi messaggi saranno nuovamente controllati dal sistema.`)
                    .setTimestamp();
                await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
                    dmSent = false;
                });
                // 2. Risponde pubblicamente nel canale
                const publicEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle('🗑️ Utente rimosso dalla lista di esclusione')
                    .setDescription(`L'utente ${targetUser} è stato rimosso dalla lista di esclusione di AutoMod.`)
                    .addFields({
                    name: '📬 Notifica DM',
                    value: dmSent ? '`Inviata con successo`' : '`Impossibile inviare (DM Chiusi)`',
                    inline: true
                })
                    .setFooter({ text: 'AutoMod Config' })
                    .setTimestamp();
                return interaction.reply({ embeds: [publicEmbed] });
            });
        }
    }
}
