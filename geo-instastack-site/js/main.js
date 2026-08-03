/* abcGEO — shared interactions */
(function () {
  /** Semantic design tokens — mirrors css/styles.css :root for dynamic JS use.
   *  Values ending in `Ink` are the contrast-safe (AAA) text variants of the
   *  vibrant fills above them. */
  const designTokens = {
    // Primary accent — electric amber / coral
    coral: '#FF6B4A',
    coralDeep: '#E8502B',
    amber: '#FF8C00',
    amberHi: '#FFA033',
    warmInk: '#8F2F10',

    // Secondary accent — vibrant cyan / teal
    teal: '#00C9A7',
    tealHi: '#2BDCC0',
    cyan: '#00B4D8',
    tealInk: '#00564C',
    cyanInk: '#0A5A72',

    // Text — soft dark slate
    ink: '#1A202C',
    inkSoft: '#2D3748',
    inkMuted: '#455063',
    inkOnFill: '#141A23',

    // Surfaces — warm off-whites, crisp white cards
    cream: '#FAF9F6',
    creamAlt: '#F4F7F6',
    white: '#FFFFFF',

    // Status
    successGreen: '#0F7B4F',
    warningAmber: '#8A5200',
    errorCrimson: '#C2261B',

    segments: {
      seo: { surface: '#F4F7F6', onSurface: '#1A202C', accent: '#0A5A72', fill: '#00B4D8' },
      geo: { surface: '#FAF9F6', onSurface: '#1A202C', accent: '#00564C', fill: '#00C9A7' },
      blog: { surface: '#FFFFFF', onSurface: '#1A202C', accent: '#8F2F10', fill: '#FF6B4A' },
    },
  };

  window.abcGEO = window.abcGEO || {};
  window.abcGEO.designTokens = designTokens;

  const toggle = document.querySelector('[data-nav-toggle]');
  const links = document.querySelector('[data-nav-links]');

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    links.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Reveal on scroll
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('visible'));
  }

  // A + B = GEO live calculator
  const entityInput = document.querySelector('[data-entity]');
  const verbSelect = document.querySelector('[data-verb]');
  const outputEl = document.querySelector('[data-geo-output]');
  const citeEl = document.querySelector('[data-geo-cite]');

  function renderFormula() {
    if (!entityInput || !verbSelect || !outputEl) return;
    const entity = (entityInput.value || 'INSTASTACK').trim() || 'INSTASTACK';
    const verb = verbSelect.value || 'Generates';
    const snippet = `${entity} ${verb.toLowerCase()} machine-readable, citation-ready GEO output that AI answer engines can extract and attribute.`;
    outputEl.textContent = snippet;
    if (citeEl) {
      citeEl.textContent = `AI-citable form: ${entity} → ${verb} → GEO`;
    }
    outputEl.closest('.geo-output')?.classList.remove('flash');
    // retrigger animation
    void outputEl.offsetWidth;
    outputEl.closest('.geo-output')?.classList.add('flash');
  }

  if (entityInput && verbSelect) {
    entityInput.addEventListener('input', renderFormula);
    verbSelect.addEventListener('change', renderFormula);
    renderFormula();
  }

  // INSTASTACK lives in js/instastack.js on tools/instastack.html
})();
