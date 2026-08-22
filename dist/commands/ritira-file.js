"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const promises_1 = require("fs/promises");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const archive_1 = require("../utils/archive");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('ritira-file')
    .setDescription('Invia tramite DM un file cifrato dell\'archivio.')
    .addStringOption((option) => option.setName('nome_file').setDescription('Nome del file da ritirare').setRequired(true))
    .addStringOption((option) => option.setName('password').setDescription('Password dell\'archivio').setRequired(true));
async function execute(interaction) {
    const password = interaction.options.getString('password', true);
    const requestedName = interaction.options.getString('nome_file', true);
    const fileName = (0, archive_1.normalizeArchiveName)(requestedName);
    if (!(0, archive_1.hasArchiveAccess)(interaction.user.id, password)) {
        await (0, archive_1.notifyArchiveOwner)(interaction.client, 'Download', interaction.user.id, false, 'Accesso negato.');
        await interaction.reply({ content: '❌ Credenziali non valide o accesso non autorizzato.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (!fileName) {
        await (0, archive_1.notifyArchiveOwner)(interaction.client, 'Download', interaction.user.id, false, 'Nome file non valido.');
        await interaction.reply({ content: '❌ Il nome del file non è valido.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const tempDir = await (0, promises_1.mkdtemp)(path.join(os.tmpdir(), 'cssd-archive-download-'));
    const tempFile = path.join(tempDir, fileName);
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    try {
        await (0, archive_1.decryptFileStream)(fileName, tempFile);
        await interaction.user.send({
            content: `📦 File richiesto dall'archivio: **${fileName}**`,
            files: [new discord_js_1.AttachmentBuilder(tempFile, { name: fileName })],
        });
        await (0, archive_1.notifyArchiveOwner)(interaction.client, 'Download', interaction.user.id, true, `File: ${fileName}`);
        await interaction.editReply('✅ Il file è stato inviato tramite DM.');
    }
    catch (error) {
        const detail = error?.code === 'ENOENT'
            ? 'File non trovato.'
            : 'Invio DM fallito oppure file non decifrabile.';
        await (0, archive_1.notifyArchiveOwner)(interaction.client, 'Download', interaction.user.id, false, detail);
        await interaction.editReply(`❌ ${detail}`);
    }
    finally {
        await (0, promises_1.rm)(tempDir, { recursive: true, force: true });
    }
}
