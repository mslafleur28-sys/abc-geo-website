'use client';

import { TERMS_SECTIONS } from '@/components/terms/termsContent';

export function TermsTableOfContents() {
  return (
    <nav
      aria-label="Terms of Service sections"
      className="rounded-2xl border border-[#E2E8F0] bg-white/90 p-5 shadow-[0_8px_24px_rgba(26,32,44,0.04)] backdrop-blur"
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-abby-sky-ink">
        On this page
      </p>
      <ol className="mt-4 space-y-2">
        {TERMS_SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="block rounded-md px-2 py-1.5 text-sm leading-snug text-abby-muted transition hover:bg-abby-soft hover:text-abby-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-abby-sky"
            >
              {section.title}
            </a>
          </li>
        ))}
        <li>
          <a
            href="#terms-acceptance"
            className="block rounded-md px-2 py-1.5 text-sm font-semibold leading-snug text-abby-coral transition hover:bg-[#FFF4F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-abby-sky"
          >
            Accept Terms
          </a>
        </li>
      </ol>
    </nav>
  );
}
