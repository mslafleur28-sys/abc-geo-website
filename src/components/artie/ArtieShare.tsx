'use client';

import {
  ARTIE_NEWSLETTER_EMAIL,
  ARTIE_RSS_PATH,
  type Episode,
} from '@/data/artieComics';
import { FormEvent, useState } from 'react';

type ArtieShareProps = {
  episode: Episode | undefined;
};

export default function ArtieShare({ episode }: ArtieShareProps) {
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');

  function pageUrl() {
    return window.location.href;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl());
      setCopied(true);
      setNotice('Link copied.');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice('Copy failed. Select the address bar to share this episode.');
    }
  }

  function openShare(href: string) {
    window.open(href, '_blank', 'noopener,noreferrer');
  }

  function shareOnX() {
    const text = episode
      ? `Artie episode ${episode.episodeNumber}: ${episode.title}`
      : 'Artie, the abcGEO comic';
    const url = new URL('https://twitter.com/intent/tweet');
    url.searchParams.set('text', text);
    url.searchParams.set('url', pageUrl());
    openShare(url.toString());
  }

  function shareOnLinkedIn() {
    const url = new URL('https://www.linkedin.com/sharing/share-offsite/');
    url.searchParams.set('url', pageUrl());
    openShare(url.toString());
  }

  function onNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    const href = `mailto:${ARTIE_NEWSLETTER_EMAIL}?subject=${encodeURIComponent('Artie episode drops')}&body=${encodeURIComponent(`Please send new Artie episodes to ${address}.`)}`;
    setNotice(
      `Your email app should open a note to ${ARTIE_NEWSLETTER_EMAIL}. Send it to join episode alerts.`,
    );
    window.location.href = href;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="rounded-[1.5rem] border border-abby-ink/10 bg-white p-5 shadow-[0_12px_28px_rgba(26,32,44,0.05)] sm:p-6">
        <h3 className="font-display text-2xl font-extrabold tracking-[-0.03em] text-abby-ink">
          Share this episode
        </h3>
        <p className="mt-2 text-abby-muted">
          {episode
            ? `Episode ${episode.episodeNumber}, ${episode.title}, is in the address bar.`
            : 'Open a strip, then share the page.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex h-11 items-center justify-center rounded-full bg-abby-ink px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral"
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={shareOnX}
            className="inline-flex h-11 items-center justify-center rounded-full border border-abby-ink/15 bg-white px-4 text-sm font-semibold text-abby-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral"
          >
            Share on X
          </button>
          <button
            type="button"
            onClick={shareOnLinkedIn}
            className="inline-flex h-11 items-center justify-center rounded-full border border-abby-ink/15 bg-white px-4 text-sm font-semibold text-abby-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral"
          >
            Share on LinkedIn
          </button>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-abby-ink/10 bg-white p-5 shadow-[0_12px_28px_rgba(26,32,44,0.05)] sm:p-6">
        <h3 className="font-display text-2xl font-extrabold tracking-[-0.03em] text-abby-ink">
          New episode drops
        </h3>
        <p className="mt-2 text-abby-muted">
          Follow the feed, or email {ARTIE_NEWSLETTER_EMAIL} to get the next strip.
        </p>
        <p className="mt-4">
          <a
            href={ARTIE_RSS_PATH}
            className="inline-flex h-11 items-center justify-center rounded-full border border-abby-sky/40 bg-abby-sky/10 px-4 text-sm font-semibold text-abby-sky-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral"
          >
            RSS feed
          </a>
        </p>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={onNewsletterSubmit}>
          <label htmlFor="artie-email" className="sr-only">
            Email address for episode alerts
          </label>
          <input
            id="artie-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-11 w-full rounded-full border border-abby-ink/15 bg-abby-cream px-4 text-abby-ink outline-none focus:border-abby-sky focus:shadow-[0_0_0_3px_rgba(0,180,216,0.16)]"
          />
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-abby-coral px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral"
          >
            Email me
          </button>
        </form>
      </div>

      {notice ? (
        <p className="text-sm text-abby-ink lg:col-span-2" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
