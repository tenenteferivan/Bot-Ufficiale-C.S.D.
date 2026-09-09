"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendUserNotification = sendUserNotification;
async function sendUserNotification(user, embed) {
    if (user.bot)
        return false;
    try {
        await user.send({ embeds: [embed] });
        return true;
    }
    catch (error) {
        if (error?.code === 50007 || error?.code === 50278) {
            console.warn(`[UserNotice] Impossibile inviare DM a ${user.tag}.`);
        }
        else {
            console.error(`[UserNotice] Errore invio DM a ${user.tag}:`, error);
        }
        return false;
    }
}
