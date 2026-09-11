(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme ---------- */
  const themeToggle = $('#theme-toggle');
  const root = document.documentElement;

  const applyTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    if (themeToggle) {
      const next = theme === 'dark' ? 'light' : 'dark';
      themeToggle.setAttribute('aria-label', `Switch to ${next} theme`);
    }
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0a0c' : '#ffffff');
  };

  let stored = null;
  try { stored = localStorage.getItem('theme'); } catch { /* storage blocked */ }
  applyTheme(stored === 'dark' ? 'dark' : 'light');

  themeToggle?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('theme', next); } catch { /* storage blocked */ }
  });

  /* ---------- Mobile menu ---------- */
  const nav = $('#nav');
  const navToggle = $('#nav-toggle');
  const navLinks = $('#primary-nav');

  const setMenu = (open) => {
    navLinks.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  navToggle?.addEventListener('click', () => {
    setMenu(navToggle.getAttribute('aria-expanded') !== 'true');
  });

  navLinks?.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('is-open')) {
      setMenu(false);
      navToggle.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!navLinks.classList.contains('is-open')) return;
    if (!e.target.closest('#primary-nav') && !e.target.closest('#nav-toggle')) setMenu(false);
  });

  /* ---------- Sticky nav state + read progress ---------- */
  const progress = $('#nav-progress');
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-stuck', y > 8);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${max > 0 ? Math.min(1, y / max) * 100 : 0}%`;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScroll);
  }, { passive: true });
  onScroll();

  /* ---------- Scroll spy ---------- */
  const links = $$('.nav__links a');
  const sections = links
    .map((link) => (link.hash ? $(link.hash) : null))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const visible = new Map();

    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0));

      let activeId = null;
      let best = 0;
      visible.forEach((ratio, id) => {
        if (ratio > best) { best = ratio; activeId = id; }
      });

      if (activeId) {
        links.forEach((link) => link.classList.toggle('is-active', link.hash === `#${activeId}`));
      }
    }, {
      rootMargin: `-${nav.offsetHeight + 10}px 0px -45% 0px`,
      threshold: [0, 0.15, 0.35, 0.6, 1]
    });

    sections.forEach((section) => spy.observe(section));
  }

  /* ---------- Reveal on scroll ---------- */
  const revealables = $$('[data-reveal]');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealables.forEach((el) => el.classList.add('is-visible'));
  } else {
    const reveal = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealables.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i % 4, 3) * 60}ms`;
      reveal.observe(el);
    });
  }

  /* ---------- Case study dialog ---------- */
  const caseDialog = $('#case-dialog');
  const caseBody = $('#case-body');
  const caseTemplates = $$('template[data-case]');
  let caseTrigger = null;

  const closeCase = () => { if (caseDialog?.open) caseDialog.close(); };

  const openCase = (key, trigger) => {
    const tpl = caseTemplates.find((t) => t.dataset.case === key);
    if (!tpl) return;

    caseBody.replaceChildren(tpl.content.cloneNode(true));
    caseTrigger = trigger;
    root.classList.add('has-dialog');
    caseDialog.showModal();
    caseBody.scrollTop = 0;
    caseBody.focus();
  };

  $$('[data-case-open]').forEach((btn) => {
    btn.addEventListener('click', () => openCase(btn.dataset.caseOpen, btn));
  });

  $('#case-close')?.addEventListener('click', closeCase);

  // Clicks that land on the dialog element itself came from the backdrop.
  caseDialog?.addEventListener('click', (e) => {
    if (e.target === caseDialog) closeCase();
  });

  // The host browser does not always apply the native Escape dismissal.
  caseDialog?.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    closeCase();
  });

  caseDialog?.addEventListener('close', () => {
    root.classList.remove('has-dialog');
    caseBody.replaceChildren();
    caseTrigger?.focus();
    caseTrigger = null;
  });

  /* ---------- Logos ---------- */
  // Fall back to a wordmark tile until the brand asset is dropped into assets/logos.
  $$('.logo__img').forEach((img) => {
    const useFallback = () => {
      const tile = img.closest('.logo');
      if (!tile) return;
      tile.textContent = tile.dataset.fallbackText || '';
      tile.classList.remove('logo--img');
      if (tile.dataset.fallbackClass) tile.classList.add(tile.dataset.fallbackClass);
    };

    // A deferred script can attach after the image has already failed.
    if (img.complete && img.naturalWidth === 0) useFallback();
    else img.addEventListener('error', useFallback);
  });

  /* ---------- Misc ---------- */
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
