'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import ArticleBriefForm, {
  type ArticleBriefFormHandle,
} from '@/components/admin/ArticleBriefForm';
import {
  DRAFT_STATUS_LABELS,
  buildAgentPrompt,
  type ArticleDraftRecord,
  type DraftStatus,
} from '@/lib/article-brief';

interface DraftEditorProps {
  initialDraft: ArticleDraftRecord;
}

export default function DraftEditor({ initialDraft }: DraftEditorProps) {
  const router = useRouter();
  const formRef = useRef<ArticleBriefFormHandle>(null);
  const [draft, setDraft] = useState(initialDraft);
  const [busy, setBusy] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveStatusLabel, setSaveStatusLabel] = useState('Changes Saved: up to date');
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const prompt = useMemo(
    () => buildAgentPrompt(draft.brief),
    [draft.brief],
  );

  function confirmLeaveIfDirty(): boolean {
    if (!formRef.current?.isDirty() && !dirty) return true;
    return window.confirm(
      'You have unsaved changes. Leave this page anyway?\n\nAutosave usually finishes within a few seconds — wait for “Saved” or click Save changes first.',
    );
  }

  async function goPreview() {
    setBusy('preview');
    setMessage(null);
    try {
      if (formRef.current?.isDirty()) {
        const saved = await formRef.current.save({ reason: 'preview' });
        if (!saved) {
          setMessage({
            tone: 'err',
            text: 'Could not save before preview. Fix any errors, then try again.',
          });
          return;
        }
        setDraft(saved);
        router.push(
          `/admin/drafts/${encodeURIComponent(saved.brief.slug)}/preview`,
        );
        return;
      }
      router.push(
        `/admin/drafts/${encodeURIComponent(draft.brief.slug)}/preview`,
      );
    } finally {
      setBusy(null);
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setMessage({
        tone: 'ok',
        text: 'Cursor Agent prompt copied — paste into Agent mode.',
      });
      // Nudge status toward ready if still a plain draft.
      if (draft.status === 'draft') {
        await setStatus('ready_for_agent', { silent: true });
      }
    } catch {
      setMessage({
        tone: 'err',
        text: 'Clipboard blocked — use the form preview below to copy manually.',
      });
    }
  }

  async function setStatus(
    status: DraftStatus,
    opts?: { silent?: boolean },
  ) {
    setBusy(status);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/articles/drafts/${encodeURIComponent(draft.brief.slug)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        draft?: ArticleDraftRecord;
        error?: string;
        path?: string;
      };
      if (!res.ok || !data.ok || !data.draft) {
        setMessage({
          tone: 'err',
          text: data.error || 'Could not update status.',
        });
        return;
      }
      setDraft(data.draft);
      if (!opts?.silent) {
        let moved = '';
        if (status === 'published') {
          moved = ` Moved to ${data.path}.`;
        } else if (data.path?.includes('/drafts/')) {
          moved = ` Stored at ${data.path}.`;
        }
        setMessage({
          tone: 'ok',
          text: `Marked as ${DRAFT_STATUS_LABELS[status]}.${moved}`,
        });
      }
      router.refresh();
    } catch {
      setMessage({ tone: 'err', text: 'Network error while updating status.' });
    } finally {
      setBusy(null);
    }
  }

  async function removeDraft() {
    if (
      !window.confirm(
        `Delete draft “${draft.title}”? This removes the file from disk.`,
      )
    ) {
      return;
    }
    setBusy('delete');
    setMessage(null);
    try {
      const res = await fetch(
        `/api/articles/drafts/${encodeURIComponent(draft.brief.slug)}`,
        { method: 'DELETE' },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setMessage({
          tone: 'err',
          text: data.error || 'Could not delete draft.',
        });
        return;
      }
      router.push('/admin/drafts');
      router.refresh();
    } catch {
      setMessage({ tone: 'err', text: 'Network error while deleting.' });
    } finally {
      setBusy(null);
    }
  }

  async function postToBlog() {
    let slug = draft.brief.slug;
    let title = draft.title;
    if (formRef.current?.isDirty()) {
      const saved = await formRef.current.save({ reason: 'manual' });
      if (!saved) {
        setMessage({
          tone: 'err',
          text: 'Save the draft successfully before posting to the blog.',
        });
        return;
      }
      setDraft(saved);
      slug = saved.brief.slug;
      title = saved.title;
    }
    if (
      !window.confirm(
        `Post “${title}” to blog/${slug}.html?\n\nThis writes the HTML file and updates blog.html, sitemap.xml, and llms.txt if needed.`,
      )
    ) {
      return;
    }
    setBusy('publish');
    setMessage(null);
    try {
      const res = await fetch(
        `/api/articles/drafts/${encodeURIComponent(slug)}/publish`,
        { method: 'POST' },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        blogPath?: string;
        draftPath?: string;
        updated?: {
          blogIndex?: boolean;
          sitemap?: boolean;
          llms?: boolean;
        };
      };
      if (!res.ok || !data.ok || !data.blogPath) {
        setMessage({
          tone: 'err',
          text: data.error || 'Could not post article.',
        });
        return;
      }
      const extras = [
        data.updated?.blogIndex ? 'blog index' : null,
        data.updated?.sitemap ? 'sitemap' : null,
        data.updated?.llms ? 'llms.txt' : null,
      ].filter(Boolean);
      setMessage({
        tone: 'ok',
        text: `Posted to ${data.blogPath}${
          extras.length ? ` · updated ${extras.join(', ')}` : ''
        }. Draft moved to ${data.draftPath}.`,
      });
      // Refresh draft record (now published).
      const refreshed = await fetch(
        `/api/articles/drafts/${encodeURIComponent(draft.brief.slug)}`,
      );
      const refreshedData = (await refreshed.json()) as {
        ok?: boolean;
        draft?: ArticleDraftRecord;
      };
      if (refreshedData.ok && refreshedData.draft) {
        setDraft(refreshedData.draft);
      }
      router.refresh();
    } catch {
      setMessage({ tone: 'err', text: 'Network error while posting.' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/admin/drafts"
          className="text-abby-sky-ink hover:underline"
          onClick={(e) => {
            if (!confirmLeaveIfDirty()) e.preventDefault();
          }}
        >
          ← Drafts
        </Link>
        <span className="text-abby-muted">/</span>
        <span className="font-mono text-xs text-abby-muted">{draft.brief.slug}</span>
        {dirty ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-900">
            Unsaved
          </span>
        ) : (
          <span
            className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-emerald-900"
            role="status"
            aria-live="polite"
          >
            {saveStatusLabel || 'Changes Saved'}
          </span>
        )}
      </div>

      <section className="admin-panel admin-enter">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-abby-sky-ink">
              Draft detail
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-abby-ink sm:text-3xl">
              {draft.title}
            </h1>
            <p className="mt-2 font-mono text-xs text-abby-muted">
              {draft.relativePath}
              <span className="mx-1.5 opacity-40">·</span>
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
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            className="admin-btn-secondary"
            disabled={busy !== null}
            onClick={() => void goPreview()}
          >
            {busy === 'preview' ? 'Saving & opening…' : 'Preview article'}
          </button>
          <button
            type="button"
            className="admin-btn-primary"
            disabled={busy !== null}
            onClick={() => void postToBlog()}
          >
            {busy === 'publish' ? 'Posting…' : 'Post to blog'}
          </button>
          <button
            type="button"
            className={`admin-btn-secondary ${copied ? 'admin-btn-pulse' : ''}`}
            onClick={() => void copyPrompt()}
          >
            {copied ? 'Copied' : 'Copy Cursor Agent Prompt'}
          </button>
          <button
            type="button"
            className="admin-btn-secondary"
            disabled={busy !== null || draft.status === 'ready_for_agent'}
            onClick={() => void setStatus('ready_for_agent')}
          >
            {busy === 'ready_for_agent' ? 'Updating…' : 'Mark Ready for Agent'}
          </button>
          <button
            type="button"
            className="admin-btn-secondary"
            disabled={busy !== null || draft.status === 'published'}
            onClick={() => void setStatus('published')}
          >
            {busy === 'published'
              ? 'Moving…'
              : 'Mark as Published / Move to content'}
          </button>
          {draft.status === 'published' ? (
            <button
              type="button"
              className="admin-btn-ghost"
              disabled={busy !== null}
              onClick={() => void setStatus('draft')}
            >
              Move back to drafts
            </button>
          ) : null}
          <button
            type="button"
            className="admin-btn-ghost text-red-700"
            disabled={busy !== null}
            onClick={() => void removeDraft()}
          >
            {busy === 'delete' ? 'Deleting…' : 'Delete'}
          </button>
        </div>

        {message ? (
          <p
            className={`mt-3 text-sm ${
              message.tone === 'ok' ? 'text-emerald-800' : 'text-red-700'
            }`}
            role="status"
          >
            {message.text}
          </p>
        ) : null}

        <p className="mt-4 text-xs leading-relaxed text-abby-muted">
          <strong className="font-semibold text-abby-ink">Post to blog</strong>{' '}
          generates <code>blog/{'{slug}'}.html</code> from this brief (no Cursor
          Agent needed) and updates <code>blog.html</code>,{' '}
          <code>sitemap.xml</code>, and <code>llms.txt</code> when missing.
          Use the Agent prompt only if you want heavier editorial rewrite.
          Edits autosave after a short pause; Preview always saves first.
        </p>
      </section>

      <ArticleBriefForm
        ref={formRef}
        key={draft.brief.slug}
        mode="edit"
        initialBrief={draft.brief}
        initialStatus={draft.status}
        slugLocked={false}
        onDirtyChange={setDirty}
        onSaveStatusChange={({ dirty: nextDirty, label }) => {
          setDirty(nextDirty);
          if (label) setSaveStatusLabel(label);
        }}
        onSaved={(saved) => {
          setDraft(saved);
          if (saved.brief.slug !== draft.brief.slug) {
            router.replace(`/admin/drafts/${encodeURIComponent(saved.brief.slug)}`);
          }
          router.refresh();
        }}
      />
    </div>
  );
}
