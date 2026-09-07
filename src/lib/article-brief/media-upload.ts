import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const IMAGES_ROOT = path.join(process.cwd(), 'images');
const UPLOADS_DIR = path.join(IMAGES_ROOT, 'uploads');

export const ALLOWED_IMAGE_EXT = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
]);

export function safeImageSegment(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export interface SavedImageResult {
  filename: string;
  publishSrc: string;
  previewSrc: string;
}

/** Save an image buffer into images/uploads/ and return draft/preview paths. */
export async function saveUploadedImage(
  buffer: Buffer,
  originalName: string,
): Promise<SavedImageResult> {
  const ext = path.extname(originalName).toLowerCase() || '.png';
  if (!ALLOWED_IMAGE_EXT.has(ext)) {
    throw new Error(
      `Unsupported image type. Use: ${[...ALLOWED_IMAGE_EXT].join(', ')}`,
    );
  }

  const base =
    safeImageSegment(path.basename(originalName, ext)) || `image-${Date.now()}`;
  const filename = `${base}-${Date.now().toString(36)}${ext}`;
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, filename), buffer);

  return {
    filename,
    publishSrc: `../images/uploads/${filename}`,
    previewSrc: `/api/articles/media/uploads/${filename}`,
  };
}
