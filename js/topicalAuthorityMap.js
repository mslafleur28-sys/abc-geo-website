/* abcGEO — Topical Authority Content Map template */
(function () {
  const root = document.querySelector('[data-tam]');
  if (!root) return;

  const form = root.querySelector('[data-tam-form]');
  const topicEl = root.querySelector('#tam-topic');
  const audienceEl = root.querySelector('#tam-audience');
  const goalEl = root.querySelector('#tam-goal');
  const mapEl = root.querySelector('[data-tam-map]');
  const treeEl = root.querySelector('[data-tam-tree]');
  const markdownEl = root.querySelector('[data-tam-markdown]');
  const promptEl = root.querySelector('[data-tam-prompt]');
  const statusEls = root.querySelectorAll('[data-tam-status]');
  const INTENTS = ['Informational', 'How-To', 'Commercial', 'Transactional', 'Navigational'];
  const PRIORITIES = ['P1', 'P2', 'P3'];

  let state = blankState(
    'Generative Engine Optimization',
    'SEO leads, content strategists, and in-house GEO teams',
    'Convert readers to abcGEO tools, templates, and collaboration services'
  );

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function mdCell(value) {
    const text = String(value || '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
    return text || ' ';
  }

  function slugify(value) {
    return String(value || 'topical-authority-map')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'topical-authority-map';
  }

  function micro(id, title, keyword, intent, question, parent, priority) {
    return {
      id,
      role: 'Micro-Cluster',
      title,
      keyword,
      intent,
      question,
      parent,
      priority,
    };
  }

  function cluster(id, title, keyword, intent, question, parent, priority, micros) {
    return {
      id,
      role: 'Sub-Cluster',
      title,
      keyword,
      intent,
      question,
      parent,
      priority,
      micros,
    };
  }

  function buildStarter(topic, audience, goal) {
    const t = (topic || 'Your Topic').trim();
    const tLower = t.charAt(0).toLowerCase() + t.slice(1);
    const offer = (goal || 'your primary offer').trim();
    const who = (audience || 'your target audience').trim();

    return {
      topic: t,
      audience: who,
      goal: offer,
      pillars: [
        {
          id: 'P1',
          role: 'Pillar Page',
          title: `The Complete Guide to ${t}`,
          keyword: tLower,
          intent: 'Informational',
          question: `What is ${t} and how does it work?`,
          parent: 'Home / Main Hub',
          priority: 'P1',
          clusters: [
            cluster(
              'C1.1',
              `${t} Fundamentals: Definitions, Scope, and How It Works`,
              `${tLower} explained`,
              'Informational',
              `What is ${t} and how does it work for ${who}?`,
              'P1',
              'P1',
              [
                micro(
                  'M1.1a',
                  `${t} Glossary: Core Terms ${who} Need First`,
                  `${tLower} glossary`,
                  'Informational',
                  `What are the essential ${tLower} terms you must understand first?`,
                  'C1.1',
                  'P2'
                ),
                micro(
                  'M1.1b',
                  `${t} vs Adjacent Approaches: What Actually Changes`,
                  `${tLower} vs alternatives`,
                  'Commercial',
                  `How does ${t} differ from related strategies, and when should you choose it?`,
                  'C1.1',
                  'P2'
                ),
              ]
            ),
            cluster(
              'C1.2',
              `How to Implement ${t} as a Content System`,
              `how to implement ${tLower}`,
              'How-To',
              `How do you implement ${t} as a repeatable content system?`,
              'P1',
              'P1',
              [
                micro(
                  'M1.2a',
                  `Step-by-Step: Publish Your First ${t} Cluster`,
                  `${tLower} content cluster example`,
                  'How-To',
                  `What is the best way to ship the first ${tLower} cluster without stalling?`,
                  'C1.2',
                  'P2'
                ),
                micro(
                  'M1.2b',
                  `${t} Workflow Checklist for ${who}`,
                  `${tLower} content workflow`,
                  'How-To',
                  `What workflow should ${who} follow to keep ${tLower} coverage complete?`,
                  'C1.2',
                  'P2'
                ),
              ]
            ),
            cluster(
              'C1.3',
              `${t} Topical Authority, AEO, and Internal Linking`,
              `${tLower} topical authority`,
              'Informational',
              `How do you use ${t} to establish topical authority and win answer-first visibility?`,
              'P1',
              'P1',
              [
                micro(
                  'M1.3a',
                  `Answer-First ${t} Outlines: Questions That Open Every Page`,
                  `${tLower} answer first content`,
                  'How-To',
                  `What question should every ${tLower} page answer in the opening section?`,
                  'C1.3',
                  'P2'
                ),
                micro(
                  'M1.3b',
                  `Internal Linking Loops for ${t} Authority`,
                  `${tLower} internal linking`,
                  'How-To',
                  `How should pillar, cluster, and micro pages link so ${tLower} authority compounds?`,
                  'C1.3',
                  'P2'
                ),
              ]
            ),
            cluster(
              'C1.4',
              `${t} Tools, Comparisons, and Conversion Paths`,
              `best ${tLower} tools`,
              'Commercial',
              `What tools, templates, and next steps help ${who} execute ${t}?`,
              'P1',
              'P1',
              [
                micro(
                  'M1.4a',
                  `Best Tools and Templates for ${t} in 2026`,
                  `best ${tLower} tools 2026`,
                  'Transactional',
                  `What are the top tools and templates for executing ${tLower}?`,
                  'C1.4',
                  'P2'
                ),
                micro(
                  'M1.4b',
                  `How ${who} Should Choose a ${t} Partner or Offer`,
                  `${tLower} services`,
                  'Transactional',
                  `What should ${who} look for when choosing help to achieve: ${offer}?`,
                  'C1.4',
                  'P2'
                ),
              ]
            ),
          ],
        },
      ],
    };
  }

  function blankState(topic, audience, goal) {
    const t = (topic || '').trim() || 'Your Topic';
    return {
      topic: t,
      audience: (audience || '').trim() || 'Your target audience',
      goal: (goal || '').trim() || 'Your primary conversion',
      pillars: [
        {
          id: 'P1',
          role: 'Pillar Page',
          title: `The Complete Guide to ${t}`,
          keyword: t.toLowerCase(),
          intent: 'Informational',
          question: `What is ${t} and how does it work?`,
          parent: 'Home / Main Hub',
          priority: 'P1',
          clusters: [
            cluster('C1.1', '', '', 'Informational', '', 'P1', 'P1', [
              micro('M1.1a', '', '', 'How-To', '', 'C1.1', 'P2'),
              micro('M1.1b', '', '', 'Commercial', '', 'C1.1', 'P2'),
            ]),
            cluster('C1.2', '', '', 'Informational', '', 'P1', 'P1', [
              micro('M1.2a', '', '', 'How-To', '', 'C1.2', 'P2'),
              micro('M1.2b', '', '', 'Transactional', '', 'C1.2', 'P2'),
            ]),
            cluster('C1.3', '', '', 'Informational', '', 'P1', 'P1', [
              micro('M1.3a', '', '', 'How-To', '', 'C1.3', 'P2'),
              micro('M1.3b', '', '', 'How-To', '', 'C1.3', 'P2'),
            ]),
          ],
        },
      ],
    };
  }

  function reindex(next) {
    next.pillars.forEach((pillar, pi) => {
      const pNum = pi + 1;
      pillar.id = `P${pNum}`;
      pillar.role = 'Pillar Page';
      pillar.parent = 'Home / Main Hub';
      pillar.clusters.forEach((item, ci) => {
        item.id = `C${pNum}.${ci + 1}`;
        item.role = 'Sub-Cluster';
        item.parent = pillar.id;
        item.micros.forEach((unit, mi) => {
          unit.id = `M${pNum}.${ci + 1}${String.fromCharCode(97 + mi)}`;
          unit.role = 'Micro-Cluster';
          unit.parent = item.id;
        });
      });
    });
    return next;
  }

  function flattenPillar(pillar) {
    const rows = [pillar];
    pillar.clusters.forEach((item) => {
      rows.push(item);
      item.micros.forEach((unit) => rows.push(unit));
    });
    return rows;
  }

  function optionList(values, selected) {
    return values
      .map((value) => `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(value)}</option>`)
      .join('');
  }

  function rowMarkup(row, path) {
    const level = row.role === 'Pillar Page' ? 'pillar' : row.role === 'Sub-Cluster' ? 'cluster' : 'micro';
    const removeAttr = row.role === 'Pillar Page'
      ? 'data-tam-remove-pillar'
      : row.role === 'Sub-Cluster'
        ? 'data-tam-remove-cluster'
        : 'data-tam-remove-micro';
    const extra = row.role === 'Sub-Cluster'
      ? `<button type="button" class="btn btn-ghost tam-row__extra" data-tam-add-micro="${escapeHtml(path)}">+ Micro</button>`
      : '';

    return `
      <tr class="tam-row tam-row--${level}" data-tam-path="${escapeHtml(path)}">
        <td><span class="tam-id">${escapeHtml(row.id)}</span></td>
        <td><span class="tam-role tam-role--${level}">${escapeHtml(row.role)}</span></td>
        <td><input type="text" data-tam-field="title" value="${escapeHtml(row.title)}" placeholder="Article title" /></td>
        <td><input type="text" data-tam-field="keyword" value="${escapeHtml(row.keyword)}" placeholder="Target keyword" /></td>
        <td>
          <select data-tam-field="intent">${optionList(INTENTS, row.intent)}</select>
        </td>
        <td><input type="text" data-tam-field="question" value="${escapeHtml(row.question)}" placeholder="Direct core question answered" /></td>
        <td><input type="text" data-tam-field="parent" value="${escapeHtml(row.parent)}" /></td>
        <td>
          <select data-tam-field="priority">${optionList(PRIORITIES, row.priority)}</select>
        </td>
        <td class="tam-row__actions">
          ${extra}
          <button type="button" class="btn btn-ghost tam-row__remove" ${removeAttr}="${escapeHtml(path)}" aria-label="Remove ${escapeHtml(row.id)}">Remove</button>
        </td>
      </tr>
    `;
  }

  function renderTree() {
    treeEl.innerHTML = state.pillars.map((pillar) => `
      <article class="tam-tree__pillar">
        <p class="tam-tree__hub">
          <span class="tam-id">${escapeHtml(pillar.id)}</span>
          <strong>${escapeHtml(pillar.title || 'Untitled pillar')}</strong>
        </p>
        <ul class="tam-tree__clusters">
          ${pillar.clusters.map((item) => `
            <li>
              <p>
                <span class="tam-id">${escapeHtml(item.id)}</span>
                ${escapeHtml(item.title || 'Untitled sub-cluster')}
                <span class="tam-tree__link">→ ${escapeHtml(item.parent)}</span>
              </p>
              <ul>
                ${item.micros.map((unit) => `
                  <li>
                    <span class="tam-id">${escapeHtml(unit.id)}</span>
                    ${escapeHtml(unit.title || 'Untitled micro-cluster')}
                    <span class="tam-tree__link">→ ${escapeHtml(unit.parent)}</span>
                  </li>
                `).join('')}
              </ul>
            </li>
          `).join('')}
        </ul>
      </article>
    `).join('');
  }

  function renderMap() {
    mapEl.innerHTML = state.pillars.map((pillar, pi) => `
      <section class="panel tam-pillar" aria-labelledby="tam-pillar-${pi}">
        <div class="tam-pillar__head">
          <div>
            <p class="section-label">Pillar Hub</p>
            <h3 id="tam-pillar-${pi}">${escapeHtml(pillar.id)} · ${escapeHtml(pillar.title || 'Untitled pillar')}</h3>
          </div>
          <div class="tool-actions tam-pillar__actions">
            <button type="button" class="btn btn-secondary" data-tam-add-cluster="${pi}">Add sub-cluster</button>
          </div>
        </div>
        <div class="tam-table-wrap">
          <table class="tam-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Content Role</th>
                <th>Article Title</th>
                <th>Target Keyword</th>
                <th>Search Intent</th>
                <th>Answer-First Question</th>
                <th>Parent Link Target</th>
                <th>Priority</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              ${rowMarkup(pillar, `${pi}`)}
              ${pillar.clusters.map((item, ci) => `
                ${rowMarkup(item, `${pi}:${ci}`)}
                ${item.micros.map((unit, mi) => rowMarkup(unit, `${pi}:${ci}:${mi}`)).join('')}
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `).join('') + `
      <div class="tam-map__footer">
        <button type="button" class="btn btn-ghost" data-tam-add-pillar>+ Add pillar hub</button>
        <p>Keep 3–5 sub-clusters per pillar and 2–3 micro-clusters under each sub-cluster. Micros always link up to their cluster; clusters always link up to the pillar.</p>
      </div>
    `;
  }

  function tableMarkdown(pillar) {
    const header = '| ID | Content Role | Article Title | Target Keyword | Search Intent | Answer-First Question (Direct Core Question Answered) | Parent Link Target | Priority |';
    const divider = '|---|---|---|---|---|---|---|---|';
    const rows = flattenPillar(pillar).map((row) => (
      `| ${mdCell(row.id)} | ${mdCell(row.role)} | ${mdCell(row.title)} | ${mdCell(row.keyword)} | ${mdCell(row.intent)} | ${mdCell(row.question)} | ${mdCell(row.parent)} | ${mdCell(row.priority)} |`
    ));
    return [header, divider, ...rows].join('\n');
  }

  function buildMarkdown() {
    const { topic, audience, goal, pillars } = state;
    const tables = pillars.map((pillar) => `### ${pillar.id} — ${pillar.title || 'Untitled pillar'}\n\n${tableMarkdown(pillar)}`).join('\n\n');
    return `# Topical Authority Content Map: ${topic}

**Target audience:** ${audience}
**Primary goal / conversion:** ${goal}
**Architecture:** Hub-and-spoke (pillar, sub-cluster, micro-cluster)
**AEO rule:** Every article answers its Answer-First Question in the opening section.

## Hierarchy rules
- **Pillar Hub (P#):** 1 broad, authoritative overview page covering the primary subject in depth.
- **Sub-Clusters (C#.#):** 3–5 core sub-topics expanding on specific sections of the pillar.
- **Micro-Clusters (M#.#a):** 2–3 granular long-tail articles (how-tos, comparisons, direct Q&A) that link back to their sub-cluster.
- **Internal linking:** Micros point up to their sub-cluster. Sub-clusters point up to the pillar. The pillar links down to every sub-cluster to close the topical loop.

## Content map

${tables}

## Internal linking loops
- Pillar pages link down to every child sub-cluster.
- Sub-clusters recap and link up to the pillar, then down to their micro-clusters.
- Micro-clusters open with a direct answer, then include a contextual link back to the parent sub-cluster.
- Avoid orphan pages. Every row must have a parent link target.
`;
  }

  function buildPrompt() {
    const topic = state.topic || '[INSERT YOUR NICHE OR TOPIC HERE]';
    const audience = state.audience || '[INSERT TARGET AUDIENCE HERE]';
    const goal = state.goal || '[INSERT PRIMARY GOAL OR OFFER HERE]';
    return `# Topical Authority Content Map Generator Prompt

You are an expert SEO Strategist and Content System Architect. Your job is to create a structured, fillable Topical Authority Content Map in Markdown format based on the topic or niche provided by the user.

---

### Instructions for Generating the Content Map

1. Core Architecture:
   - Organize content using a Hub-and-Spoke (Pillar & Cluster) hierarchy.
   - For every topic entry, explicitly define the primary question the content must answer immediately in the opening section (Answer-First Engine Optimization / AEO).

2. Output Format:
   - Provide clean, easy-to-read Markdown tables grouped logically by Pillar, Sub-Clusters, and Micro-Clusters.
   - Include internal linking direction for every post to enforce topical authority loops.

---

### Content Map Table Structure

Create a table for each Pillar Hub using the exact schema below:

| ID | Content Role | Article Title | Target Keyword | Search Intent | Answer-First Question (Direct Core Question Answered) | Parent Link Target | Priority |
|---|---|---|---|---|---|---|---|
| P1 | Pillar Page | [Title of Pillar] | [Main Keyword] | Informational | What is [Topic] and how does it work? | Home / Main Hub | P1 |
| C1.1 | Sub-Cluster | [Title of Cluster 1] | [Cluster Keyword] | Informational | How do you implement [Sub-topic]? | P1 | P1 |
| M1.1a | Micro-Cluster | [Title of Micro 1] | [Long-Tail Keyword] | Commercial / How-To | What is the best way to solve [Specific Problem]? | C1.1 | P2 |
| M1.1b | Micro-Cluster | [Title of Micro 2] | [Long-Tail Keyword] | Transactional | What are the top tools for [Specific Task]? | C1.1 | P2 |

---

### Hierarchy Rules

- Pillar Hub (P1): 1 broad, authoritative overview page covering the primary subject in depth.
- Sub-Clusters (C1.1, C1.2, etc.): 3–5 core sub-topics expanding on specific sections of the main Pillar.
- Micro-Clusters (M1.1a, M1.1b, etc.): 2–3 granular long-tail articles (how-tos, comparisons, direct Q&A) linked back to their respective Sub-Cluster.
- Internal Linking Target: Always point Micro-Clusters back up to their Sub-Cluster, and Sub-Clusters back to the main Pillar Page.

---

### USER INPUT TEMPLATE

Please generate a complete Topical Authority Content Map using the structure above for the following inputs:

- Core Topic / Niche: ${topic}
- Target Audience: ${audience}
- Primary Goal / Conversion: ${goal}
`;
  }

  function setStatus(message, persist) {
    if (!statusEls.length) return;
    statusEls.forEach((el) => {
      el.textContent = message;
    });
    window.clearTimeout(setStatus.timer);
    if (persist) return;
    setStatus.timer = window.setTimeout(() => {
      statusEls.forEach((el) => {
        if (el.textContent === message) el.textContent = '';
      });
    }, 3200);
  }

  function refreshOutputs() {
    if (topicEl) topicEl.value = state.topic;
    if (audienceEl) audienceEl.value = state.audience;
    if (goalEl) goalEl.value = state.goal;
    renderMap();
    renderTree();
    markdownEl.value = buildMarkdown();
    promptEl.value = buildPrompt();
  }

  function getNode(path) {
    const [pi, ci, mi] = path.split(':').map((part) => (part === undefined || part === '' ? null : Number(part)));
    const pillar = state.pillars[pi];
    if (ci == null || Number.isNaN(ci)) return pillar;
    const item = pillar.clusters[ci];
    if (mi == null || Number.isNaN(mi)) return item;
    return item.micros[mi];
  }

  function syncFieldsFromForm() {
    state.topic = topicEl.value.trim() || 'Your Topic';
    state.audience = audienceEl.value.trim() || 'Your target audience';
    state.goal = goalEl.value.trim() || 'Your primary conversion';
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    syncFieldsFromForm();
    state = buildStarter(state.topic, state.audience, state.goal);
    refreshOutputs();
    setStatus('Starter map generated from your inputs.');
    mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  root.addEventListener('click', (event) => {
    const addCluster = event.target.closest('[data-tam-add-cluster]');
    const addMicro = event.target.closest('[data-tam-add-micro]');
    const addPillar = event.target.closest('[data-tam-add-pillar]');
    const removePillar = event.target.closest('[data-tam-remove-pillar]');
    const removeCluster = event.target.closest('[data-tam-remove-cluster]');
    const removeMicro = event.target.closest('[data-tam-remove-micro]');
    const copyMd = event.target.closest('[data-tam-copy-markdown]');
    const copyPrompt = event.target.closest('[data-tam-copy-prompt]');
    const downloadPdf = event.target.closest('[data-tam-download-pdf]');
    const downloadMd = event.target.closest('[data-tam-download]');
    const blankBtn = event.target.closest('[data-tam-blank]');
    const sampleBtn = event.target.closest('[data-tam-sample]');

    if (sampleBtn) {
      event.preventDefault();
      state = buildStarter(
        'Generative Engine Optimization',
        'SEO leads, content strategists, and in-house GEO teams',
        'Convert readers to abcGEO tools, templates, and collaboration services'
      );
      refreshOutputs();
      setStatus('Loaded the GEO sample map.');
      return;
    }

    if (blankBtn) {
      event.preventDefault();
      syncFieldsFromForm();
      state = blankState(state.topic, state.audience, state.goal);
      refreshOutputs();
      setStatus('Blank worksheet ready — fill the table rows.');
      return;
    }

    if (addPillar) {
      const n = state.pillars.length + 1;
      state.pillars.push({
        id: `P${n}`,
        role: 'Pillar Page',
        title: '',
        keyword: '',
        intent: 'Informational',
        question: '',
        parent: 'Home / Main Hub',
        priority: 'P1',
        clusters: [
          cluster('', '', '', 'Informational', '', '', 'P1', [
            micro('', '', '', 'How-To', '', '', 'P2'),
            micro('', '', '', 'Commercial', '', '', 'P2'),
          ]),
        ],
      });
      reindex(state);
      refreshOutputs();
      return;
    }

    if (addCluster) {
      const pi = Number(addCluster.getAttribute('data-tam-add-cluster'));
      const pillar = state.pillars[pi];
      if (!pillar) return;
      pillar.clusters.push(cluster('', '', '', 'Informational', '', pillar.id, 'P1', [
        micro('', '', '', 'How-To', '', '', 'P2'),
        micro('', '', '', 'Commercial', '', '', 'P2'),
      ]));
      reindex(state);
      refreshOutputs();
      return;
    }

    if (addMicro) {
      const path = addMicro.getAttribute('data-tam-add-micro');
      const item = getNode(path);
      if (!item || !item.micros) return;
      item.micros.push(micro('', '', '', 'How-To', '', item.id, 'P2'));
      reindex(state);
      refreshOutputs();
      return;
    }

    if (removePillar) {
      if (state.pillars.length === 1) {
        setStatus('Keep at least one pillar hub.');
        return;
      }
      const pi = Number(removePillar.getAttribute('data-tam-remove-pillar'));
      state.pillars.splice(pi, 1);
      reindex(state);
      refreshOutputs();
      return;
    }

    if (removeCluster) {
      const [pi, ci] = removeCluster.getAttribute('data-tam-remove-cluster').split(':').map(Number);
      const pillar = state.pillars[pi];
      if (!pillar || pillar.clusters.length <= 3) {
        setStatus('Keep at least 3 sub-clusters per pillar.');
        return;
      }
      pillar.clusters.splice(ci, 1);
      reindex(state);
      refreshOutputs();
      return;
    }

    if (removeMicro) {
      const [pi, ci, mi] = removeMicro.getAttribute('data-tam-remove-micro').split(':').map(Number);
      const item = state.pillars[pi]?.clusters[ci];
      if (!item || item.micros.length <= 2) {
        setStatus('Keep at least 2 micro-clusters under each sub-cluster.');
        return;
      }
      item.micros.splice(mi, 1);
      reindex(state);
      refreshOutputs();
      return;
    }

    if (copyMd) {
      navigator.clipboard.writeText(markdownEl.value).then(() => setStatus('Markdown map copied.')).catch(() => setStatus('Copy failed — select the markdown manually.'));
      return;
    }

    if (copyPrompt) {
      navigator.clipboard.writeText(promptEl.value).then(() => setStatus('Generator prompt copied.')).catch(() => setStatus('Copy failed — select the prompt manually.'));
      return;
    }

    if (downloadPdf) {
      event.preventDefault();
      syncFieldsFromForm();
      const buttons = root.querySelectorAll('[data-tam-download-pdf]');
      buttons.forEach((button) => {
        button.disabled = true;
      });
      setStatus('Preparing branded PDF…', true);
      const exportPdf = typeof window.abcgeoExportTamPdf === 'function'
        ? window.abcgeoExportTamPdf
        : null;
      if (!exportPdf) {
        buttons.forEach((button) => {
          button.disabled = false;
        });
        setStatus('PDF export is unavailable. Refresh the page and try again.');
        return;
      }
      exportPdf(state)
        .then(() => setStatus('PDF downloaded — every row and field is in the brief.'))
        .catch(() => setStatus('PDF export failed. Check your connection and try again.'))
        .finally(() => {
          buttons.forEach((button) => {
            button.disabled = false;
          });
        });
      return;
    }

    if (downloadMd) {
      const blob = new Blob([markdownEl.value], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slugify(state.topic)}-topical-authority-map.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus('Markdown file downloaded.');
    }
  });

  mapEl.addEventListener('input', (event) => {
    const field = event.target.closest('[data-tam-field]');
    const row = event.target.closest('[data-tam-path]');
    if (!field || !row) return;
    const node = getNode(row.getAttribute('data-tam-path'));
    if (!node) return;
    node[field.getAttribute('data-tam-field')] = event.target.value;
    markdownEl.value = buildMarkdown();
    promptEl.value = buildPrompt();
    renderTree();
  });

  refreshOutputs();
})();

/* abcGEO — Topical Authority Map Generator (radial / tree / cards) */
(function () {
  const root = document.querySelector('[data-topical-map]');
  if (!root) return;
  if (typeof d3 === 'undefined') {
    const status = root.querySelector('[data-tam-gen-status]');
    if (status) {
      status.textContent = 'Visualization library failed to load. Refresh the page or check that js/vendor/d3.v7.min.js is available.';
      status.classList.add('is-error');
    }
    return;
  }

  const INTENT_COLORS = {
    informational: '#4A1D75',
    commercial: '#00D4C8',
    transactional: '#FF2E93',
    navigational: '#7C6AF2',
  };

  const ATTRIBUTION = 'Generated with the A + B = GEO Framework • abcgeo.dev';
  const apiBase = (root.getAttribute('data-api-base') || 'http://localhost:8000').replace(/\/$/, '');

  const form = root.querySelector('[data-tam-gen-form]');
  const topicEl = root.querySelector('[data-tam-gen-topic]');
  const audienceEl = root.querySelector('[data-tam-gen-audience]');
  const submitBtn = root.querySelector('[data-tam-gen-submit]');
  const submitLabel = root.querySelector('[data-tam-gen-submit-label]');
  const statusEl = root.querySelector('[data-tam-gen-status]');
  const radialHost = root.querySelector('[data-tam-radial]');
  const treeHost = root.querySelector('[data-tam-tree]');
  const cardsHost = root.querySelector('[data-tam-cards]');
  const legendEl = root.querySelector('[data-tam-legend]');
  const drawer = root.querySelector('[data-tam-drawer]');
  const drawerBackdrop = root.querySelector('[data-tam-drawer-backdrop]');
  const drawerTitle = root.querySelector('[data-tam-drawer-title]');
  const drawerPair = root.querySelector('[data-tam-drawer-pair]');
  const drawerQuestion = root.querySelector('[data-tam-drawer-question]');
  const drawerIntent = root.querySelector('[data-tam-drawer-intent]');
  const drawerScore = root.querySelector('[data-tam-drawer-score]');
  const exportBtns = root.querySelectorAll('[data-tam-export]');
  const tabs = Array.from(root.querySelectorAll('[data-tam-tab]'));
  const panels = Array.from(root.querySelectorAll('[data-tam-panel]'));

  let mapData = null;
  let activeTab = 'radial';
  let radialSvg = null;
  let treeSvg = null;

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function slugify(value) {
    return String(value || 'topical-authority-map')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'topical-authority-map';
  }

  function setStatus(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.classList.toggle('is-error', Boolean(isError));
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    submitBtn.classList.toggle('is-loading', loading);
    if (submitLabel) submitLabel.textContent = loading ? 'Generating…' : 'Generate Topical Map';
  }

  function setExportsEnabled(enabled) {
    exportBtns.forEach((btn) => {
      btn.disabled = !enabled;
    });
  }

  function toHierarchy(data) {
    return {
      name: data.root_topic,
      type: 'root',
      children: (data.pillars || []).map((pillar, pi) => ({
        name: pillar.name,
        type: 'pillar',
        transitive_verb_relation: pillar.transitive_verb_relation,
        children: (pillar.articles || []).map((article, ai) => ({
          name: article.title,
          type: 'article',
          title: article.title,
          entity_verb_pair: article.entity_verb_pair,
          core_question: article.core_question,
          search_intent: String(article.search_intent || 'informational').toLowerCase(),
          priority_score: Number(article.priority_score) || 50,
          pillarName: pillar.name,
          id: `p${pi}-a${ai}`,
        })),
      })),
    };
  }

  function openDrawer(article) {
    if (!drawer || !article) return;
    drawerTitle.textContent = article.title || article.name || 'Article detail';
    drawerPair.textContent = article.entity_verb_pair || '—';
    drawerQuestion.textContent = article.core_question || '—';
    const intent = String(article.search_intent || 'informational').toLowerCase();
    drawerIntent.textContent = intent;
    drawerIntent.setAttribute('data-intent', intent);
    drawerScore.innerHTML = `${escapeHtml(String(article.priority_score ?? '—'))}<small>/100</small>`;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    drawerBackdrop.hidden = false;
    drawerBackdrop.classList.add('is-open');
    drawer.dataset.question = article.core_question || '';
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    drawerBackdrop.classList.remove('is-open');
    window.setTimeout(() => {
      if (!drawer.classList.contains('is-open')) drawerBackdrop.hidden = true;
    }, 220);
  }

  function switchTab(name) {
    activeTab = name;
    tabs.forEach((tab) => {
      const selected = tab.getAttribute('data-tam-tab') === name;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel) => {
      const selected = panel.getAttribute('data-tam-panel') === name;
      panel.classList.toggle('is-active', selected);
      panel.hidden = !selected;
    });
    if (mapData) {
      if (name === 'radial') renderRadial(mapData);
      if (name === 'tree') renderTree(mapData);
      if (name === 'cards') renderCards(mapData);
    }
  }

  function clearHost(host) {
    while (host.firstChild) host.removeChild(host.firstChild);
  }

  function intentColor(intent) {
    return INTENT_COLORS[String(intent || '').toLowerCase()] || INTENT_COLORS.informational;
  }

  function stampAttribution(svgSelection, width, height) {
    svgSelection.append('text')
      .attr('class', 'tam-attribution')
      .attr('x', width / 2)
      .attr('y', height - 10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6B6580')
      .attr('font-size', 10)
      .attr('font-family', 'Montserrat, sans-serif')
      .text(ATTRIBUTION);
  }

  function renderRadial(data) {
    clearHost(radialHost);
    const width = radialHost.clientWidth || 960;
    const height = Math.max(radialHost.clientHeight || 640, 680);
    // Leave room for outward labels + priority bars so the chart is not clipped.
    const radius = Math.min(width, height) / 2 - 130;

    const svg = d3.select(radialHost)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-label', `Radial topical authority map for ${data.root_topic}`);

    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);
    const zoomLayer = g.append('g');

    const zoom = d3.zoom()
      .scaleExtent([0.4, 3.5])
      .filter((event) => {
        if (event.type === 'wheel') return true;
        return event.button === 0 && !event.target.closest('.tam-node');
      })
      .on('zoom', (event) => {
        zoomLayer.attr('transform', event.transform);
      });
    svg.call(zoom);
    // Slight inset so labels fit on first paint without requiring pan.
    svg.call(zoom.transform, d3.zoomIdentity.scale(0.92));

    const rootNode = d3.hierarchy(toHierarchy(data));
    const cluster = d3.cluster().size([2 * Math.PI, radius]);
    cluster(rootNode);

    const linkRadial = d3.linkRadial()
      .angle((d) => d.x)
      .radius((d) => d.y);

    zoomLayer.append('g')
      .attr('fill', 'none')
      .selectAll('path')
      .data(rootNode.links())
      .join('path')
      .attr('class', 'tam-link')
      .attr('d', linkRadial);

    const node = zoomLayer.append('g')
      .selectAll('g')
      .data(rootNode.descendants())
      .join('g')
      .attr('class', (d) => `tam-node tam-node-${d.data.type}`)
      .attr('transform', (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`)
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', (d) => d.data.name)
      .on('click', (event, d) => {
        event.stopPropagation();
        if (d.data.type === 'article') openDrawer(d.data);
        else if (d.data.type === 'pillar') {
          openDrawer({
            title: d.data.name,
            entity_verb_pair: `${data.root_topic} + ${d.data.transitive_verb_relation}`,
            core_question: `How does ${data.root_topic} ${d.data.transitive_verb_relation} topical authority through ${d.data.name}?`,
            search_intent: 'informational',
            priority_score: 90,
          });
        } else {
          openDrawer({
            title: d.data.name,
            entity_verb_pair: `${data.root_topic} + seeds`,
            core_question: `What is ${data.root_topic} and how should teams build topical authority around it?`,
            search_intent: 'informational',
            priority_score: 100,
          });
        }
      })
      .on('keydown', (event, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          node.filter((n) => n === d).dispatch('click');
        }
      });

    node.append('circle')
      .attr('r', (d) => (d.data.type === 'root' ? 10 : d.data.type === 'pillar' ? 6.5 : 4.2))
      .attr('fill', (d) => (d.data.type === 'article' ? intentColor(d.data.search_intent) : null));

    node.filter((d) => d.data.type === 'article')
      .append('rect')
      .attr('class', 'tam-priority-bar')
      .attr('x', 6)
      .attr('y', -1.5)
      .attr('height', 3)
      .attr('width', (d) => 6 + (Number(d.data.priority_score) || 0) * 0.18)
      .attr('rx', 1.5);

    node.append('text')
      .attr('class', (d) => `tam-label tam-label-${d.data.type}`)
      .attr('dy', '0.32em')
      .attr('x', (d) => {
        const deg = (d.x * 180) / Math.PI;
        return deg < 180 ? 12 : -12;
      })
      .attr('text-anchor', (d) => {
        const deg = (d.x * 180) / Math.PI;
        return deg < 180 ? 'start' : 'end';
      })
      .attr('transform', (d) => {
        const deg = (d.x * 180) / Math.PI;
        return deg >= 180 ? 'rotate(180)' : null;
      })
      .text((d) => {
        const label = d.data.name || '';
        const max = d.data.type === 'article' ? 34 : 28;
        return label.length > max ? `${label.slice(0, max - 1)}…` : label;
      });

    stampAttribution(svg, width, height);
    radialSvg = svg.node();
    if (legendEl) legendEl.hidden = false;
  }

  function truncateLabel(value, max) {
    const label = String(value || '');
    return label.length > max ? `${label.slice(0, max - 1)}…` : label;
  }

  function renderTree(data) {
    clearHost(treeHost);
    const width = treeHost.clientWidth || 960;
    const height = Math.max(treeHost.clientHeight || 640, 680);
    const margin = { top: 40, right: 220, bottom: 48, left: 28 };

    const hierarchy = d3.hierarchy(toHierarchy(data));
    // Root + pillars visible; article leaves collapsed until a pillar is clicked.
    (hierarchy.children || []).forEach((pillar) => {
      pillar._children = pillar.children;
      pillar.children = null;
    });

    const svg = d3.select(treeHost)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-label', `Collapsible topical authority tree for ${data.root_topic}`);

    const g = svg.append('g');
    const zoomLayer = g.append('g');

    const zoom = d3.zoom()
      .scaleExtent([0.35, 2.5])
      .filter((event) => {
        if (event.type === 'wheel') return true;
        return event.button === 0 && !event.target.closest('.tam-node');
      })
      .on('zoom', (event) => {
        zoomLayer.attr('transform', event.transform);
      });
    svg.call(zoom);

    const dx = 28;
    const dy = Math.max(200, (width - margin.left - margin.right) / 2.05);

    function update(source) {
      const treeLayout = d3.tree().nodeSize([dx, dy]);
      const rootNode = hierarchy;
      treeLayout(rootNode);

      let x0 = Infinity;
      let x1 = -Infinity;
      rootNode.each((d) => {
        if (d.x > x1) x1 = d.x;
        if (d.x < x0) x0 = d.x;
      });

      // Shift so the vertical span starts below the top margin (nodeSize trees are centered on 0).
      const yOffset = margin.top - x0;
      g.attr('transform', `translate(${margin.left},${yOffset})`);

      const links = zoomLayer.selectAll('path.tam-link')
        .data(rootNode.links(), (d) => d.target.data.id || d.target.data.name);

      links.join(
        (enter) => enter.append('path')
          .attr('class', 'tam-link')
          .attr('d', d3.linkHorizontal().x((d) => source.y0 ?? source.y).y((d) => source.x0 ?? source.x)),
        (updateSel) => updateSel,
        (exit) => exit.transition().duration(280).attr('d', d3.linkHorizontal().x((d) => source.y).y((d) => source.x)).remove()
      )
        .transition()
        .duration(280)
        .attr('d', d3.linkHorizontal().x((d) => d.y).y((d) => d.x));

      const nodes = zoomLayer.selectAll('g.tam-node')
        .data(rootNode.descendants(), (d) => d.data.id || `${d.data.type}-${d.data.name}`);

      const nodesEnter = nodes.enter().append('g')
        .attr('class', (d) => `tam-node tam-node-${d.data.type}`)
        .attr('transform', () => `translate(${source.y0 ?? source.y},${source.x0 ?? source.x})`)
        .attr('tabindex', 0)
        .attr('role', 'button')
        .attr('aria-label', (d) => d.data.name)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          if (d.data.type === 'pillar') {
            if (d.children) {
              d._children = d.children;
              d.children = null;
            } else {
              d.children = d._children;
              d._children = null;
            }
            update(d);
            return;
          }
          if (d.data.type === 'article') openDrawer(d.data);
          else {
            openDrawer({
              title: d.data.name,
              entity_verb_pair: `${data.root_topic} + seeds`,
              core_question: `What is ${data.root_topic} and how should teams build topical authority around it?`,
              search_intent: 'informational',
              priority_score: 100,
            });
          }
        });

      nodesEnter.append('circle')
        .attr('r', (d) => (d.data.type === 'root' ? 8 : d.data.type === 'pillar' ? 6 : 4.5))
        .attr('class', (d) => (d.data.type === 'pillar' ? 'tam-collapse-toggle' : null));

      // Invisible hit target so pillar/article labels are easy to click.
      nodesEnter.append('rect')
        .attr('x', 10)
        .attr('y', -10)
        .attr('height', 20)
        .attr('width', (d) => Math.min(360, 12 + String(d.data.name || '').length * 6.2))
        .attr('fill', 'transparent');

      nodesEnter.append('text')
        .attr('class', (d) => `tam-label tam-label-${d.data.type}`)
        .attr('dy', '0.32em')
        .attr('x', 12)
        .attr('text-anchor', 'start')
        .text((d) => truncateLabel(d.data.name, d.data.type === 'article' ? 48 : 40));

      nodes.merge(nodesEnter)
        .transition()
        .duration(280)
        .attr('transform', (d) => `translate(${d.y},${d.x})`);

      nodes.merge(nodesEnter).select('circle')
        .attr('fill', (d) => {
          if (d.data.type === 'article') return intentColor(d.data.search_intent);
          if (d.data.type === 'pillar' && d._children) return '#00D4C8';
          if (d.data.type === 'pillar') return '#4A1D75';
          return '#2D1B4E';
        });

      nodes.exit()
        .transition()
        .duration(280)
        .attr('transform', () => `translate(${source.y},${source.x})`)
        .remove();

      rootNode.eachBefore((d) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });

      const contentH = Math.max(height, (x1 - x0) + margin.top + margin.bottom + 48);
      svg.attr('viewBox', `0 0 ${width} ${contentH}`);
      svg.selectAll('text.tam-attribution').remove();
      stampAttribution(svg, width, contentH);
    }

    hierarchy.x0 = 0;
    hierarchy.y0 = 0;
    update(hierarchy);
    treeSvg = svg.node();
  }

  function renderCards(data) {
    clearHost(cardsHost);
    const frag = document.createDocumentFragment();
    (data.pillars || []).forEach((pillar) => {
      const intentCounts = {};
      (pillar.articles || []).forEach((a) => {
        const key = String(a.search_intent || 'informational').toLowerCase();
        intentCounts[key] = (intentCounts[key] || 0) + 1;
      });

      const card = document.createElement('article');
      card.className = 'tam-gen__pillar-card';
      card.innerHTML = `
        <span class="tam-gen__verb">${escapeHtml(pillar.transitive_verb_relation || 'relates')}</span>
        <h3>${escapeHtml(pillar.name)}</h3>
        <div class="tam-gen__intent-row">
          ${Object.entries(intentCounts).map(([intent, count]) => (
            `<span class="tam-gen__intent-chip" data-intent="${escapeHtml(intent)}">${escapeHtml(intent)} · ${count}</span>`
          )).join('')}
        </div>
        <ul class="tam-gen__article-list"></ul>
      `;
      const list = card.querySelector('.tam-gen__article-list');
      (pillar.articles || []).forEach((article) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = article.title;
        btn.addEventListener('click', () => openDrawer(article));
        li.appendChild(btn);
        list.appendChild(li);
      });
      frag.appendChild(card);
    });
    cardsHost.appendChild(frag);
  }

  function renderAll(data) {
    mapData = data;
    setExportsEnabled(true);
    if (activeTab === 'radial') renderRadial(data);
    else if (activeTab === 'tree') renderTree(data);
    else renderCards(data);
    // Pre-warm other views' empty states cleared on switch
    if (legendEl && activeTab === 'radial') legendEl.hidden = false;
  }

  async function generateMap(event) {
    event.preventDefault();
    const topic = (topicEl.value || '').trim();
    const audience = (audienceEl.value || '').trim();
    if (topic.length < 2) {
      setStatus('Enter a seed topic of at least 2 characters.', true);
      return;
    }

    setLoading(true);
    setStatus('Building your A + B = GEO topical map…');
    closeDrawer();

    try {
      const response = await fetch(`${apiBase}/api/generate-topical-map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ topic, audience: audience || null }),
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (_) {
        payload = null;
      }

      if (!response.ok) {
        const detail = payload && (payload.detail || payload.message);
        const message = typeof detail === 'string'
          ? detail
          : 'Could not generate the topical map. Please try again.';
        throw new Error(message);
      }

      renderAll(payload);
      const cacheNote = payload.cached ? 'Loaded from cache.' : `Generated via ${payload.source || 'api'}.`;
      setStatus(`${cacheNote} ${payload.pillars?.length || 0} pillars ready — explore any tab.`);
      switchTab(activeTab);
    } catch (error) {
      setStatus(error.message || 'Generation failed.', true);
    } finally {
      setLoading(false);
    }
  }

  function activeSvg() {
    if (activeTab === 'tree') return treeSvg;
    return radialSvg;
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

  function exportCsv() {
    if (!mapData) return;
    const rows = [['Pillar', 'Article Title', 'Entity+Verb Pair', 'Answer-First Question', 'Intent', 'Priority Score']];
    (mapData.pillars || []).forEach((pillar) => {
      (pillar.articles || []).forEach((article) => {
        rows.push([
          pillar.name,
          article.title,
          article.entity_verb_pair,
          article.core_question,
          article.search_intent,
          article.priority_score,
        ]);
      });
    });
    const csv = rows.map((row) => row.map((cell) => {
      const text = String(cell ?? '');
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join(',')).join('\n');
    downloadBlob(`${slugify(mapData.root_topic)}-topical-map.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    setStatus('CSV downloaded.');
  }

  function exportSvgFile() {
    const svg = activeSvg();
    if (!svg) {
      setStatus('Switch to Radial or Tree view to export graphics.', true);
      return;
    }
    const clone = svg.cloneNode(true);
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const source = new XMLSerializer().serializeToString(clone);
    downloadBlob(
      `${slugify(mapData.root_topic)}-topical-map.svg`,
      new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    );
    setStatus('SVG downloaded.');
  }

  function exportPng() {
    const svg = activeSvg();
    if (!svg) {
      setStatus('Switch to Radial or Tree view to export graphics.', true);
      return;
    }
    const clone = svg.cloneNode(true);
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(clone);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    const vb = (svg.getAttribute('viewBox') || '0 0 960 640').split(/\s+/).map(Number);
    const w = vb[2] || 960;
    const h = vb[3] || 640;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w * 2;
      canvas.height = h * 2;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FAFAFC';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(107, 101, 128, 0.95)';
      ctx.font = '20px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ATTRIBUTION, canvas.width / 2, canvas.height - 24);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          setStatus('PNG export failed.', true);
          return;
        }
        downloadBlob(`${slugify(mapData.root_topic)}-topical-map.png`, pngBlob);
        setStatus('PNG downloaded.');
      }, 'image/png');
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setStatus('PNG export failed to render SVG.', true);
    };
    img.src = url;
  }

  function mapToPdfState(data) {
    return {
      topic: data.root_topic,
      audience: data.audience || audienceEl.value || 'Your target audience',
      goal: 'Build topical authority with A + B = GEO content clusters',
      pillars: (data.pillars || []).map((pillar, pi) => ({
        id: `P${pi + 1}`,
        role: 'Pillar Page',
        title: pillar.name,
        keyword: pillar.name.toLowerCase(),
        intent: 'Informational',
        question: `How does ${data.root_topic} ${pillar.transitive_verb_relation} topical authority?`,
        parent: 'Home / Main Hub',
        priority: 'P1',
        clusters: [{
          id: `C${pi + 1}.1`,
          role: 'Sub-Cluster',
          title: `${pillar.name} articles`,
          keyword: pillar.transitive_verb_relation,
          intent: 'Informational',
          question: `What articles should expand ${pillar.name}?`,
          parent: `P${pi + 1}`,
          priority: 'P1',
          micros: (pillar.articles || []).map((article, ai) => ({
            id: `M${pi + 1}.1${String.fromCharCode(97 + ai)}`,
            role: 'Micro-Cluster',
            title: article.title,
            keyword: article.entity_verb_pair,
            intent: String(article.search_intent || 'informational').replace(/^\w/, (c) => c.toUpperCase()),
            question: article.core_question,
            parent: `C${pi + 1}.1`,
            priority: article.priority_score >= 80 ? 'P1' : article.priority_score >= 55 ? 'P2' : 'P3',
          })),
        }],
      })),
    };
  }

  function exportPdf() {
    if (!mapData) return;
    const exportFn = typeof window.abcgeoExportTamPdf === 'function' ? window.abcgeoExportTamPdf : null;
    if (!exportFn) {
      setStatus('PDF export is unavailable. Refresh and try again.', true);
      return;
    }
    setStatus('Preparing branded PDF…');
    exportFn(mapToPdfState(mapData))
      .then(() => setStatus('PDF downloaded.'))
      .catch(() => setStatus('PDF export failed.', true));
  }

  form.addEventListener('submit', generateMap);

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.getAttribute('data-tam-tab')));
    tab.addEventListener('keydown', (event) => {
      const idx = tabs.indexOf(tab);
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const next = tabs[(idx + 1) % tabs.length];
        next.focus();
        switchTab(next.getAttribute('data-tam-tab'));
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
        prev.focus();
        switchTab(prev.getAttribute('data-tam-tab'));
      }
    });
  });

  root.querySelector('[data-tam-drawer-close]')?.addEventListener('click', closeDrawer);
  drawerBackdrop?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer();
  });

  root.querySelector('[data-tam-copy-question]')?.addEventListener('click', () => {
    const text = drawer?.dataset.question || drawerQuestion?.textContent || '';
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => setStatus('Core question copied.'))
      .catch(() => setStatus('Copy failed — select the question manually.', true));
  });

  exportBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.getAttribute('data-tam-export');
      if (kind === 'csv') exportCsv();
      else if (kind === 'svg') exportSvgFile();
      else if (kind === 'png') exportPng();
      else if (kind === 'pdf') exportPdf();
    });
  });

  window.addEventListener('resize', () => {
    if (!mapData) return;
    if (activeTab === 'radial') renderRadial(mapData);
    if (activeTab === 'tree') renderTree(mapData);
  });
})();
