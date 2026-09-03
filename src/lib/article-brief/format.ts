import {
  SITE_STYLING_GUIDELINES,
  SITE_WRITING_GUIDELINES,
  guidelinesAsMarkdown,
} from './guidelines';
import {
  STYLISTIC_OVERRIDE_OPTIONS,
  normalizeBrief,
  type ArticleBriefInput,
  type StylisticOverrideId,
} from './schema';

function overrideLabels(ids: StylisticOverrideId[]): string[] {
  return ids.map((id) => {
    const opt = STYLISTIC_OVERRIDE_OPTIONS.find((o) => o.id === id);
    return opt ? opt.label : id;
  });
}

function yamlEscape(value: string): string {
  if (/[:#\n"'{}[\],&*?|>!%@`]/.test(value) || value !== value.trim()) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

function yamlBlock(value: string, indent = 2): string {
  const pad = ' '.repeat(indent);
  return value
    .split('\n')
    .map((line) => `${pad}${line}`)
    .join('\n');
}

/** Structured JSON payload combining user input + site defaults. */
export function buildJsonPayload(input: ArticleBriefInput) {
  const brief = normalizeBrief(input);
  return {
    type: 'abcgeo.article_brief',
    version: 1,
    generatedAt: new Date().toISOString(),
    brief: {
      ...brief,
      outputFile: `blog/${brief.slug}.html`,
      canonicalUrl: `${SITE_WRITING_GUIDELINES.siteUrl}/blog/${brief.slug}.html`,
      stylisticOverrideLabels: overrideLabels(brief.stylisticOverrides),
    },
    writingGuidelines: SITE_WRITING_GUIDELINES,
    stylingGuidelines: SITE_STYLING_GUIDELINES,
  };
}

/** Frontmatter Markdown draft for content/drafts/{slug}.md */
export function buildFrontmatterMarkdown(
  input: ArticleBriefInput,
  meta?: {
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    title?: string;
  },
): string {
  const brief = normalizeBrief(input);
  const title =
    meta?.title?.trim() ||
    brief.targetQuestion.replace(/\?$/, '') ||
    brief.slug.replace(/-/g, ' ');
  const description = brief.answerFirstSummary.slice(0, 160);
  const status = meta?.status ?? 'draft';
  const createdAt = meta?.createdAt;
  const updatedAt = meta?.updatedAt;

  const defsYaml =
    brief.keyDefinitions.length === 0
      ? '  []'
      : brief.keyDefinitions
          .map(
            (d) =>
              `  - term: ${yamlEscape(d.term)}\n    definition: ${yamlEscape(d.definition)}`,
          )
          .join('\n');

  const overridesYaml =
    brief.stylisticOverrides.length === 0
      ? '  []'
      : brief.stylisticOverrides.map((id) => `  - ${id}`).join('\n');

  const notes = brief.stylisticNotes
    ? `\nstylisticNotes: |\n${yamlBlock(brief.stylisticNotes)}`
    : '';

  const timestamps = [
    createdAt ? `createdAt: ${createdAt}` : '',
    updatedAt ? `updatedAt: ${updatedAt}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `---
title: ${yamlEscape(title)}
slug: ${brief.slug}
status: ${status}
template: ${SITE_STYLING_GUIDELINES.preferredTemplate}
outputFile: blog/${brief.slug}.html
canonical: ${SITE_WRITING_GUIDELINES.siteUrl}/blog/${brief.slug}.html
author: ${SITE_WRITING_GUIDELINES.author.name}
targetQuestion: ${yamlEscape(brief.targetQuestion)}
description: ${yamlEscape(description)}
answerFirstSummary: |
${yamlBlock(brief.answerFirstSummary)}
rawBody: |
${yamlBlock(brief.rawBody)}
stylisticOverrides:
${overridesYaml}
keyDefinitions:
${defsYaml}${notes}${timestamps ? `\n${timestamps}` : ''}
---

# ${title}

## Target question

${brief.targetQuestion}

## Answer-first summary

${brief.answerFirstSummary}

## Raw body

${brief.rawBody}

${
  brief.keyDefinitions.length
    ? `## Key definitions\n\n${brief.keyDefinitions
        .map((d) => `- **${d.term}** — ${d.definition}`)
        .join('\n')}\n`
    : ''
}
${
  brief.stylisticNotes
    ? `## Stylistic notes\n\n${brief.stylisticNotes}\n`
    : ''
}
${guidelinesAsMarkdown()}
`;
}

/** Fully contextualized prompt ready to paste into Cursor Agent mode. */
export function buildAgentPrompt(input: ArticleBriefInput): string {
  const brief = normalizeBrief(input);
  const overrides = overrideLabels(brief.stylisticOverrides);
  const defs =
    brief.keyDefinitions.length === 0
      ? '(none provided)'
      : brief.keyDefinitions
          .map((d) => `- **${d.term}**: ${d.definition}`)
          .join('\n');

  return `You are working in the abcGEO site repo (https://abcgeo.dev/).

## Task
Draft and publish a new blog article as a static HTML file using our existing editorial system.

**Output file:** \`blog/${brief.slug}.html\`
**Canonical URL:** \`https://abcgeo.dev/blog/${brief.slug}.html\`
**Primary template to mirror:** \`${SITE_STYLING_GUIDELINES.preferredTemplate}\`
**Author:** ${SITE_WRITING_GUIDELINES.author.name} (${SITE_WRITING_GUIDELINES.author.url})

## Brief

### Target question (use as the core H2/H3 the article answers)
${brief.targetQuestion}

### Answer-first summary (place in the Executive Answer / AI Quick Summary box; expand only if needed for 40–60 extractable words)
${brief.answerFirstSummary}

### Raw body content (shape into polished sections; preserve intent and facts)
${brief.rawBody}

### Key definitions (append as a closing “Key definitions” section)
${defs}

### Stylistic overrides (implement these layout treatments)
${overrides.length ? overrides.map((l) => `- ${l}`).join('\n') : '- (none — use template defaults)'}

### Additional layout / visual notes
${brief.stylisticNotes || '(none)'}

${guidelinesAsMarkdown()}

## Implementation requirements
1. Produce complete, valid HTML for \`blog/${brief.slug}.html\` matching the visual language of recent Tailwind blog posts (cream background, remapped slate palette, Syne/DM Sans via the same CDN Tailwind config pattern used in the template).
2. Include reading progress (if requested), sticky nav, executive answer box with the target question, A+B=GEO equation strip when requested, article body with clear H2s, author sidebar, and footer.
3. Add JSON-LD (\`Article\` or \`TechArticle\`, \`BreadcrumbList\`, and \`FAQPage\` when FAQ schema is requested).
4. Wire meta: title, description, canonical, Open Graph, Twitter, theme-color \`#FF6B4A\`, favicon paths relative to \`../\`.
5. After the HTML draft is solid, update \`blog.html\` (new post card), \`sitemap.xml\`, and \`llms.txt\` when this post should appear in the editorial index.
6. Do not invent unverifiable statistics. Prefer the facts in the brief; mark any placeholder claims clearly if you must leave a gap.
7. Keep GEO terminology correct: Generative Engine Optimization, formula A + B = GEO.

Start by reading \`${SITE_STYLING_GUIDELINES.preferredTemplate}\` and one recent published post in \`blog/\`, then write the new file.
`;
}

export function buildPayload(
  input: ArticleBriefInput,
  format: 'json' | 'frontmatter' | 'prompt',
): string {
  if (format === 'json') {
    return JSON.stringify(buildJsonPayload(input), null, 2);
  }
  if (format === 'frontmatter') {
    return buildFrontmatterMarkdown(input);
  }
  return buildAgentPrompt(input);
}
