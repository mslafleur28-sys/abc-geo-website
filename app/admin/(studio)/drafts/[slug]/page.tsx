import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DraftEditor from '@/components/admin/DraftEditor';
import { getDraft } from '@/lib/article-brief/drafts';

export const metadata: Metadata = {
  title: 'Edit draft — Internal | abcGEO',
  robots: { index: false, follow: false, nocache: true },
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminDraftDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const draft = await getDraft(decodeURIComponent(slug));
  if (!draft) notFound();

  return <DraftEditor initialDraft={draft} />;
}
