import path from 'node:path';
import mammoth from 'mammoth';
import { importHtmlToDraftBody } from './html-to-draft';
import { saveUploadedImage } from './media-upload';

const IMAGE_EXT_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

export const IMPORTABLE_DOC_EXT = new Set([
  '.docx',
  '.md',
  '.markdown',
  '.txt',
  '.html',
  '.htm',
]);

export interface DocumentImportResult {
  rawBody: string;
  warnings: string[];
}

function normalizePlainText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

async function importDocx(buffer: Buffer): Promise<DocumentImportResult> {
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const imageBuffer = await image.read();
        const contentType = image.contentType || 'image/png';
        const ext = IMAGE_EXT_BY_MIME[contentType] || '.png';
        const { publishSrc } = await saveUploadedImage(
          Buffer.from(imageBuffer),
          `import${ext}`,
        );
        return { src: publishSrc };
      }),
    },
  );

  return {
    rawBody: importHtmlToDraftBody(result.value),
    warnings: result.messages.map((message) => message.message),
  };
}

/** Parse an uploaded document into draft rawBody markup. */
export async function importDocumentBuffer(
  buffer: Buffer,
  filename: string,
): Promise<DocumentImportResult> {
  const ext = path.extname(filename).toLowerCase();

  if (!IMPORTABLE_DOC_EXT.has(ext)) {
    throw new Error(
      'Unsupported file type. Upload .docx, .md, .txt, or .html.',
    );
  }

  if (ext === '.docx') {
    return importDocx(buffer);
  }

  const text = buffer.toString('utf8');

  if (ext === '.md' || ext === '.markdown') {
    return { rawBody: text.trim(), warnings: [] };
  }

  if (ext === '.txt') {
    return { rawBody: normalizePlainText(text), warnings: [] };
  }

  return { rawBody: importHtmlToDraftBody(text), warnings: [] };
}
