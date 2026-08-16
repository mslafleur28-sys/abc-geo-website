/**
 * DataForSEO lookups for the collaboration quote calculator.
 * Auth: HTTP Basic using DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD.
 */

import { calculateCollaborationQuote, rateDeal, trafficBucket } from './collaborationQuote.js';

const DFS_BASE = 'https://api.dataforseo.com/v3';
const US_LOCATION_CODE = 2840;

export function normalizeDomain(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';

  let hostname = '';
  try {
    if (raw.includes('://')) {
      hostname = new URL(raw).hostname;
    } else if (raw.includes('/') || raw.includes(':')) {
      hostname = new URL(`https://${raw}`).hostname;
    } else {
      hostname = raw;
    }
  } catch {
    return '';
  }

  hostname = hostname.replace(/^www\./, '').replace(/\.$/, '');
  if (!hostname || hostname === 'localhost' || !hostname.includes('.')) return '';
  if (!/^[a-z0-9.-]+$/.test(hostname)) return '';
  return hostname;
}

export function clampDr(value) {
  const n = Math.round(Number(value) || 0);
  return Math.max(0, Math.min(100, n));
}

export function basicAuthHeader(login, password) {
  const bytes = new TextEncoder().encode(`${login}:${password}`);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `Basic ${btoa(binary)}`;
}

export function sanitizeError(err) {
  const message = err instanceof Error ? err.message : 'Lookup failed.';
  if (/unauthorized|forbidden|login|password|credential/i.test(message)) {
    return 'Metrics provider rejected the request. Check DataForSEO credentials.';
  }
  return message.slice(0, 180);
}

function firstTaskResult(payload) {
  const task = Array.isArray(payload?.tasks) ? payload.tasks[0] : null;
  const result = Array.isArray(task?.result) ? task.result[0] : null;
  return result || null;
}

function latestOrganicEtv(result) {
  const items = Array.isArray(result?.items) ? result.items.slice() : [];
  if (!items.length) return 0;
  items.sort((a, b) => (Number(a.year) - Number(b.year)) || (Number(a.month) - Number(b.month)));
  const latest = items[items.length - 1];
  return Math.max(0, Math.round(Number(latest?.metrics?.organic?.etv) || 0));
}

async function dfsPost(path, payload, auth) {
  const response = await fetch(`${DFS_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error('DataForSEO request failed.');
  }

  if (data.status_code && data.status_code !== 20000) {
    throw new Error(data.status_message || 'DataForSEO returned an error.');
  }

  const task = Array.isArray(data.tasks) ? data.tasks[0] : null;
  if (task && task.status_code && task.status_code !== 20000) {
    throw new Error(task.status_message || 'DataForSEO task failed.');
  }

  return data;
}

export async function lookupCollaborationMetrics(domain, env, options = {}) {
  const login = env.DATAFORSEO_LOGIN;
  const password = env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new Error('Metrics lookup is not configured.');
  }

  const niche = options.niche || 'general';
  const quoted = options.quoted;
  const auth = basicAuthHeader(login, password);

  const [rankRes, trafficRes] = await Promise.all([
    dfsPost(
      '/backlinks/summary/live',
      [
        {
          target: domain,
          include_subdomains: true,
          backlinks_status_type: 'live',
          internal_list_limit: 1,
          rank_scale: 'one_hundred',
        },
      ],
      auth
    ),
    dfsPost(
      '/dataforseo_labs/google/historical_rank_overview/live',
      [
        {
          target: domain,
          location_code: US_LOCATION_CODE,
          language_code: 'en',
        },
      ],
      auth
    ),
  ]);

  const summary = firstTaskResult(rankRes);
  const trafficResult = firstTaskResult(trafficRes);

  if (!summary && !trafficResult) {
    throw new Error('No ranking or traffic data for this domain.');
  }

  const organicTraffic = latestOrganicEtv(trafficResult);
  const dr = clampDr(summary?.rank);
  const quote = calculateCollaborationQuote({ dr, organicTraffic, niche });
  const deal = quoted == null || quoted === '' ? null : rateDeal(Number(quoted), quote.min, quote.max);

  return {
    domain,
    dr,
    organicTraffic,
    etv: organicTraffic,
    trafficBucket: trafficBucket(organicTraffic),
    referringDomains: Number(summary?.referring_domains) || 0,
    locationCode: US_LOCATION_CODE,
    source: 'dataforseo',
    niche,
    quote,
    deal,
  };
}
