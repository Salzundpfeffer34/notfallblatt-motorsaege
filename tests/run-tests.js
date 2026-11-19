// Node-Test ohne Abhängigkeiten: testet die reinen Funktionen aus koordinaten/index.html
// (Konverter-Mathematik, Parser, EXIF-GPS) sowie die Beispiel-Chips aus dem Markup.
// Aufruf: node tests/run-tests.js   (Exit-Code 1 bei Fehler)
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'koordinaten', 'index.html'), 'utf8')
  + '\n/*JS*/\n' + fs.readFileSync(path.join(__dirname, '..', 'js', 'koordinaten.js'), 'utf8');
const KONV_LANGS_ALL = ['en','fr','it','es'].map(l => fs.readFileSync(path.join(__dirname, '..', 'js', 'konv-texte-' + l + '.js'), 'utf8')).join('\n');

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
  const gpxJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'gpx-reduce.js'), 'utf8');
  const gpxHtml = fs.readFileSync(path.join(__dirname, '..', 'gpx-reduce.html'), 'utf8') + '\n/*JS*/\n' + gpxJs;
  ok('gpx-reduce.html: JS extern (js/gpx-reduce.js), kein Inline-Script mehr', gpxHtml.indexOf('src="js/gpx-reduce.js"') >= 0 && !/<script>\n/.test(fs.readFileSync(path.join(__dirname, '..', 'gpx-reduce.html'), 'utf8')));
  ok('DOMParser mit unterstuetztem MIME (text/xml, nicht application/gpx+xml)', gpxHtml.indexOf("parseFromString(text, 'text/xml')") >= 0 && gpxHtml.indexOf("parseFromString(text, 'application/gpx+xml')") < 0);
  ok('Limit-Presets 50/100/250/500 mit Default 250', ['value="50"', 'value="100"', 'value="250" selected', 'value="500"'].every(o => gpxHtml.indexOf(o) >= 0));
  ok('alte Presets 200/1000 entfernt', gpxHtml.indexOf('value="200"') < 0 && gpxHtml.indexOf('value="1000"') < 0);
  ok('Zurück-Link zum Konverter vorhanden', gpxHtml.indexOf('href="koordinaten/index.html"') >= 0);
  ok('Einstellungen (inkl. Limit-Dropdown) sofort sichtbar (kein display:none)', gpxHtml.indexOf('<div class="card" id="settings">') >= 0 && gpxHtml.indexOf('id="settings" style="display:none"') < 0);
  ok('Hinweis wenn noch keine GPX geladen', gpxHtml.indexOf('Bitte zuerst eine GPX-Datei laden') >= 0);
  ok('nach Reduzieren: run-Button ausgeblendet, dl aktiv ohne secondary', gpxHtml.indexOf("getElementById('run').style.display = 'none'") >= 0 && gpxHtml.indexOf("classList.remove('secondary')") >= 0);
  ok('bei neuer Datei: run wieder sichtbar, dl deaktiviert+secondary', gpxHtml.indexOf("getElementById('run').style.display = ''") >= 0 && gpxHtml.indexOf("dlBtn0.disabled = true") >= 0 && gpxHtml.indexOf("classList.add('secondary')") >= 0);
  const G = new Function(gpxJs + '\nreturn { reducePoints, buildGpx, trackKm, haversineKm };')();
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
  ok('buildGpx: Schema-Reihenfolge metadata<wpt<rte<trk (BaseCamp!)', xml.indexOf('<metadata>') < xml.indexOf('<trk>') && xml.indexOf('<rte>') < xml.indexOf('<trk>') && xml.indexOf('</rte>') < xml.indexOf('<trk>'));
  ok('buildGpx: wpt-Name erhalten', xml.indexOf('Parkplatz') >= 0);
  ok('buildGpx: Namen in trkpts erhalten', xml.indexOf('Hütte') >= 0 && xml.indexOf('Gipfel') >= 0);
  ok('buildGpx: XML escaped', xml.indexOf('Testtour &amp; Co') >= 0);
  ok('buildGpx: Tags balanciert', /<gpx[\s>]/.test(xml) && xml.indexOf('</gpx>') > 0 && xml.indexOf('</trk>') > 0 && xml.indexOf('</rte>') > 0);
  ok('trackKm positiv', G.trackKm(pts) > 100);
  // Limit groesser als Anzahl -> keine Reduktion
  const res2 = G.reducePoints(pts, 5000, forced, 10);
  ok('reducePoints: Limit > Anzahl -> alles behalten', res2.indices.length === 2000);
  ok('gpx-reduce.html: GPX-Typ-Auswahl (id=gpxType), Direkt als erste/Standard-Option', ['id="gpxType"', '<option value="direct" selected>', 'value="hiking"', 'value="driving"', 'value="other"'].every(o => gpxHtml.indexOf(o) >= 0) && gpxHtml.indexOf('<option value="direct" selected>') < gpxHtml.indexOf('<option value="">'));
  ok('gpx-reduce.js: dl liest gpxType, buildGpx nutzt opts.gpxType', gpxJs.indexOf("getElementById('gpxType').value") >= 0 && gpxJs.indexOf('opts.gpxType') >= 0);
  ok('buildGpx: ohne gpxType kein <type>-Tag', xml.indexOf('<type>') < 0);
  const xmlT = G.buildGpx({ trkpts: pts, wpts: [], trkName: 'Typtest' }, kept, { keepMeta: true, asRoute: true, gpxType: 'hiking' });
  ok('buildGpx: gpxType -> <type>hiking</type> genau 2x (rte + trk)', xmlT.split('<type>hiking</type>').length - 1 === 2);
  ok('buildGpx: Reihenfolge name < type < rtept bzw. trkseg', xmlT.indexOf('<name>Typtest</name>') < xmlT.indexOf('<type>hiking</type>') && xmlT.indexOf('<type>hiking</type>') < xmlT.indexOf('<rtept ') && xmlT.indexOf('<type>hiking</type>', xmlT.indexOf('<trk>')) < xmlT.indexOf('<trkseg>'));
  const xmlX = G.buildGpx({ trkpts: pts, wpts: [], trkName: 'X' }, kept, { gpxType: '<b>&"' });
  ok('buildGpx: gpxType wird XML-escaped', xmlX.indexOf('<type>&lt;b&gt;&amp;&quot;</type>') >= 0);
  ok('buildGpx: anderer Typ (hiking) -> kein trp', xmlT.indexOf('trp:') < 0 && xmlT.indexOf('xmlns:trp') < 0);
  const xmlD = G.buildGpx({ trkpts: pts, wpts: [], trkName: 'Direkt' }, kept, { keepMeta: false, asRoute: true, gpxType: 'direct' });
  ok('buildGpx: direct -> <type>direct</type> in rte + trk', xmlD.split('<type>direct</type>').length - 1 === 2);
  ok('buildGpx: direct -> xmlns:trp am gpx-Root + trp:CalculationMode Direct pro rtept (nicht im trk)', xmlD.indexOf('xmlns:trp="http://www.garmin.com/xmlschemas/TripExtensions/v1"') >= 0 && xmlD.split('<extensions><trp:ViaPoint><trp:CalculationMode>Direct</trp:CalculationMode></trp:ViaPoint></extensions>').length - 1 === kept.length && xmlD.split('<trk>')[1].indexOf('trp:') < 0);
}

// --- 5b. Verlinkung gpx-reduce.html im Koordinaten-Konverter ---
{
  const konv = fs.readFileSync(path.join(__dirname, '..', 'koordinaten', 'index.html'), 'utf8') + '\n/*JS*/\n' + fs.readFileSync(path.join(__dirname, '..', 'js', 'koordinaten.js'), 'utf8');
  ok('Konverter verlinkt ../gpx-reduce.html', konv.indexOf('href="../gpx-reduce.html"') >= 0);
  ok('Link ist als Button gestylt (class="btn")', konv.indexOf('class="btn" href="../gpx-reduce.html"') >= 0 && konv.indexOf('a.btn {') >= 0);
  ok('linkGpxReduce in allen 5 Sprachen', ((konv + KONV_LANGS_ALL).match(/linkGpxReduce:/g) || []).length === 5);
  ok('Hinweis als h3-Ueberschrift (linkGpxReduceHint)', konv.indexOf('<h3 class="batchhint" data-i18n="linkGpxReduceHint">') >= 0 && konv.indexOf('<span data-i18n="linkGpxReduceHint">') < 0);
  ok('Button separat darunter in p.batchhint', konv.indexOf('<p class="batchhint"><a class="btn" href="../gpx-reduce.html"') >= 0);
  ok('linkGpxReduceHint in allen 5 Sprachen', ((konv + KONV_LANGS_ALL).match(/linkGpxReduceHint:/g) || []).length === 5);
  ok('Button-Text kurz (\u2192 Hier reduzieren)', konv.indexOf('data-i18n="linkGpxReduce">→ Hier reduzieren</a>') >= 0);
  ok('alter Langtext nicht mehr im Markup', konv.indexOf('Hier reduzieren (gpx-reduce.html)</a>') < 0);
  ok('Konverter: gpxType-Select im Markup, Direkt als Standard', konv.indexOf('id="gpxType"') >= 0 && konv.indexOf('<option value="direct" selected>') >= 0 && konv.indexOf('value="hiking"') >= 0 && konv.indexOf('data-i18n="lblGpxType"') >= 0 && konv.indexOf('data-i18n-aria="ariaGpxType"') >= 0);
  ok('Konverter: finishGpx schreibt <type> nach <name> im trk', konv.indexOf("'<type>' + esc(gpxType) + '</type>'") >= 0);
  ok('Konverter: gpxtype persistiert (konverter-gpxtype)', konv.indexOf('konverter-gpxtype') >= 0);
  ok('lblGpxType + ariaGpxType in allen 5 Sprachen', ((konv + KONV_LANGS_ALL).match(/lblGpxType:/g) || []).length === 5 && ((konv + KONV_LANGS_ALL).match(/ariaGpxType:/g) || []).length === 5);
}

// --- 6. counter.php: beide Kopien identisch + Dashboard-Härtung vorhanden --
{
  const c1 = fs.readFileSync(path.join(__dirname, '..', 'counter.php'), 'utf8');
  const c2 = fs.readFileSync(path.join(__dirname, '..', 'koordinaten', 'counter.php'), 'utf8');
  ok('counter.php Kopien identisch', c1 === c2);
  for (const needle of ['function counterDayChart', 'function counterBarRow', 'X-Robots-Tag', 'COUNTER_FILE_HEADER', 'function counterThrottled', 'hash_equals', 'hits-\' . $site . \'.php']) {
    ok('counter.php enthält ' + needle, c1.indexOf(needle) >= 0);
  }
  ok('counter.php: site sonne-mond in counterSites()', c1.indexOf("array('notfallblatt', 'koordinaten', 'sonne-mond')") >= 0);
  ok('counter.php: View-URL site=sonne-mond im Kommentar (Key per POST, nicht in URL)', c1.indexOf('counter.php?view=1&site=sonne-mond') >= 0);
  ok('counter.php: Dashboard-Switcher iteriert ueber alle Sites (kein hartkodiertes $other mehr)', c1.indexOf('foreach (counterSites() as') >= 0 && c1.indexOf('$other =') < 0);
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

// --- 5c. Verlinkung sonne-mond.html im Koordinaten-Konverter ---
{
  const konv = fs.readFileSync(path.join(__dirname, '..', 'koordinaten', 'index.html'), 'utf8') + '\n/*JS*/\n' + fs.readFileSync(path.join(__dirname, '..', 'js', 'koordinaten.js'), 'utf8');
  ok('Konverter verlinkt ../sonne-mond.html', konv.indexOf('href="../sonne-mond.html"') >= 0);
  ok('Link ist als Button gestylt (class="btn")', konv.indexOf('class="btn" href="../sonne-mond.html"') >= 0);
  ok('linkSonne in allen 5 Sprachen', ((konv + KONV_LANGS_ALL).match(/linkSonne:/g) || []).length === 5);
  ok('linkSonneHint in allen 5 Sprachen', ((konv + KONV_LANGS_ALL).match(/linkSonneHint:/g) || []).length === 5);
}

// --- 8. sonne-mond.html: Parser, Sonne/Mond-Berechnung, Markup ---
{
  const sm = fs.readFileSync(path.join(__dirname, '..', 'sonne-mond.html'), 'utf8')
    + '\n/*CSS*/\n' + fs.readFileSync(path.join(__dirname, '..', 'css', 'sonne-mond.css'), 'utf8')
    + '\n/*JS*/\n' + fs.readFileSync(path.join(__dirname, '..', 'js', 'sonne-mond.js'), 'utf8');
  const coordsSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'coords.js'), 'utf8');
  const tzSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'tz-cities.js'), 'utf8');
  const ortSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'ort-suche-data.js'), 'utf8');
  const smJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'sonne-mond.js'), 'utf8');
  ok('sonne-mond.html: CSS+JS extern (css/sonne-mond.css, js/sonne-mond.js), nur Framebusting inline', sm.indexOf('href="css/sonne-mond.css"') >= 0 && sm.indexOf('src="js/sonne-mond.js"') >= 0 && sm.indexOf('<script>\n') < 0 && sm.indexOf('src="js/framebust.js"') >= 0);
  const S = new Function(coordsSrc + '\n' + tzSrc + '\n' + ortSrc + '\n' + smJs + '\nreturn { toJD, sunParams, RAD, DEG, parseCoordInput, sunEventsForDay, sunPosition, shadowWindows, dayLengthExtremes, moonPosition, moonIllumination, moonPhaseInfo, moonEvents, astroAltAz, milkyWayInfo, GAL_CENTER, cloudIcon, cloudLabel, moonPhaseEmoji, MOON_PHASE_EMOJI, MOON_PHASE_NAMES, moonEcliptic, MOON_TERMS_LR, MOON_TERMS_B, fullMoonsInMonth, eclipseAt, specialMoonInfo, specMoonClass, specMoonB, SPEC_MOON_COLORS, SPEC_MOON_EMOJI, nextEclipse, nextTotalEclipse, nextFullMoonWhere, nextSuperMoon, nextMicroMoon, nextMilkyWayNight, icsStamp, icsEsc, collectCalendarEvents, buildEventsIcs, nextBlueMoon, phaseInfo, hexA, fmtHM, fmtDateDE, dateStrOf, shiftDateStr, calendarGrid, monthLabel, buildSearchUrls, dedupeOrtResults, nominatimSub, photonLabel, normalizeQuery, stripLeadingWs, queryVariants, levenshtein, similarity, rankOrtResults, usStateToken, detectCountryToken, EU_COUNTRIES, COUNTRY_ALIASES, CH_CANTONS, tzName, TIME_SOURCES, compass, localDayStart, escHtml, tzOffsetMs, dayStartUtc, fmtUtcOffset, viewTz, viewOffsetMs, dayStartView, TZ_CITY_LIST, TZ_CITY_MAP, TZ_CITY_ALIASES, parseTzInput, normalizeTzKey, tzZoneList };')();  const pc = [
    ['46.5225, 6.6325', 46.5225, 6.6325],
    ['46.5225 6.6325', 46.5225, 6.6325],
    ['-33.8688, 151.2093', -33.8688, 151.2093],
    ['151.2093, -33.8688', -33.8688, 151.2093],
    ["46°31'21\"N, 6°37'57\"E", 46.5225, 6.6325],
    ["46°31.375'N 6°37.95'E", 46.5229167, 6.6325],
    ['N46 31.375 E6 37.95', 46.5229167, 6.6325],
    ['46.5225 N, 6.6325 E', 46.5225, 6.6325],
    ['2624043, 1096620', 46.0207, 7.7491],
    ["2'624'043 1'096'620", 46.0207, 7.7491]
  ];
  for (const [inp, lat, lon] of pc) {
    try {
      const r = S.parseCoordInput(inp);
      ok('parseCoordInput ' + JSON.stringify(inp), near(r.lat, lat, 0.001) && near(r.lon, lon, 0.001));
    } catch (e) {
      ok('parseCoordInput ' + JSON.stringify(inp) + ' -> threw: ' + e.message, false);
    }
  }
  let threw = 0;
  for (const bad of ['abc', '', '91, 200', '200, 10']) {
    try { S.parseCoordInput(bad); } catch (e) { threw++; }
  }
  ok('parseCoordInput: ungueltige Eingaben werfen Fehler (' + threw + '/4)', threw === 4);
  {
    const ds = Date.UTC(2026, 2, 20);
    const ev = S.sunEventsForDay(0, 0, ds);
    const noonH = (ev.solarNoon - ds) / 3600000;
    ok('Aequator 20.3.2026: Wahrer Mittag ~12:07 UTC (war ' + noonH.toFixed(2) + ' h)', noonH > 11.9 && noonH < 12.35);
    ok('Aequator 20.3.2026: Sonnenaufgang ~06:04 UTC', (ev.sunrise - ds) / 3600000 > 5.8 && (ev.sunrise - ds) / 3600000 < 6.35);
    ok('Aequator 20.3.2026: Tageslaenge ~12 h', ev.dayLength / 3600000 > 11.8 && ev.dayLength / 3600000 < 12.45);
    ok('Aequator 20.3.2026: Mittagshoehe ~90°', ev.noonAlt > 89);
    ok('Aequator 20.3.2026: Azimut am Mittag = Sueden', near(ev.noonAz, 180, 2));
  }
  {
    const ds = Date.UTC(2026, 5, 21);
    const ev = S.sunEventsForDay(47.3769, 8.5417, ds);
    const noonH = (ev.solarNoon - ds) / 3600000;
    ok('Zuerich 21.6.2026: Wahrer Mittag ~11:28 UTC = 13:28 MESZ (war ' + noonH.toFixed(2) + ' h)', noonH > 11.3 && noonH < 11.65);
    ok('Zuerich 21.6.2026: Mittagshoehe ~66°', near(ev.noonAlt, 66.06, 0.6));
    ok('Zuerich 21.6.2026: Azimut am Mittag ~180°', near(ev.noonAz, 180, 1.5));
    ok('Zuerich 21.6.2026: Sonnenaufgang ~03:29 UTC = 05:29 MESZ', (ev.sunrise - ds) / 3600000 > 3.25 && (ev.sunrise - ds) / 3600000 < 3.75);
    ok('Zuerich 21.6.2026: Tageslaenge ~15 h 58 min', ev.dayLength / 3600000 > 15.5 && ev.dayLength / 3600000 < 16.25);
    const b = ev.byAlt;
    ok('Zuerich 21.6.2026: Ereignisreihenfolge korrekt', b['-0.833'].morning < b['0'].morning && b['0'].morning < b['6'].morning && b['6'].morning < ev.solarNoon && ev.solarNoon < b['6'].evening && b['6'].evening < b['0'].evening && b['0'].evening < b['-0.833'].evening);
    const sp = S.sunPosition(47.3769, 8.5417, ev.solarNoon);
    ok('sunPosition am Mittag stimmt mit noonAlt/noonAz ueberein', near(sp.alt, ev.noonAlt, 0.01) && near(sp.az, ev.noonAz, 0.01));
  }
  {
    const evS = S.sunEventsForDay(78, 20, Date.UTC(2026, 5, 21));
    ok('78°N 21.6.2026: Polartag (kein Auf-/Untergang, Mittagshoehe ~35°)', evS.sunrise === null && evS.sunset === null && evS.noonAlt > 34 && evS.noonAlt < 37);
    const evW = S.sunEventsForDay(78, 20, Date.UTC(2026, 11, 21));
    ok('78°N 21.12.2026: Polarnacht, aber astronomische Daemmerung existiert', evW.sunrise === null && evW.byAlt['-18'].morning !== null);
  }
  {
    const nm = S.moonIllumination(Date.UTC(2025, 0, 29, 12, 36));
    ok('Neumond 29.1.2025 12:36 UTC: Beleuchtung < 3 %', nm.fraction < 0.03);
    ok('Neumond 29.1.2025: Phase ~0 und Name Neumond', (nm.phase < 0.05 || nm.phase > 0.95) && S.moonPhaseInfo(Date.UTC(2025, 0, 29, 12, 36)).name === 'Neumond');
    const fm = S.moonIllumination(Date.UTC(2025, 2, 14, 6, 54));
    ok('Vollmond 14.3.2025 06:54 UTC: Beleuchtung > 97 % und Name Vollmond', fm.fraction > 0.97 && S.moonPhaseInfo(Date.UTC(2025, 2, 14, 6, 54)).name === 'Vollmond');
    const ev = S.moonEvents(47.3769, 8.5417, Date.UTC(2025, 2, 14, 12), 24 * 3600000);
    ok('Mond: in 48 h mind. 1 Auf- und 1 Untergang', ev.filter(e => e.rise).length >= 1 && ev.filter(e => !e.rise).length >= 1);
    ok('Mond: Horizontkreuzungen bei Hoehe ~0°', ev.every(e => Math.abs(S.moonPosition(47.3769, 8.5417, e.t).alt) < 0.3));
    const mp = S.moonPosition(47.3769, 8.5417, Date.UTC(2025, 2, 14, 18, 0));
    ok('Mondposition im gueltigen Bereich', mp.alt >= -90 && mp.alt <= 90 && mp.az >= 0 && mp.az < 360);
  }
  ok('fmtHM (UTC)', S.fmtHM(Date.UTC(2026, 0, 2, 7, 5), true) === '07:05');
  ok('compass-Richtungen', S.compass(0) === 'N' && S.compass(90) === 'O' && S.compass(180) === 'S' && S.compass(270) === 'W');
  ok('phaseInfo: -5° = Blaue Stunde', S.phaseInfo(-5).l.indexOf('Blaue Stunde') >= 0);
  ok('phaseInfo: +3° = Goldene Stunde', S.phaseInfo(3).l.indexOf('Goldene Stunde') >= 0);
  ok('phaseInfo: +30° = Tageslicht', S.phaseInfo(30).l.indexOf('Tageslicht') >= 0);
  ok('localDayStart', S.localDayStart('2026-06-21') === new Date(2026, 5, 21).getTime() && S.localDayStart('xx') === null);
  ok('fmtDateDE: ISO -> DD.MM.YYYY', S.fmtDateDE('2026-06-21') === '21.06.2026' && S.fmtDateDE('2026-01-05') === '05.01.2026');
  ok('fmtDateDE: Fallback bei ungueltigem Format', S.fmtDateDE('xx') === 'xx');
  ok('sonne-mond.html: Datum wird europaeisch angezeigt (fmtDateDE in stTime + coordInfo)', (sm.match(/fmtDateDE\(state\.datum\)/g) || []).length === 2);
  ok('sonne-mond.html: internes Datum bleibt ISO (URL/localStorage/date input)', sm.indexOf("qs.get('datum')") >= 0 && sm.indexOf("$('datum').value = state.datum") >= 0);
  ok('sonne-mond.html: Begriffe Blaue Stunde / Goldene Stunde / Wahrer Mittag / Mondaufgang / Mondphase', ['Blaue Stunde', 'Goldene Stunde', 'Wahrer Mittag', 'Mondaufgang', 'Mondphase'].every(x => sm.indexOf(x) >= 0));
  ok('sonne-mond.html: Zurueck-Link + Footer-Links', sm.indexOf('href="koordinaten/index.html"') >= 0 && sm.indexOf('href="gpx-reduce.html"') >= 0 && sm.indexOf('href="index.html"') >= 0);
  ok('sonne-mond.html: CSP mit self + nominatim connect-src, keine externen Skripte', sm.indexOf("connect-src 'self' https://nominatim.openstreetmap.org") >= 0 && !/<script src="http/.test(sm));
  ok('sonne-mond.html: nutzt js/coords.js (LV95)', sm.indexOf('<script src="js/coords.js"></script>') >= 0);
  ok('sonne-mond.html: Slider + Sky-SVG + 24h-Balken + Tabelle', ['id="timeSlider"', 'id="sky"', 'id="bar"', 'id="times"'].every(x => sm.indexOf(x) >= 0));
  ok('sonne-mond.html: Zahlen-Spalten (Zeit/Höhe/Azimut) rechts ausgerichtet + tabular-nums in #times (th+td nth-child 2-4)', sm.indexOf('#times th:nth-child(2), #times th:nth-child(3), #times th:nth-child(4), #times td:nth-child(2), #times td:nth-child(3), #times td:nth-child(4) { text-align:right; font-variant-numeric:tabular-nums; }') >= 0);
  ok('dayLengthExtremes: Zürich 2026 – längster Tag ~21.06. (15 h 57 min), kürzester ~21.12. (8 h 27 min), heute 21.06. = 15 h 57 min; Menü sitzt in der 24h-Karte (dayLenInfo zw. 24-Stunden-Übersicht und Tabelle, nicht in den Tipps)', (function () { var r = S.dayLengthExtremes(47.3779, 8.5403, 2026, '2026-06-21'); var L = new Date(r.longest.dayStart), K = new Date(r.shortest.dayStart); var i24 = sm.indexOf('24-Stunden-'), iDl = sm.indexOf('id="dayLenInfo"'), iTab = sm.indexOf('Alle Zeiten am gewählten Tag'), iTip = sm.indexOf('Tipps für Fotografen'); return r.today && Math.abs(r.today.len - (15 * 3600000 + 57 * 60000)) < 120000 && L.getUTCMonth() === 5 && L.getUTCDate() >= 20 && L.getUTCDate() <= 22 && K.getUTCMonth() === 11 && K.getUTCDate() >= 20 && K.getUTCDate() <= 23 && r.longest.len > 15.5 * 3600000 && r.shortest.len < 9 * 3600000 && r.longest.len > r.shortest.len && i24 >= 0 && i24 < iDl && iDl < iTab && iDl < iTip && ['function dayLengthExtremes(', 'dlEl.textContent = dlHtml', 'längster Tag ', 'kürzester Tag ', 'Sommersonnenwende'].every(x => sm.indexOf(x) >= 0); })());
  ok('shadowWindows: schöne Schatten (Sonne ≤ 15°) – Sommer Zürich 21.06.2026 morgen 05:29–07:15 / abend 19:40–21:26, Kreuzung 15.01°; Klappmenü liegt in «Tipps für Fotografen» (details.hint.shdw + #shdwTimes, dynamisch via stEl.textContent), nicht mehr in der Tabelle', (function () { var lat = 47.3779, lon = 8.5403; var ds = S.localDayStart('2026-06-21'); var ev = S.sunEventsForDay(lat, lon, ds); var sw = S.shadowWindows(lat, lon, ds); var dw = S.shadowWindows(lat, lon, S.localDayStart('2026-12-21')); var tippsIdx = sm.indexOf('Tipps für Fotografen'); var shdwIdx = sm.indexOf('id="shdwTimes"'); return sw.morning[0] === ev.sunrise && sw.evening[1] === ev.sunset && Math.abs(S.sunPosition(lat, lon, sw.morning[1]).alt - 15) < 0.5 && sw.morning[1] < ev.solarNoon && ev.solarNoon < sw.evening[0] && dw.morning && dw.evening && dw.morning[1] > dw.morning[0] && dw.evening[1] > dw.evening[0] && tippsIdx >= 0 && shdwIdx > tippsIdx && ['function shadowWindows(', 'details class="hint shdw"', 'Schöne Schatten', 'stEl.textContent = shwHtml', 'Schattenverhältnis typisch ca. 2:1 bis 4:1'].every(x => sm.indexOf(x) >= 0) && sm.indexOf("curSec().html.push('<tr><td colspan=\"4\"><details class=\"hint shdw\"") < 0; })());
  ok('milkyWayInfo: galaktisches Zentrum – Kulmination (Aequator ~61° S, Teneriffa ~33° S, Transit im Tag)', (function () {
    var ds = S.localDayStart('2026-03-20');
    var mw0 = S.milkyWayInfo(0, 0, ds, S.sunEventsForDay(0, 0, ds));
    var mwT = S.milkyWayInfo(28.1, -16.7, ds, S.sunEventsForDay(28.1, -16.7, ds));
    return Math.abs(mw0.alt - 61.06) < 0.2 && Math.abs(mw0.az - 180) < 1 && Math.abs(mwT.alt - 32.96) < 0.3 && mwT.transit >= ds && mwT.transit <= ds + 86400000 && typeof mwT.verdict === 'string' && mwT.verdict.length > 2 && typeof mwT.windowText === 'string';
  })());
  ok('Milchstrasse-Wetter: cloudIcon/cloudLabel (☀️ frei ≤10 / 🌤️ leicht ≤35 / ⛅ mittel ≤65 / ☁️ stark), Open-Meteo hourly cloudcover gemittelt übers dunkle Fenster (darkStart/darkEnd), Mond-Symbol wenn Mond oben, Zeile #mwWetter, Datenschutz-Hinweis', (function () { var ds = S.localDayStart('2026-12-21'); var mw = S.milkyWayInfo(47.3779, 8.5403, ds, S.sunEventsForDay(47.3779, 8.5403, ds)); return S.cloudIcon(5) === '☀️' && S.cloudIcon(20) === '🌤️' && S.cloudIcon(50) === '⛅' && S.cloudIcon(90) === '☁️' && S.cloudLabel(5) === 'Himmel frei' && S.cloudLabel(20) === 'leicht bewölkt' && S.cloudLabel(50) === 'mittel bewölkt' && S.cloudLabel(90) === 'stark bewölkt' && typeof mw.darkStart === 'number' && typeof mw.darkEnd === 'number' && ['id="mwWetter"', 'renderMwWeather(state.lat, state.lon, state.dayStart, mw)', 'api.open-meteo.com/v1/forecast', 'hourly=cloudcover', 'moonPhaseEmoji(ph.phase)', 'Wetterprognose und Zeitzone des Ortes (z. B. Atlantic/Canary) fragen die Koordinate bei api.open-meteo.com ab'].every(x => sm.indexOf(x) >= 0); })());
  ok('milkyWayInfo: Fenster nur noch dunkel (astronomisch < −18°, wie Fotopills «Darkness») + beste Zeit/Sicht (bestT/bestAlt/bestAz) in der Zeile – kein Tageslicht-Fenster mehr', (function () { var ds = S.localDayStart('2026-12-21'); var mw = S.milkyWayInfo(28.1, -16.7, ds, S.sunEventsForDay(28.1, -16.7, ds)); var ds2 = S.localDayStart('2026-06-21'); var mw2 = S.milkyWayInfo(47.3779, 8.5403, ds2, S.sunEventsForDay(47.3779, 8.5403, ds2)); var winOK = mw.windowText.indexOf('(dunkel') >= 0 && mw2.windowText.indexOf('(dunkel') >= 0 && (mw.windowText.indexOf('Zentrum > 15°') < 0 || mw.windowText.indexOf('dunkel, Zentrum > 15°') >= 0); return winOK && typeof mw.bestT === 'number' && typeof mw.bestAlt === 'number' && typeof mw.bestAz === 'number' && sm.indexOf("' · beste Zeit ' + fmtHM(mw.bestT)") >= 0 && sm.indexOf('mw.bestAlt.toFixed(0)') >= 0 && sm.indexOf('(dunkel, Zentrum > 15°)') >= 0; })());
  ok('milkyWayInfo: Zuerich (47.4°N) Zentrum nur ~14° -> «Eher nein» mit Begründung', (function () {
    var ds = S.localDayStart('2026-03-20');
    var mw = S.milkyWayInfo(47.3779, 8.5403, ds, S.sunEventsForDay(47.3779, 8.5403, ds));
    return Math.abs(mw.alt - 13.69) < 0.3 && mw.verdict.indexOf('Eher nein') === 0 && mw.verdict.indexOf('hoch') >= 0 && mw.windowText.length > 0;
  })());
  ok('sonne-mond.html: Tabelle – Azimut bei Bereichen/Tageslicht, Mond-Höhe/Azimut, Milchstrasse-Zeilen, generische Spaltenköpfe', ['azCell(t1) + \' – \' + azCell(t2)', 'azCell(ev.sunrise) + \' – \' + azCell(ev.sunset)', 'moonPosition(state.lat, state.lon, rise)', 'moonPosition(state.lat, state.lon, set)', 'milkyWayInfo(state.lat, state.lon, dayStart, ev)', 'Milchstrasse', '<th>Höhe</th><th>Azimut</th>'].every(x => sm.indexOf(x) >= 0));
  ok('sonne-mond.html: Tabelle als Ausklapp-Sektionen – sec(title, open) mit <details class="secmenu"> + eingebetteter <table class="sect">, Morgen+Abend immer offen (open), 4 sec()-Aufrufe (Mond via moonPhaseEmoji), noon-Hervorhebung bleibt', (function () {
    if (['function sec(title, open)', '<details class="secmenu"', "' open'", '<table class="sect">', '#times tr.sec > td', '#times details.secmenu > summary', '#times table.sect', '#times tr.noon td', "'noon'"].every(x => sm.indexOf(x) >= 0) === false) { return false; }
    if (sm.indexOf("sec('\uD83C\uDF05 Morgen', true)") < 0 || sm.indexOf("sec('\uD83C\uDF07 Abend', true)") < 0) { return false; }
    if ((sm.match(/sec\('/g) || []).length !== 4 || sm.indexOf("sec(moonPhaseEmoji(ph.phase) + ' Mond')") < 0) { return false; }
    var a = ["crossRow('-18', 'morgens')", "compass(ev.noonAz), 'noon')", "ev.byAlt['-6'].morning", 'fmtDur(ev.dayLength)', "ev.byAlt['-6'].evening", 'fmtHM(rise)', 'milkyWayInfo(state.lat, state.lon, dayStart, ev)'].map(function (x) { return sm.indexOf(x); });
    return a.every(function (v) { return v >= 0; }) && a.every(function (v, i) { return i === 0 || v > a[i - 1]; });
  })());
  ok('sonne-mond.html: Blutmond im Ausklappmenü «Besondere Mond-Daten» – heute via specialMoonInfo (opp, specMoonB(s.label, s.label)), sonst «Nächster Blutmond» via nextTotalEclipse(dayStart + DAY_MS) als specMoonB-Zeile; keine eigene Sektion mehr', (function () { var sp = S.specialMoonInfo(S.localDayStart('2026-03-03')); var b = sp.filter(function (x) { return /blutmond/i.test(x.label); })[0]; var nt = S.nextTotalEclipse(Date.UTC(2026, 10, 17, 12) + 86400000); var ntd = new Date(nt.opp); return !!b && typeof b.opp === 'number' && b.opp > 0 && !!nt && nt.type === 'total' && ntd.getUTCFullYear() === 2028 && ntd.getUTCMonth() === 11 && ntd.getUTCDate() === 31 && sm.indexOf('var blut = null') < 0 && sm.indexOf("specMoonB('Blutmond', 'N\u00e4chster Blutmond") >= 0 && sm.indexOf('nextTotalEclipse(dayStart + DAY_MS)') >= 0 && sm.indexOf('specMoonB(s.label, s.label)') >= 0; })());
  ok('sonne-mond.html: ⏱️ Tageslicht-Zeile mit dezenter Sonderfarbe – row(…, \'day\') + CSS #times tr.day td (warmes Gelb)', sm.indexOf('#times tr.day td { background:rgba(245,182,66,.16); }') >= 0 && sm.indexOf("azCell(ev.sunrise) + ' \u2013 ' + azCell(ev.sunset), 'day')") >= 0);
  ok('Kalender (.ics): buildEventsIcs – VCALENDAR, 5 VEVENTs (Finsternis/Blutmond, Blauer Mond, Super-/Mikromond, Milchstrasse), je 3 VALARM (TRIGGER -P7D/-P1D/PT0S), unique UIDs, CRLF, DTSTART-Format', (function () { var ics = S.buildEventsIcs(47.3779, 8.5403, Date.UTC(2026, 10, 17, 12), Date.UTC(2026, 10, 17, 22, 0, 0)); var ve = (ics.match(/BEGIN:VEVENT/g) || []).length, va = (ics.match(/BEGIN:VALARM/g) || []).length, uids = ics.match(/UID:[^\r\n]+/g) || []; var ics2 = S.buildEventsIcs(47.3779, 8.5403, Date.UTC(2026, 2, 4, 12), Date.UTC(2026, 2, 4, 12, 0, 0)); var sm1 = S.nextSuperMoon(Date.UTC(2026, 10, 17, 12)), mm1 = S.nextMicroMoon(Date.UTC(2026, 10, 17, 12)), mw1 = S.nextMilkyWayNight(47.3779, 8.5403, Date.UTC(2026, 10, 17, 12)); return ics.indexOf('BEGIN:VCALENDAR') === 0 && ics.indexOf('VERSION:2.0') >= 0 && /END:VCALENDAR\r\n$/.test(ics) && ve === 5 && va === ve * 3 && ics.indexOf('TRIGGER:-P7D') >= 0 && ics.indexOf('TRIGGER:-P1D') >= 0 && ics.indexOf('TRIGGER:PT0S') >= 0 && uids.length === ve && new Set(uids).size === ve && /DTSTART:\d{8}T\d{6}Z/.test(ics) && ics.indexOf('Blauer Mond') >= 0 && ics.indexOf('Supermond') >= 0 && ics.indexOf('Mikromond') >= 0 && ics.indexOf('Milchstrasse') >= 0 && ics2.indexOf('Blutmond') >= 0 && !!sm1 && sm1.dist < 360000 && !!mm1 && mm1.dist > 405000 && !!mw1 && mw1.dayStart > Date.UTC(2026, 10, 17, 12); })());
  ok('sonne-mond.html: Dark Mode (prefers-color-scheme: dark – eigene :root-Variablen inkl. --spec-*) + spec-Farben als CSS-Variablen (CSS + inline via SPEC_MOON_COLORS) + tageszeitabhaengige Statuskarte (#statusCard, hexA + phaseInfo-Farbe als borderTop/Gradient)', ['@media (prefers-color-scheme: dark)', '--spec-blue:#2f6db3', '--spec-blue:#7fb0e8', 'b.spec-blue { color:var(--spec-blue) !important; }', '.hint.spec b .moonred {', "'spec-red': 'var(--spec-red)'", 'id="statusCard"', "style.borderTop = '5px solid ' + pi.c", 'hexA(pi.c, 0.12)'].every(x => sm.indexOf(x) >= 0) && S.hexA('#c0392b', 0.12) === 'rgba(192,57,43,0.12)');
  ok('sonne-mond.html: «Besondere Mond-Daten» besser lesbar/grösser – .hint.spec font-size .98rem + line-height 1.55, summary .92rem, li margin 5px, b 1.12em', ['.hint.spec { font-size:.98rem; line-height:1.55; }', '.hint.spec > summary { font-size:.92rem; }', '.hint.spec ul li { margin:5px 0; }', '.hint.spec b { font-size:1.12em; }'].every(x => sm.indexOf(x) >= 0));
  ok('sonne-mond.html: Dark Mode (prefers-color-scheme: dark – eigene :root-Variablen inkl. --spec-*) + spec-Farben als CSS-Variablen (CSS + inline via SPEC_MOON_COLORS) + tageszeitabhaengige Statuskarte (#statusCard, hexA + phaseInfo-Farbe als borderTop/Gradient)', ['@media (prefers-color-scheme: dark)', '--spec-blue:#2f6db3', '--spec-blue:#7fb0e8', 'b.spec-blue { color:var(--spec-blue) !important; }', "'spec-red': 'var(--spec-red)'", 'id="statusCard"', "style.borderTop = '5px solid ' + pi.c", 'hexA(pi.c, 0.12)'].every(x => sm.indexOf(x) >= 0) && S.hexA('#c0392b', 0.12) === 'rgba(192,57,43,0.12)');

  ok('ICS Modal: Button öffnet Fenster (#icsModal.open) mit Event-Checkboxen (#icsList/.icsEv), Export via #icsOk (downloadIcs → nur angehakte), Abbrechen/Overlay via #icsCancel/#icsModal, CSS #icsModal/#icsModal.open', ['id="icsModal"', '#icsModal.open { display:flex; }', 'id="icsOk"', 'id="icsCancel"', 'downloadIcs(sel)', "classList.add('open')", "classList.remove('open')", 'var ib = $(\'icsList\')'].every(x => sm.indexOf(x) >= 0) && (sm.match(/id="icsList"/g) || []).length === 1 && sm.indexOf("if (e.target && e.target.id === 'btnIcs') { $('icsModal').classList.add('open'); }") >= 0);
  ok('ICS Auswahl + Ort nach Koordinaten: buildEventsIcs(onlyUids) filtert, LOCATION=«Ort – Koords», VALARM-DESCRIPTION=«Event – Koords – Ort: Name» (Koords zuerst), Button nur «📅 Im Kalender eintragen», Checkboxen #icsList/.icsEv', (function () { var evs = S.collectCalendarEvents(47.3779, 8.5403, Date.UTC(2026, 10, 17, 12)); var ics = S.buildEventsIcs(47.3779, 8.5403, Date.UTC(2026, 10, 17, 12), Date.UTC(2026, 10, 17, 22, 0, 0), [evs[0].uid, evs[2].uid], 'Zürich'); var ve = (ics.match(/BEGIN:VEVENT/g) || []).length; return ve === 2 && ics.indexOf('LOCATION:Zürich – 47.3779\\, 8.5403') >= 0 && (ics.match(/47\.3779\\, 8\.5403 – Ort: Z\u00fcrich/g) || []).length === 6 && sm.indexOf('>📅 Im Kalender eintragen</button>') >= 0 && sm.indexOf('Erinnerungen 7 T / 1 T / am Ereignis)</button>') < 0 && sm.indexOf('id="icsList"') >= 0 && sm.indexOf('class="icsEv"') >= 0 && sm.indexOf("querySelectorAll('#icsList input.icsEv:checked')") >= 0 && sm.indexOf('onlyUids.indexOf(e.uid)') >= 0 && sm.indexOf("lines.push('LOCATION:' + icsEsc(loc))") >= 0 && sm.indexOf("state.name || ''") >= 0; })());
  ok('sonne-mond.html: Footer nennt die präzise Mondtheorie (Meeus/ELP2000-82), nicht mehr «vereinfacht»', sm.indexOf('Mond nach präziser Mondtheorie (Meeus/ELP2000-82') >= 0 && sm.indexOf('vereinfachter Mondtheorie') < 0);
  ok('sonne-mond.html: Button «In Kalender eintragen» (#btnIcs) im Ausklappmenü + Event-Delegation an #times + Blob-Download sonne-mond-events.ics + CSP blob:', ['id="btnIcs"', 'buildEventsIcs(state.lat, state.lon, state.dayStart', "$('times').addEventListener('click'", "'sonne-mond-events.ics'", "default-src 'self' blob:", 'BEGIN:VALARM'].every(x => sm.indexOf(x) >= 0));
  ok('moonPhaseEmoji: 8 Stufen – Neumond 🌑, Viertel 🌓/🌗, Vollmond 🌕; tagesaktuell via moonPhaseInfo (29.01.2025 🌑, 14.03.2025 🌕)', S.moonPhaseEmoji(0) === '🌑' && S.moonPhaseEmoji(0.125) === '🌒' && S.moonPhaseEmoji(0.25) === '🌓' && S.moonPhaseEmoji(0.375) === '🌔' && S.moonPhaseEmoji(0.5) === '🌕' && S.moonPhaseEmoji(0.625) === '🌖' && S.moonPhaseEmoji(0.75) === '🌗' && S.moonPhaseEmoji(0.875) === '🌘' && S.moonPhaseEmoji(1) === '🌑' && S.moonPhaseEmoji(S.moonPhaseInfo(S.localDayStart('2025-01-29') + 43200000).phase) === '🌑' && S.moonPhaseEmoji(S.moonPhaseInfo(S.localDayStart('2025-03-14') + 43200000).phase) === '🌕');
  ok('MOON_PHASE_NAMES: gebräuchliche Bezeichnungen – Neumond, Sichelmond (zu/abnehmend), Halbmond (Viertel), Vollmond; 17.11.2026 -> Halbmond', (function () { const n = S.MOON_PHASE_NAMES; const q = S.moonPhaseInfo(S.localDayStart('2026-11-17') + 43200000); return n.length === 8 && n[0] === 'Neumond' && n[4] === 'Vollmond' && /Sichelmond/.test(n[1]) && /Sichelmond/.test(n[7]) && /Halbmond/.test(n[2]) && /Halbmond/.test(n[6]) && q.name === n[2]; })());
  ok('fullMoonsInMonth: Jan 2018 + Mai 2026 je 2 Vollmonde (Blauer Mond), Nov 2026 nur 1', S.fullMoonsInMonth(2018, 0).length === 2 && S.fullMoonsInMonth(2026, 4).length === 2 && S.fullMoonsInMonth(2026, 10).length === 1);
  ok('moonEcliptic (Meeus/ELP2000-82, 60+60 Terme + Gezeiten-Term -25.858″/cy²): Referenz 12.04.1992 00:00 UT – lam 133.162655, b -3.229126, dist 368409.7 km', (function () { const e = S.moonEcliptic((2448724.5 - 2440587.5) * 86400000); return S.MOON_TERMS_LR.length === 60 && S.MOON_TERMS_B.length === 60 && sm.indexOf('-25.858') >= 0 && Math.abs(e.lam - 133.162655) < 0.001 && Math.abs(e.b - (-3.229126)) < 0.001 && Math.abs(e.dist - 368409.7) < 1; })());
  ok('moonEcliptic Langzeitbereich: Jahr 1000/3000/1919 – gueltige Werte, Konjunktion 29.05.1919 (totale SoFi) gefunden', (function () { function okDate(y) { const e = S.moonEcliptic(Date.UTC(y, 0, 1)); return isFinite(e.lam) && e.lam >= 0 && e.lam < 360 && Math.abs(e.b) <= 5.3 && e.dist > 340000 && e.dist < 420000; } var best = 1e9; for (var t = Date.UTC(1919, 4, 29, 6, 0); t <= Date.UTC(1919, 4, 29, 22, 0); t += 60000) { var jd = S.toJD(t); var e2 = S.moonEcliptic(t); var sp = S.sunParams(jd); var dRa = (e2.ra - sp.ra) * Math.cos(e2.dec * S.RAD); var d = Math.acos(Math.sin(e2.dec * S.RAD) * Math.sin(sp.dec) + Math.cos(e2.dec * S.RAD) * Math.cos(sp.dec) * Math.cos(dRa)) * S.DEG; if (d < best) { best = d; } } return okDate(1000) && okDate(3000) && okDate(1919) && best < 0.5; })());
  ok('eclipseAt: 03.03.2026 + 31.01.2018 + 14.03.2025 total (Blutmond), 20.02.2027 partiell, 24.11.2026 keine', (function () { const f = function (y, mo) { return S.fullMoonsInMonth(y, mo)[0]; }; return S.eclipseAt(f(2026, 2)).type === 'total' && S.eclipseAt(f(2025, 2)).type === 'total' && S.eclipseAt(S.fullMoonsInMonth(2018, 0)[1]).type === 'total' && S.eclipseAt(f(2027, 1)).type === 'partiell' && S.eclipseAt(f(2026, 10)).type === 'keine'; })());
  ok('specialMoonInfo: 31.05.2026 Blauer Mond + Mikromond; 03.03.2026 Blutmond; 17.11.2026 leer', (function () { const a = S.specialMoonInfo(S.localDayStart('2026-05-31')).map(x => x.label); const b = S.specialMoonInfo(S.localDayStart('2026-03-03')).map(x => x.label); const c = S.specialMoonInfo(S.localDayStart('2026-11-17')); return a.indexOf('Blauer Mond') >= 0 && a.indexOf('Mikromond') >= 0 && b.indexOf('Blutmond') >= 0 && c.length === 0; })());
  ok('nextEclipse/nextBlueMoon ab 17.11.2026: Finsternis Anfang 2027 (22.01. halbschatten / 20.02. partiell), Blauer Mond 31.12.2028', (function () { const e = S.nextEclipse(Date.UTC(2026, 10, 17)); const b = S.nextBlueMoon(Date.UTC(2026, 10, 17)); const ed = new Date(e.opp); return !!e && ed.getUTCFullYear() === 2027 && (ed.getUTCMonth() === 0 || ed.getUTCMonth() === 1) && (e.type === 'partiell' || e.type === 'total' || e.type === 'halbschatten') && !!b && b.year === 2028 && b.month === 11 && new Date(b.t).getUTCDate() === 31; })());
  ok('sonne-mond.html: Ausklappmenü «Besondere Mond-Daten» in Mond-Gruppe (details.hint.spec, Cache pro Tag)', ['<details class="hint spec">', 'Besondere Mond-Daten', 'specialMoonInfo(dayStart)', 'nextEclipse(dayStart)', 'nextBlueMoon(dayStart)', 'state.specDay !== dayStart'].every(x => sm.indexOf(x) >= 0));
  ok('specMoonClass + specMoonB (Klasse + Inline-Farbe + Emoji) + CSS: Blauer Mond blau, Blutmond rot, partiell dunkel (spec-shade), Halbschatten dezent (spec-faint), Supermond pulsiert (specPulse), Mikromond grau, reduced-motion-Fallback', S.specMoonClass('Blauer Mond') === 'spec-blue' && S.specMoonClass('Blutmond') === 'spec-red' && S.specMoonClass('Partielle Mondfinsternis') === 'spec-shade' && S.specMoonClass('Halbschatten-Mondfinsternis') === 'spec-faint' && S.specMoonClass('Supermond') === 'spec-super' && S.specMoonClass('Mikromond') === 'spec-micro' && S.specMoonClass('x') === '' && S.specMoonB('Blutmond', 'Blutmond') === '<b class="spec-red" style="color:var(--spec-red) !important"><span class="moonred"></span>Blutmond</b>' && S.specMoonB('Blauer Mond', 'Blauer Mond') === '<b class="spec-blue" style="color:var(--spec-blue) !important">🌕 Blauer Mond</b>' && S.specMoonB('Halbschatten-Mondfinsternis', 'Halbschatten-Mondfinsternis') === '<b class="spec-faint" style="color:var(--spec-faint) !important">🌔 Halbschatten-Mondfinsternis</b>' && S.specMoonB('x', 'x') === '<b class="">x</b>' && ['b.spec-blue', 'b.spec-red', 'b.spec-shade { color:var(--spec-shade) !important;', 'b.spec-faint { color:var(--spec-faint) !important;', 'b.spec-super', '@keyframes specPulse', 'prefers-reduced-motion: reduce', 'b.spec-micro { color:var(--spec-micro) !important; font-size:.85em; }'].every(x => sm.indexOf(x) >= 0));
  ok('sonne-mond.html: «Nächste Mondfinsternis» (rot/dunkel/dezent je Typ) und «Nächster Blauer Mond» (blau) als specMoonB(...) mit Klasse + Inline-Farbe + Emoji – DOM-Kette details.hint.spec > b.spec-*', (function () { return sm.indexOf('<details class="hint spec">') >= 0 && sm.indexOf("specMoonB(state.specNext.eclipse.type === 'total' ? 'Blutmond' : state.specNext.eclipse.type === 'partiell' ? 'Partielle Mondfinsternis' : 'Halbschatten-Mondfinsternis', 'Nächste Mondfinsternis:')") >= 0 && sm.indexOf("specMoonB('Blauer Mond', 'Nächster Blauer Mond:')") >= 0 && sm.indexOf('specMoonB(s.label, s.label)') >= 0 && sm.indexOf('b.spec-blue { color:') >= 0 && sm.indexOf('b.spec-red { color:') >= 0 && sm.indexOf('b.spec-shade { color:') >= 0 && sm.indexOf('b.spec-faint { color:') >= 0 && sm.indexOf('b.spec-super {') >= 0; })());
  ok('sonne-mond.html: Mondphase als dynamisches Phasen-Icon in Tabelle + Mond-Abschnittsheader + Statuskarte', ['moonPhaseEmoji(ph.phase)', "sec(moonPhaseEmoji(ph.phase) + ' Mond')", "$('stMoonPhase').textContent = moonPhaseEmoji(ph.phase)"].every(x => sm.indexOf(x) >= 0) && sm.indexOf("row('🌕 Mondphase") < 0);
  ok('TIME_SOURCES: mind. 3 Quellen mit name/url/parse/mode + kurzem label fuer die Anzeige', Array.isArray(S.TIME_SOURCES) && S.TIME_SOURCES.length >= 3 && S.TIME_SOURCES.every(s => typeof s.name === 'string' && typeof s.label === 'string' && s.label.length <= 22 && typeof s.url === 'function' && typeof s.parse === 'function' && (s.mode === 'json' || s.mode === 'text' || s.mode === 'header')) && S.TIME_SOURCES[0].label === 'Cloudflare' && sm.indexOf('source: src.label || src.name') >= 0);
  ok('TIME_SOURCES: URLs zeigen auf erlaubte Hosts', S.TIME_SOURCES.every(s => /^https:\/\/(www\.cloudflare\.com|worldtimeapi\.org|api\.open-meteo\.com)\//.test(s.url())));
  ok('TIME_SOURCES: Auto-URLs parameterfrei (keine Zeitzone/Koordinaten in der URL)', S.TIME_SOURCES.every(s => { const u = s.url(); return u.indexOf('Europe/') < 0 && u.indexOf('timeZone=') < 0 && u.indexOf('latitude=47') < 0 && u.indexOf('longitude=8') < 0; }));
  ok('Quelle worldtimeapi ist /api/ip (ohne Zeitzone in der URL)', S.TIME_SOURCES.some(s => s.url() === 'https://worldtimeapi.org/api/ip'));
  ok('Quelle open-meteo nutzt latitude=0&longitude=0&timezone=UTC', S.TIME_SOURCES.some(s => /latitude=0&longitude=0&current=temperature_2m&timezone=UTC/.test(s.url())));
  ok('tzName() liefert IANA-Zeitzone oder UTC', typeof S.tzName() === 'string' && S.tzName().length > 0);
  ok('dateStrOf', S.dateStrOf(new Date(2026, 5, 22, 0, 30).getTime()) === '2026-06-22');
  {
    const wt = S.TIME_SOURCES.find(s => s.url() === 'https://worldtimeapi.org/api/ip');
    ok('Quelle worldtimeapi /api/ip: unixtime -> ms', near(wt.parse({ unixtime: 1763400000 }), 1763400000000, 1) && isNaN(wt.parse({})));
    const om = S.TIME_SOURCES.find(s => s.name.indexOf('api.open-meteo.com') === 0);
    ok('Quelle open-meteo: current.time + utc_offset_seconds (+1h)', om.parse({ current: { time: '2025-11-17T14:30' }, utc_offset_seconds: 3600 }) === Date.UTC(2025, 10, 17, 13, 30));
    ok('Quelle open-meteo: UTC-Offset 0', om.parse({ current: { time: '2025-11-17T14:30' }, utc_offset_seconds: 0 }) === Date.UTC(2025, 10, 17, 14, 30));
    ok('Quelle open-meteo: ohne current.time -> NaN', isNaN(om.parse({})));
    const cf = S.TIME_SOURCES.find(s => s.mode === 'text');
    ok('Quelle cloudflare cdn-cgi/trace: ts= parsen', near(cf.parse('h=www.cloudflare.com\nts=1763400000.5\n'), 1763400000500, 1) && isNaN(cf.parse('garbage')));
    const hd = S.TIME_SOURCES.find(s => s.mode === 'header');
    ok('Quelle HTTP-Date-Header: RFC1123 parsen', hd.parse('Wed, 18 Nov 2026 07:20:00 GMT') === Date.UTC(2026, 10, 18, 7, 20) && isNaN(hd.parse(null)));
    ok('Header-Quelle nutzt HEAD + date', hd.method === 'HEAD' && hd.header === 'date');
  }
  {
    const csp = sm.match(/Content-Security-Policy"[^>]*/)[0];
    ok('CSP: Zeitquellen-Hosts in connect-src, timeapi.io nicht', ['https://nominatim.openstreetmap.org', 'https://worldtimeapi.org', 'https://api.open-meteo.com', 'https://www.cloudflare.com'].every(h => csp.indexOf(h) >= 0) && csp.indexOf('timeapi.io') < 0);
  }
  ok('sonne-mond.html: Zeitquellen-Liste im Markup (Auto + Nachschlagen + time.gov)', ['cdn-cgi/trace', 'worldtimeapi.org/api/ip', 'api.open-meteo.com/v1/forecast', 'worldtimeapi.org/api/timezone/', 'timeapi.io/api/time/current/zone', 'time.gov', 'Systemuhr'].every(x => sm.indexOf(x) >= 0));
  ok('sonne-mond.html: Datenschutz-Hinweis (IP-Adresse, parameterfreie URLs, client_ip)', sm.indexOf('IP-Adresse') >= 0 && sm.indexOf('parameterfreie') >= 0 && sm.indexOf('client_ip') >= 0);
  ok('sonne-mond.html: Zeitquellen-Block als Ausklappmenü (<details class="hint zeitq">, zugeklappt) – Inhalt inkl. Datenschutz darin, Abschalt-Checkbox #zeitSync bleibt sichtbar ausserhalb; Tipp-<details class="hint"> bleibt eindeutig', sm.indexOf('<details class="hint zeitq"><summary>⏱ Zeitquellen') >= 0 && sm.indexOf('</div></details>') < sm.indexOf('id="zeitSync"') && sm.indexOf('.hint.zeitq { font-size:.9rem; }') >= 0 && (sm.match(/<details class="hint">/g) || []).length === 1);
  ok('sonne-mond.html: Zeitabgleich abschaltbar (Checkbox zeitSync)', sm.indexOf('id="zeitSync"') >= 0 && sm.indexOf('Zeitabgleich deaktiviert') >= 0);
  ok('sonne-mond.html: fetchNetTime mit Header-Modus, Fallback Systemuhr', sm.indexOf("src.mode === 'header'") >= 0 && sm.indexOf('Systemuhr (keine Verbindung)') >= 0 && sm.indexOf('function nowMs()') >= 0);
  ok('sonne-mond.html: Besucherzaehler-Beacon mit site sonne-mond (sendBeacon + fetch-Fallback)', sm.indexOf("site: 'sonne-mond'") >= 0 && sm.indexOf("sendBeacon('counter.php'") >= 0 && sm.indexOf("fetch('counter.php'") >= 0);
  ok('sonne-mond.html: Beacon nur bei http/https (file:// sendet nichts)', sm.indexOf("location.protocol === 'http:' || location.protocol === 'https:'") >= 0);
  ok('sonne-mond.html: CSP connect-src enthaelt self (counter.php)', (sm.match(/Content-Security-Policy"[^>]*/) || [''])[0].indexOf("connect-src 'self' https://nominatim.openstreetmap.org") >= 0);
  ok('sonne-mond.html: Datenschutz-Link im Footer', sm.indexOf('href="koordinaten/datenschutz.html"') >= 0);
  ok('shiftDateStr: +1/-1 Tag, Monats-/Jahreswechsel, Schaltjahr', S.shiftDateStr('2026-06-21', 1) === '2026-06-22' && S.shiftDateStr('2026-06-21', -1) === '2026-06-20' && S.shiftDateStr('2026-03-01', -1) === '2026-02-28' && S.shiftDateStr('2024-02-28', 1) === '2024-02-29' && S.shiftDateStr('2026-12-31', 1) === '2027-01-01' && S.shiftDateStr('2026-01-01', -1) === '2025-12-31' && S.shiftDateStr('xx', 1) === 'xx');
  ok('sonne-mond.html: Tag-Schalter dayMinus/dayPlus vorhanden und verdrahtet', sm.indexOf('id="dayMinus"') >= 0 && sm.indexOf('id="dayPlus"') >= 0 && sm.indexOf('shiftDateStr(state.datum, -1)') >= 0 && sm.indexOf('shiftDateStr(state.datum, 1)') >= 0);
  ok('calendarGrid: Juni 2026 (1.6. ist Montag) – 42 Zellen, 30 im Monat, Start/Ende korrekt', (function () { const g = S.calendarGrid(2026, 5); return g.length === 42 && g[0].date === '2026-06-01' && g[0].inMonth === true && g.filter(c => c.inMonth).length === 30 && g[41].date === '2026-07-12'; })());
  ok('calendarGrid: Februar 2026 = 28 Tage, Februar 2024 (Schaltjahr) = 29 Tage', S.calendarGrid(2026, 1).filter(c => c.inMonth).length === 28 && S.calendarGrid(2024, 1).filter(c => c.inMonth).length === 29);
  ok('monthLabel deutsch', S.monthLabel(2026, 10) === 'November 2026' && S.monthLabel(2026, 0) === 'Januar 2026');
  ok('sonne-mond.html: Maus-Kalender vorhanden und verdrahtet (calBtn/calPop/Monat-Navigation/Tag-Klick via applyDatum)', ['id="calBtn"', 'id="calPop"', 'cal-day', 'id="calPrev"', 'id="calNext"', 'calendarGrid(calY, calM)', "applyDatum(b.getAttribute('data-date'))"].every(x => sm.indexOf(x) >= 0));
  ok('sonne-mond.html verlinkt SVG-Favicon img/sonne-mond.svg', sm.indexOf('<link rel="icon" type="image/svg+xml" href="img/sonne-mond.svg">') >= 0);
  ok('sonne-mond.html: Header nutzt brand-icon img statt Emoji', sm.indexOf('<span class="brand-icon"><img src="img/sonne-mond.svg"') >= 0 && sm.indexOf('brand-icon">☀') < 0);
  ok('sonne-mond.html: CSS sizing fuer .brand-icon img', sm.indexOf('.brand-icon img {') >= 0);
  {
    const svgF = path.join(__dirname, '..', 'img', 'sonne-mond.svg');
    ok('Icon-Datei vorhanden: img/sonne-mond.svg', fs.existsSync(svgF));
    const svg2 = fs.readFileSync(svgF, 'utf8');
    ok('SVG gueltig mit viewBox 0 0 200 200 (wie motorsaeage.svg)', svg2.indexOf('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">') === 0);
    ok('SVG enthaelt Sonne (Amber-Kreis + Strahlen) und Mond (Sichel)', svg2.indexOf('fill="#f5b942"') >= 0 && (svg2.match(/<line /g) || []).length >= 8 && svg2.indexOf('fill="#9db4d0"') >= 0 && svg2.indexOf('fill-rule="evenodd"') >= 0);
  }
  ok('sonne-mond.html: animierter Hintergrund sky-bg mit bg-sun + bg-moon', ['class="sky-bg"', 'class="bg-sun"', 'class="bg-moon"', '@keyframes bgSunArc', '@keyframes bgMoonArc', 'aria-hidden="true"'].every(x => sm.indexOf(x) >= 0));
    ok('Hintergrund farbiger/natuerlicher: Sonne radialGradient gelb (#fff3c4 -> #ffd54a -> #f7ad24 -> #ef9412) + Strahlen-Verlauf + Glow, Mond linearGradient blaugrau wie Icon (#eef4fd -> #b9cbe4 -> #8fa9c9) + Glow; groesser (110px) + sichtbarer (opacity .22/.18, dark .3/.24)', ['radialGradient id="bgSunG"', 'stop-color="#ffd54a"', 'stop-color="#ef9412"', 'linearGradient id="bgRayG"', 'linearGradient id="bgMoonG"', 'stop-color="#b9cbe4"', 'stop-color="#8fa9c9"', 'url(#bgSunG)', 'url(#bgMoonG)', 'width:110px; height:110px; opacity:.22', 'opacity:.18; animation:bgMoonArc', 'drop-shadow(0 0 22px rgba(247,173,36,.55))', 'drop-shadow(0 0 16px rgba(157,180,208,.5))', '.bg-sun { opacity:.3; }', '.bg-moon { opacity:.24; }'].every(x => sm.indexOf(x) >= 0));
ok('sonne-mond.html: Hintergrund-Sonne/Mond gegenlaeufig (Ebbe/Flut) + reduced-motion', sm.indexOf('animation-delay:-35s') >= 0 && /prefers-reduced-motion: reduce[\s\S]*?\.bg-sun \{ animation:none/.test(sm) && /prefers-reduced-motion: reduce[\s\S]*?\.bg-moon \{ animation:none/.test(sm));
  ok('sonne-mond.html: Hintergrund hinter dem Inhalt (z-index) und klick-durchlaessig', sm.indexOf('.sky-bg { position:fixed; inset:0; z-index:0; overflow:hidden; pointer-events:none; }') >= 0 && sm.indexOf('position:relative; z-index:1;') >= 0);
  ok('buildSearchUrls: 2 Quellen (Nominatim + Photon), q encodiert', (function () { const u = S.buildSearchUrls('San Andrés', 28.1, -16.7); return u.length === 2 && u[0].indexOf('nominatim.openstreetmap.org/search') >= 0 && u[0].indexOf('q=San%20Andr%C3%A9s') >= 0 && u[1].indexOf('photon.komoot.io/api/') >= 0; })());
  ok('buildSearchUrls: viewbox-Bias um (28.1, -16.7) + bounded=0 + photon lat/lon', (function () { const u = S.buildSearchUrls('x', 28.1, -16.7); return u[0].indexOf('viewbox=-18.7,26.1,-14.7,30.1') >= 0 && u[0].indexOf('bounded=0') >= 0 && u[1].indexOf('lat=28.1&lon=-16.7') >= 0; })());
  ok('buildSearchUrls: ohne Koordinate kein Bias', (function () { const u = S.buildSearchUrls('x', NaN, NaN); return u[0].indexOf('viewbox=') < 0 && u[0].indexOf('bounded=') < 0 && u[1].indexOf('lat=') < 0; })());
  ok('dedupeOrtResults: Duplikate entfernt, Reihenfolge stabil, kaputte Eintraege raus', (function () { const r = S.dedupeOrtResults([{ lat: 28.12, lon: -16.71, name: 'San Andrés' }, { lat: 28.1204, lon: -16.7098, name: 'san andrés' }, { lat: 28.5, lon: -16.2, name: 'La Laguna' }, { lat: NaN, lon: 1, name: 'kaputt' }]); return r.length === 2 && r[0].name === 'San Andrés' && r[1].name === 'La Laguna'; })());
  ok('nominatimSub / photonLabel', S.nominatimSub({ address: { state: 'Santa Cruz de Tenerife', country: 'Spanien' } }) === 'Santa Cruz de Tenerife, Spanien' && S.nominatimSub({}) === '' && S.photonLabel({ name: 'San Andrés', city: 'San Andrés y Sauces', state: 'Santa Cruz de Tenerife', country: 'Spain' }) === 'San Andrés, San Andrés y Sauces, Santa Cruz de Tenerife, Spain');
  ok('sonne-mond.html: Ortssuche robust verdrahtet (buildSearchUrls + Bias + Dedupe + Adressdetails + Tipp)', ['buildSearchUrls(q, lat, lon)', 'viewbox=', 'bounded=0', 'addressdetails=1', 'photon.komoot.io/api/', 'dedupeOrtResults', 'San Andrés Teneriffa'].every(x => sm.indexOf(x) >= 0));
  ok('sonne-mond.html: CSP enthaelt photon.komoot.io', (sm.match(/Content-Security-Policy"[^>]*/) || [''])[0].indexOf('https://photon.komoot.io') >= 0);
  ok('sonne-mond.html: locKnown-Tracking (Default-Koordinate ohne Bias; saved/URL/applyCoords setzen true)', sm.indexOf('locKnown: false') >= 0 && (sm.match(/state\.locKnown = true/g) || []).length >= 3);
  ok('sonne-mond.html: Suche priorisiert lokal via biasGeo-Checkbox + Geraetestandort, Fallback gesetzte Koordinate', sm.indexOf("$('biasGeo').checked") >= 0 && sm.indexOf('run(pos.coords.latitude, pos.coords.longitude,') >= 0 && sm.indexOf('state.locKnown ? state.lat : NaN') >= 0 && sm.indexOf('{ timeout: 6000, maximumAge: 600000 }') >= 0);
  ok('sonne-mond.html: biasGeo-Checkbox im Markup (default an) + Geraetestandort als erster Treffer', sm.indexOf('id="biasGeo" checked') >= 0 && sm.indexOf('Mein Gerätestandort') >= 0);
  ok('sonne-mond.html: Tipp nennt Kanarische Inseln als Beispiel', sm.indexOf('Kanarische Inseln') >= 0);
  ok('normalizeQuery: Akzente/Gross-Kleinschreibung/Zeichen raus', S.normalizeQuery('San Andrés') === 'san andres' && S.normalizeQuery('ZÜRICH!!') === 'zurich' && S.normalizeQuery('  Teneriffa  ') === 'teneriffa');
  ok('queryVariants: Original + normiert + letztes Wort abgeschnitten (max 3)', (function () { const v = S.queryVariants('San Andres Tenerifa'); return v[0] === 'San Andres Tenerifa' && v.indexOf('san andres') >= 0 && v.length <= 3 && S.queryVariants('Bern').length === 1 && S.queryVariants('San Andrés').indexOf('san andres') >= 0; })());
  ok('levenshtein', S.levenshtein('abc', 'abc') === 0 && S.levenshtein('abc', 'abd') === 1 && S.levenshtein('abc', 'abcd') === 1 && S.levenshtein('tenerifa', 'tenerife') === 1);
  ok('similarity: case/akzent-tolerant, 0 bei fremd', S.similarity('san andres', 'San Andrés, Santa Cruz de Tenerife, Spanien') === 1 && S.similarity('Bern', 'Zürich HB') === 0);
  ok('rankOrtResults: Treffer mit passendem Namen nach oben (stabil)', (function () { const r = S.rankOrtResults([{ name: 'Zürich', label: 'Zürich, Schweiz' }, { name: 'San Andrés', label: 'San Andrés, Santa Cruz de Tenerife, Spanien' }], 'San Andres'); return r[0].name === 'San Andrés' && r[1].name === 'Zürich'; })());
  ok('sonne-mond.html: Suche nutzt queryVariants + rankOrtResults + dedupe mit normalizeQuery', ['queryVariants(q)', 'rankOrtResults(all, q)', 'normalizeQuery(it.name', 'all.length >= 5'].every(x => sm.indexOf(x) >= 0));
  ok('sonne-mond.html: Hinweistext erklaert Gross/Klein + Akzente + Tippfehler', sm.indexOf('Gross-/Kleinschreibung und Akzente sind egal') >= 0 && sm.indexOf('«san andres» findet «San Andrés»') >= 0);
  ok('usStateToken: Code + Vollnamen + Komma, case-insensitive', S.usStateToken('Springfield MA') === 'ma' && S.usStateToken('Springfield, Illinois') === 'il' && S.usStateToken('portland or') === 'or' && S.usStateToken('Bern') === null && S.usStateToken('San Andrés Teneriffa') === null);
  ok('buildSearchUrls: US-Bundesstaat -> countrycodes=us bei Nominatim, nicht bei Photon', (function () { const u = S.buildSearchUrls('Springfield IL', 40.0, -89.5); return u[0].indexOf('countrycodes=us') >= 0 && u[1].indexOf('countrycodes') < 0 && u[1].indexOf('lat=40&lon=-89.5') >= 0; })());
  ok('buildSearchUrls: ohne US-Bundesstaat kein countrycodes', (function () { const u = S.buildSearchUrls('San Andrés', 28.1, -16.7); return u[0].indexOf('countrycodes') < 0; })());
  ok('sonne-mond.html: Hinweistext nennt USA/Bundesstaat', sm.indexOf('Bundesstaat anhängen') >= 0 && sm.indexOf('Springfield MA') >= 0 && sm.indexOf('countrycodes=us') >= 0);
  ok('detectCountryToken: Europa – Land-Vollnamen (DE/EN), ISO-Code gross, Komma', S.detectCountryToken('Zermatt Schweiz') === 'ch' && S.detectCountryToken('zermatt schweiz') === 'ch' && S.detectCountryToken('Zermatt CH') === 'ch' && S.detectCountryToken('Zermatt, Schweiz') === 'ch' && S.detectCountryToken('Paris Frankreich') === 'fr' && S.detectCountryToken('Paris France') === 'fr' && S.detectCountryToken('Lissabon Portugal') === 'pt' && S.detectCountryToken('Wien Österreich') === 'at' && S.detectCountryToken('Berlin Deutschland') === 'de' && S.detectCountryToken('London England') === 'gb' && S.detectCountryToken('London United Kingdom') === 'gb');
  ok('detectCountryToken: Mehrwort-Länder, ß, US-Bundesstaat-Code, 2-Buchstaben klein = kein Land, Negativfälle', S.detectCountryToken('Sarajevo Bosnien und Herzegowina') === 'ba' && S.detectCountryToken('Minsk Weißrussland') === 'by' && S.detectCountryToken('Springfield IL') === 'us' && S.detectCountryToken('Springfield MA') === 'us' && S.detectCountryToken('zermatt ch') === null && S.detectCountryToken('Teneriffa') === null && S.detectCountryToken('San Andrés Teneriffa') === null && S.detectCountryToken('') === null);
  ok('buildSearchUrls: Europa-Land -> countrycodes=<iso2> nur bei Nominatim, q unverändert', (function () { const u = S.buildSearchUrls('Zermatt Schweiz', 46.0, 7.7); return u[0].indexOf('countrycodes=ch') >= 0 && u[1].indexOf('countrycodes') < 0 && u[0].indexOf('q=Zermatt%20Schweiz') >= 0; })());
  ok('buildSearchUrls: Teneriffa ohne Landangabe -> weiterhin kein countrycodes', (function () { const u = S.buildSearchUrls('San Andrés Teneriffa', 28.1, -16.7); return u[0].indexOf('countrycodes') < 0; })());
  ok('sonne-mond.html: Hinweistext nennt Europa-Beispiele + Grossbuchstaben-/Landesnamen-Hinweis', sm.indexOf('Zermatt Schweiz') >= 0 && sm.indexOf('Paris Frankreich') >= 0 && sm.indexOf('Berlin Deutschland') >= 0 && sm.indexOf('Land ans Ende anh') >= 0);
  ok('detectCountryToken: Schweizer Kantone -> ch (Code gross + Vollnamen, Mehrwort)', S.detectCountryToken('Küsnacht ZH') === 'ch' && S.detectCountryToken('Zürich ZH') === 'ch' && S.detectCountryToken('Lausanne VD') === 'ch' && S.detectCountryToken('Genf GE') === 'ch' && S.detectCountryToken('Basel BS') === 'ch' && S.detectCountryToken('Rorschach St. Gallen') === 'ch' && S.detectCountryToken('Bern') === 'ch' && S.detectCountryToken('Küsnacht am Rigi') === null && S.detectCountryToken('Bern BE') === 'be');
  ok('buildSearchUrls: Kanton ZH -> countrycodes=ch nur bei Nominatim; Küsnacht am Rigi ohne Filter', (function () { const u = S.buildSearchUrls('Küsnacht ZH', 47.0, 8.7); const u2 = S.buildSearchUrls('Küsnacht am Rigi', 47.0, 8.7); return u[0].indexOf('countrycodes=ch') >= 0 && u[1].indexOf('countrycodes') < 0 && u2[0].indexOf('countrycodes') < 0; })());
  ok('sonne-mond.html: Hinweistext nennt Kantone (Küsnacht ZH, Lausanne VD)', sm.indexOf('Küsnacht ZH') >= 0 && sm.indexOf('Lausanne VD') >= 0 && sm.indexOf('Kanton anh') >= 0);
  ok('sonne-mond.html: langer Tipp als Ausklappmenu (<details class="hint"> + <summary>, zugeklappt) mit CSS', ['<details class="hint">', '<summary>Tipp: Ort + Region/Land angeben', '</div></details>', '.hint summary { cursor:pointer;'].every(x => sm.indexOf(x) >= 0) && (sm.match(/<details class="hint">/g) || []).length === 1);
  ok('sonne-mond.html: reverseGeocode nur bei bekannter Koordinate (kein falscher Ortsname bei Default)', sm.indexOf('if (!state.locKnown || state.name) { return; }') >= 0);
  ok('sonne-mond.html: Suche auch per Enter im Ortsfeld', sm.indexOf("$('ort').addEventListener('keydown'") >= 0 && sm.indexOf('searchOrt(q)') >= 0);
  ok('Datum-Funktionen: Leerzeichen vorne/hinten tolerant (localDayStart/shiftDateStr/fmtDateDE)', S.localDayStart(' 2025-03-14 ') === S.localDayStart('2025-03-14') && S.localDayStart('2025-03-14') != null && S.localDayStart('x') === null && S.shiftDateStr(' 2025-03-14 ', 1) === '2025-03-15' && S.fmtDateDE(' 2025-03-14 ') === '14.03.2025');
  ok('parseCoordInput: Leerzeichen vorne/hinten egal', (function () { const r = S.parseCoordInput('  46.5225, 6.6325  '); return !!r && Math.abs(r.lat - 46.5225) < 1e-9 && Math.abs(r.lon - 6.6325) < 1e-9; })());
  ok('sonne-mond.html: #q/#ort/#datum trimmen per blur (trimField); Submit/Enter/searchOrt nutzen trimField bzw. trim()', sm.indexOf('function trimField(el)') >= 0 && sm.indexOf("['q', 'ort', 'datum']") >= 0 && (sm.match(/addEventListener\('blur'/g) || []).length >= 1 && sm.indexOf('parseCoordInput(trimField($(') >= 0 && sm.indexOf('applyDatum(trimField($(') >= 0 && (sm.match(/var q = trimField\(\$\('ort'\)\);/g) || []).length === 2 && sm.indexOf("q = String(q || '').trim();") >= 0);
  ok('stripLeadingWs: nur fuehrende Leerzeichen sofort weg, Rest bleibt fuer blur/trim', S.stripLeadingWs('  San Andrés') === 'San Andrés' && S.stripLeadingWs('\t\n Bern ') === 'Bern ' && S.stripLeadingWs('Bern') === 'Bern' && S.stripLeadingWs('') === '');
  ok('sonne-mond.html: #q/#ort – fuehrende Leerzeichen werden sofort beim Tippen/Pasten entfernt (input-Event)', sm.indexOf("['q', 'ort']") >= 0 && sm.indexOf("addEventListener('input'") >= 0 && sm.indexOf('stripLeadingWs(el.value)') >= 0);
  ok('sonne-mond.html: Hinweistext erklaert Bias + Geraetestandort + weltweit ohne Bias', sm.indexOf('um deinen Gerätestandort (Geolokalisierung)') >= 0 && sm.indexOf('weltweit gesucht') >= 0);
  ok('escHtml: escapet & < > " \' vollstaendig', S.escHtml('<>&"\'') === '&lt;&gt;&amp;&quot;&#39;' && S.escHtml(null) === '' && S.escHtml(5) === '5');
  ok('tzOffsetMs: Atlantic/Canary Jan UTC+0 / Jul UTC+1, Europe/Zurich Jan +1 / Jul +2, New_York -5; null/kaputt -> lokal, viewTz ohne state = null', S.tzOffsetMs(Date.UTC(2026,0,15,12), 'Atlantic/Canary') === 0 && S.tzOffsetMs(Date.UTC(2026,6,15,12), 'Atlantic/Canary') === 3600000 && S.tzOffsetMs(Date.UTC(2026,0,15,12), 'Europe/Zurich') === 3600000 && S.tzOffsetMs(Date.UTC(2026,6,15,12), 'Europe/Zurich') === 7200000 && S.tzOffsetMs(Date.UTC(2026,0,15,12), 'America/New_York') === -18000000 && S.tzOffsetMs(Date.UTC(2026,0,15,12), null) === -new Date(Date.UTC(2026,0,15,12)).getTimezoneOffset() * 60000 && S.tzOffsetMs(Date.UTC(2026,0,15,12), 'Kaputt/Zone') === S.tzOffsetMs(Date.UTC(2026,0,15,12), null) && S.viewTz() === null);
  ok('dayStartUtc: Z\u00fcrich 21.06.2026 = 20.06. 22:00 UTC, Kanaren 15.01.2026 = 00:00 UTC, ohne tz = localDayStart, kaputt = null', S.dayStartUtc('2026-06-21', 'Europe/Zurich') === Date.UTC(2026,5,20,22,0,0) && S.dayStartUtc('2026-01-15', 'Atlantic/Canary') === Date.UTC(2026,0,15,0,0,0) && S.dayStartUtc('2026-06-21', null) === S.localDayStart('2026-06-21') && S.dayStartUtc('xx', 'Europe/Zurich') === null);
  ok('fmtUtcOffset: UTC+0 / UTC+1 / UTC-5 / UTC+5:30', S.fmtUtcOffset(0) === 'UTC+0' && S.fmtUtcOffset(3600000) === 'UTC+1' && S.fmtUtcOffset(-18000000) === 'UTC-5' && S.fmtUtcOffset(19800000) === 'UTC+5:30');
  ok('sonne-mond.html: Orts-Zeitzone via Open-Meteo (timezone=auto) -> state.tz; Tag & Zeiten in Orts-Zeitzone; Anzeige in coordInfo; Fallback Geräte-Zeitzone', ['timezone=auto', 'function fetchOrtsZeitzone()', 'dayStartView(state.datum)', 'tz: null', 'fmtUtcOffset(tzOffsetMs(nowMs(), tz))', 'fetchOrtsZeitzone();', 'function viewTz()', 'function tzOffsetMs(ms, tz)', 'function dayStartUtc(dateStr, tz)'].every(x => sm.indexOf(x) >= 0));
  ok('viewOffsetMs/dayStartView ohne state = lokal (bisheriges Verhalten)', S.viewOffsetMs(Date.UTC(2026,0,15,12)) === -new Date(Date.UTC(2026,0,15,12)).getTimezoneOffset() * 60000 && S.dayStartView('2026-06-21') === S.localDayStart('2026-06-21') && S.dayStartView('xx') === null);
  ok('sonne-mond.html: manuelles UTC-Offset-Feld #tzManWrap/#tzMan (nur sichtbar ohne automatische Zeitzone), Optionen UTC-12 bis UTC+14 in 30-min-Schritten + :45-Zonen, Anzeige UTC+x (manuell), auto-tz schaltet manuell aus', ['id="tzManWrap"', 'id="tzMan"', 'function viewOffsetMs(ms)', 'function dayStartView(dateStr)', 'dayStartView(state.datum)', 'tzMin: null', 'for (var m = -720; m <= 840; m += 30)', 'offs.push(345, 525, 765)', " (manuell)</b>", "function parseTzInput(v)", "id=\"tzCityList\"", "list=\"tzCityList\"", "TZ_CITY_LIST", "tzAuto", 'state.tzMin = null;', 'Math.abs(saved.tzMin) <= 840'].every(x => sm.indexOf(x) >= 0));
  ok('parseTzInput: UTC±x (inkl. :30/:45, Limit ±14h), leer=clear, Städte per Normalisierung/Alias/IANA-Name, Unbekannt=error', (function () { var r1 = S.parseTzInput('UTC+2'), r2 = S.parseTzInput('utc -3:30'), r3 = S.parseTzInput('UTC+5:45'), r4 = S.parseTzInput('UTC+15'), r5 = S.parseTzInput('  '), r6 = S.parseTzInput('Paris'), r7 = S.parseTzInput('new york'), r8 = S.parseTzInput('NYC'), r9 = S.parseTzInput('Teneriffa'), r10 = S.parseTzInput('Kanarische Inseln'), r11 = S.parseTzInput('São Paulo'), r12 = S.parseTzInput('San Francisco'), r13 = S.parseTzInput('Europe/Zurich'), r14 = S.parseTzInput('gibberish xyz'); return r1.tzMin === 120 && r2.tzMin === -210 && r3.tzMin === 345 && !!r4.error && r5.clear === true && r6.tz === 'Europe/Paris' && r7.tz === 'America/New_York' && r8.tz === 'America/New_York' && r9.tz === 'Atlantic/Canary' && r10.tz === 'Atlantic/Canary' && r11.tz === 'America/Sao_Paulo' && r12.tz === 'America/Los_Angeles' && r13.tz === 'Europe/Zurich' && !!r14.error; })());
  ok('normalizeTzKey: Akzente/Grossschreibung/Sonderzeichen raus', S.normalizeTzKey('São Paulo') === 'saopaulo' && S.normalizeTzKey('New York, USA!') === 'newyorkusa' && S.normalizeTzKey('München') === 'munchen' && S.normalizeTzKey('Europe/Zurich') === 'europezurich');
  ok('TZ_CITY_MAP: Label + Alias + IANA-Name zeigen auf gleiche Zone', S.TZ_CITY_MAP['paris'] === 'Europe/Paris' && S.TZ_CITY_MAP['rom'] === 'Europe/Rome' && S.TZ_CITY_MAP['roma'] === 'Europe/Rome' && S.TZ_CITY_MAP['nyc'] === 'America/New_York' && S.TZ_CITY_MAP['sf'] === 'America/Los_Angeles' && S.TZ_CITY_MAP['teneriffa'] === 'Atlantic/Canary' && S.TZ_CITY_MAP['europezurich'] === 'Europe/Zurich' && S.TZ_CITY_LIST.length >= 50);
  ok('TZ_CITY_MAP stark erweitert: alle IANA-Zonen via Intl.supportedValuesOf (Ho Chi Minh, Ulan Bator …) + kuratierte Labels gewinnen bei Kollision', S.TZ_CITY_MAP['hochiminh'] === 'Asia/Ho_Chi_Minh' && S.TZ_CITY_MAP['ulanbator'] === 'Asia/Ulan_Bator' && ['Asia/Ulan_Bator', 'Asia/Ulaanbaatar'].indexOf(S.TZ_CITY_MAP['ulaanbaatar']) >= 0 && S.TZ_CITY_MAP['saigon'] === 'Asia/Ho_Chi_Minh' && S.TZ_CITY_MAP['buenosaires'] === 'America/Argentina/Buenos_Aires' && S.TZ_CITY_MAP['zurich'] === 'Europe/Zurich' && Object.keys(S.TZ_CITY_MAP).length > 400 && S.tzZoneList().length > 400);
  ok('parseTzInput mit Zonen-Städten: «Ho Chi Minh», «ulan bator», «Asia/Kolkata»', S.parseTzInput('Ho Chi Minh').tz === 'Asia/Ho_Chi_Minh' && S.parseTzInput('ulan bator').tz === 'Asia/Ulan_Bator' && S.parseTzInput('saigon').tz === 'Asia/Ho_Chi_Minh' && S.parseTzInput('Asia/Kolkata').tz === 'Asia/Kolkata' && S.parseTzInput('Yangon').tz === 'Asia/Yangon');
  ok('TZ_CITY_ALIASES mehrsprachig (de/en/fr/it/es): Venedig/Venice/Venise/Venezia, Genève/Ginevra, Copenhague, Pékin/Pechino, San Paolo, Islas Canarias/Îles Canaries/Isole Canarie, Le Cap, La Habana, Ciudad de México – Akzente/Gross egal', S.parseTzInput('Venedig').tz === 'Europe/Rome' && S.parseTzInput('Venise').tz === 'Europe/Rome' && S.parseTzInput('Venezia').tz === 'Europe/Rome' && S.parseTzInput('Genève').tz === 'Europe/Zurich' && S.parseTzInput('ginevra').tz === 'Europe/Zurich' && S.parseTzInput('Copenhague').tz === 'Europe/Copenhagen' && S.parseTzInput('Pékin').tz === 'Asia/Shanghai' && S.parseTzInput('Pechino').tz === 'Asia/Shanghai' && S.parseTzInput('San Paolo').tz === 'America/Sao_Paulo' && S.parseTzInput('Islas Canarias').tz === 'Atlantic/Canary' && S.parseTzInput('Îles Canaries').tz === 'Atlantic/Canary' && S.parseTzInput('isole canarie').tz === 'Atlantic/Canary' && S.parseTzInput('Le Cap').tz === 'Africa/Johannesburg' && S.parseTzInput('La Habana').tz === 'America/Havana' && S.parseTzInput('Ciudad de México').tz === 'America/Mexico_City' && S.parseTzInput('LISBOA').tz === 'Europe/Lisbon' && S.TZ_CITY_ALIASES.length >= 40);
  ok('US-Städte mit gemeinsamer Zone: Salt Lake City/SLC -> America/Denver, Portland/Las Vegas -> America/Los_Angeles, Minneapolis -> America/Chicago, Atlanta/Philadelphia -> America/New_York, Detroit -> America/Detroit, Tucson -> America/Phoenix, Ottawa -> America/Toronto, Calgary -> America/Edmonton', S.parseTzInput('Salt Lake City').tz === 'America/Denver' && S.parseTzInput('slc').tz === 'America/Denver' && S.parseTzInput('Portland').tz === 'America/Los_Angeles' && S.parseTzInput('Las Vegas').tz === 'America/Los_Angeles' && S.parseTzInput('Minneapolis').tz === 'America/Chicago' && S.parseTzInput('Atlanta').tz === 'America/New_York' && S.parseTzInput('Philadelphia').tz === 'America/New_York' && S.parseTzInput('Detroit').tz === 'America/Detroit' && S.parseTzInput('Tucson').tz === 'America/Phoenix' && S.parseTzInput('Ottawa').tz === 'America/Toronto' && S.parseTzInput('Calgary').tz === 'America/Edmonton' && S.parseTzInput('Denver').tz === 'America/Denver' && S.parseTzInput('Houston').tz === 'America/Chicago' && S.parseTzInput('Chicago').tz === 'America/Chicago');
  ok('sonne-mond.html: datalist enthält kuratierte Städte + alle IANA-Zonen (tzZoneList/supportedValuesOf, Etc/ und UTC ausgesondert)', ['function tzZoneList()', 'Intl.supportedValuesOf', "z.indexOf('Etc/') === 0", 'seen[normalizeTzKey(row[0])] = 1'].every(x => sm.indexOf(x) >= 0));
  ok('Lazy Loading: js/tz-cities.js enth\u00e4lt TZ_CITY_LIST + TZ_CITY_ALIASES (inkl. Salt Lake City), Hauptdatei l\u00e4dt sie NICHT inline, sondern per loadTzCities() -> createElement script js/tz-cities.js; buildTzMan on-demand (Fokus/Feld sichtbar), change-Handler l\u00e4dt zuerst nach', (function () { const tzf = path.join(__dirname, '..', 'js', 'tz-cities.js'); if (!fs.existsSync(tzf)) { return false; } const tz = fs.readFileSync(tzf, 'utf8'); return tz.indexOf('var TZ_CITY_LIST = [') >= 0 && tz.indexOf('var TZ_CITY_ALIASES = [') >= 0 && tz.indexOf("'Salt Lake City'") >= 0 && tz.indexOf('Kanarische Inseln') >= 0 && sm.indexOf('function loadTzCities(cb)') >= 0 && sm.indexOf("sc.src = 'js/tz-cities.js'") >= 0 && sm.indexOf('function tzCitiesLoaded()') >= 0 && sm.indexOf('function tzBuildCityMap()') >= 0 && sm.indexOf('var TZ_CITY_LIST = [') < 0 && sm.indexOf('var TZ_CITY_ALIASES = [') < 0 && sm.indexOf('function buildTzMan()') >= 0 && sm.indexOf("addEventListener('focus', function () { buildTzMan(); })") >= 0 && sm.indexOf('loadTzCities(function () {') >= 2; })());
  ok('Suche funktioniert weiterhin mit ausgelagerten Daten (ortSrc im Test-Eval): US-Staat, Land, Kanton', S.usStateToken('Springfield MA') === 'ma' && S.detectCountryToken('Zermatt Schweiz') === 'ch' && S.detectCountryToken('Küsnacht ZH') === 'ch' && S.buildSearchUrls('Zermatt Schweiz', 46.0, 7.7)[0].indexOf('countrycodes=ch') >= 0);
}

// --- 9. Sicherheits-Haertung (XSS-Escaping, Clickjacking, CSP, Counter) ---
{
  const pages = {
    'index.html': fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8'),
    'gpx-reduce.html': fs.readFileSync(path.join(__dirname, '..', 'gpx-reduce.html'), 'utf8'),
    'sonne-mond.html': fs.readFileSync(path.join(__dirname, '..', 'sonne-mond.html'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '..', 'js', 'sonne-mond.js'), 'utf8'),
    'koordinaten/index.html': fs.readFileSync(path.join(__dirname, '..', 'koordinaten', 'index.html'), 'utf8'),
    'koordinaten/datenschutz.html': fs.readFileSync(path.join(__dirname, '..', 'koordinaten', 'datenschutz.html'), 'utf8'),
  };
  const fb = fs.readFileSync(path.join(__dirname, '..', 'js', 'framebust.js'), 'utf8');
  ok('js/framebust.js: Clickjacking-Schutz (window.top !== window.self)', fb.indexOf('if (window.top !== window.self) { window.top.location.replace(window.self.location.href); }') >= 0);
  for (const name of Object.keys(pages)) {
    ok(name + ': Framebusting extern (js/framebust.js) + Referrer-Policy + Permissions-Policy + CSP-Meta', pages[name].indexOf('js/framebust.js') >= 0 && pages[name].indexOf('strict-origin-when-cross-origin') >= 0 && pages[name].indexOf('Permissions-Policy') >= 0 && pages[name].indexOf('geolocation=(self)') >= 0 && pages[name].indexOf('camera=()') >= 0 && pages[name].indexOf('Content-Security-Policy') >= 0);
  }
  ok('gpx-reduce.html: CSP nur self + unsafe-inline, keine externen Hosts, object-src none', (function () { const m = pages['gpx-reduce.html'].match(/Content-Security-Policy" content="([^"]*)"/); return !!m && m[1].indexOf("default-src 'self'") >= 0 && m[1].indexOf('https://') < 0 && m[1].indexOf("object-src 'none'") >= 0 && m[1].indexOf("base-uri 'self'") >= 0; })());
  const sm2 = pages['sonne-mond.html'];
  ok('sonne-mond.html: escHtml in renderCoordInfo genutzt (kein partielles replace mehr)', sm2.indexOf('function escHtml(s)') >= 0 && sm2.indexOf('escHtml(state.name)') >= 0 && sm2.indexOf('state.name.replace(') < 0);
  const c1 = fs.readFileSync(path.join(__dirname, '..', 'counter.php'), 'utf8');
  const c2 = fs.readFileSync(path.join(__dirname, '..', 'koordinaten', 'counter.php'), 'utf8');
  ok('counter.php: Key nur noch per POST (kein $_GET key, kein key= in URLs) + Login-Formular', c1.indexOf("isset($_POST['key'])") >= 0 && c1.indexOf("isset($_GET['key'])") < 0 && c1.indexOf('&amp;key=') < 0 && c1.indexOf('function counterViewForm') >= 0 && c1.indexOf("isset($_REQUEST['view'])") >= 0);
  ok('counter.php: COUNTER_DATA_DIR-Override (Daten optional ausserhalb Webroot)', c1.indexOf('const COUNTER_DATA_DIR') >= 0 && c1.indexOf("COUNTER_DATA_DIR !== '' ? COUNTER_DATA_DIR") >= 0);
  ok('counter.php: CSV-Formel-Injection-Schutz (trim + fuehrende = + - @ bekommen ein fuehrendes \')', c1.indexOf("in_array($v[0], array('=', '+', '-', '@'), true)") >= 0 && c1.indexOf('$v = "\'" . $v;') >= 0 && c1.indexOf('$v = trim($v);') >= 0 && c1.indexOf('/[\\x00-\\x1F\\x7F|]/') >= 0);
  ok('counter.php Kopien weiterhin byte-identisch', c1 === c2);
  ok('counter-data/index.html + koordinaten/counter-data/index.html als Guard vorhanden', fs.existsSync(path.join(__dirname, '..', 'counter-data', 'index.html')) && fs.existsSync(path.join(__dirname, '..', 'koordinaten', 'counter-data', 'index.html')));
  const root = pages['index.html'];
  ok('index.html: Leaflet gepinnt (1.9.4) + SRI integrity + crossorigin auf js und css', root.indexOf('unpkg.com/leaflet@1.9.4/dist/leaflet.js') >= 0 && root.indexOf('unpkg.com/leaflet@1.9.4/dist/leaflet.css') >= 0 && (root.match(/integrity="sha256-/g) || []).length >= 2 && (root.match(/crossorigin=""/g) || []).length >= 2);
  {
    const smHtml = fs.readFileSync(path.join(__dirname, '..', 'sonne-mond.html'), 'utf8');
    const ixHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const cspSm = (smHtml.match(/Content-Security-Policy" content="([^"]*)"/) || [])[1] || '';
    const cspIx = (ixHtml.match(/Content-Security-Policy" content="([^"]*)"/) || [])[1] || '';
    ok('CSP hart: sonne-mond.html script-src nur self, index.html self+unpkg ohne unsafe-inline', cspSm.indexOf("script-src 'self'") >= 0 && !/script-src[^;]*unsafe-inline/.test(cspSm) && cspIx.indexOf("script-src 'self' https://unpkg.com") >= 0 && !/script-src[^;]*unsafe-inline/.test(cspIx) && cspSm.indexOf("style-src 'self' 'unsafe-inline'") >= 0);
    {
      const allPages = { 'sonne-mond.html': smHtml, 'index.html': ixHtml, 'gpx-reduce.html': fs.readFileSync(path.join(__dirname, '..', 'gpx-reduce.html'), 'utf8'), 'koordinaten/index.html': fs.readFileSync(path.join(__dirname, '..', 'koordinaten', 'index.html'), 'utf8'), 'koordinaten/datenschutz.html': fs.readFileSync(path.join(__dirname, '..', 'koordinaten', 'datenschutz.html'), 'utf8') };
      const jsFiles = { 'sonne-mond.html': 'js/sonne-mond.js', 'index.html': null, 'gpx-reduce.html': 'js/gpx-reduce.js', 'koordinaten/index.html': 'js/koordinaten.js', 'koordinaten/datenschutz.html': 'js/datenschutz.js' };
      ok('ALLE 5 Seiten: CSP script-src ohne unsafe-inline + kein Inline-Script mehr + externes JS eingebunden', Object.keys(allPages).every(n => { const c = (allPages[n].match(/Content-Security-Policy" content="([^"]*)"/) || [])[1] || ''; return !/script-src[^;]*unsafe-inline/.test(c) && !/<script>\n/.test(allPages[n]) && (jsFiles[n] === null || allPages[n].indexOf('src="' + jsFiles[n] + '"') >= 0 || allPages[n].indexOf('src="../' + jsFiles[n] + '"') >= 0); }));
    }
    ok('keine Inline-Event-Handler (on*=) in sonne-mond.html und index.html', !/\son[a-z]{2,15}=/i.test(smHtml) && !/\son[a-z]{2,15}=/i.test(ixHtml));
    const konvHtml = fs.readFileSync(path.join(__dirname, '..', 'koordinaten', 'index.html'), 'utf8');
    ok('koordinaten: OSM-Iframe mit sandbox="allow-scripts"', konvHtml.indexOf('<iframe id="osmmap" class="map hidden" loading="lazy" sandbox="allow-scripts"') >= 0);
      ok('Ordner js/ + css/: alle JS/CSS liegen in js/ bzw. css/; koordinaten/* referenzieren ../js/ (kein src="js/ mehr); koordinaten.js lädt ../js/konv-texte-*; root-Seiten js/ bzw. css/', (function () { const konvHtml2 = fs.readFileSync(path.join(__dirname, '..', 'koordinaten', 'index.html'), 'utf8'); const dsHtml = fs.readFileSync(path.join(__dirname, '..', 'koordinaten', 'datenschutz.html'), 'utf8'); const kj = fs.readFileSync(path.join(__dirname, '..', 'js', 'koordinaten.js'), 'utf8'); return konvHtml2.indexOf('src="js/') < 0 && konvHtml2.indexOf('src="../js/koordinaten.js"') >= 0 && konvHtml2.indexOf('src="../js/framebust.js"') >= 0 && dsHtml.indexOf('src="js/') < 0 && dsHtml.indexOf('src="../js/datenschutz.js"') >= 0 && kj.indexOf("'../js/konv-texte-'") >= 0 && fs.readdirSync(path.join(__dirname, '..', 'js')).every(f => f.endsWith('.js')) && fs.readdirSync(path.join(__dirname, '..', 'css')).every(f => f.endsWith('.css')); })());
ok('counter.php: Security-Header (nosniff, CSP default-src none, Referrer-Policy) in beiden Kopien', c1.indexOf("header('X-Content-Type-Options: nosniff')") >= 0 && c1.indexOf('Content-Security-Policy: default-src') >= 0 && c1.indexOf('counterSecurityHeaders();') >= 0 && c1 === c2);
  }
}

// --- 10. Lazy Loading (nur laden wenn gebraucht) ---
{
  const root = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const i18n = fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n.js'), 'utf8');
  ok('index.html: nur texte-de.js statisch, fr/it/es/pt NICHT mehr als <script src>', root.indexOf('js/texte-de.js') >= 0 && ['fr','it','es','pt'].every(l => root.indexOf('js/texte-' + l + '.js') < 0));
  ok('js/i18n.js: ladeTexte() l\u00e4dt js/texte-<lang>.js on-demand (setzeSprache + Init bei gespeicherter Sprache)', i18n.indexOf('function ladeTexte(lang, cb)') >= 0 && i18n.indexOf("sc.src = 'js/texte-' + lang + '.js'") >= 0 && i18n.indexOf('ladeTexte(neu, function ()') >= 0 && i18n.indexOf("ladeTexte(sprache, function () { i18nAnwenden(); })") >= 0);
  const konv2 = fs.readFileSync(path.join(__dirname, '..', 'koordinaten', 'index.html'), 'utf8') + '\n/*JS*/\n' + fs.readFileSync(path.join(__dirname, '..', 'js', 'koordinaten.js'), 'utf8');
  ok('koordinaten/index.html: TEXTE inline nur noch de; en/fr/it/es in js/konv-texte-*.js (lazy via ladeKonvTexte)', konv2.indexOf('  en: {') < 0 && konv2.indexOf('  fr: {') < 0 && konv2.indexOf('  es: {') < 0 && konv2.indexOf('  de: {') >= 0 && konv2.indexOf('function ladeKonvTexte(lang, cb)') >= 0 && konv2.indexOf("sc.src = '../js/konv-texte-' + lang + '.js'") >= 0 && konv2.indexOf("KONV_LANGS = ['de', 'en', 'fr', 'it', 'es']") >= 0 && konv2.indexOf('ladeKonvTexte(lang, function () { applyLang(lang); })') >= 0 && ['en','fr','it','es'].every(l => { const f = path.join(__dirname, '..', 'js', 'konv-texte-' + l + '.js'); return fs.existsSync(f) && fs.readFileSync(f, 'utf8').indexOf('window.TEXTE.' + l + ' = {') >= 0; }));
  const sm2 = fs.readFileSync(path.join(__dirname, '..', 'sonne-mond.html'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '..', 'js', 'sonne-mond.js'), 'utf8');
  ok('sonne-mond.html: Ortssuche-Daten (US_STATES/EU_COUNTRIES/CH_CANTONS) nicht mehr inline, sondern js/ort-suche-data.js lazy (loadOrtData, Fokus auf #ort, searchOrt l\u00e4dt nach, Guards)', (function () { const f = path.join(__dirname, '..', 'js', 'ort-suche-data.js'); if (!fs.existsSync(f)) { return false; } const d = fs.readFileSync(f, 'utf8'); return d.indexOf('var US_STATES = {') >= 0 && d.indexOf('var EU_COUNTRIES = {') >= 0 && d.indexOf('var CH_CANTONS = {') >= 0 && sm2.indexOf('var US_STATES = {') < 0 && sm2.indexOf('var EU_COUNTRIES = {') < 0 && sm2.indexOf('var CH_CANTONS = {') < 0 && sm2.indexOf('function loadOrtData(cb)') >= 0 && sm2.indexOf("sc.src = 'js/ort-suche-data.js'") >= 0 && sm2.indexOf('function ortDataLoaded()') >= 0 && sm2.indexOf('loadOrtData(function () { searchOrt(q); })') >= 0 && sm2.indexOf("addEventListener('focus', function () { loadOrtData(") >= 0 && sm2.indexOf("typeof US_STATE_NAMES === 'undefined'") >= 0 && sm2.indexOf("typeof COUNTRY_ALIASES === 'undefined'") >= 0; })());
}

console.log(failures === 0 ? '\nALLE TESTS OK' : '\n' + failures + ' TEST(S) FEHLGESCHLAGEN');
process.exit(failures === 0 ? 0 : 1);
