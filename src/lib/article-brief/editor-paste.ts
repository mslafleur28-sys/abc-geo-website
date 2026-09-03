/** Safe paste handling for the draft contenteditable editor. */

const INTERNAL_CLIPBOARD_MARKERS = [
  'data-brand=',
  'data-font=',
  'data-size=',
  'data-align=',
  'data-takeaways=',
  'data-callout=',
  'data-answer-first=',
  'data-at-a-glance=',
  'data-tldr=',
  'data-draft-',
  'draft-pullquote',
  'draft-takeaways',
  'draft-at-a-glance',
  'draft-tldr',
  'draft-callout',
  'draft-answer-first',
  'draft-editor-figure',
] as const;

const PRESERVED_DRAFT_CLASSES = [
  'draft-editor-figure',
  'draft-editor-figure__caption',
  'draft-pullquote',
  'draft-takeaways',
  'draft-takeaways__label',
  'draft-at-a-glance',
  'draft-at-a-glance__label',
  'draft-tldr',
  'draft-tldr__label',
  'draft-callout',
  'draft-callout__label',
  'draft-callout__title',
  'draft-answer-first',
  'draft-answer-first__label',
  'draft-table-wrap',
] as const;

export type EditorPasteResult =
  | { kind: 'unhandled' }
  | { kind: 'text' }
  | { kind: 'images'; files: File[] };

function isInternalEditorClipboard(html: string): boolean {
  return INTERNAL_CLIPBOARD_MARKERS.some((marker) => html.includes(marker));
}

function shouldPreserveClass(el: Element): boolean {
  const block = el as HTMLElement;
  return PRESERVED_DRAFT_CLASSES.some((name) => block.classList.contains(name));
}

function stripUnsafeAttributes(el: Element) {
  const block = el as HTMLElement;
  const keepClass = shouldPreserveClass(block);
  [...block.attributes].forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (name === 'class' && keepClass) return;
    if (
      name === 'style' ||
      name === 'class' ||
      name.startsWith('on') ||
      name.startsWith('xmlns') ||
      name.includes('mso')
    ) {
      block.removeAttribute(attr.name);
    }
  });
}

function getClipboardImageFiles(clipboard: DataTransfer): File[] {
  const seen = new Set<string>();
  const files: File[] = [];

  const add = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (seen.has(key)) return;
    seen.add(key);
    files.push(file);
  };

  if (clipboard.files?.length) {
    for (const file of clipboard.files) add(file);
  }
  for (const item of clipboard.items) {
    if (item.type.startsWith('image/')) {
      add(item.getAsFile());
    }
  }
  return files;
}

/** Remove Word/Docs cruft while keeping basic semantic tags. */
function cleanPastedHtml(html: string): DocumentFragment {
  const root = document.createElement('div');
  root.innerHTML = html;
  root
    .querySelectorAll('style, script, meta, link, head, title')
    .forEach((node) => node.remove());
  root.querySelectorAll('*').forEach(stripUnsafeAttributes);
  const fragment = document.createDocumentFragment();
  while (root.firstChild) {
    fragment.appendChild(root.firstChild);
  }
  return fragment;
}

function insertFragmentAtSelection(fragment: DocumentFragment) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(fragment);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function insertPlainTextAtSelection(text: string) {
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized) return;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();

  const blocks = normalized.split(/\n\n+/);
  const fragment = document.createDocumentFragment();

  blocks.forEach((block, blockIndex) => {
    if (blockIndex > 0) {
      const gap = document.createElement('p');
      gap.appendChild(document.createElement('br'));
      fragment.appendChild(gap);
    }

    const lines = block.split('\n');
    const paragraph = document.createElement('p');
    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        paragraph.appendChild(document.createElement('br'));
      }
      if (line) {
        paragraph.appendChild(document.createTextNode(line));
      }
    });
    if (!paragraph.childNodes.length) {
      paragraph.appendChild(document.createElement('br'));
    }
    fragment.appendChild(paragraph);
  });

  range.insertNode(fragment);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Intercept paste into the visual editor.
 * Images upload separately; external rich paste → plain paragraphs.
 */
export function processEditorPaste(event: ClipboardEvent): EditorPasteResult {
  const clipboard = event.clipboardData;
  if (!clipboard) return { kind: 'unhandled' };

  const imageFiles = getClipboardImageFiles(clipboard);
  if (imageFiles.length > 0) {
    event.preventDefault();
    return { kind: 'images', files: imageFiles };
  }

  const html = clipboard.getData('text/html').trim();
  const text = clipboard.getData('text/plain');

  if (html && isInternalEditorClipboard(html)) {
    event.preventDefault();
    insertFragmentAtSelection(cleanPastedHtml(html));
    return { kind: 'text' };
  }

  // External paste (Word, Google Docs, websites): ignore styled HTML.
  event.preventDefault();
  insertPlainTextAtSelection(text);
  return { kind: 'text' };
}
