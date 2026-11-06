import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const MAX_PLANT_IMAGE_BYTES = 25 * 1024 * 1024;

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const EXTENSION_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export interface StoredPlantImage {
  id: string;
  url: string;
  filename: string;
  description?: string;
  type: string;
  capturedAt: string;
  uploadedAt: string;
  fileSize: number;
  dimensions: { width: number; height: number };
  isPrimary: boolean;
  tags: string[];
  storageKey: string;
}

export function plantImageRoot(): string {
  const configured = process.env.CANNAAI_PLANT_IMAGE_DIR?.trim();
  if (configured) return path.resolve(configured);
  // The Robin deployment keeps every grow artifact on the plant store.
  // The repository lives at ~/cannaai and the plant store at ~/plants.
  return path.resolve(process.cwd(), '..', 'plants', 'photos', 'cannaai');
}

function extensionFor(file: File, buffer: Buffer): string | null {
  const byMime = MIME_EXTENSIONS[file.type];
  if (byMime) return byMime;
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString('ascii').startsWith('GIF8')) return 'gif';
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) return 'webp';
  return null;
}

async function imageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  try {
    const sharp = (await import('sharp')).default;
    const metadata = await sharp(buffer).metadata();
    return { width: metadata.width || 0, height: metadata.height || 0 };
  } catch {
    return { width: 0, height: 0 };
  }
}

export async function savePlantImage(
  plantId: string,
  file: File,
  options: { description?: string; type?: string; isPrimary?: boolean } = {},
): Promise<StoredPlantImage> {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new Error('An image file is required.');
  }
  if (file.size > MAX_PLANT_IMAGE_BYTES) {
    throw new Error('Plant image is larger than the 25 MB limit.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) throw new Error('Plant image file is empty.');
  const extension = extensionFor(file, buffer);
  if (!extension) throw new Error('Unsupported plant image type. Use JPEG, PNG, WebP, or GIF.');

  const id = randomUUID();
  const storageKey = `${plantId}/${id}.${extension}`;
  const target = resolvePlantImagePath(storageKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer, { flag: 'wx' });

  const now = new Date().toISOString();
  return {
    id,
    url: `/api/plants/${encodeURIComponent(plantId)}/images/${id}`,
    filename: file.name || `plant-${id}.${extension}`,
    description: options.description || undefined,
    type: options.type || 'overview',
    capturedAt: now,
    uploadedAt: now,
    fileSize: buffer.length,
    dimensions: await imageDimensions(buffer),
    isPrimary: Boolean(options.isPrimary),
    tags: [],
    storageKey,
  };
}

export function resolvePlantImagePath(storageKey: string): string {
  const root = plantImageRoot();
  const resolved = path.resolve(root, storageKey);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Invalid plant image storage key.');
  }
  return resolved;
}

export async function readPlantImage(storageKey: string): Promise<{ buffer: Buffer; contentType: string }> {
  const filePath = resolvePlantImagePath(storageKey);
  const extension = path.extname(filePath).slice(1).toLowerCase();
  const contentType = EXTENSION_MIME[extension];
  if (!contentType) throw new Error('Unsupported stored plant image type.');
  return { buffer: await readFile(filePath), contentType };
}

export async function deletePlantImageFile(record: unknown): Promise<void> {
  if (!record || typeof record !== 'object') return;
  const storageKey = (record as { storageKey?: unknown }).storageKey;
  if (typeof storageKey !== 'string' || !storageKey) return;
  try {
    await unlink(resolvePlantImagePath(storageKey));
  } catch {
    // The database record is the source of truth for the UI. A file that was
    // already removed manually should not make image deletion fail.
  }
}

export function publicPlantImage<T extends Record<string, unknown>>(record: T): T {
  // storageKey is a server-side locator. The API contract exposes the file
  // through its /file URL, never through a filesystem path.
  const { storageKey: _storageKey, ...rest } = record as T & { storageKey?: unknown };
  return rest as T;
}
