/* ============================================================================
   abcGEO — UI layer behaviour
   Each widget is self-contained and feature-detects its own markup, so this
   file is safe to include on every page.
     · reveal stagger      [data-reveal-group]
     · sticky header state .site-header
     · live filter bar     [data-filter] → [data-filter-target]
     · quick-tool launcher [data-quick-launcher]
   ========================================================================== */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Reveal stagger --------------------------------------------------- */
  /* js/main.js owns the IntersectionObserver that adds `.visible`; here we
     only pre-assign the per-item delay so groups cascade in. */
  function initRevealStagger() {
    if (reduceMotion) return;
    document.querySelectorAll('[data-reveal-group]').forEach((group) => {
      const step = parseInt(group.dataset.revealGroup, 10) || 80;
      group.querySelectorAll(':scope > .reveal').forEach((el, i) => {
        el.style.transitionDelay = `${Math.min(i * step, 480)}ms`;
      });
    });
  }

  /* --- Sticky header state ---------------------------------------------- */
  function initHeaderState() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const sync = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
    sync();
    window.addEventListener('scroll', sync, { passive: true });
  }

  /* --- Live search / quick filter --------------------------------------- */
  function initFilter(bar) {
    const name = bar.dataset.filter;
    const target = document.querySelector(`[data-filter-target="${name}"]`);
    if (!target) return;

    const input = bar.querySelector('[data-filter-input]');
    const status = bar.querySelector('[data-filter-status]');
    const chips = Array.from(bar.querySelectorAll('[data-filter-tag]'));
    const empty = document.querySelector(`[data-filter-empty="${name}"]`);
    const items = Array.from(target.querySelectorAll('[data-filter-item]'));

    let tag = 'all';

    const haystack = (el) =>
      `${el.dataset.filterTags || ''} ${el.textContent || ''}`.toLowerCase();

    function apply() {
      const q = (input ? input.value : '').trim().toLowerCase();
      let shown = 0;

      items.forEach((el) => {
        const tags = (el.dataset.filterTags || '').split(/\s+/);
        const matchesTag = tag === 'all' || tags.includes(tag);
        const matchesText = !q || haystack(el).includes(q);
        const visible = matchesTag && matchesText;
        el.classList.toggle('is-filtered-out', !visible);
        if (visible) shown += 1;
      });

      if (status) {
        status.textContent = shown === items.length
          ? `${items.length} ${items.length === 1 ? 'result' : 'results'}`
          : `${shown} of ${items.length}`;
      }
      if (empty) empty.hidden = shown !== 0;
    }

    if (input) {
      input.addEventListener('input', apply);
      input.addEventListener('search', apply);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { input.value = ''; apply(); }
      });
    }

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        tag = chip.dataset.filterTag;
        chips.forEach((c) => {
          const active = c === chip;
          c.classList.toggle('is-active', active);
          c.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        apply();
      });
    });

    apply();
  }

  /* --- Floating quick-tool launcher ------------------------------------- */
  function initQuickLauncher() {
    const root = document.querySelector('[data-quick-launcher]');
    if (!root) return;

    const toggle = root.querySelector('[data-ql-toggle]');
    const panel = root.querySelector('[data-ql-panel]');
    if (!toggle || !panel) return;

    function setOpen(open) {
      root.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    setOpen(false);

    toggle.addEventListener('click', () => {
      setOpen(!root.classList.contains('is-open'));
    });

    document.addEventListener('click', (e) => {
      if (!root.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && root.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Surfaces once the hero is behind the reader, so it never covers the
    // primary CTA that is already on screen.
    const trigger = document.querySelector('[data-ql-after]') || document.querySelector('.hero');
    function sync() {
      const past = trigger
        ? trigger.getBoundingClientRect().bottom < 80
        : window.scrollY > 400;
      root.classList.toggle('is-visible', past);
      if (!past) setOpen(false);
    }
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync, { passive: true });
  }

  function init() {
    initRevealStagger();
    initHeaderState();
    document.querySelectorAll('[data-filter]').forEach(initFilter);
    initQuickLauncher();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
