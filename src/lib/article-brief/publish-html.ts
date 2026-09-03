import { SITE_WRITING_GUIDELINES } from './guidelines';
import { toPublishImageSrc } from './image-paths';
import { KEY_TERM_CSS, linkKeyTermsInHtml, termAnchorId } from './key-terms';
import {
  buildPreviewModel,
  type ArticlePreviewModel,
  type PreviewBlock,
  type PreviewSection,
} from './preview-model';
import { renderRichInline } from './rich-text';
import type { ArticleBriefInput, KeyDefinition } from './schema';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineHtml(
  text: string,
  definitions: KeyDefinition[] = [],
  usedTerms?: Set<string>,
): string {
  return linkKeyTermsInHtml(
    renderRichInline(text, 'publish'),
    definitions,
    usedTerms,
  );
}

function alignClass(align?: string): string {
  if (align === 'center') return ' text-center';
  if (align === 'right') return ' text-right';
  return '';
}

function isoDate(value?: string): string {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function renderBlock(
  block: PreviewBlock,
  definitions: KeyDefinition[],
  usedTerms: Set<string>,
): string {
  if (block.type === 'image' && block.src) {
    const src = toPublishImageSrc(block.src);
    const alt = escapeHtml(block.alt || '');
    const caption = escapeHtml(block.caption || '');
    return `                    <figure class="my-6">
                        <img
                          src="${escapeHtml(src)}"
                          alt="${alt}"
                          class="w-full rounded-xl border border-slate-800 shadow-lg"
                          loading="lazy"
                        />
                        ${
                          caption
                            ? `<figcaption class="mt-2 text-center text-sm text-slate-400">${caption}</figcaption>`
                            : ''
                        }
                    </figure>`;
  }
  if (block.type === 'takeaways' && block.items?.length) {
    const items = block.items
      .map(
        (item) => `                            <li class="flex items-start space-x-2">
                                <span class="text-sky-700 font-bold">✓</span>
                                <span>${inlineHtml(item, definitions, usedTerms)}</span>
                            </li>`,
      )
      .join('\n');
    return `                    <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-5 my-6 space-y-3">
                        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Key Takeaways</h4>
                        <ul class="space-y-2 text-sm text-slate-300">
${items}
                        </ul>
                    </div>`;
  }
  if (block.type === 'answer-first' && block.text) {
    return `                    <div class="bg-sky-400/10 border-l-4 border-sky-400 rounded-r-xl p-5 my-4">
                        <div class="text-xs font-bold uppercase tracking-wider text-sky-700 mb-2">Answer-first</div>
                        <p class="text-slate-200 font-medium leading-relaxed">${inlineHtml(block.text, definitions, usedTerms)}</p>
                    </div>`;
  }
  if (block.type === 'at-a-glance' && block.items?.length) {
    const heading = escapeHtml(block.title?.trim() || 'At a glance');
    const items = block.items
      .map(
        (item) => `                            <li class="flex items-start space-x-2">
                                <span class="text-orange-500 font-bold">•</span>
                                <span>${inlineHtml(item, definitions, usedTerms)}</span>
                            </li>`,
      )
      .join('\n');
    return `                    <div class="bg-slate-900/70 border border-slate-700 rounded-xl p-5 my-6 space-y-3">
                        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300">${heading}</h4>
                        <ul class="space-y-2 text-sm text-slate-300">
${items}
                        </ul>
                    </div>`;
  }
  if (block.type === 'tldr' && block.text) {
    return `                    <div class="bg-orange-500/10 border-l-4 border-orange-500 rounded-r-xl p-5 my-4">
                        <div class="text-xs font-bold uppercase tracking-wider text-orange-400 mb-2">TL;DR</div>
                        <p class="text-slate-200 font-medium leading-relaxed">${inlineHtml(block.text, definitions, usedTerms)}</p>
                    </div>`;
  }
  if (block.type === 'callout') {
    const pitfall = block.variant === 'pitfall';
    const accent = block.variant === 'accent';
    const boxClass = pitfall
      ? 'border-orange-500/40 bg-orange-500/10'
      : accent
        ? 'border-sky-400/30 bg-slate-900/60'
        : 'border-slate-700 bg-slate-900/80';
    const titleClass = pitfall ? 'text-orange-400' : 'text-charcoal-body';
    const title = block.title
      ? `                        <h4 class="text-sm font-bold ${titleClass} mb-2">${inlineHtml(block.title, definitions, usedTerms)}</h4>`
      : '';
    return `                    <div class="rounded-xl border ${boxClass} p-5 my-6">
${title}
                        <p class="text-slate-300 text-sm leading-relaxed m-0">${inlineHtml(block.text || '', definitions, usedTerms)}</p>
                    </div>`;
  }
  if (block.type === 'table' && block.headers?.length) {
    const head = block.headers
      .map(
        (h) =>
          `                                <th class="text-left text-xs uppercase tracking-wider text-sky-700 font-bold px-3 py-2 bg-sky-400/10 border-b border-slate-700">${inlineHtml(h, definitions, usedTerms)}</th>`,
      )
      .join('\n');
    const body = (block.rows || [])
      .map((row) => {
        const cells = block.headers!.map((_, i) => row[i] || '');
        return `                            <tr class="border-b border-slate-800">
${cells
  .map(
    (c) =>
      `                                <td class="px-3 py-2.5 text-sm text-slate-300 align-top">${inlineHtml(c, definitions, usedTerms)}</td>`,
  )
  .join('\n')}
                            </tr>`;
      })
      .join('\n');
    return `                    <div class="my-6 overflow-x-auto rounded-xl border border-slate-800">
                        <table class="w-full border-collapse">
                            <thead>
                                <tr>
${head}
                                </tr>
                            </thead>
                            <tbody>
${body}
                            </tbody>
                        </table>
                    </div>`;
  }
  if (block.type === 'list' && block.items?.length) {
    const items = block.items
      .map(
        (item) =>
          `                            <li>${inlineHtml(item, definitions, usedTerms)}</li>`,
      )
      .join('\n');
    return `                    <ul class="list-disc pl-5 my-4 space-y-2 text-slate-300">
${items}
                    </ul>`;
  }
  if (block.type === 'pullquote' && block.text) {
    return `                    <blockquote class="article-pullquote my-8 border-l-4 border-orange-500 pl-5 sm:pl-6 py-1${alignClass(block.align)}">
                        <p class="font-brand-display text-xl sm:text-2xl font-bold leading-snug text-charcoal-body tracking-tight">
                            ${inlineHtml(block.text, definitions, usedTerms)}
                        </p>
                    </blockquote>`;
  }
  return `                    <p${
    block.align && block.align !== 'left'
      ? ` class="${alignClass(block.align).trim()}"`
      : ''
  }>
                        ${inlineHtml(block.text || '', definitions, usedTerms)}
                    </p>`;
}

function renderSection(
  section: PreviewSection,
  _index: number,
  model: ArticlePreviewModel,
  usedTerms: Set<string>,
): string {
  const definitions = model.keyDefinitions;
  const headingTag = section.level === 2 ? 'h2' : 'h3';
  const headingClass =
    section.level === 2
      ? `text-2xl sm:text-3xl font-bold text-charcoal-body tracking-tight border-b border-slate-800 pb-2${alignClass(section.align)}`
      : `text-xl font-semibold text-charcoal-body mt-6${alignClass(section.align)}`;

  const blocks = section.blocks
    .map((block) => renderBlock(block, definitions, usedTerms))
    .join('\n\n');

  return `                <section id="${escapeHtml(section.id)}" class="space-y-4">
                    <${headingTag} class="${headingClass}">
                        ${escapeHtml(section.heading)}
                    </${headingTag}>
${blocks}
                </section>`;
}

function renderDefinitions(model: ArticlePreviewModel): string {
  if (!model.keyDefinitions.length) return '';
  const rows = model.keyDefinitions
    .map(
      (d) => `                        <div id="${termAnchorId(d.term)}" class="border-b border-slate-800 py-4 last:border-0 scroll-mt-24">
                            <dt class="font-bold text-sky-700">${escapeHtml(d.term)}</dt>
                            <dd class="text-slate-300 mt-1">${inlineHtml(d.definition)}</dd>
                        </div>`,
    )
    .join('\n');
  return `                <section id="key-definitions" class="space-y-4">
                    <h2 class="text-2xl sm:text-3xl font-bold text-charcoal-body tracking-tight border-b border-slate-800 pb-2">
                        Key definitions
                    </h2>
                    <dl class="bg-slate-900/80 border border-slate-800 rounded-xl px-5">
${rows}
                    </dl>
                </section>`;
}

function renderToolBanner(model: ArticlePreviewModel): string {
  if (!model.overrides.has('tool_embed_banner')) return '';
  return `                <aside class="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-700/80 rounded-2xl p-6 sm:p-8 my-8 shadow-xl">
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div>
                            <span class="text-xs uppercase tracking-widest text-orange-500 font-bold">Interactive Tool</span>
                            <h3 class="text-xl font-bold text-charcoal-body mt-1">Browse abcGEO tools</h3>
                            <p class="text-slate-400 text-sm mt-1">Pair this article with a live utility that demonstrates the same A + B triple.</p>
                        </div>
                        <a href="../tools.html" class="bg-sky-400 hover:bg-sky-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition shrink-0 shadow-lg shadow-sky-400/20">
                            Launch Tools →
                        </a>
                    </div>
                </aside>`;
}

function renderToc(model: ArticlePreviewModel): string {
  if (!model.overrides.has('toc_sidebar')) return '';
  const links = model.sections
    .filter((s) => s.level === 2)
    .map(
      (s, i) =>
        `                        <a href="#${escapeHtml(s.id)}" class="block hover:text-sky-700 transition">${i + 1}. ${escapeHtml(s.heading)}</a>`,
    )
    .join('\n');
  if (!links) return '';
  return `            <aside class="hidden lg:block mb-2">
                <div class="sticky top-24 space-y-4 text-xs">
                    <h3 class="text-slate-400 font-bold uppercase tracking-wider mb-3">On This Page</h3>
                    <nav class="space-y-2 border-l border-slate-800 pl-3 text-slate-400">
${links}
                    </nav>
                </div>
            </aside>`;
}

function renderFaqSchema(model: ArticlePreviewModel): string {
  if (!model.overrides.has('faq_schema') || !model.targetQuestion) return '';
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: model.targetQuestion,
        acceptedAnswer: {
          '@type': 'Answer',
          text: model.answerFirstSummary,
        },
      },
    ],
  };
  return `  <script type="application/ld+json">
  ${JSON.stringify(faq)}
  </script>`;
}

export interface PublishedArticleResult {
  html: string;
  filename: string;
  relativePath: string;
  canonical: string;
  title: string;
  description: string;
}

/** Build a complete static blog HTML page from an article brief. */
export function buildPublishedArticleHtml(
  brief: ArticleBriefInput,
  options?: {
    title?: string;
    createdAt?: string;
    updatedAt?: string;
  },
): PublishedArticleResult {
  const model = buildPreviewModel(brief, {
    title: options?.title,
    updatedAt: options?.updatedAt || options?.createdAt,
  });
  const slug = model.slug;
  const filename = `${slug}.html`;
  const relativePath = `blog/${filename}`;
  const canonical = `${SITE_WRITING_GUIDELINES.siteUrl}/${relativePath}`;
  const description = model.answerFirstSummary.slice(0, 160);
  const title = model.title;
  const published = isoDate(options?.createdAt);
  const modified = isoDate(options?.updatedAt || options?.createdAt);
  const year = new Date().getFullYear();

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: canonical,
    image: [`${SITE_WRITING_GUIDELINES.siteUrl}/assets/og-abcgeo.png`],
    headline: title,
    author: {
      '@type': 'Person',
      name: SITE_WRITING_GUIDELINES.author.name,
      url: SITE_WRITING_GUIDELINES.author.url,
    },
    publisher: {
      '@type': 'Organization',
      name: 'abcGEO',
      url: `${SITE_WRITING_GUIDELINES.siteUrl}/`,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_WRITING_GUIDELINES.siteUrl}/assets/favicon.svg`,
      },
    },
    datePublished: published,
    dateModified: modified,
    description,
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE_WRITING_GUIDELINES.siteUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${SITE_WRITING_GUIDELINES.siteUrl}/blog.html`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: title,
        item: canonical,
      },
    ],
  };

  const showProgress = model.overrides.has('reading_progress');
  const showExec = model.overrides.has('executive_answer_box');
  const showEquation = model.overrides.has('ab_equation_strip');

  // Link each key term only on first appearance across the whole article.
  const usedTerms = new Set<string>();
  const execBodyHtml = showExec
    ? inlineHtml(model.answerFirstSummary, model.keyDefinitions, usedTerms)
    : '';

  const sectionsHtml = model.sections.length
    ? model.sections
        .map((s, i) => renderSection(s, i, model, usedTerms))
        .join('\n\n')
    : `                <section class="space-y-4">
                    <p class="text-slate-400 italic">Body content was empty when this post was generated.</p>
                </section>`;

  const html = `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
<script type="text/javascript" data-cmp-ab="1" src="https://cdn.consentmanager.net/delivery/autoblocking/5add6cdca2e35.js" data-cmp-host="b.delivery.consentmanager.net" data-cmp-cdn="cdn.consentmanager.net" data-cmp-codesrc="16"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-PMLDXZ244T"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-PMLDXZ244T');
</script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="twitter:image" content="${SITE_WRITING_GUIDELINES.siteUrl}/assets/og-abcgeo.png" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:title" content="${escapeHtml(title)} | abcGEO" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta property="og:site_name" content="abcGEO" />
  <meta property="og:image" content="${SITE_WRITING_GUIDELINES.siteUrl}/assets/og-abcgeo.png" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)} | abcGEO" />
  <link rel="apple-touch-icon" href="../assets/favicon.svg" />
  <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml" />
  <link rel="canonical" href="${canonical}" />
  <meta name="description" content="${escapeHtml(description)}" />
    <title>${escapeHtml(title)} | abcGEO</title>
    <meta name="theme-color" content="#FF6B4A">
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
    <style>
      .font-brand-display { font-family: Syne, system-ui, sans-serif; }
      .font-brand-body { font-family: 'DM Sans', system-ui, sans-serif; }
      .font-brand-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
${KEY_TERM_CSS}
    </style>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'primary-electric': '#FF6B4A',
                        'secondary-slate': '#64748B',
                        'trust-blue': '#00B4D8',
                        'deep-slate': '#2D3748',
                        'ai-cyan': '#00B4D8',
                        'space-navy': '#1A202C',
                        'success-green': '#00C9A7',
                        'warning-amber': '#FF8C00',
                        'error-crimson': '#EF4444',
                        'charcoal-body': '#1A202C',
                        'text-muted': '#64748B',
                        'bg-clean-white': '#FFFFFF',
                        'bg-soft-gray': '#FAF9F6',
                        'bg-grid-gray': '#F4F7F6',
                        white: '#1A202C',
                        slate: {
                            100: '#1A202C',
                            200: '#2D3748',
                            300: '#4A5568',
                            400: '#64748B',
                            500: '#718096',
                            700: '#D1D9E0',
                            800: '#E8EEF2',
                            900: '#FFFFFF',
                            950: '#FAF9F6'
                        },
                        sky: { 300: '#00B4D8', 400: '#00B4D8', 500: '#0096C7', 700: '#00566B' },
                        orange: { 400: '#FF6B4A', 500: '#FF6B4A', 600: '#FF8C00' },
                        emerald: { 300: '#00C9A7', 400: '#00C9A7', 700: '#00594E' },
                        red: { 400: '#DC2626', 500: '#EF4444' }
                    }
                }
            }
        }
    </script>
    <script type="application/ld+json">
    ${JSON.stringify(articleLd, null, 2)}
    </script>
  <script type="application/ld+json">
  ${JSON.stringify(breadcrumbLd)}
  </script>
${renderFaqSchema(model)}
  <link rel="stylesheet" href="../css/author-sidebar.css" />
</head>
<body class="bg-bg-soft-gray text-charcoal-body font-sans antialiased min-h-screen flex flex-col justify-between">
${
  showProgress
    ? `
    <div class="fixed top-0 left-0 w-full h-1 bg-slate-800 z-50">
        <div class="h-full bg-gradient-to-r from-sky-400 via-orange-500 to-emerald-400 w-1/3"></div>
    </div>`
    : ''
}

    <header class="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="../index.html" class="flex items-center space-x-2">
                <span class="text-slate-400 font-light text-xl">abc</span>
                <span class="text-charcoal-body font-bold text-xl tracking-wide">GEO</span>
            </a>
            <nav class="hidden md:flex space-x-6 text-sm font-medium text-slate-300">
                <a href="../index.html" class="hover:text-sky-700 transition">Home</a>
                <a href="../framework.html" class="hover:text-sky-700 transition">Formula</a>
                <a href="../tools.html" class="hover:text-sky-700 transition">Tools</a>
                <a href="../templates.html" class="hover:text-sky-700 transition">Templates</a>
                <a href="../blog.html" class="text-sky-700">Blog</a>
                <a href="../link-building.html" class="hover:text-sky-700 transition">Collaborate</a>
                <a href="../contact.html" class="hover:text-sky-700 transition">Contact</a>
            </nav>
            <a href="../tools.html" class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-lg shadow-orange-500/20">
                Browse Tools
            </a>
        </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 py-10 flex-grow">
        <header class="max-w-3xl mx-auto mb-8">
            <div class="flex flex-wrap items-center gap-3 mb-4">
                <span class="bg-sky-400/10 border border-sky-400/20 text-sky-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    A+B=GEO Strategy
                </span>
                <span class="text-slate-500 text-xs">•</span>
                <span class="text-slate-400 text-xs font-medium">${model.readMinutes} min read</span>
                <span class="text-slate-500 text-xs">•</span>
                <span class="text-slate-400 text-xs font-medium">Updated ${escapeHtml(model.updatedLabel)}</span>
            </div>
            <h1 class="text-3xl sm:text-4xl md:text-5xl font-black text-charcoal-body tracking-tight leading-tight mb-4">
                ${escapeHtml(title)}
            </h1>
            <p class="text-base sm:text-lg text-slate-400 leading-relaxed">
                ${escapeHtml(model.deck)}
            </p>
        </header>
${
  showExec || showEquation
    ? `
        <section class="max-w-3xl mx-auto mb-12 space-y-4">
${
  showExec
    ? `            <div class="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-2 border-sky-400/40 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-sky-500/10">
                <div class="flex items-center space-x-2 mb-4 border-b border-slate-800/80 pb-4">
                    <span class="inline-block w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></span>
                    <h2 class="text-xs font-black uppercase tracking-widest text-sky-700">
                        Executive Answer / AI Quick Summary
                    </h2>
                </div>
                <h3 class="text-lg sm:text-xl font-extrabold text-charcoal-body mb-3">Target Question: <span class="text-sky-700">${escapeHtml(model.targetQuestion)}</span></h3>
                <p class="text-slate-200 font-medium text-base sm:text-lg leading-relaxed">
                    ${execBodyHtml}
                </p>
            </div>`
    : ''
}
${
  showEquation
    ? `            <div class="flex items-center justify-center sm:justify-start">
                <div class="text-xs font-mono bg-slate-900 border border-slate-700/80 px-4 py-2 rounded-xl text-slate-300 flex items-center gap-2 flex-wrap shadow-md">
                    <span class="text-slate-500 font-bold">Article formula</span>
                    <span class="text-slate-500">→</span>
                    <span class="text-sky-700 font-bold">Entity (A)</span>
                    <span class="text-slate-500">+</span>
                    <span class="text-orange-400 font-bold">Verb (B)</span>
                    <span class="text-slate-500">=</span>
                    <span class="text-emerald-700 font-bold">GEO Result</span>
                </div>
            </div>`
    : ''
}
        </section>`
    : ''
}

        <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 max-w-6xl mx-auto items-start">
            <div class="min-w-0 space-y-10">
${renderToc(model)}
            <article class="space-y-10 text-slate-300 text-base sm:text-lg leading-relaxed">
${sectionsHtml}

${renderToolBanner(model)}

${renderDefinitions(model)}
            </article>
            </div>

            <aside class="author-sidebar" aria-labelledby="author-sidebar-heading">
              <div class="author-sidebar__inner">
                <p class="author-sidebar__eyebrow">About the Author</p>
                <img
                  class="author-sidebar__photo"
                  src="../images/kayla-lafleur.jpg"
                  alt="Kayla LaFleur, Founder and Author, seated at a desk in a professional office setting."
                  width="116"
                  height="116"
                />
                <h2 id="author-sidebar-heading" class="author-sidebar__name">Kayla LaFleur</h2>
                <p class="author-sidebar__role">GEO &amp; SEO Specialist</p>
                <div class="author-sidebar__block">
                  <h3 class="author-sidebar__block-title">Key Frameworks:</h3>
                  <ul>
                    <li>Creator of the A+B=GEO Formula</li>
                    <li>Extractable RAG Authority Architecture</li>
                    <li>Conversion-driven Technical Schema</li>
                  </ul>
                </div>
                <div class="author-sidebar__block">
                  <h3 class="author-sidebar__block-title">Knows About:</h3>
                  <ul>
                    <li>Technical SEO &amp; GEO Strategy</li>
                    <li>Generative Engine Optimization</li>
                    <li>Schema.org Structured Data</li>
                  </ul>
                </div>
                <a class="author-sidebar__cta" href="../author/kayla-lafleur.html">Read full bio &amp; connect</a>
              </div>
            </aside>
        </div>
    </main>

    <footer class="border-t border-slate-800 bg-slate-950 py-8 mt-16 text-center text-xs text-slate-500">
        <p>&copy; ${year} abcGEO. All rights reserved. Pioneering Generative Engine Optimization.</p>
    </footer>
</body>
</html>
`;

  return { html, filename, relativePath, canonical, title, description };
}

export function buildBlogIndexCard(input: {
  title: string;
  slug: string;
  description: string;
}): string {
  const href = `blog/${input.slug}.html`;
  const desc = escapeHtml(input.description.slice(0, 180));
  return `          <article class="post-card reveal">
            <span class="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5M8 17h6"/></svg>
            </span>
            <span class="kicker">GEO</span>
            <h3><a href="${href}">${escapeHtml(input.title)}</a></h3>
            <p>${desc}</p>
            <a class="read-link" href="${href}">Read article →</a>
          </article>
`;
}
