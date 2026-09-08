export const TERMS_STORAGE_KEY = 'abcgeo-terms-acceptance';
export const TERMS_VERSION = '2026-09-07';

export type TermsAcceptanceState = {
  acceptedTerms: boolean;
  acceptedGeoFairUse: boolean;
  acceptedAt: string;
  termsVersion: string;
};

export const defaultTermsAcceptanceState: TermsAcceptanceState = {
  acceptedTerms: false,
  acceptedGeoFairUse: false,
  acceptedAt: '',
  termsVersion: '',
};

export function loadTermsAcceptance(): TermsAcceptanceState {
  if (typeof window === 'undefined') {
    return { ...defaultTermsAcceptanceState };
  }

  try {
    const raw = window.localStorage.getItem(TERMS_STORAGE_KEY);
    if (!raw) return { ...defaultTermsAcceptanceState };
    const parsed = JSON.parse(raw) as Partial<TermsAcceptanceState>;
    return {
      ...defaultTermsAcceptanceState,
      ...parsed,
    };
  } catch {
    return { ...defaultTermsAcceptanceState };
  }
}

export function isTermsAccepted(
  state: TermsAcceptanceState = loadTermsAcceptance(),
): boolean {
  return (
    state.acceptedTerms &&
    state.acceptedGeoFairUse &&
    state.termsVersion === TERMS_VERSION
  );
}

export function saveTermsAcceptance(
  state: Omit<TermsAcceptanceState, 'acceptedAt' | 'termsVersion'> & {
    acceptedAt?: string;
    termsVersion?: string;
  },
): TermsAcceptanceState {
  const next: TermsAcceptanceState = {
    acceptedTerms: state.acceptedTerms,
    acceptedGeoFairUse: state.acceptedGeoFairUse,
    acceptedAt: state.acceptedAt ?? new Date().toISOString(),
    termsVersion: state.termsVersion ?? TERMS_VERSION,
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TERMS_STORAGE_KEY, JSON.stringify(next));
    const maxAge = 60 * 60 * 24 * 365;
    const accepted = next.acceptedTerms && next.acceptedGeoFairUse ? '1' : '0';
    document.cookie = `abcgeo_terms=${accepted}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `abcgeo_terms_version=${encodeURIComponent(next.termsVersion)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  return next;
}

export function clearTermsAcceptance(): TermsAcceptanceState {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TERMS_STORAGE_KEY);
    document.cookie = 'abcgeo_terms=0; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'abcgeo_terms_version=; path=/; max-age=0; SameSite=Lax';
  }
  return { ...defaultTermsAcceptanceState };
}
