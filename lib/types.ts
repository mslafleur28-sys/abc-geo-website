/**
 * Generatometrics — shared schema types for Perplexity citation tracking
 * and GA4 OAuth / Data API (v1beta) attribution.
 */

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
}

/** Persisted row in the `tracked_citations` table. */
export interface TrackedCitation {
  id: string;
  /** Registered brand / site domain, e.g. `abcgeo.dev`. */
  targetDomain: string;
  /** Absolute cited URL that matched the target domain. */
  citationUrl: string;
  /** Path extracted from `citationUrl` (matches GA4 `pagePath`). */
  pagePath: string;
  /** Keyword / prompt that produced the Perplexity answer. */
  targetKeyword: string;
  /** Perplexity response id that contained this citation. */
  perplexityResponseId: string;
  /** Model used for the completion (e.g. `sonar-reasoning`). */
  model: string;
  /** 1-based index into the Perplexity `citations` array. */
  citationIndex: number;
  isValidGeoCitation: true;
  citedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type CitationStatus = 'cited' | 'not_cited';

/**
 * Dashboard attribution row: Perplexity citation joined to GA4
 * Perplexity / AI-assistant traffic for the same `pagePath`.
 */
export interface GeneratometricsAttributionRow {
  pagePath: string;
  citationUrl: string | null;
  targetKeyword: string;
  citationStatus: CitationStatus;
  isCitedByPerplexity: boolean;
  ga4Sessions: number;
  ga4EngagedSessions: number;
  ga4Conversions: number;
  ga4TotalRevenue: number;
  /** Direct conversion rate: conversions / sessions * 100. */
  conversionRatePercent: number;
  /**
   * True when Perplexity cites the URL but GA4 reports 0 sessions
   * from AI referrers for that path in the selected date range.
   */
  isZeroClickCitation: boolean;
}

export interface CitationsCheckRequest {
  targetDomain: string;
  targetKeyword: string;
  /** Optional registered page paths to bias the simulated / live prompt. */
  focusPaths?: string[];
}

export interface CitationsCheckResponse {
  perplexity: PerplexityApiResponse;
  matchedCitations: TrackedCitation[];
  savedCount: number;
}

export interface Ga4DateRange {
  startDate: string;
  endDate: string;
}
