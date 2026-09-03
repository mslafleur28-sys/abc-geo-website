'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  DRAFT_STATUS_LABELS,
  type DraftStatus,
} from '@/lib/article-brief';

interface DraftListItem {
  slug: string;
  title: string;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
  answerFirstPreview: string;
  filename: string;
  format: 'markdown' | 'json';
  relativePath: string;
  location: 'drafts' | 'published';
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function statusClass(status: DraftStatus): string {
  if (status === 'published') return 'admin-status admin-status-published';
  if (status === 'ready_for_agent') return 'admin-status admin-status-ready';
  return 'admin-status admin-status-draft';
}

export default function DraftsDashboard() {
  const [drafts, setDrafts] = useState<DraftListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | DraftStatus>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/articles/drafts');
      const data = (await res.json()) as {
        ok?: boolean;
        drafts?: DraftListItem[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not load drafts.');
        setDrafts([]);
        return;
      }
      setDrafts(data.drafts ?? []);
    } catch {
      setError('Network error while loading drafts.');
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible =
    filter === 'all' ? drafts : drafts.filter((d) => d.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'draft', label: 'Draft' },
              { id: 'ready_for_agent', label: 'Ready for Agent' },
              { id: 'published', label: 'Published' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              className={`admin-chip ${filter === tab.id ? 'admin-chip-active' : ''}`}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
              {tab.id === 'all' ? (
                <span className="ml-1 opacity-70">({drafts.length})</span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="admin-btn-ghost" onClick={() => void load()}>
            Refresh
          </button>
          <Link href="/admin/articles" className="admin-btn-secondary">
            + New brief
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="admin-panel text-sm text-abby-muted">Scanning content/drafts…</div>
      ) : null}

      {error ? (
        <div className="admin-panel text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      {!loading && !error && visible.length === 0 ? (
        <div className="admin-panel">
          <h2 className="admin-section-title">No drafts yet</h2>
          <p className="admin-section-desc">
            Save a brief from the article form, or drop a{' '}
            <code>.md</code> / <code>.json</code> file into{' '}
            <code>content/drafts</code>.
          </p>
          <Link href="/admin/articles" className="admin-btn-primary mt-4 inline-flex">
            Create article brief
          </Link>
        </div>
      ) : null}

      {!loading && visible.length > 0 ? (
        <div className="admin-panel overflow-x-auto p-0 sm:p-0">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title / Slug</th>
                <th>Created</th>
                <th>Answer-first preview</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((draft) => (
                <tr key={`${draft.location}-${draft.filename}`}>
                  <td>
                    <Link
                      href={`/admin/drafts/${encodeURIComponent(draft.slug)}`}
                      className="font-semibold text-abby-ink hover:text-abby-sky-ink"
                    >
                      {draft.title}
                    </Link>
                    <div className="mt-0.5 font-mono text-[11px] text-abby-muted">
                      {draft.slug}
                      <span className="mx-1 opacity-40">·</span>
                      {draft.format}
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-sm text-abby-muted">
                    {formatDate(draft.createdAt)}
                  </td>
                  <td className="max-w-[18rem] text-sm text-abby-muted">
                    {draft.answerFirstPreview || (
                      <span className="italic opacity-60">No summary</span>
                    )}
                  </td>
                  <td>
                    <span className={statusClass(draft.status)}>
                      {DRAFT_STATUS_LABELS[draft.status]}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/admin/drafts/${encodeURIComponent(draft.slug)}/preview`}
                        className="admin-btn-ghost"
                      >
                        Preview
                      </Link>
                      <Link
                        href={`/admin/drafts/${encodeURIComponent(draft.slug)}`}
                        className="admin-btn-ghost"
                      >
                        Open
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
