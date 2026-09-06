import { parseHTML } from 'linkedom';
import {
  DEFAULT_STYLISTIC_OVERRIDES,
  type ArticleBriefInput,
} from './schema';
import { importHtmlToDraftBody } from './html-to-draft';

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function textContent(el: Element | null | undefined): string {
  return decodeEntities((el?.textContent || '').replace(/\s+/g, ' ').trim());
}

function metaContent(doc: Document, name: string): string {
  const byName = doc.querySelector(`meta[name="${name}"]`);
  if (byName?.getAttribute('content')) {
    return decodeEntities(byName.getAttribute('content') || '');
  }
  const byProp = doc.querySelector(`meta[property="${name}"]`);
  return decodeEntities(byProp?.getAttribute('content') || '');
}

function stripSiteSuffix(title: string): string {
  return title
    .replace(/\s*\|\s*abcGEO.*$/i, '')
    .replace(/\s*\|\s*abcgeo\.dev.*$/i, '')
    .replace(/\s*[—–-]\s*abcGEO.*$/i, '')
    .trim();
}

function pickArticleRoot(doc: Document): Element | null {
  const preferred = [
    'article.content-area',
    'article.space-y-10',
    'main article',
    'article',
  ];
  for (const sel of preferred) {
    const el = doc.querySelector(sel);
    if (el && textContent(el).length > 200) return el;
  }
  const main = doc.querySelector('main');
  return main;
}

function removeChrome(root: Element) {
  const kill = [
    'header.site-header',
    'footer',
    'nav',
    'aside.author-sidebar',
    'aside.sticky-toc',
    '.sticky-toc',
    '[data-reading-progress]',
    'script',
    'style',
    '.fixed.top-0',
  ];
  for (const sel of kill) {
    root.querySelectorAll(sel).forEach((node) => node.remove());
  }
}

function extractAnswerSummary(root: Element, doc: Document): string {
  const selectors = [
    '.direct-answer-header p',
    '.key-takeaways-box.direct-answer-header p',
    '[class*="executive"] p',
    '.key-takeaways-box p',
  ];
  for (const sel of selectors) {
    const p = root.querySelector(sel);
    const t = textContent(p);
    if (t.split(/\s+/).length >= 20) return t;
  }
  // Studio-published executive box
  for (const p of Array.from(root.querySelectorAll('p'))) {
    const t = textContent(p);
    if (t.split(/\s+/).length >= 25 && t.split(/\s+/).length <= 120) {
      return t;
    }
  }
  const desc = metaContent(doc, 'description');
  if (desc.split(/\s+/).length >= 20) return desc;
  return desc || textContent(root.querySelector('p'));
}

function extractTargetQuestion(title: string, root: Element): string {
  if (/\?\s*$/.test(title)) return title;
  for (const h of Array.from(root.querySelectorAll('h2, h3'))) {
    const t = textContent(h);
    if (/\?\s*$/.test(t)) return t;
  }
  return `What is ${title.replace(/^(How to|Why|The)\s+/i, '').replace(/\?$/, '')}?`;
}

function extractIsoDate(doc: Document): string | undefined {
  const scripts = Array.from(
    doc.querySelectorAll('script[type="application/ld+json"]'),
  );
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        const published =
          node?.datePublished ||
          node?.dateCreated ||
          node?.dateModified;
        if (typeof published === 'string' && published.trim()) {
          return published.slice(0, 10);
        }
      }
    } catch {
      /* ignore bad JSON-LD */
    }
  }
  return undefined;
}

function prepareBodyHtml(root: Element): string {
  const clone = root.cloneNode(true) as Element;
  removeChrome(clone);

  // Drop page chrome headers that duplicate title / meta.
  clone.querySelectorAll('header.article-header').forEach((header) => {
    header.querySelectorAll('h1, .badge, .cluster-crumb, .meta-info').forEach((n) =>
      n.remove(),
    );
    // Keep direct-answer box as body content; label it for conversion.
    const answer = header.querySelector('.direct-answer-header, .key-takeaways-box');
    if (answer) {
      const label = answer.querySelector('h3');
      if (label) label.remove();
    }
  });

  // Remove leading H1 (title lives in frontmatter).
  const firstHeading = clone.querySelector('h1');
  if (firstHeading) firstHeading.remove();

  // Drop author/sidebar remnants and TOC that may live inside article.
  clone
    .querySelectorAll(
      '.author-sidebar, aside[aria-label="On this page"], #key-definitions',
    )
    .forEach((n) => n.remove());

  return clone.innerHTML;
}

export interface ImportedLivePost {
  slug: string;
  title: string;
  brief: ArticleBriefInput;
  createdAt?: string;
  canonical?: string;
}

/** Convert a live blog HTML page into an editable article brief. */
export function importLiveBlogHtml(
  html: string,
  slug: string,
): ImportedLivePost {
  const { document } = parseHTML(html);
  const doc = document as unknown as Document;
  const root = pickArticleRoot(doc);
  if (!root) {
    throw new Error(`Could not find article content for ${slug}`);
  }

  const title =
    stripSiteSuffix(metaContent(doc, 'og:title')) ||
    stripSiteSuffix(textContent(doc.querySelector('title'))) ||
    textContent(doc.querySelector('h1')) ||
    slug;

  const answerFirstSummary = extractAnswerSummary(root, doc);
  const targetQuestion = extractTargetQuestion(title, root);
  const bodyHtml = prepareBodyHtml(root);
  let rawBody = importHtmlToDraftBody(bodyHtml).trim();

  // Ensure validation minimum length if conversion was sparse.
  if (rawBody.length < 40) {
    rawBody = `## ${title}\n\n${answerFirstSummary}\n\n${rawBody}`.trim();
  }

  // Pad answer summary if short (validation wants ~20+ words).
  let summary = answerFirstSummary.trim();
  if (summary.split(/\s+/).filter(Boolean).length < 20) {
    const desc = metaContent(doc, 'description');
    summary = [summary, desc].filter(Boolean).join(' ').trim();
  }
  if (summary.split(/\s+/).filter(Boolean).length < 20) {
    summary = `${summary} This article explains ${title} in the context of Generative Engine Optimization and the A + B = GEO framework on abcGEO.`.trim();
  }

  const brief: ArticleBriefInput = {
    slug,
    targetQuestion,
    answerFirstSummary: summary,
    rawBody,
    keyDefinitions: [],
    stylisticOverrides: [...DEFAULT_STYLISTIC_OVERRIDES],
    stylisticNotes:
      'Imported from live blog HTML for in-studio editing. Review formatting before re-posting.',
  };

  return {
    slug,
    title,
    brief,
    createdAt: extractIsoDate(doc),
    canonical: metaContent(doc, 'og:url') || undefined,
  };
}

export const LIVE_BLOG_SKIP_SLUGS = new Set([
  'post-template-02',
]);
