"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const partnerships_1 = require("../utils/partnerships");
const partnershipInteractions_1 = require("../utils/partnershipInteractions");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('partnership')
    .setDescription('Crea e pubblica una nuova partnership nel canale dedicato.')
    .addUserOption((option) => option
    .setName('manager')
    .setDescription('Manager o referente della partnership')
    .setRequired(true))
    .addMentionableOption((option) => option
    .setName('ping')
    .setDescription('Ruolo o utente da menzionare nella pubblicazione')
    .setRequired(false));
async function execute(interaction) {
    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Questo comando è disponibile solo all\'interno di un server.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const config = await (0, partnerships_1.getPartnershipConfig)(interaction.guild.id);
    if (!config) {
        await interaction.reply({
            content: '❌ Le partnership non sono ancora configurate. Un amministratore deve prima configurarle con `/setup-partnership`.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    if (!interaction.member || !(0, partnerships_1.canPublishPartnership)(interaction.member, config.roleId)) {
        await interaction.reply({
            content: '❌ Non disponi del ruolo o dei permessi necessari per pubblicare partnership.',
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const manager = interaction.options.getUser('manager', true);
    const role = interaction.options.getRole('ping');
    const user = interaction.options.getUser('ping');
    let pingType = 'none';
    let pingId = 'none';
    if (role) {
        pingType = 'r';
        pingId = role.id;
    }
    else if (user) {
        pingType = 'u';
        pingId = user.id;
    }
    await interaction.showModal((0, partnershipInteractions_1.partnershipDescriptionModal)(manager.id, pingType, pingId));
}
