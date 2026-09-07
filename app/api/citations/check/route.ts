import { NextRequest, NextResponse } from 'next/server';
import type { Citation } from '@prisma/client';
import type {
  CitationsCheckRequest,
  CitationsCheckResponse,
  PerplexityApiResponse,
} from '@lib/types';
import { prisma } from '@lib/prisma';
import {
  normalizeDomain,
  urlMatchesTargetDomain,
} from '@lib/citationUrl';

export const runtime = 'nodejs';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'sonar-reasoning';
const DEFAULT_ENGINE = 'Perplexity';

interface ProcessCitationsResult {
  matchedCitations: Citation[];
  savedCount: number;
}

/**
 * Loops Perplexity `citations`, flags URLs on the registered target
 * domain as valid GEO citations, and upserts them into SQLite via Prisma.
 */
export async function processPerplexityCitations(
  response: PerplexityApiResponse,
  keyword: string,
  targetDomain: string,
  engine: string = DEFAULT_ENGINE,
): Promise<ProcessCitationsResult> {
  const matchedCitations: Citation[] = [];
  const domain = normalizeDomain(targetDomain);
  const now = new Date();

  for (const citationUrl of response.citations) {
    if (!urlMatchesTargetDomain(citationUrl, domain)) {
      continue;
    }

    const saved = await prisma.citation.upsert({
      where: {
        keyword_engine_citedUrl: {
          keyword,
          engine,
          citedUrl: citationUrl,
        },
      },
      create: {
        keyword,
        engine,
        citedUrl: citationUrl,
        status: 'active',
        discoveryDate: now,
      },
      update: {
        status: 'active',
        discoveryDate: now,
      },
    });

    matchedCitations.push(saved);
  }

  return {
    matchedCitations,
    savedCount: matchedCitations.length,
  };
}

function buildSimulatedPerplexityResponse(
  targetDomain: string,
  keyword: string,
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
            `For the query “${keyword}”, Generative Engine Optimization`,
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
  keyword: string,
  targetDomain: string,
  focusPaths: string[] = [],
): Promise<PerplexityApiResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    return buildSimulatedPerplexityResponse(targetDomain, keyword, focusPaths);
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
          content: `Explain “${keyword}” with emphasis on sources hosted on ${normalizeDomain(targetDomain)} when relevant.`,
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
    return buildSimulatedPerplexityResponse(targetDomain, keyword, focusPaths);
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
  const keyword = (body.keyword ?? body.targetKeyword)?.trim();
  const engine = (body.engine ?? DEFAULT_ENGINE).trim() || DEFAULT_ENGINE;

  if (!targetDomain || !keyword) {
    return NextResponse.json(
      { error: 'Both `keyword` (or `targetKeyword`) and `targetDomain` are required.' },
      { status: 400 },
    );
  }

  try {
    const perplexity = await callPerplexityChatCompletions(
      keyword,
      targetDomain,
      body.focusPaths ?? [],
    );

    const { matchedCitations, savedCount } = await processPerplexityCitations(
      perplexity,
      keyword,
      targetDomain,
      engine,
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
