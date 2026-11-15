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

console.log(failures === 0 ? '\nALLE TESTS OK' : '\n' + failures + ' TEST(S) FEHLGESCHLAGEN');
process.exit(failures === 0 ? 0 : 1);
