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
exports.hasArchiveAccess = hasArchiveAccess;
exports.normalizeArchiveName = normalizeArchiveName;
exports.saveEncryptedArchive = saveEncryptedArchive;
exports.readDecryptedArchive = readDecryptedArchive;
exports.encryptFileStream = encryptFileStream;
exports.decryptFileStream = decryptFileStream;
exports.deleteEncryptedArchive = deleteEncryptedArchive;
exports.saveArchiveMetadata = saveArchiveMetadata;
exports.listArchiveEntries = listArchiveEntries;
exports.notifyArchiveOwner = notifyArchiveOwner;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const promises_2 = require("stream/promises");
const stream_1 = require("stream");
const archiveDirectory = path.resolve(process.cwd(), 'cripteddata');
const tempDirectory = path.resolve(process.cwd(), 'tmp_archive');
const fileHeader = Buffer.from('CSSDARCH1', 'ascii');
const keySalt = Buffer.from('cssd-archivio-v1', 'utf8');
const algorithm = 'aes-256-gcm';
const ivLength = 12;
const tagLength = 16;
function getArchivePassword() {
    return process.env.PASSWORD_ARCHIVIO ?? '';
}
function hasArchiveAccess(userId, password) {
    const authorizedIds = (process.env.ACCESSO_ARCHIVIO_ID ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    return authorizedIds.includes(userId)
        && getArchivePassword().length > 0
        && password === getArchivePassword();
}
function normalizeArchiveName(name) {
    const normalized = name.trim().replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/^\.+/, '');
    if (!normalized || normalized === '.' || normalized === '..')
        return null;
    return normalized.slice(0, 100);
}
function getArchivePath(name) {
    return path.join(archiveDirectory, `${name}.enc`);
}
function getArchiveMetadataPath(name) {
    return path.join(archiveDirectory, `${name}.meta.json`);
}
function deriveKey() {
    return (0, crypto_1.scryptSync)(getArchivePassword(), keySalt, 32);
}
async function ensureArchiveDirectories() {
    await Promise.all([
        import('fs/promises').then((fs) => fs.mkdir(archiveDirectory, { recursive: true })),
        import('fs/promises').then((fs) => fs.mkdir(tempDirectory, { recursive: true })),
    ]);
}
async function saveEncryptedArchive(name, content) {
    const tempDir = await (0, promises_1.mkdtemp)(path.join(os.tmpdir(), 'cssd-archive-'));
    const tempFile = path.join(tempDir, 'upload.bin');
    await (0, promises_1.writeFile)(tempFile, content);
    try {
        await encryptFileStream(tempFile, name);
    }
    finally {
        await (0, promises_1.rm)(tempDir, { recursive: true, force: true });
    }
}
async function readDecryptedArchive(name) {
    const tempDir = await (0, promises_1.mkdtemp)(path.join(os.tmpdir(), 'cssd-read-'));
    const tempFile = path.join(tempDir, 'download.bin');
    try {
        await decryptFileStream(name, tempFile);
        return await import('fs/promises').then((fs) => fs.readFile(tempFile));
    }
    finally {
        await (0, promises_1.rm)(tempDir, { recursive: true, force: true });
    }
}
async function encryptFileStream(inputPath, name) {
    await ensureArchiveDirectories();
    const outputPath = getArchivePath(name);
    const iv = (0, crypto_1.randomBytes)(ivLength);
    const cipher = (0, crypto_1.createCipheriv)(algorithm, deriveKey(), iv);
    const writeStream = (0, fs_1.createWriteStream)(outputPath, { flags: 'wx' });
    const writeFinalTag = new stream_1.Writable({
        write(chunk, _encoding, callback) {
            writeStream.write(chunk, callback);
        },
        final(callback) {
            writeStream.write(cipher.getAuthTag(), () => {
                writeStream.end(callback);
            });
        },
    });
    try {
        writeStream.write(fileHeader);
        writeStream.write(iv);
        await (0, promises_2.pipeline)((0, fs_1.createReadStream)(inputPath), cipher, writeFinalTag);
    }
    catch (error) {
        writeStream.destroy();
        await (0, promises_1.unlink)(outputPath).catch(() => undefined);
        throw error;
    }
}
async function decryptFileStream(name, outputPath) {
    const inputPath = getArchivePath(name);
    const fileInfo = await (0, promises_1.stat)(inputPath);
    if (fileInfo.size < fileHeader.length + ivLength + tagLength) {
        throw new Error('Formato archivio non valido.');
    }
    const fileHandle = await (0, promises_1.open)(inputPath, 'r');
    try {
        const headerBuffer = Buffer.alloc(fileHeader.length);
        const ivBuffer = Buffer.alloc(ivLength);
        const tagBuffer = Buffer.alloc(tagLength);
        await fileHandle.read(headerBuffer, 0, headerBuffer.length, 0);
        if (!headerBuffer.equals(fileHeader)) {
            throw new Error('Formato archivio non valido.');
        }
        await fileHandle.read(ivBuffer, 0, ivBuffer.length, fileHeader.length);
        await fileHandle.read(tagBuffer, 0, tagBuffer.length, fileInfo.size - tagLength);
        const decipher = (0, crypto_1.createDecipheriv)(algorithm, deriveKey(), ivBuffer);
        decipher.setAuthTag(tagBuffer);
        const source = (0, fs_1.createReadStream)(inputPath, {
            start: fileHeader.length + ivLength,
            end: fileInfo.size - tagLength - 1,
            autoClose: true,
        });
        const output = (0, fs_1.createWriteStream)(outputPath, { flags: 'wx' });
        try {
            await (0, promises_2.pipeline)(source, decipher, output);
        }
        catch (error) {
            output.destroy();
            await (0, promises_1.unlink)(outputPath).catch(() => undefined);
            throw error;
        }
    }
    finally {
        await fileHandle.close();
    }
}
async function deleteEncryptedArchive(name) {
    await (0, promises_1.unlink)(getArchivePath(name));
    await (0, promises_1.unlink)(getArchiveMetadataPath(name)).catch((error) => {
        if (error.code !== 'ENOENT')
            throw error;
    });
}
async function saveArchiveMetadata(name, uploaderId) {
    await ensureArchiveDirectories();
    const metadata = {
        uploaderId,
        uploadedAt: new Date().toISOString(),
    };
    await (0, promises_1.writeFile)(getArchiveMetadataPath(name), JSON.stringify(metadata), { flag: 'wx' });
}
async function listArchiveEntries() {
    await ensureArchiveDirectories();
    const files = await (0, promises_1.readdir)(archiveDirectory);
    const encryptedFiles = files.filter((file) => file.endsWith('.enc')).sort((first, second) => first.localeCompare(second));
    return Promise.all(encryptedFiles.map(async (encryptedFile) => {
        const name = encryptedFile.slice(0, -'.enc'.length);
        try {
            const metadata = JSON.parse(await (0, promises_1.readFile)(getArchiveMetadataPath(name), 'utf8'));
            return {
                name,
                uploaderId: metadata.uploaderId ?? 'Sconosciuto',
                uploadedAt: metadata.uploadedAt ?? 'Data non disponibile',
            };
        }
        catch (error) {
            if (error?.code !== 'ENOENT')
                console.error(`Metadata non valido per ${name}:`, error);
            return { name, uploaderId: 'Sconosciuto', uploadedAt: 'Data non disponibile' };
        }
    }));
}
async function notifyArchiveOwner(client, operation, userId, success, detail) {
    const ownerId = process.env.OWNER_ID?.trim();
    if (!ownerId)
        return;
    try {
        const owner = await client.users.fetch(ownerId);
        await owner.send([
            '📦 Operazione archivio cifrato',
            `Operazione: ${operation}`,
            `Timestamp: ${new Date().toISOString()}`,
            `Utente: ${userId}`,
            `Esito: ${success ? 'riuscita' : 'fallita'}`,
            `Dettagli: ${detail}`,
        ].join('\n'));
    }
    catch (error) {
        console.error('Impossibile notificare il proprietario dell\'archivio:', error);
    }
}
