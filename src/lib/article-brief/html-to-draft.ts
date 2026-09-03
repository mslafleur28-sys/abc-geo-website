import { parseHTML } from 'linkedom';
import { draftBodyFromHtmlFragment } from './editor-codec';

/** Server-side HTML → draft body conversion for document import. */
export function importHtmlToDraftBody(html: string): string {
  const { document } = parseHTML('<!DOCTYPE html><html><body></body></html>');
  return draftBodyFromHtmlFragment(html, document as unknown as Document);
}
