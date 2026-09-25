import ArtieHub from '@/components/artie/ArtieHub';
import { artieCast } from '@/data/artieCast';
import {
  ARTIE_CANONICAL_URL,
  ARTIE_DESCRIPTION,
  ARTIE_RSS_PATH,
  ARTIE_TAGLINE,
  artieEpisodes,
} from '@/data/artieComics';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Artie — the abcGEO comic',
  description: ARTIE_DESCRIPTION,
  alternates: {
    canonical: ARTIE_CANONICAL_URL,
    types: {
      'application/rss+xml': ARTIE_RSS_PATH,
    },
  },
  openGraph: {
    title: 'Artie — the abcGEO comic',
    description: ARTIE_TAGLINE,
    url: ARTIE_CANONICAL_URL,
    type: 'website',
  },
};

export default function ArtiePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ComicSeries',
    name: 'Artie',
    url: ARTIE_CANONICAL_URL,
    description: ARTIE_DESCRIPTION,
    character: artieCast.map((character) => ({
      '@type': 'Person',
      name: character.name,
      description: character.role,
    })),
    hasPart: artieEpisodes.map((episode) => ({
      '@type': 'ComicIssue',
      name: episode.title,
      issueNumber: episode.episodeNumber,
      datePublished: episode.publishDate,
      description: episode.transcript ?? episode.altText,
      url: `${ARTIE_CANONICAL_URL}#${episode.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <ArtieHub episodes={artieEpisodes} characters={artieCast} />
    </>
  );
}
