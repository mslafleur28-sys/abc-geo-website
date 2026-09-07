/**
 * In-process `tracked_citations` table adapter.
 * Swap the Map for a real SQL/ORM client without changing call sites.
 */

import { randomUUID } from 'crypto';
import type { TrackedCitation } from '@lib/types';

export interface SaveTrackedCitationInput {
  targetDomain: string;
  citationUrl: string;
  pagePath: string;
  targetKeyword: string;
  perplexityResponseId: string;
  model: string;
  citationIndex: number;
  citedAt?: string;
}

const trackedCitations = new Map<string, TrackedCitation>();

function citationKey(targetDomain: string, citationUrl: string, targetKeyword: string): string {
  return `${targetDomain.toLowerCase()}|${citationUrl}|${targetKeyword.toLowerCase()}`;
}

export function saveTrackedCitation(input: SaveTrackedCitationInput): TrackedCitation {
  const now = new Date().toISOString();
  const key = citationKey(input.targetDomain, input.citationUrl, input.targetKeyword);
  const existing = [...trackedCitations.values()].find(
    (row) => citationKey(row.targetDomain, row.citationUrl, row.targetKeyword) === key,
  );

  if (existing) {
    const updated: TrackedCitation = {
      ...existing,
      pagePath: input.pagePath,
      perplexityResponseId: input.perplexityResponseId,
      model: input.model,
      citationIndex: input.citationIndex,
      citedAt: input.citedAt ?? now,
      updatedAt: now,
    };
    trackedCitations.set(existing.id, updated);
    return updated;
  }

  const row: TrackedCitation = {
    id: randomUUID(),
    targetDomain: input.targetDomain,
    citationUrl: input.citationUrl,
    pagePath: input.pagePath,
    targetKeyword: input.targetKeyword,
    perplexityResponseId: input.perplexityResponseId,
    model: input.model,
    citationIndex: input.citationIndex,
    isValidGeoCitation: true,
    citedAt: input.citedAt ?? now,
    createdAt: now,
    updatedAt: now,
  };

  trackedCitations.set(row.id, row);
  return row;
}

export function listTrackedCitations(targetDomain?: string): TrackedCitation[] {
  const rows = [...trackedCitations.values()];
  if (!targetDomain) {
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const normalized = normalizeDomain(targetDomain);
  return rows
    .filter((row) => normalizeDomain(row.targetDomain) === normalized)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function clearTrackedCitations(): void {
  trackedCitations.clear();
}

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
