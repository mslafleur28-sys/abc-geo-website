(function () {
  'use strict';

  const DEFAULT_API = 'http://localhost:8000';

  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function formatVolume(value) {
    const n = toNumber(value, 0);
    return n.toLocaleString();
  }

  function renderRunnerRows(tableBody, candidates) {
    tableBody.innerHTML = '';
    candidates.forEach((item) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.question}</td>
        <td>${formatVolume(item.volume)}</td>
        <td>${toNumber(item.kd, 0).toFixed(1)}</td>
        <td>${toNumber(item.geo_score, 0).toFixed(3)}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  function initTool(root) {
    const form = root.querySelector('[data-af-form]');
    const draft = root.querySelector('[data-af-draft]');
    const market = root.querySelector('[data-af-market]');
    const language = root.querySelector('[data-af-language]');
    const status = root.querySelector('[data-af-status]');
    const result = root.querySelector('[data-af-result]');
    const winningQuestion = root.querySelector('[data-af-winning-question]');
    const snippet = root.querySelector('[data-af-snippet]');
    const entity = root.querySelector('[data-af-entity]');
    const action = root.querySelector('[data-af-action]');
    const tableBody = root.querySelector('[data-af-table] tbody');

    const apiBase = root.dataset.apiBase || DEFAULT_API;

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();

      const draftedText = draft?.value?.trim() || '';
      if (draftedText.length < 50) {
        status.textContent = 'Please provide at least 50 characters of drafted text.';
        result.hidden = true;
        return;
      }

      status.textContent = 'Analyzing draft and fetching market questions...';
      try {
        const response = await fetch(`${apiBase}/analyze-question`, {
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
        winningQuestion.textContent = payload.winning_question || '—';
        snippet.textContent = payload.answer_snippet || '—';
        entity.textContent = payload.entity || '—';
        action.textContent = payload.action || '—';
        renderRunnerRows(tableBody, payload.runner_up_questions || []);
        result.hidden = false;
        status.textContent = 'Analysis complete.';
      } catch (error) {
        result.hidden = true;
        status.textContent = `Unable to analyze: ${error.message}`;
      }
    });
  }

  function boot() {
    document.querySelectorAll('[data-answer-first-tool]').forEach(initTool);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.abcGEO = window.abcGEO || {};
  window.abcGEO.initAnswerFirstTool = boot;
})();
