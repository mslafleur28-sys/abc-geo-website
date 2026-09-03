import type { KeyDefinition } from './schema';

export function termAnchorId(term: string): string {
  const slug = term
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return `key-def-${slug || 'term'}`;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function termRegex(term: string): RegExp {
  const escaped = escapeRegExp(term.trim());
  const start = /^\w/.test(term.trim()) ? '\\b' : '';
  const end = /\w$/.test(term.trim()) ? '\\b' : '';
  // First match only — later repeats stay plain text.
  return new RegExp(`${start}${escaped}${end}`, 'i');
}

function termKey(term: string): string {
  return term.trim().toLowerCase();
}

type Chunk = { type: 'text' | 'html'; value: string };

function linkPlainText(
  text: string,
  definitions: KeyDefinition[],
  usedTerms: Set<string>,
): string {
  let parts: Chunk[] = [{ type: 'text', value: text }];

  const sorted = [...definitions]
    .filter((d) => d.term.trim() && d.definition.trim())
    .sort((a, b) => b.term.trim().length - a.term.trim().length);

  for (const def of sorted) {
    const key = termKey(def.term);
    if (usedTerms.has(key)) continue;

    const next: Chunk[] = [];
    const tip = escapeAttr(def.definition);
    const href = `#${termAnchorId(def.term)}`;
    let linked = false;

    for (const part of parts) {
      if (part.type === 'html' || linked) {
        next.push(part);
        continue;
      }

      const re = termRegex(def.term);
      const match = re.exec(part.value);
      if (!match || match.index == null) {
        next.push(part);
        continue;
      }

      if (match.index > 0) {
        next.push({
          type: 'text',
          value: part.value.slice(0, match.index),
        });
      }
      next.push({
        type: 'html',
        value: `<a href="${href}" class="key-term" data-tip="${tip}">${match[0]}</a>`,
      });
      const rest = part.value.slice(match.index + match[0].length);
      if (rest) next.push({ type: 'text', value: rest });
      linked = true;
      usedTerms.add(key);
    }
    parts = next;
  }

  return parts.map((p) => p.value).join('');
}

/**
 * Wrap glossary terms in HTML text nodes with hoverable, clickable key-term links.
 * Each term is linked only on its first appearance in document order.
 * Pass the same `usedTerms` Set across an article so later blocks skip repeats.
 * Skips existing tags (attributes/markup) so only visible text is linked.
 */
export function linkKeyTermsInHtml(
  html: string,
  definitions: KeyDefinition[],
  usedTerms: Set<string> = new Set(),
): string {
  if (!definitions.length || !html) return html;

  return html.replace(/(<[^>]+>)|([^<]+)/g, (full, tag?: string, text?: string) => {
    if (tag) return tag;
    if (!text) return full;
    return linkPlainText(text, definitions, usedTerms);
  });
}

/** Shared CSS for key-term hover tooltips (preview + published posts). */
export const KEY_TERM_CSS = `
.key-term {
  color: #00566b;
  border-bottom: 1px dotted rgba(0, 86, 107, 0.55);
  text-decoration: none;
  cursor: help;
  position: relative;
  transition: color 120ms ease, border-color 120ms ease;
}
.key-term:hover,
.key-term:focus-visible {
  color: #00b4d8;
  border-bottom-color: #00b4d8;
  outline: none;
}
.key-term::after {
  content: attr(data-tip);
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.45rem);
  transform: translateX(-50%) translateY(4px);
  width: max-content;
  max-width: min(22rem, 70vw);
  padding: 0.55rem 0.7rem;
  border-radius: 0.55rem;
  border: 1px solid rgba(26, 32, 44, 0.12);
  background: #1a202c;
  color: #faf9f6;
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.45;
  letter-spacing: 0;
  text-transform: none;
  white-space: normal;
  box-shadow: 0 12px 28px -14px rgba(26, 32, 44, 0.55);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 140ms ease, transform 140ms ease, visibility 140ms ease;
  z-index: 40;
}
.key-term::before {
  content: "";
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.2rem);
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #1a202c;
  opacity: 0;
  visibility: hidden;
  transition: opacity 140ms ease, visibility 140ms ease;
  z-index: 41;
}
.key-term:hover::after,
.key-term:focus-visible::after,
.key-term:hover::before,
.key-term:focus-visible::before {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}
`;
