"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.name = void 0;
exports.execute = execute;
const pingEmbed_1 = require("../utils/pingEmbed");
exports.name = 'ping';
async function execute(message, _args) {
    const sentMessage = await message.reply('Rilevamento della latenza in corso...');
    const botPing = sentMessage.createdTimestamp - message.createdTimestamp;
    const apiPing = message.client.ws.ping;
    const uptime = message.client.uptime ?? 0;
    const embed = (0, pingEmbed_1.createPingEmbed)(botPing, apiPing, uptime);
    await sentMessage.edit({ content: null, embeds: [embed] });
}
