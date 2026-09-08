'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import {
  loadConsentState,
  saveConsentState,
  type PrivacyConsentState,
} from '@/lib/consent';

function isValidEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function PolicyAcknowledgmentForm() {
  const { toast } = useToast();
  const [hydrated, setHydrated] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [geoToolsAck, setGeoToolsAck] = useState(false);
  const [privacyRequestEmail, setPrivacyRequestEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [savedAt, setSavedAt] = useState<string>('');

  useEffect(() => {
    const stored = loadConsentState();
    setAcceptedPolicy(stored.acceptedPolicy);
    setAnalyticsConsent(stored.analyticsConsent);
    setGeoToolsAck(stored.geoToolsAck);
    setPrivacyRequestEmail(stored.privacyRequestEmail);
    setSavedAt(stored.updatedAt);
    setHydrated(true);
  }, []);

  function persist(
    next: Omit<PrivacyConsentState, 'updatedAt'>,
    message: { title: string; description?: string },
  ) {
    const saved = saveConsentState(next);
    setSavedAt(saved.updatedAt);
    setFormError(undefined);
    toast({
      title: message.title,
      description: message.description,
      tone: 'success',
    });
  }

  function validateRequired(requireGeoAck: boolean) {
    if (!acceptedPolicy) {
      setFormError(
        'Please accept the Privacy Policy and Terms of Service to continue.',
      );
      return false;
    }
    if (requireGeoAck && !geoToolsAck) {
      setFormError(
        'Please acknowledge how prompt inputs and public URLs are processed in GEO utilities.',
      );
      return false;
    }
    if (!isValidEmail(privacyRequestEmail)) {
      setEmailError('Enter a valid email address or leave this field blank.');
      return false;
    }
    setEmailError(undefined);
    setFormError(undefined);
    return true;
  }

  function handleSavePreferences() {
    if (!validateRequired(true)) return;

    persist(
      {
        acceptedPolicy,
        analyticsConsent,
        geoToolsAck,
        privacyRequestEmail: privacyRequestEmail.trim(),
        acceptedAll: acceptedPolicy && analyticsConsent && geoToolsAck,
      },
      {
        title: 'Preferences saved',
        description: privacyRequestEmail.trim()
          ? 'Your consent choices were stored locally. We noted your privacy-request email for follow-up—also email info@abcgeo.dev if you need a formal GDPR/CCPA request.'
          : 'Your consent choices were stored in this browser and will persist across sessions.',
      },
    );
  }

  function handleAcceptAll() {
    const nextPolicy = true;
    const nextAnalytics = true;
    const nextGeo = true;

    setAcceptedPolicy(nextPolicy);
    setAnalyticsConsent(nextAnalytics);
    setGeoToolsAck(nextGeo);

    if (!isValidEmail(privacyRequestEmail)) {
      setEmailError('Enter a valid email address or leave this field blank.');
      return;
    }
    setEmailError(undefined);
    setFormError(undefined);

    persist(
      {
        acceptedPolicy: nextPolicy,
        analyticsConsent: nextAnalytics,
        geoToolsAck: nextGeo,
        privacyRequestEmail: privacyRequestEmail.trim(),
        acceptedAll: true,
      },
      {
        title: 'All preferences accepted',
        description:
          'Policy acceptance, analytics cookies, and GEO tool acknowledgments are enabled and saved.',
      },
    );
  }

  const savedLabel = savedAt
    ? new Date(savedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <Card id="acknowledgment" className="scroll-mt-28 border-abby-coral/25 bg-[#FFFAF8]">
      <CardHeader>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-abby-sky-ink">
          Consent controls
        </p>
        <CardTitle as="h2">Privacy preference acknowledgment</CardTitle>
        <CardDescription>
          Choose how abcGEO may use cookies and process interactive GEO inputs.
          Selections are stored in localStorage (and an analytics cookie) on this
          device.
        </CardDescription>
      </CardHeader>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSavePreferences();
        }}
        aria-describedby={formError ? 'privacy-form-error' : undefined}
      >
        <fieldset disabled={!hydrated} className="space-y-3 disabled:opacity-70">
          <legend className="sr-only">Privacy consent options</legend>

          <Checkbox
            id="consent-policy"
            name="acceptedPolicy"
            checked={acceptedPolicy}
            onChange={(event) => setAcceptedPolicy(event.target.checked)}
            requiredMark
            label="I accept the Privacy Policy and Terms of Service"
            description={
              <>
                Required to use interactive abcGEO tools and submit site forms.
                Review this Privacy Policy in full before accepting. For terms
                questions, contact{' '}
                <a
                  className="font-medium text-abby-sky-ink underline underline-offset-2"
                  href="mailto:info@abcgeo.dev"
                >
                  info@abcgeo.dev
                </a>
                .
              </>
            }
          />

          <Checkbox
            id="consent-analytics"
            name="analyticsConsent"
            checked={analyticsConsent}
            onChange={(event) => setAnalyticsConsent(event.target.checked)}
            label="Allow analytics and performance tracking cookies"
            description="Optional. Helps us understand aggregate traffic and improve site performance. You can change this anytime."
          />

          <Checkbox
            id="consent-geo-tools"
            name="geoToolsAck"
            checked={geoToolsAck}
            onChange={(event) => setGeoToolsAck(event.target.checked)}
            requiredMark
            label="I understand how prompt inputs and public URLs are processed"
            description="Required acknowledgment that live GEO utility inputs (prompts, public URLs, schema snippets) are processed to return diagnostics under our Zero-Training Guarantee, and that you will not submit secrets or unauthorized URLs."
          />

          <Input
            id="privacy-request-email"
            name="privacyRequestEmail"
            type="email"
            autoComplete="email"
            label="Privacy request email (optional)"
            hint="Use this for GDPR/CCPA access, export, or deletion requests. We also accept requests at info@abcgeo.dev."
            placeholder="you@company.com"
            value={privacyRequestEmail}
            error={emailError}
            onChange={(event) => {
              setPrivacyRequestEmail(event.target.value);
              if (emailError) setEmailError(undefined);
            }}
          />
        </fieldset>

        {formError ? (
          <p
            id="privacy-form-error"
            role="alert"
            className="rounded-lg border border-[#EF4444]/30 bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]"
          >
            {formError}
          </p>
        ) : null}

        {savedLabel ? (
          <p className="text-sm text-abby-muted" role="status">
            Last saved on this device: {savedLabel}
            {acceptedPolicy ? ' · Policy accepted' : ''}
            {analyticsConsent ? ' · Analytics on' : ' · Analytics off'}
          </p>
        ) : (
          <p className="text-sm text-abby-muted" role="status">
            No saved preferences on this device yet.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button type="submit" variant="secondary">
            Save Preferences
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleAcceptAll}
            disabled={!hydrated}
          >
            Accept All
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!hydrated}
            onClick={() => {
              setAcceptedPolicy(false);
              setAnalyticsConsent(false);
              setGeoToolsAck(false);
              setPrivacyRequestEmail('');
              setEmailError(undefined);
              setFormError(undefined);
              persist(
                {
                  acceptedPolicy: false,
                  analyticsConsent: false,
                  geoToolsAck: false,
                  privacyRequestEmail: '',
                  acceptedAll: false,
                },
                {
                  title: 'Preferences cleared',
                  description:
                    'Stored consent was reset on this device. Essential site storage may still apply.',
                },
              );
            }}
          >
            Reset
          </Button>
        </div>
      </form>
    </Card>
  );
}
