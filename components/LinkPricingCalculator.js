/**
 * abcGEO · Guest Post & Link Placement Value Calculator
 * Expects markup from components/LinkPricingCalculator.html ([data-link-calc] root).
 * Domain rating and organic traffic are auto-filled from /api/collaboration-quote
 * (backend → DataForSEO) when a target URL is entered.
 */
(function () {
  'use strict';

  const DEFAULT_ENDPOINT = '/api/collaboration-quote';
  const LOOKUP_DEBOUNCE_MS = 700;

  const TRAFFIC_MULTIPLIERS = {
    'under-1k': { mult: 0.8, label: '<1k monthly traffic', signal: 'Traffic multiplier 0.8× (low volume)' },
    '1k-10k': { mult: 1.0, label: '1k–10k monthly traffic', signal: 'Traffic multiplier 1.0× (baseline)' },
    '10k-50k': { mult: 1.3, label: '10k–50k monthly traffic', signal: 'Traffic multiplier 1.3× (solid organic reach)' },
    '50k-100k': { mult: 1.6, label: '50k–100k monthly traffic', signal: 'Traffic multiplier 1.6× (high traffic premium)' },
    '100k-plus': { mult: 2.0, label: '100k+ monthly traffic', signal: 'Traffic multiplier 2.0× (top-tier reach)' },
  };

  const NICHE_MULTIPLIERS = {
    general: { mult: 1.0, label: 'General', signal: 'Niche multiplier 1.0× (standard market)' },
    tech: { mult: 1.2, label: 'Tech/SaaS', signal: 'Niche premium 1.2× (Tech/SaaS/B2B)' },
    finance: { mult: 1.4, label: 'Finance/Crypto', signal: 'Niche premium 1.4× (Finance/Crypto/Legal)' },
    health: { mult: 1.3, label: 'Health', signal: 'Niche premium 1.3× (Health / YMYL)' },
    lifestyle: { mult: 1.0, label: 'Lifestyle', signal: 'Niche multiplier 1.0× (Lifestyle baseline)' },
  };

  function getBasePrice(dr) {
    const n = Number(dr);
    if (n <= 20) return { price: 30, band: 'DR 1–20' };
    if (n <= 40) return { price: 75, band: 'DR 21–40' };
    if (n <= 60) return { price: 150, band: 'DR 41–60' };
    if (n <= 80) return { price: 280, band: 'DR 61–80' };
    return { price: 450, band: 'DR 81+' };
  }

  function formatUsd(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  }

  function formatTrafficCount(value) {
    const n = Number(value) || 0;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`;
    return String(Math.round(n));
  }

  function normalizeUrl(value) {
    const raw = (value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
  }

  function hostLabel(url) {
    try {
      return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return '';
    }
  }

  function isValidUrl(value) {
    try {
      const u = new URL(normalizeUrl(value));
      return (
        (u.protocol === 'http:' || u.protocol === 'https:') &&
        Boolean(u.hostname) &&
        u.hostname.includes('.') &&
        u.hostname !== 'localhost'
      );
    } catch {
      return false;
    }
  }

  function calculateFairValue({ dr, traffic, niche }) {
    const base = getBasePrice(dr);
    const trafficMeta = TRAFFIC_MULTIPLIERS[traffic] || TRAFFIC_MULTIPLIERS['1k-10k'];
    const nicheMeta = NICHE_MULTIPLIERS[niche] || NICHE_MULTIPLIERS.general;
    const estimated = base.price * trafficMeta.mult * nicheMeta.mult;
    const min = estimated * 0.85;
    const max = estimated * 1.15;

    return {
      base,
      trafficMeta,
      nicheMeta,
      estimated,
      min,
      max,
    };
  }

  function rateDeal(quoted, min, max) {
    if (quoted == null || Number.isNaN(quoted)) return null;
    if (quoted < min) {
      return { key: 'great', label: 'Great Deal', hint: 'Quoted below the fair minimum' };
    }
    if (quoted > max) {
      return { key: 'over', label: 'Overpriced', hint: 'Quoted above the fair maximum' };
    }
    return { key: 'fair', label: 'Fair Price', hint: 'Quoted within the fair market range' };
  }

  function setError(root, field, message) {
    const el = root.querySelector(`[data-error-for="${field}"]`);
    const input = root.querySelector(`[data-lc-${field}]`);
    if (el) {
      el.hidden = !message;
      el.textContent = message || '';
    }
    if (input) input.classList.toggle('is-invalid', Boolean(message));
  }

  function clearErrors(root) {
    setError(root, 'url', '');
    setError(root, 'price', '');
  }

  function setStatus(root, message, tone) {
    const el = root.querySelector('[data-lc-status]');
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = '';
      delete el.dataset.tone;
      return;
    }
    el.hidden = false;
    el.textContent = message;
    el.dataset.tone = tone || 'info';
  }

  function markAuto(root, field, isAuto) {
    const wrap = root.querySelector(`[data-lc-field="${field}"]`);
    const flag = root.querySelector(`[data-lc-auto="${field}"]`);
    wrap?.classList.toggle('is-autofilled', Boolean(isAuto));
    if (flag) flag.hidden = !isAuto;
  }

  function readForm(root) {
    const rawUrl = root.querySelector('[data-lc-url]')?.value?.trim() || '';
    const url = isValidUrl(rawUrl) ? normalizeUrl(rawUrl) : rawUrl;
    const priceRaw = root.querySelector('[data-lc-price]')?.value?.trim() || '';
    const dr = Number(root.querySelector('[data-lc-dr]')?.value ?? 40);
    const traffic = root.querySelector('[data-lc-traffic]')?.value || '1k-10k';
    const niche = root.querySelector('[data-lc-niche]')?.value || 'general';
    const quoted = priceRaw === '' ? null : Number(priceRaw);

    return { url, quoted, dr, traffic, niche };
  }

  function validate(root, data) {
    clearErrors(root);
    let ok = true;

    if (!data.url) {
      setError(root, 'url', 'Enter a target URL.');
      ok = false;
    } else if (!isValidUrl(data.url)) {
      setError(root, 'url', 'Enter a valid URL, e.g. example.com or https://example.com.');
      ok = false;
    }

    if (data.quoted != null && (Number.isNaN(data.quoted) || data.quoted < 0)) {
      setError(root, 'price', 'Quoted price must be a non-negative number.');
      ok = false;
    }

    return ok;
  }

  function renderSignals(listEl, result, deal, metrics) {
    const items = [];

    if (metrics?.source === 'dataforseo') {
      items.push(
        `Live metrics for ${metrics.domain}: DR ${metrics.dr}, ~${formatTrafficCount(metrics.organicTraffic || metrics.etv)} monthly US organic`
      );
    }

    items.push(
      `Base price ${formatUsd(result.base.price)} from ${result.base.band}`,
      result.trafficMeta.signal,
      result.nicheMeta.signal,
      `Point estimate ${formatUsd(result.estimated)} (±15% market band)`
    );

    if (deal) {
      items.push(`${deal.label}: ${deal.hint}`);
    } else {
      items.push('Add a quoted price to see a deal rating');
    }

    listEl.innerHTML = items.map((text) => `<li>${text}</li>`).join('');
  }

  function renderResults(root, data, result) {
    const resultsEl = root.querySelector('[data-lc-results]');
    const rangeEl = root.querySelector('[data-lc-range]');
    const hostEl = root.querySelector('[data-lc-host]');
    const badgeEl = root.querySelector('[data-lc-badge]');
    const badgeLabel = root.querySelector('[data-lc-badge-label]');
    const signalsEl = root.querySelector('[data-lc-signals]');

    if (!resultsEl || !rangeEl || !signalsEl) return;

    const deal = rateDeal(data.quoted, result.min, result.max);
    const host = hostLabel(data.url);
    const metrics = root._lc?.auto && root._lc.auto.domain === host ? root._lc.auto : null;

    rangeEl.textContent = `${formatUsd(result.min)} – ${formatUsd(result.max)}`;
    if (hostEl) {
      hostEl.textContent = host
        ? metrics
          ? `Based on live metrics for ${host}`
          : `Based on metrics for ${host}`
        : '';
    }

    if (badgeEl && badgeLabel) {
      if (deal) {
        badgeEl.hidden = false;
        badgeEl.dataset.rating = deal.key;
        badgeLabel.textContent = deal.label;
      } else {
        badgeEl.hidden = true;
        delete badgeEl.dataset.rating;
        badgeLabel.textContent = '';
      }
    }

    renderSignals(signalsEl, result, deal, metrics);
    resultsEl.hidden = false;
    resultsEl.classList.add('is-visible');
  }

  function syncDrLabel(root) {
    const slider = root.querySelector('[data-lc-dr]');
    const label = root.querySelector('[data-lc-dr-label]');
    if (!slider || !label) return;
    const value = slider.value;
    label.textContent = value;
    slider.setAttribute('aria-valuenow', value);
  }

  function applyMetrics(root, metrics) {
    const state = root._lc;
    const slider = root.querySelector('[data-lc-dr]');
    const traffic = root.querySelector('[data-lc-traffic]');

    state.auto = metrics;

    if (slider && !state.overridden.dr && typeof metrics.dr === 'number') {
      slider.value = String(metrics.dr);
      syncDrLabel(root);
      markAuto(root, 'dr', true);
    }

    if (traffic && !state.overridden.traffic && metrics.trafficBucket) {
      traffic.value = metrics.trafficBucket;
      markAuto(root, 'traffic', true);
    }

    const etv = metrics.organicTraffic || metrics.etv || 0;
    setStatus(
      root,
      `Auto-filled DR ${metrics.dr} and ~${formatTrafficCount(etv)} monthly organic for ${metrics.domain}. Adjust if needed.`,
      'ok'
    );

    if (metrics.quote) {
      const data = readForm(root);
      const result = resultFromQuote(data, metrics);
      renderResults(root, data, result);
    }
  }

  function resultFromQuote(data, metrics) {
    if (metrics?.quote && !rootIsOverridden(data, metrics)) {
      return {
        base: { price: metrics.quote.basePrice, band: metrics.quote.band },
        trafficMeta: TRAFFIC_MULTIPLIERS[metrics.quote.trafficBucket] || TRAFFIC_MULTIPLIERS[data.traffic],
        nicheMeta: NICHE_MULTIPLIERS[data.niche] || NICHE_MULTIPLIERS.general,
        estimated: metrics.quote.estimated,
        min: metrics.quote.min,
        max: metrics.quote.max,
      };
    }
    return calculateFairValue(data);
  }

  function rootIsOverridden(data, metrics) {
    if (!metrics) return true;
    if (Number(data.dr) !== Number(metrics.dr)) return true;
    if (data.traffic !== (metrics.trafficBucket || metrics.quote?.trafficBucket)) return true;
    if (metrics.niche && data.niche !== metrics.niche) return true;
    return false;
  }

  function resetLookup(root) {
    root._lc.auto = null;
    root._lc.overridden = { dr: false, traffic: false };
    markAuto(root, 'dr', false);
    markAuto(root, 'traffic', false);
  }

  async function fetchSiteMetrics(endpoint, domain, extra) {
    const helper = globalThis.AbcGeoCollaborationQuote;
    if (helper?.fetchCollaborationQuote) {
      return helper.fetchCollaborationQuote(domain, {
        endpoint,
        niche: extra?.niche,
        quoted: extra?.quoted,
      });
    }

    const params = new URLSearchParams({ domain });
    if (extra?.niche) params.set('niche', extra.niche);
    if (extra?.quoted != null && extra.quoted !== '') params.set('quoted', String(extra.quoted));
    const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${params.toString()}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok || !body?.ok) {
      const fallback =
        response.status === 404 || response.status === 503
          ? 'Live metrics are not available yet. Enter DR and traffic manually.'
          : body?.error || 'Could not look up this site.';
      throw new Error(fallback);
    }

    return body;
  }

  function lookupForUrl(root, rawUrl) {
    const state = root._lc;
    const domain = hostLabel(rawUrl);
    if (!domain || !isValidUrl(rawUrl)) {
      return Promise.resolve(null);
    }

    if (state.auto && state.auto.domain === domain) {
      return Promise.resolve(state.auto);
    }

    if (state.pendingDomain === domain && state.pending) {
      return state.pending;
    }

    if (state.lastDomain !== domain) {
      resetLookup(root);
      state.lastDomain = domain;
    }

    const seq = ++state.seq;
    setStatus(root, `Looking up domain rating and organic traffic for ${domain}…`, 'info');

    const form = readForm(root);
    const request = fetchSiteMetrics(state.endpoint, domain, {
      niche: form.niche,
      quoted: form.quoted,
    })
      .then((metrics) => {
        if (seq !== state.seq) return state.auto;
        applyMetrics(root, metrics);
        return metrics;
      })
      .catch((err) => {
        if (seq !== state.seq) return null;
        state.auto = null;
        markAuto(root, 'dr', false);
        markAuto(root, 'traffic', false);
        setStatus(
          root,
          err.message || 'Could not look up this site. Enter DR and traffic manually.',
          'warn'
        );
        return null;
      })
      .finally(() => {
        if (state.pendingDomain === domain) {
          state.pending = null;
          state.pendingDomain = '';
        }
      });

    state.pending = request;
    state.pendingDomain = domain;
    return request;
  }

  function scheduleLookup(root) {
    const raw = root.querySelector('[data-lc-url]')?.value?.trim() || '';
    clearTimeout(root._lc.timer);
    if (!isValidUrl(raw)) {
      root._lc.seq += 1;
      root._lc.pending = null;
      root._lc.pendingDomain = '';
      if (raw) {
        setStatus(root, 'Enter a full domain (example.com) to auto-fill DR and traffic.', 'info');
      } else {
        setStatus(root, '', '');
      }
      return;
    }
    root._lc.timer = setTimeout(() => {
      lookupForUrl(root, raw);
    }, LOOKUP_DEBOUNCE_MS);
  }

  function setBusy(root, busy) {
    const btn = root.querySelector('[data-lc-submit]');
    if (!btn) return;
    btn.disabled = busy;
    btn.setAttribute('aria-busy', busy ? 'true' : 'false');
    if (!btn.dataset.label) btn.dataset.label = btn.textContent.trim();
    btn.textContent = busy ? 'Looking up metrics…' : btn.dataset.label;
  }

  function initRoot(root) {
    const form = root.querySelector('[data-lc-form]');
    const slider = root.querySelector('[data-lc-dr]');
    const traffic = root.querySelector('[data-lc-traffic]');
    const urlInput = root.querySelector('[data-lc-url]');

    root._lc = {
      endpoint: root.getAttribute('data-lc-metrics-endpoint') || DEFAULT_ENDPOINT,
      timer: null,
      seq: 0,
      pending: null,
      pendingDomain: '',
      lastDomain: '',
      auto: null,
      overridden: { dr: false, traffic: false },
    };

    syncDrLabel(root);

    urlInput?.addEventListener('input', () => scheduleLookup(root));
    urlInput?.addEventListener('blur', () => {
      const raw = urlInput.value.trim();
      if (isValidUrl(raw)) lookupForUrl(root, raw);
    });

    slider?.addEventListener('input', () => {
      syncDrLabel(root);
      const autoDr = root._lc.auto?.dr;
      const isAuto = autoDr != null && Number(slider.value) === Number(autoDr);
      root._lc.overridden.dr = !isAuto && autoDr != null;
      markAuto(root, 'dr', isAuto);
    });

    traffic?.addEventListener('change', () => {
      const autoBucket = root._lc.auto?.trafficBucket;
      const isAuto = autoBucket != null && traffic.value === autoBucket;
      root._lc.overridden.traffic = !isAuto && autoBucket != null;
      markAuto(root, 'traffic', isAuto);
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = readForm(root);
      if (!validate(root, data)) return;

      const domain = hostLabel(data.url);
      if (domain && (!root._lc.auto || root._lc.auto.domain !== domain)) {
        setBusy(root, true);
        try {
          await lookupForUrl(root, data.url);
        } finally {
          setBusy(root, false);
        }
      }

      const next = readForm(root);
      const result = resultFromQuote(next, root._lc.auto);
      renderResults(root, next, result);
    });
  }

  function init() {
    document.querySelectorAll('[data-link-calc]').forEach(initRoot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.AbcGeoLinkPricing = {
    calculateFairValue,
    rateDeal,
    getBasePrice,
    fetchCollaborationQuote: (domain, options) =>
      fetchSiteMetrics(
        options?.endpoint || DEFAULT_ENDPOINT,
        domain,
        options
      ),
  };
})();
