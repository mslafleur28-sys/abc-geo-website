import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { rejectIfUnauthorized } from '@/lib/admin-auth';

export const runtime = 'nodejs';

const IMAGES_ROOT = path.join(process.cwd(), 'images');

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

type RouteContext = { params: Promise<{ path: string[] }> };

function resolveUnderImages(segments: string[]): string | null {
  if (!segments.length || segments.some((s) => s === '..' || s.includes('\\'))) {
    return null;
  }
  const relative = segments.join('/');
  const absolute = path.join(IMAGES_ROOT, relative);
  const rootResolved = path.resolve(IMAGES_ROOT);
  const fileResolved = path.resolve(absolute);
  if (
    fileResolved !== rootResolved &&
    !fileResolved.startsWith(rootResolved + path.sep)
  ) {
    return null;
  }
  return absolute;
}

/** GET /api/articles/media/[...path] — serve images/ for admin preview. */
export async function GET(_req: Request, context: RouteContext) {
  const denied = await rejectIfUnauthorized();
  if (denied) return denied;
  const { path: segments } = await context.params;
  const absolute = resolveUnderImages(segments);
  if (!absolute) {
    return NextResponse.json({ ok: false, error: 'Invalid path.' }, { status: 400 });
  }

  try {
    const data = await readFile(absolute);
    const ext = path.extname(absolute).toLowerCase();
    const type = CONTENT_TYPES[ext] || 'application/octet-stream';
    return new NextResponse(data, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 });
  }
}
