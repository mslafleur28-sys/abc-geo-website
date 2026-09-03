'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export default function AdminChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  if (isLogin) return children;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-abby-ink/10 bg-abby-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/admin/articles"
              className="font-display text-lg font-extrabold tracking-tight text-abby-ink"
            >
              abc<span className="text-abby-sky-ink">GEO</span>
              <span className="ml-2 align-middle font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-abby-muted">
                Internal
              </span>
            </Link>
            <nav className="hidden items-center gap-4 sm:flex">
              <Link
                href="/admin/articles"
                className="font-mono text-[11px] uppercase tracking-wider text-abby-muted hover:text-abby-sky-ink"
              >
                New brief
              </Link>
              <Link
                href="/admin/drafts"
                className="font-mono text-[11px] uppercase tracking-wider text-abby-muted hover:text-abby-sky-ink"
              >
                Drafts
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/blog.html"
              className="hidden font-mono text-xs uppercase tracking-wider text-abby-sky-ink hover:underline sm:inline"
            >
              View blog →
            </a>
            <button
              type="button"
              className="font-mono text-[11px] uppercase tracking-wider text-abby-muted hover:text-abby-ink"
              onClick={() => void logout()}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </main>
    </>
  );
}
