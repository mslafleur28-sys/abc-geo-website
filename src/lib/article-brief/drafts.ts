import { access, mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildFrontmatterMarkdown, buildJsonPayload } from './format';
import {
  DRAFT_STATUSES,
  DEFAULT_STYLISTIC_OVERRIDES,
  isDraftStatus,
  isValidSlug,
  normalizeBrief,
  slugifyFilename,
  type ArticleBriefInput,
  type ArticleDraftRecord,
  type DraftStatus,
  type KeyDefinition,
  type StylisticOverrideId,
} from './schema';

export const DRAFTS_DIR = path.join(process.cwd(), 'content', 'drafts');
export const PUBLISHED_DIR = path.join(process.cwd(), 'content', 'published');
/** Per-save snapshots live here: content/.versions/{slug}/{timestamp}.md */
export const VERSIONS_DIR = path.join(process.cwd(), 'content', '.versions');
/** Keep version backups for one week; live drafts are never pruned. */
export const VERSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const OVERRIDE_IDS = new Set(
  [
    'executive_answer_box',
    'ab_equation_strip',
    'answer_first_per_h2',
    'key_takeaways',
    'comparison_table',
    'callout_blocks',
    'tool_embed_banner',
    'code_jsonld_example',
    'faq_schema',
    'toc_sidebar',
    'reading_progress',
  ] as StylisticOverrideId[],
);

export interface DraftListItem {
  slug: string;
  title: string;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
  answerFirstPreview: string;
  filename: string;
  format: 'markdown' | 'json';
  relativePath: string;
  location: 'drafts' | 'published';
}

function assertSafeSlug(slug: string): string {
  const clean = slugifyFilename(slug);
  if (
    !isValidSlug(clean) ||
    clean.includes('..') ||
    clean.includes('/') ||
    clean.includes('\\')
  ) {
    throw new Error('Invalid draft slug.');
  }
  return clean;
}

function titleFromBrief(brief: ArticleBriefInput): string {
  return (
    brief.targetQuestion.replace(/\?$/, '').trim() ||
    brief.slug.replace(/-/g, ' ')
  );
}

function previewText(value: string, max = 140): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1)}…`;
}

function unquote(value: string): string {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }
  return v;
}

/** Minimal frontmatter parser for the fields we write. */
function parseFrontmatter(raw: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const trimmed = raw.replace(/^\uFEFF/, '');
  if (!trimmed.startsWith('---')) {
    return { data: {}, body: trimmed };
  }
  const end = trimmed.indexOf('\n---', 3);
  if (end === -1) {
    return { data: {}, body: trimmed };
  }
  const fm = trimmed.slice(4, end).trim();
  const body = trimmed.slice(end + 4).replace(/^\n/, '');
  const data: Record<string, unknown> = {};
  const lines = fm.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const blockMatch = line.match(/^([A-Za-z0-9_]+):\s*\|\s*$/);
    if (blockMatch) {
      const key = blockMatch[1];
      const collected: string[] = [];
      i += 1;
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i] === '')) {
        collected.push(lines[i].startsWith('  ') ? lines[i].slice(2) : '');
        i += 1;
      }
      data[key] = collected.join('\n').replace(/\n$/, '');
      continue;
    }

    const listKey = line.match(/^([A-Za-z0-9_]+):\s*$/);
    if (listKey) {
      const key = listKey[1];
      i += 1;
      if (i < lines.length && lines[i].trim() === '[]') {
        data[key] = [];
        i += 1;
        continue;
      }
      if (key === 'keyDefinitions') {
        const defs: KeyDefinition[] = [];
        while (i < lines.length && lines[i].startsWith('  - ')) {
          const termLine = lines[i];
          const term = unquote(termLine.replace(/^\s*-\s*term:\s*/, ''));
          i += 1;
          let definition = '';
          if (i < lines.length && /^\s+definition:/.test(lines[i])) {
            definition = unquote(lines[i].replace(/^\s*definition:\s*/, ''));
            i += 1;
          }
          if (term) defs.push({ term, definition });
        }
        data[key] = defs;
        continue;
      }
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('  - ')) {
        items.push(unquote(lines[i].replace(/^\s*-\s*/, '')));
        i += 1;
      }
      data[key] = items;
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (kv) {
      const [, key, rest] = kv;
      if (rest.trim() === '[]') {
        data[key] = [];
      } else {
        data[key] = unquote(rest);
      }
    }
    i += 1;
  }

  return { data, body };
}

function sectionAfterHeading(body: string, heading: string): string {
  const knownStops =
    'Target question|Answer-first summary|Raw body|Key definitions|Stylistic notes|Site writing guidelines|Site styling guidelines';
  const re = new RegExp(
    `##\\s+${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+(?:${knownStops})\\b|$)`,
    'i',
  );
  const match = body.match(re);
  return match ? match[1].trim() : '';
}

function coerceOverrides(value: unknown): StylisticOverrideId[] {
  if (!Array.isArray(value)) return [...DEFAULT_STYLISTIC_OVERRIDES];
  return value.filter(
    (id): id is StylisticOverrideId =>
      typeof id === 'string' && OVERRIDE_IDS.has(id as StylisticOverrideId),
  );
}

function coerceDefinitions(value: unknown): KeyDefinition[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const term = typeof row.term === 'string' ? row.term.trim() : '';
      const definition =
        typeof row.definition === 'string' ? row.definition.trim() : '';
      if (!term || !definition) return null;
      return { term, definition };
    })
    .filter((d): d is KeyDefinition => Boolean(d));
}

function briefFromParts(
  slugHint: string,
  data: Record<string, unknown>,
  body: string,
): ArticleBriefInput {
  const fromBodyQuestion = sectionAfterHeading(body, 'Target question');
  const fromBodySummary = sectionAfterHeading(body, 'Answer-first summary');
  const fromBodyRaw = sectionAfterHeading(body, 'Raw body');
  const fromBodyNotes = sectionAfterHeading(body, 'Stylistic notes');

  const slug =
    slugifyFilename(
      typeof data.slug === 'string' && data.slug ? data.slug : slugHint,
    ) || slugHint;

  return {
    slug,
    targetQuestion:
      (typeof data.targetQuestion === 'string' && data.targetQuestion) ||
      fromBodyQuestion ||
      '',
    answerFirstSummary:
      (typeof data.answerFirstSummary === 'string' &&
        data.answerFirstSummary) ||
      fromBodySummary ||
      (typeof data.description === 'string' ? data.description : '') ||
      '',
    rawBody:
      (typeof data.rawBody === 'string' && data.rawBody) || fromBodyRaw || '',
    keyDefinitions: coerceDefinitions(data.keyDefinitions),
    stylisticOverrides: coerceOverrides(data.stylisticOverrides),
    stylisticNotes:
      (typeof data.stylisticNotes === 'string' && data.stylisticNotes) ||
      fromBodyNotes ||
      '',
  };
}

function recordFromMarkdown(
  filename: string,
  relativePath: string,
  raw: string,
  statsCreated: string,
  statsUpdated: string,
): ArticleDraftRecord {
  const slugHint = slugifyFilename(filename.replace(/\.(md|markdown)$/i, ''));
  const { data, body } = parseFrontmatter(raw);
  const brief = briefFromParts(slugHint, data, body);
  const status: DraftStatus = isDraftStatus(data.status)
    ? data.status
    : relativePath.includes('/published/')
      ? 'published'
      : 'draft';
  const title =
    (typeof data.title === 'string' && data.title.trim()) ||
    titleFromBrief(brief);

  return {
    brief,
    title,
    status,
    createdAt:
      (typeof data.createdAt === 'string' && data.createdAt) || statsCreated,
    updatedAt:
      (typeof data.updatedAt === 'string' && data.updatedAt) || statsUpdated,
    filename,
    format: 'markdown',
    relativePath,
  };
}

function recordFromJson(
  filename: string,
  relativePath: string,
  raw: string,
  statsCreated: string,
  statsUpdated: string,
): ArticleDraftRecord {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const briefSource =
    parsed.brief && typeof parsed.brief === 'object'
      ? (parsed.brief as Record<string, unknown>)
      : parsed;

  const slugHint = slugifyFilename(
    (typeof briefSource.slug === 'string' && briefSource.slug) ||
      filename.replace(/\.json$/i, ''),
  );

  const brief = normalizeBrief({
    slug: slugHint,
    targetQuestion:
      typeof briefSource.targetQuestion === 'string'
        ? briefSource.targetQuestion
        : '',
    answerFirstSummary:
      typeof briefSource.answerFirstSummary === 'string'
        ? briefSource.answerFirstSummary
        : '',
    rawBody:
      typeof briefSource.rawBody === 'string' ? briefSource.rawBody : '',
    keyDefinitions: coerceDefinitions(briefSource.keyDefinitions),
    stylisticOverrides: coerceOverrides(briefSource.stylisticOverrides),
    stylisticNotes:
      typeof briefSource.stylisticNotes === 'string'
        ? briefSource.stylisticNotes
        : '',
  });

  const status: DraftStatus = isDraftStatus(parsed.status)
    ? parsed.status
    : isDraftStatus(briefSource.status)
      ? briefSource.status
      : relativePath.includes('/published/')
        ? 'published'
        : 'draft';

  return {
    brief,
    title:
      (typeof parsed.title === 'string' && parsed.title) ||
      titleFromBrief(brief),
    status,
    createdAt:
      (typeof parsed.createdAt === 'string' && parsed.createdAt) ||
      statsCreated,
    updatedAt:
      (typeof parsed.updatedAt === 'string' && parsed.updatedAt) ||
      statsUpdated,
    filename,
    format: 'json',
    relativePath,
  };
}

async function ensureDirs() {
  await mkdir(DRAFTS_DIR, { recursive: true });
  await mkdir(PUBLISHED_DIR, { recursive: true });
  await mkdir(VERSIONS_DIR, { recursive: true });
}

function versionTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/**
 * Snapshot a saved draft under content/.versions/{slug}/, then delete
 * snapshots older than VERSION_RETENTION_MS for that slug.
 * The live draft/published file is never removed by this.
 */
async function backupDraftVersion(
  slug: string,
  contents: string,
  extension: '.md' | '.json',
): Promise<void> {
  const clean = assertSafeSlug(slug);
  const dir = path.join(VERSIONS_DIR, clean);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${versionTimestamp()}${extension}`);
  await writeFile(filePath, contents, 'utf8');
  await pruneVersionBackups(clean);
}

async function pruneVersionBackups(slug: string): Promise<void> {
  const clean = assertSafeSlug(slug);
  const dir = path.join(VERSIONS_DIR, clean);
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  const cutoff = Date.now() - VERSION_RETENTION_MS;
  const { stat, rmdir } = await import('node:fs/promises');

  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isFile()) return;
      const absolutePath = path.join(dir, entry.name);
      try {
        const s = await stat(absolutePath);
        if (s.mtimeMs < cutoff) {
          await unlink(absolutePath);
        }
      } catch {
        /* ignore race / missing */
      }
    }),
  );

  // Drop empty slug folders after pruning.
  try {
    const remaining = await readdir(dir);
    if (remaining.length === 0) {
      await rmdir(dir);
    }
  } catch {
    /* ignore */
  }
}

async function fileTimes(absolutePath: string): Promise<{
  createdAt: string;
  updatedAt: string;
}> {
  const { stat } = await import('node:fs/promises');
  const s = await stat(absolutePath);
  const birth =
    s.birthtimeMs && s.birthtimeMs > 0 ? s.birthtime : s.mtime;
  return {
    createdAt: birth.toISOString(),
    updatedAt: s.mtime.toISOString(),
  };
}

async function readDraftFile(
  absolutePath: string,
  relativePath: string,
): Promise<ArticleDraftRecord | null> {
  const filename = path.basename(absolutePath);
  if (/^readme\.md$/i.test(filename)) return null;
  const lower = filename.toLowerCase();
  if (!lower.endsWith('.md') && !lower.endsWith('.markdown') && !lower.endsWith('.json')) {
    return null;
  }

  const raw = await readFile(absolutePath, 'utf8');
  const times = await fileTimes(absolutePath);
  try {
    if (lower.endsWith('.json')) {
      return recordFromJson(
        filename,
        relativePath,
        raw,
        times.createdAt,
        times.updatedAt,
      );
    }
    return recordFromMarkdown(
      filename,
      relativePath,
      raw,
      times.createdAt,
      times.updatedAt,
    );
  } catch {
    return null;
  }
}

async function scanDirectory(
  dir: string,
  location: 'drafts' | 'published',
): Promise<ArticleDraftRecord[]> {
  try {
    await access(dir);
  } catch {
    return [];
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const records: ArticleDraftRecord[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.posix.join('content', location, entry.name);
    const record = await readDraftFile(absolutePath, relativePath);
    if (record) records.push(record);
  }

  return records;
}

export async function listDrafts(): Promise<DraftListItem[]> {
  await ensureDirs();
  const [drafts, published] = await Promise.all([
    scanDirectory(DRAFTS_DIR, 'drafts'),
    scanDirectory(PUBLISHED_DIR, 'published'),
  ]);

  const items: DraftListItem[] = [...drafts, ...published].map((r) => ({
    slug: r.brief.slug,
    title: r.title,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    answerFirstPreview: previewText(r.brief.answerFirstSummary),
    filename: r.filename,
    format: r.format,
    relativePath: r.relativePath,
    location: r.relativePath.includes('/published/')
      ? 'published'
      : 'drafts',
  }));

  items.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return items;
}

async function findDraftPath(
  slug: string,
): Promise<{ absolutePath: string; relativePath: string } | null> {
  const clean = assertSafeSlug(slug);
  const candidates = [
    {
      absolutePath: path.join(DRAFTS_DIR, `${clean}.md`),
      relativePath: path.posix.join('content', 'drafts', `${clean}.md`),
    },
    {
      absolutePath: path.join(DRAFTS_DIR, `${clean}.json`),
      relativePath: path.posix.join('content', 'drafts', `${clean}.json`),
    },
    {
      absolutePath: path.join(PUBLISHED_DIR, `${clean}.md`),
      relativePath: path.posix.join('content', 'published', `${clean}.md`),
    },
    {
      absolutePath: path.join(PUBLISHED_DIR, `${clean}.json`),
      relativePath: path.posix.join('content', 'published', `${clean}.json`),
    },
  ];

  for (const c of candidates) {
    try {
      await access(c.absolutePath);
      return c;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function getDraft(slug: string): Promise<ArticleDraftRecord | null> {
  await ensureDirs();
  const found = await findDraftPath(slug);
  if (!found) return null;
  return readDraftFile(found.absolutePath, found.relativePath);
}

export function serializeDraft(
  briefInput: ArticleBriefInput,
  options: {
    status: DraftStatus;
    createdAt: string;
    updatedAt: string;
    format?: 'markdown' | 'json';
  },
): { contents: string; extension: '.md' | '.json' } {
  const brief = normalizeBrief(briefInput);
  const title = titleFromBrief(brief);
  const format = options.format ?? 'markdown';

  if (format === 'json') {
    const jsonPayload = buildJsonPayload(brief);
    const payload = {
      ...jsonPayload,
      title,
      status: options.status,
      createdAt: options.createdAt,
      updatedAt: options.updatedAt,
      brief: {
        ...jsonPayload.brief,
        status: options.status,
      },
    };
    return {
      contents: `${JSON.stringify(payload, null, 2)}\n`,
      extension: '.json' as const,
    };
  }

  return {
    contents: buildFrontmatterMarkdown(brief, {
      status: options.status,
      createdAt: options.createdAt,
      updatedAt: options.updatedAt,
      title,
    }),
    extension: '.md',
  };
}

export async function saveDraft(options: {
  brief: ArticleBriefInput;
  status?: DraftStatus;
  format?: 'markdown' | 'json';
  /** When renaming, remove the previous slug file. */
  previousSlug?: string;
}): Promise<ArticleDraftRecord> {
  await ensureDirs();
  const brief = normalizeBrief(options.brief);
  assertSafeSlug(brief.slug);

  const existing = await getDraft(options.previousSlug || brief.slug);
  const now = new Date().toISOString();
  const status =
    options.status ??
    existing?.status ??
    ('draft' satisfies DraftStatus);
  const createdAt = existing?.createdAt ?? now;
  const format = options.format ?? existing?.format ?? 'markdown';

  const { contents, extension } = serializeDraft(brief, {
    status,
    createdAt,
    updatedAt: now,
    format,
  });

  // Published drafts stay in content/published; others in content/drafts.
  const dir = status === 'published' ? PUBLISHED_DIR : DRAFTS_DIR;
  const location = status === 'published' ? 'published' : 'drafts';
  const filename = `${brief.slug}${extension}`;
  const absolutePath = path.join(dir, filename);
  const relativePath = path.posix.join('content', location, filename);

  await writeFile(absolutePath, contents, 'utf8');

  // Version backup of this save (live file stays current; old backups expire weekly).
  try {
    await backupDraftVersion(brief.slug, contents, extension);
  } catch {
    // Saving the live draft already succeeded — don't fail the request on backup errors.
  }

  // Clean up previous path / alternate extension / other location.
  const staleCandidates: string[] = [];
  if (options.previousSlug && options.previousSlug !== brief.slug) {
    const prev = assertSafeSlug(options.previousSlug);
    staleCandidates.push(
      path.join(DRAFTS_DIR, `${prev}.md`),
      path.join(DRAFTS_DIR, `${prev}.json`),
      path.join(PUBLISHED_DIR, `${prev}.md`),
      path.join(PUBLISHED_DIR, `${prev}.json`),
    );
  }
  // Remove opposite-location / opposite-extension copies for this slug.
  for (const otherDir of [DRAFTS_DIR, PUBLISHED_DIR]) {
    for (const ext of ['.md', '.json'] as const) {
      const candidate = path.join(otherDir, `${brief.slug}${ext}`);
      if (candidate !== absolutePath) staleCandidates.push(candidate);
    }
  }
  await Promise.all(
    staleCandidates.map(async (p) => {
      try {
        await unlink(p);
      } catch {
        /* ignore missing */
      }
    }),
  );

  const record = await readDraftFile(absolutePath, relativePath);
  if (!record) {
    throw new Error('Draft was written but could not be re-read.');
  }
  return record;
}

export async function deleteDraft(slug: string): Promise<boolean> {
  const found = await findDraftPath(slug);
  if (!found) return false;
  await unlink(found.absolutePath);
  return true;
}

export async function updateDraftStatus(
  slug: string,
  status: DraftStatus,
): Promise<ArticleDraftRecord> {
  if (!DRAFT_STATUSES.includes(status)) {
    throw new Error('Invalid status.');
  }
  const existing = await getDraft(slug);
  if (!existing) {
    throw new Error('Draft not found.');
  }

  return saveDraft({
    brief: existing.brief,
    status,
    format: existing.format,
  });
}

export function isBriefBody(value: unknown): value is ArticleBriefInput {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.slug === 'string' &&
    typeof v.targetQuestion === 'string' &&
    typeof v.answerFirstSummary === 'string' &&
    typeof v.rawBody === 'string' &&
    Array.isArray(v.keyDefinitions) &&
    Array.isArray(v.stylisticOverrides) &&
    typeof v.stylisticNotes === 'string'
  );
}
