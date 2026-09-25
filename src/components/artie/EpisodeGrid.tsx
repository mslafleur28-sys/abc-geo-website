'use client';

import {
  ARTIE_PLACEHOLDER_IMAGE,
  episodesByNumber,
  formatEpisodeDate,
  type Episode,
} from '@/data/artieComics';
import { useEffect, useMemo, useState } from 'react';

const PAGE_SIZE = 4;

type EpisodeGridProps = {
  episodes: Episode[];
  activeId: string;
  onSelect: (id: string) => void;
};

export default function EpisodeGrid({
  episodes,
  activeId,
  onSelect,
}: EpisodeGridProps) {
  const ordered = useMemo(() => episodesByNumber(episodes), [episodes]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return ordered;
    return ordered.filter((episode) => {
      return (
        episode.title.toLowerCase().includes(needle) ||
        episode.slug.includes(needle) ||
        String(episode.episodeNumber).includes(needle)
      );
    });
  }, [ordered, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  useEffect(() => {
    setPage(0);
  }, [query]);

  if (ordered.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-abby-ink/15 bg-white/70 px-5 py-10 text-center">
        <img
          src={ARTIE_PLACEHOLDER_IMAGE}
          alt=""
          width={1200}
          height={720}
          className="mx-auto aspect-[5/3] w-full max-w-md rounded-2xl object-cover"
        />
        <p className="mt-4 text-abby-muted" role="status">
          The archive is empty. New episodes will show up here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-md">
          <label
            htmlFor="episode-search"
            className="block text-sm font-semibold text-abby-ink"
          >
            Search episodes
          </label>
          <input
            id="episode-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title, number, or slug"
            className="mt-2 h-11 w-full rounded-full border border-abby-ink/15 bg-white px-4 text-abby-ink outline-none transition-shadow placeholder:text-abby-muted focus:border-abby-sky focus:shadow-[0_0_0_3px_rgba(0,180,216,0.16)]"
          />
        </div>
        <p className="text-sm text-abby-muted" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'episode' : 'episodes'}
        </p>
      </div>

      {visible.length === 0 ? (
        <p
          className="mt-8 rounded-[1.5rem] border border-dashed border-abby-ink/15 bg-white/70 px-5 py-10 text-center text-abby-muted"
          role="status"
        >
          No episodes match “{query.trim()}”.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visible.map((episode) => {
            const selected = episode.id === activeId;
            const src = failedIds[episode.id]
              ? ARTIE_PLACEHOLDER_IMAGE
              : episode.imageUrl;
            return (
              <li key={episode.id}>
                <button
                  type="button"
                  onClick={() => onSelect(episode.id)}
                  aria-current={selected ? 'true' : undefined}
                  className={`group flex h-full w-full flex-col overflow-hidden rounded-[1.35rem] border bg-white text-left shadow-[0_10px_24px_rgba(26,32,44,0.05)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral ${
                    selected
                      ? 'border-abby-coral ring-2 ring-abby-coral/70'
                      : 'border-abby-ink/10'
                  }`}
                >
                  <img
                    src={src}
                    alt=""
                    width={1200}
                    height={720}
                    onError={() =>
                      setFailedIds((current) => ({
                        ...current,
                        [episode.id]: true,
                      }))
                    }
                    className="aspect-[5/3] w-full bg-abby-soft object-cover"
                  />
                  <span className="flex flex-1 flex-col px-4 py-4">
                    <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-abby-sky-ink">
                      Episode {episode.episodeNumber}
                    </span>
                    <span className="mt-1 font-display text-xl font-bold tracking-[-0.03em] text-abby-ink group-hover:text-abby-coral">
                      {episode.title}
                    </span>
                    <span className="mt-1 text-sm text-abby-muted">
                      {formatEpisodeDate(episode.publishDate)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > PAGE_SIZE ? (
        <nav
          aria-label="Episode pages"
          className="mt-6 flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="inline-flex h-11 items-center justify-center rounded-full border border-abby-ink/15 bg-white px-4 text-sm font-semibold text-abby-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous page
          </button>
          <p className="px-2 text-sm text-abby-muted">
            Page {currentPage + 1} of {pageCount}
          </p>
          <button
            type="button"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= pageCount - 1}
            className="inline-flex h-11 items-center justify-center rounded-full border border-abby-ink/15 bg-white px-4 text-sm font-semibold text-abby-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next page
          </button>
        </nav>
      ) : null}
    </div>
  );
}
