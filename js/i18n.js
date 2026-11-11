(function () {
  'use strict';

  const SPRACHE_KEY = 'notfallblatt.sprache';
  const SPRACHEN = ['de', 'fr', 'it', 'es', 'pt'];

  function texteFuer(lang) {
    const eintrag = window.NOTFALL_TEXTE && window.NOTFALL_TEXTE[lang];
    return eintrag && eintrag.texte ? eintrag.texte : {};
  }

  function gefahrenFuer(lang) {
    const eintrag = window.NOTFALL_TEXTE && window.NOTFALL_TEXTE[lang];
    return eintrag && eintrag.gefahren ? eintrag.gefahren : [];
  }

  let sprache = 'de';
  try {
    const gespeichert = localStorage.getItem(SPRACHE_KEY);
    if (gespeichert && SPRACHEN.indexOf(gespeichert) !== -1) sprache = gespeichert;
  } catch (e) { /* localStorage nicht verfuegbar */ }

  function t(key) {
    const dict = texteFuer(sprache);
    if (dict[key] !== undefined) return dict[key];
    const de = texteFuer('de');
    return de[key] !== undefined ? de[key] : key;
  }

  function gefahrenListe() {
    const liste = gefahrenFuer(sprache);
    return liste.length ? liste.slice() : gefahrenFuer('de').slice();
  }

  function i18nAnwenden() {
    document.documentElement.lang = sprache;
    document.title = t('titel');
    const knotsen = document.querySelectorAll('[data-i18n]');
    for (let i = 0; i < knotsen.length; i++) {
      knotsen[i].textContent = t(knotsen[i].getAttribute('data-i18n'));
    }
    const platzhalter = document.querySelectorAll('[data-i18n-ph]');
    for (let i = 0; i < platzhalter.length; i++) {
      platzhalter[i].setAttribute('placeholder', t(platzhalter[i].getAttribute('data-i18n-ph')));
    }
  }

  function setzeSprache(neu) {
    if (SPRACHEN.indexOf(neu) === -1 || neu === sprache) return;
    sprache = neu;
    try { localStorage.setItem(SPRACHE_KEY, sprache); } catch (e) { /* ignorieren */ }
    i18nAnwenden();
    document.dispatchEvent(new CustomEvent('spracheGeaendert', { detail: { sprache: sprache } }));
  }

  function i18nInit() {
    const select = document.getElementById('spracheSelect');
    if (select) {
      select.value = sprache;
      select.addEventListener('change', function () { setzeSprache(select.value); });
    }
    i18nAnwenden();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', i18nInit);
  } else {
    i18nInit();
  }

  window.NotfallI18n = { t: t, gefahrenListe: gefahrenListe, i18nAnwenden: i18nAnwenden, setzeSprache: setzeSprache, sprache: function () { return sprache; } };
})();
