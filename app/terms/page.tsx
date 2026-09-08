import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { TermsAcceptanceForm } from '@/components/terms/TermsAcceptanceForm';
import { TermsTableOfContents } from '@/components/terms/TermsTableOfContents';
import { TermsOfServiceSections } from '@/components/terms/TermsOfServiceSections';
import {
  TERMS_LAST_UPDATED,
  TERMS_VERSION,
} from '@/components/terms/termsContent';

export const metadata: Metadata = {
  title: 'Terms of Service — abcGEO',
  description:
    'Terms governing use of abcGEO websites, GEO diagnostic tools, URL utilities, APIs, and related services.',
  openGraph: {
    title: 'Terms of Service — abcGEO',
    description:
      'Acceptable use, IP, tool fair use, and liability terms for abcGEO and interactive GEO utilities.',
    url: 'https://abcgeo.dev/terms',
    siteName: 'abcGEO',
    type: 'website',
  },
};

const FOOTER_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/framework.html', label: 'Formula' },
  { href: '/tools.html', label: 'Tools' },
  { href: '/templates.html', label: 'Templates' },
  { href: '/blog.html', label: 'Blog' },
  { href: '/contact.html', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
] as const;

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(255,107,74,0.12),transparent),radial-gradient(900px_500px_at_90%_0%,rgba(0,180,216,0.12),transparent),linear-gradient(180deg,#FAF9F6_0%,#F4F7F6_55%,#FAF9F6_100%)] text-abby-ink">
      <a
        href="#terms-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to terms of service
      </a>

      <header className="sticky top-0 z-40 border-b border-[#E2E8F0]/80 bg-[#FAF9F6]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="inline-flex items-center" aria-label="abcGEO home">
            <Image
              src="/assets/logo-lockup.png"
              alt="abcGEO"
              width={180}
              height={28}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <nav
            aria-label="Primary"
            className="hidden items-center gap-5 text-sm font-medium text-abby-muted md:flex"
          >
            <a className="transition hover:text-abby-ink" href="/framework.html">
              Formula
            </a>
            <a className="transition hover:text-abby-ink" href="/tools.html">
              Tools
            </a>
            <a className="transition hover:text-abby-ink" href="/blog.html">
              Blog
            </a>
            <a className="transition hover:text-abby-ink" href="/privacy">
              Privacy
            </a>
            <span className="text-abby-ink" aria-current="page">
              Terms
            </span>
          </nav>
          <a
            href="/tools.html"
            className="inline-flex items-center justify-center rounded-lg bg-abby-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E85A3C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-abby-sky focus-visible:ring-offset-2"
          >
            Browse Tools
          </a>
        </div>
      </header>

      <main id="terms-main">
        <section className="border-b border-[#E2E8F0]/70">
          <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-abby-sky-ink">
              Legal
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold tracking-tight text-abby-ink sm:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-abby-muted">
              Rules for using abcGEO sites, interactive GEO diagnostics, URL
              utilities, and APIs—including fair use, IP, and liability terms.
            </p>
            <p className="mt-4 text-sm text-abby-muted">
              Last updated: {TERMS_LAST_UPDATED} · Version {TERMS_VERSION}
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1120px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:py-14">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <TermsTableOfContents />
          </aside>

          <div className="min-w-0 space-y-12">
            <article className="rounded-2xl border border-[#E2E8F0] bg-white/80 p-6 shadow-[0_10px_30px_rgba(26,32,44,0.03)] sm:p-8 md:p-10">
              <TermsOfServiceSections />
            </article>

            <TermsAcceptanceForm />
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white/50">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-display text-lg font-bold">
              abc<span className="text-abby-coral">GEO</span>
            </p>
            <p className="mt-2 max-w-sm text-sm text-abby-muted">
              A + B = GEO · Built for answer engines.
            </p>
          </div>
          <nav
            className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-abby-muted"
            aria-label="Footer"
          >
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition hover:text-abby-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-abby-sky"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
