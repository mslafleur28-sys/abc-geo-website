'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { TermsAcceptanceForm } from '@/components/terms/TermsAcceptanceForm';
import { isTermsAccepted, loadTermsAcceptance } from '@/lib/termsAcceptance';

export type TermsAcceptanceModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, auto-opens if the current Terms version is not accepted. */
  autoPrompt?: boolean;
  title?: string;
  description?: ReactNode;
};

/**
 * Reusable modal/banner shell around TermsAcceptanceForm.
 * Use controlled `open`/`onOpenChange`, or `autoPrompt` to gate features.
 */
export function TermsAcceptanceModal({
  open: openProp,
  onOpenChange,
  autoPrompt = false,
  title = 'Terms of Service',
  description = 'Please accept the current Terms before continuing with interactive tools.',
}: TermsAcceptanceModalProps) {
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    if (!autoPrompt) return;
    const accepted = isTermsAccepted(loadTermsAcceptance());
    if (!accepted) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prompt once on mount
  }, [autoPrompt]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-abby-ink/40 backdrop-blur-[2px]"
        aria-label="Dismiss terms dialog"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative z-[91] max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold text-abby-ink">
              {title}
            </h2>
            <p id={descId} className="mt-1 text-sm text-abby-muted">
              {description}
            </p>
          </div>
          <Button
            ref={closeRef}
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            ×
          </Button>
        </div>

        <TermsAcceptanceForm
          variant="compact"
          showReset={false}
          onAccepted={() => setOpen(false)}
        />

        <p className="mt-4 text-center text-xs text-abby-muted">
          Full document:{' '}
          <a
            href="/terms"
            className="font-medium text-abby-sky-ink underline underline-offset-2"
          >
            View Terms of Service
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Compact sticky banner that prompts acceptance when Terms are outdated/missing.
 */
export function TermsAcceptanceBanner({
  className = '',
}: {
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setVisible(!isTermsAccepted(loadTermsAcceptance()));
  }, []);

  if (!visible) return null;

  return (
    <>
      <div
        role="region"
        aria-label="Terms of Service notice"
        className={[
          'fixed inset-x-0 bottom-0 z-[70] border-t border-[#E2E8F0] bg-white/95 p-4 shadow-[0_-8px_30px_rgba(26,32,44,0.08)] backdrop-blur',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-abby-ink">
            Please review and accept our{' '}
            <a
              href="/terms"
              className="font-semibold text-abby-sky-ink underline underline-offset-2"
            >
              Terms of Service
            </a>{' '}
            to use interactive GEO tools.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" size="sm" onClick={() => setModalOpen(true)}>
              Review & accept
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setVisible(false)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
      <TermsAcceptanceModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
