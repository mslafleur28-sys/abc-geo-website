import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  buildSessionCookieValue,
  isAdminPasswordConfigured,
  sessionCookieOptions,
  setAdminPassword,
  verifyAdminPassword,
} from '@/lib/admin-auth';
import { clientKey, loginRateLimited } from '@/lib/admin-rate-limit';

export const runtime = 'nodejs';

/** POST /api/admin/login — sign in or create the private studio password. */
export async function POST(req: Request) {
  if (loginRateLimited(clientKey(req))) {
    return NextResponse.json(
      { ok: false, error: 'Too many attempts. Try again in a few minutes.' },
      { status: 429 },
    );
  }

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

  const password =
    typeof (body as { password?: unknown }).password === 'string'
      ? (body as { password: string }).password
      : '';
  const setup = (body as { setup?: unknown }).setup === true;

  if (!password.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Enter a password.' },
      { status: 400 },
    );
  }

  try {
    const configured = await isAdminPasswordConfigured();
    if (setup) {
      if (configured) {
        return NextResponse.json(
          { ok: false, error: 'Password already set. Sign in instead.' },
          { status: 400 },
        );
      }
      await setAdminPassword(password);
    } else if (!(await verifyAdminPassword(password))) {
      return NextResponse.json(
        { ok: false, error: 'Wrong password.' },
        { status: 401 },
      );
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(
      ADMIN_COOKIE,
      await buildSessionCookieValue(),
      sessionCookieOptions(),
    );
    return res;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not sign in.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
