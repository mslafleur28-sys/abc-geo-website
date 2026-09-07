/**
 * Generatometrics — shared TypeScript contracts for Perplexity citation
 * tracking, GA4 Data API rows, and dashboard attribution joins.
 */

import type { Citation, Ga4Conversion } from '@prisma/client';

/** Single choice message returned by Perplexity chat/completions. */
export interface PerplexityChoiceMessage {
  role: 'assistant' | 'user' | 'system';
  /**
   * Answer body. Inline footnotes reference the top-level `citations`
   * array by 1-based index, e.g. "… according to the report [1]."
   */
  content: string;
}

export interface PerplexityChoice {
  index: number;
  finish_reason: string | null;
  message: PerplexityChoiceMessage;
}

/**
 * Shape of a Perplexity `/chat/completions` response used by the
 * citation tracker. Footnote markers in `choices[].message.content`
 * (e.g. `[1]`) map to entries in the top-level `citations` array.
 */
export interface PerplexityApiResponse {
  id: string;
  model: string;
  choices: PerplexityChoice[];
  /** Absolute source URLs cited in the answer, ordered to match [1], [2], … */
  citations: string[];
  created?: number;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Named GA4 dimension bag for a single report row. */
export interface GA4DimensionValues {
  pagePath: string;
  sessionSource: string;
  sessionSourceMedium: string;
}

/** Named GA4 metric bag for a single report row. */
export interface GA4MetricValues {
  sessions: number;
  engagedSessions: number;
  conversions: number;
  totalRevenue: number;
}

/**
 * Normalized GA4 Data API row after `properties.runReport`.
 * Dimensions and metrics are typed by name (not positional arrays).
 */
export interface GA4SessionRow {
  dimensionValues: GA4DimensionValues;
  metricValues: GA4MetricValues;
  /** Canonical AI engine label derived from session source / medium. */
  engine: string;
}

export type CitationStatus = 'active' | 'inactive' | 'cited' | 'not_cited';

/**
 * Dashboard attribution row: Prisma Citation joined to GA4 /
 * Ga4Conversion traffic for the same landing path.
 */
export interface GeneratometricsAttributionRow {
  citationId: string | null;
  pagePath: string;
  citationUrl: string | null;
  keyword: string;
  engine: string;
  status: string;
  discoveryDate: string | null;
  sessions: number;
  conversions: number;
  revenue: number;
  /** Direct conversion rate: conversions / sessions * 100. */
  conversionRatePercent: number;
  /**
   * True when the citation is active in the database but GA4 reports
   * 0 sessions for that path in the selected feed.
   */
  isZeroClickCitation: boolean;
}

export interface GeneratometricsDashboardMetrics {
  totalTrackedAiCitations: number;
  attributedAiClicks: number;
  conversionRatePercent: number;
  totalAttributedRevenue: number;
  zeroClickCount: number;
}

export interface CitationsCheckRequest {
  /** Alias accepted by the API — preferred field name. */
  keyword?: string;
  /** Backward-compatible alias for `keyword`. */
  targetKeyword?: string;
  targetDomain: string;
  engine?: string;
  /** Optional registered page paths to bias the simulated prompt. */
  focusPaths?: string[];
}

export interface CitationsCheckResponse {
  perplexity: PerplexityApiResponse;
  matchedCitations: Citation[];
  savedCount: number;
}

export interface Ga4DateRange {
  startDate: string;
  endDate: string;
}

export type { Citation, Ga4Conversion };
