import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleBriefForm from '@/components/admin/ArticleBriefForm';

export const metadata: Metadata = {
  title: 'Article brief — Internal | abcGEO',
  description:
    'Internal article submission form for Cursor Agent content workflows.',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminArticlesPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="admin-enter mb-10">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-abby-sky-ink">
          Content workflow
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-abby-ink sm:text-4xl">
          Article brief
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-abby-muted">
          Capture the slug, question, answer-first summary, and layout notes —
          then copy a Cursor Agent prompt that already includes abcGEO writing
          and styling defaults. Saves land in{' '}
          <code>content/drafts</code> so Cursor can post from this repo.{' '}
          <Link href="/admin/drafts" className="text-abby-sky-ink hover:underline">
            View saved drafts →
          </Link>
        </p>
      </header>
      <ArticleBriefForm />
    </div>
  );
}
