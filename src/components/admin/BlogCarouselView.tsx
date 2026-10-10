'use client';

import { useState } from 'react';
import type { CarouselSlide } from '@/lib/article-brief/carousel';
import { toPreviewImageSrc } from '@/lib/article-brief/image-paths';
import { renderInlineMarkup } from '@/lib/article-brief/preview-model';
import type { KeyDefinition } from '@/lib/article-brief/schema';

interface BlogCarouselViewProps {
  slides: CarouselSlide[];
  definitions?: KeyDefinition[];
  usedTerms?: Set<string>;
}

export default function BlogCarouselView({
  slides,
  definitions = [],
  usedTerms,
}: BlogCarouselViewProps) {
  const [index, setIndex] = useState(0);
  const total = slides.length;
  if (!total) return null;
  const active = ((index % total) + total) % total;

  return (
    <div className="blog-carousel" data-blog-carousel>
      <div className="blog-carousel__chrome">
        <p className="blog-carousel__label">
          Slide {active + 1} of {total}
        </p>
      </div>
      <div
        className="blog-carousel__viewport"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            setIndex((n) => n - 1);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            setIndex((n) => n + 1);
          }
        }}
      >
        {slides.map((slide, i) => (
          <article
            key={i}
            className={`blog-carousel__slide${i === active ? ' is-active' : ''}`}
            aria-hidden={i === active ? undefined : true}
          >
            <p className="blog-carousel__kicker">Slide {i + 1}</p>
            <h3
              className="blog-carousel__title"
              dangerouslySetInnerHTML={{
                __html: renderInlineMarkup(slide.title, definitions, usedTerms),
              }}
            />
            {slide.body ? (
              <p
                className="blog-carousel__body"
                dangerouslySetInnerHTML={{
                  __html: renderInlineMarkup(slide.body, definitions, usedTerms),
                }}
              />
            ) : null}
            {slide.src ? (
              <figure className="blog-carousel__figure">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toPreviewImageSrc(slide.src)}
                  alt={slide.alt || slide.title || 'Slide image'}
                />
                {slide.caption ? <figcaption>{slide.caption}</figcaption> : null}
              </figure>
            ) : null}
          </article>
        ))}
      </div>
      <div className="blog-carousel__controls">
        <button
          type="button"
          className="blog-carousel__nav"
          onClick={() => setIndex((n) => n - 1)}
        >
          Previous
        </button>
        <div className="blog-carousel__dots">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`blog-carousel__dot${i === active ? ' is-active' : ''}`}
              aria-label={`Show slide ${i + 1}`}
              aria-selected={i === active}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="blog-carousel__nav"
          onClick={() => setIndex((n) => n + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
