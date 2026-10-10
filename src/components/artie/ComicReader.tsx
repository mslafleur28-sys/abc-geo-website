'use client';

import {
  ARTIE_PLACEHOLDER_IMAGE,
  episodesByNumber,
  formatEpisodeDate,
  type Episode,
} from '@/data/artieComics';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

type ComicReaderProps = {
  episodes: Episode[];
  activeId: string;
  onActiveIdChange: (id: string) => void;
};

export default function ComicReader({
  episodes,
  activeId,
  onActiveIdChange,
}: ComicReaderProps) {
  const ordered = useMemo(() => episodesByNumber(episodes), [episodes]);
  const transcriptId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  const index = ordered.findIndex((episode) => episode.id === activeId);
  const safeIndex = index >= 0 ? index : Math.max(ordered.length - 1, 0);
  const episode = ordered[safeIndex];
  const isFirst = safeIndex <= 0;
  const isLast = safeIndex >= ordered.length - 1;

  useEffect(() => {
    setImageFailed(false);
    setPreviewFailed(false);
  }, [episode?.id]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (dialogRef.current?.open) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === 'ArrowLeft' && !isFirst && episode) {
        event.preventDefault();
        onActiveIdChange(ordered[safeIndex - 1].id);
      }
      if (event.key === 'ArrowRight' && !isLast && episode) {
        event.preventDefault();
        onActiveIdChange(ordered[safeIndex + 1].id);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [episode, isFirst, isLast, onActiveIdChange, ordered, safeIndex]);

  function openPreview() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }

  function closePreview() {
    dialogRef.current?.close();
  }

  if (!episode) {
    return (
      <div className="overflow-hidden rounded-[1.75rem] border border-abby-ink/10 bg-white shadow-[0_18px_40px_rgba(26,32,44,0.06)]">
        <img
          src={ARTIE_PLACEHOLDER_IMAGE}
          alt="Empty comic panel placeholder"
          width={1200}
          height={720}
          className="aspect-[5/3] w-full bg-abby-soft object-cover"
        />
        <p className="px-5 py-6 text-abby-muted" role="status">
          No episodes yet. The next strip will show up here.
        </p>
      </div>
    );
  }

  const imageSrc = imageFailed ? ARTIE_PLACEHOLDER_IMAGE : episode.imageUrl;
  const imageAlt = imageFailed
    ? `Placeholder panel. The artwork for episode ${episode.episodeNumber}, ${episode.title}, could not be loaded.`
    : episode.altText;
  const previewSrc = previewFailed ? ARTIE_PLACEHOLDER_IMAGE : episode.imageUrl;

  return (
    <div
      id="comic-reader"
      tabIndex={-1}
      role="region"
      aria-roledescription="comic reader"
      aria-label={`${episode.title}, episode ${episode.episodeNumber}`}
      aria-keyshortcuts="ArrowLeft ArrowRight"
      className="scroll-mt-24 overflow-hidden rounded-[1.75rem] border border-abby-ink/10 bg-white shadow-[0_18px_40px_rgba(26,32,44,0.06)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral"
    >
      <p className="sr-only" aria-live="polite">
        Showing episode {episode.episodeNumber} of {ordered.length},{' '}
        {episode.title}.
      </p>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-abby-ink/10 px-4 py-4 sm:px-6">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-abby-sky-ink">
            Episode {episode.episodeNumber}
            <span className="text-abby-muted"> · {formatEpisodeDate(episode.publishDate)}</span>
          </p>
          <h2 className="mt-1 font-display text-2xl font-extrabold tracking-[-0.03em] text-abby-ink sm:text-3xl">
            {episode.title}
          </h2>
        </div>
        <p className="text-sm text-abby-muted">
          {safeIndex + 1} of {ordered.length}
        </p>
      </div>

      <div className="bg-abby-soft">
        <img
          src={imageSrc}
          alt={imageAlt}
          width={1200}
          height={720}
          onError={() => setImageFailed(true)}
          className="aspect-[5/3] w-full bg-abby-soft object-contain"
        />
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onActiveIdChange(ordered[safeIndex - 1].id)}
            disabled={isFirst}
            className="inline-flex h-11 items-center justify-center rounded-full border border-abby-ink/15 bg-white px-4 text-sm font-semibold text-abby-ink transition-colors hover:border-abby-sky/50 hover:text-abby-sky-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onActiveIdChange(ordered[safeIndex + 1].id)}
            disabled={isLast}
            className="inline-flex h-11 items-center justify-center rounded-full border border-abby-ink/15 bg-white px-4 text-sm font-semibold text-abby-ink transition-colors hover:border-abby-sky/50 hover:text-abby-sky-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => onActiveIdChange(ordered[ordered.length - 1].id)}
            disabled={isLast}
            className="inline-flex h-11 items-center justify-center rounded-full bg-abby-coral px-4 text-sm font-semibold text-white transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            Jump to latest
          </button>
          <button
            type="button"
            onClick={openPreview}
            aria-haspopup="dialog"
            className="inline-flex h-11 items-center justify-center rounded-full border border-abby-ink/15 bg-white px-4 text-sm font-semibold text-abby-ink transition-colors hover:border-abby-coral/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral"
          >
            Full screen
          </button>
          <button
            type="button"
            aria-expanded={transcriptOpen}
            aria-controls={transcriptId}
            onClick={() => setTranscriptOpen((open) => !open)}
            className="inline-flex h-11 items-center justify-center rounded-full border border-abby-ink/15 bg-abby-cream px-4 text-sm font-semibold text-abby-ink transition-colors hover:border-abby-sky/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral"
          >
            {transcriptOpen ? 'Hide transcript' : 'Transcript'}
          </button>
        </div>
        <p className="text-sm text-abby-muted">
          Left arrow for the previous episode. Right arrow for the next.
        </p>
      </div>

      <div
        id={transcriptId}
        role="region"
        aria-label={`Transcript for ${episode.title}`}
        hidden={!transcriptOpen}
        className="border-t border-abby-ink/10 px-4 py-5 sm:px-6"
      >
        {episode.transcript ? (
          <p className="max-w-3xl text-[1.02rem] leading-relaxed text-abby-ink">
            {episode.transcript}
          </p>
        ) : (
          <p className="text-abby-muted" role="status">
            A transcript for this episode has not been added yet.
          </p>
        )}
      </div>

      <dialog
        ref={dialogRef}
        aria-label={`${episode.title} full screen preview`}
        className="w-[min(96vw,1100px)] rounded-3xl border-0 bg-abby-ink p-3 text-white shadow-2xl backdrop:bg-abby-ink/75"
      >
        <div className="mb-3 flex items-center justify-between gap-3 px-2 pt-1">
          <p className="font-display text-lg font-bold">
            Ep. {episode.episodeNumber}: {episode.title}
          </p>
          <button
            type="button"
            onClick={closePreview}
            className="inline-flex h-11 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-abby-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral"
          >
            Close
          </button>
        </div>
        <img
          src={previewSrc}
          alt={imageAlt}
          width={1200}
          height={720}
          onError={() => setPreviewFailed(true)}
          className="max-h-[78vh] w-full rounded-2xl bg-abby-soft object-contain"
        />
      </dialog>
    </div>
  );
}
