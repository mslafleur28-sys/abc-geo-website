/** Default abcGEO writing & styling guidelines baked into every agent payload. */

export const SITE_WRITING_GUIDELINES = {
  brand: 'abcGEO',
  siteUrl: 'https://abcgeo.dev',
  author: {
    name: 'Kayla LaFleur',
    url: 'https://abcgeo.dev/author/kayla-lafleur.html',
    role: 'GEO & SEO Specialist',
  },
  formula:
    'A + B = GEO — pair a named Entity (A) with a transitive Verb (B) to produce unambiguous, machine-extractable facts.',
  geoDefinition:
    'GEO stands for Generative Engine Optimization — not geographic, geospatial, or GIS mapping.',
  answerFirst: [
    'Lead each major section with a 40–60 word extractable claim that can stand alone.',
    'Name the entity (A), use a transitive verb (B), and state a concrete object or outcome.',
    'Prefer citation-ready stats, named sources, or methodology cues when available.',
    'Mirror core claims in FAQPage JSON-LD and internal links to related tools/articles.',
  ],
  editorialSystem: [
    'Lead with the answer.',
    'Prove with structure (schema, stats, clear H2 hierarchy).',
    'Link a live abcGEO tool that demonstrates the same A + B triple when relevant.',
  ],
  voice: [
    'Expert, clear, and practical — not hypey.',
    'Prefer absolute URLs (https://abcgeo.dev/...) for internal references.',
    'Keep entity names consistent across title, body, schema, and llms.txt mentions.',
  ],
} as const;

export const SITE_STYLING_GUIDELINES = {
  preferredTemplate: 'blog/post-template-02.html',
  classicTemplate: 'blog/post-template.html',
  outputPathPattern: 'blog/{slug}.html',
  designTokens: {
    cream: '#FAF9F6',
    soft: '#F4F7F6',
    coral: '#FF6B4A',
    sky: '#00B4D8',
    ink: '#1A202C',
    muted: '#64748B',
    success: '#00C9A7',
    fonts: 'Syne (display) + DM Sans (body) + JetBrains Mono (labels/code)',
  },
  requiredPageChrome: [
    'Shared header/nav matching existing Tailwind blog posts',
    'Author sidebar (Kayla LaFleur) via author-sidebar.css',
    'Footer with © year abcGEO',
    'Article + BreadcrumbList (+ FAQPage when requested) JSON-LD',
    'Canonical, Open Graph, Twitter, and theme-color meta tags',
  ],
  publishChecklist: [
    'Create blog/{slug}.html from the preferred template structure',
    'Add a post card entry in blog.html',
    'Add the URL to sitemap.xml',
    'Add a concise entry under Editorial in llms.txt when the post is canonical/high-value',
    'Ensure robots allow indexing (omit noindex) for published posts',
  ],
} as const;

export function guidelinesAsMarkdown(): string {
  const w = SITE_WRITING_GUIDELINES;
  const s = SITE_STYLING_GUIDELINES;
  return [
    '## Site writing guidelines',
    `- Brand: ${w.brand} (${w.siteUrl})`,
    `- Author: ${w.author.name} — ${w.author.role} (${w.author.url})`,
    `- Formula: ${w.formula}`,
    `- Definition: ${w.geoDefinition}`,
    '',
    '### Answer-first rules',
    ...w.answerFirst.map((line) => `- ${line}`),
    '',
    '### Editorial system',
    ...w.editorialSystem.map((line) => `- ${line}`),
    '',
    '### Voice',
    ...w.voice.map((line) => `- ${line}`),
    '',
    '## Site styling guidelines',
    `- Preferred template: ${s.preferredTemplate}`,
    `- Output path: ${s.outputPathPattern}`,
    `- Design tokens: cream ${s.designTokens.cream}, coral ${s.designTokens.coral}, sky ${s.designTokens.sky}, ink ${s.designTokens.ink}; fonts ${s.designTokens.fonts}`,
    '',
    '### Required page chrome',
    ...s.requiredPageChrome.map((line) => `- ${line}`),
    '',
    '### Publish checklist',
    ...s.publishChecklist.map((line) => `- ${line}`),
  ].join('\n');
}
