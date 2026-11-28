/* Foto-Konverter fuer foto-konv.html: Drag & Drop eines Fotos (JPEG/TIFF/RAW),
 * EXIF-GPS + Aufnahmezeit auslesen (js/exif-gps.js) und als Link auf
 * sonne-mond.html?lat&lon&datum aufbereiten, in ein anderes Format konvertieren
 * und die Groesse aendern (proportional oder frei).
 * Komplett lokal im Browser – die Datei verlaesst das Geraet nicht. */
'use strict';
if (typeof document !== 'undefined' && document.getElementById('bkDrop')) {
  (function () {
    var $ = function (id) { return document.getElementById(id); };
    var drop = $('bkDrop'), fileEl = $('bkFile'), errEl = $('bkErr'), infoEl = $('bkInfo');
    var imgEl = $('bkImg'), metaEl = $('bkMeta'), gpsEl = $('bkGps'), gpsBtn = $('bkGpsBtn');
    var fmtEl = $('bkFormat'), qualRow = $('bkQualRow'), qualEl = $('bkQual'), qualVal = $('bkQualVal');
    var modeEl = $('bkMode'), wRow = $('bkWRow'), hRow = $('bkHRow'), wEl = $('bkW'), hEl = $('bkH');
    var hintEl = $('bkSizeHint'), goBtn = $('bkGo'), resetBtn = $('bkReset');
    var outEl = $('bkOut'), imgOut = $('bkImgOut'), outMeta = $('bkOutMeta'), dl = $('bkDl');
    var RAW_EXT = /\.(dng|cr2|cr3|nef|nrw|arw|srf|sr2|orf|rw2|rwl|raf|pef|srw|tiff?|heic|heif)$/i;
    var cur = null;
    var outUrl = null;

    function err(msg) {
      if (!msg) { errEl.classList.add('hidden'); return; }
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
    }
    function bereinigeName(name) {
      var s = String(name || '');
      s = s.replace(/(^|[^0-9a-z])([0-9a-f][0-9a-f-_]*[0-9a-f]|[0-9a-f])/gi, function (m, pre, tok) {
        var hex = tok.replace(/[-_]/g, '');
        return pre + ((hex.length >= 24 && (tok.match(/[-_]/g) || []).length >= 3) ? '' : tok);
      });
      s = s.replace(/[-_]{2,}/g, '-');
      s = s.replace(/^[-_]+|[-_]+$/g, '');
      return s || 'foto';
    }
    function fmtBytes(n) {
      if (!isFinite(n)) { return '\u2013'; }
      if (n < 1024) { return n + ' B'; }
      if (n < 1048576) { return (n / 1024).toFixed(1).replace('.', ',') + ' KB'; }
      return (n / 1048576).toFixed(2).replace('.', ',') + ' MB';
    }
    function fmtNum6(x) { return x.toFixed(6).replace('.', ','); }
    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function fmtUtc(ms) {
      var d = new Date(ms);
      return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()) + ' ' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + ':' + pad2(d.getUTCSeconds()) + ' UTC';
    }
    function dateStrLocal(ms) {
      var d = new Date(ms);
      return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    }
    function accepted(file) {
      if (/^image\//i.test(file.type || '')) { return true; }
      return RAW_EXT.test(file.name || '');
    }

    function findEmbeddedJpegs(buf) {
      var v = new DataView(buf), n = v.byteLength, out = [], p = 0;
      while (p + 4 < n) {
        if (v.getUint8(p) !== 0xFF || v.getUint8(p + 1) !== 0xD8) { p++; continue; }
        var q = p + 2;
        while (q + 4 <= n) {
          if (v.getUint8(q) !== 0xFF) { q++; continue; }
          var m = v.getUint8(q + 1);
          if (m === 0xFF) { q++; continue; }
          if (m === 0xD8 || (m >= 0xD0 && m <= 0xD7) || m === 0x01) { q += 2; continue; }
          if (m === 0xD9) { break; }
          if (m === 0xDA) {
            var lenSos = v.getUint16(q + 2);
            var e = q + 2 + (lenSos >= 2 ? lenSos : 2);
            while (e + 2 <= n && !(v.getUint8(e) === 0xFF && v.getUint8(e + 1) === 0xD9)) { e++; }
            if (e + 2 <= n) { out.push([p, e + 2]); }
            break;
          }
          var len = v.getUint16(q + 2);
          if (len < 2) { break; }
          q += 2 + len;
        }
        p += 2;
      }
      return out;
    }

    function tiffJpegSegments(buf) {
      var v = new DataView(buf);
      if (v.byteLength < 12) { return []; }
      if (v.getUint16(0) !== 0x4949 && v.getUint16(0) !== 0x4D4D) { return []; }
      var le = v.getUint16(0) === 0x4949;
      function u16(o) { return v.getUint16(o, le); }
      function u32(o) { return v.getUint32(o, le); }
      var magic = u16(2);
      if (magic !== 42 && magic !== 0x0055 && magic !== 0x5555 && magic !== 0x4F52 && magic !== 0x5352) { return []; }
      function saneIfd(off) { return off > 0 && off + 2 <= v.byteLength && u16(off) >= 1 && u16(off) <= 500; }
      var ifd0 = u32(4);
      if (!saneIfd(ifd0)) { if (saneIfd(8)) { ifd0 = 8; } else if (saneIfd(16)) { ifd0 = 16; } }
      if (!saneIfd(ifd0)) { return []; }
      var out = [];
      function addSeg(p, len) {
        if (len > 4 && p > 0 && p + 4 <= v.byteLength && v.getUint16(p) === 0xFFD8) {
          out.push([p, Math.min(len, v.byteLength - p)]);
        }
      }
      function scanIfd(off, depth) {
        if (depth > 2 || !saneIfd(off)) { return; }
        var n = u16(off), i, e;
        for (i = 0; i < n; i++) {
          e = off + 2 + i * 12;
          if (e + 12 > v.byteLength) { break; }
          var tag = u16(e), cnt = u32(e + 4), val = u32(e + 8);
          if ((tag === 0x002E || tag === 0x0127) && cnt > 4) {
            addSeg(val, cnt);
          } else if (tag === 0x0201) {
            for (var j = 0; j < n; j++) {
              var e2 = off + 2 + j * 12;
              if (u16(e2) === 0x0202) { addSeg(val, u32(e2 + 8)); break; }
            }
          } else if (tag === 0x0111) {
            for (var j3 = 0; j3 < n; j3++) {
              var e4 = off + 2 + j3 * 12;
              if (u16(e4) === 0x0117) { addSeg(val, u32(e4 + 8)); break; }
            }
          } else if (tag === 0x8769 && depth === 0) {
            scanIfd(val, depth + 1);
          } else if (tag === 0x014A) {
            for (var k = 0; k < cnt && val + k * 4 + 4 <= v.byteLength; k++) { scanIfd(u32(val + k * 4), depth + 1); }
          }
        }
        var nxt = u32(off + 2 + n * 12);
        if (depth < 2 && saneIfd(nxt)) { scanIfd(nxt, depth + 1); }
      }
      scanIfd(ifd0, 0);
      return out;
    }

    function exifDims(buf) {
      var v = new DataView(buf);
      if (v.byteLength < 12) { return null; }
      if (v.getUint16(0) !== 0x4949 && v.getUint16(0) !== 0x4D4D) { return null; }
      var le = v.getUint16(0) === 0x4949;
      function u16(o) { return v.getUint16(o, le); }
      function u32(o) { return v.getUint32(o, le); }
      var magic = u16(2);
      if (magic !== 42 && magic !== 0x0055 && magic !== 0x5555 && magic !== 0x4F52 && magic !== 0x5352) { return null; }
      function saneIfd(off) { return off > 0 && off + 2 <= v.byteLength && u16(off) >= 1 && u16(off) <= 500; }
      var ifd0 = u32(4);
      if (!saneIfd(ifd0)) { if (saneIfd(8)) { ifd0 = 8; } else if (saneIfd(16)) { ifd0 = 16; } }
      if (!saneIfd(ifd0)) { return null; }
      var w = 0, h = 0;
      function scanIfd(off, depth) {
        if (depth > 2 || !saneIfd(off) || (w && h)) { return; }
        var n = u16(off), i, e;
        for (i = 0; i < n; i++) {
          e = off + 2 + i * 12;
          if (e + 12 > v.byteLength) { break; }
          var tag = u16(e), typ = u16(e + 2), cnt = u32(e + 4);
          var val = (typ === 3 && cnt === 1) ? u16(e + 8) : u32(e + 8);
          if (tag === 0x0100 && !w) { w = val; }
          else if (tag === 0x0101 && !h) { h = val; }
          else if (tag === 0x8769 && depth === 0) { scanIfd(u32(e + 8), depth + 1); }
          else if (tag === 0x014A) { for (var k = 0; k < cnt && u32(e + 8) + k * 4 + 4 <= v.byteLength; k++) { scanIfd(u32(u32(e + 8) + k * 4), depth + 1); } }
        }
        var nxt = u32(off + 2 + n * 12);
        if (depth < 2 && saneIfd(nxt)) { scanIfd(nxt, depth + 1); }
      }
      scanIfd(ifd0, 0);
      return (w > 0 && h > 0 && w < 100000 && h < 100000) ? { w: w, h: h } : null;
    }

    function makePlaceholder(file, buf) {
      var dims = exifDims(buf) || { w: 1200, h: 800 };
      var scale = Math.min(1, 1200 / dims.w, 800 / dims.h);
      var w = Math.max(1, Math.round(dims.w * scale)), h = Math.max(1, Math.round(dims.h * scale));
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      var g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#2c3a63');
      g.addColorStop(1, '#161d36');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.font = '600 ' + Math.round(h * 0.1) + 'px system-ui, sans-serif';
      ctx.fillText('\ud83d\udcf7', w / 2, h * 0.4);
      ctx.font = '600 ' + Math.round(h * 0.045) + 'px system-ui, sans-serif';
      ctx.fillText(String(file.name || 'RAW').slice(0, 60), w / 2, h * 0.6);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.font = Math.round(h * 0.03) + 'px system-ui, sans-serif';
      ctx.fillText(dims.w + ' \u00d7 ' + dims.h + ' px \u00b7 RAW ohne eingebettetes JPEG', w / 2, h * 0.72);
      ctx.fillText('selbst erzeugte Platzhalter-Vorschau \u2013 Pixel nicht dekodierbar', w / 2, h * 0.8);
      return new Promise(function (resolve) {
        canvas.toBlob(function (blob) {
          if (!blob) { resolve(null); return; }
          createImageBitmap(blob).then(function (bm) {
            resolve({ bitmap: bm, previewUrl: URL.createObjectURL(blob), srcLabel: 'selbst erzeugte Platzhalter-Vorschau (kein eingebettetes JPEG in der Datei)', placeholder: true });
          })['catch'](function () { resolve(null); });
        }, 'image/png');
      });
    }

    function loadBitmap(file, buf) {
      return createImageBitmap(file).then(function (bm) {
        return { bitmap: bm, previewUrl: URL.createObjectURL(file), srcLabel: '' };
      })['catch'](function () {
        var segs = tiffJpegSegments(buf).concat(findEmbeddedJpegs(buf));
        var seen = {}, cands = [], i;
        for (i = 0; i < segs.length; i++) {
          var key = segs[i][0] + ':' + segs[i][1];
          if (seen[key]) { continue; }
          seen[key] = 1;
          cands.push(segs[i]);
        }
        cands.sort(function (a, b) { return (b[1] - b[0]) - (a[1] - a[0]); });
        cands = cands.slice(0, 60);
        var best = null;
        function tryNext(i) {
          if (i >= cands.length) { return Promise.resolve(best); }
          var seg = buf.slice(cands[i][0], cands[i][1]);
          var blob = new Blob([seg]);
          return createImageBitmap(blob).then(function (bm) {
            if (!best || bm.width * bm.height > best.bitmap.width * best.bitmap.height) {
              if (best) { best.bitmap.close(); }
              best = { bitmap: bm, previewUrl: URL.createObjectURL(blob), srcLabel: 'eingebettetes JPEG-Vorschau-Bild aus der Datei' };
            } else {
              bm.close();
            }
            return tryNext(i + 1);
          })['catch'](function () { return tryNext(i + 1); });
        }
        return tryNext(0).then(function (best) {
          return best || makePlaceholder(file, buf);
        });
      });
    }

    function targetDims() {
      var w = cur.w, h = cur.h, mode = modeEl.value;
      if (mode === 'prop') {
        var nw = parseInt(wEl.value, 10);
        if (isFinite(nw) && nw > 0) { w = nw; h = Math.round(cur.h * nw / cur.w); }
      } else if (mode === 'free') {
        var fw = parseInt(wEl.value, 10), fh = parseInt(hEl.value, 10);
        if (isFinite(fw) && fw > 0) { w = fw; }
        if (isFinite(fh) && fh > 0) { h = fh; }
      }
      return { w: Math.min(30000, Math.max(1, Math.round(w))), h: Math.min(30000, Math.max(1, Math.round(h))) };
    }

    function updateHint() {
      if (!cur) { return; }
      var t = targetDims();
      var gleich = t.w === cur.w && t.h === cur.h;
      hintEl.textContent = 'Neu: ' + t.w + ' \u00d7 ' + t.h + ' px' + (gleich ? ' (Originalgr\u00f6sse)' : ' \u2013 Original: ' + cur.w + ' \u00d7 ' + cur.h + ' px');
    }

    function updateModeRows() {
      var mode = modeEl.value;
      wRow.classList.toggle('hidden', mode === 'original');
      hRow.classList.toggle('hidden', mode !== 'free');
      qualRow.classList.toggle('hidden', fmtEl.value === 'image/png');
      updateHint();
    }

    function showInfo() {
      imgEl.src = cur.previewUrl;
      metaEl.textContent = '';
      var d1 = document.createElement('div');
      d1.textContent = cur.name + ' \u00b7 ' + fmtBytes(cur.size) + ' \u00b7 ' + cur.w + ' \u00d7 ' + cur.h + ' px';
      metaEl.appendChild(d1);
      if (cur.srcLabel) {
        var d0 = document.createElement('div');
        d0.textContent = 'Quelle: ' + cur.srcLabel + (cur.placeholder ? '' : ' (RAW direkt dekodieren kann der Browser meist nicht)');
        metaEl.appendChild(d0);
      }
      goBtn.disabled = !!cur.placeholder;
      if (cur.placeholder) {
        var d2 = document.createElement('div');
        d2.textContent = 'Hinweis: Kein eingebettetes JPEG in der Datei gefunden – die Vorschau wurde lokal als Platzhalter erzeugt. Konvertieren ist nicht möglich (keine Pixel-Daten), GPS/EXIF funktionieren aber.';
        metaEl.appendChild(d2);
      }
      if (cur.gps) {
        var g = cur.gps;
        gpsEl.textContent = '\ud83d\udccd GPS: ' + fmtNum6(Math.abs(g.lat)) + '\u00b0 ' + (g.lat >= 0 ? 'N' : 'S') + ', ' + fmtNum6(Math.abs(g.lon)) + '\u00b0 ' + (g.lon >= 0 ? 'O' : 'W') + (isFinite(g.time) ? ' \u00b7 aufgenommen ' + fmtUtc(g.time) : '');
        gpsEl.classList.remove('hidden');
        var q = 'sonne-mond.html?lat=' + g.lat.toFixed(5) + '&lon=' + g.lon.toFixed(5);
        if (isFinite(g.time)) { q += '&datum=' + dateStrLocal(g.time); }
        gpsBtn.href = q;
        gpsBtn.classList.remove('hidden');
      } else {
        gpsEl.textContent = 'Kein GPS in den EXIF-/XMP-Metadaten gefunden.';
        gpsEl.classList.remove('hidden');
        gpsBtn.classList.add('hidden');
      }
      wEl.value = String(cur.w);
      hEl.value = String(cur.h);
      modeEl.value = 'original';
      fmtEl.value = 'image/jpeg';
      qualEl.value = '90';
      qualVal.textContent = '90 %';
      updateModeRows();
      outEl.classList.add('hidden');
      infoEl.classList.remove('hidden');
    }

    function handleFile(file) {
      if (!file) { return; }
      if (!accepted(file)) {
        err('Bitte eine Bilddatei ziehen oder w\u00e4hlen (JPEG, PNG, WebP, TIFF, RAW wie ARW/CR2/CR3/NEF/RW2/RAF/ORF/DNG \u2026).');
        return;
      }
      err(null);
      var reader = new FileReader();
      reader.onerror = function () { err('Datei konnte nicht gelesen werden.'); };
      reader.onload = function () {
        var buf = reader.result;
        var gps = null;
        try { gps = exifGps(buf.slice(0, 262144)); } catch (e) { gps = null; }
        loadBitmap(file, buf).then(function (res) {
          if (!res) {
            infoEl.classList.add('hidden');
            err('Das Bild konnte nicht dekodiert werden \u2013 und es wurde kein eingebettetes JPEG-Vorschau-Bild in der Datei gefunden.');
            return;
          }
          if (cur) {
            if (cur.bitmap) { cur.bitmap.close(); }
            if (cur.previewUrl) { URL.revokeObjectURL(cur.previewUrl); }
          }
          cur = { file: file, name: file.name || 'foto', size: file.size, w: res.bitmap.width, h: res.bitmap.height, bitmap: res.bitmap, previewUrl: res.previewUrl, srcLabel: res.srcLabel, gps: gps, placeholder: !!res.placeholder };
          showInfo();
        })['catch'](function () {
          infoEl.classList.add('hidden');
          err('Das Bild konnte nicht dekodiert werden.');
        });
      };
      reader.readAsArrayBuffer(file);
    }

    drop.addEventListener('click', function () { fileEl.click(); });
    drop.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileEl.click(); }
    });
    fileEl.addEventListener('change', function () {
      if (fileEl.files && fileEl.files[0]) { handleFile(fileEl.files[0]); }
      fileEl.value = '';
    });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('drag'); });
    drop.addEventListener('drop', function (e) {
      e.preventDefault();
      drop.classList.remove('drag');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) { handleFile(e.dataTransfer.files[0]); }
    });
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) { e.preventDefault(); });

    modeEl.addEventListener('change', updateModeRows);
    fmtEl.addEventListener('change', updateModeRows);
    qualEl.addEventListener('input', function () { qualVal.textContent = qualEl.value + ' %'; });
    wEl.addEventListener('input', updateHint);
    hEl.addEventListener('input', updateHint);

    function resetAll() {
      if (cur) {
        if (cur.bitmap) { cur.bitmap.close(); }
        if (cur.previewUrl) { URL.revokeObjectURL(cur.previewUrl); }
        cur = null;
      }
      if (outUrl) { URL.revokeObjectURL(outUrl); outUrl = null; }
      err(null);
      imgEl.removeAttribute('src');
      imgOut.removeAttribute('src');
      metaEl.textContent = '';
      gpsEl.textContent = '';
      gpsEl.classList.add('hidden');
      gpsBtn.classList.add('hidden');
      gpsBtn.setAttribute('href', 'sonne-mond.html');
      fmtEl.value = 'image/jpeg';
      qualEl.value = '90';
      qualVal.textContent = '90 %';
      modeEl.value = 'original';
      goBtn.disabled = false;
      wEl.value = '';
      hEl.value = '';
      hintEl.textContent = '';
      updateModeRows();
      outEl.classList.add('hidden');
      infoEl.classList.add('hidden');
      drop.focus();
    }
    resetBtn.addEventListener('click', resetAll);

    goBtn.addEventListener('click', function () {
      if (!cur) { return; }
      err(null);
      var t = targetDims();
      var canvas = document.createElement('canvas');
      canvas.width = t.w;
      canvas.height = t.h;
      var ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(cur.bitmap, 0, 0, t.w, t.h);
      var mime = fmtEl.value;
      var lossy = mime === 'image/jpeg' || mime === 'image/webp';
      var q = lossy ? Math.min(1, Math.max(0.1, parseInt(qualEl.value, 10) / 100)) : undefined;
      canvas.toBlob(function (blob) {
        if (!blob) { err('Konvertierung fehlgeschlagen.'); return; }
        var realMime = blob.type || mime;
        var ext = realMime === 'image/png' ? 'png' : (realMime === 'image/webp' ? 'webp' : 'jpg');
        var base = bereinigeName(cur.name.replace(/\.[^.]+$/, ''));
        var fname = base + '-' + t.w + 'x' + t.h + '.' + ext;
        if (outUrl) { URL.revokeObjectURL(outUrl); }
        outUrl = URL.createObjectURL(blob);
        dl.href = outUrl;
        dl.download = fname;
        imgOut.src = outUrl;
        outMeta.textContent = fname + ' \u00b7 ' + t.w + ' \u00d7 ' + t.h + ' px \u00b7 ' + fmtBytes(blob.size) + ' (Original: ' + fmtBytes(cur.size) + ')';
        outEl.classList.remove('hidden');
      }, mime, q);
    });
  })();
}
