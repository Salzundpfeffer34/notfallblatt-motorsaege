/* index.html (Hub/Übersicht): Suche filtert die Kacheln, "Zuletzt geöffnet" via localStorage.
   i18n läuft über js/i18n.js (gleiche texte-*.js wie das Notfallblatt); der Titel wird hier
   auf hubTitel überschrieben, damit der Hub nicht den Formular-Titel übernimmt. */
(function () {
  'use strict';
  var ZULETZT_KEY = 'hub.zuletzt';
  var MAX = 5;

  function t(k) { return window.NotfallI18n ? window.NotfallI18n.t(k) : k; }
  function setTitle() { document.title = t('hubTitel'); }

  function initSuche() {
    var inp = document.getElementById('hubSuche');
    var leer = document.getElementById('hubLeer');
    if (!inp) { return; }
    inp.addEventListener('input', function () {
      var q = inp.value.trim().toLowerCase();
      var cards = document.querySelectorAll('.hub-card');
      var total = 0;
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        var hay = (c.textContent + ' ' + (c.getAttribute('data-kw') || '')).toLowerCase();
        var show = !q || hay.indexOf(q) >= 0;
        c.classList.toggle('hidden', !show);
        if (show) { total++; }
      }
      var secs = document.querySelectorAll('section.hub-sec');
      for (var g = 0; g < secs.length; g++) {
        if (!secs[g].querySelector('.hub-grid')) { continue; }
        var vis = secs[g].querySelectorAll('.hub-card:not(.hidden)').length;
        secs[g].classList.toggle('hidden', vis === 0);
      }
      if (leer) { leer.classList.toggle('hidden', total > 0); }
    });
  }

  function ladeZuletzt() {
    try {
      var a = JSON.parse(localStorage.getItem(ZULETZT_KEY) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function merke(href) {
    try {
      var arr = ladeZuletzt().filter(function (x) { return x !== href; });
      arr.unshift(href);
      localStorage.setItem(ZULETZT_KEY, JSON.stringify(arr.slice(0, MAX)));
    } catch (e) { /* localStorage nicht verfügbar */ }
  }
  function labelFuer(href) {
    var c = document.querySelector('.hub-card[href="' + href + '"]');
    if (c) { var ct = c.querySelector('.hub-ct'); if (ct && ct.textContent) { return ct.textContent; } }
    return href;
  }
  function renderZuletzt() {
    var wrap = document.getElementById('hubZuletztWrap');
    var box = document.getElementById('hubZuletzt');
    if (!wrap || !box) { return; }
    var arr = ladeZuletzt();
    box.innerHTML = '';
    if (!arr.length) { wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');
    for (var i = 0; i < arr.length; i++) {
      (function (href) {
        var a = document.createElement('a');
        a.className = 'hub-chip';
        a.href = href;
        a.textContent = labelFuer(href);
        a.addEventListener('click', function () { merke(href); });
        box.appendChild(a);
      })(arr[i]);
    }
  }
  function initKlicks() {
    var els = document.querySelectorAll('.hub-card, .hub-cta');
    for (var i = 0; i < els.length; i++) {
      els[i].addEventListener('click', function () { merke(this.getAttribute('href')); });
    }
  }
  function init() {
    setTitle();
    initSuche();
    initKlicks();
    renderZuletzt();
    document.addEventListener('spracheGeaendert', function () { setTitle(); renderZuletzt(); });
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
