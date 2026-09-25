'use client';

import ArtieShare from '@/components/artie/ArtieShare';
import CharacterCard from '@/components/artie/CharacterCard';
import ComicReader from '@/components/artie/ComicReader';
import EpisodeGrid from '@/components/artie/EpisodeGrid';
import type { Character } from '@/data/artieCast';
import {
  ARTIE_TAGLINE,
  episodesByNumber,
  latestEpisode,
  type Episode,
} from '@/data/artieComics';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ArtieHubProps = {
  episodes: Episode[];
  characters: Character[];
};

const NAV = [
  { href: '#reader', label: 'Latest' },
  { href: '#archive', label: 'Archive' },
  { href: '#cast', label: 'Cast' },
  { href: '#subscribe', label: 'Subscribe' },
] as const;

export default function ArtieHub({ episodes, characters }: ArtieHubProps) {
  const ordered = useMemo(() => episodesByNumber(episodes), [episodes]);
  const newest = latestEpisode(episodes);
  const [activeId, setActiveId] = useState(newest?.id ?? '');

  useEffect(() => {
    const slug = window.location.hash.replace(/^#/, '');
    if (!slug) return;
    const match = episodes.find((episode) => episode.slug === slug);
    if (!match) return;
    setActiveId(match.id);
    document.getElementById('reader')?.scrollIntoView({ block: 'start' });
  }, [episodes]);

  function selectEpisode(id: string, scroll: boolean) {
    setActiveId(id);
    const episode = episodes.find((item) => item.id === id);
    if (episode && window.location.hash !== `#${episode.slug}`) {
      window.history.replaceState(null, '', `#${episode.slug}`);
    }
    if (!scroll) return;
    const reader = document.getElementById('reader');
    reader?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('comic-reader')?.focus({ preventScroll: true });
  }

  const active = ordered.find((episode) => episode.id === activeId) ?? newest;

  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-abby-cream via-abby-soft to-abby-cream text-abby-ink">
      <header className="sticky top-0 z-20 border-b border-abby-ink/10 bg-abby-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 md:px-8">
          <Link
            href="/artie"
            className="font-display text-xl font-extrabold tracking-[-0.04em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral"
          >
            Artie
          </Link>
          <nav aria-label="Artie" className="flex flex-wrap items-center justify-end gap-x-1 gap-y-1">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-2 py-2 text-sm font-semibold text-abby-ink hover:text-abby-coral focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral sm:px-3"
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/"
              className="rounded-full px-2.5 py-2 text-sm font-semibold text-abby-muted hover:text-abby-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral sm:px-3"
            >
              abcGEO
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-28 pt-8 md:px-8 md:pt-10">
        <section aria-labelledby="artie-title">
          <h1 id="artie-title" className="sr-only">
            Artie
          </h1>
          <img
            src="/artie/artie-cover.png"
            alt="Artie, a smiling robot in a white shirt and red tie, sits at a cluttered office desk holding a mug that reads More Synergy Please. A stressed man in a suit clutches his head, Janet stands with a name badge and a folder, and a younger coworker in a hoodie smiles beside stacks of paper. City towers fill the windows behind them. The banner reads Artie, the weekly comic about AI in the workplace."
            width={1024}
            height={409}
            className="h-auto w-full rounded-[1.75rem] border border-abby-ink/10 shadow-[0_18px_40px_rgba(26,32,44,0.12)]"
          />
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-lg leading-snug text-abby-muted">
              {ARTIE_TAGLINE}
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="#reader"
                className="inline-flex h-11 items-center justify-center rounded-full bg-abby-coral px-5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral"
              >
                Read the latest
              </a>
              <a
                href="#cast"
                className="inline-flex h-11 items-center justify-center rounded-full border border-abby-ink/15 bg-white px-5 text-sm font-semibold text-abby-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral"
              >
                Meet the cast
              </a>
            </div>
          </div>
        </section>

        <section id="reader" aria-labelledby="reader-heading" className="scroll-mt-24 pt-16 md:pt-20">
          <h2 id="reader-heading" className="font-display text-3xl font-extrabold tracking-[-0.04em]">
            Latest episode
          </h2>
          <p className="mt-2 max-w-2xl text-abby-muted">
            Step through the strip, open it full screen, or read the transcript.
          </p>
          <div className="mt-6">
            <ComicReader
              episodes={episodes}
              activeId={activeId}
              onActiveIdChange={(id) => selectEpisode(id, false)}
            />
          </div>
        </section>

        <section id="archive" aria-labelledby="archive-heading" className="scroll-mt-24 pt-16 md:pt-20">
          <h2 id="archive-heading" className="font-display text-3xl font-extrabold tracking-[-0.04em]">
            Episode archive
          </h2>
          <p className="mt-2 max-w-2xl text-abby-muted">
            Search by title or episode number. Choose a thumbnail to open it in the reader.
          </p>
          <div className="mt-6">
            <EpisodeGrid
              episodes={episodes}
              activeId={activeId}
              onSelect={(id) => selectEpisode(id, true)}
            />
          </div>
        </section>

        <section id="cast" aria-labelledby="cast-heading" className="scroll-mt-24 pt-16 md:pt-20">
          <h2 id="cast-heading" className="font-display text-3xl font-extrabold tracking-[-0.04em]">
            Meet the cast
          </h2>
          <p className="mt-2 max-w-2xl text-abby-muted">
            Four people, one studio, and a running argument about how plainly to say the thing.
          </p>
          {characters.length === 0 ? (
            <p className="mt-6 text-abby-muted" role="status">
              The cast list is empty for now.
            </p>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {characters.map((character) => (
                <li key={character.id}>
                  <CharacterCard character={character} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="subscribe" aria-labelledby="subscribe-heading" className="scroll-mt-24 pt-16 md:pt-20">
          <h2 id="subscribe-heading" className="font-display text-3xl font-extrabold tracking-[-0.04em]">
            Share and follow
          </h2>
          <p className="mt-2 max-w-2xl text-abby-muted">
            Pass a strip along, or subscribe when a new episode lands.
          </p>
          <div className="mt-6">
            <ArtieShare episode={active} />
          </div>
        </section>
      </main>
    </div>
  );
}
