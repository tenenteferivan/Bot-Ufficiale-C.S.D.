"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const permissions_1 = require("../../utils/permissions");
const modLogger_1 = require("../../utils/modLogger");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('warn')
    .setDescription('Invia un avvertimento a un utente.')
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('utente').setDescription('Utente da avvertire').setRequired(true))
    .addStringOption((option) => option.setName('motivo').setDescription('Motivo dell avvertimento').setRequired(true));
async function execute(interaction) {
    if (!await (0, permissions_1.requireGuildPermission)(interaction, discord_js_1.PermissionFlagsBits.ModerateMembers))
        return;
    const targetUser = interaction.options.getUser('utente', true);
    await interaction.reply({ content: `Avvertimento inviato a ${targetUser}.`, ephemeral: true });
    await (0, modLogger_1.sendModNotification)(interaction);
}
