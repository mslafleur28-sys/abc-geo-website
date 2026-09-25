export interface Episode {
  id: string;
  slug: string;
  title: string;
  episodeNumber: number;
  imageUrl: string;
  publishDate: string;
  altText: string;
  transcript?: string;
}

export const ARTIE_PATH = '/artie';
export const ARTIE_RSS_PATH = '/artie/feed.xml';
export const ARTIE_CANONICAL_URL = 'https://abcgeo.dev/artie';
export const ARTIE_NEWSLETTER_EMAIL = 'editorial@abcgeo.com';
export const ARTIE_PLACEHOLDER_IMAGE = '/artie/placeholder.svg';

export const ARTIE_TAGLINE = 'The weekly comic about AI in the workplace.';

export const ARTIE_DESCRIPTION =
  'Artie is the abcGEO studio comic. Read the latest strip, browse the episode archive, and meet Artie, Janet, Greg, and Dev.';

/** Highest episodeNumber is the latest strip. Append a new object to publish the next one. */
export const artieEpisodes: Episode[] = [
  {
    id: 'ep-01',
    slug: 'the-vague-question',
    title: 'The Vague Question',
    episodeNumber: 1,
    imageUrl: '/artie/episodes/the-vague-question.svg',
    publishDate: '2026-06-02',
    altText:
      'Artie sits at a laptop in the abcGEO studio and tells the screen, “Make us famous.” The reply on the display is a shrug.',
    transcript:
      'Artie leans over a laptop in the abcGEO studio and types, “Make us famous.” The screen answers with a shrug. Artie reads it twice and says, “That was not even a question.” The caption underneath the panel: vague prompts get vague answers.',
  },
  {
    id: 'ep-02',
    slug: 'answer-first',
    title: 'Answer First',
    episodeNumber: 2,
    imageUrl: '/artie/episodes/answer-first.svg',
    publishDate: '2026-06-16',
    altText:
      'Janet stands beside Artie with a red pen and a notepad that reads “Answer the question first.” Artie looks at a rewritten sentence on the laptop.',
    transcript:
      'Janet pulls a chair up to Artie’s desk and taps the screen with a red pen. “Answer the question first,” she says. “Decorate later.” She rewrites Artie’s prompt into one clear sentence: abcGEO publishes the Artie comic for people learning generative engine optimization. Artie nods. “That sounds like us.”',
  },
  {
    id: 'ep-03',
    slug: 'zero-citations',
    title: 'Zero Citations',
    episodeNumber: 3,
    imageUrl: '/artie/episodes/zero-citations.svg',
    publishDate: '2026-06-30',
    altText:
      'Greg holds up a chart labeled zero citations while Artie winces. A speech bubble from Greg says, “A vibe is not a citation.”',
    transcript:
      'Greg unrolls a chart across the table. Every bar sits on zero. “A vibe is not a citation,” he says. Artie asks whether the new sentence was clear enough. Greg taps the empty chart. “Clear enough to say. Not specific enough to quote. Name the thing. Name the action. Then we measure again.”',
  },
  {
    id: 'ep-04',
    slug: 'ship-the-snippet',
    title: 'Ship the Snippet',
    episodeNumber: 4,
    imageUrl: '/artie/episodes/ship-the-snippet.svg',
    publishDate: '2026-07-14',
    altText:
      'Dev holds up a phone showing a tiny answer-first snippet tool. Artie, Janet, and Greg look on. Dev says, “I shipped the snippet.”',
    transcript:
      'Dev walks in with a phone and a mint hoodie, headphones still on. The screen shows a tiny tool: one question in, one quotable sentence out. “I shipped the snippet,” Dev says. “We can argue about the font tomorrow.” Janet smiles. Greg asks for the event log. Artie is already typing a better question.',
  },
  {
    id: 'ep-05',
    slug: 'coffee-and-citations',
    title: 'Coffee and Citations',
    episodeNumber: 5,
    imageUrl: '/artie/episodes/coffee-and-citations.svg',
    publishDate: '2026-07-28',
    altText:
      'Artie, Janet, Greg, and Dev sit around a café table with four cups. A notebook in the center is labeled “who said what.”',
    transcript:
      'The four of them take a table by the window. Four cups, one notebook titled “who said what.” Janet wants every claim attributed. Greg wants the date. Dev wants the link. Artie wants the joke to survive the edit. They compromise: the joke stays, and the sentence under it names abcGEO, the comic, and the people who make it.',
  },
  {
    id: 'ep-06',
    slug: 'they-quoted-us',
    title: 'They Quoted Us',
    episodeNumber: 6,
    imageUrl: '/artie/episodes/they-quoted-us.svg',
    publishDate: '2026-08-11',
    altText:
      'Artie holds a card that reads “They quoted us” while Janet, Greg, and Dev cheer. A citation snippet on the wall names the Artie comic.',
    transcript:
      'Artie pins a card to the studio wall: “They quoted us.” The snippet names Artie, the comic, and abcGEO in one sentence. Janet checks the wording. Greg checks the source. Dev refreshes the log and grins. Artie says, “If the engine can quote us, we finally said it.”',
  },
];

export function episodesByNumber(episodes: Episode[]): Episode[] {
  return [...episodes].sort((a, b) => a.episodeNumber - b.episodeNumber);
}

export function latestEpisode(episodes: Episode[]): Episode | undefined {
  return episodesByNumber(episodes).at(-1);
}

export function formatEpisodeDate(publishDate: string): string {
  const date = new Date(`${publishDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return publishDate;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
