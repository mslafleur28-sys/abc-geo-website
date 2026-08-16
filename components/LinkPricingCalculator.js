/**
 * abcGEO · Guest Post & Link Placement Value Calculator
 * Expects markup from components/LinkPricingCalculator.html ([data-link-calc] root).
 *
 * User enters a URL (+ optional quoted price). Traffic & authority are estimated
 * from the site's Tranco global popularity rank (free, CORS-enabled public API).
 */
(function () {
  'use strict';

  const TRANCO_RANK_URL = 'https://tranco-list.eu/api/ranks/domain/';

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

  const NICHE_PATTERNS = [
    {
      key: 'finance',
      pattern:
        /(financ|bank|invest|crypto|bitcoin|ethereum|nft|insurance|loan|mortgage|trading|forex|legal|attorney|lawyer|tax|fintech|coin|paypal|stripe|wealth|capital|broker)/i,
    },
    {
      key: 'health',
      pattern:
        /(health|medic|clinic|pharma|dental|wellness|fitness|nutrition|therapy|hospital|doctor|mental|yoga|diet|webmd|mayo)/i,
    },
    {
      key: 'tech',
      pattern:
        /(tech|saas|software|cloud|devops|cyber|\bai\b|\bml\b|data|developer|startup|\bapp\b|\bapi\b|hosting|seo|marketing|b2b|github|stack)/i,
    },
    {
      key: 'lifestyle',
      pattern:
        /(lifestyle|travel|food|recipe|fashion|beauty|garden|parent|wedding|\bdiy\b|hobby|entertainment|vogue|bonappetit)/i,
    },
  ];

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

  function formatRank(rank) {
    if (rank == null) return 'Outside Tranco top 1M';
    return `#${Number(rank).toLocaleString('en-US')} (Tranco)`;
  }

  function hostLabel(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  function normalizeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
  }

  function isValidUrl(value) {
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Map Tranco global popularity rank → estimated Domain Authority (0–100).
   * Logarithmic curve: rank 1 ≈ 95, rank ~1M ≈ 12, unranked ≈ 10.
   */
  function estimateDrFromRank(rank) {
    if (rank == null || !Number.isFinite(rank) || rank <= 0) return 10;
    const clamped = Math.min(Math.max(rank, 1), 1_000_000);
    const t = Math.log10(clamped) / 6; // 0..1 across 1..1e6
    return Math.round(Math.min(95, Math.max(8, 95 - t * 83)));
  }

  /**
   * Map Tranco rank → monthly organic traffic band used by the pricing model.
   */
  function estimateTrafficBandFromRank(rank) {
    if (rank == null || !Number.isFinite(rank) || rank <= 0) return 'under-1k';
    if (rank <= 500) return '100k-plus';
    if (rank <= 5_000) return '50k-100k';
    if (rank <= 25_000) return '10k-50k';
    if (rank <= 150_000) return '1k-10k';
    return 'under-1k';
  }

  function inferNicheFromUrl(url) {
    const host = hostLabel(url).toLowerCase();
    let path = '';
    try {
      path = new URL(url).pathname.toLowerCase();
    } catch {
      path = '';
    }
    const haystack = `${host} ${path}`.replace(/[._/-]+/g, ' ');

    for (const entry of NICHE_PATTERNS) {
      if (entry.pattern.test(haystack)) return entry.key;
    }
    return 'general';
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

  async function fetchTrancoRank(domain) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${TRANCO_RANK_URL}${encodeURIComponent(domain)}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Lookup failed (${response.status})`);
      }

      const payload = await response.json();
      const ranks = Array.isArray(payload?.ranks) ? payload.ranks : [];
      if (!ranks.length) return null;

      const latest = ranks[0];
      const rank = Number(latest?.rank);
      return Number.isFinite(rank) && rank > 0 ? rank : null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function lookupSiteMetrics(url) {
    const domain = hostLabel(url);
    if (!domain) throw new Error('Could not parse domain from URL.');

    const rank = await fetchTrancoRank(domain);
    const dr = estimateDrFromRank(rank);
    const traffic = estimateTrafficBandFromRank(rank);
    const niche = inferNicheFromUrl(url);

    return {
      domain,
      rank,
      dr,
      traffic,
      niche,
      source: 'Tranco global popularity list',
    };
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
    const submit = root.querySelector('[data-lc-submit]');
    if (!el) return;

    if (!message) {
      el.hidden = true;
      el.textContent = '';
      delete el.dataset.tone;
    } else {
      el.hidden = false;
      el.textContent = message;
      el.dataset.tone = tone || 'info';
    }

    if (submit) {
      const busy = tone === 'loading';
      submit.disabled = busy;
      submit.setAttribute('aria-busy', busy ? 'true' : 'false');
      submit.textContent = busy ? 'Looking up metrics…' : 'Get Fair Value Estimate';
    }
  }

  function readForm(root) {
    const url = normalizeUrl(root.querySelector('[data-lc-url]')?.value || '');
    const priceRaw = root.querySelector('[data-lc-price]')?.value?.trim() || '';
    const quoted = priceRaw === '' ? null : Number(priceRaw);
    return { url, quoted };
  }

  function validate(root, data) {
    clearErrors(root);
    let ok = true;

    if (!data.url) {
      setError(root, 'url', 'Enter a website URL.');
      ok = false;
    } else if (!isValidUrl(data.url)) {
      setError(root, 'url', 'Enter a valid http(s) URL or domain.');
      ok = false;
    }

    if (data.quoted != null && (Number.isNaN(data.quoted) || data.quoted < 0)) {
      setError(root, 'price', 'Quoted price must be a non-negative number.');
      ok = false;
    }

    return ok;
  }

  function renderSignals(listEl, result, deal, metrics) {
    const items = [
      `Looked up ${metrics.domain} via ${metrics.source}`,
      metrics.rank != null
        ? `Global popularity rank ${formatRank(metrics.rank)}`
        : 'Not listed in the Tranco top 1M (treated as low-traffic)',
      `Estimated domain authority ${metrics.dr}/100 → base ${formatUsd(result.base.price)} (${result.base.band})`,
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

  function renderMetrics(root, metrics, result) {
    const wrap = root.querySelector('[data-lc-metrics]');
    const drEl = root.querySelector('[data-lc-metric-dr]');
    const trafficEl = root.querySelector('[data-lc-metric-traffic]');
    const nicheEl = root.querySelector('[data-lc-metric-niche]');
    const rankEl = root.querySelector('[data-lc-metric-rank]');

    if (drEl) drEl.textContent = String(metrics.dr);
    if (trafficEl) trafficEl.textContent = result.trafficMeta.label;
    if (nicheEl) nicheEl.textContent = result.nicheMeta.label;
    if (rankEl) rankEl.textContent = formatRank(metrics.rank);
    if (wrap) wrap.hidden = false;
  }

  function renderResults(root, data, result, metrics) {
    const resultsEl = root.querySelector('[data-lc-results]');
    const rangeEl = root.querySelector('[data-lc-range]');
    const hostEl = root.querySelector('[data-lc-host]');
    const badgeEl = root.querySelector('[data-lc-badge]');
    const badgeLabel = root.querySelector('[data-lc-badge-label]');
    const signalsEl = root.querySelector('[data-lc-signals]');

    if (!resultsEl || !rangeEl || !signalsEl) return;

    const deal = rateDeal(data.quoted, result.min, result.max);
    const host = metrics.domain || hostLabel(data.url);

    rangeEl.textContent = `${formatUsd(result.min)} – ${formatUsd(result.max)}`;
    if (hostEl) {
      hostEl.textContent = host
        ? `Based on auto-detected traffic & authority for ${host}`
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

    renderMetrics(root, metrics, result);
    renderSignals(signalsEl, result, deal, metrics);
    resultsEl.hidden = false;
    resultsEl.classList.add('is-visible');
  }

  function initRoot(root) {
    const form = root.querySelector('[data-lc-form]');
    const urlInput = root.querySelector('[data-lc-url]');

    urlInput?.addEventListener('blur', () => {
      const normalized = normalizeUrl(urlInput.value);
      if (normalized && normalized !== urlInput.value.trim()) {
        urlInput.value = normalized;
      }
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = readForm(root);
      if (!validate(root, data)) return;

      const host = hostLabel(data.url);
      setStatus(root, `Looking up traffic & authority for ${host}…`, 'loading');

      try {
        const metrics = await lookupSiteMetrics(data.url);
        const result = calculateFairValue({
          dr: metrics.dr,
          traffic: metrics.traffic,
          niche: metrics.niche,
        });
        renderResults(root, data, result, metrics);
        setStatus(root, '', '');
      } catch (error) {
        console.error('[AbcGeoLinkPricing]', error);
        setStatus(
          root,
          'Could not look up site metrics right now. Check the URL and try again in a moment.',
          'error'
        );
      }
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
    estimateDrFromRank,
    estimateTrafficBandFromRank,
    inferNicheFromUrl,
    lookupSiteMetrics,
  };
})();
