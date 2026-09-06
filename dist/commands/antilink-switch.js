"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const antilinkManager_1 = require("../utils/antilinkManager");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('antilink-switch')
    .setDescription('Attiva o disattiva il sistema AntiLink.');
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
    const config = (0, antilinkManager_1.getAntiLinkConfig)(interaction.guild.id);
    const newState = !config.enabled;
    (0, antilinkManager_1.setAntiLinkEnabled)(interaction.guild.id, newState);
    await interaction.reply({
        content: newState
            ? '🔗 **AntiLink attivato.** Da questo momento i link inviati dagli utenti non autorizzati verranno eliminati.'
            : '🔗 **AntiLink disattivato.** I link non verranno più eliminati automaticamente.',
        flags: discord_js_1.MessageFlags.Ephemeral,
    });
}
