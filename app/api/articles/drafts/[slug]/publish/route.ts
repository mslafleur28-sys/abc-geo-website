import { NextResponse } from 'next/server';
import { rejectIfUnauthorized } from '@/lib/admin-auth';
import { publishDraftToBlog } from '@/lib/article-brief/publish';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ slug: string }> };

/** POST /api/articles/drafts/[slug]/publish — write blog HTML + indexes. */
export async function POST(_req: Request, context: RouteContext) {
  const denied = await rejectIfUnauthorized();
  if (denied) return denied;
  const { slug } = await context.params;
  try {
    const result = await publishDraftToBlog(slug);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to publish draft.';
    const status =
      message === 'Draft not found.'
        ? 404
        : message.startsWith('Draft is incomplete')
          ? 400
          : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
