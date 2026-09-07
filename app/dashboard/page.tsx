import type { Metadata } from 'next';
import type { GA4SessionRow, NexusAttributionRow, TrackedCitation } from '@lib/types';
import {
  buildNexusAttributionRows,
  fetchGa4TrafficData,
  getDemoGa4TrafficData,
} from '@lib/ga4Client';
import { listTrackedCitations, saveTrackedCitation } from '@lib/trackedCitations';

export const metadata: Metadata = {
  title: 'GEO Nexus — Attribution Dashboard',
  description:
    'Merge Perplexity citation tracking with GA4 AI-referrer sessions, conversions, and revenue.',
};

export const dynamic = 'force-dynamic';

function seedDemoCitationsIfEmpty(targetDomain: string): TrackedCitation[] {
  const existing = listTrackedCitations(targetDomain);
  if (existing.length > 0) {
    return existing;
  }

  const now = new Date().toISOString();
  const seeds: Array<Omit<TrackedCitation, 'id' | 'createdAt' | 'updatedAt' | 'isValidGeoCitation'> & {
    citationIndex: number;
  }> = [
    {
      targetDomain,
      citationUrl: `https://${targetDomain}/blog/the-a-plus-b-geo-framework.html`,
      pagePath: '/blog/the-a-plus-b-geo-framework.html',
      targetKeyword: 'A + B = GEO framework',
      perplexityResponseId: 'seed-pplx-001',
      model: 'sonar-reasoning',
      citationIndex: 1,
      citedAt: now,
    },
    {
      targetDomain,
      citationUrl: `https://${targetDomain}/blog/answer-first-content-for-ai-overviews.html`,
      pagePath: '/blog/answer-first-content-for-ai-overviews.html',
      targetKeyword: 'answer-first content AI Overviews',
      perplexityResponseId: 'seed-pplx-002',
      model: 'sonar-reasoning',
      citationIndex: 1,
      citedAt: now,
    },
    {
      targetDomain,
      citationUrl: `https://${targetDomain}/framework.html`,
      pagePath: '/framework.html',
      targetKeyword: 'GEO framework overview',
      perplexityResponseId: 'seed-pplx-003',
      model: 'sonar-reasoning',
      citationIndex: 1,
      citedAt: now,
    },
  ];

  return seeds.map((seed) =>
    saveTrackedCitation({
      targetDomain: seed.targetDomain,
      citationUrl: seed.citationUrl,
      pagePath: seed.pagePath,
      targetKeyword: seed.targetKeyword,
      perplexityResponseId: seed.perplexityResponseId,
      model: seed.model,
      citationIndex: seed.citationIndex,
      citedAt: seed.citedAt,
    }),
  );
}

async function loadGa4Rows(): Promise<{ rows: GA4SessionRow[]; source: 'live' | 'demo' }> {
  const accessToken = process.env.GA4_ACCESS_TOKEN;
  const propertyId = process.env.GA4_PROPERTY_ID;

  if (accessToken && propertyId) {
    try {
      const rows = await fetchGa4TrafficData(accessToken, propertyId, {
        dateRange: { startDate: '28daysAgo', endDate: 'today' },
      });
      return { rows, source: 'live' };
    } catch (error) {
      console.warn('[GEO Nexus] GA4 live fetch failed; falling back to demo rows.', error);
    }
  }

  return { rows: getDemoGa4TrafficData(), source: 'demo' };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function CitationStatusCell({ row }: { row: NexusAttributionRow }) {
  if (row.isCitedByPerplexity) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
          Cited
        </span>
        {row.isZeroClickCitation ? (
          <span
            className="inline-flex animate-pulse items-center rounded-md bg-amber-400 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-abby-ink shadow-sm ring-2 ring-amber-500"
            title="Perplexity cites this URL but GA4 reports 0 AI-referrer sessions"
          >
            Zero-Click Citation
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-abby-muted ring-1 ring-slate-200">
      Not cited
    </span>
  );
}

export default async function GeoNexusDashboardPage() {
  const targetDomain = process.env.GEO_NEXUS_TARGET_DOMAIN ?? 'abcgeo.dev';
  const citations = seedDemoCitationsIfEmpty(targetDomain);
  const { rows: ga4Rows, source: ga4Source } = await loadGa4Rows();
  const attributionRows = buildNexusAttributionRows(citations, ga4Rows);
  const zeroClickCount = attributionRows.filter((row) => row.isZeroClickCitation).length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-abby-cream via-white to-abby-soft">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-abby-sky-ink">
            GEO Nexus
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-abby-ink sm:text-5xl">
            Attribution Nexus
          </h1>
          <p className="mt-3 max-w-2xl text-base text-abby-muted sm:text-lg">
            Perplexity cited URLs mapped to GA4 <code className="text-abby-ink">pagePath</code>{' '}
            records — sessions, conversion rate, and attributed revenue from AI referrers
            (Perplexity + May 2026 AI Assistant channel).
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/80 px-3 py-1 text-abby-ink ring-1 ring-slate-200">
              Domain: <strong>{targetDomain}</strong>
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-abby-ink ring-1 ring-slate-200">
              GA4 source: <strong>{ga4Source}</strong>
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-abby-ink ring-1 ring-slate-200">
              Tracked citations: <strong>{citations.length}</strong>
            </span>
            {zeroClickCount > 0 ? (
              <span className="rounded-full bg-amber-400 px-3 py-1 font-bold text-abby-ink ring-2 ring-amber-500">
                {zeroClickCount} Zero-Click Citation{zeroClickCount === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
        </header>

        <section
          aria-label="Nexus attribution table"
          className="overflow-hidden rounded-2xl bg-white/90 shadow-sm ring-1 ring-slate-200 backdrop-blur"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-abby-soft/80">
                <tr>
                  <th scope="col" className="px-4 py-3 font-display font-bold text-abby-ink">
                    Page path
                  </th>
                  <th scope="col" className="px-4 py-3 font-display font-bold text-abby-ink">
                    Target keyword &amp; citation status
                  </th>
                  <th scope="col" className="px-4 py-3 font-display font-bold text-abby-ink">
                    GA4 sessions (Perplexity / AI)
                  </th>
                  <th scope="col" className="px-4 py-3 font-display font-bold text-abby-ink">
                    Conversion rate
                  </th>
                  <th scope="col" className="px-4 py-3 font-display font-bold text-abby-ink">
                    Attributed revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attributionRows.map((row) => (
                  <tr
                    key={row.pagePath}
                    className={
                      row.isZeroClickCitation
                        ? 'bg-amber-50/80 transition-colors'
                        : 'bg-white hover:bg-abby-soft/40'
                    }
                  >
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-abby-ink">{row.pagePath}</div>
                      {row.citationUrl ? (
                        <a
                          href={row.citationUrl}
                          className="mt-1 block truncate text-xs text-abby-sky-ink underline-offset-2 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {row.citationUrl}
                        </a>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-abby-ink">{row.targetKeyword}</div>
                      <div className="mt-2">
                        <CitationStatusCell row={row} />
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top tabular-nums text-abby-ink">
                      <div className="text-base font-semibold">{row.ga4Sessions}</div>
                      <div className="text-xs text-abby-muted">
                        {row.ga4EngagedSessions} engaged
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top tabular-nums text-abby-ink">
                      <div className="text-base font-semibold">
                        {row.conversionRatePercent.toFixed(2)}%
                      </div>
                      <div className="text-xs text-abby-muted">
                        {row.ga4Conversions} conversions
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top tabular-nums text-abby-ink">
                      <div className="text-base font-semibold">
                        {formatCurrency(row.ga4TotalRevenue)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-6 text-sm text-abby-muted">
          Live wiring: set <code className="text-abby-ink">GA4_ACCESS_TOKEN</code>,{' '}
          <code className="text-abby-ink">GA4_PROPERTY_ID</code>, and optionally{' '}
          <code className="text-abby-ink">PERPLEXITY_API_KEY</code>. Citation checks POST to{' '}
          <code className="text-abby-ink">/api/citations/check</code>.
        </p>
      </div>
    </main>
  );
}
