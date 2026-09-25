import {
  ARTIE_CANONICAL_URL,
  ARTIE_DESCRIPTION,
  artieEpisodes,
  episodesByNumber,
} from '@/data/artieComics';

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function GET() {
  const episodes = episodesByNumber(artieEpisodes).reverse();
  const items = episodes
    .map((episode) => {
      const link = `${ARTIE_CANONICAL_URL}#${episode.slug}`;
      const description = episode.transcript ?? episode.altText;
      return `    <item>
      <title>${escapeXml(`Episode ${episode.episodeNumber}: ${episode.title}`)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(`${ARTIE_CANONICAL_URL}/${episode.slug}`)}</guid>
      <pubDate>${escapeXml(new Date(`${episode.publishDate}T12:00:00Z`).toUTCString())}</pubDate>
      <description>${escapeXml(description)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Artie</title>
    <link>${escapeXml(ARTIE_CANONICAL_URL)}</link>
    <description>${escapeXml(ARTIE_DESCRIPTION)}</description>
    <language>en-us</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
