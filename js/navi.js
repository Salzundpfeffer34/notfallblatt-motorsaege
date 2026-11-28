/* <navi navi> … </navi> – zentrale Top-Navigation auf allen Seiten. CSS siehe css/navi.css.
   Das Navi-Markup steht statisch im HTML innerhalb von <navi>; dieses Skript ergaenzt nur:
   i18n (data-navi-Attribute), Menue-Verhalten der <details>, volle Breite (Body-Padding),
   Leistenhoehe (--navi-hoehe) fuer den sticky Header. Fallback: ein leeres <navi> wird komplett aufgebaut. */
(function () {
  'use strict';

  var GRUPPEN = [
    { key: 'hubGrpEinsatz', items: [
      { href: 'notfallblatt.html', key: 'naviNotfallblatt' },
      { href: 'koordinaten/', key: 'naviKoordinaten' },
      { href: 'gpx-reduce.html', key: 'naviGpx' }
    ]},
    { key: 'hubGrpFoto', items: [
      { href: 'sonne-mond.html', key: 'naviSonneMond' },
      { href: 'bokeh.html', key: 'naviBokeh' },
      { href: 'reitplatz.html', key: 'naviReitplatz' }
    ]},
    { key: 'hubGrpSonst', items: [
      { href: 'ort-db-editor.html', key: 'naviOrtDb' },
      { href: 'koordinaten/datenschutz.html', key: 'naviDatenschutz' }
    ]}
  ];

  var DE = {
    naviLabel: 'Hauptnavigation',
    naviMarke: 'Notfallblatt & Werkzeuge',
    hubGrpEinsatz: 'Einsatz & Rettung',
    hubGrpFoto: 'Planung & Fotografie',
    hubGrpSonst: 'Werkzeuge & Info',
    naviNotfallblatt: 'Notfallblatt',
    naviKoordinaten: 'Koordinaten',
    naviGpx: 'GPX reduzieren',
    naviSonneMond: 'Sonne & Mond',
    naviBokeh: 'Bokeh',
    naviReitplatz: 'Reitplatz',
    naviOrtDb: 'Ort-DB',
    naviDatenschutz: 'Datenschutz'
  };

  /* Basis-URL des Repo-Roots aus der eigenen Script-URL (nur fuer den Fallback-Aufbau) */
  var BASE = null;
  try {
    if (document.currentScript && document.currentScript.src) {
      BASE = new URL('../', document.currentScript.src).href;
    }
  } catch (e) { BASE = null; }

  function basisUrl() {
    if (BASE) return BASE;
    if (location.pathname.indexOf('/koordinaten/') !== -1) return new URL('../', location.href).href;
    return new URL('./', location.href).href;
  }

  function t(key) {
    if (window.NotfallI18n && typeof window.NotfallI18n.t === 'function') {
      var s = window.NotfallI18n.t(key);
      if (s && s !== key) return s;
    }
    return DE[key] || key;
  }

  function normPfad(p) {
    return p.replace(/\/index\.html$/, '/');
  }

  function istAktiv(base, href) {
    try {
      return normPfad(new URL(href, base).pathname) === normPfad(location.pathname);
    } catch (e) {
      return false;
    }
  }

  function hatNavi(el) {
    return !!(el.querySelector && el.querySelector('nav.navi-bar'));
  }

  function uebersetzen(root) {
    if (!root.querySelectorAll) return;
    var els = root.querySelectorAll('[data-navi]');
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = t(els[i].getAttribute('data-navi'));
    }
  }

  function hoeheSetzen() {
    var els = document.querySelectorAll('navi');
    var h = 0;
    for (var i = 0; i < els.length; i++) h = Math.max(h, els[i].offsetHeight || 0);
    if (h && document.documentElement) {
      document.documentElement.style.setProperty('--navi-hoehe', h + 'px');
    }
  }

  /* Body-Einrueckung (z. B. padding 0 16px) ausgleichen + Marker-Klasse + Leistenhoehe */
  function anpassen(el) {
    if (window.getComputedStyle && document.body) {
      var cs = getComputedStyle(document.body);
      var pl = parseFloat(cs.paddingLeft) || 0;
      var pr = parseFloat(cs.paddingRight) || 0;
      if (pl) el.style.marginLeft = (-pl) + 'px';
      if (pr) el.style.marginRight = (-pr) + 'px';
    }
    if (document.body) document.body.classList.add('hat-navi');
    hoeheSetzen();
  }

  /* Fallback: leeres <navi> komplett aufbauen (Gruppen mit <details>-Untermenues) */
  function aufbauen(el) {
    var base = basisUrl();
    el.textContent = '';
    var nav = document.createElement('nav');
    nav.className = 'navi-bar';
    nav.setAttribute('aria-label', t('naviLabel'));
    var inner = document.createElement('div');
    inner.className = 'navi-inner';
    var brand = document.createElement('a');
    brand.className = 'navi-brand';
    brand.href = new URL('index.html', base).href;
    if (istAktiv(base, 'index.html')) {
      brand.classList.add('aktiv');
      brand.setAttribute('aria-current', 'page');
    }
    var icon = document.createElement('img');
    icon.src = new URL('img/motorsaege.svg', base).href;
    icon.alt = '';
    icon.width = 26;
    icon.height = 26;
    var brandText = document.createElement('span');
    brandText.setAttribute('data-navi', 'naviMarke');
    brandText.textContent = t('naviMarke');
    brand.appendChild(icon);
    brand.appendChild(brandText);
    var ul = document.createElement('ul');
    ul.className = 'navi-links';
    for (var g = 0; g < GRUPPEN.length; g++) {
      var gruppe = GRUPPEN[g];
      var li = document.createElement('li');
      li.className = 'navi-gruppe';
      var details = document.createElement('details');
      var summary = document.createElement('summary');
      summary.setAttribute('data-navi', gruppe.key);
      summary.textContent = t(gruppe.key);
      var um = document.createElement('ul');
      um.className = 'navi-untermenu';
      var gruppeAktiv = false;
      for (var i = 0; i < gruppe.items.length; i++) {
        var e = gruppe.items[i];
        var li2 = document.createElement('li');
        var a = document.createElement('a');
        a.href = new URL(e.href, base).href;
        a.setAttribute('data-navi', e.key);
        a.textContent = t(e.key);
        if (istAktiv(base, e.href)) {
          a.classList.add('aktiv');
          a.setAttribute('aria-current', 'page');
          gruppeAktiv = true;
        }
        li2.appendChild(a);
        um.appendChild(li2);
      }
      if (gruppeAktiv) summary.classList.add('aktiv');
      details.appendChild(summary);
      details.appendChild(um);
      li.appendChild(details);
      ul.appendChild(li);
    }
    var schrift = document.createElement('div');
    schrift.className = 'navi-schrift';
    schrift.setAttribute('role', 'group');
    schrift.setAttribute('aria-label', 'Schriftgrösse');
    var fontDefs = [
      ['-1', 'Schrift verkleinern', 'A−'],
      ['0', 'Schrift zurücksetzen', 'A'],
      ['1', 'Schrift vergrössern', 'A+']
    ];
    for (var f = 0; f < fontDefs.length; f++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-font', fontDefs[f][0]);
      b.setAttribute('aria-label', fontDefs[f][1]);
      b.setAttribute('title', fontDefs[f][1]);
      b.textContent = fontDefs[f][2];
      if (fontDefs[f][0] === '0') b.classList.add('aktiv');
      schrift.appendChild(b);
    }
    inner.appendChild(brand);
    inner.appendChild(ul);
    inner.appendChild(schrift);
    nav.appendChild(inner);
    el.appendChild(nav);
  }

  function render(el) {
    if (!el._gerettet && !hatNavi(el)) {
      el._gerettet = true;
      /* Falls als <navi navi/> (selbstschliessend) geschrieben: folgende Geschwister wieder aus dem Element retten */
      if (el.parentNode) {
        while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el.nextSibling);
      }
    }
    if (!hatNavi(el)) aufbauen(el);
    uebersetzen(el);
    anpassen(el);
    fontButtonsBinden(el);
  }

  function alleRendern() {
    var els = document.querySelectorAll('navi');
    for (var i = 0; i < els.length; i++) render(els[i]);
  }

  /* Schriftgroesse (A-/A/A+) – skaliert html{font-size}, alle em-basierten Groessen folgen.
     Gemeinsamer localStorage-Key 'schrift' (uebernimmt alte 'konverter-schrift'-Einstellung). */
  var FONT_SIZES = [90, 100, 115, 130, 150];
  var FONT_KEY = 'schrift';
  var fontIdx = 1;

  function fontLaden() {
    try {
      var v = parseInt(localStorage.getItem(FONT_KEY), 10);
      if (isNaN(v)) v = parseInt(localStorage.getItem('konverter-schrift'), 10);
      if (!isNaN(v) && v >= 0 && v < FONT_SIZES.length) fontIdx = v;
    } catch (e) { /* localStorage nicht verfuegbar */ }
  }

  function applyFont() {
    if (document.documentElement) {
      document.documentElement.style.fontSize = (16 * FONT_SIZES[fontIdx] / 100) + 'px';
    }
    try { localStorage.setItem(FONT_KEY, String(fontIdx)); } catch (e) { /* ignorieren */ }
    fontButtonsAktualisieren();
  }

  function fontButtonsAktualisieren() {
    var bs = document.querySelectorAll('navi [data-font="0"]');
    for (var i = 0; i < bs.length; i++) {
      if (fontIdx === 1) bs[i].classList.add('aktiv');
      else bs[i].classList.remove('aktiv');
    }
  }

  function fontButtonsBinden(el) {
    if (!el.querySelectorAll) return;
    var bs = el.querySelectorAll('[data-font]');
    for (var i = 0; i < bs.length; i++) {
      if (bs[i]._fontGebunden) continue;
      bs[i]._fontGebunden = true;
      bs[i].addEventListener('click', function () {
        var d = parseInt(this.getAttribute('data-font'), 10);
        if (d === 0) {
          fontIdx = 1;
        } else {
          fontIdx += d;
          if (fontIdx < 0) fontIdx = 0;
          if (fontIdx > FONT_SIZES.length - 1) fontIdx = FONT_SIZES.length - 1;
        }
        applyFont();
      });
    }
  }

  /* Menues schliessen: nur eines offen, Klick ausserhalb / Esc / Link-Klick */
  var eventsInit = false;
  function menuesSchliessen(ausser) {
    var offen = document.querySelectorAll('navi details[open]');
    for (var i = 0; i < offen.length; i++) {
      if (offen[i] !== ausser) offen[i].removeAttribute('open');
    }
  }
  function eventsInitten() {
    if (eventsInit) return;
    eventsInit = true;
    document.addEventListener('toggle', function (e) {
      if (e.target && e.target.tagName === 'DETAILS' && e.target.open) menuesSchliessen(e.target);
    }, true);
    document.addEventListener('click', function (e) {
      if (!e.target || typeof e.target.closest !== 'function') return;
      if (e.target.closest('navi details a')) {
        var d = e.target.closest('navi details');
        if (d) d.removeAttribute('open');
      } else if (!e.target.closest('navi details')) {
        menuesSchliessen(null);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') menuesSchliessen(null);
    });
  }

  fontLaden();
  applyFont();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { eventsInitten(); alleRendern(); });
  } else {
    eventsInitten();
    alleRendern();
  }

  document.addEventListener('spracheGeaendert', alleRendern);

  if (window.NotfallI18n && typeof window.NotfallI18n.i18nAnwenden === 'function') {
    var orig = window.NotfallI18n.i18nAnwenden;
    window.NotfallI18n.i18nAnwenden = function () {
      orig.apply(this, arguments);
      alleRendern();
    };
  }

  if (window.ResizeObserver) {
    try {
      var ro = new ResizeObserver(hoeheSetzen);
      var beobachten = function () {
        var els = document.querySelectorAll('navi');
        for (var i = 0; i < els.length; i++) ro.observe(els[i]);
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', beobachten);
      } else {
        beobachten();
      }
    } catch (e) { /* Hoehe bleibt Fallback 46px */ }
  }
})();
