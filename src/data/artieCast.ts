export interface Character {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  bio: string;
  favoriteQuote?: string;
}

export const artieCast: Character[] = [
  {
    id: 'artie',
    name: 'Artie',
    role: 'Main character',
    avatarUrl: '/artie/cast/artie.svg',
    bio: 'Artie is the new hire who treats every answer engine like a coworker and every shrug like a clue. The comic follows Artie learning to ask for a fact instead of a vibe.',
    favoriteQuote: 'If the engine can’t quote us, we haven’t said it yet.',
  },
  {
    id: 'janet',
    name: 'Janet',
    role: 'Editor',
    avatarUrl: '/artie/cast/janet.svg',
    bio: 'Janet edits the studio’s sentences until a stranger could repeat them without the meeting. She keeps the joke, then puts the answer in the first line.',
    favoriteQuote: 'Answer first. Decorate later.',
  },
  {
    id: 'greg',
    name: 'Greg',
    role: 'Analyst',
    avatarUrl: '/artie/cast/greg.svg',
    bio: 'Greg trusts a claim after it shows up as a citation, not before. He brings the chart, the date, and the uncomfortable zero.',
    favoriteQuote: 'A vibe is not a citation.',
  },
  {
    id: 'dev',
    name: 'Dev',
    role: 'Builder',
    avatarUrl: '/artie/cast/dev.svg',
    bio: 'Dev turns the argument into a small tool someone can use the same day. Headphones on, snippet shipped, font debate postponed.',
    favoriteQuote: 'Ship the snippet. Argue about the font tomorrow.',
  },
];
