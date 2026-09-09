"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWithRateLimitRetry = sendWithRateLimitRetry;
exports.distributeAnnouncement = distributeAnnouncement;
exports.buildAnnouncementEmbed = buildAnnouncementEmbed;
const discord_js_1 = require("discord.js");
const databasehandler_1 = require("../handlers/databasehandler");
const ANNOUNCEMENT_INTERVAL_MS = 350;
async function sendWithRateLimitRetry(channel, payload, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            await channel.send(payload);
            return;
        }
        catch (error) {
            const retryAfter = error?.rawError?.retry_after ?? error?.data?.retry_after ?? error?.retryAfter;
            if (error?.status !== 429 && error?.code !== 429 && retryAfter === undefined)
                throw error;
            if (attempt === maxRetries)
                throw error;
            const delay = Math.max(100, Number(retryAfter ?? 1) * 1000);
            console.warn(`Rate limit Discord rilevato: nuovo tentativo tra ${delay} ms.`);
            await wait(delay);
        }
    }
}
function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
async function distributeAnnouncement(client, embed, mention) {
    const configs = await (0, databasehandler_1.getLogConfigs)();
    let sent = 0;
    let failed = 0;
    for (const config of configs) {
        try {
            const guild = await client.guilds.fetch(config.guildId).catch(() => null);
            if (!guild) {
                console.warn(`Server ${config.guildId} non disponibile: annuncio saltato.`);
                failed++;
                continue;
            }
            const channel = await guild.channels.fetch(config.channelId).catch(() => null);
            if (!channel || !channel.isTextBased() || !('send' in channel)) {
                console.warn(`Canale log ${config.channelId} non valido nel server ${config.guildId}: annuncio saltato.`);
                failed++;
                continue;
            }
            await sendWithRateLimitRetry(channel, {
                content: mention,
                embeds: [embed],
                allowedMentions: { parse: ['everyone'] },
            });
            sent++;
            await wait(ANNOUNCEMENT_INTERVAL_MS);
        }
        catch (error) {
            failed++;
            console.error(`Errore durante l'invio dell'annuncio al server ${config.guildId}:`, error);
        }
    }
    return { sent, failed };
}
function buildAnnouncementEmbed(title, message, color) {
    return new discord_js_1.EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(message.slice(0, 4096))
        .setFooter({ text: 'Comunicazione ufficiale C.S.D.' })
        .setTimestamp();
}
