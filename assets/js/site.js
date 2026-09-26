/* SARV Labs — shared behaviour: nav, reveal-on-scroll, scroll scenes, word scrub. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');
  if (reduce) root.classList.add('reduce');

  /* Navigation: shadow on scroll + mobile menu */
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScrollNav = function () { nav.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScrollNav();
    window.addEventListener('scroll', onScrollNav, { passive: true });
    var toggle = nav.querySelector('.nav__toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      nav.querySelectorAll('.nav__links a').forEach(function (a) {
        a.addEventListener('click', function () { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); });
      });
    }
  }

  /* Reveal on scroll. Anything already on screen at load is shown at once. */
  var revealEls = [].slice.call(document.querySelectorAll('[data-reveal]'));
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.95) {
        requestAnimationFrame(function () { el.classList.add('is-in'); });
      } else { io.observe(el); }
    });
  }

  /* Word scrub: split [data-scrub] text into words that light up as the block crosses the screen. */
  var scrubs = [].slice.call(document.querySelectorAll('[data-scrub]')).map(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    el.classList.add('scrub');
    var spans = words.map(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return s;
    });
    return { el: el, spans: spans };
  });

  /* Scroll scenes: [data-scene] gets --p (0 → 1) while it passes through the viewport
     ([data-scene="sticky"]: 0 → 1 while its sticky child is pinned),
     and fires a 'scene' event other scripts can listen to. */
  var scenes = [].slice.call(document.querySelectorAll('[data-scene]'));

  var ticking = false;
  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    scenes.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var sticky = el.getAttribute('data-scene') === 'sticky';
      var total = r.height - vh;
      var p = sticky && total > 0 ? -r.top / total : (vh - r.top) / (vh + r.height);
      p = Math.max(0, Math.min(1, p));
      if (el._p !== p) {
        el._p = p;
        el.style.setProperty('--p', p.toFixed(4));
        el.dispatchEvent(new CustomEvent('scene', { detail: p }));
      }
    });
    scrubs.forEach(function (s) {
      if (reduce) { s.spans.forEach(function (w) { w.classList.add('on'); }); return; }
      var r = s.el.getBoundingClientRect();
      var start = vh * 0.85, end = vh * 0.35;
      var p = (start - r.top) / (start - end + r.height * 0.6);
      p = Math.max(0, Math.min(1, p));
      var n = Math.round(p * s.spans.length);
      s.spans.forEach(function (w, i) { w.classList.toggle('on', i < n); });
    });
  }
  function requestFrame() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame);
  frame();

  /* Footer year */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  window.SARV = { reduce: reduce, refresh: requestFrame };
})();
