/**
 * abcGEO · GeoAuditCarousel
 * Interactive controls for the RAG-readable GEO audit carousel.
 * Expects markup from components/GeoAuditCarousel.html
 * ([data-geo-audit-carousel] root with slides, dots, prev/next, copy).
 */
(function () {
  const SWIPE_THRESHOLD = 48;

  function plainTextFromSlide(slide) {
    if (!slide) return '';
    const clone = slide.cloneNode(true);
    clone.querySelectorAll('script, style').forEach((el) => el.remove());
    return (clone.innerText || clone.textContent || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function initCarousel(root) {
    const slides = Array.from(root.querySelectorAll('[data-carousel-slide]'));
    const dots = Array.from(root.querySelectorAll('[data-carousel-dot]'));
    const prevBtn = root.querySelector('[data-carousel-prev]');
    const nextBtn = root.querySelector('[data-carousel-next]');
    const copyBtn = root.querySelector('[data-carousel-copy]');
    const stepLabel = root.querySelector('[data-carousel-step-label]');
    const viewport = root.querySelector('[data-carousel-viewport]');
    if (!slides.length) return;

    let index = Math.max(
      0,
      slides.findIndex((slide) => slide.classList.contains('is-active'))
    );
    if (index < 0) index = 0;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchActive = false;

    function goTo(nextIndex, { focusDot } = {}) {
      const total = slides.length;
      index = ((nextIndex % total) + total) % total;

      slides.forEach((slide, i) => {
        const active = i === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      });

      dots.forEach((dot, i) => {
        const active = i === index;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-selected', active ? 'true' : 'false');
        if (active && focusDot) dot.focus();
      });

      if (stepLabel) {
        stepLabel.textContent = `Slide ${index + 1} of ${total}`;
      }

      if (prevBtn) {
        const prevId = slides[(index - 1 + total) % total]?.id;
        if (prevId) prevBtn.setAttribute('aria-controls', prevId);
      }
      if (nextBtn) {
        const nextId = slides[(index + 1) % total]?.id;
        if (nextId) nextBtn.setAttribute('aria-controls', nextId);
      }

      root.dispatchEvent(
        new CustomEvent('geo-audit-carousel:change', {
          detail: { index, total },
          bubbles: true,
        })
      );
    }

    prevBtn?.addEventListener('click', () => goTo(index - 1));
    nextBtn?.addEventListener('click', () => goTo(index + 1));

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const target = Number(dot.dataset.slideTo);
        if (!Number.isNaN(target)) goTo(target);
      });
    });

    copyBtn?.addEventListener('click', async () => {
      const text = plainTextFromSlide(slides[index]);
      const original = copyBtn.textContent;
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Copied';
        copyBtn.classList.add('is-copied');
      } catch {
        copyBtn.textContent = 'Copy failed';
      }
      window.setTimeout(() => {
        copyBtn.textContent = original || 'Copy Slide Text';
        copyBtn.classList.remove('is-copied');
      }, 1600);
    });

    viewport?.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(index - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(index + 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        goTo(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        goTo(slides.length - 1);
      }
    });

    const swipeTarget = viewport || root;

    swipeTarget.addEventListener(
      'touchstart',
      (event) => {
        if (event.touches.length !== 1) return;
        touchActive = true;
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
      },
      { passive: true }
    );

    swipeTarget.addEventListener(
      'touchend',
      (event) => {
        if (!touchActive || !event.changedTouches.length) return;
        touchActive = false;
        const dx = event.changedTouches[0].clientX - touchStartX;
        const dy = event.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0) goTo(index + 1);
        else goTo(index - 1);
      },
      { passive: true }
    );

    swipeTarget.addEventListener('touchcancel', () => {
      touchActive = false;
    });

    goTo(index);
  }

  function boot() {
    document.querySelectorAll('[data-geo-audit-carousel]').forEach(initCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.abcGEO = window.abcGEO || {};
  window.abcGEO.initGeoAuditCarousel = boot;
})();
