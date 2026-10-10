'use client';

import { ARTIE_PLACEHOLDER_IMAGE } from '@/data/artieComics';
import type { Character } from '@/data/artieCast';
import { useState } from 'react';

type CharacterCardProps = {
  character: Character;
};

export default function CharacterCard({ character }: CharacterCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = imageFailed ? ARTIE_PLACEHOLDER_IMAGE : character.avatarUrl;
  const alt = imageFailed
    ? `Placeholder portrait. ${character.name}'s picture could not be loaded.`
    : `Portrait of ${character.name}`;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-abby-ink/10 bg-white shadow-[0_12px_28px_rgba(26,32,44,0.05)]">
      <div className="bg-abby-soft">
        <img
          src={src}
          alt={alt}
          width={400}
          height={480}
          onError={() => setImageFailed(true)}
          className="aspect-[5/6] w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col px-5 py-5">
        <h3 className="font-display text-2xl font-extrabold tracking-[-0.03em] text-abby-ink">
          {character.name}
        </h3>
        <p className="mt-1 text-sm font-semibold uppercase tracking-[0.12em] text-abby-coral">
          {character.role}
        </p>
        <p className="mt-3 flex-1 text-[0.98rem] leading-relaxed text-abby-ink">
          {character.bio}
        </p>
        {character.favoriteQuote ? (
          <blockquote className="mt-4 border-l-4 border-abby-sky pl-3 text-[0.95rem] italic leading-snug text-abby-sky-ink">
            “{character.favoriteQuote}”
          </blockquote>
        ) : null}
      </div>
    </article>
  );
}
