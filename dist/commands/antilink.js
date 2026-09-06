"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const antilinkManager_1 = require("../utils/antilinkManager");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('antilink')
    .setDescription('Gestisce la configurazione del sistema AntiLink.')
    .addSubcommandGroup((group) => group
    .setName('whitelist')
    .setDescription('Gestisce la whitelist del sistema AntiLink.')
    .addSubcommand((subcommand) => subcommand
    .setName('add')
    .setDescription('Aggiunge un utente o un ruolo alla whitelist.')
    .addUserOption((option) => option
    .setName('utente')
    .setDescription('Utente autorizzato a inviare link.')
    .setRequired(false))
    .addRoleOption((option) => option
    .setName('ruolo')
    .setDescription('Ruolo autorizzato a inviare link.')
    .setRequired(false)))
    .addSubcommand((subcommand) => subcommand
    .setName('remove')
    .setDescription('Rimuove un utente o un ruolo dalla whitelist.')
    .addUserOption((option) => option
    .setName('utente')
    .setDescription('Utente da rimuovere dalla whitelist.')
    .setRequired(false))
    .addRoleOption((option) => option
    .setName('ruolo')
    .setDescription('Ruolo da rimuovere dalla whitelist.')
    .setRequired(false))));
async function execute(interaction) {
    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Questo comando può essere utilizzato solo nei server.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    if (!interaction.memberPermissions?.has('ManageGuild')) {
        await interaction.reply({
            content: '❌ Non disponi dei permessi necessari per utilizzare questo comando.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();
    if (group !== 'whitelist') {
        return;
    }
    const user = interaction.options.getUser('utente');
    const role = interaction.options.getRole('ruolo');
    if (!user && !role) {
        await interaction.reply({
            content: '❌ Devi specificare un **utente** oppure un **ruolo**.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    if (user && role) {
        await interaction.reply({
            content: '❌ Devi specificare solamente un **utente** oppure un **ruolo**, non entrambi.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    if (subcommand === 'add') {
        if (user) {
            const added = (0, antilinkManager_1.addWhitelistedUser)(interaction.guild.id, user.id);
            if (!added) {
                await interaction.reply({
                    content: `⚠️ ${user} è già presente nella whitelist AntiLink.`,
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            await interaction.reply({
                content: `✅ ${user} è stato aggiunto alla whitelist AntiLink.`,
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        if (role) {
            const added = (0, antilinkManager_1.addWhitelistedRole)(interaction.guild.id, role.id);
            if (!added) {
                await interaction.reply({
                    content: `⚠️ Il ruolo ${role} è già presente nella whitelist AntiLink.`,
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            await interaction.reply({
                content: `✅ Il ruolo ${role} è stato aggiunto alla whitelist AntiLink.`,
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
    }
    if (subcommand === 'remove') {
        if (user) {
            const removed = (0, antilinkManager_1.removeWhitelistedUser)(interaction.guild.id, user.id);
            if (!removed) {
                await interaction.reply({
                    content: `⚠️ ${user} non è presente nella whitelist AntiLink.`,
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            await interaction.reply({
                content: `✅ ${user} è stato rimosso dalla whitelist AntiLink.`,
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        if (role) {
            const removed = (0, antilinkManager_1.removeWhitelistedRole)(interaction.guild.id, role.id);
            if (!removed) {
                await interaction.reply({
                    content: `⚠️ Il ruolo ${role} non è presente nella whitelist AntiLink.`,
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            await interaction.reply({
                content: `✅ Il ruolo ${role} è stato rimosso dalla whitelist AntiLink.`,
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
        }
    }
}
