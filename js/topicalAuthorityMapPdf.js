/* abcGEO — branded PDF export for the Topical Authority Content Map */
(function (global) {
  const PDF_SCRIPT = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const C = {
    bg: [250, 249, 246],
    white: [255, 255, 255],
    text: [26, 32, 44],
    muted: [100, 116, 139],
    orange: [255, 107, 74],
    sky: [0, 180, 216],
    skyInk: [0, 86, 107],
    success: [0, 201, 167],
    tealInk: [0, 89, 78],
    orangeInk: [154, 52, 18],
    line: [214, 219, 226],
    pillarFill: [255, 244, 240],
    clusterFill: [240, 250, 252],
    microFill: [237, 250, 247],
  };

  function pdfText(value) {
    const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    return text || '—';
  }

  function slugify(value) {
    return String(value || 'topical-authority-map')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'topical-authority-map';
  }

  function loadJsPdf() {
    if (global.jspdf && global.jspdf.jsPDF) {
      return Promise.resolve(global.jspdf.jsPDF);
    }
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-jspdf-lib]');
      const finish = () => {
        if (global.jspdf && global.jspdf.jsPDF) resolve(global.jspdf.jsPDF);
        else reject(new Error('PDF library did not initialize'));
      };
      if (existing) {
        if (existing.dataset.ready === 'true') {
          finish();
          return;
        }
        existing.addEventListener('load', finish);
        existing.addEventListener('error', () => reject(new Error('PDF library failed to load')));
        return;
      }
      const script = document.createElement('script');
      script.src = PDF_SCRIPT;
      script.async = true;
      script.dataset.jspdfLib = 'true';
      script.onload = () => {
        script.dataset.ready = 'true';
        finish();
      };
      script.onerror = () => reject(new Error('PDF library failed to load'));
      document.head.appendChild(script);
    });
  }

  function mixBar(doc, pageW, barH) {
    const steps = 42;
    for (let i = 0; i < steps; i += 1) {
      const t = i / (steps - 1);
      doc.setFillColor(
        Math.round(255 + (0 - 255) * t),
        Math.round(107 + (180 - 107) * t),
        Math.round(74 + (216 - 74) * t)
      );
      doc.rect((pageW / steps) * i, 0, pageW / steps + 0.25, barH, 'F');
    }
  }

  function paintPage(doc, pageW, pageH) {
    doc.setFillColor(...C.bg);
    doc.rect(0, 0, pageW, pageH, 'F');
    mixBar(doc, pageW, 4.2);
  }

  function drawWordmark(doc, x, y) {
    doc.setFillColor(...C.orange);
    doc.roundedRect(x, y - 4.6, 5.2, 5.2, 1.1, 1.1, 'F');
    doc.setFillColor(...C.sky);
    doc.circle(x + 2.6, y - 2, 1.15, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...C.text);
    doc.text('abc', x + 6.6, y);
    doc.setTextColor(...C.skyInk);
    doc.text('GEO', x + 6.6 + doc.getTextWidth('abc'), y);
  }

  function roleFill(role) {
    if (role === 'Pillar Page') return C.pillarFill;
    if (role === 'Sub-Cluster') return C.clusterFill;
    return C.microFill;
  }

  function roleAccent(role) {
    if (role === 'Pillar Page') return C.orange;
    if (role === 'Sub-Cluster') return C.sky;
    return C.success;
  }

  function countRows(state) {
    let clusters = 0;
    let micros = 0;
    (state.pillars || []).forEach((pillar) => {
      clusters += (pillar.clusters || []).length;
      (pillar.clusters || []).forEach((item) => {
        micros += (item.micros || []).length;
      });
    });
    return { pillars: (state.pillars || []).length, clusters, micros };
  }

  function flattenPillar(pillar) {
    const rows = [pillar];
    (pillar.clusters || []).forEach((item) => {
      rows.push(item);
      (item.micros || []).forEach((unit) => rows.push(unit));
    });
    return rows;
  }

  function stampFooters(doc, pageW, pageH) {
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i += 1) {
      doc.setPage(i);
      doc.setDrawColor(...C.sky);
      doc.setLineWidth(0.35);
      doc.line(16, pageH - 12.5, pageW - 16, pageH - 12.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      doc.text('A + B = GEO  ·  abcgeo.dev  ·  Topical Authority Content Map', 16, pageH - 7.5);
      doc.text(`Page ${i} of ${total}`, pageW - 16, pageH - 7.5, { align: 'right' });
    }
  }

  function createPager(doc, pageW, pageH) {
    const left = 16;
    const width = pageW - 32;
    const bottom = pageH - 18;
    const continuationTop = 20;
    let y = 12;
    let isCover = true;

    function header() {
      paintPage(doc, pageW, pageH);
      if (isCover) return;
      doc.setFillColor(...C.white);
      doc.rect(0, 4.2, pageW, 10.4, 'F');
      doc.setDrawColor(...C.line);
      doc.setLineWidth(0.25);
      doc.line(0, 14.6, pageW, 14.6);
      drawWordmark(doc, 16, 11.4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text('Topical Authority Content Map', pageW - 16, 11.2, { align: 'right' });
    }

    function ensure(needed) {
      if (y + needed <= bottom) return;
      isCover = false;
      doc.addPage();
      header();
      y = continuationTop;
    }

    header();
    return {
      left,
      width,
      get y() {
        return y;
      },
      set y(value) {
        y = value;
      },
      ensure,
      advance(amount) {
        y += amount;
      },
    };
  }

  function drawMetaBlock(doc, pager, label, value) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(pdfText(value), pager.width - 10);
    const height = 11.5 + lines.length * 4.7;
    pager.ensure(height + 2);
    const x = pager.left;
    const y = pager.y;
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, pager.width, height, 2, 2, 'FD');
    doc.setFillColor(...C.sky);
    doc.rect(x, y, 2.1, height, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.skyInk);
    doc.text(label.toUpperCase(), x + 6, y + 4.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...C.text);
    doc.text(lines, x + 6, y + 10.2);
    pager.y = y + height + 3.2;
  }

  function drawSectionTitle(doc, pager, title) {
    pager.ensure(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...C.text);
    doc.text(title, pager.left, pager.y + 4);
    doc.setDrawColor(...C.orange);
    doc.setLineWidth(0.7);
    doc.line(pager.left, pager.y + 6.2, pager.left + 18, pager.y + 6.2);
    pager.advance(11);
  }

  function drawBullet(doc, pager, text) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(text, pager.width - 6);
    const height = lines.length * 4.4 + 1.2;
    pager.ensure(height);
    doc.setFillColor(...C.orange);
    doc.circle(pager.left + 1.3, pager.y + 1.1, 0.85, 'F');
    doc.setTextColor(...C.text);
    doc.text(lines, pager.left + 5, pager.y + 2.2);
    pager.advance(height);
  }

  function drawTree(doc, pager, state) {
    (state.pillars || []).forEach((pillar) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const hub = doc.splitTextToSize(`${pillar.id}  ${pdfText(pillar.title)}`, pager.width - 4);
      pager.ensure(hub.length * 4.6 + 4);
      doc.setFillColor(...C.pillarFill);
      doc.roundedRect(pager.left, pager.y, pager.width, hub.length * 4.6 + 5, 1.6, 1.6, 'F');
      doc.setFillColor(...C.orange);
      doc.rect(pager.left, pager.y, 2, hub.length * 4.6 + 5, 'F');
      doc.setTextColor(...C.text);
      doc.text(hub, pager.left + 5, pager.y + 4.6);
      pager.advance(hub.length * 4.6 + 7);

      (pillar.clusters || []).forEach((item) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.2);
        const clusterLine = `${item.id}  ${pdfText(item.title)}`;
        const clusterLines = doc.splitTextToSize(clusterLine, pager.width - 14);
        pager.ensure(clusterLines.length * 4.3 + 8);
        doc.setFillColor(...C.sky);
        doc.rect(pager.left + 4, pager.y + 0.4, 1.2, clusterLines.length * 4.3 + 1.2, 'F');
        doc.setTextColor(...C.text);
        doc.text(clusterLines, pager.left + 8, pager.y + 3.6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.muted);
        doc.text(`Parent link → ${pdfText(item.parent)}`, pager.left + 8, pager.y + clusterLines.length * 4.3 + 4);
        pager.advance(clusterLines.length * 4.3 + 8);

        (item.micros || []).forEach((unit) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.8);
          const microLines = doc.splitTextToSize(`${unit.id}  ${pdfText(unit.title)}  →  ${pdfText(unit.parent)}`, pager.width - 20);
          pager.ensure(microLines.length * 4.1 + 2);
          doc.setFillColor(...C.success);
          doc.circle(pager.left + 11, pager.y + 1.3, 0.85, 'F');
          doc.setTextColor(...C.text);
          doc.text(microLines, pager.left + 14, pager.y + 2.4);
          pager.advance(microLines.length * 4.1 + 2.2);
        });
        pager.advance(2);
      });
      pager.advance(2);
    });
  }

  function fieldPair(doc, leftX, rightX, colW, y, leftLabel, leftValue, rightLabel, rightValue) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...C.skyInk);
    doc.text(leftLabel.toUpperCase(), leftX, y);
    doc.text(rightLabel.toUpperCase(), rightX, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    const leftLines = doc.splitTextToSize(pdfText(leftValue), colW);
    const rightLines = doc.splitTextToSize(pdfText(rightValue), colW);
    doc.text(leftLines, leftX, y + 4.4);
    doc.text(rightLines, rightX, y + 4.4);
    return Math.max(leftLines.length, rightLines.length) * 4.1 + 7.2;
  }

  function measureArticleCard(doc, row, width) {
    const inner = width - 14;
    const colW = (inner - 6) / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const title = doc.splitTextToSize(pdfText(row.title), inner);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const question = doc.splitTextToSize(pdfText(row.question), inner);
    const kw = doc.splitTextToSize(pdfText(row.keyword), colW);
    const intent = doc.splitTextToSize(pdfText(row.intent), colW);
    const parent = doc.splitTextToSize(pdfText(row.parent), colW);
    const priority = doc.splitTextToSize(pdfText(row.priority), colW);
    return 16 + title.length * 5 + 4
      + Math.max(kw.length, intent.length) * 4.1 + 8
      + Math.max(parent.length, priority.length) * 4.1 + 8
      + 6 + question.length * 4.2 + 12;
  }

  function drawArticleCard(doc, pager, row) {
    const height = measureArticleCard(doc, row, pager.width);
    pager.ensure(height + 1);
    const x = pager.left;
    const y = pager.y;
    const inner = pager.width - 14;
    const colW = (inner - 6) / 2;
    const fill = roleFill(row.role);
    const accent = roleAccent(row.role);

    doc.setFillColor(...fill);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, pager.width, height, 2.2, 2.2, 'FD');
    doc.setFillColor(...accent);
    doc.rect(x, y, 2.2, height, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(...C.skyInk);
    const idLabel = pdfText(row.id);
    doc.text(idLabel, x + 6, y + 5.2);
    doc.setTextColor(...C.text);
    doc.text(pdfText(row.role), x + 8.5 + doc.getTextWidth(idLabel), y + 5.2);
    doc.setTextColor(...C.muted);
    doc.text(`Priority ${pdfText(row.priority)}`, x + pager.width - 6, y + 5.2, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...C.text);
    const title = doc.splitTextToSize(pdfText(row.title), inner);
    doc.text(title, x + 6, y + 11.2);
    let cursor = y + 11.2 + title.length * 5 + 1.5;

    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.2);
    doc.line(x + 6, cursor, x + pager.width - 6, cursor);
    cursor += 5;

    cursor += fieldPair(doc, x + 6, x + 6 + colW + 6, colW, cursor, 'Target keyword', row.keyword, 'Search intent', row.intent);
    cursor += fieldPair(doc, x + 6, x + 6 + colW + 6, colW, cursor, 'Parent link target', row.parent, 'Priority', row.priority) - 1.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...C.skyInk);
    doc.text('ANSWER-FIRST QUESTION (DIRECT CORE QUESTION ANSWERED)', x + 6, cursor);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...C.text);
    const question = doc.splitTextToSize(pdfText(row.question), inner);
    doc.text(question, x + 6, cursor + 5);

    pager.y = y + height + 3.4;
  }

  async function exportTamPdf(state) {
    const JsPDF = await loadJsPdf();
    const doc = new JsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const pager = createPager(doc, pageW, pageH);
    const topic = pdfText(state.topic);
    const counts = countRows(state);
    const generated = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    doc.setProperties({
      title: `Topical Authority Content Map: ${topic}`,
      subject: 'Hub-and-spoke content plan with answer-first questions and internal linking loops',
      author: 'abcGEO',
      keywords: 'topical authority, content map, GEO, AEO, pillar cluster',
      creator: 'abcGEO Topical Authority Content Map',
    });

    drawWordmark(doc, pager.left, 16.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text('Content template  ·  A + B = GEO', pageW - 16, 16, { align: 'right' });
    pager.y = 28;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...C.text);
    const heading = doc.splitTextToSize('Topical Authority Content Map', pager.width);
    doc.text(heading, pager.left, pager.y);
    pager.advance(heading.length * 8 + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...C.muted);
    const dek = doc.splitTextToSize(
      `Completed hub-and-spoke outline for ${topic}. Every article lists its target keyword, search intent, answer-first question, parent link target, and priority.`,
      pager.width
    );
    doc.text(dek, pager.left, pager.y);
    pager.advance(dek.length * 4.8 + 4);
    doc.setFontSize(8.5);
    doc.setTextColor(...C.skyInk);
    doc.text(`Generated ${generated}  ·  ${counts.pillars} pillar · ${counts.clusters} sub-clusters · ${counts.micros} micro-clusters`, pager.left, pager.y);
    pager.advance(7);

    drawMetaBlock(doc, pager, 'Core topic / niche', state.topic);
    drawMetaBlock(doc, pager, 'Target audience', state.audience);
    drawMetaBlock(doc, pager, 'Primary goal / conversion', state.goal);

    drawSectionTitle(doc, pager, 'Architecture');
    drawBullet(doc, pager, 'Hub-and-spoke: one pillar hub, 3–5 sub-clusters, and 2–3 micro-clusters under each cluster.');
    drawBullet(doc, pager, 'Answer-first (AEO): every URL answers its Direct Core Question in the opening section.');
    drawBullet(doc, pager, 'Internal linking: micros link up to their sub-cluster; sub-clusters link up to the pillar; the pillar links down to every cluster.');
    pager.advance(2);

    drawSectionTitle(doc, pager, 'Hierarchy preview');
    drawTree(doc, pager, state);
    pager.advance(2);

    drawSectionTitle(doc, pager, 'Hierarchy rules');
    drawBullet(doc, pager, 'Pillar Hub (P#): one broad, authoritative overview of the primary subject.');
    drawBullet(doc, pager, 'Sub-Clusters (C#.#): core sub-topics that expand specific sections of the pillar.');
    drawBullet(doc, pager, 'Micro-Clusters (M#.#a): long-tail how-tos, comparisons, and direct Q&A that link back to their sub-cluster.');
    drawBullet(doc, pager, 'No orphans: every row has a parent link target so topical authority loops stay closed.');
    pager.advance(3);

    (state.pillars || []).forEach((pillar) => {
      drawSectionTitle(doc, pager, `${pillar.id} — ${pdfText(pillar.title)}`);
      flattenPillar(pillar).forEach((row) => drawArticleCard(doc, pager, row));
      pager.advance(1);
    });

    stampFooters(doc, pageW, pageH);
    doc.save(`${slugify(state.topic)}-topical-authority-map.pdf`);
  }

  global.abcgeoExportTamPdf = exportTamPdf;
})(window);
