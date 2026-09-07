import { NextResponse } from 'next/server';
import { rejectIfUnauthorized } from '@/lib/admin-auth';
import { isDraftStatus, validateBrief } from '@/lib/article-brief';
import {
  deleteDraft,
  getDraft,
  isBriefBody,
  saveDraft,
  updateDraftStatus,
} from '@/lib/article-brief/drafts';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ slug: string }> };

/** GET /api/articles/drafts/[slug] */
export async function GET(_req: Request, context: RouteContext) {
  const denied = await rejectIfUnauthorized();
  if (denied) return denied;
  const { slug } = await context.params;
  try {
    const draft = await getDraft(slug);
    if (!draft) {
      return NextResponse.json(
        { ok: false, error: 'Draft not found.' },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, draft });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to read draft.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** PUT /api/articles/drafts/[slug] — update brief contents (and optional status). */
export async function PUT(req: Request, context: RouteContext) {
  const denied = await rejectIfUnauthorized();
  if (denied) return denied;
  const { slug: routeSlug } = await context.params;
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

  const existing = await getDraft(routeSlug);
  if (!existing) {
    return NextResponse.json(
      { ok: false, error: 'Draft not found.' },
      { status: 404 },
    );
  }

  try {
    const record = await saveDraft({
      brief: briefSource,
      status: isDraftStatus(payload.status) ? payload.status : existing.status,
      format: existing.format,
      previousSlug: routeSlug,
    });
    return NextResponse.json({
      ok: true,
      path: record.relativePath,
      slug: record.brief.slug,
      draft: record,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to update draft.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** PATCH /api/articles/drafts/[slug] — status-only update (incl. mark published). */
export async function PATCH(req: Request, context: RouteContext) {
  const denied = await rejectIfUnauthorized();
  if (denied) return denied;
  const { slug } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body.' },
      { status: 400 },
    );
  }

  const status =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>).status
      : undefined;

  if (!isDraftStatus(status)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Provide status: draft | ready_for_agent | published.',
      },
      { status: 400 },
    );
  }

  try {
    const draft = await updateDraftStatus(slug, status);
    return NextResponse.json({
      ok: true,
      path: draft.relativePath,
      slug: draft.brief.slug,
      draft,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to update status.';
    const statusCode = message === 'Draft not found.' ? 404 : 500;
    return NextResponse.json(
      { ok: false, error: message },
      { status: statusCode },
    );
  }
}

/** DELETE /api/articles/drafts/[slug] */
export async function DELETE(_req: Request, context: RouteContext) {
  const denied = await rejectIfUnauthorized();
  if (denied) return denied;
  const { slug } = await context.params;
  try {
    const removed = await deleteDraft(slug);
    if (!removed) {
      return NextResponse.json(
        { ok: false, error: 'Draft not found.' },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to delete draft.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
