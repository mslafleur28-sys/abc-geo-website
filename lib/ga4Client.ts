/**
 * Generatometrics — Google Analytics Data API (v1beta) client.
 * Handles OAuth bearer tokens and AI-referrer scoped runReport requests.
 */

import type {
  Ga4DateRange,
  GA4SessionRow,
  GeneratometricsAttributionRow,
  TrackedCitation,
} from '@lib/types';

const GA4_DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';

/**
 * Exact / known `sessionSourceMedium` values that isolate Perplexity
 * referrals and the May 2026 GA4 AI Assistant channel classification
 * (medium `ai-assistant`). Perplexity is not always auto-classified
 * into AI Assistant, so we keep explicit perplexity variants.
 */
export const AI_REFERRER_SOURCE_MEDIUMS = [
  'perplexity',
  'perplexity / referral',
  'perplexity.ai / referral',
  'www.perplexity.ai / referral',
  'ai-assistant',
  'chatgpt.com / ai-assistant',
  'gemini.google.com / ai-assistant',
  'copilot.microsoft.com / ai-assistant',
  'claude.ai / ai-assistant',
] as const;

export interface Ga4RunReportRequestBody {
  dateRanges: Array<{ startDate: string; endDate: string }>;
  dimensions: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  dimensionFilter: Ga4FilterExpression;
  keepEmptyRows?: boolean;
  limit?: number;
}

export interface Ga4FilterExpression {
  orGroup?: { expressions: Ga4FilterExpression[] };
  andGroup?: { expressions: Ga4FilterExpression[] };
  filter?: {
    fieldName: string;
    stringFilter?: {
      matchType: 'EXACT' | 'CONTAINS' | 'BEGINS_WITH' | 'ENDS_WITH' | 'FULL_REGEXP' | 'PARTIAL_REGEXP';
      value: string;
      caseSensitive?: boolean;
    };
    inListFilter?: {
      values: string[];
      caseSensitive?: boolean;
    };
  };
}

export interface Ga4ApiDimensionValue {
  value?: string;
}

export interface Ga4ApiMetricValue {
  value?: string;
}

export interface Ga4ApiReportRow {
  dimensionValues?: Ga4ApiDimensionValue[];
  metricValues?: Ga4ApiMetricValue[];
}

export interface Ga4RunReportResponse {
  rows?: Ga4ApiReportRow[];
  rowCount?: number;
  dimensionHeaders?: Array<{ name?: string }>;
  metricHeaders?: Array<{ name?: string }>;
}

export interface FetchGa4TrafficDataOptions {
  dateRange?: Ga4DateRange;
  limit?: number;
}

function defaultDateRange(): Ga4DateRange {
  return { startDate: '28daysAgo', endDate: 'today' };
}

/**
 * Builds the `dimensionFilter` that scopes traffic to Perplexity
 * referrals and the May 2026 GA4 AI Assistant update (`ai-assistant`).
 */
export function buildAiReferrerFilterExpression(): Ga4FilterExpression {
  const exactValues = [...AI_REFERRER_SOURCE_MEDIUMS];

  const containsExpressions: Ga4FilterExpression[] = [
    'perplexity',
    'perplexity.ai',
    'ai-assistant',
  ].map((value) => ({
    filter: {
      fieldName: 'sessionSourceMedium',
      stringFilter: {
        matchType: 'CONTAINS',
        value,
        caseSensitive: false,
      },
    },
  }));

  return {
    orGroup: {
      expressions: [
        {
          filter: {
            fieldName: 'sessionSourceMedium',
            inListFilter: {
              values: exactValues,
              caseSensitive: false,
            },
          },
        },
        ...containsExpressions,
      ],
    },
  };
}

/**
 * Request body for `properties/{propertyId}:runReport` isolating
 * AI-referrer sessions by page path + source/medium.
 */
export function buildGa4TrafficReportRequest(
  options: FetchGa4TrafficDataOptions = {},
): Ga4RunReportRequestBody {
  const dateRange = options.dateRange ?? defaultDateRange();

  return {
    dateRanges: [
      {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
    ],
    dimensions: [{ name: 'pagePath' }, { name: 'sessionSourceMedium' }],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'conversions' },
      { name: 'totalRevenue' },
    ],
    dimensionFilter: buildAiReferrerFilterExpression(),
    keepEmptyRows: false,
    limit: options.limit ?? 10_000,
  };
}

function parseNumber(raw: string | undefined): number {
  if (raw == null || raw === '') return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Maps a raw GA4 runReport row into the Generatometrics `GA4SessionRow` schema.
 * The Data API requests `activeUsers`; we store that value under
 * `engagedSessions` in the product schema (dashboard engaged-session column).
 */
export function normalizeGa4ReportRow(row: Ga4ApiReportRow): GA4SessionRow {
  const dims = row.dimensionValues ?? [];
  const metrics = row.metricValues ?? [];

  return {
    dimensionValues: {
      pagePath: dims[0]?.value ?? '/',
      sessionSourceMedium: dims[1]?.value ?? '(not set)',
    },
    metricValues: {
      sessions: parseNumber(metrics[0]?.value),
      engagedSessions: parseNumber(metrics[1]?.value),
      conversions: parseNumber(metrics[2]?.value),
      totalRevenue: parseNumber(metrics[3]?.value),
    },
  };
}

/**
 * Fetches AI-referrer scoped traffic from the Google Analytics Data API
 * (`v1beta` `properties.runReport`) using an OAuth access token.
 */
export async function fetchGa4TrafficData(
  accessToken: string,
  propertyId: string,
  options: FetchGa4TrafficDataOptions = {},
): Promise<GA4SessionRow[]> {
  if (!accessToken?.trim()) {
    throw new Error('fetchGa4TrafficData requires a non-empty OAuth accessToken.');
  }

  const normalizedPropertyId = propertyId.startsWith('properties/')
    ? propertyId
    : `properties/${propertyId}`;

  const body = buildGa4TrafficReportRequest(options);
  const endpoint = `${GA4_DATA_API_BASE}/${normalizedPropertyId}:runReport`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `GA4 runReport failed (${response.status} ${response.statusText}): ${detail}`,
    );
  }

  const payload = (await response.json()) as Ga4RunReportResponse;
  return (payload.rows ?? []).map(normalizeGa4ReportRow);
}

function normalizePagePath(path: string): string {
  if (!path) return '/';
  const trimmed = path.trim();
  if (trimmed === '/') return '/';
  return trimmed.length > 1 && trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

/**
 * Aggregates GA4 rows that share a pagePath (multiple AI source/mediums).
 */
export function aggregateGa4ByPagePath(rows: GA4SessionRow[]): Map<string, GA4SessionRow> {
  const byPath = new Map<string, GA4SessionRow>();

  for (const row of rows) {
    const pagePath = normalizePagePath(row.dimensionValues.pagePath);
    const existing = byPath.get(pagePath);

    if (!existing) {
      byPath.set(pagePath, {
        dimensionValues: {
          pagePath,
          sessionSourceMedium: row.dimensionValues.sessionSourceMedium,
        },
        metricValues: { ...row.metricValues },
      });
      continue;
    }

    existing.metricValues.sessions += row.metricValues.sessions;
    existing.metricValues.engagedSessions += row.metricValues.engagedSessions;
    existing.metricValues.conversions += row.metricValues.conversions;
    existing.metricValues.totalRevenue += row.metricValues.totalRevenue;
  }

  return byPath;
}

/**
 * Joins tracked Perplexity citations to GA4 AI-referrer traffic by pagePath.
 */
export function buildGeneratometricsAttributionRows(
  citations: TrackedCitation[],
  ga4Rows: GA4SessionRow[],
): GeneratometricsAttributionRow[] {
  const ga4ByPath = aggregateGa4ByPagePath(ga4Rows);
  const citationByPath = new Map<string, TrackedCitation>();

  for (const citation of citations) {
    const path = normalizePagePath(citation.pagePath);
    const prior = citationByPath.get(path);
    if (!prior || citation.updatedAt > prior.updatedAt) {
      citationByPath.set(path, citation);
    }
  }

  const paths = new Set<string>([...citationByPath.keys(), ...ga4ByPath.keys()]);
  const rows: GeneratometricsAttributionRow[] = [];

  for (const pagePath of paths) {
    const citation = citationByPath.get(pagePath);
    const ga4 = ga4ByPath.get(pagePath);
    const sessions = ga4?.metricValues.sessions ?? 0;
    const conversions = ga4?.metricValues.conversions ?? 0;
    const isCitedByPerplexity = Boolean(citation);
    const conversionRatePercent =
      sessions > 0 ? Number(((conversions / sessions) * 100).toFixed(2)) : 0;

    rows.push({
      pagePath,
      citationUrl: citation?.citationUrl ?? null,
      targetKeyword: citation?.targetKeyword ?? '(untracked keyword)',
      citationStatus: isCitedByPerplexity ? 'cited' : 'not_cited',
      isCitedByPerplexity,
      ga4Sessions: sessions,
      ga4EngagedSessions: ga4?.metricValues.engagedSessions ?? 0,
      ga4Conversions: conversions,
      ga4TotalRevenue: ga4?.metricValues.totalRevenue ?? 0,
      conversionRatePercent,
      isZeroClickCitation: isCitedByPerplexity && sessions === 0,
    });
  }

  return rows.sort((a, b) => {
    if (a.isZeroClickCitation !== b.isZeroClickCitation) {
      return a.isZeroClickCitation ? -1 : 1;
    }
    return b.ga4Sessions - a.ga4Sessions;
  });
}

/**
 * Demo / local-dev GA4 rows used when OAuth credentials are unavailable.
 */
export function getDemoGa4TrafficData(): GA4SessionRow[] {
  return [
    {
      dimensionValues: {
        pagePath: '/blog/the-a-plus-b-geo-framework.html',
        sessionSourceMedium: 'perplexity.ai / referral',
      },
      metricValues: {
        sessions: 42,
        engagedSessions: 31,
        conversions: 3,
        totalRevenue: 1240.5,
      },
    },
    {
      dimensionValues: {
        pagePath: '/blog/answer-first-content-for-ai-overviews.html',
        sessionSourceMedium: 'perplexity / referral',
      },
      metricValues: {
        sessions: 18,
        engagedSessions: 14,
        conversions: 1,
        totalRevenue: 320,
      },
    },
    {
      dimensionValues: {
        pagePath: '/tools/citationscape.html',
        sessionSourceMedium: 'chatgpt.com / ai-assistant',
      },
      metricValues: {
        sessions: 9,
        engagedSessions: 7,
        conversions: 0,
        totalRevenue: 0,
      },
    },
    {
      dimensionValues: {
        pagePath: '/framework.html',
        sessionSourceMedium: 'perplexity.ai / referral',
      },
      metricValues: {
        sessions: 0,
        engagedSessions: 0,
        conversions: 0,
        totalRevenue: 0,
      },
    },
  ];
}
