/**
 * Fair-value formula for guest posts / niche-edit placements.
 * Used by the API so quotes are calculated server-side from DataForSEO metrics.
 */

export const TRAFFIC_MULTIPLIERS = {
  'under-1k': { mult: 0.8, label: '<1k monthly traffic', signal: 'Traffic multiplier 0.8× (low volume)' },
  '1k-10k': { mult: 1.0, label: '1k–10k monthly traffic', signal: 'Traffic multiplier 1.0× (baseline)' },
  '10k-50k': { mult: 1.3, label: '10k–50k monthly traffic', signal: 'Traffic multiplier 1.3× (solid organic reach)' },
  '50k-100k': { mult: 1.6, label: '50k–100k monthly traffic', signal: 'Traffic multiplier 1.6× (high traffic premium)' },
  '100k-plus': { mult: 2.0, label: '100k+ monthly traffic', signal: 'Traffic multiplier 2.0× (top-tier reach)' },
};

export const NICHE_MULTIPLIERS = {
  general: { mult: 1.0, label: 'General', signal: 'Niche multiplier 1.0× (standard market)' },
  tech: { mult: 1.2, label: 'Tech/SaaS', signal: 'Niche premium 1.2× (Tech/SaaS/B2B)' },
  finance: { mult: 1.4, label: 'Finance/Crypto', signal: 'Niche premium 1.4× (Finance/Crypto/Legal)' },
  health: { mult: 1.3, label: 'Health', signal: 'Niche premium 1.3× (Health / YMYL)' },
  lifestyle: { mult: 1.0, label: 'Lifestyle', signal: 'Niche multiplier 1.0× (Lifestyle baseline)' },
};

export function trafficBucket(etv) {
  const n = Number(etv) || 0;
  if (n < 1000) return 'under-1k';
  if (n < 10_000) return '1k-10k';
  if (n < 50_000) return '10k-50k';
  if (n < 100_000) return '50k-100k';
  return '100k-plus';
}

export function getBasePrice(dr) {
  const n = Number(dr);
  if (n <= 20) return { price: 30, band: 'DR 1–20' };
  if (n <= 40) return { price: 75, band: 'DR 21–40' };
  if (n <= 60) return { price: 150, band: 'DR 41–60' };
  if (n <= 80) return { price: 280, band: 'DR 61–80' };
  return { price: 450, band: 'DR 81+' };
}

export function rateDeal(quoted, min, max) {
  if (quoted == null || Number.isNaN(quoted)) return null;
  if (quoted < min) {
    return { key: 'great', label: 'Great Deal', hint: 'Quoted below the fair minimum' };
  }
  if (quoted > max) {
    return { key: 'over', label: 'Overpriced', hint: 'Quoted above the fair maximum' };
  }
  return { key: 'fair', label: 'Fair Price', hint: 'Quoted within the fair market range' };
}

export function calculateCollaborationQuote({ dr, organicTraffic, niche = 'general' }) {
  const base = getBasePrice(dr);
  const bucket = trafficBucket(organicTraffic);
  const trafficMeta = TRAFFIC_MULTIPLIERS[bucket] || TRAFFIC_MULTIPLIERS['1k-10k'];
  const nicheMeta = NICHE_MULTIPLIERS[niche] || NICHE_MULTIPLIERS.general;
  const estimated = base.price * trafficMeta.mult * nicheMeta.mult;

  return {
    estimated,
    min: estimated * 0.85,
    max: estimated * 1.15,
    trafficBucket: bucket,
    basePrice: base.price,
    band: base.band,
    trafficMultiplier: trafficMeta.mult,
    nicheMultiplier: nicheMeta.mult,
    trafficSignal: trafficMeta.signal,
    nicheSignal: nicheMeta.signal,
    niche: nicheMeta.label,
  };
}
