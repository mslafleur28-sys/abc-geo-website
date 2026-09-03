'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type RefObject,
} from 'react';
import {
  editorHtmlToMarkdown,
  markdownToEditorHtml,
} from '@/lib/article-brief/editor-codec';
import {
  createEditorFigureElement,
  defaultAltForImageFile,
  insertFigureAtSelection,
  uploadDraftImageFile,
} from '@/lib/article-brief/editor-images';
import { processEditorPaste } from '@/lib/article-brief/editor-paste';
import { imageFilename, imageFilenameLabel } from '@/lib/article-brief/image-paths';
import {
  BRAND_COLORS,
  BRAND_FONTS,
  TEXT_SIZES,
  applyTextAlignToElement,
  stepTextSize,
  type BrandColorId,
  type BrandFontId,
  type TextAlign,
  type TextSizeId,
} from '@/lib/article-brief/rich-text';

/** Curated set for article writing — insert as plain Unicode. */
const TOOLBOX_EMOJIS = [
  '✅',
  '❌',
  '⚠️',
  '💡',
  '📌',
  '🔍',
  '🚀',
  '📈',
  '📉',
  '🎯',
  '🧠',
  '✍️',
  '📚',
  '🔗',
  '🛡️',
  '⚡',
  '🔥',
  '⭐',
  '💬',
  '👉',
  '➡️',
  '✨',
  '🧭',
  '🧩',
] as const;

function focusEditor(el: HTMLDivElement | null) {
  el?.focus();
}

function wrapSelectionWithSpan(attrs: Record<string, string>, styles: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (range.collapsed) {
    const span = document.createElement('span');
    Object.entries(attrs).forEach(([k, v]) => span.setAttribute(k, v));
    span.setAttribute('style', styles);
    span.textContent = attrs['data-brand'] ? 'colored text' : 'text';
    range.insertNode(span);
    selection.removeAllRanges();
    const next = document.createRange();
    next.selectNodeContents(span);
    selection.addRange(next);
    return;
  }

  const span = document.createElement('span');
  Object.entries(attrs).forEach(([k, v]) => span.setAttribute(k, v));
  span.setAttribute('style', styles);
  span.appendChild(range.extractContents());
  range.insertNode(span);
  selection.removeAllRanges();
  const next = document.createRange();
  next.selectNodeContents(span);
  selection.addRange(next);
}

function applyBlockTag(tagName: 'h2' | 'h3' | 'p') {
  // Prefer formatBlock; fall back to wrapping.
  try {
    document.execCommand('formatBlock', false, tagName);
  } catch {
    /* ignore */
  }
}

function insertBlockAfterSelection(
  editor: HTMLDivElement | null,
  node: HTMLElement,
) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const container = range.startContainer;
  const block =
    container.nodeType === Node.ELEMENT_NODE
      ? (container as HTMLElement)
      : container.parentElement;
  const host = block?.closest(
    'p, h2, h3, li, blockquote, aside, ul, ol, table, div.draft-table-wrap, div.draft-visual-editor',
  );
  if (
    host &&
    editor &&
    host !== editor &&
    editor.contains(host) &&
    host.parentElement
  ) {
    const insertAfter =
      host.tagName.toLowerCase() === 'li'
        ? host.closest('ul, ol') || host
        : host.closest('div.draft-table-wrap') || host;
    insertAfter.after(node);
  } else {
    range.insertNode(node);
  }

  const spacer = document.createElement('p');
  spacer.innerHTML = '<br>';
  node.after(spacer);
}

function findAlignTarget(
  editor: HTMLDivElement | null,
): HTMLElement | null {
  if (!editor) return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return null;
  const node =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as HTMLElement)
      : range.commonAncestorContainer.parentElement;
  const block = node?.closest('p, h2, h3, blockquote, li, ul, ol');
  if (!block || !editor.contains(block)) return null;
  return block as HTMLElement;
}

function applyAlign(editor: HTMLDivElement | null, align: TextAlign) {
  const target = findAlignTarget(editor);
  if (!target) return;
  // Align the list container when the caret is in a list item.
  const list = target.closest('ul, ol');
  applyTextAlignToElement(
    list && editor?.contains(list) ? (list as HTMLElement) : target,
    align,
  );
}

interface DraftFormatToolbarProps {
  editorRef: RefObject<HTMLDivElement | null>;
  onMutate: () => void;
  /** Snapshot history before a formatting command mutates the DOM. */
  onBeforeMutate?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  sticky?: boolean;
  /** Currently selected image figure in the editor (click-to-edit). */
  selectedFigure?: HTMLElement | null;
  onSelectedFigureChange?: (figure: HTMLElement | null) => void;
}

function clearFigureSelection(editor: HTMLDivElement | null) {
  editor
    ?.querySelectorAll('.draft-editor-figure--selected')
    .forEach((el) => el.classList.remove('draft-editor-figure--selected'));
}

function readFigureFields(figure: HTMLElement): {
  alt: string;
  caption: string;
  src: string;
  filename: string;
} {
  const img = figure.querySelector('img');
  const captionEl = figure.querySelector('figcaption');
  const src =
    img?.getAttribute('data-draft-src') ||
    img?.getAttribute('src') ||
    '';
  const captionAttr = figure.getAttribute('data-draft-caption') || '';
  const captionText =
    captionAttr ||
    (captionEl &&
    !captionEl.classList.contains('draft-editor-figure__caption--empty') &&
    !captionEl.hasAttribute('hidden')
      ? (captionEl.textContent || '').trim()
      : '');
  return {
    alt: img?.getAttribute('alt') || '',
    caption: captionText,
    src,
    filename: imageFilename(src),
  };
}

function applyFigureFields(
  figure: HTMLElement,
  alt: string,
  caption: string,
) {
  const img = figure.querySelector('img');
  if (img) {
    img.alt = alt.trim() || 'Article image';
  }
  const trimmedCaption = caption.trim();
  if (trimmedCaption) {
    figure.setAttribute('data-draft-caption', trimmedCaption);
  } else {
    figure.removeAttribute('data-draft-caption');
  }
  let captionEl = figure.querySelector('figcaption');
  if (!captionEl) {
    captionEl = document.createElement('figcaption');
    captionEl.className = 'draft-editor-figure__caption';
    figure.appendChild(captionEl);
  }
  if (trimmedCaption) {
    captionEl.textContent = trimmedCaption;
    captionEl.classList.remove('draft-editor-figure__caption--empty');
    captionEl.removeAttribute('hidden');
  } else {
    captionEl.textContent = '';
    captionEl.classList.add('draft-editor-figure__caption--empty');
    captionEl.setAttribute('hidden', '');
  }
}

function DraftFormatToolbar({
  editorRef,
  onMutate,
  onBeforeMutate,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  sticky = false,
  selectedFigure = null,
  onSelectedFigureChange,
}: DraftFormatToolbarProps) {
  const [imageOpen, setImageOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const editingExisting = Boolean(selectedFigure);
  const wasEditingRef = useRef(false);

  useEffect(() => {
    clearFigureSelection(editorRef.current);
    if (!selectedFigure) {
      if (wasEditingRef.current) {
        wasEditingRef.current = false;
        setImageOpen(false);
        setImageError('');
      }
      return;
    }
    wasEditingRef.current = true;
    selectedFigure.classList.add('draft-editor-figure--selected');
    const fields = readFigureFields(selectedFigure);
    setImageAlt(fields.alt);
    setImageCaption(fields.caption);
    setImageUrl(fields.src);
    setImageError('');
    setImageOpen(true);
    setEmojiOpen(false);
  }, [editorRef, selectedFigure]);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange();
    }
  }, [editorRef]);

  const restoreSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !savedRange.current) return;
    selection.removeAllRanges();
    selection.addRange(savedRange.current);
  }, []);

  const runCommand = useCallback(
    (fn: () => void) => {
      onBeforeMutate?.();
      focusEditor(editorRef.current);
      restoreSelection();
      fn();
      onMutate();
      saveSelection();
    },
    [editorRef, onBeforeMutate, onMutate, restoreSelection, saveSelection],
  );

  const clearImageSelection = useCallback(() => {
    clearFigureSelection(editorRef.current);
    onSelectedFigureChange?.(null);
  }, [editorRef, onSelectedFigureChange]);

  const insertImage = useCallback(
    (src: string, alt: string, caption = '') => {
      const publishSrc = src.trim();
      if (!publishSrc) return;
      runCommand(() => {
        restoreSelection();
        const figure = createEditorFigureElement(publishSrc, alt, caption);
        insertFigureAtSelection(figure);
      });
      clearImageSelection();
      setImageOpen(false);
      setImageUrl('');
      setImageAlt('');
      setImageCaption('');
      setImageError('');
    },
    [clearImageSelection, restoreSelection, runCommand],
  );

  const applySelectedImage = useCallback(() => {
    if (!selectedFigure) return;
    onBeforeMutate?.();
    applyFigureFields(selectedFigure, imageAlt, imageCaption);
    onMutate();
  }, [
    imageAlt,
    imageCaption,
    onBeforeMutate,
    onMutate,
    selectedFigure,
  ]);

  const removeSelectedImage = useCallback(() => {
    if (!selectedFigure) return;
    onBeforeMutate?.();
    const spacer = document.createElement('p');
    spacer.innerHTML = '<br>';
    selectedFigure.replaceWith(spacer);
    clearImageSelection();
    setImageOpen(false);
    setImageUrl('');
    setImageAlt('');
    setImageCaption('');
    onMutate();
  }, [
    clearImageSelection,
    onBeforeMutate,
    onMutate,
    selectedFigure,
  ]);


  const insertEmoji = useCallback(
    (emoji: string) => {
      runCommand(() => {
        restoreSelection();
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(emoji);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      });
      setEmojiOpen(false);
    },
    [restoreSelection, runCommand],
  );

  async function onPickFile(file: File | null) {
    if (!file) return;
    setImageBusy(true);
    setImageError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/articles/media', { method: 'POST', body });
      const data = (await res.json()) as {
        ok?: boolean;
        src?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.src) {
        setImageError(data.error || 'Upload failed.');
        return;
      }
      insertImage(
        data.src,
        imageAlt || imageFilenameLabel(data.src) || file.name.replace(/\.[^.]+$/, ''),
        imageCaption,
      );
    } catch {
      setImageError('Network error while uploading.');
    } finally {
      setImageBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function applyBrand(brand: BrandColorId) {
    const color = BRAND_COLORS.find((c) => c.id === brand);
    if (!color) return;
    runCommand(() =>
      wrapSelectionWithSpan(
        { 'data-brand': brand },
        `color:${color.hex}`,
      ),
    );
  }

  function applyFont(font: BrandFontId) {
    const face = BRAND_FONTS.find((f) => f.id === font);
    if (!face) return;
    runCommand(() =>
      wrapSelectionWithSpan(
        { 'data-font': font },
        `font-family:${face.stack}`,
      ),
    );
  }

  function readSelectionSize(): TextSizeId {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 'md';
    const node =
      selection.anchorNode?.nodeType === Node.ELEMENT_NODE
        ? (selection.anchorNode as HTMLElement)
        : selection.anchorNode?.parentElement;
    const sized = node?.closest('[data-size]') as HTMLElement | null;
    const raw = sized?.getAttribute('data-size') || '';
    const match = TEXT_SIZES.find((s) => s.id === raw);
    return match?.id || 'md';
  }

  function applySize(size: TextSizeId) {
    const face = TEXT_SIZES.find((s) => s.id === size);
    if (!face) return;
    runCommand(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      // Update an existing size span when the caret/selection is inside one.
      const node =
        selection.anchorNode?.nodeType === Node.ELEMENT_NODE
          ? (selection.anchorNode as HTMLElement)
          : selection.anchorNode?.parentElement;
      const existing = node?.closest('[data-size]') as HTMLElement | null;
      if (
        existing &&
        editorRef.current?.contains(existing) &&
        selection.isCollapsed
      ) {
        if (size === 'md') {
          existing.style.fontSize = '';
          existing.removeAttribute('data-size');
          // Unwrap empty-attr span if it only carried size.
          if (
            !existing.getAttribute('data-brand') &&
            !existing.getAttribute('data-font') &&
            !existing.getAttribute('style')
          ) {
            const parent = existing.parentNode;
            while (existing.firstChild) {
              parent?.insertBefore(existing.firstChild, existing);
            }
            existing.remove();
          }
          return;
        }
        existing.setAttribute('data-size', size);
        existing.style.fontSize = face.css;
        return;
      }

      if (size === 'md') {
        // Normal size: leave selection as-is (no wrapper).
        return;
      }
      wrapSelectionWithSpan(
        { 'data-size': size },
        `font-size:${face.css}`,
      );
    });
  }

  function stepSize(delta: -1 | 1) {
    applySize(stepTextSize(readSelectionSize(), delta));
  }

  return (
    <div
      className={`draft-toolbox-wrap${sticky ? ' draft-toolbox-wrap--sticky' : ''}`}
    >
      <div
        className="draft-toolbox"
        role="toolbar"
        aria-label="Text formatting"
        onMouseDown={(e) => {
          // Keep editor selection when clicking toolbar.
          if ((e.target as HTMLElement).closest('button,label,input')) {
            e.preventDefault();
            saveSelection();
          }
        }}
      >
        <div className="draft-toolbox__group" aria-label="History">
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            disabled={!canUndo}
            onClick={onUndo}
          >
            Undo
          </button>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
            disabled={!canRedo}
            onClick={onRedo}
          >
            Redo
          </button>
        </div>

        <div className="draft-toolbox__group">
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Bold"
            aria-label="Bold"
            onClick={() =>
              runCommand(() => document.execCommand('bold'))
            }
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Italic"
            aria-label="Italic"
            onClick={() =>
              runCommand(() => document.execCommand('italic'))
            }
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Underline"
            aria-label="Underline"
            onClick={() =>
              runCommand(() => document.execCommand('underline'))
            }
          >
            <span className="underline">U</span>
          </button>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Inline code"
            aria-label="Inline code"
            onClick={() =>
              runCommand(() => {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                const range = selection.getRangeAt(0);
                const code = document.createElement('code');
                code.className = 'preview-code';
                if (range.collapsed) {
                  code.textContent = 'code';
                  range.insertNode(code);
                } else {
                  code.appendChild(range.extractContents());
                  range.insertNode(code);
                }
              })
            }
          >
            {'</>'}
          </button>
        </div>

        <div className="draft-toolbox__group">
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Heading 2"
            aria-label="Heading 2"
            onClick={() => runCommand(() => applyBlockTag('h2'))}
          >
            H2
          </button>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Heading 3"
            aria-label="Heading 3"
            onClick={() => runCommand(() => applyBlockTag('h3'))}
          >
            H3
          </button>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Bullet list"
            aria-label="Bullet list"
            onClick={() =>
              runCommand(() => document.execCommand('insertUnorderedList'))
            }
          >
            • List
          </button>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Pull quote"
            aria-label="Pull quote"
            onClick={() =>
              runCommand(() => {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                const range = selection.getRangeAt(0);
                const quote = document.createElement('blockquote');
                quote.className = 'draft-pullquote';
                quote.setAttribute('data-pullquote', '1');
                if (range.collapsed) {
                  quote.textContent =
                    'Pull quote — replace with your standout line.';
                } else {
                  quote.appendChild(range.extractContents());
                }

                // Prefer inserting as its own block after the current block.
                const container = range.startContainer;
                const block =
                  container.nodeType === Node.ELEMENT_NODE
                    ? (container as HTMLElement)
                    : container.parentElement;
                const host = block?.closest(
                  'p, h2, h3, li, blockquote, div.draft-visual-editor',
                );
                const editor = editorRef.current;
                if (
                  host &&
                  editor &&
                  host !== editor &&
                  editor.contains(host) &&
                  host.parentElement
                ) {
                  host.after(quote);
                } else {
                  range.insertNode(quote);
                }

                const spacer = document.createElement('p');
                spacer.innerHTML = '<br>';
                quote.after(spacer);

                selection.removeAllRanges();
                const next = document.createRange();
                next.selectNodeContents(quote);
                selection.addRange(next);
              })
            }
          >
            Quote
          </button>
                  <button
            type="button"
            className="draft-toolbox__btn"
            title="Key takeaways panel"
            aria-label="Key takeaways panel"
            onClick={() =>
              runCommand(() => {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                const range = selection.getRangeAt(0);

                const aside = document.createElement('aside');
                aside.className = 'draft-takeaways';
                aside.setAttribute('data-takeaways', '1');

                const label = document.createElement('p');
                label.className = 'draft-takeaways__label';
                label.contentEditable = 'false';
                label.textContent = 'Key takeaways';

                const list = document.createElement('ul');
                if (range.collapsed) {
                  const li = document.createElement('li');
                  li.textContent = 'Add your first takeaway';
                  list.appendChild(li);
                } else {
                  const extracted = range.extractContents();
                  const text = extracted.textContent?.trim();
                  if (text) {
                    text.split(/\n+/).forEach((line) => {
                      const cleaned = line.replace(/^\s*[-*•]\s*/, '').trim();
                      if (!cleaned) return;
                      const li = document.createElement('li');
                      li.textContent = cleaned;
                      list.appendChild(li);
                    });
                  }
                  if (!list.children.length) {
                    const li = document.createElement('li');
                    li.textContent = 'Add your first takeaway';
                    list.appendChild(li);
                  }
                }
                aside.appendChild(label);
                aside.appendChild(list);
                insertBlockAfterSelection(editorRef.current, aside);

                selection.removeAllRanges();
                const next = document.createRange();
                const firstLi = list.querySelector('li');
                if (firstLi) {
                  next.selectNodeContents(firstLi);
                  selection.addRange(next);
                }
              })
            }
          >
            Takeaways
          </button>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="At a glance panel"
            aria-label="At a glance panel"
            onClick={() =>
              runCommand(() => {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                const range = selection.getRangeAt(0);

                const aside = document.createElement('aside');
                aside.className = 'draft-at-a-glance';
                aside.setAttribute('data-at-a-glance', '1');

                const label = document.createElement('p');
                label.className = 'draft-at-a-glance__label';
                label.textContent = 'At a glance';

                const list = document.createElement('ul');
                if (range.collapsed) {
                  const li = document.createElement('li');
                  li.textContent = 'Add your first glance point';
                  list.appendChild(li);
                } else {
                  const extracted = range.extractContents();
                  const text = extracted.textContent?.trim();
                  if (text) {
                    text.split(/\n+/).forEach((line) => {
                      const cleaned = line.replace(/^\s*[-*•]\s*/, '').trim();
                      if (!cleaned) return;
                      const li = document.createElement('li');
                      li.textContent = cleaned;
                      list.appendChild(li);
                    });
                  }
                  if (!list.children.length) {
                    const li = document.createElement('li');
                    li.textContent = 'Add your first glance point';
                    list.appendChild(li);
                  }
                }
                aside.appendChild(label);
                aside.appendChild(list);
                insertBlockAfterSelection(editorRef.current, aside);

                selection.removeAllRanges();
                const next = document.createRange();
                next.selectNodeContents(label);
                selection.addRange(next);
              })
            }
          >
            Glance
          </button>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="TL;DR summary block"
            aria-label="TL;DR summary block"
            onClick={() =>
              runCommand(() => {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                const range = selection.getRangeAt(0);

                const aside = document.createElement('aside');
                aside.className = 'draft-tldr';
                aside.setAttribute('data-tldr', '1');

                const label = document.createElement('p');
                label.className = 'draft-tldr__label';
                label.contentEditable = 'false';
                label.textContent = 'TL;DR';

                const body = document.createElement('p');
                if (range.collapsed) {
                  body.textContent = 'Write a short TL;DR summary here.';
                } else {
                  body.appendChild(range.extractContents());
                }
                aside.appendChild(label);
                aside.appendChild(body);
                insertBlockAfterSelection(editorRef.current, aside);

                selection.removeAllRanges();
                const next = document.createRange();
                next.selectNodeContents(body);
                selection.addRange(next);
              })
            }
          >
            TL;DR
          </button>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Answer-first claim block"
            aria-label="Answer-first claim block"
            onClick={() =>
              runCommand(() => {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                const range = selection.getRangeAt(0);

                const aside = document.createElement('aside');
                aside.className = 'draft-answer-first';
                aside.setAttribute('data-answer-first', '1');

                const label = document.createElement('p');
                label.className = 'draft-answer-first__label';
                label.contentEditable = 'false';
                label.textContent = 'Answer-first';

                const body = document.createElement('p');
                if (range.collapsed) {
                  body.textContent =
                    'Write a 40–60 word extractable claim here.';
                } else {
                  body.appendChild(range.extractContents());
                }
                aside.appendChild(label);
                aside.appendChild(body);
                insertBlockAfterSelection(editorRef.current, aside);

                selection.removeAllRanges();
                const next = document.createRange();
                next.selectNodeContents(body);
                selection.addRange(next);
              })
            }
          >
            Answer
          </button>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Callout / accent block"
            aria-label="Callout / accent block"
            onClick={() =>
              runCommand(() => {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                const range = selection.getRangeAt(0);

                const aside = document.createElement('aside');
                aside.className = 'draft-callout draft-callout--tip';
                aside.setAttribute('data-callout', '1');
                aside.setAttribute('data-variant', 'tip');

                const label = document.createElement('p');
                label.className = 'draft-callout__label';
                label.contentEditable = 'false';
                label.textContent = 'Callout · tip';

                const title = document.createElement('p');
                title.className = 'draft-callout__title';
                title.textContent = 'Callout title';

                const body = document.createElement('p');
                if (range.collapsed) {
                  body.textContent =
                    'Callout body — tip, warning, or emphasis.';
                } else {
                  body.appendChild(range.extractContents());
                }

                aside.appendChild(label);
                aside.appendChild(title);
                aside.appendChild(body);
                insertBlockAfterSelection(editorRef.current, aside);

                selection.removeAllRanges();
                const next = document.createRange();
                next.selectNodeContents(title);
                selection.addRange(next);
              })
            }
          >
            Callout
          </button>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Comparison / data table"
            aria-label="Comparison / data table"
            onClick={() =>
              runCommand(() => {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;

                const wrap = document.createElement('div');
                wrap.className = 'draft-table-wrap';
                wrap.setAttribute('data-draft-table', '1');

                const table = document.createElement('table');
                const thead = document.createElement('thead');
                const headRow = document.createElement('tr');
                ['Column A', 'Column B', 'Column C'].forEach((label) => {
                  const th = document.createElement('th');
                  th.textContent = label;
                  headRow.appendChild(th);
                });
                thead.appendChild(headRow);

                const tbody = document.createElement('tbody');
                for (let r = 0; r < 2; r++) {
                  const tr = document.createElement('tr');
                  for (let c = 0; c < 3; c++) {
                    const td = document.createElement('td');
                    td.textContent = '…';
                    tr.appendChild(td);
                  }
                  tbody.appendChild(tr);
                }
                table.appendChild(thead);
                table.appendChild(tbody);
                wrap.appendChild(table);
                insertBlockAfterSelection(editorRef.current, wrap);

                selection.removeAllRanges();
                const next = document.createRange();
                const firstCell = table.querySelector('tbody td');
                if (firstCell) {
                  next.selectNodeContents(firstCell);
                  selection.addRange(next);
                }
              })
            }
          >
            Table
          </button>
          <button
            type="button"
            className={`draft-toolbox__btn ${imageOpen ? 'draft-toolbox__btn--active' : ''}`}
            title="Insert image"
            aria-label="Insert image"
            aria-expanded={imageOpen}
            onClick={() => {
              saveSelection();
              setEmojiOpen(false);
              clearImageSelection();
              setImageOpen((open) => !open);
              setImageError('');
              setImageCaption('');
            }}
          >
            Img
          </button>
          <button
            type="button"
            className={`draft-toolbox__btn ${emojiOpen ? 'draft-toolbox__btn--active' : ''}`}
            title="Insert emoji"
            aria-label="Insert emoji"
            aria-expanded={emojiOpen}
            onClick={() => {
              saveSelection();
              setImageOpen(false);
              setEmojiOpen((open) => !open);
            }}
          >
            Emoji
          </button>
        </div>

        <div className="draft-toolbox__group" aria-label="Alignment">
          <span className="draft-toolbox__label">Align</span>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Align left"
            aria-label="Align left"
            onClick={() =>
              runCommand(() => applyAlign(editorRef.current, 'left'))
            }
          >
            Left
          </button>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Align center"
            aria-label="Align center"
            onClick={() =>
              runCommand(() => applyAlign(editorRef.current, 'center'))
            }
          >
            Center
          </button>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Align right"
            aria-label="Align right"
            onClick={() =>
              runCommand(() => applyAlign(editorRef.current, 'right'))
            }
          >
            Right
          </button>
        </div>

        <div className="draft-toolbox__group" aria-label="Text size">
          <span className="draft-toolbox__label">Size</span>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Smaller text"
            aria-label="Smaller text"
            onClick={() => stepSize(-1)}
          >
            A−
          </button>
          <button
            type="button"
            className="draft-toolbox__btn"
            title="Larger text"
            aria-label="Larger text"
            onClick={() => stepSize(1)}
          >
            A+
          </button>
        </div>

        <div className="draft-toolbox__group" aria-label="Brand colors">
          <span className="draft-toolbox__label">Color</span>
          {BRAND_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              className="draft-toolbox__swatch"
              title={color.label}
              aria-label={`Color ${color.label}`}
              style={{ background: color.hex }}
              onClick={() => applyBrand(color.id)}
            />
          ))}
        </div>

        <div className="draft-toolbox__group" aria-label="Brand fonts">
          <span className="draft-toolbox__label">Font</span>
          {BRAND_FONTS.map((font) => (
            <button
              key={font.id}
              type="button"
              className="draft-toolbox__btn"
              title={font.label}
              aria-label={`Font ${font.label}`}
              style={{ fontFamily: font.stack }}
              onClick={() => applyFont(font.id)}
            >
              {font.label}
            </button>
          ))}
        </div>
      </div>

      {emojiOpen ? (
        <div className="draft-emoji-panel" role="listbox" aria-label="Emoji picker">
          <p className="draft-emoji-panel__hint">
            Click an emoji to insert it at the cursor.
          </p>
          <div className="draft-emoji-panel__grid">
            {TOOLBOX_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="draft-emoji-panel__btn"
                title={`Insert ${emoji}`}
                aria-label={`Insert ${emoji}`}
                onMouseDown={() => saveSelection()}
                onClick={() => insertEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {imageOpen ? (
        <div className="draft-image-panel">
          <p className="draft-image-panel__hint">
            {editingExisting
              ? 'Edit the selected image — update alt text and caption, or remove it.'
              : 'Upload to images/uploads/ or paste an image URL. The editor shows the image live.'}
          </p>
          {editingExisting ? (
            <div className="draft-image-panel__meta">
              <span className="draft-image-panel__meta-label">File</span>
              <code className="draft-image-panel__filename" title={imageUrl}>
                {imageFilename(imageUrl)}
              </code>
              <div className="draft-image-panel__filename-actions">
                <button
                  type="button"
                  className="admin-btn-ghost draft-image-panel__chip"
                  title="Use filename for alt text"
                  onClick={() =>
                    setImageAlt(imageFilenameLabel(imageUrl) || imageFilename(imageUrl))
                  }
                >
                  Use as alt
                </button>
                <button
                  type="button"
                  className="admin-btn-ghost draft-image-panel__chip"
                  title="Use filename for caption"
                  onClick={() =>
                    setImageCaption(
                      imageFilenameLabel(imageUrl) || imageFilename(imageUrl),
                    )
                  }
                >
                  Use as caption
                </button>
              </div>
            </div>
          ) : null}
          <div className="draft-image-panel__row">
            <label className="admin-label mb-0" htmlFor="draft-image-alt">
              Alt text
            </label>
            <input
              id="draft-image-alt"
              className="admin-input"
              placeholder="Describe the image for accessibility"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              onMouseDown={() => saveSelection()}
            />
          </div>
          <div className="draft-image-panel__row">
            <label className="admin-label mb-0" htmlFor="draft-image-caption">
              Caption
            </label>
            <input
              id="draft-image-caption"
              className="admin-input"
              placeholder="Optional caption shown under the image"
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value)}
              onMouseDown={() => saveSelection()}
            />
          </div>
          {!editingExisting ? (
            <div className="draft-image-panel__row">
              <label className="admin-label mb-0" htmlFor="draft-image-url">
                Image URL
              </label>
              <input
                id="draft-image-url"
                className="admin-input"
                placeholder="https://… or ../images/…"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onMouseDown={() => saveSelection()}
              />
            </div>
          ) : null}
          <div className="draft-image-panel__actions">
            {editingExisting ? (
              <>
                <button
                  type="button"
                  className="admin-btn-primary"
                  onClick={applySelectedImage}
                >
                  Save image details
                </button>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={removeSelectedImage}
                >
                  Remove image
                </button>
                <button
                  type="button"
                  className="admin-btn-ghost"
                  onClick={() => {
                    clearImageSelection();
                    setImageOpen(false);
                    setImageError('');
                  }}
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                  className="sr-only"
                  onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  className="admin-btn-secondary"
                  disabled={imageBusy}
                  onClick={() => {
                    saveSelection();
                    fileInputRef.current?.click();
                  }}
                >
                  {imageBusy ? 'Uploading…' : 'Upload file'}
                </button>
                <button
                  type="button"
                  className="admin-btn-primary"
                  disabled={imageBusy || !imageUrl.trim()}
                  onClick={() => insertImage(imageUrl, imageAlt, imageCaption)}
                >
                  Insert URL
                </button>
                <button
                  type="button"
                  className="admin-btn-ghost"
                  onClick={() => {
                    setImageOpen(false);
                    setImageError('');
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
          {imageError ? (
            <p className="admin-error" role="alert">
              {imageError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface FormattedTextareaProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'onInput' | 'value'> {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  showToolbox?: boolean;
  /** Keep the formatting toolbox visible while scrolling this editor. */
  stickyToolbox?: boolean;
  className?: string;
  placeholder?: string;
  rows?: number;
  'aria-invalid'?: boolean;
}

export function FormattedTextarea({
  value,
  onChange,
  showToolbox = true,
  stickyToolbox = false,
  className,
  placeholder,
  rows = 8,
  id,
  ...rest
}: FormattedTextareaProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(value);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const historyTimerRef = useRef<number | null>(null);
  const applyingHistoryRef = useRef(false);
  const [historyUi, setHistoryUi] = useState({ canUndo: false, canRedo: false });
  const [selectedFigure, setSelectedFigure] = useState<HTMLElement | null>(null);
  const [pasteImageBusy, setPasteImageBusy] = useState(false);
  const minHeight = Math.max(7, rows) * 1.55;

  const syncHistoryUi = useCallback(() => {
    const idx = historyIndexRef.current;
    const len = historyRef.current.length;
    setHistoryUi({
      canUndo: idx > 0,
      canRedo: idx >= 0 && idx < len - 1,
    });
  }, []);

  const pushHistory = useCallback(
    (html: string, opts?: { immediate?: boolean }) => {
      if (applyingHistoryRef.current) return;

      const commit = () => {
        const hist = historyRef.current;
        const idx = historyIndexRef.current;
        if (hist[idx] === html) {
          syncHistoryUi();
          return;
        }
        const next = hist.slice(0, idx + 1);
        next.push(html);
        // Cap stack so long editing sessions stay light.
        while (next.length > 80) {
          next.shift();
        }
        historyRef.current = next;
        historyIndexRef.current = next.length - 1;
        syncHistoryUi();
      };

      if (opts?.immediate) {
        if (historyTimerRef.current != null) {
          window.clearTimeout(historyTimerRef.current);
          historyTimerRef.current = null;
        }
        commit();
        return;
      }

      if (historyTimerRef.current != null) {
        window.clearTimeout(historyTimerRef.current);
      }
      historyTimerRef.current = window.setTimeout(() => {
        historyTimerRef.current = null;
        commit();
      }, 350);
    },
    [syncHistoryUi],
  );

  const emitFromDom = useCallback(
    (opts?: { recordHistory?: 'debounce' | 'immediate' | false }) => {
      const el = editorRef.current;
      if (!el) return;
      const markdown = editorHtmlToMarkdown(el.innerHTML);
      lastEmitted.current = markdown;
      onChange(markdown);
      if (opts?.recordHistory === false || applyingHistoryRef.current) return;
      pushHistory(
        el.innerHTML,
        opts?.recordHistory === 'immediate' ? { immediate: true } : undefined,
      );
    },
    [onChange, pushHistory],
  );

  const applyHistoryHtml = useCallback(
    (html: string) => {
      const el = editorRef.current;
      if (!el) return;
      applyingHistoryRef.current = true;
      el.innerHTML = html;
      const markdown = editorHtmlToMarkdown(html);
      lastEmitted.current = markdown;
      onChange(markdown);
      syncHistoryUi();
      applyingHistoryRef.current = false;
      focusEditor(el);
    },
    [onChange, syncHistoryUi],
  );

  const undo = useCallback(() => {
    if (historyTimerRef.current != null) {
      // Flush pending typed state before stepping back.
      window.clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
      const el = editorRef.current;
      if (el) {
        const hist = historyRef.current;
        const idx = historyIndexRef.current;
        if (hist[idx] !== el.innerHTML) {
          const next = hist.slice(0, idx + 1);
          next.push(el.innerHTML);
          historyRef.current = next;
          historyIndexRef.current = next.length - 1;
        }
      }
    }
    if (historyIndexRef.current <= 0) {
      syncHistoryUi();
      return;
    }
    historyIndexRef.current -= 1;
    applyHistoryHtml(historyRef.current[historyIndexRef.current] || '');
  }, [applyHistoryHtml, syncHistoryUi]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) {
      syncHistoryUi();
      return;
    }
    historyIndexRef.current += 1;
    applyHistoryHtml(historyRef.current[historyIndexRef.current] || '');
  }, [applyHistoryHtml, syncHistoryUi]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value === lastEmitted.current) return;
    el.innerHTML = markdownToEditorHtml(value);
    lastEmitted.current = value;
    if (!applyingHistoryRef.current) {
      pushHistory(el.innerHTML, { immediate: true });
    }
  }, [value, pushHistory]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (!el.innerHTML.trim()) {
      el.innerHTML = markdownToEditorHtml(value);
      lastEmitted.current = value;
    }
    pushHistory(el.innerHTML, { immediate: true });
    // Mount-only seed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (historyTimerRef.current != null) {
        window.clearTimeout(historyTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="draft-editor-field">
      {showToolbox ? (
        <DraftFormatToolbar
          editorRef={editorRef}
          sticky={stickyToolbox}
          selectedFigure={selectedFigure}
          onSelectedFigureChange={setSelectedFigure}
          onBeforeMutate={() => {
            const el = editorRef.current;
            if (el) pushHistory(el.innerHTML, { immediate: true });
          }}
          onMutate={() => emitFromDom({ recordHistory: 'immediate' })}
          onUndo={undo}
          onRedo={redo}
          canUndo={historyUi.canUndo}
          canRedo={historyUi.canRedo}
        />
      ) : null}
      <div
        {...rest}
        id={id}
        ref={editorRef}
        className={`draft-visual-editor admin-input ${className || ''}`}
        style={{ minHeight: `${minHeight}rem` }}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder || ''}
        suppressContentEditableWarning
        onPaste={(e) => {
          const result = processEditorPaste(e.nativeEvent);
          if (result.kind === 'unhandled') return;
          if (result.kind === 'images') {
            const el = editorRef.current;
            if (el) pushHistory(el.innerHTML, { immediate: true });
            setPasteImageBusy(true);
            void (async () => {
              try {
                focusEditor(editorRef.current);
                for (const file of result.files) {
                  const src = await uploadDraftImageFile(file);
                  const figure = createEditorFigureElement(
                    src,
                    defaultAltForImageFile(file),
                  );
                  insertFigureAtSelection(figure);
                }
                emitFromDom({ recordHistory: 'immediate' });
              } catch {
                // Upload failed — keep existing content unchanged.
              } finally {
                setPasteImageBusy(false);
              }
            })();
            return;
          }
          emitFromDom({ recordHistory: 'immediate' });
        }}
        aria-busy={pasteImageBusy}
        onInput={() => emitFromDom({ recordHistory: 'debounce' })}
        onBlur={() => emitFromDom({ recordHistory: 'immediate' })}
        onClick={(e) => {
          const target = e.target as HTMLElement;

          const figure = target.closest(
            '.draft-editor-figure',
          ) as HTMLElement | null;
          if (figure && editorRef.current?.contains(figure)) {
            setSelectedFigure(figure);
            return;
          }
          if (selectedFigure) {
            setSelectedFigure(null);
          }

          const label = target.closest('.draft-callout__label');
          if (!label || !editorRef.current?.contains(label)) return;
          const aside = label.closest('[data-callout]') as HTMLElement | null;
          if (!aside) return;
          const order = ['tip', 'pitfall', 'accent'] as const;
          const current = aside.getAttribute('data-variant') || 'tip';
          const idx = order.indexOf(current as (typeof order)[number]);
          const next = order[(idx + 1) % order.length];
          aside.setAttribute('data-variant', next);
          aside.className = `draft-callout draft-callout--${next}`;
          label.textContent = `Callout · ${next}`;
          emitFromDom({ recordHistory: 'immediate' });
        }}
        onKeyDown={(e) => {
          const mod = e.metaKey || e.ctrlKey;
          if (!mod) return;
          const key = e.key.toLowerCase();
          if (key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
            return;
          }
          if (key === 'y' || (key === 'z' && e.shiftKey)) {
            e.preventDefault();
            redo();
          }
        }}
      />
    </div>
  );
}
