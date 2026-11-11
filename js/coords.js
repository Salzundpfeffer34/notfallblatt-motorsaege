// Umrechnung WGS84 <-> Schweizer Landeskoordinaten
// Naehrungsloesung nach swisstopo (Genauigkeit ca. 1 m)
// LV03 (y/x) <-> LV95 (E/N): E = y + 2'000'000, N = x + 1'000'000

const LV03_TO_LV95_E = 2000000;
const LV03_TO_LV95_N = 1000000;

function wgs84ToLv03(lat, lon) {
  const phi = lat * 3600;
  const lam = lon * 3600;
  const p = (phi - 169028.66) / 10000;
  const l = (lam - 26782.5) / 10000;

  const x = 200147.07
    + 308807.95 * p
    + 3745.25 * l * l
    + 76.63 * p * p
    + 119.79 * p * p * p
    - 194.56 * l * l * p;

  const y = 600072.37
    + 211455.93 * l
    - 10938.51 * l * p
    - 0.36 * l * p * p
    - 44.54 * l * l * l;

  return { e: y, n: x };
}

function lv03ToWgs84(e, n) {
  const yp = (e - 600000) / 1000000;
  const xp = (n - 200000) / 1000000;

  const latSexDeg = 16.9023892
    + 3.238272 * xp
    - 0.270978 * yp * yp
    - 0.002528 * xp * xp
    - 0.0447 * yp * yp * xp
    - 0.0140 * xp * xp * xp;

  const lonSexDeg = 2.6779094
    + 4.728982 * yp
    + 0.791484 * yp * xp
    + 0.1306 * yp * yp * yp
    - 0.0436 * yp * yp * xp;

  return { lat: latSexDeg * 100 / 36, lon: lonSexDeg * 100 / 36 };
}

function wgs84ToLv95(lat, lon) {
  const lv03 = wgs84ToLv03(lat, lon);
  return { e: lv03.e + LV03_TO_LV95_E, n: lv03.n + LV03_TO_LV95_N };
}

function lv95ToWgs84(e, n) {
  return lv03ToWgs84(e - LV03_TO_LV95_E, n - LV03_TO_LV95_N);
}

function parseCoordinate(text) {
  if (typeof text !== 'string') return null;
  const cleaned = text.replace(/['’\s]/g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  if (!isFinite(value)) return null;
  return value;
}

function parseLv95Pair(eText, nText) {
  const e = parseCoordinate(eText);
  const n = parseCoordinate(nText);
  if (e === null || n === null) return null;
  let eLv95 = e;
  let nLv95 = n;
  if (e < 1000000 && n < 1000000) {
    eLv95 = e + LV03_TO_LV95_E;
    nLv95 = n + LV03_TO_LV95_N;
  }
  if (eLv95 < 2400000 || eLv95 > 2900000 || nLv95 < 1000000 || nLv95 > 1350000) return null;
  return { e: eLv95, n: nLv95 };
}

function formatLv95(e, n) {
  return {
    e: Math.round(e).toLocaleString('de-CH'),
    n: Math.round(n).toLocaleString('de-CH')
  };
}

function formatLv03(e95, n95) {
  return {
    y: Math.round(e95 - LV03_TO_LV95_E).toLocaleString('de-CH'),
    x: Math.round(n95 - LV03_TO_LV95_N).toLocaleString('de-CH')
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { wgs84ToLv95, lv95ToWgs84, wgs84ToLv03, lv03ToWgs84, parseLv95Pair, formatLv95, formatLv03 };
}
