import {
  parseDraftImageMarkdown,
  serializeDraftImageMarkdown,
} from './image-paths';

export interface CarouselSlide {
  title: string;
  body: string;
  alt: string;
  src: string;
  caption: string;
}

export function emptyCarouselSlide(index = 0): CarouselSlide {
  return {
    title: `Slide ${index + 1} title`,
    body: 'Add the point for this slide.',
    alt: '',
    src: '',
    caption: '',
  };
}

export function emptyCarouselSlides(count = 3): CarouselSlide[] {
  return Array.from({ length: Math.max(1, count) }, (_, i) =>
    emptyCarouselSlide(i),
  );
}

function parseCarouselChunk(lines: string[]): CarouselSlide {
  let title = '';
  const body: string[] = [];
  let alt = '';
  let src = '';
  let caption = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (!title && heading) {
      title = heading[1].trim();
      continue;
    }
    const image = parseDraftImageMarkdown(trimmed);
    if (image && !src) {
      alt = image.alt;
      src = image.src;
      caption = image.caption;
      continue;
    }
    body.push(trimmed);
  }

  return {
    title: title || 'Slide title',
    body: body.join(' ').replace(/\s+/g, ' ').trim(),
    alt,
    src,
    caption,
  };
}

/** Parse the lines inside a `:::carousel` fence into slides. */
export function parseCarouselFence(lines: string[]): CarouselSlide[] {
  const chunks: string[][] = [[]];
  for (const line of lines) {
    if (/^\s*---\s*$/.test(line)) {
      chunks.push([]);
      continue;
    }
    chunks[chunks.length - 1].push(line);
  }

  const slides = chunks
    .map(parseCarouselChunk)
    .filter((slide) => slide.title || slide.body || slide.src);

  return slides.length ? slides : emptyCarouselSlides(1);
}

/** Serialize slides as a `:::carousel` fence. Slides are separated by `---`. */
export function serializeCarouselFence(slides: CarouselSlide[]): string[] {
  const usable = slides.length ? slides : emptyCarouselSlides(1);
  const lines = [':::carousel'];
  usable.forEach((slide, index) => {
    if (index > 0) lines.push('---');
    const title = (slide.title || `Slide ${index + 1} title`)
      .replace(/\s+/g, ' ')
      .trim();
    lines.push(`### ${title}`);
    const body = slide.body.replace(/\s+/g, ' ').trim();
    if (body) lines.push(body);
    if (slide.src.trim()) {
      lines.push(
        serializeDraftImageMarkdown(
          slide.alt || title,
          slide.src.trim(),
          slide.caption,
        ),
      );
    }
  });
  lines.push(':::');
  return lines;
}
