/**
 * URL helpers for matching Perplexity citations to a registered domain.
 */

export function normalizeDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();
  try {
    if (trimmed.includes('://')) {
      return new URL(trimmed).hostname.replace(/^www\./, '');
    }
  } catch {
    // fall through — treat as bare hostname
  }
  return trimmed.replace(/^www\./, '').replace(/\/+$/, '');
}

export function extractPathFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname || '/';
    return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  } catch {
    return '/';
  }
}

export function urlMatchesTargetDomain(url: string, targetDomain: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    const target = normalizeDomain(targetDomain);
    return host === target || host.endsWith(`.${target}`);
  } catch {
    return false;
  }
}

export function normalizePagePath(path: string): string {
  if (!path) return '/';
  const trimmed = path.trim();
  if (trimmed === '/') return '/';
  return trimmed.length > 1 && trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}
