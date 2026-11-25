import { access } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

const ALLOWED_DIRS = new Set([
  'assets',
  'author',
  'blog',
  'components',
  'css',
  'images',
  'js',
  'templates',
  'tools',
]);

const ALLOWED_EXT = new Set([
  '.css',
  '.gif',
  '.html',
  '.ico',
  '.jpeg',
  '.jpg',
  '.js',
  '.json',
  '.png',
  '.svg',
  '.txt',
  '.webmanifest',
  '.webp',
  '.xml',
]);

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

export function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

/** Resolve a public static-site file. Returns null for app routes and unsafe paths. */
export async function resolveLegacySiteFile(segments: string[]): Promise<string | null> {
  if (!segments.length) return null;
  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === '.' ||
        segment === '..' ||
        segment.startsWith('.') ||
        segment.includes('\\') ||
        segment.includes('\0'),
    )
  ) {
    return null;
  }

  const ext = path.extname(segments[segments.length - 1]).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return null;

  if (segments.length === 1) {
    if (!['.html', '.txt', '.xml'].includes(ext)) return null;
  } else if (!ALLOWED_DIRS.has(segments[0])) {
    return null;
  }

  const absolute = path.resolve(ROOT, ...segments);
  const rootResolved = path.resolve(ROOT);
  if (absolute !== rootResolved && !absolute.startsWith(rootResolved + path.sep)) {
    return null;
  }

  try {
    await access(absolute);
  } catch {
    return null;
  }
  return absolute;
}
