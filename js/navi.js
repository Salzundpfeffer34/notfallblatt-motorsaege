/* <navi navi></navi> – zentrale Top-Navigation auf allen Seiten. CSS siehe css/navi.css.
   Ohne PHP rendert dieses Skript die Navi clientseitig in jedes <navi>-Element (Fallback).
   Auf PHP-Hosting liefert body/kleine-navigation.php (per <?php include ?>) die Navi serverseitig
   – dann wird sie hier nicht ueberschrieben, nur bei Sprachwechsel neu gerendert. */
(function () {
  'use strict';

  var REPO = [
    { href: 'notfallblatt.html', key: 'naviNotfallblatt' },
    { href: 'koordinaten/', key: 'naviKoordinaten' },
    { href: 'gpx-reduce.html', key: 'naviGpx' },
    { href: 'sonne-mond.html', key: 'naviSonneMond' },
    { href: 'bokeh.html', key: 'naviBokeh' },
    { href: 'reitplatz.html', key: 'naviReitplatz' },
    { href: 'ort-db-editor.html', key: 'naviOrtDb' },
    { href: 'koordinaten/datenschutz.html', key: 'naviDatenschutz' }
  ];

  var DE = {
    naviLabel: 'Hauptnavigation',
    naviMarke: 'Notfallblatt & Werkzeuge',
    naviNotfallblatt: 'Notfallblatt',
    naviKoordinaten: 'Koordinaten',
    naviGpx: 'GPX reduzieren',
    naviSonneMond: 'Sonne & Mond',
    naviBokeh: 'Bokeh',
    naviReitplatz: 'Reitplatz',
    naviOrtDb: 'Ort-DB',
    naviDatenschutz: 'Datenschutz'
  };

  /* Basis-URL des Repo-Roots aus der eigenen Script-URL (funktioniert auch in koordinaten/ und unter jedem Deploy-Pfad) */
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

  /* Body-Einrueckung (z. B. padding 0 16px) ausgleichen + Marker-Klasse – immer, auch bei serverseitiger Navi */
  function anpassen(el) {
    if (window.getComputedStyle && document.body) {
      var cs = getComputedStyle(document.body);
      var pl = parseFloat(cs.paddingLeft) || 0;
      var pr = parseFloat(cs.paddingRight) || 0;
      if (pl) el.style.marginLeft = (-pl) + 'px';
      if (pr) el.style.marginRight = (-pr) + 'px';
    }
    if (document.body) document.body.classList.add('hat-navi');
  }

  function render(el) {
    var vorhanden = el.querySelector('nav.navi-bar');
    if (vorhanden && vorhanden.parentNode) vorhanden.parentNode.removeChild(vorhanden);
    if (!el._gerettet) {
      el._gerettet = true;
      /* Falls als <navi navi/> (selbstschliessend) geschrieben: folgende Geschwister wieder aus dem Element retten */
      if (el.parentNode) {
        while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el.nextSibling);
      }
    }
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
    brandText.textContent = t('naviMarke');
    brand.appendChild(icon);
    brand.appendChild(brandText);
    var ul = document.createElement('ul');
    ul.className = 'navi-links';
    for (var i = 0; i < REPO.length; i++) {
      var e = REPO[i];
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = new URL(e.href, base).href;
      a.textContent = t(e.key);
      if (istAktiv(base, e.href)) {
        a.classList.add('aktiv');
        a.setAttribute('aria-current', 'page');
      }
      li.appendChild(a);
      ul.appendChild(li);
    }
    inner.appendChild(brand);
    inner.appendChild(ul);
    nav.appendChild(inner);
    el.appendChild(nav);
    anpassen(el);
  }

  function alleRendern(force) {
    var els = document.querySelectorAll('navi');
    for (var i = 0; i < els.length; i++) {
      anpassen(els[i]);
      if (!force && els[i].querySelector('nav.navi-bar')) continue; /* serverseitig via PHP schon gerendert */
      render(els[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { alleRendern(false); });
  } else {
    alleRendern(false);
  }

  document.addEventListener('spracheGeaendert', function () { alleRendern(true); });

  if (window.NotfallI18n && typeof window.NotfallI18n.i18nAnwenden === 'function') {
    var orig = window.NotfallI18n.i18nAnwenden;
    window.NotfallI18n.i18nAnwenden = function () {
      orig.apply(this, arguments);
      alleRendern(true);
    };
  }
})();
