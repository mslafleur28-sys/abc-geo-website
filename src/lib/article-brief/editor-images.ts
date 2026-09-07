import { imageFilenameLabel, toPreviewImageSrc } from './image-paths';

/** Build a draft-editor figure node for the contenteditable surface. */
export function createEditorFigureElement(
  publishSrc: string,
  alt: string,
  caption = '',
): HTMLElement {
  const figure = document.createElement('figure');
  figure.className = 'draft-editor-figure';
  figure.contentEditable = 'false';
  figure.setAttribute('data-draft-image', '1');

  const img = document.createElement('img');
  img.src = toPreviewImageSrc(publishSrc);
  img.alt = alt.trim() || 'Article image';
  img.setAttribute('data-draft-src', publishSrc);
  img.setAttribute('data-draft-image', '1');

  const captionEl = document.createElement('figcaption');
  captionEl.className = 'draft-editor-figure__caption';
  const trimmedCaption = caption.trim();
  if (trimmedCaption) {
    figure.setAttribute('data-draft-caption', trimmedCaption);
    captionEl.textContent = trimmedCaption;
  } else {
    captionEl.classList.add('draft-editor-figure__caption--empty');
    captionEl.setAttribute('hidden', '');
  }

  figure.appendChild(img);
  figure.appendChild(captionEl);
  return figure;
}

export function insertFigureAtSelection(figure: HTMLElement) {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.collapse(false);
    range.insertNode(figure);
    const spacer = document.createElement('p');
    spacer.innerHTML = '<br>';
    figure.after(spacer);
    return;
  }

  const editor = document.activeElement;
  if (editor instanceof HTMLElement && editor.isContentEditable) {
    editor.appendChild(figure);
    const spacer = document.createElement('p');
    spacer.innerHTML = '<br>';
    editor.appendChild(spacer);
  }
}

export async function uploadDraftImageFile(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch('/api/articles/media', { method: 'POST', body });
  const data = (await res.json()) as {
    ok?: boolean;
    src?: string;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.src) {
    throw new Error(data.error || 'Image upload failed.');
  }
  return data.src;
}

export function defaultAltForImageFile(file: File): string {
  return imageFilenameLabel(file.name) || file.name.replace(/\.[^.]+$/, '') || 'Article image';
}
