"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePointAmount = parsePointAmount;
function parsePointAmount(value) {
    const normalized = value.trim().replace(',', '.');
    if (!/^\+?(?:0|[1-9]\d*)(?:\.\d)?$/.test(normalized))
        return null;
    const amount = Number(normalized.replace('+', ''));
    return amount > 0 && amount <= 15 ? amount : null;
}
