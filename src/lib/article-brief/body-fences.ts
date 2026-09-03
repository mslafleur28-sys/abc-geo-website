/** Shared fence + pipe-table helpers for draft body blocks. */

export type FenceKind =
  | 'takeaways'
  | 'callout'
  | 'answer-first'
  | 'at-a-glance'
  | 'tldr'
  | 'table';

export type CalloutVariant = 'tip' | 'pitfall' | 'accent';

const FENCE_ALIASES: Record<string, FenceKind> = {
  takeaways: 'takeaways',
  takeaway: 'takeaways',
  callout: 'callout',
  accent: 'callout',
  'answer-first': 'answer-first',
  answerfirst: 'answer-first',
  answer: 'answer-first',
  'at-a-glance': 'at-a-glance',
  ataglance: 'at-a-glance',
  glance: 'at-a-glance',
  tldr: 'tldr',
  'tl-dr': 'tldr',
  table: 'table',
  comparison: 'table',
};

export function parseFenceOpen(
  line: string,
): { kind: FenceKind; variant: string } | null {
  const m = line.trim().match(/^:::([a-z0-9_-]+)(?:\s+([a-z0-9_-]+))?\s*$/i);
  if (!m) return null;
  const kind = FENCE_ALIASES[m[1].toLowerCase()];
  if (!kind) return null;
  return { kind, variant: (m[2] || '').toLowerCase() };
}

export function isFenceClose(line: string): boolean {
  return /^:::\s*$/.test(line.trim());
}

export function normalizeCalloutVariant(raw?: string): CalloutVariant {
  const v = (raw || '').toLowerCase();
  if (v === 'pitfall' || v === 'warning' || v === 'warn') return 'pitfall';
  if (v === 'accent' || v === 'note' || v === 'info') return 'accent';
  return 'tip';
}

export function isPipeTableRow(line: string): boolean {
  const t = line.trim();
  if (!t.includes('|')) return false;
  // Avoid treating emphasis pipes alone as tables.
  return /^\|?.+\|.+\|?$/.test(t) && t.replace(/\|/g, '').trim().length > 0;
}

export function isPipeTableSeparator(line: string): boolean {
  const t = line.trim();
  if (!t.includes('|') || !/-{2,}/.test(t)) return false;
  return /^[\s|:-]+$/.test(t);
}

export function parsePipeRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

export function parsePipeTable(
  lines: string[],
): { headers: string[]; rows: string[][] } | null {
  const useful = lines.map((l) => l.trim()).filter(Boolean);
  if (useful.length < 2) return null;
  if (!isPipeTableRow(useful[0])) return null;

  const headers = parsePipeRow(useful[0]);
  let start = 1;
  if (isPipeTableSeparator(useful[1])) start = 2;

  const rows = useful
    .slice(start)
    .filter((l) => isPipeTableRow(l) && !isPipeTableSeparator(l))
    .map(parsePipeRow)
    .map((row) => {
      while (row.length < headers.length) row.push('');
      return row.slice(0, Math.max(headers.length, row.length));
    });

  if (!headers.length) return null;
  return { headers, rows };
}

export function serializePipeTable(
  headers: string[],
  rows: string[][],
): string[] {
  const cols = Math.max(
    headers.length,
    ...rows.map((r) => r.length),
    1,
  );
  const pad = (cells: string[]) => {
    const next = [...cells];
    while (next.length < cols) next.push('');
    return next.slice(0, cols);
  };
  const head = pad(headers.length ? headers : ['Column A', 'Column B', 'Column C']);
  const sep = head.map(() => '---');
  const body =
    rows.length > 0
      ? rows.map((r) => pad(r))
      : [head.map(() => '…')];

  return [
    `| ${head.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...body.map((r) => `| ${r.join(' | ')} |`),
  ];
}

export function splitCalloutFenceLines(lines: string[]): {
  title: string;
  text: string;
  variantHint?: string;
} {
  const cleaned = lines.map((l) => l.trim()).filter(Boolean);
  if (!cleaned.length) {
    return { title: '', text: '' };
  }

  const heading = cleaned[0].match(/^#{1,3}\s+(.+)$/);
  if (heading) {
    return {
      title: heading[1].trim(),
      text: cleaned.slice(1).join('\n\n'),
      variantHint: heading[1].toLowerCase().startsWith('pitfall')
        ? 'pitfall'
        : undefined,
    };
  }

  if (cleaned.length > 1) {
    return {
      title: cleaned[0].replace(/^\*\*(.+)\*\*$/, '$1').trim(),
      text: cleaned.slice(1).join('\n\n'),
    };
  }

  return { title: '', text: cleaned[0] };
}

export function parseFenceListItems(lines: string[]): string[] {
  return lines
    .map((line) => {
      const item = line.match(/^\s*[-*]\s+(.+)\s*$/);
      return (item ? item[1] : line).trim();
    })
    .filter(Boolean);
}

/** First non-list lines become the glance heading; bullets become list items. */
export function parseAtAGlanceFence(lines: string[]): {
  title: string;
  items: string[];
} {
  const items: string[] = [];
  const titleParts: string[] = [];
  let seenList = false;

  for (const line of lines) {
    const item = line.match(/^\s*[-*]\s+(.+)\s*$/);
    if (item) {
      seenList = true;
      items.push(item[1].trim());
      continue;
    }
    const cleaned = line.replace(/^#{1,3}\s+/, '').trim();
    if (!cleaned) continue;
    if (!seenList) {
      titleParts.push(cleaned);
    }
  }

  return {
    title: titleParts.join(' ').trim() || 'At a glance',
    items,
  };
}
