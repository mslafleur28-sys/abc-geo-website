import {
  isFenceClose,
  isPipeTableRow,
  isPipeTableSeparator,
  normalizeCalloutVariant,
  parseFenceOpen,
  parseAtAGlanceFence,
  parseFenceListItems,
  parsePipeTable,
  serializePipeTable,
  splitCalloutFenceLines,
  type FenceKind,
} from './body-fences';
import {
  parseDraftImageMarkdown,
  serializeDraftImageMarkdown,
  toPreviewImageSrc,
} from './image-paths';
import {
  BRAND_COLORS,
  BRAND_FONTS,
  TEXT_SIZES,
  isBrandColorId,
  isBrandFontId,
  isTextAlign,
  isTextSizeId,
  readTextAlign,
  renderRichInline,
  type TextAlign,
} from './rich-text';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function alignStyleAttr(align: TextAlign): string {
  if (align === 'left') return '';
  return ` data-align="${align}" style="text-align:${align}"`;
}

function parseAlignedHtmlLine(
  line: string,
): { tag: 'p' | 'h2' | 'h3' | 'blockquote'; align: TextAlign; inner: string } | null {
  const match = line.match(
    /^<(p|h2|h3|blockquote)\s+([^>]*)>([\s\S]*)<\/\1>\s*$/i,
  );
  if (!match) return null;
  const attrAlign = match[2].match(/data-align="(left|center|right)"/i)?.[1];
  const styleAlign = match[2].match(
    /text-align\s*:\s*(left|center|right)/i,
  )?.[1];
  const alignRaw = (attrAlign || styleAlign || 'left').toLowerCase();
  if (!isTextAlign(alignRaw)) return null;
  const tag = match[1].toLowerCase() as 'p' | 'h2' | 'h3' | 'blockquote';
  if (alignRaw === 'left' && tag !== 'blockquote') return null;
  return { tag, align: alignRaw, inner: match[3] };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function editorTakeawaysHtml(items: string[]): string {
  const list = items.length ? items : ['Add your first takeaway'];
  return `<aside class="draft-takeaways" data-takeaways="1"><p class="draft-takeaways__label" contenteditable="false">Key takeaways</p><ul>${list
    .map((item) => `<li>${renderRichInline(item, 'editor')}</li>`)
    .join('')}</ul></aside>`;
}

function editorAtAGlanceHtml(title: string, items: string[]): string {
  const heading = (title || 'At a glance').trim() || 'At a glance';
  const list = items.length ? items : ['Add your first glance point'];
  const headingAttr = escapeHtml(heading);
  return `<aside class="draft-at-a-glance" data-at-a-glance="1" data-glance-heading="${headingAttr}"><p class="draft-at-a-glance__label">${renderRichInline(heading, 'editor')}</p><ul>${list
    .map((item) => `<li>${renderRichInline(item, 'editor')}</li>`)
    .join('')}</ul></aside>`;
}

function editorTldrHtml(text: string): string {
  return `<aside class="draft-tldr" data-tldr="1"><p class="draft-tldr__label" contenteditable="false">TL;DR</p><p>${renderRichInline(text || 'Write a short TL;DR summary here.', 'editor')}</p></aside>`;
}

function editorAnswerFirstHtml(text: string): string {
  return `<aside class="draft-answer-first" data-answer-first="1"><p class="draft-answer-first__label" contenteditable="false">Answer-first</p><p>${renderRichInline(text || 'Write a 40–60 word extractable claim here.', 'editor')}</p></aside>`;
}

function editorCalloutHtml(
  title: string,
  text: string,
  variantRaw?: string,
): string {
  const variant = normalizeCalloutVariant(variantRaw);
  const titleHtml = renderRichInline(title || 'Callout title', 'editor');
  const bodyHtml = renderRichInline(
    text || 'Callout body — tip, warning, or emphasis.',
    'editor',
  );
  return `<aside class="draft-callout draft-callout--${variant}" data-callout="1" data-variant="${variant}"><p class="draft-callout__label" contenteditable="false">Callout · ${variant}</p><p class="draft-callout__title">${titleHtml}</p><p>${bodyHtml}</p></aside>`;
}

function editorTableHtml(headers: string[], rows: string[][]): string {
  const cols = Math.max(headers.length, 3);
  const head = [...headers];
  while (head.length < cols) head.push(`Column ${String.fromCharCode(65 + head.length)}`);
  const body =
    rows.length > 0
      ? rows
      : [
          head.map(() => '…'),
          head.map(() => '…'),
        ];
  const thead = `<thead><tr>${head
    .map((h) => `<th>${renderRichInline(h, 'editor')}</th>`)
    .join('')}</tr></thead>`;
  const tbody = `<tbody>${body
    .map((row) => {
      const cells = [...row];
      while (cells.length < head.length) cells.push('');
      return `<tr>${cells
        .slice(0, head.length)
        .map((c) => `<td>${renderRichInline(c || '…', 'editor')}</td>`)
        .join('')}</tr>`;
    })
    .join('')}</tbody>`;
  return `<div class="draft-table-wrap" data-draft-table="1"><table>${thead}${tbody}</table></div>`;
}

/** Convert stored draft markup into visual HTML for the contenteditable surface. */
export function markdownToEditorHtml(source: string): string {
  const text = source.replace(/\r\n/g, '\n');
  if (!text.trim()) {
    return '<p><br></p>';
  }

  const lines = text.split('\n');
  const parts: string[] = [];
  let listItems: string[] = [];
  let quoteLines: string[] = [];
  let fenceKind: FenceKind | null = null;
  let fenceVariant = '';
  let fenceLines: string[] = [];
  let tableBuf: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    parts.push(
      `<ul>${listItems.map((item) => `<li>${item}</li>`).join('')}</ul>`,
    );
    listItems = [];
  };

  const flushQuote = () => {
    if (!quoteLines.length) return;
    const inner = quoteLines.map((line) => renderRichInline(line, 'editor')).join(' ');
    parts.push(
      `<blockquote class="draft-pullquote" data-pullquote="1">${inner || 'Pull quote'}</blockquote>`,
    );
    quoteLines = [];
  };

  const flushTableBuf = () => {
    if (!tableBuf.length) return;
    const parsed = parsePipeTable(tableBuf);
    tableBuf = [];
    if (!parsed) return;
    parts.push(editorTableHtml(parsed.headers, parsed.rows));
  };

  const flushFence = () => {
    if (!fenceKind) return;
    const kind = fenceKind;
    const variant = fenceVariant;
    const buf = [...fenceLines];
    fenceKind = null;
    fenceVariant = '';
    fenceLines = [];

    if (kind === 'takeaways') {
      parts.push(editorTakeawaysHtml(parseFenceListItems(buf)));
      return;
    }

    if (kind === 'at-a-glance') {
      const parsed = parseAtAGlanceFence(buf);
      parts.push(editorAtAGlanceHtml(parsed.title, parsed.items));
      return;
    }

    if (kind === 'answer-first') {
      const claim = buf.join(' ').replace(/\s+/g, ' ').trim();
      parts.push(editorAnswerFirstHtml(claim));
      return;
    }

    if (kind === 'tldr') {
      const summary = buf.join(' ').replace(/\s+/g, ' ').trim();
      parts.push(editorTldrHtml(summary));
      return;
    }

    if (kind === 'callout') {
      const split = splitCalloutFenceLines(buf);
      parts.push(
        editorCalloutHtml(
          split.title,
          split.text,
          variant || split.variantHint,
        ),
      );
      return;
    }

    if (kind === 'table') {
      const parsed = parsePipeTable(buf);
      parts.push(
        editorTableHtml(
          parsed?.headers || ['Column A', 'Column B', 'Column C'],
          parsed?.rows || [],
        ),
      );
    }
  };

  const flushAll = () => {
    flushList();
    flushQuote();
    flushTableBuf();
    flushFence();
  };

  for (const line of lines) {
    if (fenceKind) {
      const nextOpen = parseFenceOpen(line);
      if (isFenceClose(line)) {
        flushFence();
        continue;
      }
      if (nextOpen) {
        flushFence();
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
      flushList();
      flushQuote();
      flushTableBuf();
      fenceKind = fenceOpen.kind;
      fenceVariant = fenceOpen.variant;
      fenceLines = [];
      continue;
    }

    if (isPipeTableRow(line) || isPipeTableSeparator(line)) {
      flushList();
      flushQuote();
      tableBuf.push(line);
      continue;
    }

    if (tableBuf.length) flushTableBuf();

    const aligned = parseAlignedHtmlLine(line);
    if (aligned) {
      flushAll();
      const attrs = alignStyleAttr(aligned.align);
      if (aligned.tag === 'blockquote') {
        parts.push(
          `<blockquote class="draft-pullquote" data-pullquote="1"${attrs}>${renderRichInline(aligned.inner, 'editor') || 'Pull quote'}</blockquote>`,
        );
      } else {
        parts.push(
          `<${aligned.tag}${attrs}>${renderRichInline(aligned.inner, 'editor')}</${aligned.tag}>`,
        );
      }
      continue;
    }

    const heading = line.match(/^(#{2,3})\s+(.*)$/);
    if (heading) {
      flushAll();
      const tag = heading[1].length === 2 ? 'h2' : 'h3';
      parts.push(`<${tag}>${renderRichInline(heading[2], 'editor')}</${tag}>`);
      continue;
    }

    const image = parseDraftImageMarkdown(line);
    if (image) {
      flushAll();
      const alt = escapeHtml(image.alt);
      const caption = escapeHtml(image.caption);
      const rawSrc = image.src;
      const previewSrc = toPreviewImageSrc(rawSrc);
      const src = escapeHtml(previewSrc);
      const storeSrc = escapeHtml(rawSrc);
      const captionAttr = caption ? ` data-draft-caption="${caption}"` : '';
      const captionHtml = caption
        ? `<figcaption class="draft-editor-figure__caption">${caption}</figcaption>`
        : `<figcaption class="draft-editor-figure__caption draft-editor-figure__caption--empty" hidden></figcaption>`;
      parts.push(
        `<figure class="draft-editor-figure" contenteditable="false" data-draft-image="1"${captionAttr}><img src="${src}" alt="${alt || 'Article image'}" data-draft-src="${storeSrc}" data-draft-image="1" />${captionHtml}</figure>`,
      );
      continue;
    }

    const pullquote = line.match(/^>\s?(.*)$/);
    if (pullquote) {
      flushList();
      flushTableBuf();
      quoteLines.push(pullquote[1]);
      continue;
    }

    const listItem = line.match(/^\s*[-*]\s+(.*)$/);
    if (listItem) {
      flushQuote();
      flushTableBuf();
      listItems.push(renderRichInline(listItem[1], 'editor'));
      continue;
    }

    flushAll();
    if (!line.trim()) {
      parts.push('<p><br></p>');
      continue;
    }
    parts.push(`<p>${renderRichInline(line, 'editor')}</p>`);
  }

  flushAll();
  return parts.join('') || '<p><br></p>';
}

function serializeInline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || '').replace(/\u00a0/g, ' ');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const inner = Array.from(el.childNodes).map(serializeInline).join('');

  if (tag === 'br') return '';
  if (tag === 'strong' || tag === 'b') return `**${inner}**`;
  if (tag === 'em' || tag === 'i') return `*${inner}*`;
  if (tag === 'u') return `<u>${inner}</u>`;
  if (tag === 'code') return `\`${inner}\``;

  if (tag === 'span') {
    const brand = el.getAttribute('data-brand');
    const font = el.getAttribute('data-font');
    let size = el.getAttribute('data-size');

    if (!size) {
      const fontSize = (el.style.fontSize || '').toLowerCase();
      const matchedSize = TEXT_SIZES.find(
        (s) =>
          s.id !== 'md' &&
          (fontSize === s.css ||
            fontSize === s.css.replace('em', '') ||
            Math.abs(parseFloat(fontSize) - parseFloat(s.css)) < 0.05),
      );
      if (matchedSize) size = matchedSize.id;
    }

    let out = inner;
    if (size && isTextSizeId(size) && size !== 'md') {
      out = `<span data-size="${size}">${out}</span>`;
    }
    if (font && isBrandFontId(font)) {
      out = `<span data-font="${font}">${out}</span>`;
    }
    if (brand && isBrandColorId(brand)) {
      out = `<span data-brand="${brand}">${out}</span>`;
    }
    if (out !== inner) return out;

    // Infer brand/font from inline styles applied by the visual editor.
    const color = (el.style.color || '').replace(/\s/g, '').toLowerCase();
    const matchedColor = BRAND_COLORS.find(
      (c) => c.hex.toLowerCase() === color || rgbToHex(color) === c.hex.toLowerCase(),
    );
    if (matchedColor) {
      return `<span data-brand="${matchedColor.id}">${inner}</span>`;
    }
    const family = (el.style.fontFamily || '').toLowerCase();
    if (family.includes('syne')) {
      return `<span data-font="display">${inner}</span>`;
    }
    if (family.includes('jetbrains')) {
      return `<span data-font="mono">${inner}</span>`;
    }
    if (family.includes('dm sans')) {
      return `<span data-font="body">${inner}</span>`;
    }
    return inner;
  }

  if (tag === 'a') return inner;
  return inner;
}

function rgbToHex(value: string): string {
  const m = value.match(/^rgb\((\d+),(\d+),(\d+)\)$/i);
  if (!m) return value;
  const hex = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
}

function serializeBlock(el: HTMLElement): string[] {
  const tag = el.tagName.toLowerCase();
  const align = readTextAlign(el);

  if (tag === 'figure' || el.getAttribute('data-draft-image') === '1') {
    const img = tag === 'img' ? (el as HTMLImageElement) : el.querySelector('img');
    if (img) {
      const alt = (img.getAttribute('alt') || '').replace(/[[\]]/g, '');
      const src =
        img.getAttribute('data-draft-src') ||
        img.getAttribute('src') ||
        '';
      const captionEl = el.querySelector('figcaption');
      const caption =
        el.getAttribute('data-draft-caption') ||
        (captionEl && !captionEl.classList.contains('draft-editor-figure__caption--empty')
          ? (captionEl.textContent || '').trim()
          : '');
      if (src) return [serializeDraftImageMarkdown(alt, src, caption || undefined)];
    }
    return [];
  }

  if (tag === 'img') {
    const alt = (el.getAttribute('alt') || '').replace(/[[\]]/g, '');
    const src =
      el.getAttribute('data-draft-src') || el.getAttribute('src') || '';
    const caption = el.getAttribute('data-draft-caption') || '';
    return src
      ? [serializeDraftImageMarkdown(alt, src, caption || undefined)]
      : [];
  }

  if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
    const text = serializeInline(el).trim() || 'Heading';
    if (align !== 'left') {
      const htmlTag = tag === 'h1' ? 'h2' : tag;
      return [`<${htmlTag} data-align="${align}">${text}</${htmlTag}>`];
    }
    const prefix = tag === 'h3' ? '###' : '##';
    return [`${prefix} ${text}`];
  }

  if (tag === 'blockquote' || el.getAttribute('data-pullquote') === '1') {
    const text = serializeInline(el).replace(/\s+/g, ' ').trim();
    if (align !== 'left') {
      return [
        `<blockquote data-align="${align}" data-pullquote="1">${text}</blockquote>`,
      ];
    }
    if (!text) return ['> '];
    return [`> ${text}`];
  }

  if (
    el.getAttribute('data-takeaways') === '1' ||
    el.classList.contains('draft-takeaways')
  ) {
    const list = el.querySelector('ul, ol') || el;
    const items = Array.from(list.querySelectorAll(':scope > li')).map((li) =>
      serializeInline(li).trim(),
    );
    const lines = items.length
      ? items.map((item) => `- ${item || 'Takeaway'}`)
      : ['- Add your first takeaway'];
    return [':::takeaways', ...lines, ':::'];
  }

  if (
    el.getAttribute('data-at-a-glance') === '1' ||
    el.classList.contains('draft-at-a-glance')
  ) {
    const labelEl = el.querySelector('.draft-at-a-glance__label');
    const title =
      (labelEl ? serializeInline(labelEl).trim() : '') ||
      el.getAttribute('data-glance-heading')?.trim() ||
      'At a glance';
    const list = el.querySelector('ul, ol') || el;
    const items = Array.from(list.querySelectorAll(':scope > li')).map((li) =>
      serializeInline(li).trim(),
    );
    const itemLines = items.length
      ? items.map((item) => `- ${item || 'Glance point'}`)
      : ['- Add your first glance point'];
    return [':::at-a-glance', title, ...itemLines, ':::'];
  }

  if (
    el.getAttribute('data-answer-first') === '1' ||
    el.classList.contains('draft-answer-first')
  ) {
    const paras = Array.from(el.querySelectorAll('p')).filter(
      (p) => !p.classList.contains('draft-answer-first__label'),
    );
    const text =
      paras.map((p) => serializeInline(p).trim()).filter(Boolean).join(' ') ||
      serializeInline(el).replace(/\s+/g, ' ').trim();
    return [
      ':::answer-first',
      text || 'Write a 40–60 word extractable claim here.',
      ':::',
    ];
  }

  if (el.getAttribute('data-tldr') === '1' || el.classList.contains('draft-tldr')) {
    const paras = Array.from(el.querySelectorAll('p')).filter(
      (p) => !p.classList.contains('draft-tldr__label'),
    );
    const text =
      paras.map((p) => serializeInline(p).trim()).filter(Boolean).join(' ') ||
      serializeInline(el).replace(/\s+/g, ' ').trim();
    return [':::tldr', text || 'Write a short TL;DR summary here.', ':::'];
  }

  if (
    el.getAttribute('data-callout') === '1' ||
    el.classList.contains('draft-callout')
  ) {
    const variant = normalizeCalloutVariant(
      el.getAttribute('data-variant') || undefined,
    );
    const titleEl = el.querySelector('.draft-callout__title');
    const bodyParas = Array.from(el.querySelectorAll('p')).filter(
      (p) =>
        !p.classList.contains('draft-callout__label') &&
        !p.classList.contains('draft-callout__title'),
    );
    const title = titleEl ? serializeInline(titleEl).trim() : '';
    const body = bodyParas
      .map((p) => serializeInline(p).trim())
      .filter(Boolean)
      .join('\n\n');
    const open = variant === 'tip' ? ':::callout' : `:::callout ${variant}`;
    const lines = [open];
    if (title) lines.push(`### ${title}`);
    if (body) lines.push(body);
    if (!title && !body) {
      lines.push('### Callout title');
      lines.push('Callout body — tip, warning, or emphasis.');
    }
    lines.push(':::');
    return lines;
  }

  if (
    el.getAttribute('data-draft-table') === '1' ||
    tag === 'table' ||
    el.classList.contains('draft-table-wrap')
  ) {
    const table =
      tag === 'table' ? el : (el.querySelector('table') as HTMLElement | null);
    if (table) {
      const headers = Array.from(table.querySelectorAll('thead th')).map((th) =>
        serializeInline(th).trim(),
      );
      const rows = Array.from(table.querySelectorAll('tbody tr')).map((tr) =>
        Array.from(tr.querySelectorAll('th, td')).map((cell) =>
          serializeInline(cell).trim(),
        ),
      );
      const fallbackHeaders =
        headers.length > 0
          ? headers
          : Array.from(table.querySelectorAll('tr:first-child th, tr:first-child td')).map(
              (cell) => serializeInline(cell).trim(),
            );
      return [
        ':::table',
        ...serializePipeTable(
          fallbackHeaders.length ? fallbackHeaders : ['Column A', 'Column B', 'Column C'],
          headers.length ? rows : rows.slice(1),
        ),
        ':::',
      ];
    }
  }

  if (tag === 'ul' || tag === 'ol') {
    return Array.from(el.children)
      .filter((child) => child.tagName.toLowerCase() === 'li')
      .map((li) => `- ${serializeInline(li).trim()}`);
  }

  if (tag === 'li') {
    return [`- ${serializeInline(el).trim()}`];
  }

  if (tag === 'aside' || tag === 'div') {
    const lines: string[] = [];
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        lines.push(...serializeBlock(child as HTMLElement));
      } else if (child.nodeType === Node.TEXT_NODE) {
        const t = (child.textContent || '').trim();
        if (t) lines.push(t);
      }
    }
    return lines;
  }

  const inline = serializeInline(el).replace(/\s+/g, ' ').trim();
  if (!inline) return [''];
  if (align !== 'left') {
    return [`<p data-align="${align}">${inline}</p>`];
  }
  return [inline];
}

type HtmlRootDoc = Pick<Document, 'createElement'>;

function normalizeImportedHtmlRoot(root: HTMLElement): void {
  root.querySelectorAll('span').forEach((span) => {
    if (!span.getAttribute('data-brand')) {
      const color = (span.style.color || '').trim();
      const matched = BRAND_COLORS.find((c) => {
        const hex = c.hex.toLowerCase();
        const normalized = color.replace(/\s/g, '').toLowerCase();
        return (
          normalized === hex ||
          rgbToHex(normalized) === hex ||
          normalized.includes(hex)
        );
      });
      if (matched) span.setAttribute('data-brand', matched.id);
    }
    if (!span.getAttribute('data-font')) {
      const family = (span.style.fontFamily || '').toLowerCase();
      const matched = BRAND_FONTS.find((f) =>
        family.includes(f.id === 'display' ? 'syne' : f.id === 'mono' ? 'jetbrains' : 'dm sans'),
      );
      if (matched) span.setAttribute('data-font', matched.id);
    }
    if (!span.getAttribute('data-size')) {
      const fontSize = (span.style.fontSize || '').toLowerCase();
      const matched = TEXT_SIZES.find(
        (s) =>
          s.id !== 'md' &&
          (fontSize === s.css ||
            Math.abs(parseFloat(fontSize) - parseFloat(s.css)) < 0.05),
      );
      if (matched) span.setAttribute('data-size', matched.id);
    }
  });

  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (src.startsWith('/api/articles/media/')) {
      img.setAttribute(
        'src',
        `../images/${src.slice('/api/articles/media/'.length)}`,
      );
    }
  });
}

function serializeHtmlRootToDraftBody(root: HTMLElement): string {
  const lines: string[] = [];
  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      lines.push(...serializeBlock(child as HTMLElement));
    } else if (child.nodeType === Node.TEXT_NODE) {
      const t = (child.textContent || '').trim();
      if (t) lines.push(t);
    }
  }

  const compact: string[] = [];
  for (const line of lines) {
    const value = decodeEntities(line);
    if (value === '' && compact[compact.length - 1] === '') continue;
    compact.push(value);
  }
  return compact.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Convert an HTML fragment into stored draft markup (browser or server DOM). */
export function draftBodyFromHtmlFragment(
  html: string,
  doc: HtmlRootDoc,
): string {
  const root = doc.createElement('div');
  root.innerHTML = html;
  normalizeImportedHtmlRoot(root);
  return serializeHtmlRootToDraftBody(root);
}

/** Convert visual editor HTML back into stored draft markup. */
export function editorHtmlToMarkdown(html: string): string {
  if (typeof document === 'undefined') return '';
  return draftBodyFromHtmlFragment(html, document);
}
