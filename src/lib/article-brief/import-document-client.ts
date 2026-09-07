export interface ImportDocumentResponse {
  rawBody: string;
  warnings: string[];
  filename: string;
}

/** Upload a document and return converted draft body markup. */
export async function importDocumentFile(
  file: File,
): Promise<ImportDocumentResponse> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch('/api/articles/import', {
    method: 'POST',
    body: form,
  });

  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    rawBody?: string;
    warnings?: string[];
    filename?: string;
  };

  if (!res.ok || !data.ok || typeof data.rawBody !== 'string') {
    throw new Error(data.error || 'Failed to import document.');
  }

  return {
    rawBody: data.rawBody,
    warnings: data.warnings ?? [],
    filename: data.filename || file.name,
  };
}
