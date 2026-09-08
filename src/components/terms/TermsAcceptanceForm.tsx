'use client';

import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import {
  clearTermsAcceptance,
  loadTermsAcceptance,
  saveTermsAcceptance,
  TERMS_VERSION,
} from '@/lib/termsAcceptance';

export type TermsAcceptanceFormProps = {
  /** Embedded page card (default) or compact panel for modal/banner reuse. */
  variant?: 'page' | 'compact';
  className?: string;
  onAccepted?: () => void;
  showReset?: boolean;
};

export function TermsAcceptanceForm({
  variant = 'page',
  className = '',
  onAccepted,
  showReset = true,
}: TermsAcceptanceFormProps) {
  const { toast } = useToast();
  const formId = useId();
  const [hydrated, setHydrated] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedGeoFairUse, setAcceptedGeoFairUse] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState('');
  const [storedVersion, setStoredVersion] = useState('');
  const [formError, setFormError] = useState<string | undefined>();

  useEffect(() => {
    const stored = loadTermsAcceptance();
    setAcceptedTerms(stored.acceptedTerms);
    setAcceptedGeoFairUse(stored.acceptedGeoFairUse);
    setAcceptedAt(stored.acceptedAt);
    setStoredVersion(stored.termsVersion);
    setHydrated(true);
  }, []);

  const canSubmit = acceptedTerms && acceptedGeoFairUse;
  const alreadyAccepted =
    hydrated &&
    Boolean(acceptedAt) &&
    storedVersion === TERMS_VERSION &&
    acceptedTerms &&
    acceptedGeoFairUse;

  function handleAccept() {
    if (!acceptedTerms || !acceptedGeoFairUse) {
      setFormError(
        'Please check both required boxes to accept the Terms of Service.',
      );
      return;
    }

    const saved = saveTermsAcceptance({
      acceptedTerms: true,
      acceptedGeoFairUse: true,
    });
    setAcceptedAt(saved.acceptedAt);
    setStoredVersion(saved.termsVersion);
    setFormError(undefined);
    toast({
      title: 'Terms accepted',
      description: `Version ${saved.termsVersion} was saved on this device.`,
      tone: 'success',
    });
    onAccepted?.();
  }

  function handleReset() {
    clearTermsAcceptance();
    setAcceptedTerms(false);
    setAcceptedGeoFairUse(false);
    setAcceptedAt('');
    setStoredVersion('');
    setFormError(undefined);
    toast({
      title: 'Acceptance cleared',
      description: 'Terms acceptance was removed from this device.',
      tone: 'info',
    });
  }

  const acceptedLabel = acceptedAt
    ? new Date(acceptedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  const body = (
    <>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleAccept();
        }}
        aria-describedby={formError ? `${formId}-error` : undefined}
      >
        <fieldset disabled={!hydrated} className="space-y-3 disabled:opacity-70">
          <legend className="sr-only">Terms of Service acceptance</legend>

          <Checkbox
            id={`${formId}-terms`}
            name="acceptedTerms"
            checked={acceptedTerms}
            onChange={(event) => {
              setAcceptedTerms(event.target.checked);
              if (formError) setFormError(undefined);
            }}
            requiredMark
            label="I have read and agree to the Terms of Service and Acceptable Use Policy"
            description={
              <>
                Mandatory. Includes eligibility, IP, prohibited conduct,
                disclaimers, and governing law. Review the full Terms on this
                page or at{' '}
                <a
                  href="/terms"
                  className="font-medium text-abby-sky-ink underline underline-offset-2"
                >
                  /terms
                </a>
                .
              </>
            }
          />

          <Checkbox
            id={`${formId}-geo`}
            name="acceptedGeoFairUse"
            checked={acceptedGeoFairUse}
            onChange={(event) => {
              setAcceptedGeoFairUse(event.target.checked);
              if (formError) setFormError(undefined);
            }}
            requiredMark
            label="I agree to fair use of interactive GEO tools and URL diagnostic utilities"
            description="Mandatory. I will only submit URLs I am authorized to analyze, will not abuse APIs or automate scraping, and understand tool outputs are diagnostic—not performance guarantees."
          />
        </fieldset>

        {formError ? (
          <p
            id={`${formId}-error`}
            role="alert"
            className="rounded-lg border border-[#EF4444]/30 bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]"
          >
            {formError}
          </p>
        ) : null}

        {alreadyAccepted && acceptedLabel ? (
          <p
            className="rounded-lg border border-[#00C9A7]/30 bg-[#F0FDF9] px-3 py-2 text-sm text-abby-ink"
            role="status"
          >
            You accepted Terms version {storedVersion || TERMS_VERSION} on{' '}
            {acceptedLabel}.
          </p>
        ) : (
          <p className="text-sm text-abby-muted" role="status">
            Current Terms version: {TERMS_VERSION}. Acceptance is stored in
            localStorage and mirrored to cookies on this device.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            type="submit"
            variant="primary"
            disabled={!hydrated || !canSubmit}
            aria-disabled={!hydrated || !canSubmit}
          >
            I Agree & Accept Terms
          </Button>
          {showReset ? (
            <Button
              type="button"
              variant="ghost"
              disabled={!hydrated}
              onClick={handleReset}
            >
              Clear acceptance
            </Button>
          ) : null}
        </div>
      </form>
    </>
  );

  if (variant === 'compact') {
    return (
      <div
        id="terms-acceptance"
        className={['scroll-mt-28 space-y-3', className].filter(Boolean).join(' ')}
      >
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-abby-sky-ink">
            Terms acceptance
          </p>
          <h2 className="mt-1 font-display text-lg font-bold text-abby-ink">
            Agree to continue
          </h2>
          <p className="mt-1 text-sm text-abby-muted">
            Both checkboxes are required. Version {TERMS_VERSION}.
          </p>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Card
      id="terms-acceptance"
      className={[
        'scroll-mt-28 border-abby-coral/25 bg-[#FFFAF8]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <CardHeader>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-abby-sky-ink">
          Acceptance
        </p>
        <CardTitle as="h2">Accept the Terms of Service</CardTitle>
        <CardDescription>
          Confirm your agreement before using interactive GEO utilities. We
          store acceptance status, timestamp, and terms version on this device.
        </CardDescription>
      </CardHeader>
      {body}
    </Card>
  );
}
