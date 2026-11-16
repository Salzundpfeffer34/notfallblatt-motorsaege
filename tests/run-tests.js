// Node-Test ohne Abhängigkeiten: testet die reinen Funktionen aus koordinaten/index.html
// (Konverter-Mathematik, Parser, EXIF-GPS) sowie die Beispiel-Chips aus dem Markup.
// Aufruf: node tests/run-tests.js   (Exit-Code 1 bei Fehler)
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'koordinaten', 'index.html'), 'utf8');

function extract(startMarker, endMarker) {
  const a = html.indexOf(startMarker);
  const b = html.indexOf(endMarker, a);
  if (a < 0 || b < 0) { throw new Error('Marker nicht gefunden: ' + startMarker); }
  return html.slice(a, b);
}

const code = extract('function utmZoneFromLon', 'function parseInput')   // Konverter, Parser, exifGps/XMP
  + '\n' + extract('function parseInput', 'function formatNum')
  + '\nfunction t(k){return k;}\n';

const F = new Function(code + '\nreturn { parseInput, exifGps, latlonToUtm, utmToLatLon, latlonToMgrs, mgrsToLatLon, latlonToLv95, lv95ToLatLon, latlonToMercator, mercatorToLatLon };')();

let failures = 0;
function ok(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name);
  if (!cond) { failures++; }
}
function near(a, b, eps) { return Math.abs(a - b) <= eps; }

// --- 1. Beispiele aus der Hilfeseite müssen parsen -------------------------
const cases = [
  ['48.8566, 2.3522', 48.8566, 2.3522],                       // Paris WGS84
  ["41° 54' 10.1\" N, 12° 29' 47\" E", 41.9028056, 12.4963889], // Rom DMS
  ["41°54'10.1\"N 12°29'47\"E", 41.9028056, 12.4963889],        // Rom DMS kompakt
  ["48° 51' 23.8\" N, 2° 21' 7.9\" E", 48.8566111, 2.3521944], // Paris DMS
  ["48° 51.396' N, 2° 21.132' E", 48.8566, 2.3522],             // Paris Dezimalminuten
  ['N40 42.767 W74 00.367', 40.7127833, -74.0061167],           // New York Dezimalminuten
  ['2624043, 1096620', 46.0207, 7.7491],                        // Zermatt LV95
  ["2'624'043, 1'096'620", 46.0207, 7.7491],                    // Zermatt LV95 mit Apostroph
  ['30U 699316 5710164', 51.5074, -0.1278],                     // London UTM
  ['54SUE8843349290', 35.6812, 139.7671],                       // Tokio MGRS
  ['54SUE 88433 49290', 35.6812, 139.7671],                     // Tokio MGRS mit Leerzeichen
  ['-8238310, 4970072', 40.7128, -74.0060],                     // New York Mercator
];
for (const [inp, lat, lon] of cases) {
  try {
    const r = F.parseInput(inp, 'auto', false);
    ok('parseInput ' + JSON.stringify(inp), near(r.lat, lat, 0.001) && near(r.lon, lon, 0.001));
  } catch (e) {
    ok('parseInput ' + JSON.stringify(inp) + ' -> threw: ' + e.message, false);
  }
}

// --- 2. Alle Beispiel-Chips aus dem Markup müssen parsen -------------------
const chips = [...html.matchAll(/data-q="([^"]+)"/g)]
  .map(m => m[1].replace(/&quot;/g, '"').replace(/&#176;/g, '°').replace(/&prime;/g, "'").replace(/&Prime;/g, '"').replace(/&#8242;/g, '′').replace(/&#8243;/g, '″'));
ok('Chips gefunden: ' + chips.length, chips.length >= 8);
for (const c of chips) {
  try {
    const r = F.parseInput(c, 'auto', false);
    ok('chip ' + JSON.stringify(c), isFinite(r.lat) && isFinite(r.lon) && Math.abs(r.lat) <= 90 && Math.abs(r.lon) <= 180);
  } catch (e) {
    ok('chip ' + JSON.stringify(c) + ' -> threw: ' + e.message, false);
  }
}

// --- 3. Roundtrips ----------------------------------------------------------
{
  const ll = F.lv95ToLatLon(2600000, 1200000); // Bern (Referenz swisstopo)
  ok('LV95 Bern 2600000/1200000 -> ~46.9511, 7.4386', near(ll.lat, 46.9511, 0.001) && near(ll.lon, 7.4386, 0.001));
  const back = F.latlonToLv95(ll.lat, ll.lon);
  ok('LV95 roundtrip', near(back.east, 2600000, 5) && near(back.north, 1200000, 5));
}
{
  const u = F.latlonToUtm(47.376895, 8.541694);
  const ll = F.utmToLatLon(u.zone, u.east, u.north, false);
  ok('UTM roundtrip', near(ll.lat, 47.376895, 1e-6) && near(ll.lon, 8.541694, 1e-6));
  ok('UTM Zone Zürich = 32', u.zone === 32);
}
{
  const m = F.latlonToMgrs(47.376895, 8.541694);
  const ll = F.mgrsToLatLon(m);
  ok('MGRS roundtrip ' + m, near(ll.lat, 47.376895, 1e-4) && near(ll.lon, 8.541694, 1e-4));
}
{
  const mc = F.latlonToMercator(47.376895, 8.541694);
  const ll = F.mercatorToLatLon(mc.x, mc.y);
  ok('Mercator roundtrip', near(ll.lat, 47.376895, 1e-6) && near(ll.lon, 8.541694, 1e-6));
}

// --- 4. exifGps: synthetische Dateien ---------------------------------------
function buildIfd(magicLo, magicHi, latD, latM, latS, latRef, lonD, lonM, lonS, lonRef) {
  const b = Buffer.alloc(128);
  b.write('II', 0, 'ascii');
  b.writeUInt8(magicLo, 2); b.writeUInt8(magicHi, 3);
  b.writeUInt32LE(8, 4);                       // IFD0 at offset 8
  b.writeUInt16LE(1, 8);                       // 1 entry
  b.writeUInt16LE(0x8825, 10); b.writeUInt16LE(4, 12); b.writeUInt32LE(1, 14); b.writeUInt32LE(26, 18);
  b.writeUInt32LE(0, 22);                      // next IFD
  b.writeUInt16LE(4, 26);                      // GPS IFD: 4 entries
  b.writeUInt16LE(1, 28); b.writeUInt16LE(2, 30); b.writeUInt32LE(2, 32); b.write(latRef, 36, 'ascii');
  b.writeUInt16LE(2, 40); b.writeUInt16LE(5, 42); b.writeUInt32LE(3, 44); b.writeUInt32LE(80, 48);
  b.writeUInt16LE(3, 52); b.writeUInt16LE(2, 54); b.writeUInt32LE(2, 56); b.write(lonRef, 60, 'ascii');
  b.writeUInt16LE(4, 64); b.writeUInt16LE(5, 66); b.writeUInt32LE(3, 68); b.writeUInt32LE(104, 72);
  b.writeUInt32LE(0, 76);
  const rats = [[latD, 1], [latM, 1], [Math.round(latS * 10), 10], [lonD, 1], [lonM, 1], [Math.round(lonS * 10), 10]];
  let off = 80;
  for (const [n, d] of rats) { b.writeUInt32LE(n, off); b.writeUInt32LE(d, off + 4); off += 8; }
  return b;
}
function toAB(buf) { return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength); }
function jpegWrap(payload) {
  const seg = Buffer.alloc(4);
  seg.writeUInt16BE(0xFFE1, 0); seg.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([Buffer.from([0xFF, 0xD8]), seg, payload, Buffer.from([0xFF, 0xD9])]);
}
{
  const rw2 = buildIfd(0x55, 0x00, 47, 22, 36.8, 'N', 8, 32, 30.1, 'E'); // "IIU\0"
  const r = F.exifGps(toAB(rw2));
  ok('exifGps RW2 (magic 0x0055)', r && near(r.lat, 47.3768889, 1e-4) && near(r.lon, 8.5416944, 1e-4));
}
{
  const orf = buildIfd(0x52, 0x4F, 33, 48, 12.0, 'S', 122, 16, 24.0, 'W'); // "IIRO", Süden/Westen
  const r = F.exifGps(toAB(orf));
  ok('exifGps ORF (magic 0x4F52, S/W negativ)', r && near(r.lat, -33.8033333, 1e-4) && near(r.lon, -122.2733333, 1e-4));
}
{
  const tiff = buildIfd(0x2A, 0x00, 47, 22, 36.8, 'N', 8, 32, 30.1, 'E');
  const jpeg = jpegWrap(Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]));
  const r = F.exifGps(toAB(jpeg));
  ok('exifGps JPEG+EXIF', r && near(r.lat, 47.3768889, 1e-4) && near(r.lon, 8.5416944, 1e-4));
}
{
  const xmp = '<?xpacket begin=""?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:exif="http://ns.adobe.com/exif/1.0/" exif:GPSLatitude="47.376895" exif:GPSLongitude="8.541694"/></rdf:RDF></x:xmpmeta>';
  const payload = Buffer.concat([Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'binary'), Buffer.from(xmp, 'utf8')]);
  const r = F.exifGps(toAB(jpegWrap(payload)));
  ok('exifGps JPEG+XMP only', r && near(r.lat, 47.376895, 1e-6) && near(r.lon, 8.541694, 1e-6));
}
{
  const plain = Buffer.from([0xFF, 0xD8, 0xFF, 0xD9]);
  ok('exifGps JPEG ohne GPS -> null', F.exifGps(toAB(plain)) === null);
}

// --- 4b. RW2-Varianten: GPS im Exif-Sub-IFD, XMP (0x02BC), ASCII-Rationale ---
function putIfd(b, off, entries) {
  b.writeUInt16LE(entries.length, off);
  entries.forEach((en, i) => {
    const e = off + 2 + i * 12;
    b.writeUInt16LE(en.tag, e); b.writeUInt16LE(en.type, e + 2); b.writeUInt32LE(en.count, e + 4);
    if (en.inline !== undefined) { b.write(en.inline, e + 8, 'latin1'); } else { b.writeUInt32LE(en.off, e + 8); }
  });
  b.writeUInt32LE(0, off + 2 + entries.length * 12);
}
function putRationals(b, off, tri) {
  tri.forEach((r, i) => { b.writeUInt32LE(r[0], off + i * 8); b.writeUInt32LE(r[1], off + i * 8 + 4); });
}
function rawHeader(b, magicLo, magicHi, ifd0) {
  b.write('II', 0, 'ascii'); b.writeUInt8(magicLo, 2); b.writeUInt8(magicHi, 3); b.writeUInt32LE(ifd0, 4);
}
{
  // RW2: GPS-Pointer (0x8825) sitzt im Exif-Sub-IFD (0x8769)
  const b = Buffer.alloc(256);
  rawHeader(b, 0x55, 0x00, 8);
  putIfd(b, 8, [{ tag: 0x8769, type: 4, count: 1, off: 40 }]);          // IFD0 -> ExifIFD @40
  putIfd(b, 40, [{ tag: 0x8825, type: 4, count: 1, off: 64 }]);         // ExifIFD -> GPS @64
  putIfd(b, 64, [
    { tag: 1, type: 2, count: 2, inline: 'N\0\0\0' },
    { tag: 2, type: 5, count: 3, off: 128 },
    { tag: 3, type: 2, count: 2, inline: 'E\0\0\0' },
    { tag: 4, type: 5, count: 3, off: 152 },
  ]);
  putRationals(b, 128, [[47, 1], [22, 1], [368, 10]]);
  putRationals(b, 152, [[8, 1], [32, 1], [301, 10]]);
  const r = F.exifGps(toAB(b));
  ok('exifGps RW2 GPS im Exif-Sub-IFD', r && near(r.lat, 47.3768889, 1e-4) && near(r.lon, 8.5416944, 1e-4));
}
{
  // RW2: GPS nur als XMP in Tag 0x02BC (ApplicationNotes)
  const xmp = '<?xpacket begin=""?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:exif="http://ns.adobe.com/exif/1.0/" exif:GPSLatitude="47.376895" exif:GPSLongitude="8.541694" exif:GPSLatitudeRef="N" exif:GPSLongitudeRef="E"/></rdf:RDF></x:xmpmeta>';
  const b = Buffer.alloc(64 + xmp.length + 8);
  rawHeader(b, 0x55, 0x00, 8);
  putIfd(b, 8, [{ tag: 0x02BC, type: 7, count: xmp.length, off: 64 }]);
  b.write(xmp, 64, 'utf8');
  const r = F.exifGps(toAB(b));
  ok('exifGps RW2 XMP (0x02BC)', r && near(r.lat, 47.376895, 1e-6) && near(r.lon, 8.541694, 1e-6));
}
{
  // RW2: GPS-Koordinaten als ASCII-Rationale (Typ 2) "47/1,22/1,368/10"
  const latS = '47/1,22/1,368/10', lonS = '8/1,32/1,301/10';
  const b = Buffer.alloc(256);
  rawHeader(b, 0x55, 0x00, 8);
  putIfd(b, 8, [{ tag: 0x8825, type: 4, count: 1, off: 26 }]);
  putIfd(b, 26, [
    { tag: 1, type: 2, count: 2, inline: 'N\0\0\0' },
    { tag: 2, type: 2, count: latS.length, off: 128 },
    { tag: 3, type: 2, count: 2, inline: 'E\0\0\0' },
    { tag: 4, type: 2, count: lonS.length, off: 160 },
  ]);
  b.write(latS, 128, 'ascii'); b.write(lonS, 160, 'ascii');
  const r = F.exifGps(toAB(b));
  ok('exifGps RW2 ASCII-Rationale', r && near(r.lat, 47.3768889, 1e-4) && near(r.lon, 8.5416944, 1e-4));
}

// --- 4c. RW2 mit eingebettetem JpgFromRaw (0x002E), GPS im EXIF des Preview-JPEG ---
{
  const innerTiff = buildIfd(0x2A, 0x00, 46, 2, 7.3, 'N', 7, 45, 12.3, 'E');
  const innerJpeg = jpegWrap(Buffer.concat([Buffer.from('Exif\0\0', 'binary'), innerTiff]));
  // outer RW2: IFD0 with tag 0x002E (type 7, cnt=len, offset of inner jpeg)
  const jpgOff = 256;
  const b = Buffer.alloc(jpgOff + innerJpeg.length + 16);
  rawHeader(b, 0x55, 0x00, 8);
  putIfd(b, 8, [{ tag: 0x002E, type: 7, count: innerJpeg.length, off: jpgOff }]);
  innerJpeg.copy(b, jpgOff);
  const r = F.exifGps(toAB(b));
  ok('exifGps RW2 JpgFromRaw (0x002E) mit EXIF-GPS im Preview', r && near(r.lat, 46.0353611, 1e-4) && near(r.lon, 7.7534167, 1e-4));
}

// --- 5. gpx-reduce.html: Reduktion (Douglas-Peucker + Limit) & GPX-Output ---
{
  const gpxHtml = fs.readFileSync(path.join(__dirname, '..', 'gpx-reduce.html'), 'utf8');
  const m = gpxHtml.match(/<script>\n([\s\S]*?)\n<\/script>/);
  ok('gpx-reduce.html hat Script-Block', !!m);
  ok('DOMParser mit unterstuetztem MIME (text/xml, nicht application/gpx+xml)', gpxHtml.indexOf("parseFromString(text, 'text/xml')") >= 0 && gpxHtml.indexOf("parseFromString(text, 'application/gpx+xml')") < 0);
  ok('Limit-Presets 50/100/250/500 mit Default 250', ['value="50"', 'value="100"', 'value="250" selected', 'value="500"'].every(o => gpxHtml.indexOf(o) >= 0));
  ok('alte Presets 200/1000 entfernt', gpxHtml.indexOf('value="200"') < 0 && gpxHtml.indexOf('value="1000"') < 0);
  ok('Zurück-Link zum Konverter vorhanden', gpxHtml.indexOf('href="koordinaten/index.html"') >= 0);
  ok('Einstellungen (inkl. Limit-Dropdown) sofort sichtbar (kein display:none)', gpxHtml.indexOf('<div class="card" id="settings">') >= 0 && gpxHtml.indexOf('id="settings" style="display:none"') < 0);
  ok('Hinweis wenn noch keine GPX geladen', gpxHtml.indexOf('Bitte zuerst eine GPX-Datei laden') >= 0);
  const G = new Function(m[1] + '\nreturn { reducePoints, buildGpx, trackKm, haversineKm };')();
  // synthetische Tour: 2000 Punkte auf gewellter Linie + benannte Punkte
  const pts = [];
  for (let i = 0; i < 2000; i++) {
    const t = i / 1999;
    pts.push({ lat: 46.0 + t * 1.0 + Math.sin(t * 40) * 0.01, lon: 7.0 + t * 1.0, ele: String(500 + i % 100), time: '2026-11-15T10:00:00Z' });
  }
  pts[0].name = 'Parkplatz'; pts[1000].name = 'Hütte'; pts[1999].name = 'Gipfel';
  const forced = [0, 1000, 1999];
  const res = G.reducePoints(pts, 100, forced, 10);
  ok('reducePoints: <= Limit', res.indices.length <= 100);
  ok('reducePoints: Start/Ziel/benannt behalten', res.indices.indexOf(0) >= 0 && res.indices.indexOf(1999) >= 0 && res.indices.indexOf(1000) >= 0);
  ok('reducePoints: sortiert & eindeutig', res.indices.every((v, i, a) => i === 0 || a[i - 1] < v));
  const kept = res.indices.map(i => pts[i]);
  const xml = G.buildGpx({ trkpts: pts, wpts: [{ lat: 46.0, lon: 7.0, name: 'Parkplatz' }], trkName: 'Testtour & Co' }, kept, { keepMeta: true, asRoute: true });
  const nTrk = (xml.match(/<trkpt /g) || []).length;
  ok('buildGpx: trkpt-Anzahl = reduziert (' + nTrk + ')', nTrk === kept.length);
  ok('buildGpx: rte vorhanden', xml.indexOf('<rte>') >= 0 && (xml.match(/<rtept /g) || []).length === kept.length);
  ok('buildGpx: wpt-Name erhalten', xml.indexOf('Parkplatz') >= 0);
  ok('buildGpx: Namen in trkpts erhalten', xml.indexOf('Hütte') >= 0 && xml.indexOf('Gipfel') >= 0);
  ok('buildGpx: XML escaped', xml.indexOf('Testtour &amp; Co') >= 0);
  ok('buildGpx: Tags balanciert', /<gpx[\s>]/.test(xml) && xml.indexOf('</gpx>') > 0 && xml.indexOf('</trk>') > 0 && xml.indexOf('</rte>') > 0);
  ok('trackKm positiv', G.trackKm(pts) > 100);
  // Limit groesser als Anzahl -> keine Reduktion
  const res2 = G.reducePoints(pts, 5000, forced, 10);
  ok('reducePoints: Limit > Anzahl -> alles behalten', res2.indices.length === 2000);
}

// --- 5b. Verlinkung gpx-reduce.html im Koordinaten-Konverter ---
{
  const konv = fs.readFileSync(path.join(__dirname, '..', 'koordinaten', 'index.html'), 'utf8');
  ok('Konverter verlinkt ../gpx-reduce.html', konv.indexOf('href="../gpx-reduce.html"') >= 0);
  ok('Link ist als Button gestylt (class="btn")', konv.indexOf('class="btn" href="../gpx-reduce.html"') >= 0 && konv.indexOf('a.btn {') >= 0);
  ok('linkGpxReduce in allen 5 Sprachen', (konv.match(/linkGpxReduce:/g) || []).length === 5);
  ok('Hinweistext getrennt vom Button (span linkGpxReduceHint)', konv.indexOf('<span data-i18n="linkGpxReduceHint">') >= 0);
  ok('linkGpxReduceHint in allen 5 Sprachen', (konv.match(/linkGpxReduceHint:/g) || []).length === 5);
  ok('Button-Text kurz (\u2192 Hier reduzieren)', konv.indexOf('data-i18n="linkGpxReduce">→ Hier reduzieren</a>') >= 0);
  ok('alter Langtext nicht mehr im Markup', konv.indexOf('Hier reduzieren (gpx-reduce.html)</a>') < 0);
}

// --- 6. counter.php: beide Kopien identisch + Dashboard-Härtung vorhanden --
{
  const c1 = fs.readFileSync(path.join(__dirname, '..', 'counter.php'), 'utf8');
  const c2 = fs.readFileSync(path.join(__dirname, '..', 'koordinaten', 'counter.php'), 'utf8');
  ok('counter.php Kopien identisch', c1 === c2);
  for (const needle of ['function counterDayChart', 'function counterBarRow', 'X-Robots-Tag', 'COUNTER_FILE_HEADER', 'function counterThrottled', 'hash_equals', 'hits-\' . $site . \'.php']) {
    ok('counter.php enthält ' + needle, c1.indexOf(needle) >= 0);
  }
  ok('robots.txt vorhanden', fs.existsSync(path.join(__dirname, '..', 'robots.txt')));
}

// --- 7. Motors\u00e4gen-Icon (Favicon + Header) im Notfallblatt ---
{
  const root = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok('Notfallblatt verlinkt SVG-Favicon', root.indexOf('<link rel="icon" type="image/svg+xml" href="img/motorsaege.svg">') >= 0);
  ok('Notfallblatt verlinkt favicon.ico + apple-touch-icon', root.indexOf('href="img/favicon.ico"') >= 0 && root.indexOf('href="img/apple-touch-icon.png"') >= 0);
  ok('Header nutzt Motors\u00e4gen-Bild statt Emoji', root.indexOf('<span class="brand-icon"><img src="img/motorsaege.svg"') >= 0 && root.indexOf('brand-icon">\uD83E\uDE93') < 0);
  for (const f of ['img/motorsaege.svg', 'img/favicon.ico', 'img/apple-touch-icon.png']) {
    ok('Icon-Datei vorhanden: ' + f, fs.existsSync(path.join(__dirname, '..', f)));
  }
  const svg = fs.readFileSync(path.join(__dirname, '..', 'img', 'motorsaege.svg'), 'utf8');
  ok('SVG ist g\u00fcltiges SVG mit viewBox', svg.indexOf('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">') === 0);
  const ico = fs.readFileSync(path.join(__dirname, '..', 'img', 'favicon.ico'));
  ok('favicon.ico ist ICO mit 2 PNG-Gr\u00f6\u00dfen', ico.readUInt16LE(2) === 1 && ico.readUInt16LE(4) === 2);
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
  ok('CSS sizing f\u00fcr .brand-icon img', css.indexOf('.brand-icon img {') >= 0);
}

console.log(failures === 0 ? '\nALLE TESTS OK' : '\n' + failures + ' TEST(S) FEHLGESCHLAGEN');
process.exit(failures === 0 ? 0 : 1);
