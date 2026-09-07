import { NextRequest, NextResponse } from 'next/server';
import type {
  CitationsCheckRequest,
  CitationsCheckResponse,
  PerplexityApiResponse,
  TrackedCitation,
} from '@lib/types';
import {
  extractPathFromUrl,
  normalizeDomain,
  saveTrackedCitation,
  urlMatchesTargetDomain,
} from '@lib/trackedCitations';

export const runtime = 'nodejs';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'sonar-reasoning';

interface ProcessCitationsResult {
  matchedCitations: TrackedCitation[];
  savedCount: number;
}

/**
 * Loops Perplexity `citations`, flags URLs on the registered target
 * domain as valid GEO citations, extracts paths, and persists rows
 * to the `tracked_citations` table.
 */
export function processPerplexityCitations(
  response: PerplexityApiResponse,
  targetDomain: string,
  targetKeyword: string,
): ProcessCitationsResult {
  const matchedCitations: TrackedCitation[] = [];
  const domain = normalizeDomain(targetDomain);

  response.citations.forEach((citationUrl, index) => {
    if (!urlMatchesTargetDomain(citationUrl, domain)) {
      return;
    }

    const pagePath = extractPathFromUrl(citationUrl);
    const saved = saveTrackedCitation({
      targetDomain: domain,
      citationUrl,
      pagePath,
      targetKeyword,
      perplexityResponseId: response.id,
      model: response.model,
      citationIndex: index + 1,
    });

    matchedCitations.push(saved);
  });

  return {
    matchedCitations,
    savedCount: matchedCitations.length,
  };
}

function buildSimulatedPerplexityResponse(
  targetDomain: string,
  targetKeyword: string,
  focusPaths: string[] = [],
): PerplexityApiResponse {
  const domain = normalizeDomain(targetDomain);
  const primaryPath =
    focusPaths[0] ?? '/blog/the-a-plus-b-geo-framework.html';
  const secondaryPath =
    focusPaths[1] ?? '/blog/answer-first-content-for-ai-overviews.html';
  const zeroClickPath = focusPaths[2] ?? '/framework.html';

  const toAbsolute = (path: string): string => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `https://${domain}${normalized}`;
  };

  const citations = [
    toAbsolute(primaryPath),
    'https://developers.google.com/analytics/devguides/reporting/data/v1',
    toAbsolute(secondaryPath),
    'https://www.perplexity.ai/',
    toAbsolute(zeroClickPath),
  ];

  return {
    id: `sim-pplx-${Date.now()}`,
    model: PERPLEXITY_MODEL,
    created: Math.floor(Date.now() / 1000),
    choices: [
      {
        index: 0,
        finish_reason: 'stop',
        message: {
          role: 'assistant',
          content: [
            `For the query “${targetKeyword}”, Generative Engine Optimization`,
            `(GEO) pairs a named entity with a transitive verb so answer engines`,
            `can extract a closed fact span [1]. Google’s Analytics Data API`,
            `can attribute resulting click-throughs once sessions arrive [2].`,
            `Answer-first blocks further improve extractability for AI Overviews`,
            `and Perplexity [3]. Perplexity itself surfaces citations as a`,
            `first-class list [4]. Teams tracking zero-click exposure should`,
            `monitor framework landing pages even when GA4 sessions stay at zero [5].`,
          ].join(' '),
        },
      },
    ],
    citations,
    usage: {
      prompt_tokens: 128,
      completion_tokens: 220,
      total_tokens: 348,
    },
  };
}

/**
 * Simulates (or optionally executes) a server-side call to
 * `api.perplexity.ai/chat/completions` with `sonar-reasoning`.
 */
async function callPerplexityChatCompletions(
  targetKeyword: string,
  targetDomain: string,
  focusPaths: string[] = [],
): Promise<PerplexityApiResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    return buildSimulatedPerplexityResponse(targetDomain, targetKeyword, focusPaths);
  }

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a research assistant. Answer with concise, citation-backed facts. Prefer authoritative sources.',
        },
        {
          role: 'user',
          content: `Explain “${targetKeyword}” with emphasis on sources hosted on ${normalizeDomain(targetDomain)} when relevant.`,
        },
      ],
      return_citations: true,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    console.warn(
      `[citations/check] Perplexity API ${response.status}; using simulated response.`,
    );
    return buildSimulatedPerplexityResponse(targetDomain, targetKeyword, focusPaths);
  }

  const payload = (await response.json()) as PerplexityApiResponse;

  if (!Array.isArray(payload.citations)) {
    payload.citations = [];
  }

  if (!payload.model) {
    payload.model = PERPLEXITY_MODEL;
  }

  return payload;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: CitationsCheckRequest;

  try {
    body = (await req.json()) as CitationsCheckRequest;
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON.' },
      { status: 400 },
    );
  }

  const targetDomain = body.targetDomain?.trim();
  const targetKeyword = body.targetKeyword?.trim();

  if (!targetDomain || !targetKeyword) {
    return NextResponse.json(
      { error: 'Both `targetDomain` and `targetKeyword` are required.' },
      { status: 400 },
    );
  }

  try {
    const perplexity = await callPerplexityChatCompletions(
      targetKeyword,
      targetDomain,
      body.focusPaths ?? [],
    );

    const { matchedCitations, savedCount } = processPerplexityCitations(
      perplexity,
      targetDomain,
      targetKeyword,
    );

    const payload: CitationsCheckResponse = {
      perplexity,
      matchedCitations,
      savedCount,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown citation check failure.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
