import { NextResponse } from 'next/server';
import { rejectIfUnauthorized } from '@/lib/admin-auth';
import { validateBrief } from '@/lib/article-brief';
import { isBriefBody, saveDraft } from '@/lib/article-brief/drafts';

export const runtime = 'nodejs';

/**
 * Legacy create endpoint — prefers /api/articles/drafts going forward.
 * Kept so older callers keep working.
 */
export async function POST(req: Request) {
  const denied = await rejectIfUnauthorized();
  if (denied) return denied;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body.' },
      { status: 400 },
    );
  }

  if (!isBriefBody(body)) {
    return NextResponse.json(
      { ok: false, error: 'Payload does not match the article brief schema.' },
      { status: 400 },
    );
  }

  const validation = validateBrief(body);
  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Brief failed validation.',
        errors: validation.errors,
      },
      { status: 400 },
    );
  }

  try {
    const record = await saveDraft({ brief: body, status: 'draft' });
    return NextResponse.json({
      ok: true,
      path: record.relativePath,
      slug: record.brief.slug,
      draft: record,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to write draft file.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
