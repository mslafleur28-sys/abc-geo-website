/**
 * Controls for editorial blog carousels ([data-blog-carousel]).
 * Slide copy stays in the HTML so crawlers can read every slide.
 */
(function () {
  const SWIPE_THRESHOLD = 48;

  function initCarousel(root) {
    const slides = Array.from(root.querySelectorAll('[data-carousel-slide]'));
    const dots = Array.from(root.querySelectorAll('[data-carousel-dot]'));
    const prevBtn = root.querySelector('[data-carousel-prev]');
    const nextBtn = root.querySelector('[data-carousel-next]');
    const stepLabel = root.querySelector('[data-carousel-step-label]');
    const viewport = root.querySelector('[data-carousel-viewport]');
    if (!slides.length) return;

    let index = Math.max(
      0,
      slides.findIndex((slide) => slide.classList.contains('is-active')),
    );
    if (index < 0) index = 0;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchActive = false;

    function goTo(nextIndex) {
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
      });

      if (stepLabel) {
        stepLabel.textContent = `Slide ${index + 1} of ${total}`;
      }
    }

    prevBtn?.addEventListener('click', () => goTo(index - 1));
    nextBtn?.addEventListener('click', () => goTo(index + 1));

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const target = Number(dot.getAttribute('data-slide-to'));
        if (!Number.isNaN(target)) goTo(target);
      });
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
      { passive: true },
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
      { passive: true },
    );

    swipeTarget.addEventListener('touchcancel', () => {
      touchActive = false;
    });

    goTo(index);
  }

  function boot() {
    document.querySelectorAll('[data-blog-carousel]').forEach(initCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
