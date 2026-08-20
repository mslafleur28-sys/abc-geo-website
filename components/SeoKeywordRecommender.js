(function () {
  'use strict';

  const DEFAULT_API = 'http://localhost:8000';

  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function renderRows(tableBody, candidates) {
    tableBody.innerHTML = '';
    candidates.forEach((item, idx) => {
      const tr = document.createElement('tr');
      if (idx === 0) tr.classList.add('is-best');
      tr.innerHTML = `
        <td>${item.keyword}</td>
        <td>${item.volume}</td>
        <td>${toNumber(item.kd, 0).toFixed(1)}</td>
        <td>${toNumber(item.geo_score, 0).toFixed(3)}</td>
        <td>${toNumber(item.opportunity_score, 0).toFixed(3)}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  function initTool(root) {
    const form = root.querySelector('[data-seo-form]');
    const draft = root.querySelector('[data-seo-draft]');
    const market = root.querySelector('[data-seo-market]');
    const language = root.querySelector('[data-seo-language]');
    const status = root.querySelector('[data-seo-status]');
    const result = root.querySelector('[data-seo-result]');
    const best = root.querySelector('[data-seo-best]');
    const entity = root.querySelector('[data-seo-entity]');
    const action = root.querySelector('[data-seo-action]');
    const tableBody = root.querySelector('[data-seo-table] tbody');

    const apiBase = root.dataset.apiBase || DEFAULT_API;

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();

      const draftedText = draft?.value?.trim() || '';
      if (draftedText.length < 50) {
        status.textContent = 'Please provide at least 50 characters of drafted text.';
        result.hidden = true;
        return;
      }

      status.textContent = 'Analyzing with GEO engine...';
      try {
        const response = await fetch(`${apiBase}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            drafted_text: draftedText,
            market: market?.value?.trim() || 'United States',
            language: language?.value?.trim() || 'English',
          }),
        });

        if (!response.ok) {
          let detail = `Request failed (${response.status})`;
          try {
            const err = await response.json();
            if (err?.detail) detail = String(err.detail);
          } catch (_) {
            // no-op
          }
          throw new Error(detail);
        }

        const payload = await response.json();
        best.textContent = payload.best_target_keyword || '—';
        entity.textContent = payload.entity || '—';
        action.textContent = payload.action || '—';
        renderRows(tableBody, payload.top_candidates || []);
        result.hidden = false;
        status.textContent = 'Analysis complete.';
      } catch (error) {
        result.hidden = true;
        status.textContent = `Unable to analyze: ${error.message}`;
      }
    });
  }

  function boot() {
    document.querySelectorAll('[data-seo-keyword-tool]').forEach(initTool);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.abcGEO = window.abcGEO || {};
  window.abcGEO.initSeoKeywordTool = boot;
})();
