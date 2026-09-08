import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PolicyAcknowledgmentForm } from '@/components/privacy/PolicyAcknowledgmentForm';
import { PolicyTableOfContents } from '@/components/privacy/PolicyTableOfContents';
import { PrivacyPolicySections } from '@/components/privacy/PrivacyPolicySections';
import { POLICY_LAST_UPDATED } from '@/components/privacy/policyContent';

export const metadata: Metadata = {
  title: 'Privacy Policy — abcGEO',
  description:
    'How abcGEO collects, uses, and protects information across our GEO tools, editorial site, and interactive utilities—including our Zero-Training Guarantee.',
  openGraph: {
    title: 'Privacy Policy — abcGEO',
    description:
      'Privacy practices for abcGEO, INSTASTACK, and interactive Generative Engine Optimization tools.',
    url: 'https://abcgeo.dev/privacy.html',
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

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(255,107,74,0.12),transparent),radial-gradient(900px_500px_at_90%_0%,rgba(0,180,216,0.12),transparent),linear-gradient(180deg,#FAF9F6_0%,#F4F7F6_55%,#FAF9F6_100%)] text-abby-ink">
      <a
        href="#privacy-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to privacy policy
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
          <nav aria-label="Primary" className="hidden items-center gap-5 text-sm font-medium text-abby-muted md:flex">
            <a className="transition hover:text-abby-ink" href="/framework.html">
              Formula
            </a>
            <a className="transition hover:text-abby-ink" href="/tools.html">
              Tools
            </a>
            <a className="transition hover:text-abby-ink" href="/blog.html">
              Blog
            </a>
            <a className="transition hover:text-abby-ink" href="/contact.html">
              Contact
            </a>
            <span className="text-abby-ink" aria-current="page">
              Privacy
            </span>
            <a className="transition hover:text-abby-ink" href="/terms">
              Terms
            </a>
          </nav>
          <a
            href="/tools.html"
            className="inline-flex items-center justify-center rounded-lg bg-abby-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E85A3C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-abby-sky focus-visible:ring-offset-2"
          >
            Browse Tools
          </a>
        </div>
      </header>

      <main id="privacy-main">
        <section className="border-b border-[#E2E8F0]/70">
          <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-abby-sky-ink">
              Legal
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold tracking-tight text-abby-ink sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-abby-muted">
              How abcGEO handles site data, cookies, and interactive GEO tool
              inputs—including our Zero-Training Guarantee for client
              submissions.
            </p>
            <p className="mt-4 text-sm text-abby-muted">
              Last updated: {POLICY_LAST_UPDATED}
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1120px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:py-14">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <PolicyTableOfContents />
          </aside>

          <div className="min-w-0 space-y-12">
            <article className="rounded-2xl border border-[#E2E8F0] bg-white/80 p-6 shadow-[0_10px_30px_rgba(26,32,44,0.03)] sm:p-8 md:p-10">
              <PrivacyPolicySections />
            </article>

            <PolicyAcknowledgmentForm />
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
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-abby-muted" aria-label="Footer">
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
