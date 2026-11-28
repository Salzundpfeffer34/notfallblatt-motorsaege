/* EXIF-/XMP-GPS-Parser (JPEG/TIFF/RAW: Sony ARW, Canon CR2/CR3, Nikon NEF, Panasonic RW2/RWL, Olympus ORF, Fujifilm RAF, DNG + XMP-Fallback).
 * Reine Funktionen, ohne DOM \u2013 wird von js/koordinaten.js (Koordinaten-Seite) und js/bild-konv.js (sonne-mond.html) genutzt. */

function parseExifTimeStr(s) {
  if (typeof s !== 'string') { return null; }
  var m = s.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) { return null; }
  var ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return isFinite(ms) ? ms : null;
}
function sortPhotoPoints(pts) {
  return pts.slice().sort(function (a, b) {
    var ta = (a.time == null ? Infinity : a.time), tb = (b.time == null ? Infinity : b.time);
    if (ta !== tb) { return ta - tb; }
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}
function photoPointLine(p) { return p.lat.toFixed(6) + ', ' + p.lon.toFixed(6); }
function distM(lat1, lon1, lat2, lon2) {
  var R = 6371000, rad = Math.PI / 180;
  var dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
function filterMinDist(pts, minM) {
  if (!minM || minM <= 0) { return pts.slice(); }
  var out = [];
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i];
    if (!out.length) { out.push(p); continue; }
    var last = out[out.length - 1];
    if (distM(last.lat, last.lon, p.lat, p.lon) >= minM) { out.push(p); }
  }
  return out;
}
function filterMinDistTime(pts, minM, minSec) {
  minM = minM > 0 ? minM : 0; minSec = minSec > 0 ? minSec : 0;
  if (!minM && !minSec) { return pts.slice(); }
  var out = [];
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i];
    if (!out.length) { out.push(p); continue; }
    var last = out[out.length - 1], ok = false;
    if (minM) {
      ok = true;
      for (var k = 0; k < out.length; k++) { if (distM(out[k].lat, out[k].lon, p.lat, p.lon) < minM) { ok = false; break; } }
    }
    if (!ok && minSec && (p.time == null || last.time == null || p.time - last.time >= minSec * 1000)) { ok = true; }
    if (ok) { out.push(p); }
  }
  return out;
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
  var gpsPtr = -1, exifPtr = -1, xmpOff = -1, xmpCnt = 0, timeStr = '';
  function asciiAt(e) {
    var typ = u16(e + 2), cnt = u32(e + 4), vo = cnt > 4 ? u32(e + 8) : e + 8, s = '', k;
    if ((typ !== 2 && typ !== 1) || vo < 0 || vo + cnt > v.byteLength - tiff) { return ''; }
    for (k = 0; k < cnt; k++) { s += String.fromCharCode(v.getUint8(tiff + vo + k)); }
    return s.replace(/\0[\s\S]*$/, '');
  }
  function scanIfd(off) {
    var n = u16(off), i, e;
    for (i = 0; i < n; i++) {
      e = off + 2 + i * 12;
      if (e + 12 > v.byteLength - tiff) { break; }
      var tag = u16(e), cnt = u32(e + 4);
      if (tag === 0x8825 && gpsPtr < 0) { gpsPtr = u32(e + 8); }
      else if (tag === 0x8769 && exifPtr < 0) { exifPtr = u32(e + 8); }
      else if (tag === 0x02BC && xmpOff < 0) { xmpOff = u32(e + 8); xmpCnt = cnt; }
      else if (tag === 0x9003 && !timeStr) { timeStr = asciiAt(e); }
      else if (tag === 0x0132 && !timeStr) { timeStr = asciiAt(e); }
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
    return { lat: lat, lon: lon, time: parseExifTimeStr(timeStr) };
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { exifGps: exifGps, exifGpsXmp: exifGpsXmp, xmpGps: xmpGps, parseExifTimeStr: parseExifTimeStr };
}
