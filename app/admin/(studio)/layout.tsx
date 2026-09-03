import { redirect } from 'next/navigation';
import { hasValidAdminSession } from '@/lib/admin-auth';

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasValidAdminSession())) {
    redirect('/admin/login');
  }
  return children;
}
