/**
 * Client helper for the collaboration quote calculator.
 * Calls our backend (never DataForSEO directly) so API credentials stay server-side.
 *
 * GET/POST /api/collaboration-quote?domain=example.com
 */
(function (global) {
  'use strict';

  const DEFAULT_ENDPOINT = '/api/collaboration-quote';

  function normalizeDomain(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      return new URL(withScheme).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return '';
    }
  }

  async function fetchCollaborationQuote(domainOrUrl, options) {
    const opts = options || {};
    const domain = normalizeDomain(domainOrUrl);
    if (!domain) {
      throw new Error('Enter a valid domain or URL.');
    }

    const endpoint = opts.endpoint || DEFAULT_ENDPOINT;
    const niche = opts.niche || 'general';
    const quoted = opts.quoted;
    const params = new URLSearchParams({ domain, niche });
    if (quoted != null && quoted !== '') params.set('quoted', String(quoted));

    const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${params.toString()}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok || !body?.ok) {
      const fallback =
        response.status === 404 || response.status === 503
          ? 'Live metrics are not available yet. Enter DR and traffic manually.'
          : body?.error || 'Could not look up this site.';
      throw new Error(fallback);
    }

    return body;
  }

  global.AbcGeoCollaborationQuote = {
    fetchCollaborationQuote,
    normalizeDomain,
    DEFAULT_ENDPOINT,
  };
})(typeof window !== 'undefined' ? window : globalThis);
