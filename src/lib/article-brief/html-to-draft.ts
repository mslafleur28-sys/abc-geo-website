import { parseHTML, Node as LinkedomNode } from 'linkedom';
import { draftBodyFromHtmlFragment } from './editor-codec';

// editor-codec references global Node (browser API). Polyfill for Node.js / scripts.
if (typeof globalThis.Node === 'undefined') {
  (globalThis as { Node: typeof LinkedomNode }).Node = LinkedomNode;
}

/** Server-side HTML → draft body conversion for document import. */
export function importHtmlToDraftBody(html: string): string {
  const { document } = parseHTML('<!DOCTYPE html><html><body></body></html>');
  return draftBodyFromHtmlFragment(html, document as unknown as Document);
}
