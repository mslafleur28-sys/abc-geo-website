import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Admin — abcGEO',
  robots: { index: false, follow: false },
};

export default function AdminIndexPage() {
  redirect('/admin/articles');
}
