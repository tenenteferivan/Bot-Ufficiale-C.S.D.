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
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const stream_1 = require("stream");
const promises_2 = require("stream/promises");
const archive_1 = require("../utils/archive");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('aggiungi-archivio')
    .setDescription('Carica un file cifrato nell\'archivio.')
    .addStringOption((option) => option.setName('password').setDescription('Password dell\'archivio').setRequired(true))
    .addStringOption((option) => option.setName('nome').setDescription('Nome con cui salvare il file').setRequired(true))
    .addAttachmentOption((option) => option.setName('file_allegato').setDescription('File da cifrare').setRequired(true));
async function execute(interaction) {
    const password = interaction.options.getString('password', true);
    const requestedName = interaction.options.getString('nome', true);
    const attachment = interaction.options.getAttachment('file_allegato', true);
    const fileName = (0, archive_1.normalizeArchiveName)(requestedName);
    if (!(0, archive_1.hasArchiveAccess)(password)) {
        await (0, archive_1.notifyArchiveOwner)(interaction.client, 'Caricamento', interaction.user.id, false, 'Accesso negato.');
        await interaction.reply({ content: '❌ Credenziali non valide o accesso non autorizzato.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (!fileName) {
        await (0, archive_1.notifyArchiveOwner)(interaction.client, 'Caricamento', interaction.user.id, false, 'Nome file non valido.');
        await interaction.reply({ content: '❌ Il nome del file non è valido.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (attachment.size > archive_1.MAX_ARCHIVE_ATTACHMENT_BYTES) {
        await interaction.reply({ content: '❌ Il file supera il limite di 25 MB dell\'archivio.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    const tempDir = await (0, promises_1.mkdtemp)(path.join(os.tmpdir(), 'csd-archive-upload-'));
    const tempFile = path.join(tempDir, 'source.bin');
    try {
        const response = await fetch(attachment.url);
        if (!response.ok)
            throw new Error(`Download allegato fallito: HTTP ${response.status}`);
        if (!response.body)
            throw new Error('Nessun corpo di risposta disponibile.');
        const output = (0, fs_1.createWriteStream)(tempFile, { flags: 'wx' });
        await (0, promises_2.pipeline)(stream_1.Readable.fromWeb(response.body), output);
        await (0, archive_1.encryptFileStream)(tempFile, fileName);
        await (0, archive_1.saveArchiveMetadata)(fileName, interaction.user.id);
        await (0, archive_1.notifyArchiveOwner)(interaction.client, 'Caricamento', interaction.user.id, true, `File: ${fileName}`);
        await interaction.editReply(`✅ File **${fileName}** cifrato e salvato nell'archivio.`);
    }
    catch (error) {
        const detail = error?.code === 'EEXIST' ? 'Nome file già presente.' : 'Errore durante il salvataggio.';
        await (0, archive_1.notifyArchiveOwner)(interaction.client, 'Caricamento', interaction.user.id, false, detail);
        await interaction.editReply(`❌ ${detail}`);
    }
    finally {
        await (0, promises_1.rm)(tempDir, { recursive: true, force: true });
    }
}
