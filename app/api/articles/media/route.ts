import { NextResponse } from 'next/server';
import { rejectIfUnauthorized } from '@/lib/admin-auth';
import {
  ALLOWED_IMAGE_EXT,
  saveUploadedImage,
} from '@/lib/article-brief/media-upload';
import path from 'node:path';

export const runtime = 'nodejs';

/** POST /api/articles/media — upload an image into images/uploads/. */
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

    const original = file.name || 'image.png';
    const ext = path.extname(original).toLowerCase() || '.png';
    if (!ALLOWED_IMAGE_EXT.has(ext)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unsupported type. Use: ${[...ALLOWED_IMAGE_EXT].join(', ')}`,
        },
        { status: 400 },
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: 'Image must be under 8MB.' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { filename, publishSrc, previewSrc } = await saveUploadedImage(
      buffer,
      original,
    );

    return NextResponse.json({
      ok: true,
      filename,
      publishSrc,
      previewSrc,
      /** Prefer publish-relative path in draft markdown so Post to blog just works. */
      src: publishSrc,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to upload image.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
