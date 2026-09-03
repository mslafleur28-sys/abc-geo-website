import { NextResponse } from 'next/server';
import { rejectIfUnauthorized } from '@/lib/admin-auth';
import { isDraftStatus, validateBrief } from '@/lib/article-brief';
import {
  isBriefBody,
  listDrafts,
  saveDraft,
} from '@/lib/article-brief/drafts';

export const runtime = 'nodejs';

/** GET /api/articles/drafts — list all drafts + published briefs. */
export async function GET() {
  const denied = await rejectIfUnauthorized();
  if (denied) return denied;
  try {
    const drafts = await listDrafts();
    return NextResponse.json({ ok: true, drafts });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to list drafts.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** POST /api/articles/drafts — create/overwrite a draft. */
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

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { ok: false, error: 'Payload must be an object.' },
      { status: 400 },
    );
  }

  const payload = body as Record<string, unknown>;
  const briefSource = isBriefBody(payload.brief) ? payload.brief : payload;

  if (!isBriefBody(briefSource)) {
    return NextResponse.json(
      { ok: false, error: 'Payload does not match the article brief schema.' },
      { status: 400 },
    );
  }

  const validation = validateBrief(briefSource);
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

  const status = isDraftStatus(payload.status) ? payload.status : 'draft';

  try {
    const record = await saveDraft({
      brief: briefSource,
      status,
      format: payload.format === 'json' ? 'json' : 'markdown',
    });
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
