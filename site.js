(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var year = $('#year'); if (year) year.textContent = new Date().getFullYear();

  /* Hell / Dunkel: folgt der Geräteeinstellung, Umschalten gilt für diesen Seitenaufruf (es wird nichts gespeichert) */
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : { matches: false };
  $('#themeBtn').addEventListener('click', function () {
    var now = root.getAttribute('data-theme') || (mq.matches ? 'dark' : 'light');
    root.setAttribute('data-theme', now === 'dark' ? 'light' : 'dark');
  });

  /* Mobiles Menü */
  var head = $('#kopf'), menuBtn = $('#menuBtn');
  function setMenu(open) {
    head.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  }
  menuBtn.addEventListener('click', function () { setMenu(!head.classList.contains('is-open')); });
  $$('#nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* Startseite: Punkte an der Haus-Zeichnung */
  var tabs = $$('.parts [role="tab"]'), spots = $$('.spot');
  function showPart(key, focus) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-part') === key;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      $('#part-' + t.getAttribute('data-part')).hidden = !on;
      if (on && focus) t.focus();
    });
    spots.forEach(function (s) { s.classList.toggle('is-on', s.getAttribute('data-part') === key); });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { showPart(t.getAttribute('data-part')); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var n = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
      showPart(tabs[n].getAttribute('data-part'), true);
    });
  });
  spots.forEach(function (s) {
    s.addEventListener('click', function () { showPart(s.getAttribute('data-part')); });
    s.addEventListener('mouseenter', function () { showPart(s.getAttribute('data-part')); });
  });
  if (tabs.length) showPart('dach');

  /* Startseite: Leistungsfinder */
  var chips = $$('.chip'), hint = $('#hint');
  function setAnlass(key) {
    chips.forEach(function (c) {
      var on = c.getAttribute('data-anlass') === key;
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on && hint) hint.textContent = c.getAttribute('data-hint');
    });
    $$('.grp').forEach(function (g) {
      var any = false;
      $$('.lnk', g).forEach(function (l) {
        var match = key === 'alle' || l.getAttribute('data-anlass').split(' ').indexOf(key) > -1;
        l.hidden = !match;
        if (match) any = true;
      });
      g.hidden = !any;
    });
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { setAnlass(c.getAttribute('data-anlass')); }); });

  /* Startseite: Haus im Hintergrund baut sich beim Scrollen auf */
  var bgh = $('#bgh');
  if (bgh) {
    var st = $$('.st', bgh), cap = $('#bghCap'), N = st.length, last = -2, ticking = false;
    var from = $('#leistungen'), to = $('#fragen');
    var upd = function () {
      ticking = false;
      var y = window.pageYOffset, vh = window.innerHeight;
      var start = from.getBoundingClientRect().top + y - vh * 0.8;
      var end = to.getBoundingClientRect().top + y - vh * 0.35;
      var p = reduce ? 1 : clamp((y - start) / (end - start));
      var f = p * N;
      st.forEach(function (g, i) { g.style.setProperty('--t', clamp(f - i).toFixed(3)); });
      var k = p <= 0 ? -1 : (p >= 1 ? N : Math.floor(f));
      if (k !== last) {
        last = k;
        cap.textContent = k < 0 ? '' : (k >= N ? 'Fertig' : st[k].getAttribute('data-name'));
      }
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(upd); } }, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  }

  /* Kontaktformular: Senden ohne Weiterleitung, mit Bestätigung auf der Seite */
  var form = $('#form'), btn = $('#formBtn'), err = $('#formErr'), done = $('#formDone');
  if (form && window.fetch && window.FormData) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true;
      btn.disabled = true;
      btn.textContent = 'Wird gesendet';
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error('Fehler');
          form.hidden = true;
          done.hidden = false;
          done.focus();
        })
        .catch(function () {
          err.hidden = false;
          btn.disabled = false;
          btn.textContent = 'Anfrage senden';
        });
    });
  }

  if ('IntersectionObserver' in window) {
    /* Ablauf: Schritte füllen sich beim Scrollen */
    var stepIO = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); stepIO.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -30% 0px', threshold: 0.5 });
    $$('.step').forEach(function (s) { stepIO.observe(s); });

    /* Navigation: aktuellen Abschnitt markieren */
    var links = {};
    $$('#nav a').forEach(function (a) { if (a.hash) links[a.hash.slice(1)] = a; });
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].removeAttribute('aria-current'); });
        if (links[en.target.id]) links[en.target.id].setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (k) { var el = document.getElementById(k); if (el) spy.observe(el); });

    /* Mobile Aktionsleiste ausblenden, sobald das Kontaktformular sichtbar ist */
    var mbar = $('#mbar'), kon = $('#kontakt');
    if (mbar && kon) {
      new IntersectionObserver(function (es) { mbar.classList.toggle('is-hidden', es[0].isIntersecting); }, { threshold: 0.12 }).observe(kon);
    }
  } else {
    $$('.step').forEach(function (s) { s.classList.add('is-in'); });
  }
})();
