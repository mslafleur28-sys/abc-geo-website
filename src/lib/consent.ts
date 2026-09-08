export const CONSENT_STORAGE_KEY = 'abcgeo-privacy-consent';

export type PrivacyConsentState = {
  acceptedPolicy: boolean;
  analyticsConsent: boolean;
  geoToolsAck: boolean;
  privacyRequestEmail: string;
  updatedAt: string;
  acceptedAll?: boolean;
};

export const defaultConsentState: PrivacyConsentState = {
  acceptedPolicy: false,
  analyticsConsent: false,
  geoToolsAck: false,
  privacyRequestEmail: '',
  updatedAt: '',
  acceptedAll: false,
};

export function loadConsentState(): PrivacyConsentState {
  if (typeof window === 'undefined') {
    return { ...defaultConsentState };
  }

  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return { ...defaultConsentState };
    const parsed = JSON.parse(raw) as Partial<PrivacyConsentState>;
    return {
      ...defaultConsentState,
      ...parsed,
      privacyRequestEmail: parsed.privacyRequestEmail ?? '',
    };
  } catch {
    return { ...defaultConsentState };
  }
}

export function saveConsentState(
  state: Omit<PrivacyConsentState, 'updatedAt'> & { updatedAt?: string },
): PrivacyConsentState {
  const next: PrivacyConsentState = {
    ...state,
    updatedAt: state.updatedAt ?? new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
    // Mirror analytics preference to a short-lived cookie for server/edge readers.
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `abcgeo_analytics=${next.analyticsConsent ? '1' : '0'}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  return next;
}
