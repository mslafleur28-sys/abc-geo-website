/**
 * Generatometrics — Google Analytics Data API (v1beta) processing module.
 * Builds `properties.runReport` request layouts and maps AI-engine
 * session sources onto landing-page paths.
 */

import type {
  Ga4DateRange,
  GA4SessionRow,
  GeneratometricsAttributionRow,
  GeneratometricsDashboardMetrics,
} from '@lib/types';
import type { Citation, Ga4Conversion } from '@prisma/client';
import { normalizePagePath } from '@lib/citationUrl';

const GA4_DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';

/** Canonical AI engines Generatometrics attributes in the dashboard. */
export const AI_ENGINE_SOURCES = [
  'perplexity',
  'chatgpt',
  'google-ai-overview',
  'gemini',
  'claude',
  'copilot',
] as const;

export type AiEngineSource = (typeof AI_ENGINE_SOURCES)[number];

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

function parseNumber(raw: string | undefined): number {
  if (raw == null || raw === '') return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Resolves a GA4 session source / sourceMedium string to a canonical
 * Generatometrics engine label when it matches a known AI referrer.
 */
export function resolveAiEngine(sourceOrMedium: string): string | null {
  const value = sourceOrMedium.trim().toLowerCase();

  if (
    value.includes('perplexity') ||
    value === 'perplexity.ai' ||
    value.includes('perplexity.ai')
  ) {
    return 'perplexity';
  }
  if (
    value.includes('chatgpt') ||
    value.includes('openai') ||
    value.includes('chat.openai')
  ) {
    return 'chatgpt';
  }
  if (
    value.includes('google-ai-overview') ||
    value.includes('ai overview') ||
    value.includes('ai-overview') ||
    (value.includes('google') && value.includes('overview'))
  ) {
    return 'google-ai-overview';
  }
  if (value.includes('gemini')) {
    return 'gemini';
  }
  if (value.includes('claude') || value.includes('anthropic')) {
    return 'claude';
  }
  if (value.includes('copilot')) {
    return 'copilot';
  }
  if (value.includes('ai-assistant')) {
    return 'ai-assistant';
  }

  return null;
}

/**
 * Dimension filter isolating AI-engine session sources for runReport.
 */
export function buildAiEngineSourceFilter(): Ga4FilterExpression {
  const sourceExpressions: Ga4FilterExpression[] = AI_ENGINE_SOURCES.map((source) => ({
    filter: {
      fieldName: 'sessionSource',
      stringFilter: {
        matchType: 'CONTAINS',
        value: source,
        caseSensitive: false,
      },
    },
  }));

  const mediumExpressions: Ga4FilterExpression[] = [
    'perplexity',
    'chatgpt',
    'google-ai-overview',
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
      expressions: [...sourceExpressions, ...mediumExpressions],
    },
  };
}

/**
 * Request body layout for `properties/{propertyId}:runReport`.
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
    dimensions: [
      { name: 'pagePath' },
      { name: 'sessionSource' },
      { name: 'sessionSourceMedium' },
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'conversions' },
      { name: 'totalRevenue' },
    ],
    dimensionFilter: buildAiEngineSourceFilter(),
    keepEmptyRows: false,
    limit: options.limit ?? 10_000,
  };
}

/**
 * Maps a raw GA4 runReport row into a typed Generatometrics session row.
 * Rows that do not resolve to a known AI engine are dropped by callers
 * via `filterAiEngineRows`.
 */
export function normalizeGa4ReportRow(row: Ga4ApiReportRow): GA4SessionRow {
  const dims = row.dimensionValues ?? [];
  const metrics = row.metricValues ?? [];
  const pagePath = normalizePagePath(dims[0]?.value ?? '/');
  const sessionSource = dims[1]?.value ?? '(not set)';
  const sessionSourceMedium = dims[2]?.value ?? '(not set)';
  const engine =
    resolveAiEngine(sessionSource) ??
    resolveAiEngine(sessionSourceMedium) ??
    'unknown';

  return {
    dimensionValues: {
      pagePath,
      sessionSource,
      sessionSourceMedium,
    },
    metricValues: {
      sessions: parseNumber(metrics[0]?.value),
      engagedSessions: parseNumber(metrics[1]?.value),
      conversions: parseNumber(metrics[2]?.value),
      totalRevenue: parseNumber(metrics[3]?.value),
    },
    engine,
  };
}

/** Keeps only rows whose session source maps to a known AI engine. */
export function filterAiEngineRows(rows: GA4SessionRow[]): GA4SessionRow[] {
  return rows.filter((row) => {
    const fromSource = resolveAiEngine(row.dimensionValues.sessionSource);
    const fromMedium = resolveAiEngine(row.dimensionValues.sessionSourceMedium);
    return Boolean(fromSource || fromMedium);
  });
}

/**
 * Fetches AI-engine scoped traffic from the Google Analytics Data API
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
  const normalized = (payload.rows ?? []).map(normalizeGa4ReportRow);
  return filterAiEngineRows(normalized);
}

/**
 * Aggregates GA4 rows that share a landing page path across AI engines.
 */
export function aggregateGa4ByPagePath(
  rows: GA4SessionRow[],
): Map<string, { sessions: number; conversions: number; revenue: number; engine: string }> {
  const byPath = new Map<
    string,
    { sessions: number; conversions: number; revenue: number; engine: string }
  >();

  for (const row of rows) {
    const pagePath = normalizePagePath(row.dimensionValues.pagePath);
    const existing = byPath.get(pagePath);

    if (!existing) {
      byPath.set(pagePath, {
        sessions: row.metricValues.sessions,
        conversions: row.metricValues.conversions,
        revenue: row.metricValues.totalRevenue,
        engine: row.engine,
      });
      continue;
    }

    existing.sessions += row.metricValues.sessions;
    existing.conversions += row.metricValues.conversions;
    existing.revenue += row.metricValues.totalRevenue;
  }

  return byPath;
}

/**
 * Maps persisted `Ga4Conversion` records onto page-path aggregates.
 */
export function aggregateGa4ConversionsByLandingPage(
  rows: Ga4Conversion[],
): Map<string, { sessions: number; conversions: number; revenue: number; engine: string }> {
  const byPath = new Map<
    string,
    { sessions: number; conversions: number; revenue: number; engine: string }
  >();

  for (const row of rows) {
    const pagePath = normalizePagePath(row.landingPage);
    const existing = byPath.get(pagePath);

    if (!existing) {
      byPath.set(pagePath, {
        sessions: row.sessions,
        conversions: row.conversions,
        revenue: row.revenue,
        engine: row.engine,
      });
      continue;
    }

    existing.sessions += row.sessions;
    existing.conversions += row.conversions;
    existing.revenue += row.revenue;
  }

  return byPath;
}

/**
 * Joins Prisma Citations with GA4 traffic (live rows or stored conversions)
 * for the Generatometrics dashboard table.
 */
export function buildGeneratometricsAttributionRows(
  citations: Citation[],
  trafficByPath: Map<
    string,
    { sessions: number; conversions: number; revenue: number; engine: string }
  >,
): GeneratometricsAttributionRow[] {
  const citationByPath = new Map<string, Citation>();

  for (const citation of citations) {
    const path = normalizePagePath(extractPathSafe(citation.citedUrl));
    const prior = citationByPath.get(path);
    if (!prior || citation.discoveryDate > prior.discoveryDate) {
      citationByPath.set(path, citation);
    }
  }

  const paths = new Set<string>([...citationByPath.keys(), ...trafficByPath.keys()]);
  const rows: GeneratometricsAttributionRow[] = [];

  for (const pagePath of paths) {
    const citation = citationByPath.get(pagePath);
    const traffic = trafficByPath.get(pagePath);
    const sessions = traffic?.sessions ?? 0;
    const conversions = traffic?.conversions ?? 0;
    const revenue = traffic?.revenue ?? 0;
    const isActiveCitation =
      Boolean(citation) &&
      (citation!.status === 'active' || citation!.status === 'cited');
    const conversionRatePercent =
      sessions > 0 ? Number(((conversions / sessions) * 100).toFixed(2)) : 0;

    rows.push({
      citationId: citation?.id ?? null,
      pagePath,
      citationUrl: citation?.citedUrl ?? null,
      keyword: citation?.keyword ?? '(untracked keyword)',
      engine: citation?.engine ?? traffic?.engine ?? 'unknown',
      status: citation?.status ?? 'not_cited',
      discoveryDate: citation?.discoveryDate?.toISOString() ?? null,
      sessions,
      conversions,
      revenue,
      conversionRatePercent,
      isZeroClickCitation: isActiveCitation && sessions === 0,
    });
  }

  return rows.sort((a, b) => {
    if (a.isZeroClickCitation !== b.isZeroClickCitation) {
      return a.isZeroClickCitation ? -1 : 1;
    }
    return b.sessions - a.sessions;
  });
}

export function computeDashboardMetrics(
  citations: Citation[],
  attributionRows: GeneratometricsAttributionRow[],
): GeneratometricsDashboardMetrics {
  const totalTrackedAiCitations = citations.filter(
    (c) => c.status === 'active' || c.status === 'cited',
  ).length;
  const attributedAiClicks = attributionRows.reduce((sum, row) => sum + row.sessions, 0);
  const totalConversions = attributionRows.reduce((sum, row) => sum + row.conversions, 0);
  const totalAttributedRevenue = attributionRows.reduce((sum, row) => sum + row.revenue, 0);
  const conversionRatePercent =
    attributedAiClicks > 0
      ? Number(((totalConversions / attributedAiClicks) * 100).toFixed(2))
      : 0;
  const zeroClickCount = attributionRows.filter((row) => row.isZeroClickCitation).length;

  return {
    totalTrackedAiCitations,
    attributedAiClicks,
    conversionRatePercent,
    totalAttributedRevenue,
    zeroClickCount,
  };
}

function extractPathSafe(url: string): string {
  try {
    const parsed = new URL(url);
    return normalizePagePath(parsed.pathname || '/');
  } catch {
    return normalizePagePath(url);
  }
}

/**
 * Demo / local-dev GA4 rows used when OAuth credentials are unavailable.
 */
export function getDemoGa4TrafficData(): GA4SessionRow[] {
  return [
    {
      dimensionValues: {
        pagePath: '/blog/the-a-plus-b-geo-framework.html',
        sessionSource: 'perplexity',
        sessionSourceMedium: 'perplexity.ai / referral',
      },
      metricValues: {
        sessions: 42,
        engagedSessions: 31,
        conversions: 3,
        totalRevenue: 1240.5,
      },
      engine: 'perplexity',
    },
    {
      dimensionValues: {
        pagePath: '/blog/answer-first-content-for-ai-overviews.html',
        sessionSource: 'chatgpt',
        sessionSourceMedium: 'chatgpt.com / ai-assistant',
      },
      metricValues: {
        sessions: 18,
        engagedSessions: 14,
        conversions: 1,
        totalRevenue: 320,
      },
      engine: 'chatgpt',
    },
    {
      dimensionValues: {
        pagePath: '/tools/citationscape.html',
        sessionSource: 'google-ai-overview',
        sessionSourceMedium: 'google / organic',
      },
      metricValues: {
        sessions: 9,
        engagedSessions: 7,
        conversions: 0,
        totalRevenue: 0,
      },
      engine: 'google-ai-overview',
    },
    {
      dimensionValues: {
        pagePath: '/framework.html',
        sessionSource: 'perplexity',
        sessionSourceMedium: 'perplexity.ai / referral',
      },
      metricValues: {
        sessions: 0,
        engagedSessions: 0,
        conversions: 0,
        totalRevenue: 0,
      },
      engine: 'perplexity',
    },
  ];
}
