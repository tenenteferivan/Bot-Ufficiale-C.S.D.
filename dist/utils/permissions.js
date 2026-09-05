"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireGuildPermission = requireGuildPermission;
const discord_js_1 = require("discord.js");
async function requireGuildPermission(interaction, permission) {
    if (!interaction.guild || !interaction.memberPermissions?.has(permission)) {
        await interaction.reply({ content: 'Non disponi dei permessi necessari per questo comando.', flags: discord_js_1.MessageFlags.Ephemeral });
        return false;
    }
    return true;
}
