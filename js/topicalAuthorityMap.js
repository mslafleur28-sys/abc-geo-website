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

/* abcGEO — Topical Authority Map Generator (Visual Map / Outline / Matrix) */
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

  const CLUSTER_COLORS = ['#00D4C8', '#3D8BFF', '#2BB673', '#5B6CFF', '#00A8A0', '#4A90E2', '#1FA97A', '#7C6AF2'];
  const LEAF_COLOR = '#F5A623';
  const ATTRIBUTION = 'Generated with the A + B = GEO Framework • abcgeo.dev';
  const apiBase = (root.getAttribute('data-api-base') || 'http://localhost:8000').replace(/\/$/, '');

  const form = root.querySelector('[data-tam-gen-form]');
  const topicEl = root.querySelector('[data-tam-gen-topic]');
  const audienceEl = root.querySelector('[data-tam-gen-audience]');
  const submitBtn = root.querySelector('[data-tam-gen-submit]');
  const submitLabel = root.querySelector('[data-tam-gen-submit-label]');
  const statusEl = root.querySelector('[data-tam-gen-status]');
  const visualHost = root.querySelector('[data-tam-visual]');
  const outlineHost = root.querySelector('[data-tam-outline]');
  const tableBody = root.querySelector('[data-tam-table-body]');
  const legendEl = root.querySelector('[data-tam-legend]');
  const zoomResetBtn = root.querySelector('[data-tam-zoom-reset]');
  const filterCluster = root.querySelector('[data-tam-filter-cluster]');
  const filterIntent = root.querySelector('[data-tam-filter-intent]');
  const filterSearch = root.querySelector('[data-tam-filter-search]');
  const drawer = root.querySelector('[data-tam-drawer]');
  const drawerBackdrop = root.querySelector('[data-tam-drawer-backdrop]');
  const drawerTitle = root.querySelector('[data-tam-drawer-title]');
  const drawerCluster = root.querySelector('[data-tam-drawer-cluster]');
  const drawerPair = root.querySelector('[data-tam-drawer-pair]');
  const drawerQuestion = root.querySelector('[data-tam-drawer-question]');
  const drawerIntent = root.querySelector('[data-tam-drawer-intent]');
  const drawerType = root.querySelector('[data-tam-drawer-type]');
  const drawerScore = root.querySelector('[data-tam-drawer-score]');
  const exportBtns = root.querySelectorAll('[data-tam-export]');
  const tabs = Array.from(root.querySelectorAll('[data-tam-tab]'));
  const panels = Array.from(root.querySelectorAll('[data-tam-panel]'));

  let mapData = null;
  let activeTab = 'visual';
  let visualSvg = null;
  let zoomBehavior = null;
  let zoomLayerSel = null;
  let sortKey = 'cluster';
  let sortDir = 1;

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
    exportBtns.forEach((btn) => { btn.disabled = !enabled; });
    if (zoomResetBtn) zoomResetBtn.disabled = !enabled;
  }

  /** Normalize API payload to pillar → clusters → subtopics (accepts legacy pillars/articles). */
  function normalizeMap(raw) {
    const clusters = (raw.clusters || raw.pillars || []).map((cluster, ci) => {
      const subtopics = (cluster.subtopics || cluster.articles || []).map((item, si) => ({
        title: item.title,
        entity_verb_pair: item.entity_verb_pair,
        core_question: item.core_question,
        search_intent: String(item.search_intent || 'informational').toLowerCase(),
        content_type: String(item.content_type || 'guide').toLowerCase(),
        priority_score: Number(item.priority_score) || 50,
        clusterName: cluster.name,
        id: `c${ci}-s${si}`,
      }));
      return {
        name: cluster.name,
        transitive_verb_relation: cluster.transitive_verb_relation,
        subtopics,
        color: CLUSTER_COLORS[ci % CLUSTER_COLORS.length],
      };
    });
    return {
      root_topic: raw.root_topic,
      audience: raw.audience || null,
      clusters,
      cached: Boolean(raw.cached),
      source: raw.source || 'api',
    };
  }

  function toHierarchy(data) {
    return {
      name: data.root_topic,
      type: 'root',
      children: data.clusters.map((cluster, ci) => ({
        name: cluster.name,
        type: 'cluster',
        transitive_verb_relation: cluster.transitive_verb_relation,
        color: cluster.color,
        children: cluster.subtopics.map((sub) => ({
          name: sub.title,
          type: 'subtopic',
          ...sub,
          color: LEAF_COLOR,
        })),
      })),
    };
  }

  function openDrawer(item) {
    if (!drawer || !item) return;
    drawerTitle.textContent = item.title || item.name || 'Subtopic detail';
    if (drawerCluster) drawerCluster.textContent = item.clusterName || item.name || '—';
    drawerPair.textContent = item.entity_verb_pair || '—';
    drawerQuestion.textContent = item.core_question || '—';
    const intent = String(item.search_intent || 'informational').toLowerCase();
    drawerIntent.textContent = intent;
    drawerIntent.setAttribute('data-intent', intent);
    if (drawerType) drawerType.textContent = item.content_type || '—';
    drawerScore.innerHTML = `${escapeHtml(String(item.priority_score ?? '—'))}<small>/100</small>`;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    drawerBackdrop.hidden = false;
    drawerBackdrop.classList.add('is-open');
    drawer.dataset.question = item.core_question || '';
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
    if (!mapData) return;
    if (name === 'visual') renderVisual(mapData);
    if (name === 'outline') renderOutline(mapData);
    if (name === 'table') renderTable(mapData);
  }

  function clearHost(host) {
    while (host.firstChild) host.removeChild(host.firstChild);
  }

  function stampAttribution(svgSelection, width, height) {
    svgSelection.append('text')
      .attr('class', 'tam-attribution')
      .attr('x', width / 2)
      .attr('y', height - 12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#8A90A0')
      .attr('font-size', 10)
      .attr('font-family', 'Montserrat, sans-serif')
      .text(ATTRIBUTION);
  }

  function truncateLabel(value, max) {
    const label = String(value || '');
    return label.length > max ? `${label.slice(0, max - 1)}…` : label;
  }

  /** InLinks-style radial dendrogram matching the reference visual hierarchy. */
  function renderVisual(data) {
    clearHost(visualHost);
    const width = visualHost.clientWidth || 1000;
    const height = Math.max(visualHost.clientHeight || 720, 700);
    const radius = Math.min(width, height) / 2 - 118;

    const svg = d3.select(visualHost)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-label', `Topical authority visual map for ${data.root_topic}`);

    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);
    const zoomLayer = g.append('g');
    zoomLayerSel = zoomLayer;

    zoomBehavior = d3.zoom()
      .scaleExtent([0.35, 4])
      .filter((event) => {
        if (event.type === 'wheel') return true;
        return event.button === 0 && !event.target.closest('.tam-node');
      })
      .on('zoom', (event) => {
        zoomLayer.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);
    // Anchor initial scale around the diagram center (not the SVG origin).
    svg.call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(0, 0).scale(0.92)
    );

    const hierarchy = d3.hierarchy(toHierarchy(data));
    d3.cluster().size([2 * Math.PI, radius])(hierarchy);

    const linkRadial = d3.linkRadial()
      .angle((d) => d.x)
      .radius((d) => d.y);

    zoomLayer.append('g')
      .selectAll('path')
      .data(hierarchy.links())
      .join('path')
      .attr('class', 'tam-link')
      .attr('d', linkRadial);

    // Mid-spoke category labels (like the reference image) — keep clear of the center hub.
    zoomLayer.append('g')
      .selectAll('text')
      .data(hierarchy.children || [])
      .join('text')
      .attr('class', 'tam-spoke-label')
      .attr('transform', (d) => {
        const angle = (d.x * 180) / Math.PI - 90;
        const r = Math.max(d.y * 0.58, 86);
        const flip = angle > 90 && angle < 270;
        return `rotate(${angle}) translate(${r},0) rotate(${flip ? 180 : 0})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '0.32em')
      .text((d) => truncateLabel(d.data.name, 20));

    const node = zoomLayer.append('g')
      .selectAll('g')
      .data(hierarchy.descendants())
      .join('g')
      .attr('class', (d) => `tam-node tam-node-${d.data.type}`)
      .attr('transform', (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`)
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', (d) => d.data.name)
      .on('click', (event, d) => {
        event.stopPropagation();
        if (d.data.type === 'subtopic') {
          openDrawer(d.data);
        } else if (d.data.type === 'cluster') {
          openDrawer({
            title: d.data.name,
            clusterName: d.data.name,
            entity_verb_pair: `${data.root_topic} + ${d.data.transitive_verb_relation}`,
            core_question: `How does ${data.root_topic} ${d.data.transitive_verb_relation} topical authority through ${d.data.name}?`,
            search_intent: 'informational',
            content_type: 'guide',
            priority_score: 90,
          });
        } else {
          openDrawer({
            title: d.data.name,
            clusterName: 'Core Pillar',
            entity_verb_pair: `${data.root_topic} + seeds`,
            core_question: `What is ${data.root_topic} and how should teams build topical authority around it?`,
            search_intent: 'informational',
            content_type: 'guide',
            priority_score: 100,
          });
        }
      })
      .on('keydown', (event, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          d3.select(event.currentTarget).dispatch('click');
        }
      });

    node.append('circle')
      .attr('r', (d) => (d.data.type === 'root' ? 11 : d.data.type === 'cluster' ? 6.5 : 3.8))
      .attr('fill', (d) => {
        if (d.data.type === 'root') return null;
        if (d.data.type === 'cluster') return d.data.color || CLUSTER_COLORS[0];
        return LEAF_COLOR;
      });

    // Root hub label — short multi-line badge under the center (reference maps use brief hub titles).
    node.filter((d) => d.data.type === 'root').each(function (d) {
      const words = String(d.data.name || '').split(/\s+/).filter(Boolean);
      const lines = [];
      let current = '';
      words.forEach((word) => {
        const next = current ? `${current} ${word}` : word;
        if (next.length > 16 && current) {
          lines.push(current);
          current = word;
        } else {
          current = next;
        }
      });
      if (current) lines.push(current);
      const shown = lines.slice(0, 2);
      if (lines.length > 2) {
        shown[1] = truncateLabel(shown[1] || lines[1], 14);
      }
      const label = d3.select(this).append('text')
        .attr('class', 'tam-label tam-label-root')
        .attr('text-anchor', 'middle')
        .attr('transform', `rotate(${90 - (d.x * 180) / Math.PI})`);
      shown.forEach((line, i) => {
        label.append('tspan')
          .attr('x', 0)
          .attr('y', 22 + i * 13)
          .attr('dy', '0.32em')
          .text(line);
      });
    });

    // Outer leaf labels only (cluster names live on the mid-spoke labels).
    node.filter((d) => d.data.type === 'subtopic')
      .append('text')
      .attr('class', 'tam-label tam-label-subtopic')
      .attr('dy', '0.32em')
      .attr('x', (d) => {
        const deg = (d.x * 180) / Math.PI;
        return deg < 180 ? 10 : -10;
      })
      .attr('text-anchor', (d) => {
        const deg = (d.x * 180) / Math.PI;
        return deg < 180 ? 'start' : 'end';
      })
      .attr('transform', (d) => {
        const deg = (d.x * 180) / Math.PI;
        return deg >= 180 ? 'rotate(180)' : null;
      })
      .text((d) => truncateLabel(d.data.name, 30));

    stampAttribution(svg, width, height);
    visualSvg = svg.node();
    if (legendEl) legendEl.hidden = false;
  }

  function renderOutline(data) {
    clearHost(outlineHost);
    const rootBanner = document.createElement('p');
    rootBanner.className = 'tam-gen__outline-root';
    rootBanner.textContent = `Core Pillar: ${data.root_topic}`;
    outlineHost.appendChild(rootBanner);

    data.clusters.forEach((cluster, ci) => {
      const details = document.createElement('details');
      details.className = 'tam-gen__cluster';
      details.open = ci < 2;
      const summary = document.createElement('summary');
      summary.innerHTML = `${escapeHtml(cluster.name)}<span class="tam-gen__cluster-verb">${escapeHtml(cluster.transitive_verb_relation)}</span>`;
      details.appendChild(summary);

      const list = document.createElement('ul');
      list.className = 'tam-gen__subtopic-list';
      cluster.subtopics.forEach((sub) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = `
          <span class="title">${escapeHtml(sub.title)}</span>
          <span class="tam-gen__intent-chip" data-intent="${escapeHtml(sub.search_intent)}">${escapeHtml(sub.search_intent)}</span>
          <span class="tam-gen__type-chip">${escapeHtml(sub.content_type)}</span>
        `;
        btn.addEventListener('click', () => openDrawer(sub));
        li.appendChild(btn);
        list.appendChild(li);
      });
      details.appendChild(list);
      outlineHost.appendChild(details);
    });
  }

  function flatRows(data) {
    const rows = [];
    data.clusters.forEach((cluster) => {
      cluster.subtopics.forEach((sub) => {
        rows.push({
          cluster: cluster.name,
          title: sub.title,
          intent: sub.search_intent,
          content_type: sub.content_type,
          priority: sub.priority_score,
          item: sub,
        });
      });
    });
    return rows;
  }

  function populateClusterFilter(data) {
    if (!filterCluster) return;
    const current = filterCluster.value;
    filterCluster.innerHTML = '<option value="">All clusters</option>';
    data.clusters.forEach((cluster) => {
      const opt = document.createElement('option');
      opt.value = cluster.name;
      opt.textContent = cluster.name;
      filterCluster.appendChild(opt);
    });
    if ([...filterCluster.options].some((o) => o.value === current)) {
      filterCluster.value = current;
    }
  }

  function renderTable(data) {
    if (!tableBody) return;
    populateClusterFilter(data);
    let rows = flatRows(data);
    const clusterVal = (filterCluster && filterCluster.value) || '';
    const intentVal = (filterIntent && filterIntent.value) || '';
    const searchVal = ((filterSearch && filterSearch.value) || '').trim().toLowerCase();

    if (clusterVal) rows = rows.filter((r) => r.cluster === clusterVal);
    if (intentVal) rows = rows.filter((r) => r.intent === intentVal);
    if (searchVal) {
      rows = rows.filter((r) => (
        r.title.toLowerCase().includes(searchVal)
        || (r.item.core_question || '').toLowerCase().includes(searchVal)
        || r.cluster.toLowerCase().includes(searchVal)
      ));
    }

    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sortDir;
      return String(av).localeCompare(String(bv)) * sortDir;
    });

    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="5" class="tam-gen__table-empty">No subtopics match the current filters.</td></tr>';
      return;
    }

    tableBody.innerHTML = rows.map((row) => `
      <tr data-sub-id="${escapeHtml(row.item.id)}">
        <td>${escapeHtml(row.cluster)}</td>
        <td>${escapeHtml(row.title)}</td>
        <td><span class="tam-gen__intent-chip" data-intent="${escapeHtml(row.intent)}">${escapeHtml(row.intent)}</span></td>
        <td><span class="tam-gen__type-chip">${escapeHtml(row.content_type)}</span></td>
        <td>${escapeHtml(String(row.priority))}</td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('tr[data-sub-id]').forEach((tr) => {
      tr.addEventListener('click', () => {
        const id = tr.getAttribute('data-sub-id');
        const match = rows.find((r) => r.item.id === id);
        if (match) openDrawer(match.item);
      });
    });
  }

  function renderAll(data) {
    mapData = data;
    setExportsEnabled(true);
    if (activeTab === 'visual') renderVisual(data);
    else if (activeTab === 'outline') renderOutline(data);
    else renderTable(data);
  }

  async function generateMap(event) {
    event.preventDefault();
    const topic = (topicEl.value || '').trim();
    const audience = (audienceEl.value || '').trim();
    if (topic.length < 2) {
      setStatus('Enter a core pillar topic of at least 2 characters.', true);
      return;
    }

    setLoading(true);
    setStatus('Building your topical authority map…');
    closeDrawer();

    try {
      const response = await fetch(`${apiBase}/api/generate-topical-map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ topic, audience: audience || null }),
      });

      let payload = null;
      try { payload = await response.json(); } catch (_) { payload = null; }

      if (!response.ok) {
        const detail = payload && (payload.detail || payload.message);
        throw new Error(typeof detail === 'string' ? detail : 'Could not generate the topical map. Please try again.');
      }

      const normalized = normalizeMap(payload);
      renderAll(normalized);
      const cacheNote = normalized.cached ? 'Loaded from cache.' : `Generated via ${normalized.source}.`;
      const leafCount = normalized.clusters.reduce((n, c) => n + c.subtopics.length, 0);
      setStatus(`${cacheNote} ${normalized.clusters.length} clusters · ${leafCount} subtopics — switch views anytime.`);
      switchTab(activeTab);
    } catch (error) {
      setStatus(error.message || 'Generation failed.', true);
    } finally {
      setLoading(false);
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

  function buildMarkdown(data) {
    const lines = [
      `# Topical Authority Map: ${data.root_topic}`,
      '',
      data.audience ? `**Audience:** ${data.audience}` : null,
      '**Architecture:** Core Pillar → Topic Clusters → Supporting Subtopics',
      '**Framework:** A + B = GEO',
      '',
    ].filter(Boolean);

    data.clusters.forEach((cluster) => {
      lines.push(`## ${cluster.name}`);
      lines.push(`*Verb relation:* ${data.root_topic} + ${cluster.transitive_verb_relation}`);
      lines.push('');
      cluster.subtopics.forEach((sub) => {
        lines.push(`- **${sub.title}**`);
        lines.push(`  - Entity+Verb: ${sub.entity_verb_pair}`);
        lines.push(`  - Question: ${sub.core_question}`);
        lines.push(`  - Intent: ${sub.search_intent} · Type: ${sub.content_type} · Priority: ${sub.priority_score}`);
      });
      lines.push('');
    });

    lines.push(`---`);
    lines.push(ATTRIBUTION);
    return lines.join('\n');
  }

  function exportCsv() {
    if (!mapData) return;
    const rows = [['Cluster', 'Article Title / Subtopic', 'Entity+Verb Pair', 'Answer-First Question', 'Search Intent', 'Content Type', 'Priority Score']];
    mapData.clusters.forEach((cluster) => {
      cluster.subtopics.forEach((sub) => {
        rows.push([
          cluster.name,
          sub.title,
          sub.entity_verb_pair,
          sub.core_question,
          sub.search_intent,
          sub.content_type,
          sub.priority_score,
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

  function exportMarkdown() {
    if (!mapData) return;
    const md = buildMarkdown(mapData);
    downloadBlob(`${slugify(mapData.root_topic)}-topical-map.md`, new Blob([md], { type: 'text/markdown;charset=utf-8' }));
    setStatus('Markdown downloaded.');
  }

  function copyOutline() {
    if (!mapData) return;
    const md = buildMarkdown(mapData);
    navigator.clipboard.writeText(md)
      .then(() => setStatus('Outline copied to clipboard.'))
      .catch(() => setStatus('Copy failed — try Export Markdown instead.', true));
  }

  function exportSvgFile() {
    if (!visualSvg) {
      setStatus('Open Visual Map first to export SVG.', true);
      switchTab('visual');
      return;
    }
    const clone = visualSvg.cloneNode(true);
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const source = new XMLSerializer().serializeToString(clone);
    downloadBlob(
      `${slugify(mapData.root_topic)}-topical-map.svg`,
      new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    );
    setStatus('SVG downloaded.');
  }

  function exportPng() {
    if (!visualSvg) {
      setStatus('Open Visual Map first to export PNG.', true);
      switchTab('visual');
      return;
    }
    const clone = visualSvg.cloneNode(true);
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const source = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    const vb = (visualSvg.getAttribute('viewBox') || '0 0 1000 720').split(/\s+/).map(Number);
    const w = vb[2] || 1000;
    const h = vb[3] || 720;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w * 2;
      canvas.height = h * 2;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(90, 100, 120, 0.95)';
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

  zoomResetBtn?.addEventListener('click', () => {
    if (!visualSvg || !zoomBehavior) return;
    d3.select(visualSvg).transition().duration(250).call(zoomBehavior.transform, d3.zoomIdentity.scale(0.95));
  });

  filterCluster?.addEventListener('change', () => { if (mapData) renderTable(mapData); });
  filterIntent?.addEventListener('change', () => { if (mapData) renderTable(mapData); });
  filterSearch?.addEventListener('input', () => { if (mapData) renderTable(mapData); });

  root.querySelectorAll('[data-tam-sort]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-tam-sort');
      if (sortKey === key) sortDir *= -1;
      else {
        sortKey = key;
        sortDir = 1;
      }
      if (mapData) renderTable(mapData);
    });
  });

  exportBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.getAttribute('data-tam-export');
      if (kind === 'csv') exportCsv();
      else if (kind === 'markdown') exportMarkdown();
      else if (kind === 'copy') copyOutline();
      else if (kind === 'svg') exportSvgFile();
      else if (kind === 'png') exportPng();
    });
  });

  window.addEventListener('resize', () => {
    if (mapData && activeTab === 'visual') renderVisual(mapData);
  });
})();
