const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 12;

const buckets = new Map<string, { count: number; start: number }>();

export function loginRateLimited(key: string): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.start > WINDOW_MS) {
    buckets.set(key, { count: 1, start: now });
    return false;
  }
  current.count += 1;
  return current.count > MAX_ATTEMPTS;
}

export function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'local';
}
