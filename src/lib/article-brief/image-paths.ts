/** Resolve draft image paths for admin preview vs published blog HTML. */

/** Paths stored in drafts for repo images under images/. */
export function toPublishImageSrc(src: string): string {
  if (/^https?:\/\//i.test(src) || src.startsWith('data:')) return src;
  if (src.startsWith('/api/articles/media/')) {
    return `../images/${src.slice('/api/articles/media/'.length)}`;
  }
  if (src.startsWith('/images/')) {
    return `..${src}`;
  }
  if (src.startsWith('images/')) {
    return `../${src}`;
  }
  return src;
}

/** Paths used while previewing inside the Next admin app. */
export function toPreviewImageSrc(src: string): string {
  if (/^https?:\/\//i.test(src) || src.startsWith('data:')) return src;
  if (src.startsWith('/api/articles/media/')) return src;
  if (src.startsWith('../images/')) {
    return `/api/articles/media/${src.slice('../images/'.length)}`;
  }
  if (src.startsWith('/images/')) {
    return `/api/articles/media/${src.slice('/images/'.length)}`;
  }
  if (src.startsWith('images/')) {
    return `/api/articles/media/${src.slice('images/'.length)}`;
  }
  return src;
}

/** Basename from a draft image path or URL. */
export function imageFilename(src: string): string {
  const cleaned = src.trim().split('?')[0].split('#')[0];
  const parts = cleaned.split('/');
  return parts[parts.length - 1] || cleaned || 'image';
}

/** Human label from a filename (strip extension + trailing hash tokens). */
export function imageFilenameLabel(src: string): string {
  return imageFilename(src)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

export interface ParsedDraftImage {
  alt: string;
  src: string;
  caption: string;
}

/** Parse `![alt](src)` or `![alt](src "caption")`. */
export function parseDraftImageMarkdown(line: string): ParsedDraftImage | null {
  const match = line.match(
    /^\s*!\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+(?:"([^"]*)"|'([^']*)'))?\s*\)\s*$/,
  );
  if (!match) return null;
  return {
    alt: match[1].trim(),
    src: match[2].trim(),
    caption: (match[3] ?? match[4] ?? '').trim(),
  };
}

/** Serialize image markdown, keeping caption in the title slot when present. */
export function serializeDraftImageMarkdown(
  alt: string,
  src: string,
  caption?: string,
): string {
  const safeAlt = alt.replace(/[[\]]/g, '');
  const safeCaption = (caption || '').replace(/"/g, "'").trim();
  if (safeCaption) return `![${safeAlt}](${src} "${safeCaption}")`;
  return `![${safeAlt}](${src})`;
}
