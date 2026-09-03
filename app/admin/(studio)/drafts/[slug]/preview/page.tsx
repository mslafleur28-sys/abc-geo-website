import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ArticleDraftPreview from '@/components/admin/ArticleDraftPreview';
import { DRAFT_STATUS_LABELS } from '@/lib/article-brief';
import { getDraft } from '@/lib/article-brief/drafts';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const draft = await getDraft(decodeURIComponent(slug));
  return {
    title: draft
      ? `Preview: ${draft.title} — Internal | abcGEO`
      : 'Preview — Internal | abcGEO',
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function AdminDraftPreviewPage({ params }: PageProps) {
  const { slug } = await params;
  const draft = await getDraft(decodeURIComponent(slug));
  if (!draft) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/admin/drafts" className="text-abby-sky-ink hover:underline">
            ← Drafts
          </Link>
          <span className="text-abby-muted">/</span>
          <Link
            href={`/admin/drafts/${encodeURIComponent(draft.brief.slug)}`}
            className="text-abby-sky-ink hover:underline"
          >
            {draft.brief.slug}
          </Link>
          <span className="text-abby-muted">/</span>
          <span className="font-mono text-xs text-abby-muted">preview</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              draft.status === 'published'
                ? 'admin-status admin-status-published'
                : draft.status === 'ready_for_agent'
                  ? 'admin-status admin-status-ready'
                  : 'admin-status admin-status-draft'
            }
          >
            {DRAFT_STATUS_LABELS[draft.status]}
          </span>
          <Link
            href={`/admin/drafts/${encodeURIComponent(draft.brief.slug)}`}
            className="admin-btn-secondary"
          >
            Edit draft
          </Link>
        </div>
      </div>

      <div className="admin-panel !p-3 sm:!p-4">
        <p className="px-1 pb-3 text-xs leading-relaxed text-abby-muted">
          Approximate render of how this brief will read as a published
          abcGEO post (<code>blog/{draft.brief.slug}.html</code>). Body markdown is
          shaped lightly — the Cursor Agent still produces the final HTML.
        </p>
        <ArticleDraftPreview
          brief={draft.brief}
          title={draft.title}
          updatedAt={draft.updatedAt}
        />
      </div>
    </div>
  );
}
