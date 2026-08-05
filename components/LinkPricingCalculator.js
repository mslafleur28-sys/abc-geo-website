/**
 * abcGEO · Guest Post & Link Placement Value Calculator
 * Expects markup from components/LinkPricingCalculator.html ([data-link-calc] root).
 */
(function () {
  'use strict';

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

  function hostLabel(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  function isValidUrl(value) {
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
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

  function readForm(root) {
    const url = root.querySelector('[data-lc-url]')?.value?.trim() || '';
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
      setError(root, 'url', 'Enter a valid http(s) URL.');
      ok = false;
    }

    if (data.quoted != null && (Number.isNaN(data.quoted) || data.quoted < 0)) {
      setError(root, 'price', 'Quoted price must be a non-negative number.');
      ok = false;
    }

    return ok;
  }

  function renderSignals(listEl, result, deal) {
    const items = [
      `Base price ${formatUsd(result.base.price)} from ${result.base.band}`,
      result.trafficMeta.signal,
      result.nicheMeta.signal,
      `Point estimate ${formatUsd(result.estimated)} (±15% market band)`,
    ];

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

    rangeEl.textContent = `${formatUsd(result.min)} – ${formatUsd(result.max)}`;
    if (hostEl) {
      hostEl.textContent = host ? `Based on metrics for ${host}` : '';
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

    renderSignals(signalsEl, result, deal);
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

  function initRoot(root) {
    const form = root.querySelector('[data-lc-form]');
    const slider = root.querySelector('[data-lc-dr]');

    syncDrLabel(root);

    slider?.addEventListener('input', () => syncDrLabel(root));

    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = readForm(root);
      if (!validate(root, data)) return;
      const result = calculateFairValue(data);
      renderResults(root, data, result);
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
  };
})();
