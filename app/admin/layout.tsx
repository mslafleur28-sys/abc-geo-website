import type { Metadata } from 'next';
import AdminChrome from '@/components/admin/AdminChrome';
import './admin.css';

export const metadata: Metadata = {
  title: 'Admin — Internal | abcGEO',
  description: 'Internal abcGEO content tools.',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="admin-shell min-h-screen text-abby-ink">
      <AdminChrome>{children}</AdminChrome>
    </div>
  );
}
