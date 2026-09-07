import type { Metadata } from 'next';
import DraftsDashboard from '@/components/admin/DraftsDashboard';

export const metadata: Metadata = {
  title: 'Drafts — Internal | abcGEO',
  description: 'Manage article briefs saved under content/drafts.',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminDraftsPage() {
  return (
    <div>
      <header className="admin-enter mb-10">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-abby-sky-ink">
          Content workflow
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-abby-ink sm:text-4xl">
          Drafts
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-abby-muted">
          Browse saved briefs in <code>content/drafts</code>, open one to edit,
          copy a Cursor Agent prompt, or mark it published. Cursor picks up
          those files in this project automatically.
        </p>
      </header>
      <DraftsDashboard />
    </div>
  );
}
