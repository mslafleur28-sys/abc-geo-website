/** Article brief schema for the internal content-submission workflow. */

export const STYLISTIC_OVERRIDE_OPTIONS = [
  {
    id: 'executive_answer_box',
    label: 'Executive Answer / AI Quick Summary box',
    description: 'Hero answer block under the title (post-template-02 style).',
  },
  {
    id: 'ab_equation_strip',
    label: 'A + B = GEO equation strip',
    description: 'Mono formula chip under the executive answer.',
  },
  {
    id: 'answer_first_per_h2',
    label: 'Answer-first blocks',
    description:
      'Use the Answer-first toolbox button to place a 40–60 word claim under any section.',
  },
  {
    id: 'key_takeaways',
    label: 'Key takeaways lists',
    description:
      'Use the Takeaways toolbox button to place a takeaways panel anywhere in a section.',
  },
  {
    id: 'comparison_table',
    label: 'Comparison / data table',
    description:
      'Use the Table toolbox button to place a comparison or data table anywhere in a section.',
  },
  {
    id: 'callout_blocks',
    label: 'Callout / accent blocks',
    description:
      'Use the Callout toolbox button to place bordered tips, pitfalls, or emphasis blocks.',
  },
  {
    id: 'tool_embed_banner',
    label: 'Interactive tool embed banner',
    description: 'CTA strip linking a related abcGEO tool.',
  },
  {
    id: 'code_jsonld_example',
    label: 'Code / JSON-LD example',
    description: 'Monospace schema or config sample block.',
  },
  {
    id: 'faq_schema',
    label: 'FAQPage JSON-LD',
    description: 'FAQ entities mirrored from H2 questions.',
  },
  {
    id: 'toc_sidebar',
    label: 'On-this-page TOC',
    description: 'Sticky section nav alongside the article body.',
  },
  {
    id: 'reading_progress',
    label: 'Reading progress bar',
    description: 'Top gradient progress indicator.',
  },
] as const;

export type StylisticOverrideId =
  (typeof STYLISTIC_OVERRIDE_OPTIONS)[number]['id'];

export interface KeyDefinition {
  term: string;
  definition: string;
}

export interface ArticleBriefInput {
  /** Target file name without extension, e.g. what-is-generative-engine-optimization */
  slug: string;
  /** Core H2/H3 question the article answers */
  targetQuestion: string;
  /** Explicit answer-first summary (few sentences) */
  answerFirstSummary: string;
  /** Raw draft body / notes for the agent to shape */
  rawBody: string;
  /** Definitions appended at the end of the article */
  keyDefinitions: KeyDefinition[];
  /** Layout / visual treatment flags */
  stylisticOverrides: StylisticOverrideId[];
  /** Freeform notes for tables, callouts, accents, etc. */
  stylisticNotes: string;
}

export const DRAFT_STATUSES = [
  'draft',
  'ready_for_agent',
  'published',
] as const;

export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export const DRAFT_STATUS_LABELS: Record<DraftStatus, string> = {
  draft: 'Draft',
  ready_for_agent: 'Ready for Agent',
  published: 'Published',
};

export function isDraftStatus(value: unknown): value is DraftStatus {
  return (
    typeof value === 'string' &&
    (DRAFT_STATUSES as readonly string[]).includes(value)
  );
}

/** Full draft record persisted under content/drafts or content/published. */
export interface ArticleDraftRecord {
  brief: ArticleBriefInput;
  title: string;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
  filename: string;
  format: 'markdown' | 'json';
  relativePath: string;
}

export type PayloadFormat = 'json' | 'frontmatter' | 'prompt';

export const DEFAULT_STYLISTIC_OVERRIDES: StylisticOverrideId[] = [
  'executive_answer_box',
  'ab_equation_strip',
  'answer_first_per_h2',
  'faq_schema',
  'toc_sidebar',
  'reading_progress',
];

export const EMPTY_ARTICLE_BRIEF: ArticleBriefInput = {
  slug: '',
  targetQuestion: '',
  answerFirstSummary: '',
  rawBody: '',
  keyDefinitions: [{ term: '', definition: '' }],
  stylisticOverrides: [...DEFAULT_STYLISTIC_OVERRIDES],
  stylisticNotes: '',
};

export function slugifyFilename(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.html?$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3;
}

export function normalizeBrief(input: ArticleBriefInput): ArticleBriefInput {
  return {
    slug: slugifyFilename(input.slug),
    targetQuestion: input.targetQuestion.trim(),
    answerFirstSummary: input.answerFirstSummary.trim(),
    rawBody: input.rawBody.trim(),
    keyDefinitions: input.keyDefinitions
      .map((d) => ({
        term: d.term.trim(),
        definition: d.definition.trim(),
      }))
      .filter((d) => d.term && d.definition),
    stylisticOverrides: [...new Set(input.stylisticOverrides)],
    stylisticNotes: input.stylisticNotes.trim(),
  };
}

export interface BriefValidation {
  ok: boolean;
  errors: Partial<Record<keyof ArticleBriefInput, string>>;
}

export function validateBrief(input: ArticleBriefInput): BriefValidation {
  const errors: BriefValidation['errors'] = {};
  const slug = slugifyFilename(input.slug);

  if (!slug || !isValidSlug(slug)) {
    errors.slug =
      'Use a kebab-case slug (letters, numbers, hyphens), at least 3 characters.';
  }
  if (!input.targetQuestion.trim()) {
    errors.targetQuestion = 'Add the H2/H3 question this article answers.';
  }
  if (!input.answerFirstSummary.trim()) {
    errors.answerFirstSummary =
      'Add a short answer-first summary that explicitly answers the question.';
  } else if (input.answerFirstSummary.trim().split(/\s+/).length < 20) {
    errors.answerFirstSummary =
      'Aim for roughly 40–60 words so engines can extract a full claim.';
  }
  if (!input.rawBody.trim() || input.rawBody.trim().length < 40) {
    errors.rawBody = 'Paste enough raw body content for the agent to shape.';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
