/* abcGEO — shared interactions */
(function () {
  const designTokens = {
    primaryCoral: '#FF6B4A',
    hoverAmber: '#FF8C00',
    aiCyan: '#00B4D8',
    cyanInk: '#00566B',
    successTeal: '#00C9A7',
    tealInk: '#00594E',
    errorCrimson: '#EF4444',
    charcoalBody: '#1A202C',
    deepSlate: '#2D3748',
    textMuted: '#64748B',
    bgCream: '#FAF9F6',
    bgSoft: '#F4F7F6',
    bgCleanWhite: '#FFFFFF',
    border: 'rgba(45, 55, 72, 0.12)',
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

  // Typewriter brand mark
  const typer = document.querySelector('[data-typewriter]');
  const typeOut = typer?.querySelector('[data-type-out]');

  if (typer && typeOut) {
    const full = typer.dataset.typewriter || 'abc GEO';
    const splitAt = Number(typer.dataset.typeSplit) || full.length;
    const head = document.createElement('span');
    const tail = document.createElement('span');
    tail.className = 'geo';
    typeOut.append(head, tail);

    const render = (count) => {
      head.textContent = full.slice(0, Math.min(count, splitAt));
      tail.textContent = count > splitAt ? full.slice(splitAt, count) : '';
    };

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      render(full.length);
      typer.classList.add('is-done');
    } else {
      let typed = 0;
      const step = () => {
        typed += 1;
        render(typed);
        if (typed < full.length) {
          setTimeout(step, 130);
        } else {
          typer.classList.add('is-done');
        }
      };
      setTimeout(step, 450);
    }
  }

  // Contact form (no backend — confirm locally)
  const contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    const status = contactForm.querySelector('[data-contact-status]');
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = contactForm.querySelector('#contact-name')?.value?.trim() || 'there';
      if (status) {
        status.textContent = `Thanks, ${name} — your message is ready to send. Email hello@abcgeo.com to reach us directly.`;
      }
      contactForm.reset();
    });
  }

  // Pitch / link-building intake form with front-end validation
  const pitchForm = document.querySelector('[data-pitch-form]');
  if (pitchForm) {
    const status = pitchForm.querySelector('[data-pitch-status]');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const clearErrors = () => {
      pitchForm.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
      pitchForm.querySelectorAll('[data-error-for]').forEach((el) => {
        el.hidden = true;
        el.textContent = '';
      });
      if (status) {
        status.textContent = '';
        status.classList.remove('is-error');
      }
    };

    const setError = (name, message) => {
      const field = pitchForm.elements.namedItem(name);
      const errorEl = pitchForm.querySelector(`[data-error-for="${name}"]`);
      if (field && 'classList' in field) field.classList.add('is-invalid');
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.hidden = false;
      }
    };

    const normalizeUrl = (value) => {
      const trimmed = value.trim();
      if (!trimmed) return '';
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      return `https://${trimmed}`;
    };

    pitchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearErrors();

      const name = pitchForm.querySelector('#pitch-name')?.value?.trim() || '';
      const email = pitchForm.querySelector('#pitch-email')?.value?.trim() || '';
      const websiteRaw = pitchForm.querySelector('#pitch-website')?.value?.trim() || '';
      const website = normalizeUrl(websiteRaw);
      const service = pitchForm.querySelector('#pitch-service')?.value || '';
      const budget = pitchForm.querySelector('#pitch-budget')?.value?.trim() || '';
      const brief = pitchForm.querySelector('#pitch-brief')?.value?.trim() || '';

      let valid = true;

      if (name.length < 2) {
        setError('name', 'Please enter your name.');
        valid = false;
      }
      if (!emailPattern.test(email)) {
        setError('email', 'Enter a valid email address.');
        valid = false;
      }
      try {
        const parsed = new URL(website);
        if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) {
          throw new Error('invalid');
        }
        const websiteInput = pitchForm.querySelector('#pitch-website');
        if (websiteInput) websiteInput.value = parsed.href;
      } catch {
        setError('website', 'Enter a valid website URL (e.g. https://yoursite.com).');
        valid = false;
      }
      if (!service) {
        setError('service', 'Select a service interest.');
        valid = false;
      }
      if (budget.length < 2) {
        setError('budget', 'Share an approximate monthly budget.');
        valid = false;
      }
      if (brief.length < 20) {
        setError('brief', 'Add a short project brief (at least a couple of sentences).');
        valid = false;
      }

      if (!valid) {
        if (status) {
          status.textContent = 'Please fix the highlighted fields and try again.';
          status.classList.add('is-error');
        }
        pitchForm.querySelector('.is-invalid')?.focus();
        return;
      }

      if (status) {
        status.textContent = `Thanks, ${name} — your brief is ready. Email hello@abcgeo.com with these details to start the collaboration.`;
      }
      pitchForm.reset();
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

  // INSTASTACK generator
  const generateBtn = document.querySelector('[data-generate-stack]');
  const copyBtn = document.querySelector('[data-copy-stack]');
  const stackOut = document.querySelector('[data-stack-output]');

  function buildStackConfig() {
    const checked = Array.from(document.querySelectorAll('[data-stack-opt]:checked')).map(
      (el) => el.value
    );
    const project = document.querySelector('[data-stack-name]')?.value?.trim() || 'my-geo-project';
    const mode = document.querySelector('[data-stack-mode]')?.value || 'standard';

    const config = {
      entity: 'INSTASTACK',
      transitiveVerb: 'Generates',
      geoOutput: 'A standardized, machine-readable project stack configuration for AI citation and developer reuse.',
      project,
      mode,
      modules: checked,
      generatedAt: new Date().toISOString(),
      brand: 'abcGEO',
      framework: 'A + B = GEO',
    };

    return `# abcGEO · INSTASTACK output
# A (Entity): INSTASTACK
# B (Verb): Generates
# GEO: Citation-ready stack config

project: ${config.project}
mode: ${config.mode}
framework: ${config.framework}
modules:
${config.modules.map((m) => `  - ${m}`).join('\n') || '  - (none selected)'}

metadata:
  brand: ${config.brand}
  entity: ${config.entity}
  action: ${config.transitiveVerb}
  purpose: ${config.geoOutput}
  generated_at: ${config.generatedAt}
`;
  }

  if (generateBtn && stackOut) {
    generateBtn.addEventListener('click', () => {
      stackOut.textContent = buildStackConfig();
    });
    // seed default
    stackOut.textContent = buildStackConfig();
  }

  if (copyBtn && stackOut) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(stackOut.textContent || '');
        copyBtn.textContent = 'Copied';
        setTimeout(() => {
          copyBtn.textContent = 'Copy output';
        }, 1600);
      } catch {
        copyBtn.textContent = 'Copy failed';
        setTimeout(() => {
          copyBtn.textContent = 'Copy output';
        }, 1600);
      }
    });
  }
})();
