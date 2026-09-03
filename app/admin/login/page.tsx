import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import {
  hasValidAdminSession,
  isAdminPasswordConfigured,
} from '@/lib/admin-auth';

export const metadata: Metadata = {
  title: 'Studio sign-in — Internal | abcGEO',
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLoginPage() {
  if (await hasValidAdminSession()) {
    redirect('/admin/articles');
  }
  const setup = !(await isAdminPasswordConfigured());

  return (
    <main className="mx-auto flex min-h-[80svh] max-w-md flex-col justify-center px-4 py-16">
      <p className="font-display text-4xl font-extrabold tracking-tight text-abby-ink">
        abc<span className="text-abby-sky-ink">GEO</span>
      </p>
      <h1 className="mt-6 font-display text-2xl font-extrabold tracking-tight text-abby-ink">
        {setup ? 'Lock the studio' : 'Private studio'}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-abby-muted">
        {setup
          ? 'Choose a password only you know. Drafts save into this Cursor project so you can post from here.'
          : 'Sign in to create and edit drafts. Work stays in this repo for Cursor.'}
      </p>
      <div className="admin-panel mt-8">
        <AdminLoginForm setup={setup} />
      </div>
    </main>
  );
}
