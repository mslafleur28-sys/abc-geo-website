/** Brand formatting options for the draft editor toolbox. */

export const BRAND_COLORS = [
  { id: 'coral', label: 'Coral', hex: '#FF6B4A', publishClass: 'text-orange-500' },
  { id: 'sky', label: 'Sky', hex: '#00B4D8', publishClass: 'text-sky-700' },
  { id: 'sky-ink', label: 'Sky ink', hex: '#00566B', publishClass: 'text-sky-700' },
  { id: 'ink', label: 'Ink', hex: '#1A202C', publishClass: 'text-charcoal-body' },
  { id: 'muted', label: 'Muted', hex: '#64748B', publishClass: 'text-slate-400' },
  { id: 'success', label: 'Success', hex: '#00C9A7', publishClass: 'text-emerald-700' },
] as const;

export type BrandColorId = (typeof BRAND_COLORS)[number]['id'];

export const BRAND_FONTS = [
  {
    id: 'display',
    label: 'Display',
    stack: "'Syne', system-ui, sans-serif",
    publishClass: 'font-brand-display',
  },
  {
    id: 'body',
    label: 'Body',
    stack: "'DM Sans', system-ui, sans-serif",
    publishClass: 'font-brand-body',
  },
  {
    id: 'mono',
    label: 'Mono',
    stack: "'JetBrains Mono', ui-monospace, monospace",
    publishClass: 'font-brand-mono',
  },
] as const;

export type BrandFontId = (typeof BRAND_FONTS)[number]['id'];

export const TEXT_SIZES = [
  {
    id: 'sm',
    label: 'Small',
    css: '0.875em',
    publishClass: 'text-sm',
  },
  {
    id: 'md',
    label: 'Normal',
    css: '1em',
    publishClass: '',
  },
  {
    id: 'lg',
    label: 'Large',
    css: '1.25em',
    publishClass: 'text-lg',
  },
  {
    id: 'xl',
    label: 'Extra large',
    css: '1.5em',
    publishClass: 'text-xl sm:text-2xl',
  },
] as const;

export type TextSizeId = (typeof TEXT_SIZES)[number]['id'];

export function isTextSizeId(value: string): value is TextSizeId {
  return TEXT_SIZES.some((s) => s.id === value);
}

export function stepTextSize(
  current: TextSizeId | null | undefined,
  delta: -1 | 1,
): TextSizeId {
  const order = TEXT_SIZES.map((s) => s.id);
  const idx = Math.max(0, order.indexOf(current || 'md'));
  const next = Math.min(order.length - 1, Math.max(0, idx + delta));
  return order[next];
}

export const TEXT_ALIGNS = ['left', 'center', 'right'] as const;
export type TextAlign = (typeof TEXT_ALIGNS)[number];

export function isTextAlign(value: string): value is TextAlign {
  return (TEXT_ALIGNS as readonly string[]).includes(value);
}

export function readTextAlign(el: HTMLElement): TextAlign {
  const raw = (
    el.getAttribute('data-align') ||
    el.style.textAlign ||
    ''
  )
    .trim()
    .toLowerCase();
  if (raw === 'center' || raw === 'right') return raw;
  return 'left';
}

export function applyTextAlignToElement(el: HTMLElement, align: TextAlign) {
  if (align === 'left') {
    el.style.textAlign = '';
    el.removeAttribute('data-align');
    return;
  }
  el.style.textAlign = align;
  el.setAttribute('data-align', align);
}

export function isBrandColorId(value: string): value is BrandColorId {
  return BRAND_COLORS.some((c) => c.id === value);
}

export function isBrandFontId(value: string): value is BrandFontId {
  return BRAND_FONTS.some((f) => f.id === value);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render draft inline markup for preview, publish, or the visual editor.
 * Supports: **bold**, *italic*, __underline__, `code`,
 * <u>, <span data-brand="…">, <span data-font="…">, <span data-size="…">.
 */
export function renderRichInline(
  text: string,
  mode: 'preview' | 'publish' | 'editor' = 'preview',
): string {
  const slots: string[] = [];
  const slot = (html: string) => {
    const i = slots.length;
    slots.push(html);
    return `\u0000${i}\u0000`;
  };

  let s = text;

  const protectInner = (inner: string) => escapeHtml(inner);

  s = s.replace(/`([^`]+)`/g, (_, inner: string) =>
    slot(
      mode === 'publish'
        ? `<code class="text-sky-700 text-sm">${protectInner(inner)}</code>`
        : `<code class="preview-code">${protectInner(inner)}</code>`,
    ),
  );

  s = s.replace(
    /<span\s+data-brand="([a-z-]+)"\s*>([\s\S]*?)<\/span>/gi,
    (_, brand: string, inner: string) => {
      const color = BRAND_COLORS.find((c) => c.id === brand);
      if (!color) return protectInner(inner);
      if (mode === 'publish') {
        return slot(
          `<span class="${color.publishClass}">${protectInner(inner)}</span>`,
        );
      }
      if (mode === 'editor') {
        return slot(
          `<span data-brand="${color.id}" style="color:${color.hex}">${protectInner(inner)}</span>`,
        );
      }
      return slot(
        `<span style="color:${color.hex}">${protectInner(inner)}</span>`,
      );
    },
  );

  s = s.replace(
    /<span\s+data-font="([a-z]+)"\s*>([\s\S]*?)<\/span>/gi,
    (_, font: string, inner: string) => {
      const face = BRAND_FONTS.find((f) => f.id === font);
      if (!face) return protectInner(inner);
      if (mode === 'publish') {
        return slot(
          `<span class="${face.publishClass}">${protectInner(inner)}</span>`,
        );
      }
      if (mode === 'editor') {
        return slot(
          `<span data-font="${face.id}" style="font-family:${face.stack}">${protectInner(inner)}</span>`,
        );
      }
      return slot(
        `<span style="font-family:${face.stack}">${protectInner(inner)}</span>`,
      );
    },
  );

  s = s.replace(
    /<span\s+data-size="([a-z]+)"\s*>([\s\S]*?)<\/span>/gi,
    (_, size: string, inner: string) => {
      const face = TEXT_SIZES.find((s) => s.id === size);
      if (!face || face.id === 'md') return protectInner(inner);
      if (mode === 'publish') {
        return slot(
          `<span class="${face.publishClass}">${protectInner(inner)}</span>`,
        );
      }
      if (mode === 'editor') {
        return slot(
          `<span data-size="${face.id}" style="font-size:${face.css}">${protectInner(inner)}</span>`,
        );
      }
      return slot(
        `<span style="font-size:${face.css}">${protectInner(inner)}</span>`,
      );
    },
  );

  s = s.replace(/<u>([\s\S]*?)<\/u>/gi, (_, inner: string) =>
    slot(`<u>${protectInner(inner)}</u>`),
  );

  s = s.replace(/\*\*([^*]+)\*\*/g, (_, inner: string) =>
    slot(`<strong>${protectInner(inner)}</strong>`),
  );

  s = s.replace(/__([^_]+)__/g, (_, inner: string) =>
    slot(`<u>${protectInner(inner)}</u>`),
  );

  s = s.replace(/\*([^*]+)\*/g, (_, inner: string) =>
    slot(`<em>${protectInner(inner)}</em>`),
  );

  s = escapeHtml(s);
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => slots[Number(i)] ?? '');
  return s;
}
