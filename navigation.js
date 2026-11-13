// Slide deck: horizontal scroll-snap track, driven by wheel, keys, swipe, the
// bottom controls and any #hash link (including links that point at a task
// nested inside an Experience tab).
(() => {
  const deck = document.getElementById('deck');
  const slides = [...deck.querySelectorAll('.slide')];
  const navLinks = [...document.querySelectorAll('.topbar nav a')];
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  const cur = document.getElementById('cur');
  const label = document.getElementById('label');
  const barfill = document.getElementById('barfill');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = n => String(n).padStart(2, '0');
  let index = 0;

  document.getElementById('tot').textContent = pad(slides.length);

  function render(i) {
    index = i;
    slides.forEach((s, n) => s.classList.toggle('is-active', n === i));
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + slides[i].id));
    cur.textContent = pad(i + 1);
    label.textContent = slides[i].dataset.label;
    barfill.style.width = ((i + 1) / slides.length) * 100 + '%';
    prev.disabled = i === 0;
    next.disabled = i === slides.length - 1;
  }

  function go(i, instant) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    deck.scrollTo({ left: slides[i].offsetLeft, behavior: instant || reduced ? 'auto' : 'smooth' });
    render(i);
    return i;
  }

  // Keep state in sync when the user swipes or drags the track directly.
  deck.addEventListener('scroll', () => {
    const max = deck.scrollWidth - deck.clientWidth;
    document.documentElement.style.setProperty('--p', max ? (deck.scrollLeft / max).toFixed(4) : 0);
    const i = Math.round(deck.scrollLeft / deck.clientWidth);
    if (i !== index && slides[i]) {
      render(i);
      history.replaceState(null, '', '#' + slides[i].id);
    }
  }, { passive: true });

  // Tabs on the Experience slide.
  function selectTab(tab, focus) {
    tabs.forEach((t, n) => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      panels[n].hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, n) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', e => {
      const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      selectTab(tabs[(n + step + tabs.length) % tabs.length], true);
    });
  });
  selectTab(tabs[0]);

  // Resolve a hash to its slide; open the tab and task it lives in.
  function showTarget(hash, instant) {
    const node = hash && document.getElementById(hash.slice(1));
    if (!node) return false;
    const panel = node.closest('[role="tabpanel"]');
    if (panel) selectTab(tabs[panels.indexOf(panel)]);
    if (node.matches('details')) {
      node.parentElement.querySelectorAll('details').forEach(d => { d.open = d === node; });
    }
    const slide = node.closest('.slide');
    go(slides.indexOf(slide), instant);
    if (node !== slide && !node.matches('[role="tabpanel"]')) {
      setTimeout(() => node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' }), instant ? 0 : 650);
    } else {
      slide.scrollTop = 0;
    }
    return true;
  }

  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const hash = link.getAttribute('href');
    if (!document.getElementById(hash.slice(1))) return;
    e.preventDefault();
    history.pushState(null, '', hash);
    showTarget(hash);
  });
  window.addEventListener('popstate', () => showTarget(location.hash || '#home'));

  prev.addEventListener('click', () => { history.replaceState(null, '', '#' + slides[go(index - 1)].id); });
  next.addEventListener('click', () => { history.replaceState(null, '', '#' + slides[go(index + 1)].id); });

  document.addEventListener('keydown', e => {
    if (e.target.closest('[role="tab"], input, textarea') || e.altKey || e.ctrlKey || e.metaKey) return;
    const to = { ArrowRight: index + 1, PageDown: index + 1, ArrowLeft: index - 1, PageUp: index - 1, Home: 0, End: slides.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    history.replaceState(null, '', '#' + slides[go(to)].id);
  });

  // Mouse wheel: scroll inside the slide first, change slide at its edges.
  let locked = false;
  deck.addEventListener('wheel', e => {
    if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    const s = slides[index];
    const down = e.deltaY > 0;
    const canScroll = down ? s.scrollTop + s.clientHeight < s.scrollHeight - 2 : s.scrollTop > 2;
    if (canScroll && s.contains(e.target)) return;
    e.preventDefault();
    if (locked || Math.abs(e.deltaY) < 12) return;
    const target = index + (down ? 1 : -1);
    if (target < 0 || target >= slides.length) return;
    locked = true;
    history.replaceState(null, '', '#' + slides[go(target)].id);
    setTimeout(() => { locked = false; }, 850);
  }, { passive: false });

  window.addEventListener('resize', () => deck.scrollTo({ left: slides[index].offsetLeft }));

  render(0);
  if (!showTarget(location.hash, true)) go(0, true);
})();
