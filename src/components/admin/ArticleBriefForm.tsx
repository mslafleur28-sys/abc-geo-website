'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { FormattedTextarea } from '@/components/admin/DraftFormatToolbar';
import { importDocumentFile } from '@/lib/article-brief/import-document-client';
import {
  EMPTY_ARTICLE_BRIEF,
  STYLISTIC_OVERRIDE_OPTIONS,
  buildPayload,
  isValidSlug,
  slugifyFilename,
  validateBrief,
  type ArticleBriefInput,
  type ArticleDraftRecord,
  type DraftStatus,
  type KeyDefinition,
  type PayloadFormat,
  type StylisticOverrideId,
} from '@/lib/article-brief';

type StatusTone = 'idle' | 'ok' | 'err';

interface StatusMsg {
  tone: StatusTone;
  text: string;
}

export type SaveReason = 'manual' | 'autosave' | 'preview';

export interface ArticleBriefFormHandle {
  save: (opts?: { reason?: SaveReason }) => Promise<ArticleDraftRecord | null>;
  isDirty: () => boolean;
}

export interface ArticleBriefFormProps {
  mode?: 'create' | 'edit';
  initialBrief?: ArticleBriefInput;
  initialStatus?: DraftStatus;
  slugLocked?: boolean;
  onSaved?: (draft: ArticleDraftRecord) => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** Fired whenever save/dirty status text should update in a parent chrome. */
  onSaveStatusChange?: (status: {
    dirty: boolean;
    saving: boolean;
    label: string;
  }) => void;
}

const AUTOSAVE_DELAY_MS = 2500;

function snapshotBrief(brief: ArticleBriefInput, status: DraftStatus): string {
  return JSON.stringify({ brief, status });
}

const ArticleBriefForm = forwardRef<ArticleBriefFormHandle, ArticleBriefFormProps>(
  function ArticleBriefForm(
    {
      mode = 'create',
      initialBrief,
      initialStatus = 'draft',
      slugLocked = false,
      onSaved,
      onDirtyChange,
      onSaveStatusChange,
    },
    ref,
  ) {
  const [brief, setBrief] = useState<ArticleBriefInput>(
    initialBrief ?? EMPTY_ARTICLE_BRIEF,
  );
  const [draftStatus, setDraftStatus] = useState<DraftStatus>(initialStatus);
  const [apiSlug, setApiSlug] = useState(initialBrief?.slug ?? '');
  const [format, setFormat] = useState<PayloadFormat>('prompt');
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<StatusMsg>({ tone: 'idle', text: '' });
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [baseline, setBaseline] = useState(() =>
    snapshotBrief(initialBrief ?? EMPTY_ARTICLE_BRIEF, initialStatus),
  );
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [lastSavedPath, setLastSavedPath] = useState<string | null>(null);
  const [saveFlash, setSaveFlash] = useState(false);

  const briefRef = useRef(brief);
  const draftStatusRef = useRef(draftStatus);
  const baselineRef = useRef(baseline);
  const apiSlugRef = useRef(apiSlug);
  const savingLockRef = useRef(false);
  const lastSavedDraftRef = useRef<ArticleDraftRecord | null>(null);
  const onSavedRef = useRef(onSaved);
  const onDirtyChangeRef = useRef(onDirtyChange);
  const onSaveStatusChangeRef = useRef(onSaveStatusChange);

  briefRef.current = brief;
  draftStatusRef.current = draftStatus;
  baselineRef.current = baseline;
  apiSlugRef.current = apiSlug;
  onSavedRef.current = onSaved;
  onDirtyChangeRef.current = onDirtyChange;
  onSaveStatusChangeRef.current = onSaveStatusChange;

  const validation = useMemo(() => validateBrief(brief), [brief]);
  const isDirty = snapshotBrief(brief, draftStatus) !== baseline;
  const payload = useMemo(
    () => (validation.ok ? buildPayload(brief, format) : ''),
    [brief, format, validation.ok],
  );

  useEffect(() => {
    onDirtyChangeRef.current?.(isDirty);
  }, [isDirty]);

  useEffect(() => {
    if (!saveFlash) return;
    const t = window.setTimeout(() => setSaveFlash(false), 2800);
    return () => window.clearTimeout(t);
  }, [saveFlash, lastSavedAt]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  async function saveDraft(opts?: {
    reason?: SaveReason;
  }): Promise<ArticleDraftRecord | null> {
    const reason = opts?.reason ?? 'manual';
    const silent = reason === 'autosave';

    if (!silent) setTouched(true);

    // Wait out an in-flight save (e.g. autosave vs preview).
    if (savingLockRef.current) {
      for (let i = 0; i < 60 && savingLockRef.current; i += 1) {
        await new Promise((r) => window.setTimeout(r, 50));
      }
      if (
        snapshotBrief(briefRef.current, draftStatusRef.current) ===
        baselineRef.current
      ) {
        return lastSavedDraftRef.current;
      }
      if (savingLockRef.current) return lastSavedDraftRef.current;
    }

    const currentBrief = briefRef.current;
    const currentStatus = draftStatusRef.current;
    const currentValidation = validateBrief(currentBrief);

    if (!currentValidation.ok) {
      if (!silent) {
        setStatus({
          tone: 'err',
          text:
            reason === 'preview'
              ? 'Fix the highlighted fields before previewing.'
              : 'Fix the highlighted fields before saving a draft.',
        });
      }
      return null;
    }

    if (
      snapshotBrief(currentBrief, currentStatus) === baselineRef.current
    ) {
      return lastSavedDraftRef.current;
    }

    savingLockRef.current = true;
    setIsSaving(true);

    try {
      const slugForApi = apiSlugRef.current;
      const usePut = mode === 'edit' && Boolean(slugForApi);
      const endpoint = usePut
        ? `/api/articles/drafts/${encodeURIComponent(slugForApi)}`
        : '/api/articles/drafts';
      const res = await fetch(endpoint, {
        method: usePut ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentBrief,
          status: currentStatus,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        path?: string;
        error?: string;
        draft?: ArticleDraftRecord;
      };
      if (!res.ok || !data.ok || !data.draft) {
        setStatus({
          tone: 'err',
          text: data.error || 'Could not save draft.',
        });
        return null;
      }

      setApiSlug(data.draft.brief.slug);
      setDraftStatus(data.draft.status);
      // Keep the in-progress form as the new baseline so trim/normalize
      // differences from the API don't re-dirty and loop autosave.
      const syncedBrief =
        data.draft.brief.slug !== currentBrief.slug
          ? { ...currentBrief, slug: data.draft.brief.slug }
          : currentBrief;
      if (syncedBrief !== currentBrief) {
        setBrief(syncedBrief);
      }
      setBaseline(snapshotBrief(syncedBrief, data.draft.status));
      setLastSavedAt(Date.now());
      setLastSavedPath(data.path || data.draft.relativePath);
      setSaveFlash(true);
      lastSavedDraftRef.current = data.draft;
      setStatus({
        tone: 'ok',
        text: '',
      });
      onSavedRef.current?.(data.draft);
      return data.draft;
    } catch {
      setStatus({
        tone: 'err',
        text:
          'Network error while saving — the local server may be down. Run npm run dev, then try again.',
      });
      return null;
    } finally {
      savingLockRef.current = false;
      setIsSaving(false);
    }
  }

  useImperativeHandle(ref, () => ({
    save: saveDraft,
    isDirty: () =>
      snapshotBrief(briefRef.current, draftStatusRef.current) !==
      baselineRef.current,
  }));

  useEffect(() => {
    if (mode !== 'edit' || !isDirty || !validation.ok) return;
    const timer = window.setTimeout(() => {
      void saveDraft({ reason: 'autosave' });
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
    // saveDraft reads latest values from refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isDirty, validation.ok, brief, draftStatus]);

  function updateField<K extends keyof ArticleBriefInput>(
    key: K,
    value: ArticleBriefInput[K],
  ) {
    setBrief((prev) => ({ ...prev, [key]: value }));
    setStatus({ tone: 'idle', text: '' });
  }

  function onSlugBlur() {
    if (slugLocked) return;
    updateField('slug', slugifyFilename(brief.slug));
  }

  function toggleOverride(id: StylisticOverrideId) {
    setBrief((prev) => {
      const has = prev.stylisticOverrides.includes(id);
      return {
        ...prev,
        stylisticOverrides: has
          ? prev.stylisticOverrides.filter((x) => x !== id)
          : [...prev.stylisticOverrides, id],
      };
    });
  }

  function updateDefinition(
    index: number,
    key: keyof KeyDefinition,
    value: string,
  ) {
    setBrief((prev) => {
      const next = [...prev.keyDefinitions];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, keyDefinitions: next };
    });
  }

  function addDefinition() {
    setBrief((prev) => ({
      ...prev,
      keyDefinitions: [...prev.keyDefinitions, { term: '', definition: '' }],
    }));
  }

  function removeDefinition(index: number) {
    setBrief((prev) => ({
      ...prev,
      keyDefinitions:
        prev.keyDefinitions.length <= 1
          ? [{ term: '', definition: '' }]
          : prev.keyDefinitions.filter((_, i) => i !== index),
    }));
  }

  async function handleImportDocument(file: File) {
    let mergeMode: 'replace' | 'append' = 'replace';
    if (brief.rawBody.trim()) {
      const replace = window.confirm(
        'Your body already has content.\n\nOK = Replace it with the imported document\nCancel = Append the import to the end',
      );
      mergeMode = replace ? 'replace' : 'append';
    }

    setImporting(true);
    setStatus({ tone: 'idle', text: '' });
    try {
      const { rawBody, warnings, filename } = await importDocumentFile(file);
      const nextBody =
        mergeMode === 'replace'
          ? rawBody
          : `${brief.rawBody.trimEnd()}\n\n${rawBody}`;
      updateField('rawBody', nextBody);
      const warningNote =
        warnings.length > 0 ? ` (${warnings.length} conversion notes)` : '';
      setStatus({
        tone: 'ok',
        text: `Imported ${filename}${warningNote}.`,
      });
    } catch (err) {
      setStatus({
        tone: 'err',
        text:
          err instanceof Error ? err.message : 'Failed to import document.',
      });
    } finally {
      setImporting(false);
    }
  }

  function onImportInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void handleImportDocument(file);
  }

  async function copyPayload(kind: PayloadFormat = format) {
    setTouched(true);
    if (!validation.ok) {
      setStatus({
        tone: 'err',
        text: 'Fix the highlighted fields before copying.',
      });
      return;
    }
    const text = buildPayload(brief, kind);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setStatus({
        tone: 'ok',
        text:
          kind === 'prompt'
            ? 'Agent prompt copied — paste into Cursor Agent mode.'
            : `${kind === 'json' ? 'JSON' : 'Markdown'} payload copied.`,
      });
    } catch {
      setStatus({
        tone: 'err',
        text: 'Clipboard blocked — select the preview and copy manually.',
      });
    }
  }

  const showError = (key: keyof ArticleBriefInput) =>
    touched && validation.errors[key];

  const previewSlug = slugifyFilename(brief.slug);
  const slugHint =
    previewSlug && isValidSlug(previewSlug)
      ? `blog/${previewSlug}.html`
      : 'blog/your-slug.html';

  const savedTimeLabel = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const saveStateLabel = isSaving
    ? 'Saving…'
    : isDirty
      ? mode === 'edit' && validation.ok
        ? 'Unsaved changes · autosave pending'
        : 'Unsaved changes'
      : savedTimeLabel
        ? `Changes Saved: ${savedTimeLabel}`
        : mode === 'edit'
          ? 'Changes Saved: up to date'
          : '';

  useEffect(() => {
    onSaveStatusChangeRef.current?.({
      dirty: isDirty,
      saving: isSaving,
      label: saveStateLabel,
    });
  }, [isDirty, isSaving, saveStateLabel]);

  return (
    <div className="space-y-8">
      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          void copyPayload('prompt');
        }}
        noValidate
      >
        <section className="admin-panel admin-enter" style={{ animationDelay: '40ms' }}>
          <h2 className="admin-section-title">Article identity</h2>
          <p className="admin-section-desc">
            Slug becomes the HTML filename under <code>blog/</code>.
          </p>

          <div className="mt-5">
            <label className="admin-label" htmlFor="slug">
              Target slug / file name
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                id="slug"
                name="slug"
                className={`admin-input font-mono text-sm ${showError('slug') ? 'admin-invalid' : ''}`}
                placeholder="what-is-generative-engine-optimization"
                value={brief.slug}
                onChange={(e) => updateField('slug', e.target.value)}
                onBlur={onSlugBlur}
                autoComplete="off"
                spellCheck={false}
                readOnly={slugLocked}
              />
              <span className="shrink-0 font-mono text-xs text-abby-muted">
                → {slugHint}
              </span>
            </div>
            {showError('slug') ? (
              <p className="admin-error" role="alert">
                {validation.errors.slug}
              </p>
            ) : null}
          </div>
        </section>

        <section className="admin-panel admin-enter" style={{ animationDelay: '80ms' }}>
          <h2 className="admin-section-title">Question &amp; answer-first</h2>
          <p className="admin-section-desc">
            The H2/H3 question plus a few sentences that answer it outright.
          </p>

          <div className="mt-5 space-y-5">
            <div>
              <label className="admin-label" htmlFor="targetQuestion">
                H2 / H3 with question
              </label>
              <input
                id="targetQuestion"
                name="targetQuestion"
                className={`admin-input ${showError('targetQuestion') ? 'admin-invalid' : ''}`}
                placeholder="What is Generative Engine Optimization?"
                value={brief.targetQuestion}
                onChange={(e) => updateField('targetQuestion', e.target.value)}
              />
              {showError('targetQuestion') ? (
                <p className="admin-error" role="alert">
                  {validation.errors.targetQuestion}
                </p>
              ) : null}
            </div>

            <div>
              <label className="admin-label" htmlFor="answerFirstSummary">
                Answer-first summary
              </label>
              <FormattedTextarea
                id="answerFirstSummary"
                rows={4}
                className={showError('answerFirstSummary') ? 'admin-invalid' : ''}
                placeholder="Generative Engine Optimization (GEO) is the practice of structuring web content so AI engines can extract and cite facts. By pairing a named Entity (A) with a transitive Verb (B), writers create machine-readable claims that ChatGPT, Perplexity, and Gemini prioritize over keyword density."
                value={brief.answerFirstSummary}
                onChange={(next) => updateField('answerFirstSummary', next)}
              />
              <p className="mt-1.5 text-xs text-abby-muted">
                Target ~40–60 words. Formatting appears as it will look in preview
                and on the live post.
              </p>
              {showError('answerFirstSummary') ? (
                <p className="admin-error" role="alert">
                  {validation.errors.answerFirstSummary}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="admin-panel admin-enter" style={{ animationDelay: '120ms' }}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="admin-section-title">Raw body content</h2>
              <p className="admin-section-desc">
                Write and format visually with the toolbox — headings, colors, fonts,
                and images show in-place (no raw tags in the editor). Or import a
                Word, Markdown, text, or HTML file to auto-format the body.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={importInputRef}
                type="file"
                accept=".docx,.md,.markdown,.txt,.html,.htm,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,text/plain,text/html"
                className="sr-only"
                onChange={onImportInputChange}
              />
              <button
                type="button"
                className="admin-btn-ghost"
                disabled={importing}
                onClick={() => importInputRef.current?.click()}
              >
                {importing ? 'Importing…' : 'Import document'}
              </button>
            </div>
          </div>
          <div className="mt-5">
            <label className="admin-label" htmlFor="rawBody">
              Body draft
            </label>
            <FormattedTextarea
              id="rawBody"
              rows={12}
              stickyToolbox
              className={showError('rawBody') ? 'admin-invalid' : ''}
              placeholder="Why GEO matters — add headings, colors, and images with the toolbox"
              value={brief.rawBody}
              onChange={(next) => updateField('rawBody', next)}
            />
            {showError('rawBody') ? (
              <p className="admin-error" role="alert">
                {validation.errors.rawBody}
              </p>
            ) : null}
          </div>
        </section>

        <section className="admin-panel admin-enter" style={{ animationDelay: '160ms' }}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="admin-section-title">Key definitions</h2>
              <p className="admin-section-desc">
                Appended as a closing definitions box at the end of the article.
              </p>
            </div>
            <button
              type="button"
              className="admin-btn-ghost"
              onClick={addDefinition}
            >
              + Add term
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {brief.keyDefinitions.map((def, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-xl border border-abby-ink/10 bg-abby-cream/60 p-3 sm:grid-cols-[minmax(0,0.35fr)_minmax(0,1fr)_auto]"
              >
                <div>
                  <label
                    className="admin-label"
                    htmlFor={`def-term-${index}`}
                  >
                    Term
                  </label>
                  <input
                    id={`def-term-${index}`}
                    className="admin-input"
                    placeholder="GEO"
                    value={def.term}
                    onChange={(e) =>
                      updateDefinition(index, 'term', e.target.value)
                    }
                  />
                </div>
                <div>
                  <label
                    className="admin-label"
                    htmlFor={`def-body-${index}`}
                  >
                    Definition
                  </label>
                  <input
                    id={`def-body-${index}`}
                    className="admin-input"
                    placeholder="Generative Engine Optimization…"
                    value={def.definition}
                    onChange={(e) =>
                      updateDefinition(index, 'definition', e.target.value)
                    }
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="admin-btn-ghost w-full sm:w-auto"
                    onClick={() => removeDefinition(index)}
                    aria-label={`Remove definition ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel admin-enter" style={{ animationDelay: '200ms' }}>
          <h2 className="admin-section-title">Stylistic overrides</h2>
          <p className="admin-section-desc">
            Select layout treatments, then add notes for tables, callouts, or
            accents.
          </p>

          <fieldset className="mt-5">
            <legend className="sr-only">Stylistic override options</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {STYLISTIC_OVERRIDE_OPTIONS.map((opt) => {
                const checked = brief.stylisticOverrides.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-3 transition ${
                      checked
                        ? 'border-abby-sky/50 bg-abby-sky/5'
                        : 'border-abby-ink/10 bg-white/50 hover:border-abby-ink/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[#00B4D8]"
                      checked={checked}
                      onChange={() => toggleOverride(opt.id)}
                    />
                    <span>
                      <span className="block text-sm font-semibold text-abby-ink">
                        {opt.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-abby-muted">
                        {opt.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5">
            <label className="admin-label" htmlFor="stylisticNotes">
              Custom layout notes
            </label>
            <textarea
              id="stylisticNotes"
              name="stylisticNotes"
              rows={3}
              className="admin-input min-h-[5rem]"
              placeholder="e.g. Include a 3-column Entity / Verb / Result table under section 2; soft coral callout before the tool CTA."
              value={brief.stylisticNotes}
              onChange={(e) => updateField('stylisticNotes', e.target.value)}
            />
          </div>
        </section>

        <section className="admin-panel admin-enter" style={{ animationDelay: '240ms' }}>
          <h2 className="admin-section-title">Output &amp; actions</h2>
          <p className="admin-section-desc">
            Payloads merge your brief with abcGEO writing and styling defaults.
          </p>

          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Payload format">
            {(
              [
                { id: 'prompt', label: 'Agent prompt' },
                { id: 'frontmatter', label: 'Frontmatter MD' },
                { id: 'json', label: 'JSON' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={format === tab.id}
                className={`admin-chip ${format === tab.id ? 'admin-chip-active' : ''}`}
                onClick={() => setFormat(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="submit"
              className={`admin-btn-primary ${copied ? 'admin-btn-pulse' : ''}`}
            >
              {copied ? 'Copied' : 'Copy prompt for Cursor Agent'}
            </button>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() => void copyPayload(format)}
            >
              Copy {format === 'prompt' ? 'prompt' : format === 'json' ? 'JSON' : 'markdown'}
            </button>
            <button
              type="button"
              className="admin-btn-secondary"
              disabled={isSaving}
              onClick={() => void saveDraft({ reason: 'manual' })}
            >
              {isSaving
                ? 'Saving…'
                : mode === 'edit'
                  ? 'Save changes'
                  : 'Save draft to content/drafts'}
            </button>
          </div>

          {saveStateLabel ? (
            <div
              className={`mt-3 rounded-lg border px-3 py-2.5 text-sm ${
                isSaving
                  ? 'border-abby-sky/30 bg-sky-50 text-abby-sky-ink'
                  : isDirty
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : saveFlash
                      ? 'admin-save-flash border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-emerald-200/80 bg-emerald-50/80 text-emerald-900'
              }`}
              role="status"
              aria-live="polite"
            >
              <p className="font-semibold tracking-tight">{saveStateLabel}</p>
              {!isDirty && !isSaving && lastSavedPath ? (
                <p className="mt-0.5 font-mono text-xs text-emerald-800/80">
                  {lastSavedPath}
                </p>
              ) : null}
              {isDirty && !isSaving ? (
                <p className="mt-0.5 text-xs text-amber-800/90">
                  Click Save changes, or wait a moment for autosave.
                </p>
              ) : null}
            </div>
          ) : null}

          {status.text ? (
            <p
              className={`mt-2 text-sm ${
                status.tone === 'ok'
                  ? 'text-emerald-800'
                  : status.tone === 'err'
                    ? 'text-red-700'
                    : 'text-abby-muted'
              }`}
              role="status"
            >
              {status.text}
            </p>
          ) : null}

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="admin-label mb-0" htmlFor="payloadPreview">
                Payload preview
              </label>
              <span className="font-mono text-[10px] uppercase tracking-wider text-abby-muted">
                {validation.ok ? format : 'complete the form'}
              </span>
            </div>
            <textarea
              id="payloadPreview"
              readOnly
              rows={16}
              className="admin-input min-h-[20rem] font-mono text-[12px] leading-relaxed text-abby-ink/90"
              value={
                validation.ok
                  ? payload
                  : 'Fill required fields to generate a structured payload.'
              }
            />
          </div>
        </section>
      </form>
    </div>
  );
},
);

export default ArticleBriefForm;
