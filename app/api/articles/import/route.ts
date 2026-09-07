import path from 'node:path';
import { NextResponse } from 'next/server';
import { rejectIfUnauthorized } from '@/lib/admin-auth';
import {
  IMPORTABLE_DOC_EXT,
  importDocumentBuffer,
} from '@/lib/article-brief/document-import';

export const runtime = 'nodejs';

const MAX_BYTES = 12 * 1024 * 1024;

/** POST /api/articles/import — convert .docx/.md/.txt/.html into draft body markup. */
export async function POST(req: Request) {
  const denied = await rejectIfUnauthorized();
  if (denied) return denied;
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'Expected multipart file field "file".' },
        { status: 400 },
      );
    }

    const original = file.name || 'document.docx';
    const ext = path.extname(original).toLowerCase();
    if (!IMPORTABLE_DOC_EXT.has(ext)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Unsupported file type. Upload .docx, .md, .txt, or .html.',
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'Document must be under 12MB.' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { rawBody, warnings } = await importDocumentBuffer(buffer, original);

    return NextResponse.json({
      ok: true,
      rawBody,
      warnings,
      filename: original,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to import document.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
