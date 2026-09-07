import {
  createHash,
  createHmac,
  pbkdf2 as pbkdf2Cb,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const pbkdf2 = promisify(pbkdf2Cb);

export const ADMIN_COOKIE = 'abcgeo_studio';
const LOCK_PATH = path.join(process.cwd(), 'content', '.admin-lock');
const ITERATIONS = 120_000;
const KEY_LEN = 32;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

interface LockFile {
  kdf: 'pbkdf2-sha256';
  iterations: number;
  salt: string;
  hash: string;
  sessionSecret: string;
}

function envPassword(): string {
  return (process.env.ADMIN_PASSWORD || '').trim();
}

function envSessionSecret(): string {
  return (process.env.ADMIN_SESSION_SECRET || '').trim();
}

async function readLock(): Promise<LockFile | null> {
  try {
    const parsed = JSON.parse(await readFile(LOCK_PATH, 'utf8')) as Partial<LockFile>;
    if (
      parsed.kdf !== 'pbkdf2-sha256' ||
      typeof parsed.salt !== 'string' ||
      typeof parsed.hash !== 'string' ||
      typeof parsed.sessionSecret !== 'string'
    ) {
      return null;
    }
    return {
      kdf: 'pbkdf2-sha256',
      iterations: Number(parsed.iterations) || ITERATIONS,
      salt: parsed.salt,
      hash: parsed.hash,
      sessionSecret: parsed.sessionSecret,
    };
  } catch {
    return null;
  }
}

export async function isAdminPasswordConfigured(): Promise<boolean> {
  if (envPassword()) return true;
  return (await readLock()) !== null;
}

async function sessionSecret(): Promise<string | null> {
  if (envSessionSecret()) return envSessionSecret();
  if (envPassword()) {
    return createHash('sha256')
      .update(`abcgeo-admin-session:${envPassword()}`)
      .digest('hex');
  }
  const lock = await readLock();
  return lock?.sessionSecret ?? null;
}

export async function setAdminPassword(password: string): Promise<void> {
  const clean = password.trim();
  if (clean.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  if (envPassword()) {
    throw new Error(
      'Password is set via ADMIN_PASSWORD. Update .env.local instead.',
    );
  }
  if (await readLock()) {
    throw new Error('Password already set. Sign in instead.');
  }
  const salt = randomBytes(16);
  const hash = await pbkdf2(clean, salt, ITERATIONS, KEY_LEN, 'sha256');
  const lock: LockFile = {
    kdf: 'pbkdf2-sha256',
    iterations: ITERATIONS,
    salt: salt.toString('hex'),
    hash: hash.toString('hex'),
    sessionSecret: randomBytes(32).toString('hex'),
  };
  await mkdir(path.dirname(LOCK_PATH), { recursive: true });
  await writeFile(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`, {
    mode: 0o600,
  });
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const env = envPassword();
  if (env) {
    const a = createHash('sha256').update(password).digest();
    const b = createHash('sha256').update(env).digest();
    return timingSafeEqual(a, b);
  }
  const lock = await readLock();
  if (!lock) return false;
  const hash = await pbkdf2(
    password,
    Buffer.from(lock.salt, 'hex'),
    lock.iterations,
    KEY_LEN,
    'sha256',
  );
  const expected = Buffer.from(lock.hash, 'hex');
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}

function signSession(secret: string, exp: number): string {
  const payload = String(exp);
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function parseAndVerifySession(
  token: string | undefined,
  secret: string,
): boolean {
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function hasValidAdminSession(): Promise<boolean> {
  const secret = await sessionSecret();
  if (!secret) return false;
  const jar = await cookies();
  return parseAndVerifySession(jar.get(ADMIN_COOKIE)?.value, secret);
}

export async function buildSessionCookieValue(): Promise<string> {
  const secret = await sessionSecret();
  if (!secret) throw new Error('Admin session is not configured.');
  return signSession(secret, Date.now() + COOKIE_MAX_AGE * 1000);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };
}

export async function rejectIfUnauthorized(): Promise<NextResponse | null> {
  if (await hasValidAdminSession()) return null;
  return NextResponse.json(
    { ok: false, error: 'Sign in required.' },
    { status: 401 },
  );
}
