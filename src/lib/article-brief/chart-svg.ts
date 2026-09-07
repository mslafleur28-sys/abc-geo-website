import { getTableKindOption } from './table-kinds';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[%$,\s]/g, '').trim();
  if (!cleaned || cleaned === '…' || cleaned === '-') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const PALETTE = [
  '#00B4D8',
  '#FF6B4A',
  '#00C9A7',
  '#FF8C00',
  '#00566B',
  '#64748B',
];

function seriesFromTable(
  headers: string[],
  rows: string[][],
): { labels: string[]; series: { name: string; values: number[] }[] } {
  const labels = rows.map((r) => r[0] || 'Item');
  const series = headers.slice(1).map((name, i) => ({
    name: name || `Series ${i + 1}`,
    values: rows.map((r) => parseNumber(r[i + 1] || '') ?? 0),
  }));
  if (series.length === 0) {
    return {
      labels,
      series: [
        {
          name: 'Value',
          values: rows.map((r) => parseNumber(r[1] || r[0] || '') ?? 0),
        },
      ],
    };
  }
  return { labels, series };
}

function maxAbs(values: number[]): number {
  return Math.max(1, ...values.map((v) => Math.abs(v)));
}

/** Build a compact SVG chart from table data for preview / publish. */
export function renderChartSvg(
  kindRaw: string | undefined,
  headers: string[],
  rows: string[][],
  opts?: { width?: number; height?: number },
): string {
  const kind = getTableKindOption(kindRaw).id;
  const width = opts?.width ?? 640;
  const height = opts?.height ?? 320;
  const pad = 36;
  const { labels, series } = seriesFromTable(headers, rows);
  if (!labels.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img"><text x="50%" y="50%" text-anchor="middle" fill="#64748B" font-family="DM Sans,sans-serif" font-size="14">Add numeric rows to render this chart</text></svg>`;
  }

  if (kind === 'pie' || kind === 'donut') {
    const values = series[0]?.values || [];
    const total = values.reduce((a, b) => a + Math.max(0, b), 0) || 1;
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) * 0.32;
    const inner = kind === 'donut' ? r * 0.55 : 0;
    let angle = -Math.PI / 2;
    const slices = values.map((v, i) => {
      const frac = Math.max(0, v) / total;
      const start = angle;
      angle += frac * Math.PI * 2;
      const end = angle;
      const large = end - start > Math.PI ? 1 : 0;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const path =
        frac >= 0.999
          ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
          : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      return `<path d="${path}" fill="${PALETTE[i % PALETTE.length]}" />`;
    });
    const hole =
      inner > 0
        ? `<circle cx="${cx}" cy="${cy}" r="${inner}" fill="#FAF9F6" />`
        : '';
    const legend = labels
      .slice(0, 8)
      .map(
        (label, i) =>
          `<g transform="translate(${16},${20 + i * 18})"><rect width="10" height="10" rx="2" fill="${PALETTE[i % PALETTE.length]}"/><text x="16" y="9" font-size="11" font-family="DM Sans,sans-serif" fill="#1A202C">${escapeXml(label)}</text></g>`,
      )
      .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(getTableKindOption(kind).label)}">${slices.join('')}${hole}${legend}</svg>`;
  }

  if (kind === 'scatter') {
    const xs = rows.map((r) => parseNumber(r[0] || '') ?? 0);
    const ys = rows.map((r) => parseNumber(r[1] || '') ?? 0);
    const minX = Math.min(...xs, 0);
    const maxX = Math.max(...xs, 1);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, 1);
    const plotW = width - pad * 2;
    const plotH = height - pad * 2;
    const dots = xs
      .map((x, i) => {
        const px = pad + ((x - minX) / (maxX - minX || 1)) * plotW;
        const py = pad + plotH - ((ys[i] - minY) / (maxY - minY || 1)) * plotH;
        return `<circle cx="${px}" cy="${py}" r="5" fill="#00B4D8" />`;
      })
      .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img"><rect x="${pad}" y="${pad}" width="${plotW}" height="${plotH}" fill="none" stroke="#E8EEF2"/>${dots}</svg>`;
  }

  if (kind === 'radar') {
    const n = Math.max(labels.length, 3);
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) * 0.34;
    const values = series[0]?.values || [];
    const maxV = maxAbs(values);
    const pts = Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const v = (values[i] || 0) / maxV;
      return [cx + r * v * Math.cos(a), cy + r * v * Math.sin(a)];
    });
    const grid = Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      return `M ${cx} ${cy} L ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
    }).join(' ');
    const poly = pts.map((p) => p.join(',')).join(' ');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img"><path d="${grid}" stroke="#E8EEF2" fill="none"/><polygon points="${poly}" fill="rgba(0,180,216,0.25)" stroke="#00B4D8" stroke-width="2"/></svg>`;
  }

  if (kind === 'box') {
    const values = (series[0]?.values || []).slice().sort((a, b) => a - b);
    if (values.length < 2) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img"><text x="50%" y="50%" text-anchor="middle" fill="#64748B" font-family="DM Sans,sans-serif" font-size="14">Need at least 2 numeric values</text></svg>`;
    }
    const q = (p: number) => {
      const idx = (values.length - 1) * p;
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      return values[lo] + (values[hi] - values[lo]) * (idx - lo);
    };
    const min = values[0];
    const max = values[values.length - 1];
    const q1 = q(0.25);
    const med = q(0.5);
    const q3 = q(0.75);
    const plotW = width - pad * 2;
    const y = height / 2;
    const scale = (v: number) =>
      pad + ((v - min) / (max - min || 1)) * plotW;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img"><line x1="${scale(min)}" y1="${y}" x2="${scale(max)}" y2="${y}" stroke="#64748B"/><rect x="${scale(q1)}" y="${y - 28}" width="${Math.max(2, scale(q3) - scale(q1))}" height="56" fill="rgba(0,180,216,0.25)" stroke="#00B4D8"/><line x1="${scale(med)}" y1="${y - 28}" x2="${scale(med)}" y2="${y + 28}" stroke="#FF6B4A" stroke-width="3"/></svg>`;
  }

  // Shared cartesian charts: bar, column, line, area, stacked-bar, histogram
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;
  const allVals = series.flatMap((s) => s.values);
  const maxV = maxAbs(allVals);
  const n = labels.length;
  const groupW = plotW / Math.max(n, 1);

  if (kind === 'bar') {
    const bars = labels
      .map((label, i) => {
        const v = series[0]?.values[i] || 0;
        const bw = (Math.abs(v) / maxV) * (plotW * 0.75);
        const y = pad + i * (plotH / n) + 4;
        const h = Math.max(10, plotH / n - 8);
        return `<rect x="${pad}" y="${y}" width="${bw}" height="${h}" rx="4" fill="${PALETTE[0]}"/><text x="${pad + 6}" y="${y + h / 2 + 4}" font-size="11" fill="#1A202C" font-family="DM Sans,sans-serif">${escapeXml(label)}</text>`;
      })
      .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">${bars}</svg>`;
  }

  if (kind === 'line' || kind === 'area') {
    const points = labels.map((_, i) => {
      const x = pad + groupW * i + groupW / 2;
      const y = pad + plotH - ((series[0]?.values[i] || 0) / maxV) * plotH;
      return `${x},${y}`;
    });
    const line = points.join(' ');
    const area =
      kind === 'area'
        ? `<polygon points="${pad},${pad + plotH} ${line} ${pad + plotW},${pad + plotH}" fill="rgba(0,180,216,0.2)" />`
        : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img"><rect x="${pad}" y="${pad}" width="${plotW}" height="${plotH}" fill="none" stroke="#E8EEF2"/>${area}<polyline points="${line}" fill="none" stroke="#00B4D8" stroke-width="2.5"/></svg>`;
  }

  if (kind === 'stacked-bar') {
    const bars = labels
      .map((label, i) => {
        let y = pad + plotH;
        const x = pad + groupW * i + groupW * 0.15;
        const bw = groupW * 0.7;
        const stack = series
          .map((s, si) => {
            const v = Math.max(0, s.values[i] || 0);
            const h = (v / maxV) * plotH;
            y -= h;
            return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" fill="${PALETTE[si % PALETTE.length]}"/>`;
          })
          .join('');
        return `${stack}<text x="${x + bw / 2}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#64748B" font-family="DM Sans,sans-serif">${escapeXml(label.slice(0, 10))}</text>`;
      })
      .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">${bars}</svg>`;
  }

  // column + histogram default
  const bars = labels
    .map((label, i) => {
      const v = series[0]?.values[i] || 0;
      const h = (Math.abs(v) / maxV) * plotH;
      const x = pad + groupW * i + groupW * 0.15;
      const bw = groupW * 0.7;
      const y = pad + plotH - h;
      return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="3" fill="${PALETTE[i % PALETTE.length]}"/><text x="${x + bw / 2}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#64748B" font-family="DM Sans,sans-serif">${escapeXml(label.slice(0, 10))}</text>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img"><rect x="${pad}" y="${pad}" width="${plotW}" height="${plotH}" fill="none" stroke="#E8EEF2"/>${bars}</svg>`;
}
