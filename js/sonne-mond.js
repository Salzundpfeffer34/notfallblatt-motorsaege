/* Hauptlogik für sonne-mond.html (aus dem HTML ausgelagert; braucht js/coords.js davor).
 * Lazy nachgeladen: js/tz-cities.js, js/ort-suche-data.js. */
'use strict';
var RAD = Math.PI / 180;
var DEG = 180 / Math.PI;
var DAY_MS = 86400000;

function toJD(ms) { return ms / DAY_MS + 2440587.5; }
function norm360(d) { return ((d % 360) + 360) % 360; }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function fmtHM(ms, utc) {
  if (utc) { var du = new Date(ms); return pad2(du.getUTCHours()) + ':' + pad2(du.getUTCMinutes()); }
  var z = new Date(ms + viewOffsetMs(ms));
  return pad2(z.getUTCHours()) + ':' + pad2(z.getUTCMinutes());
}
function fmtDur(ms) {
  var m = Math.max(0, Math.round(ms / 60000));
  return Math.floor(m / 60) + ' h ' + pad2(m % 60) + ' min';
}
function compass(az) {
  var dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(norm360(az) / 45) % 8];
}
function localDayStart(dateStr) {
  var p = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!p) { return null; }
  return new Date(+p[1], +p[2] - 1, +p[3], 0, 0, 0, 0).getTime();
}
var _tzDtfCache = {};
function tzDtf(tz) {
  if (!(tz in _tzDtfCache)) {
    try {
      _tzDtfCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) { _tzDtfCache[tz] = null; }
  }
  return _tzDtfCache[tz];
}
function tzOffsetMs(ms, tz) {
  var dtf = tz ? tzDtf(tz) : null;
  if (!dtf) { return -new Date(ms).getTimezoneOffset() * 60000; }
  var o = {};
  var parts = dtf.formatToParts(new Date(ms));
  for (var i = 0; i < parts.length; i++) { o[parts[i].type] = parts[i].value; }
  var asUTC = Date.UTC(+o.year, +o.month - 1, +o.day, (+o.hour) % 24, +o.minute, +o.second);
  return asUTC - Math.floor(ms / 1000) * 1000;
}
function viewTz() {
  return (typeof state !== 'undefined' && state && state.tz) ? state.tz : null;
}
function dayStartUtc(dateStr, tz) {
  var p = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!p) { return null; }
  var utcMid = Date.UTC(+p[1], +p[2] - 1, +p[3], 0, 0, 0);
  return utcMid - tzOffsetMs(utcMid - tzOffsetMs(utcMid, tz), tz);
}
function fmtUtcOffset(offMs) {
  var m = Math.round(offMs / 60000);
  var a = Math.abs(m);
  return 'UTC' + (m < 0 ? '-' : '+') + Math.floor(a / 60) + (a % 60 ? ':' + pad2(a % 60) : '');
}
function viewOffsetMs(ms) {
  if (typeof state !== 'undefined' && state && state.tzMin != null) { return state.tzMin * 60000; }
  return tzOffsetMs(ms, viewTz());
}
function dayStartView(dateStr) {
  var p = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!p) { return null; }
  var utcMid = Date.UTC(+p[1], +p[2] - 1, +p[3], 0, 0, 0);
  return utcMid - viewOffsetMs(utcMid - viewOffsetMs(utcMid));
}
/* St\u00e4dte-/Alias-Daten liegen in js/tz-cities.js und werden erst bei Bedarf per loadTzCities() nachgeladen. */
function normalizeTzKey(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
}
var TZ_CITY_MAP = {};
function tzCitiesLoaded() { return typeof TZ_CITY_LIST !== 'undefined' && typeof TZ_CITY_ALIASES !== 'undefined'; }
function tzBuildCityMap() {
  if (!tzCitiesLoaded()) { return; }
  TZ_CITY_LIST.forEach(function (row) {
    var iana = row[1];
    TZ_CITY_MAP[normalizeTzKey(row[0])] = iana;
    TZ_CITY_MAP[normalizeTzKey(iana)] = iana;
    (row[2] || []).forEach(function (a) { TZ_CITY_MAP[normalizeTzKey(a)] = iana; });
  });
  TZ_CITY_ALIASES.forEach(function (r) {
    var k = normalizeTzKey(r[0]);
    if (!TZ_CITY_MAP[k]) { TZ_CITY_MAP[k] = r[1]; }
  });
}
var _tzCitiesLoading = null;
function loadTzCities(cb) {
  if (tzCitiesLoaded()) { cb(true); return; }
  if (_tzCitiesLoading) { _tzCitiesLoading.push(cb); return; }
  _tzCitiesLoading = [cb];
  try {
    var sc = document.createElement('script');
    sc.src = 'js/tz-cities.js';
    sc.onload = function () {
      tzBuildCityMap();
      var cbs = _tzCitiesLoading; _tzCitiesLoading = null;
      for (var i = 0; i < cbs.length; i++) { cbs[i](tzCitiesLoaded()); }
    };
    sc.onerror = function () {
      var cbs = _tzCitiesLoading; _tzCitiesLoading = null;
      for (var i = 0; i < cbs.length; i++) { cbs[i](false); }
    };
    document.head.appendChild(sc);
  } catch (e) {
    _tzCitiesLoading = null;
    cb(false);
  }
}

/* Offline-Ortsdatenbank liegt in js/ort-db.js und wird erst bei Bedarf geladen (Reverse-Geocoding offline). */
var _ortDbLoading = null;
function ortDbLoaded() { return typeof ORT_DB !== 'undefined'; }
function loadOrtDb(cb) {
  if (ortDbLoaded()) { cb(true); return; }
  if (_ortDbLoading) { _ortDbLoading.push(cb); return; }
  _ortDbLoading = [cb];
  try {
    var sc = document.createElement('script');
    sc.src = 'js/ort-db.js';
    sc.onload = function () {
      var cbs = _ortDbLoading; _ortDbLoading = null;
      for (var i = 0; i < cbs.length; i++) { cbs[i](ortDbLoaded()); }
    };
    sc.onerror = function () {
      var cbs = _ortDbLoading; _ortDbLoading = null;
      for (var i = 0; i < cbs.length; i++) { cbs[i](false); }
    };
    document.head.appendChild(sc);
  } catch (e) {
    _ortDbLoading = null;
    cb(false);
  }
}

/* ETOPO1-Hoehenmodell: js/etopo1.js und das bin-Gitter werden erst bei Bedarf geladen (Hoehenanzeige). */
var _etopo1Loading = null;
var _etopo1Grid = null;
var _horizon = null;
function etopo1Loaded() { return typeof etopo1Elev === 'function'; }
function etopo1GridReady() { return _etopo1Grid !== null; }
function loadEtopo1(cb) {
  if (etopo1GridReady()) { cb(true); return; }
  if (_etopo1Loading) { _etopo1Loading.push(cb); return; }
  _etopo1Loading = [cb];
  var done = function (ok) {
    var cbs = _etopo1Loading; _etopo1Loading = null;
    for (var i = 0; i < cbs.length; i++) { cbs[i](ok); }
  };
  try {
    var go = function () {
      if (!etopo1Loaded()) { done(false); return; }
      etopo1Load('etopo1_ice_g_i2.bin', function (buf) { _etopo1Grid = buf; done(true); }, function () { done(false); });
    };
    if (etopo1Loaded()) { go(); return; }
    var sc = document.createElement('script');
    sc.src = 'js/etopo1.js';
    sc.onload = go;
    sc.onerror = function () { done(false); };
    document.head.appendChild(sc);
  } catch (e) {
    _etopo1Loading = null;
    cb(false);
  }
}

/* Ortssuche-Daten liegen in js/ort-suche-data.js und werden erst bei Bedarf geladen. */
var _ortDataLoading = null;
function ortDataLoaded() { return typeof EU_COUNTRIES !== 'undefined' && typeof CH_CANTONS !== 'undefined'; }
function loadOrtData(cb) {
  if (ortDataLoaded()) { cb(true); return; }
  if (_ortDataLoading) { _ortDataLoading.push(cb); return; }
  _ortDataLoading = [cb];
  try {
    var sc = document.createElement('script');
    sc.src = 'js/ort-suche-data.js';
    sc.onload = function () {
      var cbs = _ortDataLoading; _ortDataLoading = null;
      for (var i = 0; i < cbs.length; i++) { cbs[i](ortDataLoaded()); }
    };
    sc.onerror = function () {
      var cbs = _ortDataLoading; _ortDataLoading = null;
      for (var i = 0; i < cbs.length; i++) { cbs[i](false); }
    };
    document.head.appendChild(sc);
  } catch (e) {
    _ortDataLoading = null;
    cb(false);
  }
}
function tzAddZone(label, iana) {
  var k1 = normalizeTzKey(label), k2 = normalizeTzKey(iana);
  if (!TZ_CITY_MAP[k1]) { TZ_CITY_MAP[k1] = iana; }
  TZ_CITY_MAP[k2] = iana;
}
function tzZoneList() {
  try {
    if (typeof Intl.supportedValuesOf === 'function') { return Intl.supportedValuesOf('timeZone'); }
  } catch (e) {}
  return [];
}
(function addAllZones() {
  tzZoneList().forEach(function (z) {
    if (!z || z === 'UTC' || z.indexOf('Etc/') === 0) { return; }
    var parts = z.split('/');
    var city = parts[parts.length - 1].replace(/_/g, ' ');
    tzAddZone(city, z);
    if (parts.length > 2) { tzAddZone(parts.slice(1).join(' ').replace(/_/g, ' '), z); }
  });
})();
tzBuildCityMap();
function parseTzInput(v) {
  v = String(v == null ? '' : v).trim();
  if (!v) { return { clear: true }; }
  var m = v.match(/^utc\s*([+-]?\d{1,2})\s*(?::?(\d{2}))?$/i);
  if (m) {
    var sign = m[1].charAt(0) === '-' ? -1 : 1;
    var min = sign * (Math.abs(parseInt(m[1], 10)) * 60 + (m[2] ? parseInt(m[2], 10) : 0));
    if (Math.abs(min) <= 840) { return { tzMin: min }; }
    return { error: 'UTC-Offset max. ±14:00' };
  }
  var key = normalizeTzKey(v);
  if (TZ_CITY_MAP[key]) { return { tz: TZ_CITY_MAP[key], label: v }; }
  return { error: 'Unbekannt – z. B. UTC+2 oder Paris, New York, Tenerife …' };
}
function shiftDateStr(dateStr, days) {
  var p = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!p) { return String(dateStr); }
  var d = new Date(+p[1], +p[2] - 1, +p[3], 12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return dateStrOf(d.getTime());
}
function todayStr() { return dateStrOf(Date.now()); }
function fmtDateDE(dateStr) {
  var p = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return p ? p[3] + '.' + p[2] + '.' + p[1] : String(dateStr);
}

function dateStrOf(ms) {
  var d = new Date(ms + viewOffsetMs(ms));
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
}
var MONTH_NAMES_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
var DOW_NAMES_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
function monthLabel(year, month) { return MONTH_NAMES_DE[month] + ' ' + year; }
function calendarGrid(year, month) {
  var first = new Date(year, month, 1, 12, 0, 0, 0);
  var startDow = (first.getDay() + 6) % 7;
  var start = new Date(year, month, 1 - startDow, 12, 0, 0, 0);
  var cells = [];
  for (var i = 0; i < 42; i++) {
    var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12, 0, 0, 0);
    cells.push({ date: dateStrOf(d.getTime()), day: d.getDate(), inMonth: d.getMonth() === month });
  }
  return cells;
}
function stripLeadingWs(s) {
  return String(s == null ? '' : s).trimStart();
}
function normalizeQuery(q) {
  return String(q || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function queryVariants(q) {
  var orig = String(q || '').trim();
  var n = normalizeQuery(orig);
  var parts = n.split(' ').filter(Boolean);
  var out = [orig];
  if (n && n !== orig.toLowerCase()) { out.push(n); }
  if (parts.length > 1) { out.push(parts.slice(0, parts.length - 1).join(' ')); }
  var seen = {}, res = [];
  out.forEach(function (s) {
    var k = s.toLowerCase();
    if (s && !seen[k]) { seen[k] = 1; res.push(s); }
  });
  return res.slice(0, 3);
}
function levenshtein(a, b) {
  a = String(a); b = String(b);
  var m = a.length, n = b.length;
  if (!m) { return n; }
  if (!n) { return m; }
  var prev = [];
  for (var j = 0; j <= n; j++) { prev[j] = j; }
  for (var i = 1; i <= m; i++) {
    var cur = [i];
    for (var j2 = 1; j2 <= n; j2++) {
      cur[j2] = Math.min(prev[j2] + 1, cur[j2 - 1] + 1, prev[j2 - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j2 - 1) ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
function similarity(a, b) {
  var ta = normalizeQuery(a).split(' ').filter(Boolean);
  var tb = normalizeQuery(b).split(' ').filter(Boolean);
  if (!ta.length || !tb.length) { return 0; }
  var hit = 0;
  ta.forEach(function (t) {
    var found = tb.some(function (u) {
      return u === t || u.indexOf(t) === 0 || t.indexOf(u) === 0 || (t.length > 3 && u.length > 3 && levenshtein(t, u) <= 1);
    });
    if (found) { hit++; }
  });
  return hit / ta.length;
}
function isStrongOrtMatch(q, it) {
  var qt = normalizeQuery(q).split(' ').filter(Boolean);
  if (!qt.length) { return false; }
  var lt = normalizeQuery(String(it.name || '') + ' ' + String(it.label || '')).split(' ').filter(Boolean);
  if (!lt.length) { return false; }
  return qt.every(function (t) {
    return lt.some(function (u) {
      return u === t || (t.length >= 2 && u.indexOf(t) === 0) || (u.length > 3 && t.indexOf(u) === 0);
    });
  });
}
function rankOrtResults(list, q) {
  return (list || []).map(function (it) {
    var s = similarity(q, String(it.name || '') + ' ' + String(it.label || ''));
    return { it: it, s: s, strong: isStrongOrtMatch(q, it) ? 1 : 0 };
  }).sort(function (a, b) {
    if (b.strong !== a.strong) { return b.strong - a.strong; }
    return b.s - a.s;
  }).map(function (x) { return x.it; });
}
function usStateToken(q) {
  if (typeof US_STATE_NAMES === 'undefined') { return null; }
  var parts = normalizeQuery(q).split(' ').filter(Boolean);
  if (!parts.length) { return null; }
  var last = parts[parts.length - 1];
  if (US_STATE_NAMES[last]) { return US_STATE_NAMES[last]; }
  return null;
}
function detectCountryToken(q) {
  if (typeof COUNTRY_ALIASES === 'undefined') { return null; }
  var raw = String(q || '').trim().split(/\s+/).filter(Boolean);
  var parts = normalizeQuery(q).split(' ').filter(Boolean);
  for (var len = Math.min(4, parts.length); len >= 1; len--) {
    var key = parts.slice(parts.length - len).join(' ');
    if (!COUNTRY_ALIASES[key]) { continue; }
    if (len === 1 && key.length === 2 && !/[A-Z]/.test(raw[raw.length - 1] || '')) { continue; }
    return COUNTRY_ALIASES[key];
  }
  return null;
}
function buildSearchUrls(q, lat, lon) {
  var has = isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  var vb = '';
  if (has) {
    var d = 2;
    vb = '&viewbox=' + [Math.max(-180, lon - d), Math.max(-90, lat - d), Math.min(180, lon + d), Math.min(90, lat + d)].join(',') + '&bounded=0';
  }
  var cct = detectCountryToken(q);
  var cc = cct ? '&countrycodes=' + cct : '';
  return [
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&addressdetails=1&accept-language=de&q=' + encodeURIComponent(q) + vb + cc,
    'https://photon.komoot.io/api/?limit=8&q=' + encodeURIComponent(q) + (has ? '&lat=' + lat + '&lon=' + lon : '')
  ];
}
function dedupeOrtResults(list) {
  var seen = {}, out = [];
  (list || []).forEach(function (it) {
    if (!it || !isFinite(it.lat) || !isFinite(it.lon)) { return; }
    var k = it.lat.toFixed(3) + ',' + it.lon.toFixed(3) + '|' + normalizeQuery(it.name || '');
    if (!seen[k]) { seen[k] = 1; out.push(it); }
  });
  return out;
}
function haversineKm(lat1, lon1, lat2, lon2) {
  var R = 6371, p = Math.PI / 180;
  var dLat = (lat2 - lat1) * p, dLon = (lon2 - lon1) * p;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
var _ortDbCache = { db: null, list: null };
function ortDbParse(db) {
  if (_ortDbCache.db === db && _ortDbCache.list) { return _ortDbCache.list; }
  var list = [];
  String(db || '').split('\n').forEach(function (line) {
    var p = line.split('|');
    if (p.length < 3) { return; }
    var la = parseFloat(p[1]), lo = parseFloat(p[2]);
    if (!p[0] || !isFinite(la) || !isFinite(lo)) { return; }
    list.push({ name: p[0], lat: la, lon: lo, cc: p[3] || '' });
  });
  _ortDbCache = { db: db, list: list };
  return list;
}
function ortDbLookup(db, lat, lon, maxKm) {
  if (!db || !isFinite(lat) || !isFinite(lon)) { return null; }
  if (!isFinite(maxKm) || maxKm <= 0) { maxKm = 60; }
  var best = null, bd = maxKm;
  var list = ortDbParse(db);
  for (var i = 0; i < list.length; i++) {
    var e = list[i];
    var d = haversineKm(lat, lon, e.lat, e.lon);
    if (d <= bd) { bd = d; best = { name: e.name, lat: e.lat, lon: e.lon, distKm: d, cc: e.cc }; }
  }
  return best;
}
function nominatimSub(f) {
  var a = (f && f.address) || {};
  return [a.state || a.region || '', a.country || ''].filter(function (s) { return s !== ''; }).join(', ');
}
function photonLabel(p) {
  p = p || {};
  return [p.name, p.city, p.state, p.country].filter(function (s) { return s; }).join(', ');
}
function tzName() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; }
}
var TIME_SOURCES = [
  { name: 'www.cloudflare.com/cdn-cgi/trace', label: 'Cloudflare', mode: 'text', url: function () { return 'https://www.cloudflare.com/cdn-cgi/trace'; }, parse: function (s) { var m = String(s).match(/^ts=(\d+(?:\.\d+)?)\s*$/m); return m ? parseFloat(m[1]) * 1000 : NaN; } },
  { name: 'worldtimeapi.org/api/ip', label: 'worldtimeapi.org', mode: 'json', url: function () { return 'https://worldtimeapi.org/api/ip'; }, parse: function (j) { return j && isFinite(j.unixtime) ? j.unixtime * 1000 : NaN; } },
  { name: 'api.open-meteo.com (UTC, ohne Standort)', label: 'Open-Meteo', mode: 'json', url: function () { return 'https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current=temperature_2m&timezone=UTC'; }, parse: function (j) {
      if (!j || !j.current || !j.current.time) { return NaN; }
      var off = j.utc_offset_seconds || 0, sg = off < 0 ? '-' : '+', a = Math.abs(off);
      return Date.parse(j.current.time + ':00' + sg + pad2(Math.floor(a / 3600)) + ':' + pad2(Math.floor((a % 3600) / 60)));
    } },
  { name: 'HTTP-Date-Header (HEAD www.cloudflare.com)', label: 'HTTP-Date (Cloudflare)', mode: 'header', header: 'date', method: 'HEAD', url: function () { return 'https://www.cloudflare.com/cdn-cgi/trace'; }, parse: function (h) { return h ? Date.parse(h) : NaN; } }
];
function sunParams(jd) {
  var T = (jd - 2451545.0) / 36525.0;
  var L0 = norm360(280.46646 + T * (36000.76983 + T * 0.0003032));
  var M = norm360(357.52911 + T * (35999.05029 - 0.0001537 * T));
  var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  var C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T))
    + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T)
    + Math.sin(3 * M * RAD) * 0.000289;
  var trueLong = L0 + C;
  var omega = 125.04 - 1934.136 * T;
  var lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  var eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  var eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  var dec = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD));
  var y = Math.pow(Math.tan(eps * RAD / 2), 2);
  var eqTime = 4 * DEG * (y * Math.sin(2 * L0 * RAD)
    - 2 * e * Math.sin(M * RAD)
    + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD)
    - 0.5 * y * y * Math.sin(4 * L0 * RAD)
    - 1.25 * e * e * Math.sin(2 * M * RAD));
  var ra = Math.atan2(Math.cos(eps * RAD) * Math.sin(lambda * RAD), Math.cos(lambda * RAD));
  return { dec: dec, eqTime: eqTime, ra: ra };
}

function sunPosition(lat, lon, ms) {
  var p = sunParams(toJD(ms));
  var utcMin = (ms % DAY_MS) / 60000;
  if (utcMin < 0) { utcMin += 1440; }
  var H = (utcMin / 4 + lon + p.eqTime / 4 - 180) * RAD;
  var latR = lat * RAD;
  var sinAlt = Math.sin(latR) * Math.sin(p.dec) + Math.cos(latR) * Math.cos(p.dec) * Math.cos(H);
  var alt = Math.asin(clamp(sinAlt, -1, 1));
  var az = norm360(Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(latR) - Math.tan(p.dec) * Math.cos(latR)) * DEG + 180);
  return { alt: alt * DEG, az: az };
}

var SUN_CROSS = [-18, -12, -6, -4, -0.833, 0, 6];
var CROSS_NAMES = {
  '-18': 'Astronomische Dämmerung (Sonne −18°)',
  '-12': 'Nautische Dämmerung (Sonne −12°)',
  '-6': 'Bürgerliche Dämmerung (Sonne −6°)',
  '-4': 'Grenze Blaue Stunde (Sonne −4°)',
  '-0.833': 'Sonnenauf-/untergang (−0,83°, mit Refraktion)',
  '0': 'Sonne am Horizont (0°)',
  '6': 'Grenze Goldene Stunde (Sonne +6°)'
};

function shadowRatio(altDeg) {
  if (!(altDeg > 0.5)) { return null; }
  return 1 / Math.tan(altDeg * RAD);
}
function calIconSvg(day) {
  day = Math.max(1, Math.min(31, parseInt(day, 10) || 1));
  return '<svg viewBox="0 0 24 24" width="1.05em" height="1.05em" style="vertical-align:-0.15em">'
    + '<rect x="3" y="5" width="18" height="16" rx="2.5" fill="#fff" stroke="#c33" stroke-width="1.6"/>'
    + '<path d="M3 9.5h18" stroke="#c33" stroke-width="1.6"/>'
    + '<rect x="3" y="5" width="18" height="4.5" rx="2.5" fill="#c33"/>'
    + '<line x1="8" y1="3" x2="8" y2="6.5" stroke="#c33" stroke-width="1.8" stroke-linecap="round"/>'
    + '<line x1="16" y1="3" x2="16" y2="6.5" stroke="#c33" stroke-width="1.8" stroke-linecap="round"/>'
    + '<text x="12" y="18.6" text-anchor="middle" font-size="9.5" font-weight="700" fill="#33362f" font-family="system-ui,sans-serif">' + day + '</text></svg>';
}
function updateCalIcon() {
  var el = $('calIcon');
  if (!el) { return; }
  var day = parseInt(dateStrOf(nowMs()).slice(8, 10), 10);
  el.innerHTML = calIconSvg(day);
}
function sunEventsForDay(lat, lon, dayStartMs) {
  var d0 = new Date(dayStartMs);
  var utcMid = Date.UTC(d0.getFullYear(), d0.getMonth(), d0.getDate(), 0, 0, 0);
  var p = sunParams(toJD(utcMid + 43200000));
  var solarNoon = utcMid + 43200000 - (p.eqTime + 4 * lon) * 60000;
  while (solarNoon - (dayStartMs + 43200000) > 43200000) { solarNoon -= DAY_MS; }
  while ((dayStartMs + 43200000) - solarNoon > 43200000) { solarNoon += DAY_MS; }
  var latR = lat * RAD, sinLat = Math.sin(latR), cosLat = Math.cos(latR);
  var sinDec = Math.sin(p.dec), cosDec = Math.cos(p.dec);
  function cross(altDeg, sign) {
    var c = (Math.sin(altDeg * RAD) - sinLat * sinDec) / (cosLat * cosDec);
    if (c < -1 || c > 1) { return null; }
    return solarNoon + sign * (Math.acos(c) * DEG / 15) * 3600000;
  }
  var events = [];
  var byAlt = {};
  SUN_CROSS.forEach(function (a) {
    var ev = { alt: a, morning: cross(a, -1), evening: cross(a, +1) };
    events.push(ev);
    byAlt[String(a)] = ev;
  });
  var noonPos = sunPosition(lat, lon, solarNoon);
  var sunrise = byAlt['-0.833'].morning, sunset = byAlt['-0.833'].evening;
  return {
    solarNoon: solarNoon,
    noonAlt: noonPos.alt,
    noonAz: noonPos.az,
    events: events,
    byAlt: byAlt,
    sunrise: sunrise,
    sunset: sunset,
    dayLength: (sunrise != null && sunset != null) ? sunset - sunrise : null
  };
}

function shadowWindows(lat, lon, dayStartMs) {
  var ev = sunEventsForDay(lat, lon, dayStartMs);
  if (ev.sunrise == null || ev.sunset == null) { return { morning: null, evening: null }; }
  var d0 = new Date(dayStartMs);
  var utcMid = Date.UTC(d0.getFullYear(), d0.getMonth(), d0.getDate(), 0, 0, 0);
  var p = sunParams(toJD(utcMid + 43200000));
  var solarNoon = utcMid + 43200000 - (p.eqTime + 4 * lon) * 60000;
  while (solarNoon - (dayStartMs + 43200000) > 43200000) { solarNoon -= DAY_MS; }
  while ((dayStartMs + 43200000) - solarNoon > 43200000) { solarNoon += DAY_MS; }
  var latR = lat * RAD, sinLat = Math.sin(latR), cosLat = Math.cos(latR);
  var sinDec = Math.sin(p.dec), cosDec = Math.cos(p.dec);
  var c = (Math.sin(15 * RAD) - sinLat * sinDec) / (cosLat * cosDec);
  if (c < -1) { return { morning: null, evening: null }; }
  if (c > 1) { return { morning: [ev.sunrise, ev.sunset], evening: null }; }
  var half = (Math.acos(c) * DEG / 15) * 3600000;
  return { morning: [ev.sunrise, solarNoon - half], evening: [solarNoon + half, ev.sunset] };
}

function dayLengthSeries(lat, lon, fromStr, toStr, maxDays) {
  var a = localDayStart(fromStr), b = localDayStart(toStr);
  if (a == null || b == null) { return { error: 'Ungültiges Datum (Format JJJJ-MM-TT)' }; }
  if (b < a) { return { error: '«Bis» liegt vor «Von»' }; }
  var max = maxDays || 400;
  var n = Math.floor((b - a) / DAY_MS) + 1;
  var truncated = false;
  if (n > max) { n = max; truncated = true; }
  var days = [];
  for (var i = 0; i < n; i++) {
    var date = shiftDateStr(fromStr, i);
    var ds = dayStartView(date);
    if (ds == null) { continue; }
    var ev = sunEventsForDay(lat, lon, ds);
    days.push({ date: date, sunrise: ev.sunrise, sunset: ev.sunset, len: (ev.sunrise != null && ev.sunset != null) ? ev.sunset - ev.sunrise : null });
  }
  return { days: days, truncated: truncated };
}
function fmtDurHM(ms) {
  var m = Math.max(0, Math.round(ms / 60000));
  return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
}
function dayLengthChartSvg(days) {
  var pts = days.filter(function (d) { return d.len != null; });
  if (!pts.length) { return ''; }
  var min = Infinity, max = -Infinity;
  pts.forEach(function (d) { if (d.len < min) { min = d.len; } if (d.len > max) { max = d.len; } });
  if (max - min < 60000) { var mid = (min + max) / 2; min = mid - 60000; max = mid + 60000; }
  var W = 720, H = 200, padL = 56, padR = 14, padT = 26, padB = 34, n = days.length;
  function x(i) { return padL + (n === 1 ? (W - padL - padR) / 2 : i * (W - padL - padR) / (n - 1)); }
  function y(v) { return padT + (1 - (v - min) / (max - min)) * (H - padT - padB); }
  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:760px;height:auto;background:#fbfbf9;border:1px solid var(--line);border-radius:10px" role="img" aria-label="Liniendiagramm: Tageslänge pro Tag im Zeitraum">';
  s += '<text x="' + padL + '" y="14" font-size="11" font-weight="600" fill="var(--muted)">Tageslänge</text>';
  s += '<text x="' + ((W + padL) / 2).toFixed(0) + '" y="' + (H - 2) + '" text-anchor="middle" font-size="11" font-weight="600" fill="var(--muted)">Datum</text>';
  var STEPS = 4, g, v, gy;
  for (g = 0; g <= STEPS; g++) {
    v = min + (max - min) * g / STEPS;
    gy = y(v);
    s += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" stroke="' + (g === 0 || g === STEPS ? '#c8c8c0' : 'var(--line)') + '"/>';
    s += '<text x="' + (padL - 6) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + escHtml(fmtDurHM(v)) + '</text>';
  }
  var step = n <= 15 ? 1 : Math.ceil(n / 10);
  for (var i = 0; i < n; i += step) {
    s += '<line x1="' + x(i).toFixed(1) + '" y1="' + padT + '" x2="' + x(i).toFixed(1) + '" y2="' + (H - padB) + '" stroke="var(--line)"/>';
    s += '<text x="' + x(i).toFixed(1) + '" y="' + (H - padB + 14) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + escHtml(n > 31 ? fmtDateDE(days[i].date).slice(0, 5) : fmtDateDE(days[i].date)) + '</text>';
  }
  if ((n - 1) % step !== 0) {
    s += '<text x="' + x(n - 1).toFixed(1) + '" y="' + (H - padB + 14) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + escHtml(n > 31 ? fmtDateDE(days[n - 1].date).slice(0, 5) : fmtDateDE(days[n - 1].date)) + '</text>';
  }
  var pl = [];
  days.forEach(function (d, i) { if (d.len != null) { pl.push(x(i).toFixed(1) + ',' + y(d.len).toFixed(1)); } });
  if (pl.length > 1) {
    s += '<polygon points="' + padL + ',' + (H - padB) + ' ' + pl.join(' ') + ' ' + (W - padR) + ',' + (H - padB) + '" fill="rgba(233,138,60,0.12)"/>';
    s += '<polyline points="' + pl.join(' ') + '" fill="none" stroke="#e98a3c" stroke-width="2.2"/>';
  }
  days.forEach(function (d, i) {
    if (d.len != null) {
      s += '<circle class="dlpt" data-i="' + i + '" cx="' + x(i).toFixed(1) + '" cy="' + y(d.len).toFixed(1) + '" r="3" fill="#e98a3c"><title>' + escHtml(fmtDateDE(d.date) + ': ' + fmtDur(d.len)) + '</title></circle>';
    }
  });
  return s + '</svg>';
}
var MONTHS_SHORT = ['Jan', 'Feb', 'M\u00e4r', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
function yearLenChartSvg(days, todayStr) {
  var pts = days.filter(function (d) { return d.len != null; });
  if (!pts.length) { return ''; }
  var min = Infinity, max = -Infinity, minD = null, maxD = null;
  pts.forEach(function (d) { if (d.len < min) { min = d.len; minD = d; } if (d.len > max) { max = d.len; maxD = d; } });
  if (max - min < 3600000) { var mid = (min + max) / 2; min = mid - 1800000; max = mid + 1800000; }
  var W = 720, H = 240, padL = 58, padR = 14, padT = 34, padB = 30, n = days.length;
  function x(i) { return padL + (n === 1 ? (W - padL - padR) / 2 : i * (W - padL - padR) / (n - 1)); }
  function y(v) { return padT + (1 - (v - min) / (max - min)) * (H - padT - padB); }
  var year = n ? days[0].date.slice(0, 4) : '';
  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:760px;height:auto;background:#fbfbf9;border:1px solid var(--line);border-radius:10px" role="img" aria-label="Jahresgrafik: Tagesl\u00e4nge pro Tag">';
  s += '<text x="' + padL + '" y="15" font-size="11" font-weight="700" fill="var(--muted)">Tagesl\u00e4nge ' + escHtml(year) + '</text>';
  if (maxD && minD) {
    s += '<text x="' + (W - padR) + '" y="15" text-anchor="end" font-size="10.5" fill="var(--muted)">l\u00e4ngster <tspan font-weight="700">' + escHtml(fmtDateDE(maxD.date)) + '</tspan> (' + fmtDurHM(max) + ') \u00b7 k\u00fcrzester <tspan font-weight="700">' + escHtml(fmtDateDE(minD.date)) + '</tspan> (' + fmtDurHM(min) + ')</text>';
  }
  var STEPS = 4, g, v, gy;
  for (g = 0; g <= STEPS; g++) {
    v = min + (max - min) * g / STEPS; gy = y(v);
    s += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" stroke="' + (g === 0 || g === STEPS ? '#c8c8c0' : 'var(--line)') + '"/>';
    s += '<text x="' + (padL - 6) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + escHtml(fmtDurHM(v)) + '</text>';
  }
  var lastMo = '';
  days.forEach(function (d, i) {
    var mo = d.date.slice(5, 7);
    if (mo !== lastMo) {
      lastMo = mo;
      s += '<line x1="' + x(i).toFixed(1) + '" y1="' + padT + '" x2="' + x(i).toFixed(1) + '" y2="' + (H - padB) + '" stroke="var(--line)"/>';
      s += '<text x="' + x(i).toFixed(1) + '" y="' + (H - padB + 15) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + escHtml(MONTHS_SHORT[(+mo) - 1] || mo) + '</text>';
    }
  });
  var pl = [];
  days.forEach(function (d, i) { if (d.len != null) { pl.push(x(i).toFixed(1) + ',' + y(d.len).toFixed(1)); } });
  if (pl.length > 1) {
    s += '<polygon points="' + padL + ',' + (H - padB) + ' ' + pl.join(' ') + ' ' + (W - padR) + ',' + (H - padB) + '" fill="rgba(233,138,60,0.12)"/>';
    s += '<polyline points="' + pl.join(' ') + '" fill="none" stroke="#e98a3c" stroke-width="2.2"/>';
  }
  if (todayStr) {
    days.forEach(function (d, i) {
      if (d.date === todayStr && d.len != null) {
        s += '<circle data-today="1" cx="' + x(i).toFixed(1) + '" cy="' + y(d.len).toFixed(1) + '" r="5" fill="#2f6db3" stroke="#fff" stroke-width="1.5"><title>Heute ' + escHtml(fmtDateDE(d.date)) + ': ' + escHtml(fmtDur(d.len)) + '</title></circle>';
      }
    });
  }
  return s + '</svg>';
}
function visibleDays(days, showAll, limit) {
  if (showAll || days.length <= limit) { return { list: days, hidden: 0 }; }
  if (limit <= 1) { return { list: days.slice(0, 1), hidden: days.length - 1 }; }
  var n = days.length, seen = {}, list = [];
  for (var i = 0; i < limit; i++) {
    var p = Math.round(i * (n - 1) / (limit - 1));
    if (!seen[p]) { seen[p] = 1; list.push(days[p]); }
  }
  return { list: list, hidden: n - list.length };
}
function fmtDeltaCsv(delta, deltaMs) {
  if (delta == null) { return ''; }
  if (delta !== 0) { return String(delta); }
  var s = Math.round(deltaMs / 1000);
  return (s > 0 ? '+' : '') + s + 's';
}
function dayLenCsv(days, meta) {
  meta = meta || {};
  var hasLL = (typeof meta.lat === 'number' && typeof meta.lon === 'number' && isFinite(meta.lat) && isFinite(meta.lon));
  var hasTZ = (typeof meta.tz === 'string' && !!meta.tz);
  var out = [];
  if (meta.name || hasLL || hasTZ || meta.from || meta.to) {
    var parts = [];
    if (meta.name) { parts.push('Ort: ' + String(meta.name).replace(/[;\r\n]/g, ',')); }
    if (hasLL) { parts.push('Lat: ' + meta.lat + '; Lon: ' + meta.lon); }
    if (hasTZ) { parts.push('TZ: ' + meta.tz); }
    if (meta.from || meta.to) { parts.push('Zeitraum: ' + (meta.from || '') + ' bis ' + (meta.to || '')); }
    parts.push('Export: ' + (meta.export || new Date().toISOString()));
    out.push('# ' + parts.join('; '));
  }
  out.push('Datum;Aufgang;Untergang;Tageslaenge_min;Tageslaenge_h;Delta' + (hasLL ? ';Lat;Lon' : '') + (hasTZ ? ';TZ' : ''));
  var prev = null;
  days.forEach(function (d) {
    var deltaMs = (prev && d.len != null && prev.len != null) ? (d.len - prev.len) : null;
    var delta = deltaMs != null ? Math.round(deltaMs / 60000) : null;
    var row = [d.date, d.sunrise != null ? fmtHM(d.sunrise) : '', d.sunset != null ? fmtHM(d.sunset) : '', d.len != null ? Math.round(d.len / 60000) : '', d.len != null ? (d.len / 3600000).toFixed(2).replace('.', ',') : '', fmtDeltaCsv(delta, deltaMs)];
    if (hasLL) { row.push(String(meta.lat), String(meta.lon)); }
    if (hasTZ) { row.push(meta.tz); }
    out.push(row.join(';'));
    if (d.len != null) { prev = d; }
  });
  return out.join('\n') + '\n';
}
function dayLenChartSvgFile(days) {
  var svg = dayLengthChartSvg(days);
  if (!svg) { return ''; }
  return svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replace(/var\(--line\)/g, '#e3e3dd')
    .replace(/var\(--muted\)/g, '#6b6b64');
}

function dayRowsWithDelta(days) {
  var prev = null, out = [];
  days.forEach(function (d, i) {
    var deltaMs = (prev && d.len != null && prev.len != null) ? (d.len - prev.len) : null;
    out.push({ d: d, delta: deltaMs != null ? Math.round(deltaMs / 60000) : null, deltaMs: deltaMs, i: i });
    if (d.len != null) { prev = d; }
  });
  return out;
}
function fmtDayDelta(delta, deltaMs) {
  if (delta == null) { return '–'; }
  if (delta === 0) {
    var s = Math.round(deltaMs / 1000);
    return '<span class="d' + (deltaMs > 0 ? 'up' : deltaMs < 0 ? 'dn' : 'eq') + '">' + (deltaMs > 0 ? '▲ +' : deltaMs < 0 ? '▼ ' : '') + s + ' s</span>';
  }
  return '<span class="d' + (delta > 0 ? 'up' : 'dn') + '">' + (delta > 0 ? '▲ +' : '▼ ') + delta + ' min</span>';
}
function sortDayRows(rows, key, dir) {
  var kf = ({ datum: function (r) { return r.d.date; }, auf: function (r) { return r.d.sunrise; }, unter: function (r) { return r.d.sunset; }, laenge: function (r) { return r.d.len; }, delta: function (r) { return r.delta; } })[key] || function (r) { return r.d.date; };
  var s = rows.slice();
  s.sort(function (a, b) {
    var x = kf(a), y = kf(b);
    if (x == null && y == null) { return 0; }
    if (x == null) { return 1; }
    if (y == null) { return -1; }
    if (x < y) { return -dir; }
    if (x > y) { return dir; }
    return a.i - b.i;
  });
  return s;
}
function dayLengthExtremes(lat, lon, year, todayStr) {
  function scan(mo0, d0, mo1, d1, pickMax) {
    var best = null;
    for (var mo = mo0; mo <= mo1; mo++) {
      for (var d = d0; d <= d1; d++) {
        var ds = Date.UTC(year, mo, d, 12, 0, 0);
        var ev = sunEventsForDay(lat, lon, ds);
        if (ev.dayLength == null) { continue; }
        if (!best || (pickMax ? ev.dayLength > best.len : ev.dayLength < best.len)) { best = { dayStart: ds, len: ev.dayLength }; }
      }
    }
    return best;
  }
  var out = { longest: scan(5, 18, 5, 24, true), shortest: scan(11, 19, 11, 24, false), today: null };
  if (todayStr) {
    var tds = localDayStart(todayStr);
    var tev = sunEventsForDay(lat, lon, tds);
    if (tev.dayLength != null) { out.today = { dayStart: tds, len: tev.dayLength }; }
  }
  return out;
}

var MOON_TERMS_LR = [
  [0,0,1,0,6288774,-20905355], [2,0,-1,0,1274027,-3699111], [2,0,0,0,658314,-2955968], [0,0,2,0,213618,-569925],
  [0,1,0,0,-185116,48888], [0,0,0,2,-114332,-3149], [2,0,-2,0,58793,246158], [2,-1,-1,0,57066,-152138],
  [2,0,1,0,53322,-170733], [2,-1,0,0,45758,-204586], [0,1,-1,0,-40923,-129620], [1,0,0,0,-34720,108743],
  [0,1,1,0,-30383,104755], [2,0,0,-2,15327,10321], [0,0,1,2,-12528,0], [0,0,1,-2,10980,79661],
  [4,0,-1,0,10675,-34782], [0,0,3,0,10034,-23210], [4,0,-2,0,8548,-21636], [2,1,-1,0,-7888,24208],
  [2,1,0,0,-6766,30824], [1,0,-1,0,-5163,-8379], [1,1,0,0,4987,-16675], [2,-1,1,0,4036,-12831],
  [2,0,2,0,3994,-10445], [4,0,0,0,3861,-11650], [2,0,-3,0,3665,14403], [0,1,-2,0,-2689,-7003],
  [2,0,-1,2,-2602,0], [2,-1,-2,0,2390,10056], [1,0,1,0,-2348,6322], [2,-2,0,0,2236,-9884],
  [0,1,2,0,-2120,5751], [0,2,0,0,-2069,0], [2,-2,-1,0,2048,-4950], [2,0,1,-2,-1773,4130],
  [2,0,0,2,-1595,0], [4,-1,-1,0,1215,-3958], [0,0,2,2,-1110,0], [3,0,-1,0,-892,3258],
  [2,1,1,0,-810,2616], [4,-1,-2,0,759,-1897], [0,2,-1,0,-713,-2117], [2,2,-1,0,-700,2354],
  [2,1,-2,0,691,0], [2,-1,0,-2,596,0], [4,0,1,0,549,-1423], [0,0,4,0,537,-1117],
  [4,-1,0,0,520,-1571], [1,0,-2,0,-487,-1739], [2,1,0,-2,-399,0], [0,0,2,-2,-381,-4421],
  [1,1,1,0,351,0], [3,0,-2,0,-340,0], [4,0,-3,0,330,0], [2,-1,2,0,327,0],
  [0,2,1,0,-323,1165], [1,1,-1,0,299,0], [2,0,3,0,294,0], [2,0,-1,-2,0,8752],
];
var MOON_TERMS_B = [
  [0,0,0,1,5128122], [0,0,1,1,280602], [0,0,1,-1,277693], [2,0,0,-1,173237],
  [2,0,-1,1,55413], [2,0,-1,-1,46271], [2,0,0,1,32573], [0,0,2,1,17198],
  [2,0,1,-1,9266], [0,0,2,-1,8822], [2,-1,0,-1,8216], [2,0,-2,-1,4324],
  [2,0,1,1,4200], [2,1,0,-1,-3359], [2,-1,-1,1,2463], [2,-1,0,1,2211],
  [2,-1,-1,-1,2065], [0,1,-1,-1,-1870], [4,0,-1,-1,1828], [0,1,0,1,-1794],
  [0,0,0,3,-1749], [0,1,-1,1,-1565], [1,0,0,1,-1491], [0,1,1,1,-1475],
  [0,1,1,-1,-1410], [0,1,0,-1,-1344], [1,0,0,-1,-1335], [0,0,3,1,1107],
  [4,0,0,-1,1021], [4,0,-1,1,833], [0,0,1,-3,777], [4,0,-2,1,671],
  [2,0,0,-3,607], [2,0,2,-1,596], [2,-1,1,-1,491], [2,0,-2,1,-451],
  [0,0,3,-1,439], [2,0,2,1,422], [2,0,-3,-1,421], [2,1,-1,1,-366],
  [2,1,0,1,-351], [4,0,0,1,331], [2,-1,1,1,315], [2,-2,0,-1,302],
  [0,0,1,3,-283], [2,1,1,-1,-229], [1,1,0,-1,223], [1,1,0,1,223],
  [0,1,-2,-1,-220], [2,1,-1,-1,-220], [1,0,1,1,-185], [2,-1,-2,-1,181],
  [0,1,2,1,-177], [4,0,-2,-1,176], [4,-1,-1,-1,166], [1,0,1,-1,-164],
  [4,0,1,-1,132], [1,0,-1,-1,-119], [4,-1,0,-1,115], [2,-2,0,1,107],
];
function moonEcliptic(ms) {
  var T = (toJD(ms) - 2451545.0) / 36525.0;
  var Lp = 218.3164477 + (481267.88123421 + (-0.0015786 + (1 / 538841 - T / 65194000) * T) * T) * T;
  Lp += (-25.858 / 3600) * T * T;
  var D = 297.8501921 + (445267.1114034 + (-0.0018819 + (1 / 545868 - T / 113065000) * T) * T) * T;
  var M = 357.5291092 + (35999.0502909 + (-0.0001536 + T / 24490000) * T) * T;
  var Mp = 134.9633964 + (477198.8675055 + (0.0087414 + (1 / 69699.9 + T / 14712000) * T) * T) * T;
  var F = 93.2720950 + (483202.0175233 + (-0.0036539 + (-1 / 3526000 + T / 863310000) * T) * T) * T;
  var A1 = 119.75 + 131.849 * T, A2 = 53.09 + 479264.290 * T, A3 = 313.45 + 481266.484 * T;
  var E = 1 + (-0.002516 - 0.0000074 * T) * T, E2 = E * E;
  var Dr = norm360(D) * RAD, Mr = norm360(M) * RAD, Mpr = norm360(Mp) * RAD, Fr = norm360(F) * RAD;
  var Lpr = norm360(Lp) * RAD, A1r = norm360(A1) * RAD, A2r = norm360(A2) * RAD, A3r = norm360(A3) * RAD;
  var sigl = 0, sigr = 0, sigb = 0, i, t, arg, c;
  for (i = 0; i < MOON_TERMS_LR.length; i++) {
    t = MOON_TERMS_LR[i];
    arg = t[0] * Dr + t[1] * Mr + t[2] * Mpr + t[3] * Fr;
    c = t[4];
    if (Math.abs(t[1]) === 1) { c *= E; } else if (Math.abs(t[1]) === 2) { c *= E2; }
    sigl += c * Math.sin(arg);
    c = t[5];
    if (Math.abs(t[1]) === 1) { c *= E; } else if (Math.abs(t[1]) === 2) { c *= E2; }
    sigr += c * Math.cos(arg);
  }
  sigl += 3958 * Math.sin(A1r) + 1962 * Math.sin(Lpr - Fr) + 318 * Math.sin(A2r);
  for (i = 0; i < MOON_TERMS_B.length; i++) {
    t = MOON_TERMS_B[i];
    arg = t[0] * Dr + t[1] * Mr + t[2] * Mpr + t[3] * Fr;
    c = t[4];
    if (Math.abs(t[1]) === 1) { c *= E; } else if (Math.abs(t[1]) === 2) { c *= E2; }
    sigb += c * Math.sin(arg);
  }
  sigb += -2235 * Math.sin(Lpr) + 382 * Math.sin(A3r) + 175 * Math.sin(A1r - Fr) + 175 * Math.sin(A1r + Fr) + 127 * Math.sin(Lpr - Mpr) - 115 * Math.sin(Lpr + Mpr);
  var lam = norm360(Lp + sigl / 1000000);
  var beta = sigb / 1000000;
  var dist = 385000.56 + sigr / 1000;
  var eps = (23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60) * RAD;
  var lamR = lam * RAD, betaR = beta * RAD;
  var ra = Math.atan2(Math.sin(lamR) * Math.cos(eps) - Math.tan(betaR) * Math.sin(eps), Math.cos(lamR));
  var dec = Math.asin(clamp(Math.sin(betaR) * Math.cos(eps) + Math.cos(betaR) * Math.sin(eps) * Math.sin(lamR), -1, 1));
  return { ra: ra * DEG, dec: dec * DEG, b: beta, lam: lam, dist: dist };
}
function moonPosition(lat, lon, ms) {
  var e = moonEcliptic(ms);
  var jd = toJD(ms);
  var gmst = norm360(280.46061837 + 360.98564736629 * (jd - 2451545));
  var H = (norm360(gmst + lon) - e.ra) * RAD;
  var latR = lat * RAD, decR = e.dec * RAD;
  var sinAlt = Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(H);
  var alt = Math.asin(clamp(sinAlt, -1, 1));
  alt -= Math.asin(6378.14 / e.dist) * Math.cos(alt);
  var az = norm360(Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(latR) - Math.tan(decR) * Math.cos(latR)) * DEG + 180);
  return { alt: alt * DEG, az: az, ra: e.ra, dec: e.dec * RAD, dist: e.dist };
}

function moonIllumination(ms) {
  var p = sunParams(toJD(ms));
  var m = moonPosition(0, 0, ms);
  var sRa = p.ra, sDec = p.dec, mRa = m.ra * RAD, mDec = m.dec;
  var phi = Math.acos(clamp(Math.sin(sDec) * Math.sin(mDec) + Math.cos(sDec) * Math.cos(mDec) * Math.cos(sRa - mRa), -1, 1));
  var inc = Math.atan2(149598000 * Math.sin(phi), m.dist - 149598000 * Math.cos(phi));
  var angle = Math.atan2(Math.cos(sDec) * Math.sin(sRa - mRa), Math.sin(sDec) * Math.cos(mDec) - Math.cos(sDec) * Math.sin(mDec) * Math.cos(sRa - mRa));
  var fraction = (1 + Math.cos(inc)) / 2;
  var phase = 0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / Math.PI;
  return { fraction: fraction, phase: ((phase % 1) + 1) % 1 };
}

var MOON_PHASE_NAMES = ['Neumond', 'Sichelmond (zunehmend)', 'Halbmond (erstes Viertel)', 'Zunehmender Mond', 'Vollmond', 'Abnehmender Mond', 'Halbmond (letztes Viertel)', 'Sichelmond (abnehmend)'];

function moonPhaseInfo(ms) {
  var jd = toJD(ms);
  var age = ((jd - 2451550.1) % 29.530588853 + 29.530588853) % 29.530588853;
  var ill = moonIllumination(ms);
  return { fraction: ill.fraction, phase: ill.phase, age: age, name: MOON_PHASE_NAMES[Math.round(ill.phase * 8) % 8], waxing: ill.phase < 0.5 };
}
var MOON_PHASE_EMOJI = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
function moonPhaseEmoji(phase) {
  var p = ((phase % 1) + 1) % 1;
  return MOON_PHASE_EMOJI[Math.round(p * 8) % 8];
}

function fullMoonsInMonth(y, mo) {
  var out = [];
  var start = Date.UTC(y, mo, 1), end = Date.UTC(y, mo + 1, 1), step = 3600000;
  var prev = moonPhaseInfo(start).phase;
  for (var t = start + step; t <= end; t += step) {
    var p = moonPhaseInfo(t).phase;
    if (prev < 0.5 && p >= 0.5) {
      var lo = t - step, hi = t;
      for (var i = 0; i < 40; i++) { var mid = (lo + hi) / 2; if (moonPhaseInfo(lo).phase < 0.5) { lo = mid; } else { hi = mid; } }
      out.push((lo + hi) / 2);
    }
    prev = p;
  }
  return out;
}
function eclipseAt(fmMs) {
  var best = fmMs, bf = -1;
  for (var t = fmMs - 30 * 3600000; t <= fmMs + 30 * 3600000; t += 600000) {
    var f = moonIllumination(t).fraction;
    if (f > bf) { bf = f; best = t; }
  }
  var lo = best - 600000, hi = best + 600000;
  for (var i = 0; i < 45; i++) { var mid2 = (lo + hi) / 2; if (moonIllumination(mid2).fraction > moonIllumination(lo).fraction) { lo = mid2; } else { hi = mid2; } }
  var opp = (lo + hi) / 2;
  var e = moonEcliptic(opp);
  var u = 0.7424 * (385000.56 / e.dist);
  var pen = 1.2847 * (385000.56 / e.dist);
  var rm = Math.asin(1737.4 / e.dist) * DEG;
  var ab = Math.abs(e.b);
  var type = 'keine';
  if (ab < u - rm) { type = 'total'; } else if (ab < u + rm) { type = 'partiell'; } else if (ab < pen + rm) { type = 'halbschatten'; }
  return { opp: opp, type: type, umbral: type === 'total' || type === 'partiell', dist: e.dist };
}
function specMoonClass(label) {
  var s = String(label);
  if (/blau/i.test(s)) { return 'spec-blue'; }
  if (/blutmond/i.test(s)) { return 'spec-red'; }
  if (/halbschatten/i.test(s)) { return 'spec-faint'; }
  if (/finsternis/i.test(s)) { return 'spec-shade'; }
  if (/supermond/i.test(s)) { return 'spec-super'; }
  if (/mikromond/i.test(s)) { return 'spec-micro'; }
  return '';
}
var SPEC_MOON_COLORS = { 'spec-blue': 'var(--spec-blue)', 'spec-red': 'var(--spec-red)', 'spec-shade': 'var(--spec-shade)', 'spec-faint': 'var(--spec-faint)', 'spec-micro': 'var(--spec-micro)', 'spec-super': 'var(--spec-super)' };
var SPEC_MOON_EMOJI = { 'spec-blue': '🌕', 'spec-red': '🌕', 'spec-shade': '🌓', 'spec-faint': '🌔', 'spec-super': '🌕', 'spec-micro': '🌕' };
function specMoonB(label, text) {
  var cls = specMoonClass(label);
  var col = SPEC_MOON_COLORS[cls];
  var emoji = SPEC_MOON_EMOJI[cls] || '';
  var icon = cls === 'spec-red' ? '<span class="moonred"></span>' : (emoji ? emoji + ' ' : '');
  return '<b class="' + cls + '"' + (col ? ' style="color:' + col + ' !important"' : '') + '>' + icon + text + '</b>';
}
function specialMoonInfo(dayStartMs) {
  var out = [];
  var d = new Date(dayStartMs);
  var y = d.getFullYear(), mo = d.getMonth();
  var fms = fullMoonsInMonth(y, mo);
  var todayFm = null, todayIdx = -1;
  fms.forEach(function (t, i) {
    var ld = new Date(t);
    if (ld.getFullYear() === y && ld.getMonth() === mo && ld.getDate() === d.getDate()) { todayFm = t; todayIdx = i; }
  });
  if (todayFm == null && fms.length) {
    var mid = dayStartMs + 43200000, bd = Infinity;
    fms.forEach(function (t, i) { var dd = Math.abs(t - mid); if (dd < bd) { bd = dd; todayFm = t; todayIdx = i; } });
  }
  if (todayFm != null) {
    var ec = eclipseAt(todayFm);
    if (ec.type === 'total') { out.push({ label: 'Blutmond', opp: ec.opp, detail: 'totale Mondfinsternis, Maximum ca. ' + fmtHM(ec.opp) + ' – Mond kupferrot' }); }
    else if (ec.type === 'partiell') { out.push({ label: 'Partielle Mondfinsternis', detail: 'Maximum ca. ' + fmtHM(ec.opp) }); }
    else if (ec.type === 'halbschatten') { out.push({ label: 'Halbschatten-Mondfinsternis', detail: 'Maximum ca. ' + fmtHM(ec.opp) }); }
    if (ec.dist < 360000) { out.push({ label: 'Supermond', detail: 'Vollmond nahe Perigäum · ' + Math.round(ec.dist) + ' km' }); }
    else if (ec.dist > 405000) { out.push({ label: 'Mikromond', detail: 'Vollmond nahe Apogäum · ' + Math.round(ec.dist) + ' km' }); }
    if (fms.length >= 2 && todayIdx === 1) { out.push({ label: 'Blauer Mond', detail: '2. Vollmond im ' + MONTH_NAMES_DE[mo] + ' ' + y }); }
  }
  return out;
}
function nextEclipse(fromMs) {
  var d = new Date(fromMs);
  for (var i = 0; i < 48; i++) {
    var fms = fullMoonsInMonth(d.getUTCFullYear(), d.getUTCMonth());
    for (var k = 0; k < fms.length; k++) {
      if (fms[k] <= fromMs) { continue; }
      var ec = eclipseAt(fms[k]);
      if (ec.umbral || ec.type === 'halbschatten') { return { t: fms[k], opp: ec.opp, type: ec.type }; }
    }
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  }
  return null;
}
function nextTotalEclipse(fromMs) {
  var d = new Date(fromMs);
  for (var i = 0; i < 96; i++) {
    var fms = fullMoonsInMonth(d.getUTCFullYear(), d.getUTCMonth());
    for (var k = 0; k < fms.length; k++) {
      if (fms[k] <= fromMs) { continue; }
      var ec = eclipseAt(fms[k]);
      if (ec.type === 'total') { return { t: fms[k], opp: ec.opp, type: ec.type, dist: ec.dist }; }
    }
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  }
  return null;
}
function nextFullMoonWhere(fromMs, pred) {
  var d = new Date(fromMs);
  for (var i = 0; i < 96; i++) {
    var fms = fullMoonsInMonth(d.getUTCFullYear(), d.getUTCMonth());
    for (var k = 0; k < fms.length; k++) {
      if (fms[k] <= fromMs) { continue; }
      var e = moonEcliptic(fms[k]);
      if (pred(e.dist)) { return { t: fms[k], dist: e.dist }; }
    }
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  }
  return null;
}
function nextSuperMoon(fromMs) { return nextFullMoonWhere(fromMs, function (dist) { return dist < 360000; }); }
function nextMicroMoon(fromMs) { return nextFullMoonWhere(fromMs, function (dist) { return dist > 405000; }); }
function nextMilkyWayNight(lat, lon, fromMs) {
  var best = null;
  for (var i = 7; i < 240; i++) {
    var dayStart = fromMs + i * 86400000;
    var mw = milkyWayInfo(lat, lon, dayStart, sunEventsForDay(lat, lon, dayStart));
    var score = (mw.overlap ? mw.overlap[1] - mw.overlap[0] : 0) + mw.alt * 60000;
    if (!best || score > best.score) { best = { dayStart: dayStart, mw: mw, score: score }; }
  }
  return best;
}
function icsStamp(ms) {
  var d = new Date(ms);
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  return d.getUTCFullYear() + p2(d.getUTCMonth() + 1) + p2(d.getUTCDate()) + 'T' + p2(d.getUTCHours()) + p2(d.getUTCMinutes()) + p2(d.getUTCSeconds()) + 'Z';
}
function icsEsc(x) {
  return String(x).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
function collectCalendarEvents(lat, lon, dayStart) {
  var out = [];
  var ec = nextEclipse(dayStart);
  if (ec) {
    var total = ec.type === 'total';
    out.push({ uid: 'eclipse-' + icsStamp(ec.opp), summary: total ? '🔴 Blutmond – totale Mondfinsternis' : '🌘 Mondfinsternis (' + ec.type + ')', desc: 'Maximum ca. ' + fmtHM(ec.opp) + ' · Ort ' + lat.toFixed(4) + ', ' + lon.toFixed(4) + ' · lokal berechnet (Meeus/ELP2000-82)', start: ec.opp, durMin: 180 });
  }
  var bm = nextBlueMoon(dayStart);
  if (bm) { out.push({ uid: 'blauermond-' + icsStamp(bm.t), summary: '🔵 Blauer Mond (2. Vollmond im ' + MONTH_NAMES_DE[bm.month] + ' ' + bm.year + ')', desc: 'Vollmond am ' + fmtDateDE(dateStrOf(bm.t)) + ' · ' + fmtHM(bm.t), start: bm.t, durMin: 60 }); }
  var sm2 = nextSuperMoon(dayStart);
  if (sm2) { out.push({ uid: 'supermond-' + icsStamp(sm2.t), summary: '🟠 Supermond (Vollmond nahe Perigäum)', desc: 'Distanz ca. ' + Math.round(sm2.dist) + ' km · ' + fmtDateDE(dateStrOf(sm2.t)) + ' ' + fmtHM(sm2.t), start: sm2.t, durMin: 60 }); }
  var mm = nextMicroMoon(dayStart);
  if (mm) { out.push({ uid: 'mikromond-' + icsStamp(mm.t), summary: '⚫ Mikromond (Vollmond nahe Apogäum)', desc: 'Distanz ca. ' + Math.round(mm.dist) + ' km · ' + fmtDateDE(dateStrOf(mm.t)) + ' ' + fmtHM(mm.t), start: mm.t, durMin: 60 }); }
  var mw = nextMilkyWayNight(lat, lon, dayStart);
  if (mw) { out.push({ uid: 'milchstrasse-' + icsStamp(mw.dayStart), summary: '🌌 Milchstrasse fotografieren – beste Nacht', desc: 'Zentrum kulminiert ' + fmtHM(mw.mw.transit) + ' bei ' + mw.mw.alt.toFixed(1) + '° · ' + mw.mw.verdict + ' · Ort ' + lat.toFixed(4) + ', ' + lon.toFixed(4), start: mw.dayStart + 43200000, durMin: 240 }); }
  return out;
}
function buildEventsIcs(lat, lon, dayStart, nowMs, onlyUids, locText) {
  var evs = collectCalendarEvents(lat, lon, dayStart);
  if (onlyUids) { evs = evs.filter(function (e) { return onlyUids.indexOf(e.uid) >= 0; }); }
  var coords = lat.toFixed(4) + ', ' + lon.toFixed(4);
  var loc = locText ? locText + ' – ' + coords : coords;
  var stamp = icsStamp(nowMs || Date.now());
  var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//sonne-mond//Kalender-Events//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  evs.forEach(function (e) {
    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + e.uid + '@sonne-mond');
    lines.push('DTSTAMP:' + stamp);
    lines.push('DTSTART:' + icsStamp(e.start));
    lines.push('DTEND:' + icsStamp(e.start + e.durMin * 60000));
    lines.push('SUMMARY:' + icsEsc(e.summary));
    lines.push('DESCRIPTION:' + icsEsc(e.desc));
    lines.push('LOCATION:' + icsEsc(loc));
    ['-P7D', '-P1D', 'PT0S'].forEach(function (trig) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(e.summary + ' – ' + coords + (locText ? ' – Ort: ' + locText : '')), 'TRIGGER:' + trig, 'END:VALARM');
    });
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
function nextBlueMoon(fromMs) {
  var d = new Date(fromMs);
  for (var i = 0; i < 60; i++) {
    var fms = fullMoonsInMonth(d.getUTCFullYear(), d.getUTCMonth());
    if (fms.length >= 2 && fms[1] > fromMs) { return { t: fms[1], year: d.getUTCFullYear(), month: d.getUTCMonth() }; }
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  }
  return null;
}
function cloudIcon(cc) {
  if (cc <= 10) { return '☀️'; }
  if (cc <= 35) { return '🌤️'; }
  if (cc <= 65) { return '⛅'; }
  return '☁️';
}
function cloudLabel(cc) {
  if (cc <= 10) { return 'Himmel frei'; }
  if (cc <= 35) { return 'leicht bewölkt'; }
  if (cc <= 65) { return 'mittel bewölkt'; }
  return 'stark bewölkt';
}
function renderMwWeather(lat, lon, dayStart, mw) {
  var el = $('mwWetter');
  if (!el) { return; }
  var key = dayStart + '|' + lat.toFixed(3) + '|' + lon.toFixed(3);
  if (state.mwWxKey === key && state.mwWx) { el.textContent = state.mwWx; return; }
  el.textContent = '…';
  var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(4) + '&longitude=' + lon.toFixed(4) + '&hourly=cloudcover,temperature_2m&timezone=UTC&forecast_days=3';
  fetch(url).then(function (r) { return r.json(); }).then(function (j) {
    if (!j || !j.hourly || !j.hourly.time) { return; }
    var times = j.hourly.time, cc = j.hourly.cloudcover;
    var a = Math.max(mw.darkStart != null ? mw.darkStart : mw.bestT, dayStart);
    var b = Math.min(mw.darkEnd != null ? mw.darkEnd : mw.bestT, dayStart + 86400000);
    var vals = [];
    for (var i = 0; i < times.length; i++) {
      var t = Date.parse(times[i] + 'Z');
      if (t >= a && t <= b && isFinite(cc[i])) { vals.push(cc[i]); }
    }
    if (!vals.length) {
      var best = Infinity, bi = -1;
      for (var k = 0; k < times.length; k++) { var d = Math.abs(Date.parse(times[k] + 'Z') - mw.bestT); if (d < best) { best = d; bi = k; } }
      if (bi >= 0 && isFinite(cc[bi])) { vals.push(cc[bi]); }
    }
    if (!vals.length) { el.textContent = '–'; return; }
    var avg = vals.reduce(function (s2, v) { return s2 + v; }, 0) / vals.length;
    var tempTxt = '';
    if (mw.bestT != null && j.hourly.temperature_2m) {
      var bt = Infinity, bi2 = -1;
      for (var k2 = 0; k2 < times.length; k2++) { var d2 = Math.abs(Date.parse(times[k2] + 'Z') - mw.bestT); if (d2 < bt) { bt = d2; bi2 = k2; } }
      if (bi2 >= 0 && isFinite(j.hourly.temperature_2m[bi2])) { tempTxt = ' · ' + j.hourly.temperature_2m[bi2].toFixed(0) + ' °C um ' + fmtHM(mw.bestT); }
    }
    var moonUp = moonPosition(lat, lon, mw.bestT).alt > 0;
    var ph = moonPhaseInfo(dayStart + 43200000);
    var txt = cloudIcon(avg) + ' ' + cloudLabel(avg) + tempTxt + (moonUp ? ' · ' + moonPhaseEmoji(ph.phase) : '');
    state.mwWxKey = key; state.mwWx = txt;
    var el2 = $('mwWetter');
    if (el2) { el2.textContent = txt; }
  }).catch(function () { var e2 = $('mwWetter'); if (e2) { e2.textContent = '–'; } });
}
function moonEvents(lat, lon, centerMs, halfWindowMs) {
  var step = 15 * 60000;
  var start = centerMs - halfWindowMs, end = centerMs + halfWindowMs;
  var out = [];
  var prevT = start, prevA = moonPosition(lat, lon, start).alt;
  for (var t = start + step; t <= end + 1; t += step) {
    var a = moonPosition(lat, lon, t).alt;
    if ((prevA < 0) !== (a < 0)) {
      var lo = prevT, hi = t;
      for (var i = 0; i < 40; i++) {
        var mid = (lo + hi) / 2;
        if ((moonPosition(lat, lon, lo).alt < 0) !== (moonPosition(lat, lon, mid).alt < 0)) { hi = mid; } else { lo = mid; }
      }
      out.push({ t: (lo + hi) / 2, rise: a > prevA });
    }
    prevT = t; prevA = a;
  }
  return out;
}

var GAL_CENTER = { ra: 266.405, dec: -28.936 };
function astroAltAz(raDeg, decDeg, lat, lon, ms) {
  var jd = toJD(ms);
  var gmst = norm360(280.46061837 + 360.98564736629 * (jd - 2451545));
  var H = (norm360(gmst + lon) - raDeg) * RAD;
  var latR = lat * RAD, decR = decDeg * RAD;
  var sinAlt = Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(H);
  var alt = Math.asin(clamp(sinAlt, -1, 1)) * DEG;
  var az = norm360(Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(latR) - Math.tan(decR) * Math.cos(latR)) * DEG + 180);
  return { alt: alt, az: az };
}
function milkyWayInfo(lat, lon, dayStartMs, sunEv) {
  var ra = GAL_CENTER.ra, dec = GAL_CENTER.dec;
  var perMs = 360.98564736629 / DAY_MS;
  var sidDay = 360 / perMs;
  var g0 = 280.46061837 + 360.98564736629 * (toJD(dayStartMs) - 2451545);
  var t = dayStartMs + norm360(ra - lon - g0) / perMs;
  while (t < dayStartMs) { t += sidDay; }
  while (t > dayStartMs + DAY_MS) { t -= sidDay; }
  var p = astroAltAz(ra, dec, lat, lon, t);
  var latR = lat * RAD, decR = dec * RAD;
  var above = null;
  var c15 = (Math.sin(15 * RAD) - Math.sin(latR) * Math.sin(decR)) / (Math.cos(latR) * Math.cos(decR));
  if (c15 >= -1 && c15 <= 1) {
    var half = Math.acos(c15) * DEG / 15 * 3600000;
    above = [t - half, t + half];
  }
  var darkStart = sunEv.byAlt['-18'] ? sunEv.byAlt['-18'].evening : null;
  var nextEv = sunEventsForDay(lat, lon, dayStartMs + DAY_MS);
  var darkEnd = nextEv.byAlt['-18'] ? nextEv.byAlt['-18'].morning : null;
  var overlap = null;
  if (above && darkStart != null && darkEnd != null) {
    var a = Math.max(above[0], darkStart), b = Math.min(above[1], darkEnd);
    if (b - a >= 30 * 60000) { overlap = [a, b]; }
  }
  var windowText = '–';
  if (darkStart != null && darkEnd != null) {
    windowText = fmtHM(darkStart) + ' – ' + fmtHM(darkEnd) + ' (dunkel)';
    if (overlap) { windowText = fmtHM(overlap[0]) + ' – ' + fmtHM(overlap[1]) + ' (dunkel, Zentrum > 15°)'; }
  }
  var win = overlap || (darkStart != null && darkEnd != null ? [darkStart, darkEnd] : null);
  var bestT = t, bestAlt = p.alt, bestAz = p.az;
  if (win) {
    bestT = Math.min(Math.max(t, win[0]), win[1]);
    var bp = astroAltAz(ra, dec, lat, lon, bestT);
    bestAlt = bp.alt; bestAz = bp.az;
  }
  var ph = moonPhaseInfo(dayStartMs + 43200000);
  var mid = overlap ? (overlap[0] + overlap[1]) / 2 : (above ? (above[0] + above[1]) / 2 : t);
  var moonAlt = moonPosition(lat, lon, mid).alt;
  var reasons = [];
  if (p.alt < 20) { reasons.push('Zentrum max. nur ' + p.alt.toFixed(0) + '° hoch'); }
  if (!overlap) { reasons.push('kaum dunkle Zeit mit Zentrum > 15°'); }
  if (ph.fraction > 0.6 && moonAlt > 0) { reasons.push('Mond ' + Math.round(ph.fraction * 100) + ' % beleuchtet und sichtbar'); }
  var verdict = reasons.length ? 'Eher nein – ' + reasons.join('; ') : 'Ja – lohnenswert';
  return { transit: t, alt: p.alt, az: p.az, above: above, overlap: overlap, windowText: windowText, verdict: verdict, moonFrac: ph.fraction, bestT: bestT, bestAlt: bestAlt, bestAz: bestAz, darkStart: darkStart, darkEnd: darkEnd };
}
function hexA(hex, a) {
  var h = String(hex).replace('#', '');
  return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + a + ')';
}
function phaseInfo(alt) {
  if (alt >= 6) { return { c: '#ffdf7e', l: 'Tageslicht (Sonne ≥ +6°)' }; }
  if (alt >= 0) { return { c: '#f7b955', l: 'Goldene Stunde (0° bis +6°)' }; }
  if (alt >= -4) { return { c: '#e98a3c', l: 'Goldene Stunde (bis −4°)' }; }
  if (alt >= -6) { return { c: '#6f8fc0', l: 'Blaue Stunde (−6° bis −4°)' }; }
  if (alt >= -12) { return { c: '#46608f', l: 'Nautische Dämmerung (−12° bis −6°)' }; }
  if (alt >= -18) { return { c: '#2c3a63', l: 'Astronomische Dämmerung (−18° bis −12°)' }; }
  return { c: '#161d36', l: 'Nacht' };
}

function checkLatLon(lat, lon) {
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new Error('Ungültige Koordinaten (Breite ±90°, Länge ±180°)');
  }
}

function parseCoordInput(raw) {
  if (typeof raw !== 'string') { throw new Error('Bitte Koordinaten eingeben'); }
  var s = raw.trim();
  if (!s) { throw new Error('Bitte Koordinaten eingeben'); }
  var parts = s.split(/[,;/\s]+/).filter(function (p) { return p !== ''; }).map(function (p) { return p.replace(/['’]/g, ''); });
  if (parts.length === 2 && /^\d{6,7}$/.test(parts[0]) && /^\d{6,7}$/.test(parts[1]) && typeof lv95ToWgs84 === 'function') {
    var e = parseInt(parts[0], 10), n = parseInt(parts[1], 10);
    if (e >= 2400000 && e <= 2900000 && n >= 1000000 && n <= 1350000) {
      var w = lv95ToWgs84(e, n);
      checkLatLon(w.lat, w.lon);
      return { lat: w.lat, lon: w.lon, note: 'LV95' };
    }
  }
  var norm = s.replace(/[′‘’´`]/g, "'").replace(/[″“”]/g, '"');
  if (norm.indexOf('°') >= 0) {
    var re = /(-?\d+(?:[.,]\d+)?)\s*°\s*(?:(\d+(?:[.,]\d+)?)\s*'?\s*(?:(\d+(?:[.,]\d+)?)\s*"?\s*)?)?\s*([NSEW])/gi;
    var comps = [], m;
    while ((m = re.exec(norm)) !== null) {
      comps.push({
        v: parseFloat(m[1].replace(',', '.')) + (m[2] ? parseFloat(m[2].replace(',', '.')) / 60 : 0) + (m[3] ? parseFloat(m[3].replace(',', '.')) / 3600 : 0),
        h: m[4].toUpperCase()
      });
    }
    var latC = comps.filter(function (c) { return c.h === 'N' || c.h === 'S'; });
    var lonC = comps.filter(function (c) { return c.h === 'E' || c.h === 'W'; });
    if (latC.length === 1 && lonC.length === 1) {
      var latD = latC[0].v * (latC[0].h === 'S' ? -1 : 1);
      var lonD = lonC[0].v * (lonC[0].h === 'W' ? -1 : 1);
      checkLatLon(latD, lonD);
      return { lat: latD, lon: lonD, note: 'Grad/Min/Sek' };
    }
  }
  var up = norm.toUpperCase();
  var dm = up.match(/^([NS])\s*(-?\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+([EW])\s*(-?\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)$/);
  if (dm) {
    var latM = (parseFloat(dm[2].replace(',', '.')) + parseFloat(dm[3].replace(',', '.')) / 60) * (dm[1] === 'S' ? -1 : 1);
    var lonM = (parseFloat(dm[5].replace(',', '.')) + parseFloat(dm[6].replace(',', '.')) / 60) * (dm[4] === 'W' ? -1 : 1);
    checkLatLon(latM, lonM);
    return { lat: latM, lon: lonM, note: 'Dezimalminuten' };
  }
  var dec = up.match(/^([NS])?\s*(-?\d+(?:[.,]\d+)?)\s*([NS])?\s*[,;/\s]\s*([EW])?\s*(-?\d+(?:[.,]\d+)?)\s*([EW])?$/);
  if (dec) {
    var a = parseFloat(dec[2].replace(',', '.')), b = parseFloat(dec[5].replace(',', '.'));
    var h1 = dec[1] || dec[3], h2 = dec[4] || dec[6];
    var latX, lonX;
    if (h1 === 'N' || h1 === 'S') {
      latX = a * (h1 === 'S' ? -1 : 1);
      lonX = b * (h2 === 'W' ? -1 : 1);
    } else if (h2 === 'E' || h2 === 'W') {
      lonX = b * (h2 === 'W' ? -1 : 1);
      latX = a;
    } else if (h1 === 'E' || h1 === 'W') {
      lonX = a * (h1 === 'W' ? -1 : 1);
      latX = b;
    } else if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
      latX = b; lonX = a;
    } else {
      latX = a; lonX = b;
    }
    checkLatLon(latX, lonX);
    return { lat: latX, lon: lonX, note: 'WGS84 Dezimal' };
  }
  throw new Error('Format nicht erkannt – z. B. 46.5225, 6.6325 oder 46°31\'21"N 6°37\'57"E');
}

function fmtCoord(lat, lon) {
  return Math.abs(lat).toFixed(5) + '° ' + (lat >= 0 ? 'N' : 'S') + ', ' + Math.abs(lon).toFixed(5) + '° ' + (lon >= 0 ? 'O' : 'W');
}

if (typeof document !== 'undefined') {
  var $ = function (id) { return document.getElementById(id); };
  function trimField(el) {
    var v = el.value, t = v.trim();
    if (t !== v) { el.value = t; }
    return t;
  }
  ['q', 'ort', 'datum'].forEach(function (id) {
    $(id).addEventListener('blur', function () { trimField($(id)); });
  });
  ['q', 'ort'].forEach(function (id) {
    $(id).addEventListener('input', function () {
      var el = $(id), t = stripLeadingWs(el.value);
      if (t !== el.value) { el.value = t; }
    });
  });
  var state = { lat: 47.3779, lon: 8.5403, datum: todayStr(), name: '', minutes: 720, dayStart: 0, ev: null, sunPts: [], moonPts: [], zeitSync: true, locKnown: false, tz: null, tzMin: null, tzAuto: false, tzManualLabel: '' };
  try {
    var saved = JSON.parse(localStorage.getItem('sonneMond') || 'null');
    if (saved && isFinite(saved.lat) && isFinite(saved.lon)) {
      state.lat = saved.lat; state.lon = saved.lon; state.locKnown = true;
      if (saved.datum && localDayStart(saved.datum) != null) { state.datum = saved.datum; }
      if (saved.name) { state.name = String(saved.name); }
      if (saved.zeitSync === false) { state.zeitSync = false; }
      if (saved.tz && /^[A-Za-z0-9_+\-\/]{2,60}$/.test(String(saved.tz))) { state.tz = String(saved.tz); }
      if (isFinite(saved.tzMin) && Math.abs(saved.tzMin) <= 840) { state.tzMin = saved.tzMin; }
      if (saved.tzAuto === true) { state.tzAuto = true; }
      if (typeof saved.tzManualLabel === 'string') { state.tzManualLabel = saved.tzManualLabel.slice(0, 60); }
    }
  } catch (e) { /* localStorage nicht verfuegbar */ }
  try {
    var qs = new URLSearchParams(location.search);
    var qla = parseFloat(qs.get('lat')), qlo = parseFloat(qs.get('lon'));
    if (isFinite(qla) && isFinite(qlo) && Math.abs(qla) <= 90 && Math.abs(qlo) <= 180) {
      var sameAsSaved = state.locKnown && Math.abs(state.lat - qla) < 0.01 && Math.abs(state.lon - qlo) < 0.01;
      state.lat = qla; state.lon = qlo; state.locKnown = true;
      if (!sameAsSaved) { state.name = ''; }
    }
    if (qs.get('datum') && localDayStart(qs.get('datum')) != null) { state.datum = qs.get('datum'); }
  } catch (e) { /* keine URL-Parameter */ }

  function err(msg) {
    var el = $('err');
    if (!msg) { el.classList.add('hidden'); return; }
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function save() {
    try { localStorage.setItem('sonneMond', JSON.stringify({ lat: state.lat, lon: state.lon, datum: state.datum, name: state.name, zeitSync: state.zeitSync, tz: state.tz, tzMin: state.tzMin, tzAuto: state.tzAuto, tzManualLabel: state.tzManualLabel })); } catch (e) {}
  }
  function updateUrl() {
    try {
      var u = '?lat=' + state.lat.toFixed(5) + '&lon=' + state.lon.toFixed(5) + '&datum=' + state.datum;
      history.replaceState(null, '', u);
    } catch (e) {}
  }
  function moonEventsInDay() {
    return moonEvents(state.lat, state.lon, state.dayStart + 43200000, 43200000).filter(function (me) {
      return me.t >= state.dayStart && me.t <= state.dayStart + DAY_MS;
    });
  }
  function nextEvent(nowT) {
    var list = [];
    state.ev.events.forEach(function (e2) {
      if (e2.morning != null && e2.morning > nowT && e2.morning <= state.dayStart + DAY_MS) { list.push({ t: e2.morning, label: CROSS_NAMES[String(e2.alt)] + ' (morgens)' }); }
      if (e2.evening != null && e2.evening > nowT && e2.evening <= state.dayStart + DAY_MS) { list.push({ t: e2.evening, label: CROSS_NAMES[String(e2.alt)] + ' (abends)' }); }
    });
    if (state.ev.solarNoon > nowT && state.ev.solarNoon <= state.dayStart + DAY_MS) { list.push({ t: state.ev.solarNoon, label: 'Wahrer Mittag (Höchststand)' }); }
    moonEventsInDay().forEach(function (me) {
      if (me.t > nowT) { list.push({ t: me.t, label: me.rise ? 'Mondaufgang' : 'Monduntergang' }); }
    });
    list.sort(function (a, b) { return a.t - b.t; });
    return list[0] || null;
  }
  function drawSky() {
    var svg = $('sky');
    var W = 720, H = 360, padL = 40, padR = 14, padT = 14, padB = 30;
    var pw = W - padL - padR, ph = H - padT - padB;
    function X(az) { return padL + az / 360 * pw; }
    function Y(alt) { return padT + ph - (alt + 20) / 110 * ph; }
    var s = '';
    s += '<rect x="' + padL + '" y="' + padT + '" width="' + pw + '" height="' + ph + '" fill="#fbfbf8" stroke="#e3e3dd"/>';
    s += '<rect x="' + padL + '" y="' + Y(0).toFixed(1) + '" width="' + pw + '" height="' + (padT + ph - Y(0)).toFixed(1) + '" fill="#e9edf4"/>';
    [-18, -12, -6, 0, 30, 60, 90].forEach(function (a) {
      s += '<line x1="' + padL + '" x2="' + (padL + pw) + '" y1="' + Y(a).toFixed(1) + '" y2="' + Y(a).toFixed(1) + '" stroke="' + (a === 0 ? '#9aa0a6' : '#e3e3dd') + '"' + (a < 0 ? ' stroke-dasharray="4 3"' : '') + '/>';
      s += '<text x="' + (padL - 6) + '" y="' + (Y(a) + 3).toFixed(1) + '" text-anchor="end" font-size="9" fill="#6b6b64">' + a + '°</text>';
    });
    var dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
    for (var az = 0; az <= 360; az += 45) {
      s += '<line x1="' + X(az).toFixed(1) + '" x2="' + X(az).toFixed(1) + '" y1="' + padT + '" y2="' + (padT + ph) + '" stroke="#ecece6"/>';
      s += '<text x="' + X(az).toFixed(1) + '" y="' + (padT + ph + 15) + '" text-anchor="middle" font-size="10" fill="#6b6b64">' + dirs[(az / 45) % 8] + '</text>';
    }
    var dayStart = state.dayStart;
    var sunPts = [], moonPts = [];
    for (var m = 0; m <= 1440; m += 10) {
      var t = dayStart + m * 60000;
      var sp = sunPosition(state.lat, state.lon, t);
      sunPts.push({ t: t, m: m, x: X(sp.az), y: Y(Math.max(sp.alt, -20)), alt: sp.alt, az: sp.az });
      var mp = moonPosition(state.lat, state.lon, t);
      moonPts.push({ t: t, m: m, x: X(mp.az), y: Y(Math.max(mp.alt, -20)), alt: mp.alt, az: mp.az });
    }
    state.sunPts = sunPts; state.moonPts = moonPts;
    s += '<polyline points="' + moonPts.map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ') + '" fill="none" stroke="#9db4d0" stroke-width="1.8" stroke-dasharray="5 4"/>';
    s += '<polyline points="' + sunPts.map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ') + '" fill="none" stroke="#f5a623" stroke-width="2.6"/>';
    state.ev.events.forEach(function (e2) {
      [e2.morning, e2.evening].forEach(function (t) {
        if (t == null || t < dayStart || t > dayStart + DAY_MS) { return; }
        var p = sunPosition(state.lat, state.lon, t);
        var col = e2.alt >= 0 ? '#f5a623' : (e2.alt >= -6 ? '#6f8fc0' : '#46608f');
        s += '<circle cx="' + X(p.az).toFixed(1) + '" cy="' + Y(p.alt).toFixed(1) + '" r="3" fill="' + col + '"><title>' + CROSS_NAMES[String(e2.alt)] + ' · ' + fmtHM(t) + '</title></circle>';
      });
    });
    s += '<circle cx="' + X(state.ev.noonAz).toFixed(1) + '" cy="' + Y(state.ev.noonAlt).toFixed(1) + '" r="4.5" fill="#e8710a"><title>Wahrer Mittag · ' + fmtHM(state.ev.solarNoon) + ' · Höhe ' + state.ev.noonAlt.toFixed(1) + '° · Azimut ' + state.ev.noonAz.toFixed(0) + '°</title></circle>';
    var tm = dayStart + state.minutes * 60000;
    var sp2 = sunPosition(state.lat, state.lon, tm), mp2 = moonPosition(state.lat, state.lon, tm);
    s += '<circle cx="' + X(sp2.az).toFixed(1) + '" cy="' + Y(Math.max(sp2.alt, -20)).toFixed(1) + '" r="6.5" fill="#ffd76a" stroke="#b3261e" stroke-width="2"><title>Sonne ' + fmtHM(tm) + ' · Höhe ' + sp2.alt.toFixed(1) + '° · Azimut ' + sp2.az.toFixed(0) + '° ' + compass(sp2.az) + '</title></circle>';
    if (mp2.alt >= -20) {
      s += '<circle cx="' + X(mp2.az).toFixed(1) + '" cy="' + Y(mp2.alt).toFixed(1) + '" r="5.5" fill="#e8eef7" stroke="#33507e" stroke-width="2"><title>Mond ' + fmtHM(tm) + ' · Höhe ' + mp2.alt.toFixed(1) + '° · Azimut ' + mp2.az.toFixed(0) + '° ' + compass(mp2.az) + '</title></circle>';
    }
    var stickPx = 26;
    var altNow = sp2.alt;
    var ratio = shadowRatio(altNow);
    if (ratio != null) {
      var x0 = X(sp2.az);
      var yH = Y(0);
      var sgn = (sp2.az > 0 && sp2.az < 180) ? -1 : 1;
      var maxShadow = pw * 0.35;
      var shPx = Math.min(maxShadow, stickPx * ratio);
      /* Stab steht an der Horizontlinie im Sonnen-Azimut … */
      s += '<line x1="' + x0.toFixed(1) + '" y1="' + yH.toFixed(1) + '" x2="' + x0.toFixed(1) + '" y2="' + (yH - stickPx).toFixed(1) + '" stroke="#33362f" stroke-width="4" stroke-linecap="round"><title>Stab (1×) im Sonnen-Azimut ' + sp2.az.toFixed(0) + '°</title></line>';
      /* … der Schatten liegt im "unterirdischen" Band darunter, gegen das Azimut, gedeckelt */
      if (shPx >= 5) {
        var xe = Math.max(padL + 6, Math.min(padL + pw - 6, x0 + sgn * shPx));
        var yS = yH + 10;
        s += '<line x1="' + x0.toFixed(1) + '" y1="' + yS.toFixed(1) + '" x2="' + xe.toFixed(1) + '" y2="' + yS.toFixed(1) + '" stroke="#8a6f4d" stroke-width="5" stroke-linecap="round" opacity=".8"><title>Schatten ' + ratio.toFixed(1) + '× Stabhöhe (Sonne ' + fmtHM(tm) + ', Höhe ' + altNow.toFixed(1) + '°)</title></line>';
        var lx = Math.max(padL + 30, Math.min(padL + pw - 30, (x0 + xe) / 2));
        s += '<text x="' + lx.toFixed(1) + '" y="' + (yH + 24).toFixed(1) + '" text-anchor="middle" font-size="10" fill="#6b6b64">Schatten ' + ratio.toFixed(1) + '×</text>';
      }
    }
    svg.innerHTML = s;
  }
  function drawBar() {
    var svg = $('bar');
    var dayStart = state.dayStart;
    var s = '';
    var runs = [];
    var cur = null;
    for (var m = 0; m < 1440; m++) {
      var pi = phaseInfo(sunPosition(state.lat, state.lon, dayStart + m * 60000).alt);
      if (!cur || cur.c !== pi.c) { cur = { c: pi.c, l: pi.l, from: m, to: m }; runs.push(cur); } else { cur.to = m; }
    }
    runs.forEach(function (r) {
      s += '<rect x="' + r.from + '" y="12" width="' + (r.to - r.from + 1) + '" height="28" fill="' + r.c + '"><title>' + r.l + ' · ' + fmtHM(dayStart + r.from * 60000) + '–' + fmtHM(dayStart + (r.to + 1) * 60000) + '</title></rect>';
    });
    for (var h = 0; h <= 24; h += 2) {
      s += '<line x1="' + (h * 60) + '" x2="' + (h * 60) + '" y1="42" y2="47" stroke="#c8c8c0"/>';
      s += '<text x="' + (h * 60) + '" y="58" text-anchor="middle" font-size="9" fill="#6b6b64">' + pad2(h) + '</text>';
    }
    moonEventsInDay().forEach(function (me) {
      var x = (me.t - dayStart) / 60000;
      s += '<text x="' + x.toFixed(1) + '" y="9" text-anchor="middle" font-size="10" fill="#33507e">' + (me.rise ? '☾↑' : '☾↓') + '<title>' + (me.rise ? 'Mondaufgang ' : 'Monduntergang ') + fmtHM(me.t) + '</title></text>';
    });
    if (state.datum === dateStrOf(nowMs())) {
      var x2 = minutenJetztView();
      s += '<line x1="' + x2 + '" x2="' + x2 + '" y1="4" y2="47" stroke="#b3261e" stroke-width="1.5"><title>Jetzt ' + fmtHM(dayStart + x2 * 60000) + '</title></line>';
    }
    svg.innerHTML = s;
  }
  function renderTimes() {
    var ev = state.ev, dayStart = state.dayStart;
    function posCell(t) {
      var p = sunPosition(state.lat, state.lon, t);
      return { alt: p.alt.toFixed(1) + '°', az: p.az.toFixed(0) + '° ' + compass(p.az) };
    }
    function azCell(t) {
      var p = sunPosition(state.lat, state.lon, t);
      return p.az.toFixed(0) + '° ' + compass(p.az);
    }
    var sections = [{ title: null, open: true, html: [] }];
    function curSec() { return sections[sections.length - 1]; }
    function row(label, timeText, altText, azText, cls) {
      curSec().html.push('<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + label + '</td><td class="t">' + timeText + '</td><td>' + altText + '</td><td>' + azText + '</td></tr>');
    }
    function sec(title, open) {
      sections.push({ title: title, open: open === true, html: [] });
    }
    function crossRow(altKey, suffix) {
      var e2 = ev.byAlt[altKey];
      var t = suffix === 'morgens' ? e2.morning : e2.evening;
      if (t == null) { row(CROSS_NAMES[altKey] + ' ' + suffix, '–', '–', '–'); return; }
      var c = posCell(t);
      row(CROSS_NAMES[altKey] + ' ' + suffix, fmtHM(t), c.alt, c.az);
    }
    function rangeRow(label, t1, t2, altText) {
      if (t1 == null || t2 == null) { row(label, '–', '–', '–'); return; }
      row(label, fmtHM(t1) + ' – ' + fmtHM(t2), altText, azCell(t1) + ' – ' + azCell(t2));
    }
    if (ev.sunrise == null) {
      row('☀️ Hinweis', ev.noonAlt > 0 ? 'Polartag – die Sonne geht heute nicht unter' : 'Polarnacht – die Sonne geht heute nicht auf', ev.noonAlt.toFixed(1) + '° (Mittag)', ev.noonAz.toFixed(0) + '° ' + compass(ev.noonAz));
    }
    var shw = shadowWindows(state.lat, state.lon, dayStart);
    var shwHtml = '–';
    if (shw.morning && shw.evening) { shwHtml = 'morgens ' + fmtHM(shw.morning[0]) + ' – ' + fmtHM(shw.morning[1]) + ' · abends ' + fmtHM(shw.evening[0]) + ' – ' + fmtHM(shw.evening[1]); }
    else if (shw.morning) { shwHtml = fmtHM(shw.morning[0]) + ' – ' + fmtHM(shw.morning[1]) + ' (ganzer Tag Sonne ≤ 15°)'; }
    var stEl = $('shdwTimes');
    if (stEl) { stEl.textContent = shwHtml; }
    var dli = dayLengthExtremes(state.lat, state.lon, +dateStrOf(state.dayStart).slice(0, 4), state.datum);
    var dlHtml = '–';
    if (dli.today || dli.longest || dli.shortest) {
      var parts = [];
      if (dli.today) { parts.push('heute ' + fmtDur(dli.today.len)); }
      if (dli.longest) { parts.push('längster Tag ' + fmtDateDE(dateStrOf(dli.longest.dayStart)) + ' (' + fmtDur(dli.longest.len) + ')'); }
      if (dli.shortest) { parts.push('kürzester Tag ' + fmtDateDE(dateStrOf(dli.shortest.dayStart)) + ' (' + fmtDur(dli.shortest.len) + ')'); }
      dlHtml = parts.join(' · ');
    }
    var dlEl = $('dayLenInfo');
    if (dlEl) { dlEl.textContent = dlHtml; }
    sec('🌃 Dämmerung');
    crossRow('-18', 'morgens'); crossRow('-18', 'abends');
    crossRow('-12', 'morgens'); crossRow('-12', 'abends');
    crossRow('-6', 'morgens'); crossRow('-6', 'abends');
    row('☀️ Wahrer Mittag (Höchststand)', fmtHM(ev.solarNoon), ev.noonAlt.toFixed(1) + '°', ev.noonAz.toFixed(0) + '° ' + compass(ev.noonAz), 'noon');
    sec('🌅 Morgen', true);
    rangeRow('🌃 Blaue Stunde morgens', ev.byAlt['-6'].morning, ev.byAlt['-4'].morning, '−6° → −4°');
    if (ev.sunrise != null) { var c1 = posCell(ev.sunrise); row('🌅 Sonnenaufgang', fmtHM(ev.sunrise), c1.alt, c1.az); }
    else { row('🌅 Sonnenaufgang', '–', '–', '–'); }
    rangeRow('🌇 Goldene Stunde morgens', ev.byAlt['-4'].morning, ev.byAlt['6'].morning, '−4° → +6°');
    if (ev.dayLength != null) { row('⏱️ Tageslicht', fmtHM(ev.sunrise) + ' – ' + fmtHM(ev.sunset), 'Dauer ' + fmtDur(ev.dayLength), azCell(ev.sunrise) + ' – ' + azCell(ev.sunset), 'day'); }
    sec('🌇 Abend', true);
    rangeRow('🌇 Goldene Stunde abends', ev.byAlt['6'].evening, ev.byAlt['-4'].evening, '+6° → −4°');
    if (ev.sunset != null) { var c2 = posCell(ev.sunset); row('🌇 Sonnenuntergang', fmtHM(ev.sunset), c2.alt, c2.az); }
    else { row('🌇 Sonnenuntergang', '–', '–', '–'); }
    rangeRow('🌃 Blaue Stunde abends', ev.byAlt['-4'].evening, ev.byAlt['-6'].evening, '−4° → −6°');
    var ph = moonPhaseInfo(dayStart + 43200000);
    sec(moonPhaseEmoji(ph.phase) + ' Mond');
    var mEv = moonEventsInDay();
    var rise = null, set = null;
    mEv.forEach(function (me) { if (me.rise && !rise) { rise = me.t; } if (!me.rise && !set) { set = me.t; } });
    if (rise != null) { var mr = moonPosition(state.lat, state.lon, rise); row('🌙 Mondaufgang', fmtHM(rise), mr.alt.toFixed(1) + '°', mr.az.toFixed(0) + '° ' + compass(mr.az)); }
    else { row('🌙 Mondaufgang', '– (heute keiner)', '–', '–'); }
    if (set != null) { var ms2 = moonPosition(state.lat, state.lon, set); row('🌙 Monduntergang', fmtHM(set), ms2.alt.toFixed(1) + '°', ms2.az.toFixed(0) + '° ' + compass(ms2.az)); }
    else { row('🌙 Monduntergang', '– (heute keiner)', '–', '–'); }
    row(moonPhaseEmoji(ph.phase) + ' Mondphase (am Mittag)', ph.name, Math.round(ph.fraction * 100) + ' % beleuchtet', ph.age.toFixed(1) + ' Tage alt');
    if (state.specDay !== dayStart) {
      state.specDay = dayStart;
      state.spec = specialMoonInfo(dayStart);
      state.specNext = { eclipse: nextEclipse(dayStart), blueMoon: nextBlueMoon(dayStart) };
    }
    var specHtml = '<ul style="margin:4px 0 0;padding-left:18px">';
    if (state.spec.length) {
      state.spec.forEach(function (s) { specHtml += '<li>' + specMoonB(s.label, s.label) + ' – ' + s.detail + '</li>'; });
    } else {
      specHtml += '<li>An diesem Tag keine besonderen Mond-Ereignisse (kein Blauer Mond, keine Finsternis, kein Super-/Mikromond).</li>';
    }
    if (state.specNext.eclipse) { specHtml += '<li>' + specMoonB(state.specNext.eclipse.type === 'total' ? 'Blutmond' : state.specNext.eclipse.type === 'partiell' ? 'Partielle Mondfinsternis' : 'Halbschatten-Mondfinsternis', 'Nächste Mondfinsternis:') + ' ' + fmtDateDE(dateStrOf(state.specNext.eclipse.opp)) + ' – ' + (state.specNext.eclipse.type === 'total' ? 'total (Blutmond)' : state.specNext.eclipse.type === 'partiell' ? 'partiell' : 'Halbschatten') + ', Maximum ca. ' + fmtHM(state.specNext.eclipse.opp) + '</li>'; }
    var blutNext = nextTotalEclipse(dayStart + DAY_MS);
    if (blutNext) { specHtml += '<li>' + specMoonB('Blutmond', 'Nächster Blutmond (totale Finsternis):') + ' ' + fmtDateDE(dateStrOf(blutNext.opp)) + ', Maximum ca. ' + fmtHM(blutNext.opp) + '</li>'; }
    if (state.specNext.blueMoon) { specHtml += '<li>' + specMoonB('Blauer Mond', 'Nächster Blauer Mond:') + ' ' + MONTH_NAMES_DE[state.specNext.blueMoon.month] + ' ' + state.specNext.blueMoon.year + ' (2. Vollmond am ' + fmtDateDE(dateStrOf(state.specNext.blueMoon.t)) + ')</li>'; }
    specHtml += '</ul>';
    curSec().html.push('<tr><td colspan="4"><details class="hint spec"><summary>⭐ Besondere Mond-Daten (Blauer Mond, Blutmond, Supermond …) – ausklappen</summary><div>' + specHtml + '<div style="margin-top:6px"><button type="button" class="secondary" id="btnIcs">📅 Im Kalender eintragen</button></div></div></details></td></tr>');
    sec('🌌 Milchstrasse');
    var mw = milkyWayInfo(state.lat, state.lon, dayStart, ev);
    row('🌌 Milchstrassen-Zentrum kulminiert', fmtHM(mw.transit), mw.alt.toFixed(1) + '°', mw.az.toFixed(0) + '° ' + compass(mw.az));
    row('🌌 Milchstrasse fotografieren?', mw.windowText, mw.verdict + ' · beste Zeit ' + fmtHM(mw.bestT) + ' (' + mw.bestAlt.toFixed(0) + '° ' + compass(mw.bestAz) + ')', '');
    row('🌌 Wetter in der Nacht (Open-Meteo, inkl. Temperatur zur besten Zeit)', '<span id="mwWetter">–</span>', '', '');
    var outRows = ['<tr><th>Ereignis</th><th>Zeit</th><th>Höhe</th><th>Azimut</th></tr>'];
    sections.forEach(function (s2) {
      if (s2.title == null) { outRows.push(s2.html.join('')); return; }
      outRows.push('<tr class="sec"><td colspan="4"><details class="secmenu"' + (s2.open ? ' open' : '') + '><summary>' + s2.title + '</summary><table class="sect"><tbody>' + s2.html.join('') + '</tbody></table></details></td></tr>');
    });
    $('times').innerHTML = outRows.join('');
    renderMwWeather(state.lat, state.lon, state.dayStart, mw);
    var ib = $('icsList');
    if (ib) { ib.innerHTML = collectCalendarEvents(state.lat, state.lon, state.dayStart).map(function (e) { return '<label style="display:block;margin:2px 0"><input type="checkbox" class="icsEv" value="' + e.uid + '" checked> ' + e.summary + ' – ' + fmtDateDE(dateStrOf(e.start)) + '</label>'; }).join(''); }
  }
  function renderStatus() {
    var dayStart = state.dayStart;
    var t = dayStart + state.minutes * 60000;
    var sp = sunPosition(state.lat, state.lon, t);
    var mp = moonPosition(state.lat, state.lon, t);
    var pi = phaseInfo(sp.alt);
    $('stTime').textContent = fmtDateDE(state.datum) + ' · ' + fmtHM(t);
    $('stSun').textContent = sp.alt.toFixed(1) + '° Höhe · ' + sp.az.toFixed(0) + '° ' + compass(sp.az);
    $('stPhase').textContent = pi.l + (sp.alt >= -0.833 ? ' · Sonne über Horizont' : ' · Sonne unter Horizont');
    var sc = $('statusCard');
    sc.style.borderTop = '5px solid ' + pi.c;
    sc.style.background = 'linear-gradient(180deg, ' + hexA(pi.c, 0.12) + ', var(--card) 46%)';
    $('stMoon').textContent = mp.alt.toFixed(1) + '° Höhe · ' + mp.az.toFixed(0) + '° ' + compass(mp.az) + (mp.alt >= 0 ? ' · über Horizont' : ' · unter Horizont');
    var ph = moonPhaseInfo(t);
    $('stMoonPhase').textContent = moonPhaseEmoji(ph.phase) + ' ' + ph.name + ' · ' + Math.round(ph.fraction * 100) + ' % beleuchtet · ' + ph.age.toFixed(1) + ' Tage alt';
    $('timeLabel').textContent = fmtHM(t);
    var nx = nextEvent(t);
    $('stNext').textContent = nx ? nx.label + ' um ' + fmtHM(nx.t) + ' (in ' + fmtDur(nx.t - t) + ')' : 'Heute keine weiteren Ereignisse';
  }
  function renderCoordInfo() {
    var tz = viewTz();
    var tzHtml = '';
    if (state.tzMin != null) { tzHtml = ' &nbsp;·&nbsp; <b>' + fmtUtcOffset(state.tzMin * 60000) + ' (manuell)</b>'; }
    else if (tz) { tzHtml = ' &nbsp;·&nbsp; <b>' + escHtml(tz) + '</b> (' + fmtUtcOffset(tzOffsetMs(nowMs(), tz)) + (state.tzAuto ? '' : ' manuell') + ')'; }
    var hzHtml = '';
    if (_horizon) { hzHtml = ' &nbsp;·&nbsp; Horizont: max ' + (Math.round(_horizon.maxAngle * 10) / 10) + '° (' + _horizon.maxDir + '), frei ≤ 0,5° in ' + _horizon.freeDirs + '/' + _horizon.total + ' Richtungen'; }
    $('coordInfo').innerHTML = 'Ort: <b>' + (state.name ? escHtml(state.name) : '–') + '</b> &nbsp;·&nbsp; <b>' + fmtCoord(state.lat, state.lon) + '</b> &nbsp;·&nbsp; Tag: <b>' + fmtDateDE(state.datum) + '</b>' + tzHtml + hzHtml;
    var tw = $('tzManWrap');
    if (tw) {
      var showTz = !state.tzAuto;
      tw.style.display = showTz ? '' : 'none';
      if (showTz) { buildTzMan(); }
    }
    var tm = $('tzMan');
    if (tm) { var mv = state.tzMin != null ? fmtUtcOffset(state.tzMin * 60000) : (state.tzAuto ? '' : (state.tzManualLabel || '')); if (tm.value !== mv) { tm.value = mv; } }
  }
  var netOffsetMs = 0, netSource = '';
  function nowMs() { return Date.now() + netOffsetMs; }
  function fetchNetTime() {
    var idx = 0;
    function attempt() {
      if (idx >= TIME_SOURCES.length) { return Promise.resolve(null); }
      var src = TIME_SOURCES[idx++];
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var to = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 6000) : null;
      return fetch(src.url(), { method: src.method || 'GET', signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) {
          if (!r.ok) { throw new Error('HTTP ' + r.status); }
          if (src.mode === 'header') { return r.headers.get(src.header); }
          return src.mode === 'text' ? r.text() : r.json();
        })
        .then(function (body) {
          var ms = src.parse(body);
          if (!isFinite(ms) || Math.abs(ms - Date.now()) > 366 * 86400000) { throw new Error('unplausibel'); }
          return { ms: ms, source: src.label || src.name };
        })
        .catch(function () { return null; })
        .then(function (res) { if (to) { clearTimeout(to); } return res || attempt(); });
    }
    return attempt();
  }
  function refreshNetTime() {
    if (!state.zeitSync) {
      netOffsetMs = 0; netSource = '';
      renderClockLine();
      return Promise.resolve(null);
    }
    return fetchNetTime().then(function (res) {
      if (res) { netOffsetMs = res.ms - Date.now(); netSource = res.source; }
      else { netOffsetMs = 0; netSource = ''; }
      renderClockLine();
      return res;
    });
  }
  function renderClockLine() {
    updateCalIcon();
    var t = nowMs();
    var d = new Date(t);
    var pi = phaseInfo(sunPosition(state.lat, state.lon, t).alt);
    var src = !state.zeitSync
      ? 'Systemuhr (Zeitabgleich deaktiviert)'
      : (netSource
        ? 'Quelle: ' + netSource + ' · Abweichung ' + (netOffsetMs >= 0 ? '+' : '−') + (Math.abs(netOffsetMs) / 1000).toFixed(1) + ' s'
        : 'Systemuhr (keine Verbindung)');
    $('clockLine').textContent = 'Jetzt: ' + fmtHM(t) + ':' + pad2(d.getSeconds()) + ' · ' + src + ' · ' + pi.l;
  }
  function renderAll() {
    state.dayStart = dayStartView(state.datum);
    if (state.dayStart == null) { err('Ungültiges Datum'); return; }
    err(null);
    state.ev = sunEventsForDay(state.lat, state.lon, state.dayStart);
    $('q').value = state.lat.toFixed(5) + ', ' + state.lon.toFixed(5);
    $('datum').value = state.datum;
    renderCoordInfo();
    drawSky();
    drawBar();
    renderTimes();
    renderStatus();
    save();
    updateUrl();
    var drd0 = $('dayLenRangeDet');
    if (drd0 && drd0.open) { renderDayLenRange(); }
    var yd0 = $('yearLenDet');
    if (yd0 && yd0.open) { renderYearLenChart(); }
  }
  function applyCoords(lat, lon, name) {
    checkLatLon(lat, lon);
    state.lat = lat; state.lon = lon; state.locKnown = true;
    if (name != null) { state.name = String(name); }
    renderAll();
    fetchOrtsZeitzone();
  }
  function fetchOrtsZeitzone() {
    if (!(location.protocol === 'http:' || location.protocol === 'https:')) { return; }
    try {
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + state.lat + '&longitude=' + state.lon + '&timezone=auto&forecast_days=1&hourly=temperature_2m';
      fetch(url).then(function (r) { return r.json(); }).then(function (j) {
        if (j && typeof j.timezone === 'string' && /^[A-Za-z0-9_+\-\/]{2,60}$/.test(j.timezone) && j.timezone !== state.tz) {
          state.tz = j.timezone;
          state.tzMin = null;
          state.tzAuto = true;
          state.tzManualLabel = '';
          state.minutes = minutenJetztView();
          $('timeSlider').value = state.minutes;
          save();
          renderAll();
          renderCoordInfo();
        }
      })['catch'](function () {});
    } catch (e) {}
  }
  function ortDbApply(hit) {
    if (hit) {
      state.name = '≈ ' + hit.name + (hit.distKm < 1 ? '' : ' (ca. ' + Math.round(hit.distKm) + ' km)');
      renderCoordInfo(); save();
      if (typeof hit.dem === 'number') { applyDem(hit.dem); } else { applyElevation(); }
      horizonProfile();
    }
  }
  function applyDem(m) {
    state.name = String(state.name || '').replace(/ · -?\d+ m ü\. M\.$/, '') + ' · ' + m + ' m ü. M.';
    renderCoordInfo(); save();
  }
  function applyElevation() {
    if (!state.locKnown) { return; }
    loadEtopo1(function (ok) {
      if (!ok) { return; }
      var m = etopo1Elev(state.lat, state.lon, _etopo1Grid);
      if (typeof m !== 'number') { return; }
      applyDem(m);
    });
  }
  function horizonProfile() {
    if (!state.locKnown) { return; }
    loadEtopo1(function (ok) {
      if (!ok) { return; }
      var m0 = etopo1Elev(state.lat, state.lon, _etopo1Grid);
      if (typeof m0 !== 'number') { return; }
      var dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
      var dists = [0.3, 0.6, 1, 2, 4, 8, 15, 30];
      var maxA = -90, maxD = '', free = 0;
      for (var d = 0; d < dirs.length; d++) {
        var rad = d * 45 * Math.PI / 180;
        var best = -90;
        for (var k = 0; k < dists.length; k++) {
          var la = state.lat + dists[k] * Math.cos(rad) / 111.0;
          var lo = state.lon + dists[k] * Math.sin(rad) / (111.0 * Math.max(0.01, Math.cos(state.lat * Math.PI / 180)));
          var m = etopo1Elev(la, lo, _etopo1Grid);
          if (typeof m === 'number') {
            var ang = Math.atan2(m - m0, dists[k] * 1000) * 180 / Math.PI;
            if (ang > best) { best = ang; }
          }
        }
        if (best <= 0.5) { free++; }
        if (best > maxA) { maxA = best; maxD = dirs[d]; }
      }
      _horizon = { maxAngle: maxA, maxDir: maxD, freeDirs: free, total: dirs.length };
      renderCoordInfo();
    });
  }
  function ortDbLocal() {
    if (!ortDbLoaded()) { loadOrtDb(function (ok) { if (ok) { ortDbLocal(); } }); return; }
    ortDbApply(ortDbLookup(ORT_DB, state.lat, state.lon, 60));
  }
  function ortDbFallback() {
    if (!state.locKnown) { return; }
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      try {
        var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var t = ctl ? setTimeout(function () { ctl.abort(); }, 4000) : null;
        fetch('ort-db.php?lat=' + state.lat + '&lon=' + state.lon + '&maxkm=60', ctl ? { signal: ctl.signal } : {}).then(function (r) {
          if (t) { clearTimeout(t); }
          return r.ok ? r.json() : null;
        }).then(function (j) {
          if (j && j.name && isFinite(j.distKm)) { ortDbApply({ name: j.name, distKm: j.distKm, dem: (typeof j.dem === 'number' ? j.dem : null) }); }
          else { ortDbLocal(); }
        })['catch'](function () { if (t) { clearTimeout(t); } ortDbLocal(); });
        return;
      } catch (e) { /* lokal weiter */ }
    }
    ortDbLocal();
  }
  function reverseGeocode(force) {
    if (!state.locKnown) { return; }
    if (state.name && !force) { return; }
    if (force) { state.name = ''; }
    if (!(location.protocol === 'http:' || location.protocol === 'https:')) { ortDbFallback(); return; }
    try {
      var url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=de&lat=' + state.lat + '&lon=' + state.lon;
      fetch(url).then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.display_name) {
          state.name = String(j.display_name).split(',')[0];
          renderCoordInfo(); save();
        } else { ortDbFallback(); }
      })['catch'](function () { ortDbFallback(); });
    } catch (e) { ortDbFallback(); }
  }
  $('coordForm').addEventListener('submit', function (e) {
    e.preventDefault();
    try {
      var r = parseCoordInput(trimField($('q')));
      applyCoords(r.lat, r.lon, '');
      reverseGeocode();
      err(null);
    } catch (ex) {
      err(ex.message);
    }
  });
  function applyDatum(nd) {
    if (localDayStart(nd) == null) { return; }
    state.datum = nd;
    var ds = dayStartView(nd);
    var now = nowMs();
    state.minutes = (ds != null && dateStrOf(now) === nd) ? Math.max(0, Math.min(1439, Math.floor((now - ds) / 60000))) : 720;
    $('timeSlider').value = state.minutes;
    renderAll();
  }
  $('datum').addEventListener('change', function () { applyDatum(trimField($('datum'))); });
  $('dayMinus').addEventListener('click', function () { applyDatum(shiftDateStr(state.datum, -1)); });
  $('dayPlus').addEventListener('click', function () { applyDatum(shiftDateStr(state.datum, 1)); });
  function downloadIcs(sel) {
    var ics = buildEventsIcs(state.lat, state.lon, state.dayStart, Date.now(), sel, state.name || '');
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sonne-mond-events.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }
  $('times').addEventListener('click', function (e) {
    if (e.target && e.target.id === 'btnIcs') { $('icsModal').classList.add('open'); }
  });
  $('icsOk').addEventListener('click', function () {
    var sel = [];
    var boxes = document.querySelectorAll('#icsList input.icsEv:checked');
    for (var bi = 0; bi < boxes.length; bi++) { sel.push(boxes[bi].value); }
    if (sel.length) { downloadIcs(sel); }
    $('icsModal').classList.remove('open');
  });
  $('icsCancel').addEventListener('click', function () { $('icsModal').classList.remove('open'); });
  $('icsModal').addEventListener('click', function (e) { if (e.target && e.target.id === 'icsModal') { $('icsModal').classList.remove('open'); } });
  var calY = 0, calM = 0;
  function renderCal() {
    var pop = $('calPop');
    var today = dateStrOf(nowMs());
    var s = '<div class="cal-head"><button type="button" id="calPrev" class="secondary" aria-label="Vorheriger Monat">◀</button><b>' + monthLabel(calY, calM) + '</b><button type="button" id="calNext" class="secondary" aria-label="Nächster Monat">▶</button></div>';
    s += '<div class="cal-grid cal-dow">' + DOW_NAMES_DE.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div><div class="cal-grid">';
    calendarGrid(calY, calM).forEach(function (c) {
      var cls = 'cal-day' + (c.inMonth ? '' : ' out') + (c.date === state.datum ? ' sel' : '') + (c.date === today ? ' today' : '');
      s += '<button type="button" class="' + cls + '" data-date="' + c.date + '">' + c.day + '</button>';
    });
    s += '</div>';
    pop.innerHTML = s;
    $('calPrev').addEventListener('click', function () { calM--; if (calM < 0) { calM = 11; calY--; } renderCal(); });
    $('calNext').addEventListener('click', function () { calM++; if (calM > 11) { calM = 0; calY++; } renderCal(); });
    Array.prototype.forEach.call(pop.querySelectorAll('.cal-day'), function (b) {
      b.addEventListener('click', function () { applyDatum(b.getAttribute('data-date')); $('calPop').classList.add('hidden'); });
    });
  }
  $('calBtn').addEventListener('click', function () {
    var pop = $('calPop');
    if (pop.classList.contains('hidden')) {
      var p = String(state.datum).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      var now0 = new Date(nowMs());
      calY = p ? +p[1] : now0.getFullYear();
      calM = p ? +p[2] - 1 : now0.getMonth();
      renderCal();
      pop.classList.remove('hidden');
    } else {
      pop.classList.add('hidden');
    }
  });
  document.addEventListener('click', function (e) {
    var pop = $('calPop');
    if (pop.classList.contains('hidden')) { return; }
    if (pop.contains(e.target) || $('calBtn').contains(e.target)) { return; }
    pop.classList.add('hidden');
  });
  $('timeSlider').addEventListener('input', function () {
    state.minutes = parseInt($('timeSlider').value, 10) || 0;
    renderStatus();
    drawSky();
  });
  $('nowBtn').addEventListener('click', function () {
    state.datum = dateStrOf(nowMs());
    state.minutes = minutenJetztView();
    $('timeSlider').value = state.minutes;
    renderAll();
  });
  $('heuteBtn').addEventListener('click', function () {
    state.datum = dateStrOf(nowMs());
    state.minutes = minutenJetztView();
    $('timeSlider').value = state.minutes;
    renderAll();
  });
  $('copyLink').addEventListener('click', function () {
    var btn = $('copyLink');
    var done = function () {
      var old = btn.textContent;
      btn.textContent = '✓ kopiert';
      setTimeout(function () { btn.textContent = old; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(location.href).then(done, done);
    } else { done(); }
  });
  $('posBtn').addEventListener('click', function () {
    if (!navigator.geolocation) { err('Geolokalisierung wird von diesem Browser nicht unterstützt'); return; }
    err(null);
    navigator.geolocation.getCurrentPosition(function (pos) {
      applyCoords(pos.coords.latitude, pos.coords.longitude, '');
      reverseGeocode();
    }, function () {
      err('Position konnte nicht ermittelt werden (Berechtigung fehlt oder kein GPS-Empfang)');
    }, { timeout: 10000 });
  });
  function searchOrt(q) {
    if (!ortDataLoaded()) { loadOrtData(function () { searchOrt(q); }); return; }
    q = String(q || '').trim();
    var box = $('ortResults');
    box.innerHTML = '<div style="color:var(--muted);font-size:.85rem">Suche …</div>';
    var run = function (lat, lon, devPos) {
      var variants = queryVariants(q);
      var all = [];
      var vi = 0;
      var hasBias = isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
      var step = function () {
        if (vi >= variants.length || all.length >= 5) { return Promise.resolve(); }
        var v = variants[vi++];
        var urls = buildSearchUrls(v, lat, lon);
        if (hasBias) { urls = urls.concat(buildSearchUrls(v, NaN, NaN)); }
        var jobs = urls.map(function (u, i) {
          var src = i % 2;
          return fetch(u).then(function (r) { return r.json(); }).then(function (j) {
            if (src === 0) {
              return (j || []).map(function (f) {
                return { lat: parseFloat(f.lat), lon: parseFloat(f.lon), name: String(f.display_name).split(',')[0], label: f.display_name, sub: nominatimSub(f) };
              });
            }
            return ((j && j.features) || []).map(function (f) {
              var c = f.geometry.coordinates;
              return { lat: parseFloat(c[1]), lon: parseFloat(c[0]), name: f.properties.name, label: photonLabel(f.properties), sub: (f.properties.state ? f.properties.state + ', ' : '') + (f.properties.country || '') };
            });
          }).catch(function () { return []; });
        });
        return Promise.all(jobs).then(function (lists) {
          lists.forEach(function (l) { l.forEach(function (it) { all.push(it); }); });
          all = dedupeOrtResults(all);
          return step();
        });
      };
      step().then(function () {
        var out = rankOrtResults(all, q);
        box.innerHTML = '';
        if (devPos) {
          var b0 = document.createElement('button');
          b0.type = 'button';
          b0.innerHTML = '<b>📍 Mein Gerätestandort</b><br><span style="color:var(--muted);font-size:.8rem"></span>';
          b0.querySelector('span').textContent = devPos.lat.toFixed(4) + ', ' + devPos.lon.toFixed(4);
          b0.addEventListener('click', function () {
            applyCoords(devPos.lat, devPos.lon, '');
            reverseGeocode();
            box.innerHTML = '';
            $('ort').value = '';
          });
          box.appendChild(b0);
        }
        if (!out.length) {
          box.innerHTML += '<div style="color:var(--muted);font-size:.85rem">Keine Treffer – Tipp: Ort + Region/Land angeben (z. B. «San Andrés Teneriffa») oder «📍 Meine Position» zuerst setzen. Offline: keine Suche möglich.</div>';
          return;
        }
        out.forEach(function (it) {
          var b = document.createElement('button');
          b.type = 'button';
          b.innerHTML = '<b></b><br><span style="color:var(--muted);font-size:.8rem"></span>';
          b.querySelector('b').textContent = it.name;
          b.querySelector('span').textContent = (it.sub ? it.sub + ' · ' : '') + it.label;
          b.addEventListener('click', function () {
            applyCoords(it.lat, it.lon, it.name);
            box.innerHTML = '';
            $('ort').value = '';
          });
          box.appendChild(b);
        });
      });
    };
    if ($('biasGeo').checked && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (pos) {
        run(pos.coords.latitude, pos.coords.longitude, { lat: pos.coords.latitude, lon: pos.coords.longitude });
      }, function () {
        run(state.locKnown ? state.lat : NaN, state.locKnown ? state.lon : NaN, null);
      }, { timeout: 6000, maximumAge: 600000 });
    } else {
      run(state.locKnown ? state.lat : NaN, state.locKnown ? state.lon : NaN, null);
    }
  }
  $('ortBtn').addEventListener('click', function () {
    var q = trimField($('ort'));
    if (q) { searchOrt(q); }
  });
  $('ort').addEventListener('focus', function () { loadOrtData(function () {}); });
  $('ort').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var q = trimField($('ort'));
      if (q) { searchOrt(q); }
    }
  });
  Array.prototype.forEach.call(document.querySelectorAll('#chips .chip'), function (chip) {
    chip.addEventListener('click', function () {
      applyCoords(parseFloat(chip.getAttribute('data-lat')), parseFloat(chip.getAttribute('data-lon')), chip.getAttribute('data-name'));
      reverseGeocode();
    });
  });
  $('sky').addEventListener('click', function (e) {
    var svg = $('sky');
    var pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    var ctm = svg.getScreenCTM();
    if (!ctm) { return; }
    pt = pt.matrixTransform(ctm.inverse());
    var best = null, bd = Infinity;
    state.sunPts.concat(state.moonPts).forEach(function (p) {
      var d = (p.x - pt.x) * (p.x - pt.x) + (p.y - pt.y) * (p.y - pt.y);
      if (d < bd) { bd = d; best = p; }
    });
    if (best) {
      state.minutes = best.m;
      $('timeSlider').value = best.m;
      renderStatus();
      drawSky();
    }
  });
  function minutenJetztView() {
    var heute = dateStrOf(nowMs());
    var ds = dayStartView(heute);
    if (ds == null) { return 720; }
    return Math.max(0, Math.min(1439, Math.floor((nowMs() - ds) / 60000)));
  }
  state.minutes = minutenJetztView();
  $('timeSlider').value = state.minutes;
  renderAll();
  reverseGeocode();
  fetchOrtsZeitzone();
  var dlSort = { key: 'datum', dir: 1 };
  function renderYearLenChart() {
    var el = $('yearLenChart');
    if (!el) { return; }
    var year = String(state.datum || todayStr()).slice(0, 4);
    var r = dayLengthSeries(state.lat, state.lon, year + '-01-01', year + '-12-31', 370);
    if (r.error) { el.innerHTML = '<p class="help">' + escHtml(r.error) + '</p>'; return; }
    var svg = yearLenChartSvg(r.days, state.datum);
    el.innerHTML = svg || '<p class="help">Keine Daten (Polarnacht/-tag \u00fcber das ganze Jahr?).</p>';
  }
  (function initYearLen() {
    var det = $('yearLenDet');
    if (!det) { return; }
    det.addEventListener('toggle', function () { if (det.open) { renderYearLenChart(); } });
  })();
  function renderDayLenRange() {
    var el = $('dayLenRange');
    var fromEl = $('dayLenFrom'), toEl = $('dayLenTo');
    if (!el || !fromEl || !toEl) { return; }
    var from = String(fromEl.value || '').trim(), to = String(toEl.value || '').trim();
    if (!from || !to) { el.innerHTML = ''; return; }
    var slug = String(state.name || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 30);
    var r = dayLengthSeries(state.lat, state.lon, from, to);
    if (r.error) { el.innerHTML = '<p class="help">' + escHtml(r.error) + '</p>'; return; }
    var max = 0, min = Infinity, maxD = null, minD = null;
    r.days.forEach(function (d) { if (d.len != null) { if (d.len > max) { max = d.len; maxD = d; } if (d.len < min) { min = d.len; minD = d; } } });
    var showAll = !!($('dlShowAll') && $('dlShowAll').checked);
    var rows = sortDayRows(dayRowsWithDelta(r.days), dlSort.key, dlSort.dir);
    var vis = visibleDays(rows, showAll, 10);
    var html = '';
    if (maxD && minD) {
      html += '<p class="help" style="margin:2px 0 8px">Im Zeitraum: längster Tag <b>' + fmtDateDE(maxD.date) + '</b> (' + fmtDur(maxD.len) + '), kürzester <b>' + fmtDateDE(minD.date) + '</b> (' + fmtDur(minD.len) + ').</p>';
    }
    html += dayLengthChartSvg(r.days);
    html += '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:8px 0 6px">'
      + '<label style="font-size:.9rem;display:flex;gap:6px;align-items:center"><input type="checkbox" id="dlShowAll"' + (showAll ? ' checked' : '') + '> alle Tage anzeigen</label>'
      + '<button type="button" id="dlCsv" class="secondary">CSV exportieren</button>'
      + '<button type="button" id="dlSvg" class="secondary">Diagramm (SVG)</button>'
      + (vis.hidden > 0 ? '<span class="help">' + vis.list.length + ' von ' + r.days.length + ' Tagen angezeigt (Anfang + Ende + gleichmäßig verteilt)</span>' : '')
      + '</div>';
    function sortTh(key, label) {
      return '<th class="dlsort' + (dlSort.key === key ? ' on' : '') + '" data-key="' + key + '">' + label + '<span class="sarr">' + (dlSort.key === key ? (dlSort.dir === 1 ? '▲' : '▼') : '') + '</span></th>';
    }
    html += '<div style="max-height:340px;overflow-y:auto;border:1px solid var(--line);border-radius:8px"><table class="dltab"><thead><tr>' + sortTh('datum', 'Datum') + sortTh('auf', 'Aufgang') + sortTh('unter', 'Untergang') + sortTh('laenge', 'Tageslänge') + sortTh('delta', 'Δ') + '</tr></thead><tbody>';
    var lastMonth = null;
    vis.list.forEach(function (row, pos) {
      var d = row.d;
      if (dlSort.key === 'datum') {
        var mk = d.date.slice(0, 7);
        if (mk !== lastMonth) {
          var mh = ((+mk.slice(5, 7) - 1) * 30 + 210) % 360;
          html += '<tr class="dlmonth" style="--dlmh:' + mh + '"><td colspan="5">' + escHtml(monthLabel(+mk.slice(0, 4), +mk.slice(5, 7) - 1)) + '</td></tr>';
          lastMonth = mk;
        }
      }
      var isToday = d.date === state.datum;
      html += '<tr class="dlrow' + (pos % 2 ? ' alt' : '') + (isToday ? ' today' : '') + '" data-i="' + row.i + '">'
        + '<td>' + fmtDateDE(d.date) + (isToday ? ' <span class="dltoday">heute</span>' : '') + '</td>'
        + '<td>' + (d.sunrise != null ? fmtHM(d.sunrise) : '–') + '</td>'
        + '<td>' + (d.sunset != null ? fmtHM(d.sunset) : '–') + '</td>'
        + '<td>' + (d.len != null ? fmtDur(d.len) : '–') + '</td>'
        + '<td>' + fmtDayDelta(row.delta, row.deltaMs) + '</td>'
        + '</tr>';
    });
    html += '</tbody></table></div>';
    if (r.truncated) { html += '<p class="help">Zeitraum auf ' + r.days.length + ' Tage gekürzt (max. 400).</p>'; }
    el.innerHTML = html;
    Array.prototype.forEach.call(el.querySelectorAll('th.dlsort'), function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-key');
        if (dlSort.key === k) { dlSort.dir = -dlSort.dir; } else { dlSort = { key: k, dir: 1 }; }
        renderDayLenRange();
      });
    });
    var cb = $('dlShowAll');
    if (cb) { cb.addEventListener('change', renderDayLenRange); }
    var csvBtn = $('dlCsv');
    if (csvBtn) {
      csvBtn.addEventListener('click', function () {
        var blob = new Blob(['\uFEFF' + dayLenCsv(r.days, { lat: state.lat, lon: state.lon, tz: viewTz(), name: state.name, from: from, to: to })], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'tageslaengen_' + (slug ? slug + '_' : '') + from + '_' + to + '.csv';
        document.body.appendChild(a); a.click();
        setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 500);
      });
    }
    var svgBtn = $('dlSvg');
    if (svgBtn) {
      svgBtn.addEventListener('click', function () {
        var svg = dayLenChartSvgFile(r.days);
        if (!svg) { return; }
        var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'tageslaengen-diagramm_' + (slug ? slug + '_' : '') + from + '_' + to + '.svg';
        document.body.appendChild(a); a.click();
        setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 500);
      });
    }
  }
  (function initDayLenRange() {
    var fromEl = $('dayLenFrom'), toEl = $('dayLenTo'), det = $('dayLenRangeDet');
    if (!fromEl || !toEl || !det) { return; }
    fromEl.value = state.datum;
    toEl.value = shiftDateStr(state.datum, 30);
    var rerender = function () { renderDayLenRange(); };
    fromEl.addEventListener('change', rerender);
    toEl.addEventListener('change', rerender);
    det.addEventListener('toggle', function () { if (det.open) { renderDayLenRange(); } });
    var resetBtn = $('dlReset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        fromEl.value = '';
        toEl.value = '';
        renderDayLenRange();
      });
    }
    var rangeEl = $('dayLenRange');
    if (rangeEl) {
      var dlHot = function (i, on) {
        if (i == null) { return; }
        var c = rangeEl.querySelector('circle.dlpt[data-i="' + i + '"]');
        if (c) { c.classList.toggle('hot', on); c.setAttribute('r', on ? '6' : '3'); }
        var tr = rangeEl.querySelector('tr.dlrow[data-i="' + i + '"]');
        if (tr) { tr.classList.toggle('hot', on); }
      };
      rangeEl.addEventListener('mouseover', function (e) {
        var t = e.target;
        if (!t || !t.closest) { return; }
        var tr = t.closest('tr.dlrow');
        if (tr) { dlHot(tr.getAttribute('data-i'), true); return; }
        var c = t.closest('circle.dlpt');
        if (c) { dlHot(c.getAttribute('data-i'), true); }
      });
      rangeEl.addEventListener('mouseout', function (e) {
        var t = e.target;
        if (!t || !t.closest) { return; }
        var tr = t.closest('tr.dlrow');
        if (tr) { dlHot(tr.getAttribute('data-i'), false); return; }
        var c = t.closest('circle.dlpt');
        if (c) { dlHot(c.getAttribute('data-i'), false); }
      });
    }
  })();
  function buildTzMan() {
    loadTzCities(function () {
      var dl = $('tzCityList');
      if (!dl) { return; }
      var html = '';
      var offs = [];
      for (var m = -720; m <= 840; m += 30) { offs.push(m); }
      offs.push(345, 525, 765);
      offs.sort(function (a, b) { return a - b; });
      offs.forEach(function (m) { html += '<option value="' + fmtUtcOffset(m * 60000) + '"></option>'; });
      var seen = {};
      if (tzCitiesLoaded()) {
        TZ_CITY_LIST.forEach(function (row) {
          seen[normalizeTzKey(row[0])] = 1;
          html += '<option value="' + escHtml(row[0]) + '">' + escHtml(row[1]) + ' (jetzt ' + fmtUtcOffset(tzOffsetMs(Date.now(), row[1])) + ')</option>';
        });
      }
      tzZoneList().forEach(function (z) {
        if (!z || z === 'UTC' || z.indexOf('Etc/') === 0) { return; }
        var city = z.split('/').pop().replace(/_/g, ' ');
        var k = normalizeTzKey(city);
        if (seen[k]) { return; }
        seen[k] = 1;
        html += '<option value="' + escHtml(city) + '">' + escHtml(z) + ' (jetzt ' + fmtUtcOffset(tzOffsetMs(Date.now(), z)) + ')</option>';
      });
      dl.innerHTML = html;
    });
  }
  $('tzMan').addEventListener('focus', function () { buildTzMan(); });
  $('tzMan').addEventListener('change', function () {
    loadTzCities(function () {
    var r = parseTzInput($('tzMan').value);
    if (r.error) {
      err(r.error);
      $('tzMan').value = state.tzMin != null ? fmtUtcOffset(state.tzMin * 60000) : (state.tzAuto ? '' : (state.tzManualLabel || ''));
      return;
    }
    if (r.clear) { state.tzMin = null; state.tz = null; state.tzManualLabel = ''; }
    else if (r.tzMin != null) { state.tzMin = r.tzMin; state.tz = null; state.tzManualLabel = fmtUtcOffset(r.tzMin * 60000); }
    else {
      if (!tzDtf(r.tz)) { err('Unbekannte Zeitzone: ' + r.label); return; }
      state.tz = r.tz; state.tzMin = null; state.tzManualLabel = r.label;
    }
    state.tzAuto = false;
    err(null);
    save();
    renderAll();
    renderCoordInfo();
    });
  });
  $('zeitSync').checked = state.zeitSync;
  $('zeitSync').addEventListener('change', function () {
    state.zeitSync = $('zeitSync').checked;
    save();
    refreshNetTime();
  });
  refreshNetTime();
  setInterval(function () {
    refreshNetTime();
    renderClockLine();
    if (state.datum === dateStrOf(nowMs())) { drawBar(); }
  }, 30000);
  renderClockLine();
  try {
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      var cd = { site: 'sonne-mond', tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || ''), lang: (navigator.language || ''), ref: (document.referrer || '') };
      if (navigator.sendBeacon) {
        var fd = new FormData();
        for (var k in cd) { fd.append(k, cd[k]); }
        navigator.sendBeacon('counter.php', fd);
      } else {
        fetch('counter.php', { method: 'POST', keepalive: true, body: new URLSearchParams(cd) }).catch(function () {});
      }
    }
  } catch (e) {}
}
