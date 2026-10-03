(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  $('#year').textContent = new Date().getFullYear();

  /* ---------- Preloader ---------- */
  var fill = $('#loaderFill'), pct = 0, finished = false;
  var tick = setInterval(function () {
    pct = Math.min(pct + Math.random() * 14, 90);
    fill.style.width = pct + '%';
  }, 140);
  function finishLoad() {
    if (finished) return; finished = true;
    clearInterval(tick); fill.style.width = '100%';
    setTimeout(function () { root.classList.add('loaded'); }, reduce ? 0 : 350);
  }
  if (doc.readyState === 'complete') finishLoad(); else window.addEventListener('load', finishLoad);
  setTimeout(finishLoad, 3500); // never block the page for long

  /* ---------- Header, progress, back-to-top, active link ---------- */
  var header = $('#siteHeader'), bar = $('#progress'), totop = $('#totop');
  var sections = $$('main section[id]');
  var navLinks = $$('.navlinks a, #mobileMenu a:not(.btn)');
  var ticking = false;
  function onScroll() {
    var y = window.pageYOffset, max = root.scrollHeight - window.innerHeight;
    header.classList.toggle('scrolled', y > 30);
    totop.classList.toggle('show', y > 700);
    bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    var cur = '', line = y + window.innerHeight * 0.35;
    sections.forEach(function (s) { if (s.offsetTop <= line) cur = s.id; });
    navLinks.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + cur;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  totop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* ---------- Mobile menu ---------- */
  var burger = $('#burger'), menu = $('#mobileMenu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    header.classList.toggle('open', open);
    doc.body.classList.toggle('lock', open);
  }
  burger.addEventListener('click', function () { setMenu(menu.hidden); });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });
  window.addEventListener('resize', function () { if (window.innerWidth > 1180 && !menu.hidden) setMenu(false); });

  /* ---------- Scroll reveal + counters ---------- */
  $$('.reveal').forEach(function (el) {
    var sibs = $$('.reveal', el.parentElement).filter(function (n) { return n.parentElement === el.parentElement; });
    el.style.setProperty('--d', Math.min(sibs.indexOf(el), 6) * 0.08 + 's');
  });
  function countUp(el) {
    var end = parseInt(el.getAttribute('data-count'), 10);
    if (reduce || !end) { el.textContent = end || el.textContent; return; }
    var start = performance.now(), dur = 1200;
    (function step(t) {
      var p = Math.min((t - start) / dur, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        $$('[data-count]', en.target).forEach(countUp);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Gallery filter ---------- */
  var filterBtns = $$('.filter-btn'), items = $$('.g-item'), countEl = $('#filterCount');
  function applyFilter(cat) {
    var n = 0;
    items.forEach(function (it) {
      var show = cat === 'all' || it.dataset.cat === cat;
      it.hidden = !show;
      if (show) {
        n++;
        // restart the pop animation for a smooth filtering transition
        it.style.animation = 'none'; void it.offsetWidth; it.style.animation = '';
      }
    });
    filterBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.filter === cat)); });
    countEl.textContent = 'Showing ' + n + ' ' + (n === 1 ? 'work' : 'works');
  }
  filterBtns.forEach(function (b) { b.addEventListener('click', function () { applyFilter(b.dataset.filter); }); });
  applyFilter('all');

  /* ---------- Lightbox ---------- */
  var lb = $('#lightbox'), lbImg = $('#lbImg'), lbTitle = $('#lbTitle'), lbMeta = $('#lbMeta');
  var group = [], idx = 0, lastFocus = null;
  function buildGroup(trigger) {
    if (trigger.closest('#gallery')) return items.filter(function (i) { return !i.hidden; });
    return $$('[data-full]', trigger.closest('.featured-grid'));
  }
  function show(i) {
    idx = (i + group.length) % group.length;
    var it = group[idx], img = $('img', it);
    lbImg.src = it.dataset.full;
    lbImg.alt = img ? img.alt : it.dataset.title;
    lbTitle.textContent = it.dataset.title;
    lbMeta.textContent = it.dataset.catlabel + '  ·  ' + (idx + 1) + ' / ' + group.length;
    var multi = group.length > 1;
    $('.lb-prev').hidden = $('.lb-next').hidden = !multi;
  }
  function openLb(trigger) {
    lastFocus = trigger; group = buildGroup(trigger); show(group.indexOf(trigger));
    lb.hidden = false; doc.body.classList.add('lock'); $('.lb-close').focus();
  }
  function closeLb() {
    lb.hidden = true; doc.body.classList.remove('lock'); lbImg.removeAttribute('src');
    if (lastFocus) lastFocus.focus();
  }
  $$('[data-full]').forEach(function (t) { t.addEventListener('click', function () { openLb(t); }); });
  $('.lb-close').addEventListener('click', closeLb);
  $('.lb-prev').addEventListener('click', function () { show(idx - 1); });
  $('.lb-next').addEventListener('click', function () { show(idx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
  doc.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
    else if (e.key === 'Tab') { // keep focus inside the dialog
      var f = $$('button', lb).filter(function (b) { return !b.hidden; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  var tx = null;
  lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
  });

  /* ---------- Contact form ---------- */
  var form = $('#contactForm'), btn = $('#submitBtn'), statusEl = $('#formStatus');
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, PHONE_RE = /^[0-9+()\-.\s]{5,30}$/;
  var rules = {
    name: function (v) { return v.length < 2 ? 'Please enter your name.' : ''; },
    email: function (v) { return !EMAIL_RE.test(v) ? 'Please enter a valid email address.' : ''; },
    phone: function (v) { return v && !PHONE_RE.test(v) ? 'Please enter a valid phone number.' : ''; },
    subject: function (v) { return v.length < 3 ? 'Please enter a subject.' : ''; },
    message: function (v) { return v.length < 10 ? 'Please write a message (at least 10 characters).' : ''; }
  };
  function setErr(name, msg) {
    var f = form.elements[name], box = f.closest('.field'), out = $('#err-' + name);
    out.textContent = msg || ''; box.classList.toggle('invalid', !!msg);
    f.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function check(name) { var m = rules[name](form.elements[name].value.trim()); setErr(name, m); return !m; }
  Object.keys(rules).forEach(function (n) {
    form.elements[n].addEventListener('blur', function () { check(n); });
    form.elements[n].addEventListener('input', function () { if (form.elements[n].closest('.field').classList.contains('invalid')) check(n); });
  });
  function status(msg, type, html) {
    statusEl.className = 'form-status' + (type ? ' ' + type : '');
    if (html) statusEl.innerHTML = msg; else statusEl.textContent = msg;
  }
  var sending = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return; // prevent duplicate submissions
    status('', '');
    var valid = Object.keys(rules).map(check).every(Boolean);
    if (!valid) { var bad = $('.field.invalid input, .field.invalid textarea', form); if (bad) bad.focus(); return; }
    var payload = {}; new FormData(form).forEach(function (v, k) { payload[k] = typeof v === 'string' ? v.trim() : v; });
    sending = true; btn.classList.add('loading'); btn.setAttribute('aria-busy', 'true');
    $('.btn-label', btn).textContent = 'Sending…';
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
    var mailFallback = ' Or email me at <a href="mailto:hr.skdigitalsolution@gmail.com">hr.skdigitalsolution@gmail.com</a>.';
    fetch('/api/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.ok) {
          form.reset(); Object.keys(rules).forEach(function (n) { setErr(n, ''); });
          status('Thank you! Your message has been sent. I\'ll reply to your email soon.', 'ok');
        } else if (res.status === 400 && res.j.errors) {
          Object.keys(res.j.errors).forEach(function (n) { if (rules[n]) setErr(n, res.j.errors[n]); });
          status(res.j.error || 'Please check the highlighted fields.', 'bad');
        } else {
          status((res.j.error || 'Something went wrong. Please try again.') + mailFallback, 'bad', true);
        }
      })
      .catch(function () { status('Could not reach the server. Please check your connection and try again.' + mailFallback, 'bad', true); })
      .then(function () {
        clearTimeout(timer); sending = false; btn.classList.remove('loading'); btn.removeAttribute('aria-busy');
        $('.btn-label', btn).textContent = 'Send Message';
      });
  });
})();
