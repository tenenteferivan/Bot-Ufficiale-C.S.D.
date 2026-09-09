import { createCipheriv, createDecipheriv, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { mkdtemp, open, readFile, readdir, rm, stat, unlink, writeFile } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { Writable } from 'stream';
import { promisify } from 'util';
import { Client } from 'discord.js';
import { projectRoot } from './projectPaths';

const archiveDirectory = path.join(projectRoot, 'cripteddata');
const tempDirectory = path.join(projectRoot, 'tmp_archive');
export const MAX_ARCHIVE_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const fileHeader = Buffer.from('CSDARCH1', 'ascii');
const keySalt = Buffer.from('csd-archivio-v1', 'utf8');
const algorithm = 'aes-256-gcm';
const ivLength = 12;
const tagLength = 16;
const scryptAsync = promisify(scrypt);

export interface ArchiveEntry {
  name: string;
  uploaderId: string;
  uploadedAt: string;
}

interface ArchiveMetadata {
  uploaderId: string;
  uploadedAt: string;
}

function getArchivePassword(): string {
  return process.env.PASSWORD_ARCHIVIO ?? '';
}

export function hasArchiveAccess(password: string): boolean {
  const archivePassword = getArchivePassword();
  if (!archivePassword) return false;
  const provided = Buffer.from(password);
  const expected = Buffer.from(archivePassword);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function normalizeArchiveName(name: string): string | null {
  const normalized = name.trim().replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/^\.+/, '');
  if (!normalized || normalized === '.' || normalized === '..') return null;
  return normalized.slice(0, 100);
}

function getArchivePath(name: string): string {
  return path.join(archiveDirectory, `${name}.enc`);
}

function getArchiveMetadataPath(name: string): string {
  return path.join(archiveDirectory, `${name}.meta.json`);
}

async function deriveKey(): Promise<Buffer> {
  return (await scryptAsync(getArchivePassword(), keySalt, 32)) as Buffer;
}

async function ensureArchiveDirectories(): Promise<void> {
  await Promise.all([
    import('fs/promises').then((fs) => fs.mkdir(archiveDirectory, { recursive: true })),
    import('fs/promises').then((fs) => fs.mkdir(tempDirectory, { recursive: true })),
  ]);
}

export async function saveEncryptedArchive(name: string, content: Buffer): Promise<void> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'csd-archive-'));
  const tempFile = path.join(tempDir, 'upload.bin');
  await writeFile(tempFile, content);
  try {
    await encryptFileStream(tempFile, name);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function readDecryptedArchive(name: string): Promise<Buffer> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'csd-read-'));
  const tempFile = path.join(tempDir, 'download.bin');
  try {
    await decryptFileStream(name, tempFile);
    return await import('fs/promises').then((fs) => fs.readFile(tempFile));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function encryptFileStream(inputPath: string, name: string): Promise<void> {
  await ensureArchiveDirectories();
  const outputPath = getArchivePath(name);
  const iv = randomBytes(ivLength);
  const cipher = createCipheriv(algorithm, await deriveKey(), iv);
  const writeStream = createWriteStream(outputPath, { flags: 'wx' });

  const writeFinalTag = new Writable({
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
    await pipeline(createReadStream(inputPath), cipher, writeFinalTag);
  } catch (error) {
    writeStream.destroy();
    await unlink(outputPath).catch(() => undefined);
    throw error;
  }
}

export async function decryptFileStream(name: string, outputPath: string): Promise<void> {
  const inputPath = getArchivePath(name);
  const fileInfo = await stat(inputPath);
  if (fileInfo.size < fileHeader.length + ivLength + tagLength) {
    throw new Error('Formato archivio non valido.');
  }

  const fileHandle = await open(inputPath, 'r');
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

    const decipher = createDecipheriv(algorithm, await deriveKey(), ivBuffer);
    decipher.setAuthTag(tagBuffer);

    const source = createReadStream(inputPath, {
      start: fileHeader.length + ivLength,
      end: fileInfo.size - tagLength - 1,
      autoClose: true,
    });

    const output = createWriteStream(outputPath, { flags: 'wx' });
    try {
      await pipeline(source, decipher, output);
    } catch (error) {
      output.destroy();
      await unlink(outputPath).catch(() => undefined);
      throw error;
    }
  } finally {
    await fileHandle.close();
  }
}

export async function deleteEncryptedArchive(name: string): Promise<void> {
  await unlink(getArchivePath(name));
  await unlink(getArchiveMetadataPath(name)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

export async function saveArchiveMetadata(name: string, uploaderId: string): Promise<void> {
  await ensureArchiveDirectories();
  const metadata: ArchiveMetadata = {
    uploaderId,
    uploadedAt: new Date().toISOString(),
  };
  await writeFile(getArchiveMetadataPath(name), JSON.stringify(metadata), { flag: 'wx' });
}

export async function listArchiveEntries(): Promise<ArchiveEntry[]> {
  await ensureArchiveDirectories();
  const files = await readdir(archiveDirectory);
  const encryptedFiles = files.filter((file) => file.endsWith('.enc')).sort((first, second) => first.localeCompare(second));

  return Promise.all(encryptedFiles.map(async (encryptedFile) => {
    const name = encryptedFile.slice(0, -'.enc'.length);
    try {
      const metadata = JSON.parse(await readFile(getArchiveMetadataPath(name), 'utf8')) as Partial<ArchiveMetadata>;
      return {
        name,
        uploaderId: metadata.uploaderId ?? 'Sconosciuto',
        uploadedAt: metadata.uploadedAt ?? 'Data non disponibile',
      };
    } catch (error: any) {
      if (error?.code !== 'ENOENT') console.error(`Metadata non valido per ${name}:`, error);
      return { name, uploaderId: 'Sconosciuto', uploadedAt: 'Data non disponibile' };
    }
  }));
}

export async function notifyArchiveOwner(
  client: Client,
  operation: 'Caricamento' | 'Download' | 'Eliminazione',
  userId: string,
  success: boolean,
  detail: string,
): Promise<void> {
  const ownerId = process.env.OWNER_ID?.trim();
  if (!ownerId) return;
  console.log(
    `[ARCHIVIO] ${operation} | utente ${userId} | esito ${success ? 'riuscita' : 'fallita'} | ${detail}`
  );
}
