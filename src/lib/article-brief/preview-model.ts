import type { ArticleBriefInput, KeyDefinition, StylisticOverrideId } from './schema';
import {
  isFenceClose,
  isPipeTableRow,
  isPipeTableSeparator,
  normalizeCalloutVariant,
  parseFenceOpen,
  parseAtAGlanceFence,
  parseFenceListItems,
  parsePipeTable,
  splitCalloutFenceLines,
  type CalloutVariant,
  type FenceKind,
} from './body-fences';
import { parseDraftImageMarkdown } from './image-paths';
import { linkKeyTermsInHtml } from './key-terms';
import { isTextAlign, renderRichInline, type TextAlign } from './rich-text';

export interface PreviewBlock {
  type:
    | 'paragraph'
    | 'list'
    | 'takeaways'
    | 'callout'
    | 'answer-first'
    | 'at-a-glance'
    | 'tldr'
    | 'table'
    | 'image'
    | 'pullquote';
  text?: string;
  title?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
  variant?: CalloutVariant;
  src?: string;
  alt?: string;
  caption?: string;
  align?: TextAlign;
}

export interface PreviewSection {
  id: string;
  level: 2 | 3;
  heading: string;
  align?: TextAlign;
  blocks: PreviewBlock[];
}

export interface ArticlePreviewModel {
  title: string;
  slug: string;
  targetQuestion: string;
  answerFirstSummary: string;
  deck: string;
  readMinutes: number;
  updatedLabel: string;
  sections: PreviewSection[];
  keyDefinitions: { term: string; definition: string }[];
  stylisticNotes: string;
  overrides: Set<StylisticOverrideId>;
}

function slugifyHeading(value: string, index: number): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || `section-${index + 1}`;
}

function estimateReadMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function formatUpdatedLabel(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      year: 'numeric',
    }).format(new Date());
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** Very small markdown-ish parser for draft body preview. */
export function parseBodySections(rawBody: string): PreviewSection[] {
  const lines = rawBody.replace(/\r\n/g, '\n').split('\n');
  const sections: PreviewSection[] = [];
  let current: PreviewSection | null = null;
  let paraBuf: string[] = [];
  let listBuf: string[] = [];
  let quoteBuf: string[] = [];
  let fenceKind: FenceKind | null = null;
  let fenceVariant = '';
  let fenceLines: string[] = [];
  let tableBuf: string[] = [];

  function ensureSection(): PreviewSection {
    if (!current) {
      current = {
        id: 'intro',
        level: 2,
        heading: 'Introduction',
        blocks: [],
      };
      sections.push(current);
    }
    return current;
  }

  function flushParagraph() {
    if (!paraBuf.length) return;
    const text = paraBuf.join(' ').trim();
    paraBuf = [];
    if (!text) return;
    ensureSection().blocks.push({ type: 'paragraph', text });
  }

  function flushList() {
    if (!listBuf.length) return;
    ensureSection().blocks.push({ type: 'list', items: [...listBuf] });
    listBuf = [];
  }

  function flushQuote() {
    if (!quoteBuf.length) return;
    const text = quoteBuf.join(' ').trim();
    quoteBuf = [];
    if (!text) return;
    ensureSection().blocks.push({ type: 'pullquote', text });
  }

  function flushTableBuf() {
    if (!tableBuf.length) return;
    const parsed = parsePipeTable(tableBuf);
    tableBuf = [];
    if (!parsed) return;
    ensureSection().blocks.push({
      type: 'table',
      headers: parsed.headers,
      rows: parsed.rows,
    });
  }

  function flushFence() {
    if (!fenceKind) return;
    const kind = fenceKind;
    const variant = fenceVariant;
    const buf = [...fenceLines];
    fenceKind = null;
    fenceVariant = '';
    fenceLines = [];

    if (kind === 'takeaways') {
      const items = parseFenceListItems(buf);
      if (items.length) {
        ensureSection().blocks.push({ type: 'takeaways', items });
      }
      return;
    }

    if (kind === 'at-a-glance') {
      const parsed = parseAtAGlanceFence(buf);
      if (parsed.items.length) {
        ensureSection().blocks.push({
          type: 'at-a-glance',
          title: parsed.title,
          items: parsed.items,
        });
      }
      return;
    }

    if (kind === 'answer-first') {
      const text = buf.join(' ').replace(/\s+/g, ' ').trim();
      if (text) {
        ensureSection().blocks.push({ type: 'answer-first', text });
      }
      return;
    }

    if (kind === 'tldr') {
      const text = buf.join(' ').replace(/\s+/g, ' ').trim();
      if (text) {
        ensureSection().blocks.push({ type: 'tldr', text });
      }
      return;
    }

    if (kind === 'callout') {
      const split = splitCalloutFenceLines(buf);
      const text = split.text.trim();
      const title = split.title.trim();
      if (!text && !title) return;
      ensureSection().blocks.push({
        type: 'callout',
        title: title || undefined,
        text: text || title,
        variant: normalizeCalloutVariant(variant || split.variantHint),
      });
      return;
    }

    if (kind === 'table') {
      const parsed = parsePipeTable(buf);
      if (parsed) {
        ensureSection().blocks.push({
          type: 'table',
          headers: parsed.headers,
          rows: parsed.rows,
        });
      }
    }
  }

  function flushAll() {
    flushParagraph();
    flushList();
    flushQuote();
    flushTableBuf();
    flushFence();
  }

  for (const line of lines) {
    if (fenceKind) {
      const nextOpen = parseFenceOpen(line);
      if (isFenceClose(line)) {
        flushFence();
        continue;
      }
      if (nextOpen) {
        flushFence();
        flushParagraph();
        flushList();
        flushQuote();
        flushTableBuf();
        fenceKind = nextOpen.kind;
        fenceVariant = nextOpen.variant;
        fenceLines = [];
        continue;
      }
      fenceLines.push(line);
      continue;
    }

    const fenceOpen = parseFenceOpen(line);
    if (fenceOpen) {
      flushParagraph();
      flushList();
      flushQuote();
      flushTableBuf();
      fenceKind = fenceOpen.kind;
      fenceVariant = fenceOpen.variant;
      fenceLines = [];
      continue;
    }

    if (isPipeTableRow(line) || isPipeTableSeparator(line)) {
      flushParagraph();
      flushList();
      flushQuote();
      tableBuf.push(line);
      continue;
    }

    if (tableBuf.length) {
      flushTableBuf();
    }

    const alignedHtml = line.match(
      /^<(p|h2|h3|blockquote)\s+([^>]*)>([\s\S]*)<\/\1>\s*$/i,
    );
    if (alignedHtml) {
      const attrAlign = alignedHtml[2].match(
        /data-align="(left|center|right)"/i,
      )?.[1];
      const styleAlign = alignedHtml[2].match(
        /text-align\s*:\s*(left|center|right)/i,
      )?.[1];
      const alignRaw = (attrAlign || styleAlign || 'left').toLowerCase();
      const align: TextAlign = isTextAlign(alignRaw) ? alignRaw : 'left';
      const tag = alignedHtml[1].toLowerCase();
      const inner = alignedHtml[3].trim();
      flushAll();
      if (tag === 'h2' || tag === 'h3') {
        const level = tag === 'h2' ? 2 : 3;
        current = {
          id: slugifyHeading(inner.replace(/<[^>]+>/g, ''), sections.length),
          level,
          heading: inner.replace(/<[^>]+>/g, '').trim() || 'Section',
          align: align === 'left' ? undefined : align,
          blocks: [],
        };
        sections.push(current);
        continue;
      }
      if (tag === 'blockquote') {
        ensureSection().blocks.push({
          type: 'pullquote',
          text: inner,
          align: align === 'left' ? undefined : align,
        });
        continue;
      }
      ensureSection().blocks.push({
        type: 'paragraph',
        text: inner,
        align: align === 'left' ? undefined : align,
      });
      continue;
    }

    const heading = line.match(/^(#{2,3})\s+(.+)\s*$/);
    if (heading) {
      flushAll();
      const level = heading[1].length === 2 ? 2 : 3;
      const headingText = heading[2].trim();
      current = {
        id: slugifyHeading(headingText, sections.length),
        level,
        heading: headingText,
        blocks: [],
      };
      sections.push(current);
      continue;
    }

    const pullquote = line.match(/^>\s?(.*)$/);
    if (pullquote) {
      flushParagraph();
      flushList();
      flushTableBuf();
      quoteBuf.push(pullquote[1].trim());
      continue;
    }

    const listItem = line.match(/^\s*[-*]\s+(.+)\s*$/);
    if (listItem) {
      flushParagraph();
      flushQuote();
      flushTableBuf();
      listBuf.push(listItem[1].trim());
      continue;
    }

    const image = parseDraftImageMarkdown(line);
    if (image) {
      flushAll();
      ensureSection().blocks.push({
        type: 'image',
        alt: image.alt,
        caption: image.caption || undefined,
        src: image.src,
      });
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    flushList();
    flushQuote();
    flushTableBuf();
    paraBuf.push(line.trim());
  }

  flushAll();
  return sections;
}

export function buildPreviewModel(
  brief: ArticleBriefInput,
  options?: { title?: string; updatedAt?: string },
): ArticlePreviewModel {
  const title =
    options?.title?.trim() ||
    brief.targetQuestion.replace(/\?$/, '').trim() ||
    brief.slug.replace(/-/g, ' ');
  const sections = parseBodySections(brief.rawBody);
  const wordSource = [
    title,
    brief.targetQuestion,
    brief.answerFirstSummary,
    brief.rawBody,
    ...brief.keyDefinitions.map((d) => `${d.term} ${d.definition}`),
  ].join(' ');

  return {
    title,
    slug: brief.slug,
    targetQuestion: brief.targetQuestion,
    answerFirstSummary: brief.answerFirstSummary,
    deck:
      brief.answerFirstSummary.split(/(?<=\.)\s+/)[0]?.trim() ||
      brief.answerFirstSummary.slice(0, 160),
    readMinutes: estimateReadMinutes(wordSource),
    updatedLabel: formatUpdatedLabel(options?.updatedAt),
    sections,
    keyDefinitions: brief.keyDefinitions.filter((d) => d.term && d.definition),
    stylisticNotes: brief.stylisticNotes.trim(),
    overrides: new Set(brief.stylisticOverrides),
  };
}

/** Render inline markdown / brand markup for preview, optionally linking key terms. */
export function renderInlineMarkup(
  text: string,
  definitions: KeyDefinition[] = [],
  usedTerms?: Set<string>,
): string {
  return linkKeyTermsInHtml(
    renderRichInline(text, 'preview'),
    definitions,
    usedTerms,
  );
}
