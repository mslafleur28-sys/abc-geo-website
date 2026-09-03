import type { ArticleBriefInput } from '@/lib/article-brief';
import { toPreviewImageSrc } from '@/lib/article-brief/image-paths';
import { termAnchorId } from '@/lib/article-brief/key-terms';
import {
  buildPreviewModel,
  renderInlineMarkup,
} from '@/lib/article-brief/preview-model';

interface ArticleDraftPreviewProps {
  brief: ArticleBriefInput;
  title?: string;
  updatedAt?: string;
  /** Show draft-only layout notes as a callout */
  showLayoutNotes?: boolean;
}

export default function ArticleDraftPreview({
  brief,
  title,
  updatedAt,
  showLayoutNotes = true,
}: ArticleDraftPreviewProps) {
  const model = buildPreviewModel(brief, { title, updatedAt });
  const definitions = model.keyDefinitions;
  // Shared across the preview so each key term links only once (first appearance).
  const usedKeyTerms = new Set<string>();
  const showExec = model.overrides.has('executive_answer_box');
  const showEquation = model.overrides.has('ab_equation_strip');
  const showToc = model.overrides.has('toc_sidebar');
  const showProgress = model.overrides.has('reading_progress');
  const showCallouts = model.overrides.has('callout_blocks');
  const showToolBanner = model.overrides.has('tool_embed_banner');

  return (
    <div className="preview-shell">
      {showProgress ? (
        <div className="preview-progress" aria-hidden="true">
          <div className="preview-progress__bar" />
        </div>
      ) : null}

      <header className="preview-topnav">
        <div className="preview-topnav__inner">
          <span className="preview-brand">
            abc<span>GEO</span>
          </span>
          <span className="preview-topnav__badge">Article preview</span>
        </div>
      </header>

      <main className="preview-main">
        <header className="preview-hero">
          <div className="preview-meta">
            <span className="preview-pill">A+B=GEO Strategy</span>
            <span className="preview-dot">•</span>
            <span>{model.readMinutes} min read</span>
            <span className="preview-dot">•</span>
            <span>Updated {model.updatedLabel}</span>
          </div>
          <h1 className="preview-title">{model.title}</h1>
          <p className="preview-deck">{model.deck}</p>
        </header>

        {showExec || showEquation ? (
          <section className="preview-answer-wrap">
            {showExec ? (
              <div className="preview-exec">
                <div className="preview-exec__label">
                  <span className="preview-exec__pulse" aria-hidden="true" />
                  Executive Answer / AI Quick Summary
                </div>
                {model.targetQuestion ? (
                  <h2 className="preview-exec__question">
                    Target Question:{' '}
                    <span>{model.targetQuestion}</span>
                  </h2>
                ) : null}
                <p
                  className="preview-exec__body"
                  dangerouslySetInnerHTML={{
                    __html: renderInlineMarkup(
                      model.answerFirstSummary,
                      definitions,
                      usedKeyTerms,
                    ),
                  }}
                />
              </div>
            ) : null}

            {showEquation ? (
              <div className="preview-equation" aria-label="A plus B equals GEO">
                <span className="preview-equation__muted">Article formula</span>
                <span className="preview-equation__muted">→</span>
                <span className="text-abby-sky-ink font-bold">Entity (A)</span>
                <span className="preview-equation__muted">+</span>
                <span className="font-bold text-abby-coral">Verb (B)</span>
                <span className="preview-equation__muted">=</span>
                <span className="font-bold text-emerald-800">GEO Result</span>
              </div>
            ) : null}
          </section>
        ) : null}

        <div
          className={
            showToc
              ? 'preview-grid preview-grid--toc'
              : 'preview-grid'
          }
        >
          <div className="preview-content-col">
            {showToc && model.sections.length > 0 ? (
              <aside className="preview-toc" aria-label="On this page">
                <h3>On This Page</h3>
                <nav>
                  {model.sections
                    .filter((s) => s.level === 2)
                    .map((section, i) => (
                      <a key={section.id} href={`#${section.id}`}>
                        {i + 1}. {section.heading}
                      </a>
                    ))}
                </nav>
              </aside>
            ) : null}

            <article className="preview-article">
              {model.sections.length === 0 ? (
                <p className="preview-empty">
                  Add raw body content to preview article sections.
                </p>
              ) : (
                model.sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    className="preview-section"
                  >
                    {section.level === 2 ? (
                      <h2
                        className={
                          section.align === 'center'
                            ? 'text-center'
                            : section.align === 'right'
                              ? 'text-right'
                              : undefined
                        }
                      >
                        {section.heading}
                      </h2>
                    ) : (
                      <h3
                        className={
                          section.align === 'center'
                            ? 'text-center'
                            : section.align === 'right'
                              ? 'text-right'
                              : undefined
                        }
                      >
                        {section.heading}
                      </h3>
                    )}

                    {section.blocks.map((block, bi) => {
                      if (block.type === 'image' && block.src) {
                        return (
                          <figure key={bi} className="preview-figure">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={toPreviewImageSrc(block.src)}
                              alt={block.alt || ''}
                              loading="lazy"
                            />
                            {block.caption ? (
                              <figcaption>{block.caption}</figcaption>
                            ) : null}
                          </figure>
                        );
                      }
                      if (block.type === 'answer-first' && block.text) {
                        return (
                          <div key={bi} className="preview-answer-first">
                            <div className="preview-answer-first__label">
                              Answer-first
                            </div>
                            <p
                              dangerouslySetInnerHTML={{
                                __html: renderInlineMarkup(
                                  block.text,
                                  definitions,
                                  usedKeyTerms,
                                ),
                              }}
                            />
                          </div>
                        );
                      }
                      if (block.type === 'at-a-glance' && block.items) {
                        return (
                          <div key={bi} className="preview-at-a-glance">
                            <h4 className="preview-at-a-glance__label">
                              {block.title?.trim() || 'At a glance'}
                            </h4>
                            <ul className="preview-glance-list">
                              {block.items.map((item, ii) => (
                                <li key={ii}>
                                  <span className="preview-glance-list__mark">
                                    •
                                  </span>
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: renderInlineMarkup(
                                        item,
                                        definitions,
                                        usedKeyTerms,
                                      ),
                                    }}
                                  />
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      }
                      if (block.type === 'tldr' && block.text) {
                        return (
                          <div key={bi} className="preview-tldr">
                            <div className="preview-tldr__label">TL;DR</div>
                            <p
                              dangerouslySetInnerHTML={{
                                __html: renderInlineMarkup(
                                  block.text,
                                  definitions,
                                  usedKeyTerms,
                                ),
                              }}
                            />
                          </div>
                        );
                      }
                      if (block.type === 'callout') {
                        return (
                          <aside
                            key={bi}
                            className={`preview-body-callout preview-body-callout--${block.variant || 'tip'}`}
                          >
                            {block.title ? (
                              <h4
                                dangerouslySetInnerHTML={{
                                  __html: renderInlineMarkup(
                                    block.title,
                                    definitions,
                                    usedKeyTerms,
                                  ),
                                }}
                              />
                            ) : null}
                            <p
                              dangerouslySetInnerHTML={{
                                __html: renderInlineMarkup(
                                  block.text || '',
                                  definitions,
                                  usedKeyTerms,
                                ),
                              }}
                            />
                          </aside>
                        );
                      }
                      if (block.type === 'table' && block.headers) {
                        return (
                          <div key={bi} className="preview-table-wrap">
                            <table className="preview-data-table">
                              <thead>
                                <tr>
                                  {block.headers.map((h, hi) => (
                                    <th
                                      key={hi}
                                      dangerouslySetInnerHTML={{
                                        __html: renderInlineMarkup(
                                          h,
                                          definitions,
                                          usedKeyTerms,
                                        ),
                                      }}
                                    />
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {(block.rows || []).map((row, ri) => (
                                  <tr key={ri}>
                                    {block.headers!.map((_, ci) => (
                                      <td
                                        key={ci}
                                        dangerouslySetInnerHTML={{
                                          __html: renderInlineMarkup(
                                            row[ci] || '',
                                            definitions,
                                            usedKeyTerms,
                                          ),
                                        }}
                                      />
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      }
                      if (block.type === 'takeaways' && block.items) {
                        return (
                          <div key={bi} className="preview-takeaways">
                            <h4 className="preview-takeaways__label">
                              Key Takeaways
                            </h4>
                            <ul className="preview-list">
                              {block.items.map((item, ii) => (
                                <li key={ii}>
                                  <span className="preview-list__mark">✓</span>
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: renderInlineMarkup(
                                        item,
                                        definitions,
                                        usedKeyTerms,
                                      ),
                                    }}
                                  />
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      }
                      if (block.type === 'list' && block.items) {
                        return (
                          <ul key={bi} className="preview-plain-list">
                            {block.items.map((item, ii) => (
                              <li
                                key={ii}
                                dangerouslySetInnerHTML={{
                                  __html: renderInlineMarkup(
                                    item,
                                    definitions,
                                    usedKeyTerms,
                                  ),
                                }}
                              />
                            ))}
                          </ul>
                        );
                      }
                      if (block.type === 'pullquote' && block.text) {
                        return (
                          <blockquote
                            key={bi}
                            className={`preview-pullquote${
                              block.align === 'center'
                                ? ' text-center'
                                : block.align === 'right'
                                  ? ' text-right'
                                  : ''
                            }`}
                          >
                            <p
                              dangerouslySetInnerHTML={{
                                __html: renderInlineMarkup(
                                  block.text,
                                  definitions,
                                  usedKeyTerms,
                                ),
                              }}
                            />
                          </blockquote>
                        );
                      }
                      return (
                        <p
                          key={bi}
                          className={
                            block.align === 'center'
                              ? 'text-center'
                              : block.align === 'right'
                                ? 'text-right'
                                : undefined
                          }
                          dangerouslySetInnerHTML={{
                            __html: renderInlineMarkup(
                              block.text || '',
                              definitions,
                              usedKeyTerms,
                            ),
                          }}
                        />
                      );
                    })}
                  </section>
                ))
              )}

              {showToolBanner ? (
                <aside className="preview-tool">
                  <div>
                    <span className="preview-tool__eyebrow">Interactive Tool</span>
                    <h3>Try a related abcGEO tool</h3>
                    <p>
                      Link a live utility that demonstrates the same A + B
                      triple once this draft is published.
                    </p>
                  </div>
                  <span className="preview-tool__cta">Launch Tool →</span>
                </aside>
              ) : null}

              {definitions.length > 0 ? (
                <section className="preview-definitions" id="key-definitions">
                  <h2>Key definitions</h2>
                  <dl>
                    {definitions.map((d) => (
                      <div
                        key={d.term}
                        id={termAnchorId(d.term)}
                        className="preview-definitions__row"
                      >
                        <dt>{d.term}</dt>
                        <dd
                          dangerouslySetInnerHTML={{
                            __html: renderInlineMarkup(d.definition),
                          }}
                        />
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              {showLayoutNotes && model.stylisticNotes ? (
                <aside
                  className={
                    showCallouts ? 'preview-callout' : 'preview-notes'
                  }
                  aria-label="Layout notes"
                >
                  <h4>
                    {showCallouts ? 'Callout / layout note' : 'Layout notes (editor only)'}
                  </h4>
                  <p>{model.stylisticNotes}</p>
                </aside>
              ) : null}
            </article>
          </div>

          <aside className="preview-author" aria-label="About the author">
            <p className="preview-author__eyebrow">About the Author</p>
            <div className="preview-author__avatar" aria-hidden="true">
              KL
            </div>
            <h2 className="preview-author__name">Kayla LaFleur</h2>
            <p className="preview-author__role">GEO &amp; SEO Specialist</p>
            <div className="preview-author__block">
              <h3>Key Frameworks</h3>
              <ul>
                <li>Creator of the A+B=GEO Formula</li>
                <li>Extractable RAG Authority Architecture</li>
                <li>Conversion-driven Technical Schema</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>

      <footer className="preview-footer">
        <p>
          Preview only — final HTML will live at{' '}
          <code>blog/{model.slug || 'your-slug'}.html</code>
        </p>
      </footer>
    </div>
  );
}
