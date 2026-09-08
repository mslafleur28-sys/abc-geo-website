/* abcGEO — Privacy consent + Terms acceptance (static pages) */
(function () {
  const CONSENT_KEY = 'abcgeo-privacy-consent';
  const TERMS_KEY = 'abcgeo-terms-acceptance';
  const TERMS_VERSION = '2026-09-07';

  function showToast(title, description) {
    let el = document.getElementById('legal-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'legal-toast';
      el.className = 'legal-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.innerHTML =
      '<strong></strong><p></p><button type="button" aria-label="Dismiss notification" style="position:absolute;top:0.4rem;right:0.55rem;border:0;background:transparent;cursor:pointer;font-size:1.1rem;line-height:1;color:#64748B">×</button>';
    el.style.position = 'fixed';
    el.querySelector('strong').textContent = title;
    el.querySelector('p').textContent = description || '';
    el.hidden = false;
    const dismiss = el.querySelector('button');
    dismiss.onclick = () => {
      el.hidden = true;
    };
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => {
      el.hidden = true;
    }, 4200);
  }

  function setCookie(name, value, maxAge) {
    document.cookie =
      name + '=' + value + '; path=/; max-age=' + maxAge + '; SameSite=Lax';
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { ...fallback };
      return { ...fallback, ...JSON.parse(raw) };
    } catch {
      return { ...fallback };
    }
  }

  function initPrivacyForm() {
    const form = document.querySelector('[data-privacy-form]');
    if (!form) return;

    const defaults = {
      acceptedPolicy: false,
      analyticsConsent: false,
      geoToolsAck: false,
      privacyRequestEmail: '',
      updatedAt: '',
      acceptedAll: false,
    };

    const policy = form.querySelector('[name="acceptedPolicy"]');
    const analytics = form.querySelector('[name="analyticsConsent"]');
    const geo = form.querySelector('[name="geoToolsAck"]');
    const email = form.querySelector('[name="privacyRequestEmail"]');
    const status = form.querySelector('[data-privacy-status]');
    const error = form.querySelector('[data-privacy-error]');
    const saveBtn = form.querySelector('[data-privacy-save]');
    const acceptAllBtn = form.querySelector('[data-privacy-accept-all]');
    const resetBtn = form.querySelector('[data-privacy-reset]');

    function renderStatus(state) {
      if (!status) return;
      if (!state.updatedAt) {
        status.textContent = 'No saved preferences on this device yet.';
        status.classList.remove('is-success');
        return;
      }
      const when = new Date(state.updatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      status.textContent =
        'Last saved on this device: ' +
        when +
        (state.acceptedPolicy ? ' · Policy accepted' : '') +
        (state.analyticsConsent ? ' · Analytics on' : ' · Analytics off');
      status.classList.add('is-success');
    }

    function applyState(state) {
      policy.checked = !!state.acceptedPolicy;
      analytics.checked = !!state.analyticsConsent;
      geo.checked = !!state.geoToolsAck;
      email.value = state.privacyRequestEmail || '';
      renderStatus(state);
    }

    function persist(state, toastTitle, toastDesc) {
      const next = { ...state, updatedAt: new Date().toISOString() };
      localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
      setCookie('abcgeo_analytics', next.analyticsConsent ? '1' : '0', 60 * 60 * 24 * 365);
      renderStatus(next);
      if (error) {
        error.hidden = true;
        error.textContent = '';
      }
      showToast(toastTitle, toastDesc);
      return next;
    }

    function validate(requireGeo) {
      if (!policy.checked) {
        error.hidden = false;
        error.textContent =
          'Please accept the Privacy Policy and Terms of Service to continue.';
        return false;
      }
      if (requireGeo && !geo.checked) {
        error.hidden = false;
        error.textContent =
          'Please acknowledge how prompt inputs and public URLs are processed in GEO utilities.';
        return false;
      }
      const value = (email.value || '').trim();
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error.hidden = false;
        error.textContent = 'Enter a valid email address or leave this field blank.';
        return false;
      }
      error.hidden = true;
      error.textContent = '';
      return true;
    }

    applyState(loadJson(CONSENT_KEY, defaults));

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!validate(true)) return;
      persist(
        {
          acceptedPolicy: policy.checked,
          analyticsConsent: analytics.checked,
          geoToolsAck: geo.checked,
          privacyRequestEmail: (email.value || '').trim(),
          acceptedAll: policy.checked && analytics.checked && geo.checked,
        },
        'Preferences saved',
        'Your consent choices were stored in this browser.',
      );
    });

    acceptAllBtn?.addEventListener('click', () => {
      policy.checked = true;
      analytics.checked = true;
      geo.checked = true;
      if (!validate(true)) return;
      persist(
        {
          acceptedPolicy: true,
          analyticsConsent: true,
          geoToolsAck: true,
          privacyRequestEmail: (email.value || '').trim(),
          acceptedAll: true,
        },
        'All preferences accepted',
        'Policy acceptance, analytics cookies, and GEO acknowledgments are enabled.',
      );
    });

    resetBtn?.addEventListener('click', () => {
      applyState(defaults);
      persist(
        { ...defaults },
        'Preferences cleared',
        'Stored consent was reset on this device.',
      );
    });

    // silence unused if missing
    void saveBtn;
  }

  function initTermsForm() {
    const form = document.querySelector('[data-terms-form]');
    if (!form) return;

    const defaults = {
      acceptedTerms: false,
      acceptedGeoFairUse: false,
      acceptedAt: '',
      termsVersion: '',
    };

    const terms = form.querySelector('[name="acceptedTerms"]');
    const geo = form.querySelector('[name="acceptedGeoFairUse"]');
    const submit = form.querySelector('[data-terms-submit]');
    const reset = form.querySelector('[data-terms-reset]');
    const status = form.querySelector('[data-terms-status]');
    const error = form.querySelector('[data-terms-error]');

    function syncSubmit() {
      if (submit) submit.disabled = !(terms.checked && geo.checked);
    }

    function renderStatus(state) {
      if (!status) return;
      if (
        state.acceptedTerms &&
        state.acceptedGeoFairUse &&
        state.termsVersion === TERMS_VERSION &&
        state.acceptedAt
      ) {
        const when = new Date(state.acceptedAt).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
        status.textContent =
          'You accepted Terms version ' + state.termsVersion + ' on ' + when + '.';
        status.classList.add('is-success');
        return;
      }
      status.textContent =
        'Current Terms version: ' +
        TERMS_VERSION +
        '. Acceptance is stored in localStorage and mirrored to cookies on this device.';
      status.classList.remove('is-success');
    }

    function applyState(state) {
      terms.checked = !!state.acceptedTerms;
      geo.checked = !!state.acceptedGeoFairUse;
      syncSubmit();
      renderStatus(state);
    }

    applyState(loadJson(TERMS_KEY, defaults));

    terms.addEventListener('change', syncSubmit);
    geo.addEventListener('change', syncSubmit);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!(terms.checked && geo.checked)) {
        error.hidden = false;
        error.textContent =
          'Please check both required boxes to accept the Terms of Service.';
        return;
      }
      error.hidden = true;
      const next = {
        acceptedTerms: true,
        acceptedGeoFairUse: true,
        acceptedAt: new Date().toISOString(),
        termsVersion: TERMS_VERSION,
      };
      localStorage.setItem(TERMS_KEY, JSON.stringify(next));
      setCookie('abcgeo_terms', '1', 60 * 60 * 24 * 365);
      setCookie(
        'abcgeo_terms_version',
        encodeURIComponent(TERMS_VERSION),
        60 * 60 * 24 * 365,
      );
      renderStatus(next);
      showToast('Terms accepted', 'Version ' + TERMS_VERSION + ' was saved on this device.');
    });

    reset?.addEventListener('click', () => {
      localStorage.removeItem(TERMS_KEY);
      setCookie('abcgeo_terms', '0', 0);
      setCookie('abcgeo_terms_version', '', 0);
      applyState(defaults);
      showToast('Acceptance cleared', 'Terms acceptance was removed from this device.');
    });
  }

  initPrivacyForm();
  initTermsForm();
})();
