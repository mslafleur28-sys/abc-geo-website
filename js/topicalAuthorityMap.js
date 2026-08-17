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
