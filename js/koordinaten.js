/* Hauptlogik fuer koordinaten/index.html (aus dem HTML ausgelagert, cachebar; CSP script-src self). */
var TEXTE = {
  de: {
    docTitle: 'Koordinaten-Konverter · WGS84, DMS, LV95, NAD83, UTM, MGRS, Mercator',
    h1: 'Koordinaten-Konverter',
    subtitle: 'Koordinaten in <em>irgendeinem</em> Format einsetzen – alle anderen Formate werden automatisch berechnet.',
    labelQ: 'Koordinaten',
    qPlaceholder: 'z. B. 48.8566, 2.3522',
    ariaSchrift: 'Schriftgrösse',
    ariaSprache: 'Sprache',
    ariaFontMinus: 'Schrift verkleinern',
    ariaFontReset: 'Normale Schriftgrösse',
    ariaFontPlus: 'Schrift vergrössern',
    ariaFormat: 'Format',
    ariaTarget: 'Zielformat',
    ariaGpxDatum: 'Datumsformat im Standardnamen',
    optAuto: 'Automatisch erkennen',
    optWgs84: 'WGS84 · Dezimalgrad',
    optDms: 'Grad / Minuten / Sekunden',
    optLv95: 'Schweiz · LV95 (CH1903+)',
    optGeojson: 'GeoJSON (Länge, Breite)',
    goBtn: 'Umrechnen',
    lblSwap: 'Erste Zahl ist die Länge (lon, y) – nicht die Breite',
    lblLv95force: 'LV95 immer anzeigen (auch ausserhalb der Schweiz)',
    lblAutoclear: 'Feld beim Klicken automatisch leeren',
    lblKarte: 'Karte anzeigen (OpenStreetMap wird erst beim Umrechnen geladen)',
    lblLive: 'Live umrechnen während der Eingabe',
    beispieleTitel: 'Beispiele – zum Ausprobieren anklicken:',
    chipParis: 'WGS84 · Paris',
    chipRom: 'DMS · Rom',
    chipNy: 'DMS · New York',
    chipLa: 'Dezimalmin · Los Angeles',
    chipZh: 'LV95 · Zermatt',
    chipLondon: 'UTM · London',
    chipTokio: 'MGRS · Tokio',
    chipMercNy: 'Mercator · New York',
    lblMaplinks: 'Karten-Links',
    lblTeilen: 'Teilen',
    copyAll: 'Alle kopieren',
    copyLink: 'Link kopieren',
    mapTitle: 'Kartenausschnitt',
    batchH2: 'Stapel-Umrechnung',
    batchHelp: 'Mehrere Koordinaten auf einmal umrechnen – das Format wird automatisch erkannt.<h3>So geht’s</h3><ul><li><strong>Eine Koordinate pro Zeile</strong> einfügen</li><li>Zielformat wählen</li><li><strong>«Stapel umrechnen»</strong> klicken</li></ul><h3>GPX für Garmin</h3><ul><li><strong>«GPX herunterladen»</strong> erzeugt eine Datei für Garmin Connect oder Garmin Explore</li><li>Die Reihenfolge der Zeilen entspricht der Route</li><li>Dafür sind <strong>mindestens zwei gültige Zeilen</strong> nötig</li><li>Checkbox <strong>«Punkte nach Nähe sortieren»</strong>: Reihenfolge wird automatisch optimiert (jeweils der nächstgelegene Punkt; der erste Punkt bleibt der Start)</li></ul><h3>Dateiname</h3><ul><li>Checkbox <strong>«Dateiname automatisch nach dem Ort benennen»</strong> (Standard): benannt nach dem Ort der ersten Koordinate (via OpenStreetMap), z.&nbsp;B. <code>Green-River.gpx</code></li><li>Sonst: <code>route-DATUM_NPUNKTE.gpx</code> (z. B. <code>route-13.11.2026_7punkte.gpx</code>; Datumsformat umschaltbar: Deutsch, English/US, Français, Italiano, Español)</li><li>Checkbox <strong>«Beim Herunterladen nach dem Dateinamen fragen»</strong>: eigener Name beim Download</li></ul><p class="batchhint">Hinweis: LV95 wird nur für Koordinaten im Schweiz-Bereich angezeigt (sonst «–»).</p>',
    batchPlaceholder: 'z. B.\n48.8566, 2.3522\n41° 54\' 10.1" N, 12° 29\' 47" E\n30U 699316 5710164',
    batchGo: 'Stapel umrechnen',
    batchGpx: 'GPX herunterladen',
    linkGpxReduceHint: 'GPX hat zu viele Punkte für Garmin?',
    linkGpxReduce: '→ Hier reduzieren',
    linkSonneHint: 'Sonnenstand, Blaue/Goldene Stunde & Mond für Fotografen?',
    linkSonne: '→ Sonne & Mond planen',
    lblGpxAsk: 'Beim Herunterladen nach dem Dateinamen fragen (sonst Standardname)',
    lblGpxGeo: 'Dateiname automatisch nach dem Ort der ersten Koordinate benennen (OpenStreetMap)',
    gpxGeoWait: 'Ort wird gesucht …',
    lblGpxSort: 'Punkte nach Nähe sortieren (sinnvolle Abfolge; Start bleibt der erste Punkt)',
    lblBild: 'Bild mit GPS-Daten (JPEG/TIFF/RAW) hierher ziehen oder klicken',
    ariaBild: 'Bild mit GPS-Daten auswählen',
    noteBildGps: 'GPS aus Bild übernommen: {a}, {b}',
    noteBildKeinGps: 'Keine GPS-Daten im Bild. Koordinaten manuell eingeben (das Bild selbst wird nicht verändert).',
    noteBildManuell: 'Koordinaten übernommen (das Bild selbst wird nicht verändert).',
    phBildManuell: "z. B. 48.8566, 2.3522 oder 41° 54' 10.1\" N, 12° 29' 47\" E",
    btnBildUebernehmen: 'Übernehmen',
    errBildManuell: 'Koordinaten nicht erkannt.',
    errBildTyp: 'Bitte eine JPEG-, TIFF- oder RAW-Datei ziehen.',
    btnBildSchreiben: 'GPS ins Bild schreiben und herunterladen',
    noteBildSchreiben: 'GPS ins Bild geschrieben und heruntergeladen: {a}, {b}',
    errBildSchreiben: 'GPS konnte nicht ins Bild geschrieben werden.',
    btnBildGpx: 'Zur Stapel-/GPX-Liste hinzufügen',
    btnBildReset: 'Bild-GPS zurücksetzen',
    noteBildBatch: 'Koordinate zur Stapel-Liste hinzugefügt – dort «Stapel umrechnen» oder «GPX herunterladen» klicken.',
    errBildLesen: 'Das Bild konnte nicht gelesen werden.',
    helpH2: 'Erkannte Eingabeformate',
    helpP1: 'Als Trennzeichen funktionieren Komma, Semikolon, Leerzeichen oder Schrägstrich. Dezimalpunkt oder Dezimalkomma sind erlaubt, Schweizer Tausendertrennung mit Apostroph (<code>2\'624\'043</code>) ebenfalls.',
    helpP2: '<strong>Eingabebegrenzung:</strong> Ausser bei UTM/MGRS können nur Zahlen eingegeben werden. Bei UTM sind höchstens zwei Buchstaben erlaubt (z. B. <code>30U</code> oder <code>E … N …</code>), bei MGRS drei (<code>54SUE…</code>), bei Grad/Min/Sekunden nur N, S, E oder W. Das Eingabefeld filtert ungültige Zeichen sofort heraus.',
    helpLi1: '<strong>WGS84 Dezimalgrad:</strong> <code>48.8566, 2.3522</code> (Breite zuerst; bei <code>2.3522, 48.8566</code> Häkchen «Erste Zahl ist die Länge» setzen)',
    helpLi2: '<strong>Grad/Minuten/Sekunden:</strong> <code>41°54\'10.1"N 12°29\'47"W</code> oder <code>41° 54\' 10.1" N, 12° 29\' 47" E</code> (auch Dezimalminuten: <code>48° 51.396\' N</code>; auch typografische Zeichen ‘ ’ bzw. ‘‘ ’’ ” ´´ werden erkannt)',
    helpLi3: '<strong>Grad + Dezimalminuten (GPS):</strong> <code>N40 42.767 W74 00.367</code> (ohne Gradzeichen; Himmelsrichtung N/S/E/W vor oder nach den Zahlen)',
    helpLi4: '<strong>LV95 / CH1903+:</strong> <code>2624043, 1096620</code> (Ost 2\'4xx xxx–2\'9xx xxx, Nord 1\'0xx xxx–1\'4xx xxx)',
    helpLi5: '<strong>NAD83 (Nordamerika):</strong> geografische Koordinaten; die Werte entsprechen WGS84 (Abweichung typischerweise &lt; 2 m, weil NAD83 fest mit der nordamerikanischen Platte verbunden ist)',
    helpLi6: '<strong>UTM:</strong> <code>30U 699316 5710164</code> oder <code>699316, 5710164</code> (ohne Zone wird Zone 32 angenommen)',
    helpLi7: '<strong>MGRS:</strong> <code>54SUE8843349290</code> oder <code>54SUE 88433 49290</code>',
    helpLi8: '<strong>Web Mercator (EPSG:3857, Google Maps):</strong> <code>-8238310, 4970072</code> – bei kleinen Werten, die auch als UTM interpretierbar sind, Format oben explizit wählen',
    footer: 'Genauigkeit: UTM/Mercator/MGRS rechnerisch auf Zentimeter genau; LV95 über die offiziellen Näherungsformeln von swisstopo (Abweichung typischerweise &lt; 0,2 m). Höhenangaben werden nicht umgerechnet. Die Berechnung läuft komplett im Browser. · <a href="datenschutz.html">Datenschutz</a>',
    copyBtn: 'Kopieren',
    copied: 'Kopiert ✓',
    fmtUnknown: 'Format unbekannt',
    noLines: 'Keine Zeilen eingegeben.',
    cap1000: 'Auf 1000 Zeilen begrenzt.',
    min2: 'Min. 2 Punkte nötig',
    promptName: 'Name der GPX-Datei (ohne .gpx):',
    promptBildName: 'Name der neuen Bild-Datei:',
    notRecognized: 'Eingabe nicht erkannt: ',
    resultFor: 'Umrechnung für {a}, {b} (WGS84)',
    rowWgs84: 'WGS84 · Dezimalgrad (Breite, Länge)',
    rowDms: 'WGS84 · Grad, Minuten, Sekunden',
    rowGeojson: 'WGS84 · Dezimalgrad (Länge, Breite) — GeoJSON/Leaflet',
    rowNad83: 'NAD83 (Nordamerika) · geografisch (B, L)',
    rowLv95: 'Schweiz · LV95 / CH1903+ (Ost, Nord)',
    rowUtm: 'UTM (Zone, Ost, Nord)',
    rowMgrs: 'MGRS / USNG (1 m)',
    rowMercator: 'Web Mercator · EPSG:3857 (Google Maps) (X, Y)',
    noteUtmZone32: 'Keine UTM-Zone angegeben – es wurde Zone 32 angenommen. Gib die Zone am besten mit an, z. B. «30U 699316 5710164».',
    noteMgrs: 'MGRS erkannt.',
    noteDms: 'WGS84 in Grad/Minuten/Sekunden erkannt.',
    noteZone32: 'Keine Zone angegeben – Zone 32 angenommen. Beispiel mit Zone: «30U 699316 5710164».',
    noteDmm: 'Grad + Dezimalminuten erkannt (z. B. N40 42.767 W74 00.367).',
    noteUtmZoneN: 'UTM mit Zone {z} erkannt.',
    errMgrs: 'Format unbekannt: MGRS nicht erkannt. Beispiel: 54SUE8843349290 oder 54SUE 88433 49290.',
    errDms: 'Format unbekannt: Grad/Minuten/Sekunden nicht erkannt. Beispiel: 41° 54\' 10.1" N, 12° 29\' 47" E oder N40 42.767 W74 00.367',
    errGeneral: 'Format unbekannt. Beispiele: «48.8566, 2.3522» · «41° 54\' 10.1" N, 12° 29\' 47" E» · «2624043, 1096620» (LV95) · «30U 699316 5710164» (UTM) · «54SUE8843349290» (MGRS)',
    errMgrsRange: 'Koordinate liegt ausserhalb des MGRS-Bereichs dieser Zone.',
    errLat: 'Breite ausserhalb des gültigen Bereichs (-90 bis +90).',
    errLon: 'Länge ausserhalb des gültigen Bereichs (-180 bis +180).',
    errUnknown: 'Unbekanntes Format.',
    errEmpty: 'Bitte Koordinaten eingeben.',
    errMgrsLetters: 'Bei MGRS sind höchstens 3 Buchstaben erlaubt (z. B. 54SUE…).',
    errDmsLetters: 'Bei Grad/Minuten/Sekunden sind höchstens zwei Buchstaben erlaubt: N, S, E oder W.',
    errUtmLetters: 'Bei UTM sind höchstens zwei Buchstaben erlaubt (z. B. «32T» oder «E … N …»).',
    errLetters: 'Bitte nur Zahlen eingeben – Buchstaben sind hier nicht erlaubt.',
    errLettersAuto: 'Bitte nur Zahlen eingeben – Buchstaben nur bei UTM/MGRS oder als Himmelsrichtung (N/S/E/W).',
    errTwoValues: 'Bitte zwei Werte angeben (Breite, Länge).',
    errLv95: 'Bitte Ost und Nord angeben, z. B. 2\'624\'043, 1\'096\'620',
    errMercator: 'Bitte Ost (x) und Nord (y) angeben, z. B. 683303, 247925',
    errMercXY: 'Bitte X und Y in Metern angeben (EPSG:3857).',
    errUtm: 'Bitte Zone (optional), Ost und Nord angeben, z. B. 30U 699316 5710164'
  }
};

var KONV_LANGS = ['de', 'en', 'fr', 'it', 'es'];
var _konvTexteLoading = {};
function ladeKonvTexte(lang, cb) {
  if (window.TEXTE && window.TEXTE[lang]) { cb(true); return; }
  if (_konvTexteLoading[lang]) { _konvTexteLoading[lang].push(cb); return; }
  _konvTexteLoading[lang] = [cb];
  try {
    var sc = document.createElement('script');
    sc.src = '../js/konv-texte-' + lang + '.js';
    sc.onload = function () {
      var cbs = _konvTexteLoading[lang] || []; delete _konvTexteLoading[lang];
      for (var i = 0; i < cbs.length; i++) { cbs[i](!!(window.TEXTE && window.TEXTE[lang])); }
    };
    sc.onerror = function () {
      var cbs = _konvTexteLoading[lang] || []; delete _konvTexteLoading[lang];
      for (var i = 0; i < cbs.length; i++) { cbs[i](false); }
    };
    document.head.appendChild(sc);
  } catch (e) { delete _konvTexteLoading[lang]; cb(false); }
}
var curLang = 'de';
function t(k) {
  var d = TEXTE[curLang] || TEXTE.de;
  if (d[k] !== undefined) { return d[k]; }
  return TEXTE.de[k] !== undefined ? TEXTE.de[k] : k;
}
function applyLang(lang) {
  curLang = lang;
  var d = TEXTE[lang] || TEXTE.de;
  var els = document.querySelectorAll('[data-i18n]');
  var i, k;
  for (i = 0; i < els.length; i++) {
    k = els[i].getAttribute('data-i18n');
    if (d[k] !== undefined) { els[i].innerHTML = d[k]; }
  }
  var phs = document.querySelectorAll('[data-i18n-ph]');
  for (i = 0; i < phs.length; i++) {
    k = phs[i].getAttribute('data-i18n-ph');
    if (d[k] !== undefined) { phs[i].placeholder = d[k]; }
  }
  var ars = document.querySelectorAll('[data-i18n-aria]');
  for (i = 0; i < ars.length; i++) {
    k = ars[i].getAttribute('data-i18n-aria');
    if (d[k] !== undefined) { ars[i].setAttribute('aria-label', d[k]); }
  }
  var tis = document.querySelectorAll('[data-i18n-title]');
  for (i = 0; i < tis.length; i++) {
    k = tis[i].getAttribute('data-i18n-title');
    if (d[k] !== undefined) { tis[i].setAttribute('title', d[k]); }
  }
  document.title = d.docTitle;
  document.documentElement.lang = lang;
}

function utmZoneFromLon(lon) {
  return Math.max(1, Math.min(60, Math.floor((lon + 180.0) / 6.0) + 1));
}

function latBand(lat) {
  var bands = 'CDEFGHJKLMNPQRSTUVWX';
  var i = Math.floor((lat + 80.0) / 8.0);
  return bands[Math.max(0, Math.min(19, i))];
}

function latlonToUtm(lat, lon) {
  var a = 6378137.0;
  var f = 1.0 / 298.257223563;
  var e2 = f * (2.0 - f);
  var ep2 = e2 / (1.0 - e2);
  var k0 = 0.9996;
  var zone = utmZoneFromLon(lon);
  var lon0 = (zone * 6.0 - 183.0) * Math.PI / 180.0;
  var phi = lat * Math.PI / 180.0;
  var lam = lon * Math.PI / 180.0;
  var sp = Math.sin(phi), cp = Math.cos(phi), tp = Math.tan(phi);
  var N = a / Math.sqrt(1.0 - e2 * sp * sp);
  var T = tp * tp;
  var C = ep2 * cp * cp;
  var A = cp * (lam - lon0);
  var e4 = e2 * e2;
  var e6 = e4 * e2;
  var M = a * ((1.0 - e2 / 4.0 - 3.0 * e4 / 64.0 - 5.0 * e6 / 256.0) * phi
    - (3.0 * e2 / 8.0 + 3.0 * e4 / 32.0 + 45.0 * e6 / 1024.0) * Math.sin(2.0 * phi)
    + (15.0 * e4 / 256.0 + 45.0 * e6 / 1024.0) * Math.sin(4.0 * phi)
    - (35.0 * e6 / 3072.0) * Math.sin(6.0 * phi));
  var east = 500000.0 + k0 * N * (A
    + (1.0 - T + C) * Math.pow(A, 3) / 6.0
    + (5.0 - 18.0 * T + T * T + 72.0 * C - 58.0 * ep2) * Math.pow(A, 5) / 120.0);
  var north = k0 * (M + N * tp * (A * A / 2.0
    + (5.0 - T + 9.0 * C + 4.0 * C * C) * Math.pow(A, 4) / 24.0
    + (61.0 - 58.0 * T + T * T + 600.0 * C - 330.0 * ep2) * Math.pow(A, 6) / 720.0));
  if (lat < 0.0) { north += 10000000.0; }
  return { zone: zone, east: east, north: north };
}

function utmToLatLon(zone, east, north, south) {
  var a = 6378137.0;
  var f = 1.0 / 298.257223563;
  var e2 = f * (2.0 - f);
  var ep2 = e2 / (1.0 - e2);
  var k0 = 0.9996;
  var x = east - 500000.0;
  var y = south ? north - 10000000.0 : north;
  var e4 = e2 * e2;
  var e6 = e4 * e2;
  var M = y / k0;
  var mu = M / (a * (1.0 - e2 / 4.0 - 3.0 * e4 / 64.0 - 5.0 * e6 / 256.0));
  var e1 = (1.0 - Math.sqrt(1.0 - e2)) / (1.0 + Math.sqrt(1.0 - e2));
  var phi1 = mu
    + (3.0 * e1 / 2.0 - 27.0 * Math.pow(e1, 3) / 32.0) * Math.sin(2.0 * mu)
    + (21.0 * Math.pow(e1, 2) / 16.0 - 55.0 * Math.pow(e1, 4) / 32.0) * Math.sin(4.0 * mu)
    + (151.0 * Math.pow(e1, 3) / 96.0) * Math.sin(6.0 * mu)
    + (1097.0 * Math.pow(e1, 4) / 512.0) * Math.sin(8.0 * mu);
  var s1 = Math.sin(phi1), c1 = Math.cos(phi1), t1 = Math.tan(phi1);
  var C1 = ep2 * c1 * c1;
  var T1 = t1 * t1;
  var N1 = a / Math.sqrt(1.0 - e2 * s1 * s1);
  var R1 = a * (1.0 - e2) / Math.pow(1.0 - e2 * s1 * s1, 1.5);
  var D = x / (N1 * k0);
  var lat = phi1 - (N1 * t1 / R1) * (D * D / 2.0
    - (5.0 + 3.0 * T1 + 10.0 * C1 - 4.0 * C1 * C1 - 9.0 * ep2) * Math.pow(D, 4) / 24.0
    + (61.0 + 90.0 * T1 + 298.0 * C1 + 45.0 * T1 * T1 - 252.0 * ep2 - 3.0 * C1 * C1) * Math.pow(D, 6) / 720.0);
  var lon = (D
    - (1.0 + 2.0 * T1 + C1) * Math.pow(D, 3) / 6.0
    + (5.0 - 2.0 * C1 + 28.0 * T1 - 3.0 * C1 * C1 + 8.0 * ep2 + 24.0 * T1 * T1) * Math.pow(D, 5) / 120.0) / c1;
  var lon0 = zone * 6.0 - 183.0;
  return { lat: lat * 180.0 / Math.PI, lon: lon0 + lon * 180.0 / Math.PI };
}

function latlonToLv03(lat, lon) {
  var phi = (lat * 3600.0 - 169028.66) / 10000.0;
  var lam = (lon * 3600.0 - 26782.5) / 10000.0;
  var east = 600072.37
    + 211455.93 * lam
    - 10938.51 * lam * phi
    - 0.36 * lam * phi * phi
    - 44.54 * Math.pow(lam, 3);
  var north = 200147.07
    + 308807.95 * phi
    + 3745.25 * lam * lam
    + 76.63 * phi * phi
    - 194.56 * lam * lam * phi
    + 119.79 * Math.pow(phi, 3);
  return { east: east, north: north };
}

function lv03ToLatLon(east, north) {
  var lat = 46.95;
  var lon = 7.44;
  var h = 0.00001;
  for (var i = 0; i < 20; i++) {
    var p0 = latlonToLv03(lat, lon);
    var dE = p0.east - east;
    var dN = p0.north - north;
    if (Math.abs(dE) < 0.0000001 && Math.abs(dN) < 0.0000001) { break; }
    var px = latlonToLv03(lat + h, lon);
    var py = latlonToLv03(lat, lon + h);
    var j11 = (px.east - p0.east) / h;
    var j21 = (px.north - p0.north) / h;
    var j12 = (py.east - p0.east) / h;
    var j22 = (py.north - p0.north) / h;
    var det = j11 * j22 - j12 * j21;
    if (Math.abs(det) < 1e-12) { break; }
    lat = lat - (j22 * dE - j12 * dN) / det;
    lon = lon - (j11 * dN - j21 * dE) / det;
  }
  return { lat: lat, lon: lon };
}

function latlonToLv95(lat, lon) {
  var p = latlonToLv03(lat, lon);
  return { east: p.east + 2000000.0, north: p.north + 1000000.0 };
}

function lv95ToLatLon(east, north) {
  return lv03ToLatLon(east - 2000000.0, north - 1000000.0);
}

function latlonToMercator(lat, lon) {
  return {
    x: 6378137.0 * (lon * Math.PI / 180.0),
    y: 6378137.0 * Math.log(Math.tan(Math.PI / 4.0 + (lat * Math.PI / 180.0) / 2.0))
  };
}

function mercatorToLatLon(x, y) {
  return {
    lat: (2.0 * Math.atan(Math.exp(y / 6378137.0)) - Math.PI / 2.0) * 180.0 / Math.PI,
    lon: (x / 6378137.0) * 180.0 / Math.PI
  };
}

function latlonToMgrs(lat, lon) {
  var u = latlonToUtm(lat, lon);
  var zone = u.zone;
  var e = Math.floor(u.east);
  var n = Math.floor(u.north);
  var colSets = ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'];
  var rows = 'ABCDEFGHJKLMNPQRSTUV';
  var col = Math.floor(e / 100000) - 1;
  if (col < 0 || col > 7) {
    throw new Error(t('errMgrsRange'));
  }
  var row = Math.floor(n / 100000) % 20;
  if (zone % 2 === 0) { row = (row + 5) % 20; }
  var bi = Math.floor((lat + 80.0) / 8.0);
  bi = Math.max(0, Math.min(19, bi));
  function pad5(v) { var s = String(v % 100000); while (s.length < 5) { s = '0' + s; } return s; }
  var out = String(zone);
  if (out.length < 2) { out = '0' + out; }
  return out + latBand(lat) + colSets[(zone - 1) % 3][col] + rows[row] + pad5(e) + pad5(n);
}

function mgrsToLatLon(mgrs) {
  var m = /^\s*(\d{1,2})\s*([C-HJ-NP-X])\s*([A-HJ-NP-Z])\s*([A-HJ-NP-Z])\s*(\d+)\s*$/i.exec(mgrs);
  if (!m) { return null; }
  var zone = parseInt(m[1], 10);
  var band = m[2].toUpperCase();
  var colLetter = m[3].toUpperCase();
  var rowLetter = m[4].toUpperCase();
  var digits = m[5];
  if (zone < 1 || zone > 60 || digits.length % 2 !== 0) { return null; }
  var half = Math.floor(digits.length / 2);
  var easting = parseFloat(digits.slice(0, half)) * Math.pow(10.0, 5 - half);
  var northing = parseFloat(digits.slice(half)) * Math.pow(10.0, 5 - half);
  var colSets = ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'];
  var rows = 'ABCDEFGHJKLMNPQRSTUV';
  var ci = colSets[(zone - 1) % 3].indexOf(colLetter);
  var ri = rows.indexOf(rowLetter);
  if (ci < 0 || ri < 0) { return null; }
  var east = (ci + 1) * 100000.0 + easting;
  var row = ri;
  if (zone % 2 === 0) { row = (ri + 15) % 20; }
  var north = row * 100000.0 + northing;
  var bandMin = { C: 1100000, D: 2000000, E: 2800000, F: 3700000, G: 4600000,
    H: 5500000, J: 6400000, K: 7300000, L: 8200000, M: 9100000,
    N: 0, P: 800000, Q: 1700000, R: 2600000, S: 3500000,
    T: 4400000, U: 5300000, V: 6000000, W: 6600000, X: 7000000 };
  var minN = bandMin.hasOwnProperty(band) ? bandMin[band] : 0;
  while (north < minN) { north += 2000000.0; }
  var south = 'CDEFGHJKLM'.indexOf(band) !== -1;
  return utmToLatLon(zone, east, north, south);
}

function formatDmsPart(v, isLat) {
  var h = isLat ? (v >= 0 ? 'N' : 'S') : (v >= 0 ? 'E' : 'W');
  v = Math.abs(v);
  var d = Math.floor(v);
  var mF = (v - d) * 60.0;
  var m = Math.floor(mF);
  var s = (mF - m) * 60.0;
  if (s >= 59.95) { s = 0.0; m++; if (m >= 60) { m = 0; d++; } }
  var ss = s.toFixed(1);
  while (ss.length < 4) { ss = '0' + ss; }
  var mm = String(m);
  while (mm.length < 2) { mm = '0' + mm; }
  return d + '° ' + mm + '′ ' + ss + '″ ' + h;
}

function formatDms(lat, lon) {
  return formatDmsPart(lat, true) + ', ' + formatDmsPart(lon, false);
}

function normalizeLon(lon) {
  return lon - 360.0 * Math.floor((lon + 180.0) / 360.0);
}

function checkLatLon(lat, lon) {
  if (Math.abs(lat) > 90.0) {
    throw new Error(t('errLat'));
  }
  if (Math.abs(lon) > 180.0000001) {
    throw new Error(t('errLon'));
  }
}

function extractNumbers(s) {
  var out = [];
  var re = /-?\d+(?:[.,]\d+)?/g;
  var m;
  while ((m = re.exec(s)) !== null) {
    out.push(parseFloat(m[0].replace(',', '.')));
  }
  return out;
}

function orderLatLon(a, b) {
  if (Math.abs(a) > 90.0 && Math.abs(b) <= 90.0) {
    return { lat: b, lon: a };
  }
  return { lat: a, lon: b };
}

function parseDmsString(s) {
  if (s.indexOf('°') === -1) { return null; }
  var regexes = [
    /([NSEW])?\s*(-?\d+(?:[.,]\d+)?)\s*°\s*(?:(\d+(?:[.,]\d+)?)\s*['′‘’´m](?!['′‘’´m])\s*)?(?:(\d+(?:[.,]\d+)?)\s*(?:"|''|″|‘‘|’’|”|´´))?\s*([NSEW])?/gi,
    /([NSEW])?\s*(-?\d+(?:[.,]\d+)?)\s*°\s*(?:(\d+(?:[.,]\d+)?)\s*(?:''|′′|″|['′‘’´m](?!['′‘’´m]))\s*)?(?:(\d+(?:[.,]\d+)?)\s*(?:"|''|″|‘‘|’’|”|´´))?\s*([NSEW])?/gi
  ];
  for (var r = 0; r < regexes.length; r++) {
    var re = regexes[r];
    var ms = [];
    var m;
    while ((m = re.exec(s)) !== null) {
      ms.push(m);
    }
    if (ms.length === 0) { continue; }
    var consumed = 0;
    for (var ci = 0; ci < ms.length; ci++) {
      consumed += 1 + (ms[ci][3] ? 1 : 0) + (ms[ci][4] ? 1 : 0);
    }
    if (consumed !== extractNumbers(s).length) { continue; }
    var vals = [], hems = [];
    for (var i = 0; i < ms.length; i++) {
      var g = ms[i];
      var deg = parseFloat(g[2].replace(',', '.'));
      var mn = g[3] ? parseFloat(g[3].replace(',', '.')) : 0.0;
      var sec = g[4] ? parseFloat(g[4].replace(',', '.')) : 0.0;
      var val = Math.abs(deg) + mn / 60.0 + sec / 3600.0;
      var h = ((g[1] || g[5] || '')).toUpperCase();
      if (h === 'S' || h === 'W') { val = -val; }
      else if (h === '' && deg < 0.0) { val = -val; }
      vals.push(val);
      hems.push(h);
    }
    if (vals.length < 2) { continue; }
    var a = vals[0], b = vals[1], ha = hems[0], hb = hems[1];
    if ((ha === 'E' || ha === 'W') && (hb === 'N' || hb === 'S')) {
      return { lat: b, lon: a };
    }
    return orderLatLon(a, b);
  }
  return null;
}

function parseDmmString(s) {
  var forms = [
    /([NSEW])\s*(\d{1,3})\s+(\d{1,2}(?:[.,]\d+))\s*['′‘’´m]?/gi,
    /(\d{1,3})\s+(\d{1,2}(?:[.,]\d+))\s*['′‘’´m]?\s*([NSEW])/gi
  ];
  var hemIdx = [1, 3];
  var degIdx = [2, 1];
  var minIdx = [3, 2];
  for (var f = 0; f < forms.length; f++) {
    var re = forms[f];
    var ms = [];
    var m;
    while ((m = re.exec(s)) !== null) {
      ms.push(m);
    }
    if (ms.length !== 2) { continue; }
    if (ms.length * 2 !== extractNumbers(s).length) { continue; }
    var vals = [], hems = [];
    var ok = true;
    for (var i = 0; i < ms.length; i++) {
      var g = ms[i];
      var deg = parseFloat(g[degIdx[f]]);
      var mn = parseFloat(g[minIdx[f]].replace(',', '.'));
      var h = (g[hemIdx[f]] || '').toUpperCase();
      if (h === '' || mn >= 60.0) { ok = false; break; }
      var val = deg + mn / 60.0;
      if (h === 'S' || h === 'W') { val = -Math.abs(val); }
      vals.push(val);
      hems.push(h);
    }
    if (!ok) { continue; }
    var a = vals[0], b = vals[1], ha = hems[0], hb = hems[1];
    var ll;
    if ((ha === 'E' || ha === 'W') && (hb === 'N' || hb === 'S')) {
      ll = { lat: b, lon: a };
    } else {
      ll = orderLatLon(a, b);
    }
    if (Math.abs(ll.lat) > 90.0 || Math.abs(ll.lon) > 180.0) { continue; }
    return ll;
  }
  return null;
}

function classifyPair(a, b) {
  var inLv95 = a >= 2300000.0 && a <= 3000000.0 && b >= 1000000.0 && b <= 1400000.0;
  var inLv03 = a >= 300000.0 && a <= 1000000.0 && b >= 0.0 && b <= 400000.0;
  var inWgs = Math.abs(a) <= 90.0 && Math.abs(b) <= 180.0;
  if (inWgs && !inLv03) { return { type: 'wgs84', a: a, b: b, note: '' }; }
  if (inLv95) { return { type: 'lv95', a: a, b: b, note: '' }; }
  if (inLv03) { return { type: 'lv03', a: a, b: b, note: '' }; }
  if ((Math.abs(a) > 1000000.0 || Math.abs(b) > 10000000.0)
    && Math.abs(a) <= 20037508.342789244 && Math.abs(b) <= 20037508.342789244) {
    return { type: 'mercator', a: a, b: b, note: '' };
  }
  if (a >= 100000.0 && a < 1000000.0 && b >= 0.0 && b <= 10000000.0) {
    return { type: 'utm', a: a, b: b, note: t('noteUtmZone32') };
  }
  if (Math.abs(a) <= 20037508.342789244 && Math.abs(b) <= 20037508.342789244) {
    return { type: 'mercator', a: a, b: b, note: '' };
  }
  return null;
}

function pairToLatLon(c) {
  var a = c.a, b = c.b, ll;
  if (c.type === 'wgs84') {
    ll = orderLatLon(a, b);
    return { lat: ll.lat, lon: normalizeLon(ll.lon), note: c.note };
  }
  if (c.type === 'lv95') {
    ll = lv95ToLatLon(a, b);
    return { lat: ll.lat, lon: ll.lon, note: c.note };
  }
  if (c.type === 'lv03') {
    ll = lv03ToLatLon(a, b);
    return { lat: ll.lat, lon: ll.lon, note: c.note };
  }
  if (c.type === 'mercator') {
    ll = mercatorToLatLon(a, b);
    return { lat: ll.lat, lon: normalizeLon(ll.lon), note: c.note };
  }
  if (c.type === 'utm') {
    ll = utmToLatLon(32.0, a, b, b < 0.0);
    return { lat: ll.lat, lon: ll.lon, note: c.note };
  }
  throw new Error(t('errUnknown'));
}

function exifGps(buf) {
  var v = new DataView(buf);
  if (v.byteLength < 12) { return null; }
  var tiff = -1, xmpRanges = [];
  if (v.getUint16(0) === 0xFFD8) {
    var p = 2;
    while (p + 4 < v.byteLength) {
      if (v.getUint8(p) !== 0xFF) { p++; continue; }
      var marker = v.getUint8(p + 1);
      if (marker === 0xFF) { p++; continue; }
      if (marker === 0xD8 || (marker >= 0xD0 && marker <= 0xD9) || marker === 0x01) { p += 2; continue; }
      if (marker === 0xDA) { break; }
      var len = v.getUint16(p + 2);
      if (len < 2) { return null; }
      if (marker === 0xE1 && tiff < 0 && p + 8 <= v.byteLength && v.getUint32(p + 4) === 0x45786966) { tiff = p + 10; }
      else if (marker === 0xE1 && p + 8 <= v.byteLength && v.getUint32(p + 4) === 0x68747470) { xmpRanges.push([p + 4, Math.min(p + 2 + len, v.byteLength)]); }
      p += 2 + len;
    }
  } else if (v.getUint16(0) === 0x4949 || v.getUint16(0) === 0x4D4D) { tiff = 0; }
  if (tiff < 0) { return exifGpsXmp(v, xmpRanges); }
  var le = v.getUint16(tiff) === 0x4949;
  function u16(o) { return v.getUint16(tiff + o, le); }
  function u32(o) { return v.getUint32(tiff + o, le); }
  var magic = u16(2);
  if (magic !== 42 && magic !== 0x0055 && magic !== 0x5555 && magic !== 0x4F52 && magic !== 0x5352) { return exifGpsXmp(v, xmpRanges); }
  function saneIfd(off) { return off > 0 && off + 2 <= v.byteLength - tiff && u16(off) >= 1 && u16(off) <= 500; }
  var ifd0 = u32(4);
  if (!saneIfd(ifd0)) {
    if (saneIfd(8)) { ifd0 = 8; } else if (saneIfd(16)) { ifd0 = 16; }
  }
  if (!saneIfd(ifd0)) { return exifGpsXmp(v, xmpRanges); }
  var gpsPtr = -1, exifPtr = -1, xmpOff = -1, xmpCnt = 0;
  function scanIfd(off) {
    var n = u16(off), i, e;
    for (i = 0; i < n; i++) {
      e = off + 2 + i * 12;
      if (e + 12 > v.byteLength - tiff) { break; }
      var tag = u16(e), cnt = u32(e + 4);
      if (tag === 0x8825 && gpsPtr < 0) { gpsPtr = u32(e + 8); }
      else if (tag === 0x8769 && exifPtr < 0) { exifPtr = u32(e + 8); }
      else if (tag === 0x02BC && xmpOff < 0) { xmpOff = u32(e + 8); xmpCnt = cnt; }
    }
  }
  scanIfd(ifd0);
  if (exifPtr > 0 && saneIfd(exifPtr)) { scanIfd(exifPtr); }
  if (xmpOff > 0 && xmpCnt > 0) {
    var xe = tiff + xmpOff, xen = Math.min(xe + xmpCnt, v.byteLength), txt = '', x;
    for (x = xe; x < xen; x++) { txt += String.fromCharCode(v.getUint8(x)); }
    var xr = xmpGps(txt);
    if (xr) { return xr; }
  }
  if (gpsPtr < 0 || gpsPtr + 2 > v.byteLength - tiff) {
    if (tiff === 0) {
      // Panasonic RW2/RWL: eingebettetes Vorschau-JPEG (JpgFromRaw 0x002E / JpgFromRaw2 0x0127)
      // enthaelt ein eigenes vollstaendiges EXIF inkl. GPS-IFD
      var n0 = u16(ifd0), i2, e2;
      for (i2 = 0; i2 < n0; i2++) {
        e2 = ifd0 + 2 + i2 * 12;
        if (e2 + 12 > v.byteLength - tiff) { break; }
        var tg = u16(e2), tp = u16(e2 + 2), cn = u32(e2 + 4);
        if ((tg === 0x002E || tg === 0x0127) && tp === 7 && cn > 4) {
          var poff = u32(e2 + 8);
          if (poff > 0 && poff + 4 <= v.byteLength && v.getUint16(poff) === 0xFFD8) {
            var plen = Math.min(cn, v.byteLength - poff);
            var g = exifGps(buf.slice(poff, poff + plen));
            if (g) { return g; }
          }
        }
      }
    }
    return exifGpsXmp(v, xmpRanges);
  }
  var latRef = '', lonRef = '', lat = null, lon = null, m = u16(gpsPtr);
  function rationals(eo, cnt) {
    var valOff = cnt * 8 > 4 ? u32(eo + 8) : eo + 8, out = [], k, num, den;
    if (valOff < 0 || valOff + cnt * 8 > v.byteLength - tiff) { return null; }
    for (k = 0; k < cnt; k++) { num = u32(valOff + k * 8); den = u32(valOff + k * 8 + 4); out.push(den ? num / den : 0); }
    return out;
  }
  function gpsCoord(eo, typ, cnt) {
    if (typ === 5 && (cnt === 2 || cnt === 3)) {
      var a = rationals(eo, cnt);
      if (a) { return a[0] + a[1] / 60 + (cnt === 3 ? a[2] / 3600 : 0); }
      return null;
    }
    if (typ === 2 && cnt >= 2) {
      var vo = cnt > 4 ? u32(eo + 8) : eo + 8;
      if (vo < 0 || vo + cnt > v.byteLength - tiff) { return null; }
      var s = '', k, parts, vals = [], p, pd, num, den;
      for (k = 0; k < cnt; k++) { s += String.fromCharCode(v.getUint8(tiff + vo + k)); }
      parts = s.replace(/\0[\s\S]*$/, '').split(',');
      for (p = 0; p < parts.length && vals.length < 3; p++) {
        pd = parts[p].split('/');
        num = parseFloat(pd[0]); den = pd.length > 1 ? parseFloat(pd[1]) : 1;
        if (!isFinite(num)) { return null; }
        vals.push(den ? num / den : 0);
      }
      if (vals.length >= 2) { return vals[0] + vals[1] / 60 + (vals.length > 2 ? vals[2] / 3600 : 0); }
    }
    return null;
  }
  var i, e;
  for (i = 0; i < m; i++) {
    e = gpsPtr + 2 + i * 12;
    if (e + 12 > v.byteLength - tiff) { break; }
    var tag = u16(e), typ = u16(e + 2), cnt = u32(e + 4);
    if (tag === 1) { latRef = String.fromCharCode(v.getUint8(tiff + e + 8)); }
    else if (tag === 2) { var a2 = gpsCoord(e, typ, cnt); if (a2 !== null) { lat = a2; } }
    else if (tag === 3) { lonRef = String.fromCharCode(v.getUint8(tiff + e + 8)); }
    else if (tag === 4) { var b2 = gpsCoord(e, typ, cnt); if (b2 !== null) { lon = b2; } }
  }
  if (lat !== null && lon !== null && isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0)) {
    if (latRef === 'S') { lat = -lat; }
    if (lonRef === 'W') { lon = -lon; }
    return { lat: lat, lon: lon };
  }
  return exifGpsXmp(v, xmpRanges);
}

function exifGpsXmp(v, ranges) {
  for (var r = 0; r < ranges.length; r++) {
    var txt = '';
    for (var x = ranges[r][0]; x < ranges[r][1]; x++) { txt += String.fromCharCode(v.getUint8(x)); }
    if (txt.indexOf('ns.adobe.com/xap/1.0/') < 0) { continue; }
    var erg = xmpGps(txt);
    if (erg) { return erg; }
  }
  return null;
}

function xmpGps(txt) {
  function neg(w, ref) { return (ref === 'S' || ref === 's' || ref === 'W' || ref === 'w') ? -w : w; }
  function zahl(s) {
    s = s.trim();
    var ref = '';
    if (/^[NSEW]/i.test(s)) { ref = s.charAt(0); s = s.slice(1).trim(); }
    var m = s.match(/(\d+)\s*,\s*(\d+(?:\.\d+)?)\s*([NSEW])?/i);
    if (m) { var min = parseFloat(m[2]); var w = min > 59.995 ? parseFloat(m[1] + '.' + m[2]) : parseFloat(m[1]) + min / 60; if (m[3]) { ref = m[3]; } return { w: neg(w, ref), ref: ref }; }
    m = s.match(/(\d+)\s*(?:deg|°)\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"?\s*([NSEW])?/i);
    if (m) { var g = parseFloat(m[1]) + parseFloat(m[2]) / 60 + parseFloat(m[3]) / 3600; if (m[4]) { ref = m[4]; } return { w: neg(g, ref), ref: ref }; }
    m = s.match(/(-?\d+(?:\.\d+)?)\s*([NSEW])?/i);
    if (m) { if (m[2]) { ref = m[2]; } return { w: neg(parseFloat(m[1]), ref), ref: ref }; }
    return null;
  }
  function xmpWert(name) {
    var m = txt.match(new RegExp('exif:' + name + '"?\\s*[=>]\\s*"([^"]*)"'));
    if (m) { return m[1]; }
    m = txt.match(new RegExp('exif:' + name + "\"?\\s*[=>]\\s*'([^']*)'"));
    if (m) { return m[1]; }
    m = txt.match(new RegExp('exif:' + name + '"?\\s*[=>]\\s*([^<]+)'));
    return m ? m[1] : null;
  }
  var latS = xmpWert('GPSLatitude'), lonS = xmpWert('GPSLongitude');
  if (latS === null || lonS === null) { return null; }
  var la = zahl(latS), lo = zahl(lonS);
  if (!la || !lo) { return null; }
  var lat = la.w, lon = lo.w;
  if (!la.ref) { var lr = xmpWert('GPSLatitudeRef'); if (lr && /^s/i.test(lr.trim())) { lat = -lat; } }
  if (!lo.ref) { var orr = xmpWert('GPSLongitudeRef'); if (orr && /^w/i.test(orr.trim())) { lon = -lon; } }
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || (lat === 0 && lon === 0)) { return null; }
  return { lat: lat, lon: lon };
}

function exifWriteGps(buf, lat, lon) {
  var v = new DataView(buf);
  if (v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) { return null; }
  function dms(x) {
    var d = Math.floor(x), mf = (x - d) * 60, m = Math.floor(mf), s = Math.round((mf - m) * 60 * 10000);
    if (s >= 600000) { s -= 600000; m += 1; }
    if (m >= 60) { m -= 60; d += 1; }
    return [d, 1, m, 1, s, 10000];
  }
  var latR = dms(Math.abs(lat)), lonR = dms(Math.abs(lon));
  var p = 2, app1Start = -1, app1End = -1;
  while (p + 4 < v.byteLength) {
    if (v.getUint8(p) !== 0xFF) { break; }
    var marker = v.getUint8(p + 1);
    if (marker === 0xD8 || (marker >= 0xD0 && marker <= 0xD9) || marker === 0x01) { p += 2; continue; }
    if (marker === 0xDA) { break; }
    var len = v.getUint16(p + 2);
    if (marker === 0xE1 && v.getUint32(p + 4) === 0x45786966) { app1Start = p; app1End = p + 2 + len; break; }
    p += 2 + len;
  }
  var entries0 = [], entriesE = [];
  if (app1Start >= 0) {
    try {
      var t0 = app1Start + 10;
      var le0 = v.getUint16(t0) === 0x4949;
      function g16(o) { return v.getUint16(t0 + o, le0); }
      function g32(o) { return v.getUint32(t0 + o, le0); }
      var typeSizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 };
      function readIfd(off, out) {
        var n = g16(off), i, e;
        for (i = 0; i < n; i++) {
          e = off + 2 + i * 12;
          var tag = g16(e), ty = g16(e + 2), cnt = g32(e + 4);
          if (!(ty in typeSizes)) { continue; }
          var sz = typeSizes[ty] * cnt;
          var valOff = sz > 4 ? g32(e + 8) : e + 8;
          var k, data = [];
          if (ty === 2) {
            var str = '';
            for (k = 0; k < cnt; k++) {
              var ch = v.getUint8(t0 + valOff + k);
              if (ch === 0) { break; }
              str += String.fromCharCode(ch);
            }
            out.push({ tag: tag, ty: ty, str: str });
          } else {
            for (k = 0; k < cnt; k++) {
              var o = valOff + k * typeSizes[ty];
              if (ty === 1) { data.push(v.getUint8(t0 + o)); }
              else if (ty === 3) { data.push(g16(o)); }
              else if (ty === 4) { data.push(g32(o)); }
              else { data.push([g32(o), g32(o + 4)]); }
            }
            out.push({ tag: tag, ty: ty, data: data });
          }
        }
      }
      readIfd(g32(4), entries0);
      var q2;
      for (q2 = 0; q2 < entries0.length; q2++) {
        if (entries0[q2].tag === 0x8769 && entries0[q2].ty === 4) { readIfd(entries0[q2].data[0], entriesE); }
      }
    } catch (e) { entries0 = []; entriesE = []; }
  }
  function keep(list, skip) {
    var out = [], i, k, ok;
    for (i = 0; i < list.length; i++) {
      if (skip[list[i].tag]) { continue; }
      if (list[i].ty === 5) {
        ok = true;
        for (k = 0; k < list[i].data.length; k++) { if (!list[i].data[k] || list[i].data[k][1] === 0) { ok = false; break; } }
        if (!ok) { continue; }
      }
      out.push(list[i]);
    }
    return out;
  }
  entries0 = keep(entries0, { 0x8769: 1, 0x8825: 1 });
  entriesE = keep(entriesE, { 0x927C: 1, 0xA005: 1 });
  entries0.sort(function (a, b) { return a.tag - b.tag; });
  entriesE.sort(function (a, b) { return a.tag - b.tag; });
  var n0 = entries0.length + 1 + (entriesE.length ? 1 : 0);
  var ifd0Size = 2 + n0 * 12 + 4;
  var exifIfdOff = 8 + ifd0Size;
  var exifSize = entriesE.length ? 2 + entriesE.length * 12 + 4 : 0;
  var gpsIfdOff = exifIfdOff + exifSize;
  var bytes = [], dataRefs = [], pending = [];
  function w8(x) { bytes.push(x & 0xFF); }
  function w16(x) { bytes.push(x & 0xFF, (x >> 8) & 0xFF); }
  function w32(x) { x = x >>> 0; bytes.push(x & 0xFF, (x >> 8) & 0xFF, (x >> 16) & 0xFF, (x >> 24) & 0xFF); }
  function wPtr() { var pos = bytes.length; bytes.push(0, 0, 0, 0); return pos; }
  function patch(pos, val) { val = val >>> 0; bytes[pos] = val & 0xFF; bytes[pos + 1] = (val >> 8) & 0xFF; bytes[pos + 2] = (val >> 16) & 0xFF; bytes[pos + 3] = (val >> 24) & 0xFF; }
  function writeEntry(tag, ty, data, str) {
    var flat = null, i;
    if (ty === 5) {
      flat = [];
      for (i = 0; i < data.length; i++) { if (data[i] instanceof Array) { flat.push(data[i][0], data[i][1]); } else { flat.push(data[i]); } }
      data = flat;
    }
    w16(tag); w16(ty);
    var cnt = (ty === 2) ? str.length + 1 : (ty === 5 ? data.length / 2 : data.length);
    w32(cnt);
    var unit = ty === 2 ? 1 : { 1: 1, 3: 2, 4: 4, 5: 8 }[ty];
    var sz = unit * cnt;
    if (sz <= 4) {
      var start = bytes.length;
      if (ty === 2) { for (i = 0; i < cnt; i++) { w8(i < str.length ? str.charCodeAt(i) : 0); } }
      else if (ty === 1) { for (i = 0; i < cnt; i++) { w8(data[i]); } }
      else if (ty === 3) { for (i = 0; i < cnt; i++) { w16(data[i]); } }
      else { for (i = 0; i < cnt; i++) { w32(data[i]); } }
      while (bytes.length - start < 4) { w8(0); }
    } else {
      dataRefs.push(bytes.length);
      bytes.push(0, 0, 0, 0);
      pending.push({ ty: ty, data: data, str: str });
    }
  }
  var exifPtrPos = -1, gpsPtrPos;
  w8(0x49); w8(0x49); w16(42); w32(8);
  w16(n0);
  var i2;
  for (i2 = 0; i2 < entries0.length; i2++) { writeEntry(entries0[i2].tag, entries0[i2].ty, entries0[i2].data, entries0[i2].str); }
  if (entriesE.length) { w16(0x8769); w16(4); w32(1); exifPtrPos = wPtr(); }
  w16(0x8825); w16(4); w32(1); gpsPtrPos = wPtr();
  w32(0);
  if (entriesE.length) {
    w16(entriesE.length);
    for (i2 = 0; i2 < entriesE.length; i2++) { writeEntry(entriesE[i2].tag, entriesE[i2].ty, entriesE[i2].data, entriesE[i2].str); }
    w32(0);
  }
  w16(5);
  writeEntry(0, 1, [2, 3, 0, 0], null);
  writeEntry(1, 2, null, lat < 0 ? 'S' : 'N');
  writeEntry(2, 5, latR, null);
  writeEntry(3, 2, null, lon < 0 ? 'W' : 'E');
  writeEntry(4, 5, lonR, null);
  w32(0);
  for (i2 = 0; i2 < pending.length; i2++) {
    patch(dataRefs[i2], bytes.length);
    var it = pending[i2], k;
    if (it.ty === 2) { for (k = 0; k < it.str.length; k++) { w8(it.str.charCodeAt(k)); } w8(0); }
    else if (it.ty === 1) { for (k = 0; k < it.data.length; k++) { w8(it.data[k]); } }
    else if (it.ty === 3) { for (k = 0; k < it.data.length; k++) { w16(it.data[k]); } }
    else if (it.ty === 4) { for (k = 0; k < it.data.length; k++) { w32(it.data[k]); } }
    else { for (k = 0; k < it.data.length; k++) { w32(it.data[k]); } }
  }
  if (exifPtrPos >= 0) { patch(exifPtrPos, exifIfdOff); }
  patch(gpsPtrPos, gpsIfdOff);
  var tiff = new Uint8Array(bytes);
  var segLen = 2 + 6 + tiff.length;
  if (segLen > 0xFFFF) { return null; }
  var head = app1Start >= 0 ? app1Start : 2;
  var tail = app1Start >= 0 ? app1End : 2;
  var out = new Uint8Array(head + 4 + 6 + tiff.length + (v.byteLength - tail));
  out.set(new Uint8Array(buf, 0, head), 0);
  var o = head;
  out[o] = 0xFF; out[o + 1] = 0xE1; out[o + 2] = (segLen >> 8) & 0xFF; out[o + 3] = segLen & 0xFF; o += 4;
  out[o] = 0x45; out[o + 1] = 0x78; out[o + 2] = 0x69; out[o + 3] = 0x66; out[o + 4] = 0; out[o + 5] = 0; o += 6;
  out.set(tiff, o); o += tiff.length;
  out.set(new Uint8Array(buf, tail, v.byteLength - tail), o);
  return out.buffer;
}

function parseInput(raw, mode, swap) {
  raw = String(raw).replace(/[\u0009\u000A\u000D\u000B\u000C]/g, ' ').replace(/[\u0000-\u0008\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u{E0000}-\u{E007F}]/gu, '');
  raw = raw.trim();
  if (raw === '') {
    throw new Error(t('errEmpty'));
  }

  var compact = raw.replace(/\s+/g, '');

  if (mode === 'auto' && /^\d{1,2}[C-HJ-NP-X][A-HJ-NP-Z][A-HJ-NP-Z]\d+$/i.test(compact)) {
    mode = 'mgrs';
  }
  if (mode === 'auto' && raw.indexOf('°') !== -1) {
    mode = 'dms';
  }
  if ((mode === 'wgs84' || mode === 'lv95' || mode === 'lv03' || mode === 'mercator') && raw.indexOf('°') !== -1) {
    mode = 'dms';
  }

  var letters = (raw.match(/[A-Za-z]/g) || []).map(function (c) { return c.toUpperCase(); });
  var letterCount = letters.length;

  if (mode === 'mgrs') {
    if (letterCount > 3) {
      throw new Error(t('errMgrsLetters'));
    }
  } else if (mode === 'dms') {
    var bad = letters.filter(function (l) { return 'NSEW'.indexOf(l) === -1; });
    if (letterCount > 2 || bad.length > 0) {
      throw new Error(t('errDmsLetters'));
    }
  } else if (mode === 'utm') {
    if (letterCount > 2) {
      throw new Error(t('errUtmLetters'));
    }
  } else if (mode === 'wgs84' || mode === 'lv95' || mode === 'lv03' || mode === 'mercator') {
    if (letterCount > 0) {
      throw new Error(t('errLetters'));
    }
  } else if (letterCount > 3) {
    throw new Error(t('errLettersAuto'));
  }

  if (mode === 'mgrs') {
    var llm = mgrsToLatLon(compact);
    if (llm === null) {
      throw new Error(t('errMgrs'));
    }
    return { lat: llm.lat, lon: llm.lon, note: t('noteMgrs') };
  }

  if (mode === 'dms') {
    var lld = parseDmsString(raw);
    if (lld === null) { lld = parseDmmString(raw); }
    if (lld === null) {
      throw new Error(t('errDms'));
    }
    if (swap) { var td = lld.lat; lld.lat = lld.lon; lld.lon = td; }
    lld.lon = normalizeLon(lld.lon);
    lld.note = t('noteDms');
    return lld;
  }

  var clean = raw.replace(/['’]/g, '');
  var nums = extractNumbers(clean);

  if (mode === 'wgs84') {
    if (nums.length < 2) {
      throw new Error(t('errTwoValues'));
    }
    var llw = orderLatLon(nums[0], nums[1]);
    if (swap) { var tmp = llw.lat; llw.lat = llw.lon; llw.lon = tmp; }
    checkLatLon(llw.lat, llw.lon);
    llw.lon = normalizeLon(llw.lon);
    llw.note = '';
    return llw;
  }

  if (mode === 'lv95') {
    if (nums.length < 2) {
      throw new Error(t('errLv95'));
    }
    var ll95 = lv95ToLatLon(nums[0], nums[1]);
    ll95.note = '';
    return ll95;
  }

  if (mode === 'lv03') {
    if (nums.length < 2) {
      throw new Error(t('errMercator'));
    }
    var ll03 = lv03ToLatLon(nums[0], nums[1]);
    ll03.note = '';
    return ll03;
  }

  if (mode === 'mercator') {
    if (nums.length < 2) {
      throw new Error(t('errMercXY'));
    }
    var llme = mercatorToLatLon(nums[0], nums[1]);
    checkLatLon(llme.lat, llme.lon);
    llme.lon = normalizeLon(llme.lon);
    llme.note = '';
    return llme;
  }

  if (mode === 'utm') {
    var countU = nums.length;
    if (countU < 2) {
      throw new Error(t('errUtm'));
    }
    var zoneU = 32.0;
    var idx = 0;
    var band = '';
    if (countU >= 3 && nums[0] >= 1.0 && nums[0] <= 60.0 && nums[0] === Math.floor(nums[0])) {
      zoneU = nums[0];
      idx = 1;
    }
    var zmU = /^\s*(\d{1,2})\s*([C-HJ-NP-X])\b/i.exec(raw);
    if (zmU) {
      zoneU = parseFloat(zmU[1]);
      band = zmU[2].toUpperCase();
    }
    var eastU = nums[idx];
    var northU = nums[idx + 1];
    var southU = (band !== '' && 'CDEFGHJKLM'.indexOf(band) !== -1) || northU < 0.0;
    if (northU < 0.0 && northU > -10000000.0) { northU = Math.abs(northU); }
    var llu = utmToLatLon(zoneU, eastU, northU, southU);
    var noteU = '';
    if (band === '' && countU === 2) {
      noteU = t('noteZone32');
    }
    return { lat: llu.lat, lon: llu.lon, note: noteU };
  }

  if (mode === 'auto') {
    var llmm = parseDmmString(raw);
    if (llmm !== null) {
      llmm.lon = normalizeLon(llmm.lon);
      llmm.note = t('noteDmm');
      return llmm;
    }
  }

  var count = nums.length;
  if (count >= 3 && nums[0] >= 1.0 && nums[0] <= 60.0 && nums[0] === Math.floor(nums[0])
    && nums[1] >= 100000.0 && nums[1] < 1000000.0 && nums[2] >= 0.0 && nums[2] <= 10000000.0) {
    var zone = nums[0];
    var bandA = '';
    var zm = /^\s*(\d{1,2})\s*([C-HJ-NP-X])\b/i.exec(raw);
    if (zm) {
      zone = parseFloat(zm[1]);
      bandA = zm[2].toUpperCase();
    }
    var east = nums[1];
    var north = nums[2];
    var south = (bandA !== '' && 'CDEFGHJKLM'.indexOf(bandA) !== -1) || north < 0.0;
    if (north < 0.0 && north > -10000000.0) { north = Math.abs(north); }
    var ll3 = utmToLatLon(zone, east, north, south);
    return { lat: ll3.lat, lon: ll3.lon, note: t('noteUtmZoneN').replace('{z}', Math.round(zone)) };
  }

  if (count === 2) {
    var c = classifyPair(nums[0], nums[1]);
    if (c !== null) {
      if (swap && c.type === 'wgs84') { var t2 = c.a; c.a = c.b; c.b = t2; }
      var llp = pairToLatLon(c);
      checkLatLon(llp.lat, llp.lon);
      return llp;
    }
  }

  throw new Error(t('errGeneral'));
}

function formatNum(v, dec) {
  var out = v.toFixed(dec);
  if (parseFloat(out) === 0 && out.charAt(0) === '-') { out = out.substring(1); }
  return out;
}

function isInChArea(lv95) {
  return lv95.east >= 2400000 && lv95.east <= 2900000 && lv95.north >= 1000000 && lv95.north <= 1350000;
}

function buildResults(lat, lon, forceLv95) {
  var lv95 = latlonToLv95(lat, lon);
  var utm = latlonToUtm(lat, lon);
  var merc = latlonToMercator(lat, lon);
  var mgrs = latlonToMgrs(lat, lon);
  var rows = [
    [t('rowWgs84'), formatNum(lat, 6) + ', ' + formatNum(lon, 6)],
    [t('rowDms'), formatDms(lat, lon)],
    [t('rowGeojson'), formatNum(lon, 6) + ', ' + formatNum(lat, 6)],
    [t('rowNad83'), formatNum(lat, 6) + ', ' + formatNum(lon, 6)]
  ];
  if (isInChArea(lv95) || forceLv95) {
    rows.push([t('rowLv95'), formatNum(lv95.east, 1) + ', ' + formatNum(lv95.north, 1)]);
  }
  rows.push(
    [t('rowUtm'), utm.zone + latBand(lat) + ' ' + formatNum(utm.east, 2) + ' ' + formatNum(utm.north, 2)],
    [t('rowMgrs'), mgrs],
    [t('rowMercator'), formatNum(merc.x, 2) + ', ' + formatNum(merc.y, 2)]
  );
  return rows;
}
;
(function () {
  var el = document.getElementById('q');
  var sel = document.getElementById('f');
  var swapEl = document.getElementById('swap');
  var autoclearEl = document.getElementById('autoclear');
  var mapToggle = document.getElementById('karte');
  var form = document.getElementById('conv-form');
  var errorBox = document.getElementById('error');
  var noteBox = document.getElementById('note');
  var resultsBox = document.getElementById('results');
  var resrows = document.getElementById('resrows');
  var maplinks = document.getElementById('maplinks');
  var mapFrame = document.getElementById('osmmap');
  var resultsTitle = document.getElementById('results-title');
  if (!el || !sel) { return; }

  var OKCHARS = '0123456789 ,;./*+-\t\'' + '’‘”´°"';
  var CFG = {
    wgs84:    { letters: '', max: 0 },
    lv95:     { letters: '', max: 0 },
    lv03:     { letters: '', max: 0 },
    mercator: { letters: '', max: 0 },
    dms:      { letters: 'NSEW', max: 2 },
    utm:      { letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', max: 2 },
    mgrs:     { letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', max: 3 },
    auto:     { letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', max: 3 }
  };

  function cleanInput(v) {
    var cfg = CFG[sel.value] || CFG.auto;
    v = v.toUpperCase();
    var out = '';
    var n = 0;
    for (var i = 0; i < v.length; i++) {
      var c = v.charAt(i);
      if (c >= 'A' && c <= 'Z') {
        if (cfg.letters.indexOf(c) !== -1 && n < cfg.max) { out += c; n++; }
      } else if (OKCHARS.indexOf(c) !== -1) {
        out += c;
      }
    }
    return out;
  }

  el.addEventListener('input', function () {
    var v = cleanInput(el.value);
    if (v !== el.value) { el.value = v; }
  });
  el.addEventListener('focus', function () {
    if (autoclearEl && autoclearEl.checked && el.value !== '') { el.value = ''; }
  });
  if (autoclearEl) {
    try {
      if (localStorage.getItem('konverter-autoclear') === '0') { autoclearEl.checked = false; }
    } catch (e) {}
    autoclearEl.addEventListener('change', function () {
      try { localStorage.setItem('konverter-autoclear', autoclearEl.checked ? '1' : '0'); } catch (e) {}
    });
  }
  if (mapToggle) {
    try {
      if (localStorage.getItem('konverter-karte') === '0') { mapToggle.checked = false; }
    } catch (e) {}
    mapToggle.addEventListener('change', function () {
      try { localStorage.setItem('konverter-karte', mapToggle.checked ? '1' : '0'); } catch (e) {}
      if (!mapToggle.checked) {
        mapFrame.src = 'about:blank';
        mapFrame.classList.add('hidden');
      } else {
        run();
      }
    });
  }
  var liveEl = document.getElementById('live');
  var goBtn = document.getElementById('goBtn');
  function syncGoBtn() {
    if (goBtn && liveEl) { goBtn.classList.toggle('hidden', liveEl.checked); }
  }
  try { if (liveEl && localStorage.getItem('konverter-live') === '0') { liveEl.checked = false; } } catch (e) {}
  syncGoBtn();
  if (liveEl) {
    liveEl.addEventListener('change', function () {
      try { localStorage.setItem('konverter-live', liveEl.checked ? '1' : '0'); } catch (e) {}
      syncGoBtn();
      if (liveEl.checked && el.value.trim() !== '') { run(); }
    });
  }
  var lv95ForceEl = document.getElementById('lv95force');
  try { if (lv95ForceEl && localStorage.getItem('konverter-lv95') === '1') { lv95ForceEl.checked = true; } } catch (e) {}
  if (lv95ForceEl) {
    lv95ForceEl.addEventListener('change', function () {
      try { localStorage.setItem('konverter-lv95', lv95ForceEl.checked ? '1' : '0'); } catch (e) {}
      if (el.value.trim() !== '') { run(); }
    });
  }

  var gpxAskEl = document.getElementById('gpxAsk');
  try { if (gpxAskEl && localStorage.getItem('konverter-gpxname') === '0') { gpxAskEl.checked = false; } } catch (e) {}
  if (gpxAskEl) {
    gpxAskEl.addEventListener('change', function () {
      try { localStorage.setItem('konverter-gpxname', gpxAskEl.checked ? '1' : '0'); } catch (e) {}
    });
  }
  var gpxDatumEl = document.getElementById('gpxDatum');
  try { if (gpxDatumEl && localStorage.getItem('konverter-gpxdatum')) { gpxDatumEl.value = localStorage.getItem('konverter-gpxdatum'); } } catch (e) {}
  if (gpxDatumEl) {
    gpxDatumEl.addEventListener('change', function () {
      try { localStorage.setItem('konverter-gpxdatum', gpxDatumEl.value); } catch (e) {}
    });
  }
  var gpxGeoEl = document.getElementById('gpxGeo');
  try { if (gpxGeoEl && localStorage.getItem('konverter-gpxgeo') === '0') { gpxGeoEl.checked = false; } } catch (e) {}
  if (gpxGeoEl) {
    gpxGeoEl.addEventListener('change', function () {
      try { localStorage.setItem('konverter-gpxgeo', gpxGeoEl.checked ? '1' : '0'); } catch (e) {}
    });
  }
  var gpxSortEl = document.getElementById('gpxSort');
  try { if (gpxSortEl && localStorage.getItem('konverter-gpxsort') === '1') { gpxSortEl.checked = true; } } catch (e) {}
  if (gpxSortEl) {
    gpxSortEl.addEventListener('change', function () {
      try { localStorage.setItem('konverter-gpxsort', gpxSortEl.checked ? '1' : '0'); } catch (e) {}
    });
  }
  var spracheEl = document.getElementById('sprache');
  var lang = 'de';
  try {
    var savedLang = localStorage.getItem('konverter-sprache');
    if (savedLang && KONV_LANGS.indexOf(savedLang) >= 0) { lang = savedLang; }
  } catch (e) {}
  spracheEl.value = lang;
  if (lang !== 'de') { ladeKonvTexte(lang, function () { applyLang(lang); }); }
  applyLang(lang);
  spracheEl.addEventListener('change', function () {
    var neu = spracheEl.value;
    ladeKonvTexte(neu, function () { applyLang(neu); });
    try { localStorage.setItem('konverter-sprache', neu); } catch (e) {}
    if (el.value.trim() !== '') { run(); }
  });

  var bildDropEl = document.getElementById('bildDrop');
  var bildFileEl = document.getElementById('bildFile');
  var bildMsgEl = document.getElementById('bildMsg');
  var bildManuellEl = document.getElementById('bildManuell');
  var bildManuellQEl = document.getElementById('bildManuellQ');
  var bildManuellBtnEl = document.getElementById('bildManuellBtn');
  var bildSchreibenRowEl = document.getElementById('bildSchreibenRow');
  var bildSchreibenEl = document.getElementById('bildSchreiben');
  var bildAktionenEl = document.getElementById('bildAktionen');
  var bildGpxEl = document.getElementById('bildGpx');
  var bildResetEl = document.getElementById('bildReset');
  try { var alteBildKeys = [], abi; for (abi = 0; abi < localStorage.length; abi++) { var abk = localStorage.key(abi); if (abk && abk.indexOf('konverter-bildgps-') === 0) { alteBildKeys.push(abk); } } for (abi = 0; abi < alteBildKeys.length; abi++) { localStorage.removeItem(alteBildKeys[abi]); } } catch (e) {}
  var bildLetzterBuffer = null;
  var bildLetzterName = '';
  var bildLetzterLat = null;
  var bildLetzterLon = null;
  function bildShow(key) { bildMsgEl.textContent = t(key); bildMsgEl.classList.remove('hidden'); }
  var bildAudio = null;
  function bildKlick() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { return; }
      if (!bildAudio) { bildAudio = new AC(); }
      if (bildAudio.state === 'suspended') { bildAudio.resume(); }
      var t0 = bildAudio.currentTime;
      [0, 0.085].forEach(function (dt, i) {
        var n = Math.floor(bildAudio.sampleRate * 0.03);
        var buf = bildAudio.createBuffer(1, n, bildAudio.sampleRate);
        var d = buf.getChannelData(0);
        for (var j = 0; j < n; j++) { d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / n, 2); }
        var src = bildAudio.createBufferSource();
        src.buffer = buf;
        var f = bildAudio.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = i ? 1700 : 2800;
        f.Q.value = 1.4;
        var g = bildAudio.createGain();
        g.gain.value = i ? 0.22 : 0.3;
        src.connect(f); f.connect(g); g.connect(bildAudio.destination);
        src.start(t0 + dt);
      });
    } catch (e) {}
  }
  function bildSnap() {
    bildDropEl.classList.remove('snap');
    void bildDropEl.offsetWidth;
    bildDropEl.classList.add('snap');
  }
  function bildAktionenZeigen(gpx) {
    bildGpxEl.classList.toggle('hidden', !gpx);
    bildAktionenEl.classList.remove('hidden');
  }
  function bildUse(lat, lon, noteKey) {
    bildManuellEl.classList.add('hidden');
    bildLetzterLat = lat;
    bildLetzterLon = lon;
    bildSchreibenRowEl.classList.toggle('hidden', !bildLetzterBuffer);
    bildAktionenZeigen(true);
    el.value = formatNum(lat, 6) + ', ' + formatNum(lon, 6);
    run();
    bildMsgEl.textContent = t(noteKey).replace('{a}', formatNum(lat, 6)).replace('{b}', formatNum(lon, 6));
    bildMsgEl.classList.remove('hidden');
  }
  function bildHandle(file) {
    if (!file) { return; }
    bildKlick();
    bildSnap();
    if (!file.size) { bildShow('errBildLesen'); bildAktionenZeigen(false); return; }
    if (!/\/(jpeg|tiff)$/i.test(file.type || '') && !/[-.](dng|cr2|nef|arw|orf|rw2)$/i.test(file.type || '') && !/\.(jpe?g|tiff?|dng|cr2|nef|arw|orf|rw2)$/i.test(file.name)) { bildShow('errBildTyp'); bildAktionenZeigen(false); return; }
    var reader = new FileReader();
    reader.onerror = function () { bildShow('errBildLesen'); bildAktionenZeigen(false); };
    reader.onload = function () {
      try {
        var gps = null;
        try { gps = exifGps(reader.result); } catch (e) { gps = null; }
        var istJpeg = /\/jpeg$/i.test(file.type || '') || /\.jpe?g$/i.test(file.name);
        bildLetzterBuffer = (!gps && istJpeg) ? reader.result : null;
        bildLetzterName = istJpeg ? file.name : '';
        if (gps) {
          bildUse(gps.lat, gps.lon, 'noteBildGps');
        } else {
          bildShow('noteBildKeinGps');
          bildAktionenZeigen(false);
          bildManuellEl.classList.remove('hidden');
          bildManuellQEl.focus();
        }
      } catch (e) {
        bildLetzterBuffer = null;
        bildShow('errBildLesen');
        bildAktionenZeigen(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }
  bildDropEl.addEventListener('click', function () { bildFileEl.click(); });
  bildDropEl.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bildFileEl.click(); } });
  bildFileEl.addEventListener('change', function () { if (bildFileEl.files[0]) { bildHandle(bildFileEl.files[0]); } bildFileEl.value = ''; });
  bildDropEl.addEventListener('dragover', function (e) { e.preventDefault(); bildDropEl.classList.add('drag'); });
  bildDropEl.addEventListener('dragleave', function () { bildDropEl.classList.remove('drag'); });
  bildDropEl.addEventListener('drop', function (e) { e.preventDefault(); bildDropEl.classList.remove('drag'); if (e.dataTransfer.files[0]) { bildHandle(e.dataTransfer.files[0]); } });
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });
  bildManuellBtnEl.addEventListener('click', function () {
    var q = bildManuellQEl.value.trim();
    if (q === '') { return; }
    try {
      var ll = parseInput(q, 'auto', false);
      bildUse(ll.lat, ll.lon, 'noteBildManuell');
    } catch (e) { bildShow('errBildManuell'); }
  });
  bildManuellQEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); bildManuellBtnEl.click(); } });
  bildSchreibenEl.addEventListener('click', function (ev) {
    if (!bildLetzterBuffer) { return; }
    var defName = (bildLetzterName.replace(/\.jpe?g$/i, '') || 'bild') + '-gps.jpg';
    var input = window.prompt(t('promptBildName'), defName);
    if (input === null) { return; }
    var outName = input.trim() !== '' ? input.trim() : defName;
    if (!/\.jpe?g$/i.test(outName)) { outName += '.jpg'; }
    var lat = bildLetzterLat, lon = bildLetzterLon;
    if (lat === null || lon === null) {
      var q = bildManuellQEl.value.trim();
      if (q === '') { return; }
      try { var ll = parseInput(q, 'auto', false); lat = ll.lat; lon = ll.lon; } catch (e) { bildShow('errBildManuell'); return; }
    }
    var out = null;
    try { out = exifWriteGps(bildLetzterBuffer, lat, lon); } catch (e) { out = null; }
    if (!out) { bildShow('errBildSchreiben'); return; }
    bildDownload(out, outName, lat, lon, ev.shiftKey || ev.altKey);
  });
  var bildDb = null;
  function bildDbOffen(cb) {
    try {
      if (bildDb) { cb(bildDb); return; }
      if (!window.indexedDB) { cb(null); return; }
      var rq = window.indexedDB.open('konverter-bildgps', 1);
      rq.onupgradeneeded = function () { try { rq.result.createObjectStore('cfg'); } catch (e) {} };
      rq.onsuccess = function () { bildDb = rq.result; cb(bildDb); };
      rq.onerror = function () { cb(null); };
    } catch (e) { cb(null); }
  }
  function bildBlobDownload(bytes, name) {
    var blob = new Blob([bytes], { type: 'image/jpeg' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 500);
  }
  function bildBereichLeeren() {
    bildAktionenEl.classList.add('hidden');
    bildManuellEl.classList.add('hidden');
    bildSchreibenRowEl.classList.add('hidden');
    bildManuellQEl.value = '';
    bildLetzterBuffer = null;
    bildLetzterName = '';
    bildLetzterLat = null;
    bildLetzterLon = null;
  }
  function bildDownload(bytes, name, lat, lon, erzwingen) {
    var fertig = function () { bildUse(lat, lon, 'noteBildSchreiben'); bildBereichLeeren(); };
    var fallback = function () { bildBlobDownload(bytes, name); fertig(); };
    var schreiben = function (d) {
      try {
        d.getFileHandle(name, { create: true }).then(function (fh) { return fh.createWritable(); }).then(function (w) { return w.write(bytes).then(function () { return w.close(); }); }).then(fertig)['catch'](fallback);
      } catch (e) { fallback(); }
    };
    bildDbOffen(function (db) {
      var hole = function (cb2) {
        if (!db) { cb2(null); return; }
        try {
          var tx = db.transaction('cfg', 'readonly');
          var rq = tx.objectStore('cfg').get('dir');
          rq.onsuccess = function () { cb2(rq.result || null); };
          rq.onerror = function () { cb2(null); };
        } catch (e) { cb2(null); }
      };
      hole(function (dir) {
        if (dir && !erzwingen) {
          try {
            var pr = dir.queryPermission ? dir.queryPermission({ mode: 'readwrite' }) : null;
            if (pr && pr.then) {
              pr.then(function (p) {
                if (p === 'granted') { schreiben(dir); return; }
                try {
                  dir.requestPermission({ mode: 'readwrite' }).then(function (p2) { if (p2 === 'granted') { schreiben(dir); } else { fallback(); } })['catch'](fallback);
                } catch (e) { fallback(); }
              })['catch'](fallback);
            } else { schreiben(dir); }
          } catch (e) { fallback(); }
        } else if (window.showDirectoryPicker) {
          try {
            window.showDirectoryPicker().then(function (d) {
              if (db) { try { var tx = db.transaction('cfg', 'readwrite'); tx.objectStore('cfg').put(d, 'dir'); } catch (e) {} }
              schreiben(d);
            })['catch'](fallback);
          } catch (e) { fallback(); }
        } else { fallback(); }
      });
    });
  }
  bildGpxEl.addEventListener('click', function () {
    if (bildLetzterLat === null || bildLetzterLon === null) { return; }
    var batchEl = document.getElementById('batchInput');
    var cur = batchEl.value.replace(/\s+$/, '');
    var line = formatNum(bildLetzterLat, 6) + ', ' + formatNum(bildLetzterLon, 6);
    batchEl.value = cur === '' ? line : cur + '\n' + line;
    bildShow('noteBildBatch');
  });
  bildResetEl.addEventListener('click', function () {
    bildAktionenEl.classList.add('hidden');
    bildManuellEl.classList.add('hidden');
    bildSchreibenRowEl.classList.add('hidden');
    bildMsgEl.classList.add('hidden');
    bildMsgEl.textContent = '';
    bildManuellQEl.value = '';
    bildLetzterBuffer = null;
    bildLetzterName = '';
    bildLetzterLat = null;
    bildLetzterLon = null;
  });


  var liveTimer = null;
  el.addEventListener('input', function () {
    if (!liveEl || !liveEl.checked) { return; }
    if (liveTimer) { clearTimeout(liveTimer); }
    liveTimer = setTimeout(run, 300);
  });

  sel.addEventListener('change', function () {
    var v = cleanInput(el.value);
    if (v !== el.value) { el.value = v; }
  });

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function showResult(lat, lon, note) {
    errorBox.classList.add('hidden');
    var latS = formatNum(lat, 6);
    var lonS = formatNum(lon, 6);
    resultsTitle.textContent = t('resultFor').replace('{a}', latS).replace('{b}', lonS);
    var rows = buildResults(lat, lon, lv95ForceEl && lv95ForceEl.checked);
    var html = '';
    for (var i = 0; i < rows.length; i++) {
      html += '<div class="resrow"><div class="lbl">' + esc(rows[i][0]) + '</div>' +
        '<div class="val">' + esc(rows[i][1]) + '</div>' +
        '<button type="button" class="copy" data-v="' + esc(rows[i][1]) + '">' + t('copyBtn') + '</button></div>';
    }
    resrows.innerHTML = html;
    var lv95 = latlonToLv95(lat, lon);
    maplinks.innerHTML =
      '<a href="https://www.google.com/maps/search/?api=1&amp;query=' + latS + ',' + lonS + '" target="_blank" rel="noopener">Google Maps</a>' +
      '<a href="https://map.geo.admin.ch/?E=' + formatNum(lv95.east, 0) + '&amp;N=' + formatNum(lv95.north, 0) + '" target="_blank" rel="noopener">Swisstopo (geo.admin.ch)</a>' +
      '<a href="https://www.openstreetmap.org/?mlat=' + latS + '&amp;mlon=' + lonS + '#map=16/' + latS + '/' + lonS + '" target="_blank" rel="noopener">OpenStreetMap</a>';
    if (mapToggle && mapToggle.checked) {
      var bbox = formatNum(lon - 0.004, 5) + ',' + formatNum(lat - 0.002, 5) + ',' + formatNum(lon + 0.004, 5) + ',' + formatNum(lat + 0.002, 5);
      mapFrame.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + bbox + '&layer=mapnik&marker=' + latS + ',' + lonS;
      mapFrame.classList.remove('hidden');
    } else {
      mapFrame.src = 'about:blank';
      mapFrame.classList.add('hidden');
    }
    resultsBox.classList.remove('hidden');
    if (note) {
      noteBox.textContent = note;
      noteBox.classList.remove('hidden');
    } else {
      noteBox.classList.add('hidden');
    }
    var copies = resrows.querySelectorAll('.copy');
    for (var j = 0; j < copies.length; j++) {
      copies[j].addEventListener('click', function () {
        var btn = this;
        var v = btn.getAttribute('data-v');
        if (navigator.clipboard) {
          navigator.clipboard.writeText(v).then(function () {
            var oldT = btn.textContent;
            btn.textContent = t('copied');
            setTimeout(function () { btn.textContent = oldT; }, 1200);
          });
        }
      });
    }
  }

  function showError(msg) {
    resultsBox.classList.add('hidden');
    noteBox.classList.add('hidden');
    mapFrame.classList.add('hidden');
    errorBox.textContent = t('notRecognized') + msg;
    errorBox.classList.remove('hidden');
  }

  function run() {
    var q = el.value;
    var mode = sel.value;
    var swap = swapEl.checked;
    if (q.trim() === '') {
      resultsBox.classList.add('hidden');
      noteBox.classList.add('hidden');
      mapFrame.classList.add('hidden');
      errorBox.classList.add('hidden');
      return;
    }
    try {
      var ll = parseInput(q, mode, swap);
      showResult(ll.lat, ll.lon, ll.note);
      var params = new URLSearchParams();
      params.set('q', q);
      params.set('f', mode);
      if (swap) { params.set('swap', '1'); }
      try { history.replaceState(null, '', '?' + params.toString()); } catch (e) {}
    } catch (e) {
      showError(e.message);
    }
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    run();
  });

  function copyFeedback(btn) {
    var oldT = btn.textContent;
    btn.textContent = t('copied');
    setTimeout(function () { btn.textContent = oldT; }, 1200);
  }
  var copyAllBtn = document.getElementById('copyAll');
  if (copyAllBtn) {
    copyAllBtn.addEventListener('click', function () {
      var rows = resrows.querySelectorAll('.resrow');
      var lines = [];
      for (var i = 0; i < rows.length; i++) {
        var lbl = rows[i].querySelector('.lbl');
        var val = rows[i].querySelector('.val');
        if (lbl && val) { lines.push(lbl.textContent + ': ' + val.textContent); }
      }
      if (navigator.clipboard && lines.length) {
        navigator.clipboard.writeText(lines.join('\n')).then(function () { copyFeedback(copyAllBtn); });
      }
    });
  }
  var copyLinkBtn = document.getElementById('copyLink');
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', function () {
      var params = new URLSearchParams();
      params.set('q', el.value);
      params.set('f', sel.value);
      if (swapEl.checked) { params.set('swap', '1'); }
      var url = location.origin + location.pathname + '?' + params.toString();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () { copyFeedback(copyLinkBtn); });
      }
    });
  }

  var batchInputEl = document.getElementById('batchInput');
  if (batchInputEl) {
    batchInputEl.addEventListener('input', function () {
      var v = batchInputEl.value.replace(/[\u0000-\u0008\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u{E0000}-\u{E007F}]/gu, '');
      if (v !== batchInputEl.value) { batchInputEl.value = v; }
    });
  }

  var batchLines = [];
  var batchPoints = [];
  function batchValue(lat, lon, target, forceLv95) {
    if (target === 'dms') { return formatDms(lat, lon); }
    if (target === 'lv95') { var v = latlonToLv95(lat, lon); if (!isInChArea(v) && !forceLv95) { return '\u2013'; } return formatNum(v.east, 2) + ', ' + formatNum(v.north, 2); }
    if (target === 'utm') { var u = latlonToUtm(lat, lon); return u.zone + latBand(lat) + ' ' + formatNum(u.east, 2) + ' ' + formatNum(u.north, 2); }
    if (target === 'mgrs') { return latlonToMgrs(lat, lon); }
    if (target === 'mercator') { var m = latlonToMercator(lat, lon); return formatNum(m.x, 0) + ', ' + formatNum(m.y, 0); }
    if (target === 'geojson') { return formatNum(lon, 6) + ', ' + formatNum(lat, 6); }
    return formatNum(lat, 6) + ', ' + formatNum(lon, 6);
  }
  function runBatch() {
    var out = document.getElementById('batchOut');
    var target = document.getElementById('batchTarget').value;
    var forceLv95 = lv95ForceEl && lv95ForceEl.checked;
    var lines = document.getElementById('batchInput').value.split(/\r?\n/);
    var html = '';
    batchLines = [];
    batchPoints = [];
    var count = 0;
    for (var i = 0; i < lines.length; i++) {
      var q = lines[i].trim();
      if (q === '') { continue; }
      count++;
      if (count > 1000) { break; }
      var val = null;
      try { var ll = parseInput(q, 'auto', false); val = batchValue(ll.lat, ll.lon, target, forceLv95); batchLines.push(val); batchPoints.push({ lat: ll.lat, lon: ll.lon }); } catch (e) { val = null; }
      html += '<div class="resrow"><div class="lbl">' + esc(q) + '</div>' +
        '<div class="val">' + (val === null ? '<span class="batcherr">' + t('fmtUnknown') + '</span>' : esc(val)) + '</div>' +
        (val === null ? '' : '<button type="button" class="copy" data-v="' + esc(val) + '">' + t('copyBtn') + '</button>') + '</div>';
    }
    if (count > 1000) { html += '<p class="help">' + t('cap1000') + '</p>'; }
    out.innerHTML = (html === '') ? '<p class="help">' + t('noLines') + '</p>' : html;
    var copies = out.querySelectorAll('.copy');
    for (var j = 0; j < copies.length; j++) {
      copies[j].addEventListener('click', function () {
        var btn = this;
        var v = btn.getAttribute('data-v');
        if (navigator.clipboard) {
          navigator.clipboard.writeText(v).then(function () { copyFeedback(btn); });
        }
      });
    }
  }
  document.getElementById('batchGo').addEventListener('click', runBatch);
  document.getElementById('batchCopy').addEventListener('click', function () {
    if (navigator.clipboard && batchLines.length) {
      navigator.clipboard.writeText(batchLines.join('\n')).then(function () { copyFeedback(this); }.bind(this));
    }
  });
  var gpxBusy = false;
  document.getElementById('batchGpx').addEventListener('click', function () {
    if (gpxBusy) { return; }
    var btn = this;
    runBatch();
    if (batchPoints.length < 2) {
      var old = btn.textContent;
      btn.textContent = t('min2');
      setTimeout(function () { btn.textContent = old; }, 1600);
      return;
    }
    var d = new Date();
    var fm = gpxDatumEl ? gpxDatumEl.value : 'de';
    var sep = (fm === 'de') ? '.' : '-';
    var day;
    if (fm === 'en') { day = ('0' + (d.getMonth() + 1)).slice(-2) + sep + ('0' + d.getDate()).slice(-2) + sep + d.getFullYear(); }
    else { day = ('0' + d.getDate()).slice(-2) + sep + ('0' + (d.getMonth() + 1)).slice(-2) + sep + d.getFullYear(); }
    var defName = 'route-' + day + '_' + batchPoints.length + 'punkte';
    if (gpxGeoEl && gpxGeoEl.checked) {
      gpxBusy = true;
      var oldTxt = btn.textContent;
      var geoKey = batchPoints.length ? batchPoints[0].lat.toFixed(4) + ',' + batchPoints[0].lon.toFixed(4) : '';
      if (geoKey !== '' && geoKey === lastGeoKey && lastGeoPlace) {
        gpxBusy = false;
        finishGpx(btn, lastGeoPlace, defName);
      } else {
        btn.textContent = t('gpxGeoWait');
        geoPlaceName(function (place) {
          gpxBusy = false;
          btn.textContent = oldTxt;
          if (place) { lastGeoKey = geoKey; lastGeoPlace = place; }
          finishGpx(btn, place || defName, defName);
        });
      }
    } else {
      finishGpx(btn, defName, defName);
    }
  });
  var lastGeoKey = '';
  var lastGeoPlace = '';
  function geoPlaceName(cb) {
    try {
      var p = batchPoints[0];
      var url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=10&accept-language=' + encodeURIComponent(curLang) + '&lat=' + encodeURIComponent(p.lat) + '&lon=' + encodeURIComponent(p.lon);
      fetch(url).then(function (r) { return r.json(); }).then(function (j) {
        var a = (j && j.address) ? j.address : {};
        var n = a.city || a.town || a.village || a.municipality || a.county || (j && j.display_name ? String(j.display_name).split(',')[0] : '');
        cb(n ? String(n).trim() : '');
      })['catch'](function () { cb(''); });
    } catch (e) { cb(''); }
  }
  function sortPointsNear(pts) {
    if (pts.length < 3) { return pts.slice(); }
    var rest = pts.slice(1);
    var out = [pts[0]];
    while (rest.length) {
      var last = out[out.length - 1];
      var bi = 0;
      var bd = Infinity;
      for (var i = 0; i < rest.length; i++) {
        var dLat = rest[i].lat - last.lat;
        var dLon = rest[i].lon - last.lon;
        var d = dLat * dLat + dLon * dLon;
        if (d < bd) { bd = d; bi = i; }
      }
      out.push(rest.splice(bi, 1)[0]);
    }
    return out;
  }
  function finishGpx(btn, baseName, defName) {
    var name = baseName;
    if (!gpxAskEl || gpxAskEl.checked) {
      var input = window.prompt(t('promptName'), baseName);
      if (input === null) { return; }
      name = input;
    }
    name = name.replace(/\.gpx$/i, '').replace(/[\\/:*?"<>|]/g, '-').trim();
    if (name === '') { name = defName; }
    var usePts = (gpxSortEl && gpxSortEl.checked) ? sortPointsNear(batchPoints) : batchPoints;
    var pts = '';
    for (var i = 0; i < usePts.length; i++) {
      pts += '<trkpt lat="' + formatNum(usePts[i].lat, 6) + '" lon="' + formatNum(usePts[i].lon, 6) + '"></trkpt>';
    }
    var gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Koordinaten-Konverter" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>' + esc(name) + '</name><trkseg>' + pts + '</trkseg></trk>\n</gpx>\n';
    var blob = new Blob([gpx], { type: 'application/gpx+xml' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name + '.gpx';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 500);
    copyFeedback(btn);
    batchInputEl.value = '';
    batchLines = [];
    batchPoints = [];
    var bout = document.getElementById('batchOut');
    if (bout) { bout.innerHTML = ''; }
  }

  document.querySelectorAll('.chip').forEach(function (b) {
    b.addEventListener('click', function () {
      el.value = b.getAttribute('data-q');
      sel.value = 'auto';
      run();
    });
  });

  var FONT_SIZES = [90, 100, 115, 130, 150];
  var fontIdx = 1;
  try {
    var savedFont = parseInt(localStorage.getItem('konverter-schrift'), 10);
    if (savedFont >= 0 && savedFont < FONT_SIZES.length) { fontIdx = savedFont; }
  } catch (e) {}
  function applyFont() {
    document.documentElement.style.fontSize = (16 * FONT_SIZES[fontIdx] / 100) + 'px';
    try { localStorage.setItem('konverter-schrift', String(fontIdx)); } catch (e) {}
  }
  applyFont();
  document.getElementById('fontMinus').addEventListener('click', function () {
    if (fontIdx > 0) { fontIdx--; applyFont(); }
  });
  document.getElementById('fontPlus').addEventListener('click', function () {
    if (fontIdx < FONT_SIZES.length - 1) { fontIdx++; applyFont(); }
  });
  document.getElementById('fontReset').addEventListener('click', function () {
    fontIdx = 1; applyFont();
  });

  var usp = new URLSearchParams(location.search);
  if (usp.get('q')) {
    el.value = usp.get('q');
    if (usp.get('f') && CFG.hasOwnProperty(usp.get('f'))) { sel.value = usp.get('f'); }
    if (usp.get('swap')) { swapEl.checked = true; }
    run();
  }
})();
;
(function () {
  try {
    if (location.protocol !== 'http:' && location.protocol !== 'https:') { return; }
    var d = { site: 'koordinaten', tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || ''), lang: (navigator.language || ''), ref: (document.referrer || '') };
    if (navigator.sendBeacon) { var fd = new FormData(); for (var k in d) { fd.append(k, d[k]); } navigator.sendBeacon('counter.php', fd); }
    else { fetch('counter.php', { method: 'POST', keepalive: true, body: new URLSearchParams(d) }).catch(function () {}); }
  } catch (e) {}
})();
