import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { contentTypeFor, resolveLegacySiteFile } from '@/lib/legacy-site';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ path: string[] }> };

/** Serve the static marketing site (tools, templates, blog) from the Next app. */
export async function GET(_req: Request, context: RouteContext) {
  const { path: segments } = await context.params;
  const absolute = await resolveLegacySiteFile(segments);
  if (!absolute) {
    return new NextResponse('Not found.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const data = await readFile(absolute);
  return new NextResponse(data, {
    headers: {
      'Content-Type': contentTypeFor(absolute),
      'Cache-Control': 'no-cache',
    },
  });
}
