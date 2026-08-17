/**
 * abcGEO · Citationscape
 * Brand Citation Graph Generator for Answer Engines.
 * Expects markup from components/CitationscapeTool.html ([data-citationscape] root).
 */
(function () {
  'use strict';

  const DEFAULTS = {
    brand: 'ABC GEO',
    url: 'https://abcgeo.dev',
    industry: 'Generative Engine Optimization',
    founder: 'Alex Rivera',
    title: 'Founder & CEO',
    products: 'Citationscape, INSTASTACK, GEO Audit',
    sameAs: [
      'https://www.linkedin.com/company/abcgeo',
      'https://twitter.com/abcgeo',
      'https://www.crunchbase.com/organization/abcgeo',
      'https://www.youtube.com/@abcgeo',
    ].join('\n'),
  };

  const NODE_COLORS = {
    brand: '#FF6B4A',
    founder: '#00B4D8',
    industry: '#00C9A7',
    product: '#FF8C00',
    sameAs: '#94A3B8',
  };

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'entity';
  }

  function truncate(str, max) {
    const s = String(str || '');
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
  }

  function parseProducts(raw) {
    return String(raw || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function parseSameAs(raw) {
    return String(raw || '')
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function isValidUrl(value) {
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function hostLabel(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return truncate(url, 24);
    }
  }

  function normalizeBaseUrl(url) {
    try {
      const u = new URL(url);
      return `${u.origin}${u.pathname.replace(/\/$/, '') || ''}`;
    } catch {
      return String(url || '').replace(/\/$/, '');
    }
  }

  function readForm(root) {
    return {
      brand: root.querySelector('[data-em-brand]')?.value?.trim() || '',
      url: root.querySelector('[data-em-url]')?.value?.trim() || '',
      industry: root.querySelector('[data-em-industry]')?.value?.trim() || '',
      founder: root.querySelector('[data-em-founder]')?.value?.trim() || '',
      title: root.querySelector('[data-em-title]')?.value?.trim() || '',
      products: root.querySelector('[data-em-products]')?.value?.trim() || '',
      sameAs: root.querySelector('[data-em-sameas]')?.value?.trim() || '',
    };
  }

  function writeForm(root, data) {
    const fields = {
      '[data-em-brand]': data.brand,
      '[data-em-url]': data.url,
      '[data-em-industry]': data.industry,
      '[data-em-founder]': data.founder,
      '[data-em-title]': data.title,
      '[data-em-products]': data.products,
      '[data-em-sameas]': data.sameAs,
    };
    Object.entries(fields).forEach(([sel, val]) => {
      const el = root.querySelector(sel);
      if (el) el.value = val;
    });
  }

  function buildJsonLd(data) {
    const base = normalizeBaseUrl(data.url) || 'https://example.com';
    const orgId = `${base}/#organization`;
    const personId = `${base}/#person-${slugify(data.founder)}`;
    const products = parseProducts(data.products);
    const sameAs = parseSameAs(data.sameAs).filter(isValidUrl);

    const services = products.map((name, i) => {
      const id = `${base}/#service-${slugify(name)}`;
      return {
        '@type': 'Service',
        '@id': id,
        name,
        provider: { '@id': orgId },
        url: base,
      };
    });

    const organization = {
      '@type': 'Organization',
      '@id': orgId,
      name: data.brand,
      url: base,
      knowsAbout: data.industry,
      founder: { '@id': personId },
      makesOffer: services.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@id': s['@id'] },
      })),
    };

    if (sameAs.length) organization.sameAs = sameAs;

    const person = {
      '@type': 'Person',
      '@id': personId,
      name: data.founder,
      jobTitle: data.title,
      worksFor: { '@id': orgId },
    };

    return {
      '@context': 'https://schema.org',
      '@graph': [organization, person, ...services],
    };
  }

  function validatePayload(data, jsonLd) {
    const errors = [];
    if (!data.brand) errors.push('Brand name is required.');
    if (!data.url || !isValidUrl(data.url)) errors.push('Official URL must be a valid http(s) URL.');
    if (!data.industry) errors.push('Industry / niche is required.');
    if (!data.founder) errors.push('Founder name is required.');
    if (!data.title) errors.push('Founder title is required.');
    if (!parseProducts(data.products).length) errors.push('Add at least one product or service.');

    const sameAsRaw = parseSameAs(data.sameAs);
    const invalidSameAs = sameAsRaw.filter((u) => !isValidUrl(u));
    if (invalidSameAs.length) {
      errors.push(`Invalid sameAs URL(s): ${invalidSameAs.slice(0, 2).join(', ')}`);
    }

    const graph = jsonLd?.['@graph'];
    if (!Array.isArray(graph) || !graph.length) {
      errors.push('@graph must contain at least one entity.');
    } else {
      const org = graph.find((n) => n['@type'] === 'Organization');
      if (!org?.['@id'] || !org?.name || !org?.url) {
        errors.push('Organization requires @id, name, and url.');
      }
      if (!org?.founder?.['@id']) errors.push('Organization.founder @id is missing.');
      if (!org?.knowsAbout) errors.push('Organization.knowsAbout is missing.');
      if (!Array.isArray(org?.makesOffer) || !org.makesOffer.length) {
        errors.push('Organization.makesOffer must list at least one offer.');
      }
      const person = graph.find((n) => n['@type'] === 'Person');
      if (!person?.name || !person?.jobTitle) {
        errors.push('Person requires name and jobTitle.');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings:
        sameAsRaw.length === 0
          ? ['No sameAs links provided — external entity verification will be weaker.']
          : [],
    };
  }

  function buildGraphModel(data) {
    const products = parseProducts(data.products);
    const sameAs = parseSameAs(data.sameAs);
    const cx = 360;
    const cy = 240;

    const nodes = [
      {
        id: 'brand',
        label: data.brand || 'Brand',
        kind: 'brand',
        predicate: 'schema:Organization',
        x: cx,
        y: cy,
        r: 46,
      },
    ];

    const edges = [];

    // Founder
    nodes.push({
      id: 'founder',
      label: data.founder || 'Founder',
      sub: data.title || '',
      kind: 'founder',
      predicate: 'brand:hasFounder',
      x: cx - 220,
      y: cy - 130,
      r: 34,
    });
    edges.push({ from: 'brand', to: 'founder', predicate: 'brand:hasFounder' });

    // Industry
    nodes.push({
      id: 'industry',
      label: data.industry || 'Industry',
      kind: 'industry',
      predicate: 'brand:knowsAbout',
      x: cx + 220,
      y: cy - 130,
      r: 34,
    });
    edges.push({ from: 'brand', to: 'industry', predicate: 'brand:knowsAbout' });

    // Products (fan below-left / below)
    const productSlots = Math.max(products.length, 1);
    products.slice(0, 6).forEach((name, i) => {
      const spread = Math.min(productSlots, 6);
      const t = spread === 1 ? 0.5 : i / (spread - 1);
      const x = cx - 200 + t * 200;
      const y = cy + 150;
      const id = `product-${i}`;
      nodes.push({
        id,
        label: name,
        kind: 'product',
        predicate: 'brand:offersService',
        x,
        y,
        r: 28,
      });
      edges.push({ from: 'brand', to: id, predicate: 'brand:offersService' });
    });

    // sameAs profiles (fan right / below-right)
    sameAs.slice(0, 5).forEach((url, i) => {
      const count = Math.min(sameAs.length, 5);
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = -0.35 + t * 1.4;
      const radius = 195;
      const x = cx + Math.cos(angle) * radius + 40;
      const y = cy + Math.sin(angle) * radius * 0.85;
      const id = `sameas-${i}`;
      nodes.push({
        id,
        label: hostLabel(url),
        sub: truncate(url, 36),
        kind: 'sameAs',
        predicate: 'brand:sameAs',
        x,
        y,
        r: 26,
      });
      edges.push({ from: 'brand', to: id, predicate: 'brand:sameAs' });
    });

    return { nodes, edges };
  }

  function escapeXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function wrapLabel(text, maxChars) {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach((w) => {
      const next = line ? `${line} ${w}` : w;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = w;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }

  function renderGraph(svg, model) {
    const { nodes, edges } = model;
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

    const edgeMarkup = edges
      .map((e) => {
        const a = byId[e.from];
        const b = byId[e.to];
        if (!a || !b) return '';
        return `<line
          class="em-edge"
          data-predicate="${escapeXml(e.predicate)}"
          x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
          stroke="rgba(148,163,184,0.35)" stroke-width="2"
        />`;
      })
      .join('');

    const nodeMarkup = nodes
      .map((n) => {
        const fill = NODE_COLORS[n.kind] || NODE_COLORS.sameAs;
        const lines = wrapLabel(n.label, n.kind === 'brand' ? 14 : 12);
        const textY = n.y - ((lines.length - 1) * 7);
        const tspans = lines
          .map(
            (line, i) =>
              `<tspan x="${n.x}" y="${textY + i * 14}">${escapeXml(truncate(line, 16))}</tspan>`
          )
          .join('');
        return `<g class="em-node" data-kind="${escapeXml(n.kind)}" data-predicate="${escapeXml(
          n.predicate
        )}" data-label="${escapeXml(n.label)}" tabindex="0" role="img" aria-label="${escapeXml(
          `${n.label}: ${n.predicate}`
        )}">
          <circle class="em-node__halo" cx="${n.x}" cy="${n.y}" r="${n.r + 10}" fill="${fill}" opacity="0.15" />
          <circle class="em-node__core" cx="${n.x}" cy="${n.y}" r="${n.r}" fill="#0F172A" stroke="${fill}" stroke-width="${
          n.kind === 'brand' ? 3.5 : 2.5
        }" />
          <text class="em-node__label" text-anchor="middle" fill="#F8FAFC" font-size="${
            n.kind === 'brand' ? 13 : 11
          }" font-family="Syne, DM Sans, sans-serif" font-weight="700">${tspans}</text>
        </g>`;
      })
      .join('');

    svg.innerHTML = `
      <defs>
        <radialGradient id="em-bg-glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stop-color="rgba(0,180,216,0.18)" />
          <stop offset="55%" stop-color="rgba(15,23,42,0)" />
        </radialGradient>
        <filter id="em-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <rect width="720" height="480" rx="16" fill="#0B1220" />
      <rect width="720" height="480" rx="16" fill="url(#em-bg-glow)" />
      <text x="24" y="32" fill="rgba(148,163,184,0.85)" font-size="11" font-family="JetBrains Mono, monospace">
        citation graph · schema.org predicates
      </text>
      <g class="em-edges">${edgeMarkup}</g>
      <g class="em-nodes" filter="url(#em-soft)">${nodeMarkup}</g>
    `;
  }

  function setValidateUI(root, result) {
    const badge = root.querySelector('[data-em-validate]');
    const label = root.querySelector('[data-em-validate-label]');
    if (!badge || !label) return;

    if (result.valid) {
      badge.dataset.status = result.warnings.length ? 'warn' : 'valid';
      label.textContent = result.warnings.length
        ? `Valid · ${result.warnings.length} warning`
        : 'Valid JSON-LD';
    } else {
      badge.dataset.status = 'invalid';
      label.textContent = `Invalid · ${result.errors.length} issue${result.errors.length === 1 ? '' : 's'}`;
    }
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function svgToSerialized(svg) {
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    if (!clone.getAttribute('width')) clone.setAttribute('width', '720');
    if (!clone.getAttribute('height')) clone.setAttribute('height', '480');
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
  }

  function initCitationscape(root) {
    const form = root.querySelector('[data-em-form]');
    const svg = root.querySelector('[data-em-svg]');
    const jsonOut = root.querySelector('[data-em-jsonld]');
    const tooltip = root.querySelector('[data-em-tooltip]');
    const stage = root.querySelector('[data-em-graph-stage]');
    const copyStatus = root.querySelector('[data-em-copy-status]');
    let lastJson = null;
    let lastData = null;
    let lastResult = null;

    function refresh() {
      const data = readForm(root);
      lastData = data;
      const jsonLd = buildJsonLd(data);
      lastJson = jsonLd;
      lastResult = validatePayload(data, jsonLd);
      jsonOut.textContent = JSON.stringify(jsonLd, null, 2);
      setValidateUI(root, lastResult);
      renderGraph(svg, buildGraphModel(data));
      if (copyStatus) copyStatus.textContent = '';
    }

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      refresh();
    });

    // Live update on input (debounced feel via generate also available)
    let timer = null;
    form?.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 220);
    });

    root.querySelector('[data-em-reset]')?.addEventListener('click', () => {
      writeForm(root, DEFAULTS);
      refresh();
    });

    root.querySelector('[data-em-copy]')?.addEventListener('click', async () => {
      if (!lastJson) refresh();
      const text = JSON.stringify(lastJson, null, 2);
      try {
        await navigator.clipboard.writeText(text);
        if (copyStatus) copyStatus.textContent = 'JSON-LD copied to clipboard.';
      } catch {
        if (copyStatus) copyStatus.textContent = 'Copy failed — select the code block manually.';
      }
    });

    root.querySelector('[data-em-download]')?.addEventListener('click', () => {
      if (!lastJson) refresh();
      const slug = slugify(lastData?.brand || 'brand');
      const blob = new Blob([JSON.stringify(lastJson, null, 2)], {
        type: 'application/ld+json',
      });
      downloadBlob(`${slug}-entity-graph.jsonld`, blob);
      if (copyStatus) copyStatus.textContent = `Downloaded ${slug}-entity-graph.jsonld`;
    });

    root.querySelector('[data-em-validate-btn]')?.addEventListener('click', () => {
      refresh();
      if (!lastResult) return;
      if (lastResult.valid) {
        const warn = lastResult.warnings.length ? ` Warnings: ${lastResult.warnings.join(' ')}` : '';
        if (copyStatus) {
          copyStatus.textContent = `Validation passed — schema.org @graph is well-formed.${warn}`;
        }
      } else if (copyStatus) {
        copyStatus.textContent = `Validation failed: ${lastResult.errors.join(' ')}`;
      }
    });

    root.querySelector('[data-em-export-svg]')?.addEventListener('click', () => {
      const xml = svgToSerialized(svg);
      const slug = slugify(lastData?.brand || 'brand');
      downloadBlob(`${slug}-citation-graph.svg`, new Blob([xml], { type: 'image/svg+xml' }));
    });

    root.querySelector('[data-em-export-png]')?.addEventListener('click', () => {
      const xml = svgToSerialized(svg);
      const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1440;
        canvas.height = 960;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0B1220';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((png) => {
          if (!png) return;
          const slug = slugify(lastData?.brand || 'brand');
          downloadBlob(`${slug}-citation-graph.png`, png);
        }, 'image/png');
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
    });

    // Hover / focus tooltips for predicates
    function showTip(clientX, clientY, predicate, label) {
      if (!tooltip || !stage) return;
      tooltip.hidden = false;
      tooltip.innerHTML = `<strong>${escapeXml(label)}</strong><span>${escapeXml(predicate)}</span>`;
      const rect = stage.getBoundingClientRect();
      const x = Math.min(rect.width - 200, Math.max(8, clientX - rect.left + 12));
      const y = Math.min(rect.height - 56, Math.max(8, clientY - rect.top + 12));
      tooltip.style.transform = `translate(${x}px, ${y}px)`;
    }

    function hideTip() {
      if (tooltip) tooltip.hidden = true;
    }

    svg?.addEventListener('pointermove', (e) => {
      const node = e.target.closest?.('.em-node');
      if (!node) {
        hideTip();
        return;
      }
      showTip(
        e.clientX,
        e.clientY,
        node.getAttribute('data-predicate') || '',
        node.getAttribute('data-label') || ''
      );
    });

    svg?.addEventListener('pointerleave', hideTip);

    svg?.addEventListener('focusin', (e) => {
      const node = e.target.closest?.('.em-node');
      if (!node || !stage) return;
      const rect = stage.getBoundingClientRect();
      showTip(
        rect.left + rect.width / 2,
        rect.top + 40,
        node.getAttribute('data-predicate') || '',
        node.getAttribute('data-label') || ''
      );
    });

    svg?.addEventListener('focusout', hideTip);

    refresh();
  }

  function boot() {
    document.querySelectorAll('[data-citationscape]').forEach(initCitationscape);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.abcGEO = window.abcGEO || {};
  window.abcGEO.initCitationscape = boot;
})();
