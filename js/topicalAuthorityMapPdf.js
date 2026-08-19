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

  const SP = {
    pageX: 16,
    block: 5.5,
    card: 5.5,
    inner: 5,
    line: 3.6,
  };

  const TYPE = {
    h1: 16,
    h2: 13,
    h3: 10.5,
    body: 9,
    label: 7,
    small: 8,
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

  function titleSizeForRole(role) {
    if (role === 'Pillar Page') return TYPE.h1;
    if (role === 'Sub-Cluster') return TYPE.h2;
    return TYPE.h3;
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

  function lineHeight(fontSize) {
    return fontSize * 0.42;
  }

  function wrappedLines(doc, text, width, fontSize, fontStyle) {
    doc.setFont('helvetica', fontStyle || 'normal');
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(pdfText(text), width);
  }

  function stampFooters(doc, pageW, pageH) {
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i += 1) {
      doc.setPage(i);
      doc.setDrawColor(...C.sky);
      doc.setLineWidth(0.35);
      doc.line(SP.pageX, pageH - 12.5, pageW - SP.pageX, pageH - 12.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      doc.text('A + B = GEO  ·  abcgeo.dev  ·  Topical Authority Content Map', SP.pageX, pageH - 7.5);
      doc.text(`Page ${i} of ${total}`, pageW - SP.pageX, pageH - 7.5, { align: 'right' });
    }
  }

  function createPager(doc, pageW, pageH) {
    const left = SP.pageX;
    const width = pageW - SP.pageX * 2;
    const bottom = pageH - 18;
    const continuationTop = 22;
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
      drawWordmark(doc, SP.pageX, 11.4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text('Topical Authority Content Map', pageW - SP.pageX, 11.2, { align: 'right' });
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

  function drawFormulaBanner(doc, pager) {
    // Allocate extra vertical room so baseline-heavy text doesn't bleed into the next block.
    const height = 26;
    pager.ensure(height + SP.block + 1);
    const x = pager.left;
    const y = pager.y;

    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, pager.width, height, 2.2, 2.2, 'FD');

    const colW = pager.width / 3;
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.2);
    doc.line(x + colW, y + 4, x + colW, y + height - 4);
    doc.line(x + colW * 2, y + 4, x + colW * 2, y + height - 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...C.text);
    doc.text('A', x + colW * 0.5, y + 9, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(...C.muted);
    doc.text('+', x + colW * 1.0, y + 9, { align: 'center' });
    doc.setFontSize(18);
    doc.setTextColor(...C.text);
    doc.text('B', x + colW * 1.5, y + 9, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(...C.muted);
    doc.text('=', x + colW * 2.0, y + 9, { align: 'center' });
    doc.setFontSize(18);
    doc.setTextColor(...C.skyInk);
    doc.text('C', x + colW * 2.5, y + 9, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text('Entity', x + colW * 0.5, y + 14.5, { align: 'center' });
    doc.text('Transitive Verb', x + colW * 1.5, y + 14.5, { align: 'center' });
    doc.text('GEO Results', x + colW * 2.5, y + 14.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...C.skyInk);
    doc.text('Content template formula', x + pager.width / 2, y + 21.5, { align: 'center' });

    pager.y = y + height + SP.block + 1;
  }

  function drawMetadataTable(doc, pager, state) {
    const rows = [
      ['Core Topic', state.topic],
      ['Target Audience', state.audience],
      ['Primary Goal', state.goal],
    ];

    const labelW = 38;
    const valueW = pager.width - labelW - SP.inner * 2;
    const rowHeights = rows.map(([, value]) => {
      const lines = wrappedLines(doc, value, valueW, TYPE.body, 'normal');
      return Math.max(9, lines.length * lineHeight(TYPE.body) + 4);
    });
    const height = SP.inner + rowHeights.reduce((sum, h) => sum + h, 0) + SP.inner;

    pager.ensure(height + SP.block);
    const x = pager.left;
    const y = pager.y;

    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, pager.width, height, 2.2, 2.2, 'FD');
    doc.setFillColor(...C.sky);
    doc.rect(x, y, 2.2, height, 'F');

    let cursor = y + SP.inner + 3;
    rows.forEach(([label, value], index) => {
      const rowH = rowHeights[index];
      if (index > 0) {
        doc.setDrawColor(...C.line);
        doc.setLineWidth(0.15);
        doc.line(x + SP.inner, cursor - 2.5, x + pager.width - SP.inner, cursor - 2.5);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(TYPE.label);
      doc.setTextColor(...C.skyInk);
      doc.text(label.toUpperCase(), x + SP.inner + 2, cursor + 1);

      const lines = wrappedLines(doc, value, valueW, TYPE.body, 'normal');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(TYPE.body);
      doc.setTextColor(...C.text);
      doc.text(lines, x + labelW, cursor + 1);

      cursor += rowH;
    });

    pager.y = y + height + SP.block;
  }

  function drawSectionTitle(doc, pager, title) {
    pager.ensure(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...C.text);
    doc.text(title, pager.left, pager.y + 4);
    doc.setDrawColor(...C.orange);
    doc.setLineWidth(0.7);
    doc.line(pager.left, pager.y + 6.5, pager.left + 22, pager.y + 6.5);
    pager.advance(12);
  }

  function drawBullet(doc, pager, text) {
    const lines = wrappedLines(doc, text, pager.width - 8, TYPE.body, 'normal');
    const height = lines.length * lineHeight(TYPE.body) + 2;
    pager.ensure(height);
    doc.setFillColor(...C.orange);
    doc.circle(pager.left + 1.3, pager.y + 1.2, 0.85, 'F');
    doc.setTextColor(...C.text);
    doc.text(lines, pager.left + 5.5, pager.y + 2.2);
    pager.advance(height + 1.5);
  }

  function layoutTreeNode(doc, node, width) {
    const indent = node.level * 8;
    // Render hierarchy using indentation only (no connector glyphs),
    // so IDs remain stable in jsPDF fonts and do not get visually mangled.
    const prefix = '';
    const idPart = `${node.id}  `;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(node.fontSize);
    const prefixW = 0;
    const idW = doc.getTextWidth(idPart);
    const textW = width - indent - prefixW - idW - 4;
    const titleLines = wrappedLines(doc, node.title, Math.max(textW, 20), node.fontSize, 'bold');
    const parentLines = node.parent
      ? wrappedLines(doc, `Parent: ${pdfText(node.parent)}`, width - indent - 4, TYPE.small, 'normal')
      : [];
    const textBlockH = titleLines.length * lineHeight(node.fontSize);
    const parentH = parentLines.length ? parentLines.length * lineHeight(TYPE.small) + 1.5 : 0;
    const height = SP.inner + textBlockH + parentH + SP.inner;
    return { indent, prefix, prefixW, idPart, idW, titleLines, parentLines, height, fontSize: node.fontSize };
  }

  function drawDirectoryTree(doc, pager, state) {
    (state.pillars || []).forEach((pillar) => {
      const pillarNode = {
        level: 0,
        id: pillar.id,
        title: pillar.title,
        parent: null,
        fontSize: TYPE.h1,
      };
      const pillarLayout = layoutTreeNode(doc, pillarNode, pager.width);
      pager.ensure(pillarLayout.height + SP.block);
      drawTreeNodeBlock(doc, pager, pillarNode, pillarLayout, C.pillarFill, C.orange);

      (pillar.clusters || []).forEach((item, ci, clusters) => {
        const clusterNode = {
          level: 1,
          id: item.id,
          title: item.title,
          parent: item.parent,
          fontSize: TYPE.h2,
        };
        const clusterLayout = layoutTreeNode(doc, clusterNode, pager.width);
        pager.ensure(clusterLayout.height + SP.block * 0.6);
        drawTreeNodeBlock(doc, pager, clusterNode, clusterLayout, C.clusterFill, C.sky);

        (item.micros || []).forEach((unit) => {
          const microNode = {
            level: 2,
            id: unit.id,
            title: unit.title,
            parent: unit.parent,
            fontSize: TYPE.h3,
          };
          const microLayout = layoutTreeNode(doc, microNode, pager.width);
          pager.ensure(microLayout.height + SP.block * 0.5);
          drawTreeNodeBlock(doc, pager, microNode, microLayout, C.microFill, C.success);
        });

        if (ci < clusters.length - 1) pager.advance(1);
      });

      pager.advance(SP.block);
    });
  }

  function drawTreeNodeBlock(doc, pager, node, layout, fill, accent) {
    const x = pager.left;
    const y = pager.y;

    doc.setFillColor(...fill);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.2);
    doc.roundedRect(x + layout.indent, y, pager.width - layout.indent, layout.height, 1.6, 1.6, 'FD');
    doc.setFillColor(...accent);
    doc.rect(x + layout.indent, y, 1.8, layout.height, 'F');

    const textX = x + layout.indent + SP.inner + layout.prefixW;
    let cursor = y + SP.inner + lineHeight(layout.fontSize);

    if (layout.prefix) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(layout.fontSize);
      doc.setTextColor(...C.muted);
      doc.text(layout.prefix, x + layout.indent + SP.inner, cursor);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(layout.fontSize);
    doc.setTextColor(...C.text);
    doc.text(layout.idPart, textX, cursor);
    doc.text(layout.titleLines, textX + layout.idW, cursor);

    if (layout.parentLines.length) {
      cursor += layout.titleLines.length * lineHeight(layout.fontSize) + 1;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(TYPE.small);
      doc.setTextColor(...C.muted);
      doc.text(layout.parentLines, x + layout.indent + SP.inner + 2, cursor);
    }

    pager.y = y + layout.height + (node.level === 0 ? SP.block * 0.8 : SP.block * 0.5);
  }

  function layoutFieldRow(doc, leftLabel, leftValue, rightLabel, rightValue, colW) {
    const labelH = 4;
    const leftLines = wrappedLines(doc, leftValue, colW, TYPE.body, 'normal');
    const rightLines = wrappedLines(doc, rightValue, colW, TYPE.body, 'normal');
    const valueH = Math.max(leftLines.length, rightLines.length) * lineHeight(TYPE.body);
    return {
      labelH,
      valueH,
      height: labelH + valueH + 2,
      leftLines,
      rightLines,
      leftLabel,
      rightLabel,
    };
  }

  function layoutArticleCard(doc, row, width) {
    const padX = SP.inner;
    const padY = SP.inner;
    const inner = width - padX * 2;
    const colW = (inner - 5) / 2;
    const titleSize = titleSizeForRole(row.role);
    const titleLines = wrappedLines(doc, row.title, inner, titleSize, 'bold');
    const fieldRows = [
      layoutFieldRow(doc, 'Target Keyword', row.keyword, 'Search Intent', row.intent, colW),
      layoutFieldRow(doc, 'Parent Link Target', row.parent, 'Priority', row.priority, colW),
    ];
    const questionLines = wrappedLines(doc, row.question, inner, TYPE.body, 'normal');

    const headerH = 6;
    const titleH = titleLines.length * lineHeight(titleSize);
    const dividerH = 3;
    const fieldsH = fieldRows.reduce((sum, r) => sum + r.height + 2.5, 0);
    const questionLabelH = 4.5;
    const questionH = questionLines.length * lineHeight(TYPE.body);

    const height = padY + headerH + 2 + titleH + dividerH + fieldsH + questionLabelH + questionH + padY;

    return {
      height,
      padX,
      padY,
      inner,
      colW,
      titleSize,
      titleLines,
      fieldRows,
      questionLabelH,
      questionLines,
    };
  }

  function drawFieldRow(doc, x, y, colW, gap, row) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(TYPE.label);
    doc.setTextColor(...C.skyInk);
    doc.text(row.leftLabel.toUpperCase(), x, y);
    doc.text(row.rightLabel.toUpperCase(), x + colW + gap, y);

    const valueY = y + row.labelH;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(TYPE.body);
    doc.setTextColor(...C.text);
    doc.text(row.leftLines, x, valueY);
    doc.text(row.rightLines, x + colW + gap, valueY);

    return row.height;
  }

  function drawArticleCard(doc, pager, row) {
    const layout = layoutArticleCard(doc, row, pager.width);
    pager.ensure(layout.height + SP.card);

    const x = pager.left;
    const y = pager.y;
    const fill = roleFill(row.role);
    const accent = roleAccent(row.role);

    doc.setFillColor(...fill);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, pager.width, layout.height, 2.2, 2.2, 'FD');
    doc.setFillColor(...accent);
    doc.rect(x, y, 2.2, layout.height, 'F');

    const innerX = x + layout.padX;
    let cursor = y + layout.padY + 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(TYPE.label);
    doc.setTextColor(...C.skyInk);
    const idLabel = pdfText(row.id);
    doc.text(idLabel, innerX, cursor);
    doc.setTextColor(...C.text);
    doc.text(pdfText(row.role), innerX + doc.getTextWidth(idLabel) + 2.5, cursor);

    cursor += layout.titleSize * 0.25 + 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(layout.titleSize);
    doc.setTextColor(...C.text);
    doc.text(layout.titleLines, innerX, cursor);
    cursor += layout.titleLines.length * lineHeight(layout.titleSize) + 2;

    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.2);
    doc.line(innerX, cursor, x + pager.width - layout.padX, cursor);
    cursor += 3.5;

    layout.fieldRows.forEach((fieldRow) => {
      cursor += drawFieldRow(doc, innerX, cursor, layout.colW, 5, fieldRow) + 2.5;
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(TYPE.label);
    doc.setTextColor(...C.skyInk);
    doc.text('ANSWER-FIRST QUESTION', innerX, cursor);
    cursor += layout.questionLabelH;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(TYPE.body);
    doc.setTextColor(...C.text);
    doc.text(layout.questionLines, innerX, cursor);

    pager.y = y + layout.height + SP.card;
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
    pager.y = 26;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...C.text);
    const heading = doc.splitTextToSize('Topical Authority Content Map', pager.width);
    doc.text(heading, pager.left, pager.y);
    pager.advance(heading.length * 8 + 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...C.muted);
    const dek = doc.splitTextToSize(
      `Completed hub-and-spoke outline for ${topic}. Every article lists its target keyword, search intent, answer-first question, parent link target, and priority.`,
      pager.width
    );
    doc.text(dek, pager.left, pager.y);
    pager.advance(dek.length * lineHeight(10) + 3);

    doc.setFontSize(TYPE.small);
    doc.setTextColor(...C.skyInk);
    doc.text(
      `Generated ${generated}  ·  ${counts.pillars} pillar · ${counts.clusters} sub-clusters · ${counts.micros} micro-clusters`,
      pager.left,
      pager.y
    );
    pager.advance(8);

    drawFormulaBanner(doc, pager);
    drawMetadataTable(doc, pager, state);

    drawSectionTitle(doc, pager, 'Architecture');
    drawBullet(doc, pager, 'Hub-and-spoke: one pillar hub, 3–5 sub-clusters, and 2–3 micro-clusters under each cluster.');
    drawBullet(doc, pager, 'Answer-first (AEO): every URL answers its Direct Core Question in the opening section.');
    drawBullet(doc, pager, 'Internal linking: micros link up to their sub-cluster; sub-clusters link up to the pillar; the pillar links down to every cluster.');
    pager.advance(SP.block);

    drawSectionTitle(doc, pager, 'Hierarchy Preview');
    drawDirectoryTree(doc, pager, state);
    pager.advance(SP.block);

    drawSectionTitle(doc, pager, 'Hierarchy Rules');
    drawBullet(doc, pager, 'Pillar Hub (P#): one broad, authoritative overview of the primary subject.');
    drawBullet(doc, pager, 'Sub-Clusters (C#.#): core sub-topics that expand specific sections of the pillar.');
    drawBullet(doc, pager, 'Micro-Clusters (M#.#a): long-tail how-tos, comparisons, and direct Q&A that link back to their sub-cluster.');
    drawBullet(doc, pager, 'No orphans: every row has a parent link target so topical authority loops stay closed.');
    pager.advance(SP.block);

    (state.pillars || []).forEach((pillar) => {
      drawSectionTitle(doc, pager, `${pillar.id} — ${pdfText(pillar.title)}`);
      flattenPillar(pillar).forEach((row) => drawArticleCard(doc, pager, row));
      pager.advance(SP.block);
    });

    stampFooters(doc, pageW, pageH);
    doc.save(`${slugify(state.topic)}-topical-authority-map.pdf`);
  }

  global.abcgeoExportTamPdf = exportTamPdf;
})(window);
