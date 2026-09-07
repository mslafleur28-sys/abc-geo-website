import type { Metadata } from 'next';
import type { GeneratometricsAttributionRow } from '@lib/types';
import {
  aggregateGa4ByPagePath,
  aggregateGa4ConversionsByLandingPage,
  buildGeneratometricsAttributionRows,
  computeDashboardMetrics,
  fetchGa4TrafficData,
  getDemoGa4TrafficData,
} from '@lib/ga4Client';
import { prisma } from '@lib/prisma';

export const metadata: Metadata = {
  title: 'Generatometrics — GEO Analytics Dashboard',
  description:
    'Track AI citations and attribute down-funnel GA4 conversions across Perplexity, ChatGPT, and Google AI Overviews.',
};

export const dynamic = 'force-dynamic';

async function ensureSeedData(targetDomain: string): Promise<void> {
  const citationCount = await prisma.citation.count();
  if (citationCount > 0) {
    return;
  }

  const now = new Date();

  await prisma.citation.createMany({
    data: [
      {
        keyword: 'A + B = GEO framework',
        engine: 'Perplexity',
        citedUrl: `https://${targetDomain}/blog/the-a-plus-b-geo-framework.html`,
        status: 'active',
        discoveryDate: now,
      },
      {
        keyword: 'answer-first content AI Overviews',
        engine: 'Perplexity',
        citedUrl: `https://${targetDomain}/blog/answer-first-content-for-ai-overviews.html`,
        status: 'active',
        discoveryDate: now,
      },
      {
        keyword: 'GEO framework overview',
        engine: 'Perplexity',
        citedUrl: `https://${targetDomain}/framework.html`,
        status: 'active',
        discoveryDate: now,
      },
      {
        keyword: 'Citationscape GEO tool',
        engine: 'ChatGPT',
        citedUrl: `https://${targetDomain}/tools/citationscape.html`,
        status: 'active',
        discoveryDate: now,
      },
    ],
  });

  const conversionCount = await prisma.ga4Conversion.count();
  if (conversionCount > 0) {
    return;
  }

  await prisma.ga4Conversion.createMany({
    data: [
      {
        timestamp: now,
        engine: 'perplexity',
        landingPage: '/blog/the-a-plus-b-geo-framework.html',
        sessions: 42,
        conversions: 3,
        revenue: 1240.5,
      },
      {
        timestamp: now,
        engine: 'chatgpt',
        landingPage: '/blog/answer-first-content-for-ai-overviews.html',
        sessions: 18,
        conversions: 1,
        revenue: 320,
      },
      {
        timestamp: now,
        engine: 'google-ai-overview',
        landingPage: '/tools/citationscape.html',
        sessions: 9,
        conversions: 0,
        revenue: 0,
      },
      {
        timestamp: now,
        engine: 'perplexity',
        landingPage: '/framework.html',
        sessions: 0,
        conversions: 0,
        revenue: 0,
      },
    ],
  });
}

async function loadTrafficByPath(): Promise<{
  byPath: Map<string, { sessions: number; conversions: number; revenue: number; engine: string }>;
  source: 'live' | 'database' | 'demo';
}> {
  const accessToken = process.env.GA4_ACCESS_TOKEN;
  const propertyId = process.env.GA4_PROPERTY_ID;

  if (accessToken && propertyId) {
    try {
      const rows = await fetchGa4TrafficData(accessToken, propertyId, {
        dateRange: { startDate: '28daysAgo', endDate: 'today' },
      });
      return { byPath: aggregateGa4ByPagePath(rows), source: 'live' };
    } catch (error) {
      console.warn('[Generatometrics] GA4 live fetch failed; using stored conversions.', error);
    }
  }

  const stored = await prisma.ga4Conversion.findMany({
    orderBy: { timestamp: 'desc' },
  });

  if (stored.length > 0) {
    return {
      byPath: aggregateGa4ConversionsByLandingPage(stored),
      source: 'database',
    };
  }

  return {
    byPath: aggregateGa4ByPagePath(getDemoGa4TrafficData()),
    source: 'demo',
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function MetricCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: 'cyan' | 'violet' | 'emerald' | 'amber';
}) {
  const accents: Record<typeof accent, string> = {
    cyan: 'from-cyan-500/20 via-cyan-400/5 to-transparent border-cyan-400/30',
    violet: 'from-violet-500/20 via-violet-400/5 to-transparent border-violet-400/30',
    emerald: 'from-emerald-500/20 via-emerald-400/5 to-transparent border-emerald-400/30',
    amber: 'from-amber-500/25 via-amber-400/5 to-transparent border-amber-400/40',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${accents[accent]} bg-slate-950/70 p-5 shadow-[0_0_40px_-20px_rgba(34,211,238,0.45)]`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function CitationStatusCell({ row }: { row: GeneratometricsAttributionRow }) {
  const isActive = row.status === 'active' || row.status === 'cited';

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span
        className={
          isActive
            ? 'rounded-md bg-emerald-400/15 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/40'
            : 'rounded-md bg-slate-800 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400 ring-1 ring-slate-700'
        }
      >
        {isActive ? 'Active citation' : row.status}
      </span>
      {row.isZeroClickCitation ? (
        <span
          className="inline-flex animate-pulse items-center rounded-md bg-amber-400 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.55)] ring-2 ring-amber-300"
          title="Active citation with 0 GA4 AI-referrer sessions"
        >
          Zero-Click Citation
        </span>
      ) : null}
    </span>
  );
}

export default async function GeneratometricsDashboardPage() {
  const targetDomain = process.env.GENERATOMETRICS_TARGET_DOMAIN ?? 'abcgeo.dev';
  await ensureSeedData(targetDomain);

  const citations = await prisma.citation.findMany({
    orderBy: { discoveryDate: 'desc' },
  });
  const { byPath, source: trafficSource } = await loadTrafficByPath();
  const attributionRows = buildGeneratometricsAttributionRows(citations, byPath);
  const metrics = computeDashboardMetrics(citations, attributionRows);

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/90">
            GEO Analytics SaaS
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Generatometrics
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-400 sm:text-lg">
            Track AI citations and attribute down-funnel GA4 conversions across Perplexity,
            ChatGPT, and Google AI Overviews.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-slate-300">
              Domain: <strong className="text-white">{targetDomain}</strong>
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-slate-300">
              Traffic: <strong className="text-white">{trafficSource}</strong>
            </span>
            {metrics.zeroClickCount > 0 ? (
              <span className="rounded-full bg-amber-400 px-3 py-1 font-bold text-slate-950 ring-2 ring-amber-200">
                {metrics.zeroClickCount} Zero-Click Citation
                {metrics.zeroClickCount === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
        </header>

        <section
          aria-label="Global Generatometrics metrics"
          className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            label="Total Tracked AI Citations"
            value={formatNumber(metrics.totalTrackedAiCitations)}
            hint="Active citations in SQLite"
            accent="cyan"
          />
          <MetricCard
            label="Attributed AI Clicks"
            value={formatNumber(metrics.attributedAiClicks)}
            hint="GA4 sessions from AI engines"
            accent="violet"
          />
          <MetricCard
            label="Conversion Rate"
            value={`${metrics.conversionRatePercent.toFixed(2)}%`}
            hint="Conversions ÷ AI sessions"
            accent="emerald"
          />
          <MetricCard
            label="Total Attributed Revenue"
            value={formatCurrency(metrics.totalAttributedRevenue)}
            hint="Revenue from AI-referred paths"
            accent="amber"
          />
        </section>

        <section
          aria-label="Generatometrics attribution table"
          className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 shadow-[0_0_60px_-30px_rgba(56,189,248,0.35)] backdrop-blur"
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Citation × GA4 Attribution
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Prisma citations merged with AI-engine traffic by landing page
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-900/90">
                <tr>
                  <th scope="col" className="px-4 py-3 font-display font-bold text-slate-200">
                    Landing page
                  </th>
                  <th scope="col" className="px-4 py-3 font-display font-bold text-slate-200">
                    Keyword &amp; status
                  </th>
                  <th scope="col" className="px-4 py-3 font-display font-bold text-slate-200">
                    Engine
                  </th>
                  <th scope="col" className="px-4 py-3 font-display font-bold text-slate-200">
                    AI sessions
                  </th>
                  <th scope="col" className="px-4 py-3 font-display font-bold text-slate-200">
                    Conv. rate
                  </th>
                  <th scope="col" className="px-4 py-3 font-display font-bold text-slate-200">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {attributionRows.map((row) => (
                  <tr
                    key={`${row.pagePath}-${row.citationId ?? 'traffic'}`}
                    className={
                      row.isZeroClickCitation
                        ? 'bg-amber-400/10 transition-colors'
                        : 'bg-transparent hover:bg-slate-900/70'
                    }
                  >
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-slate-100">{row.pagePath}</div>
                      {row.citationUrl ? (
                        <a
                          href={row.citationUrl}
                          className="mt-1 block truncate text-xs text-cyan-300/90 underline-offset-2 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {row.citationUrl}
                        </a>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-slate-100">{row.keyword}</div>
                      <div className="mt-2">
                        <CitationStatusCell row={row} />
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top capitalize text-slate-300">
                      {row.engine}
                    </td>
                    <td className="px-4 py-4 align-top tabular-nums text-slate-100">
                      <div className="text-base font-semibold">{formatNumber(row.sessions)}</div>
                      <div className="text-xs text-slate-500">
                        {formatNumber(row.conversions)} conversions
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top tabular-nums text-slate-100">
                      <div className="text-base font-semibold">
                        {row.conversionRatePercent.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top tabular-nums text-slate-100">
                      <div className="text-base font-semibold">
                        {formatCurrency(row.revenue)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-6 text-sm text-slate-500">
          Live wiring: set <code className="text-slate-300">DATABASE_URL</code>,{' '}
          <code className="text-slate-300">GA4_ACCESS_TOKEN</code>,{' '}
          <code className="text-slate-300">GA4_PROPERTY_ID</code>, and optionally{' '}
          <code className="text-slate-300">PERPLEXITY_API_KEY</code>. Citation checks POST to{' '}
          <code className="text-slate-300">/api/citations/check</code>.
        </p>
      </div>
    </main>
  );
}
