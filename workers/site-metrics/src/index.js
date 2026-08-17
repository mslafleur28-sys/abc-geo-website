/**
 * abcGEO collaboration quote API worker
 *
 * GET/POST /api/collaboration-quote?domain=example.com
 * GET/POST /api/site-metrics?domain=example.com  (alias)
 *
 * Auth stays in Worker secrets / .dev.vars — never in page JavaScript.
 */

import {
  lookupCollaborationMetrics,
  normalizeDomain,
  sanitizeError,
} from '../../../server/lib/dataforseo.js';

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const rateBuckets = new Map();

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method !== 'GET' && request.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed.' }, 405, request);
    }

    const requestUrl = new URL(request.url);
    if (!isQuotePath(requestUrl.pathname)) {
      return json({ ok: false, error: 'Not found.' }, 404, request);
    }

    const body = request.method === 'POST' ? await safeJson(request) : {};
    const domain = normalizeDomain(
      body.domain ||
        body.url ||
        body.target ||
        requestUrl.searchParams.get('domain') ||
        requestUrl.searchParams.get('url') ||
        ''
    );
    const niche = body.niche || requestUrl.searchParams.get('niche') || 'general';
    const quotedRaw = body.quoted ?? body.quotedPrice ?? requestUrl.searchParams.get('quoted') ?? '';

    if (!domain) {
      return json({ ok: false, error: 'Enter a valid domain or URL.' }, 400, request);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (isRateLimited(ip)) {
      return json({ ok: false, error: 'Too many lookups. Try again in a minute.' }, 429, request);
    }

    if (!env.DATAFORSEO_LOGIN || !env.DATAFORSEO_PASSWORD) {
      return json({ ok: false, error: 'Metrics lookup is not configured.' }, 503, request);
    }

    const cache = caches.default;
    const cacheKey = new Request(
      `https://site-metrics.abcgeo.internal/quote?domain=${domain}&niche=${encodeURIComponent(niche)}`
    );
    const hit = await cache.match(cacheKey);
    if (hit && quotedRaw === '') {
      const cachedBody = await hit.json();
      return json({ ...cachedBody, cached: true }, 200, request, cacheControl(env));
    }

    try {
      const metrics = await lookupCollaborationMetrics(domain, env, {
        niche,
        quoted: quotedRaw === '' ? null : quotedRaw,
      });
      const payload = { ok: true, cached: false, ...metrics };
      if (quotedRaw === '') {
        const ttl = cacheTtl(env);
        ctx.waitUntil(
          cache.put(
            cacheKey,
            new Response(JSON.stringify(payload), {
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': `public, max-age=${ttl}`,
              },
            })
          )
        );
      }
      return json(payload, 200, request, cacheControl(env));
    } catch (err) {
      return json({ ok: false, error: sanitizeError(err), domain }, 502, request);
    }
  },
};

function isQuotePath(pathname) {
  return (
    pathname === '/' ||
    pathname === '/api/collaboration-quote' ||
    pathname.startsWith('/api/collaboration-quote/') ||
    pathname === '/api/site-metrics' ||
    pathname.startsWith('/api/site-metrics/')
  );
}

function cacheTtl(env) {
  const n = Number(env.CACHE_TTL_SECONDS);
  return Number.isFinite(n) && n > 0 ? n : 86400;
}

function cacheControl(env) {
  return { 'Cache-Control': `public, max-age=${cacheTtl(env)}` };
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed =
    !origin ||
    origin === 'https://abcgeo.dev' ||
    origin === 'https://www.abcgeo.dev' ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

  return {
    'Access-Control-Allow-Origin': allowed ? origin || 'https://abcgeo.dev' : 'https://abcgeo.dev',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status, request, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request),
      ...extraHeaders,
    },
  });
}

function isRateLimited(ip) {
  const now = Date.now();
  let rec = rateBuckets.get(ip);
  if (!rec || now > rec.reset) {
    rec = { count: 0, reset: now + RATE_WINDOW_MS };
  }
  rec.count += 1;
  rateBuckets.set(ip, rec);
  return rec.count > RATE_MAX;
}

async function safeJson(request) {
  try {
    const data = await request.json();
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}
