/* ort-db-editor.js – Maske zum Bearbeiten der Offline-Ortsdatenbank (js/ort-db.js).
   Reine Funktionen oben (testbar), DOM-Teil unten im document-Guard.
   Änderungen werden nur lokal gespeichert (localStorage 'ortDbEditorEdits' = {added, removed})
   und per Export als fertige js/ort-db.js / ort-db.sql / CSV heruntergeladen. */

function ortNorm(s) {
  return String(s == null ? '' : s)
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/Ä/g, 'ae').replace(/Ö/g, 'oe').replace(/Ü/g, 'ue')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function ortKeyOf(e) {
  return ortNorm(e.name).slice(0, 28) + '|' + String(e.cc || '').toUpperCase();
}
function parseOrtDb(str) {
  var out = [];
  String(str || '').split('\n').forEach(function (line) {
    var p = line.split('|');
    if (p.length < 4) { return; }
    var la = parseFloat(p[1]), lo = parseFloat(p[2]);
    if (!p[0] || !isFinite(la) || !isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) { return; }
    out.push({ name: p[0], lat: la, lon: lo, cc: String(p[3]).toUpperCase().slice(0, 2) });
  });
  return out;
}
function serializeOrtDb(entries) {
  var seen = {}, lines = [];
  (entries || []).forEach(function (e) {
    var name = String(e.name || '').replace(/[|\r\n\t]+/g, ' ').trim();
    if (!name) { return; }
    var cc = String(e.cc || '').toUpperCase().slice(0, 2);
    var key = ortNorm(name).slice(0, 28) + '|' + cc;
    if (seen[key]) { return; }
    seen[key] = 1;
    lines.push(name + '|' + (Math.round(e.lat * 1000) / 1000) + '|' + (Math.round(e.lon * 1000) / 1000) + '|' + cc);
  });
  lines.sort();
  return lines.join('\n');
}
function ortDbValidate(name, lat, lon, cc) {
  name = String(name || '').trim();
  if (!name) { return 'Name fehlt.'; }
  if (name.length > 120) { return 'Name zu lang (max 120 Zeichen).'; }
  if (/[|\r\n\t]/.test(name)) { return 'Name darf «|» und Zeilenumbrüche nicht enthalten.'; }
  lat = parseFloat(lat); lon = parseFloat(lon);
  if (!isFinite(lat) || Math.abs(lat) > 90) { return 'Lat ungültig (±90, Dezimal mit Punkt).'; }
  if (!isFinite(lon) || Math.abs(lon) > 180) { return 'Lon ungültig (±180, Dezimal mit Punkt).'; }
  cc = String(cc || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) { return 'Ländercode: genau 2 Grossbuchstaben (z. B. CH, ES).'; }
  return null;
}
function addOrtEntry(entries, name, lat, lon, cc) {
  var err = ortDbValidate(name, lat, lon, cc);
  if (err) { return { error: err }; }
  cc = String(cc).toUpperCase();
  var key = ortNorm(String(name).trim()).slice(0, 28) + '|' + cc;
  var list = (entries || []).filter(function (e) { return ortKeyOf(e) !== key; });
  list.push({ name: String(name).trim(), lat: Math.round(parseFloat(lat) * 1000) / 1000, lon: Math.round(parseFloat(lon) * 1000) / 1000, cc: cc });
  return { entries: list };
}
function applyOrtDbEdits(base, edits) {
  var removed = {};
  ((edits && edits.removed) || []).forEach(function (k) { removed[k] = 1; });
  var out = (base || []).filter(function (e) { return !removed[ortKeyOf(e)]; });
  ((edits && edits.added) || []).forEach(function (e) { out.push(e); });
  var seen = {}, res = [];
  out.forEach(function (e) {
    var k = ortKeyOf(e);
    if (!seen[k]) { seen[k] = 1; res.push(e); }
  });
  return res;
}
function findOrtEntries(entries, q, norms) {
  var nq = ortNorm(q);
  var list = entries || [];
  if (!nq) { return list.slice(); }
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var n = norms ? norms[i] : ortNorm(list[i].name);
    if (n.indexOf(nq) >= 0 || String(list[i].cc || '').toLowerCase() === nq.toLowerCase()) { out.push(list[i]); }
  }
  return out;
}
function ortDbFileContent(entries) {
  var n = (entries || []).length;
  var db = serializeOrtDb(entries);
  return '/* Offline-Ortsdatenbank fuer Reverse-Geocoding ohne Netz (loadOrtDb in js/sonne-mond.js).\n' +
    '   Format pro Zeile: Name|lat|lon|CC (ISO2). Wird NUR bei Bedarf geladen (offline / Nominatim nicht erreichbar).\n' +
    '   Quellen: GeoNames (CC BY 4.0), Natural Earth (public domain) + kuratierte/bearbeitete Orte. ' + n + ' Eintraege. */\n' +
    'var ORT_DB = ' + JSON.stringify(db) + ';\n';
}
function ortDbSqlContent(entries) {
  var list = entries || [], n = list.length;
  function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
  var out = [
    '-- ort-db.sql – Schema + Daten fuer die MySQL-Ortsdatenbank (Endpunkt ort-db.php).',
    '-- Import:  mysql -u USER -p DATENBANK < ort-db.sql   (oder phpMyAdmin > Importieren)',
    '-- Gleiche Daten wie js/ort-db.js. Lizenz: GeoNames CC BY 4.0, Natural Earth public domain.',
    'CREATE DATABASE IF NOT EXISTS notfallblatt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;',
    'USE notfallblatt;',
    'DROP TABLE IF EXISTS orte;',
    'CREATE TABLE orte (\n  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,\n  name VARCHAR(120) NOT NULL,\n  lat DECIMAL(8,5) NOT NULL,\n  lon DECIMAL(9,5) NOT NULL,\n  cc CHAR(2) NOT NULL,\n  KEY idx_cc (cc),\n  KEY idx_lat (lat),\n  KEY idx_lon (lon)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    '-- ' + n + ' Datensaetze:'
  ];
  var B = 500;
  for (var i = 0; i < n; i += B) {
    var vals = list.slice(i, i + B).map(function (e) {
      return "('" + esc(e.name) + "'," + e.lat + ',' + e.lon + ",'" + esc(e.cc) + "')";
    });
    out.push('INSERT INTO orte (name, lat, lon, cc) VALUES\n' + vals.join(',') + ';');
  }
  return out.join('\n') + '\n';
}
function ortDbCsvContent(entries) {
  return 'name|lat|lon|cc\n' + serializeOrtDb(entries) + '\n';
}
function parseOrtDbImport(text) {
  /* akzeptiert: js/ort-db.js (var ORT_DB = "..."), ort-db.sql (INSERT ... VALUES (...)), CSV/TSV (Name|lat|lon|CC) */
  var s = String(text || '');
  var m = s.match(/var ORT_DB = ("(?:[^"\\]|\\.)*");/);
  if (m) {
    try { return parseOrtDb(JSON.parse(m[1])); } catch (e) { /* weiter mit Zeilen */ }
  }
  var out = [];
  var tupleRe = /\('((?:[^'\\]|\\.)*)',\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*'([A-Za-z]{2})'\)/g;
  s.split('\n').forEach(function (line) {
    var mm, found = false;
    tupleRe.lastIndex = 0;
    while ((mm = tupleRe.exec(line)) !== null) {
      found = true;
      out.push({ name: mm[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'), lat: parseFloat(mm[2]), lon: parseFloat(mm[3]), cc: mm[4].toUpperCase() });
    }
    if (found) { return; }
    var p = line.split('|');
    if (p.length >= 4 && p[0] && p[0] !== 'name' && p[0].charAt(0) !== '-' && !/^--/.test(p[0])) {
      var la = parseFloat(p[1]), lo = parseFloat(p[2]);
      if (isFinite(la) && isFinite(lo)) { out.push({ name: p[0], lat: la, lon: lo, cc: String(p[3]).toUpperCase().slice(0, 2) }); }
    }
  });
  return out;
}

if (typeof document !== 'undefined') {
  (function () {
    var $ = function (id) { return document.getElementById(id); };
    var LS_KEY = 'ortDbEditorEdits';
    var MAX_ROWS = 200;

    var base = (typeof ORT_DB !== 'undefined') ? parseOrtDb(ORT_DB) : [];
    var edits = { added: [], removed: [] };
    try {
      var saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (saved && Array.isArray(saved.added) && Array.isArray(saved.removed)) { edits = saved; }
    } catch (e) {}

    function current() { return applyOrtDbEdits(base, edits); }
    function addedKeys() {
      var s = {};
      edits.added.forEach(function (e) { s[ortKeyOf(e)] = 1; });
      return s;
    }

    function err(msg) {
      var el = $('addErr');
      if (!msg) { el.classList.add('hidden'); return; }
      el.textContent = msg;
      el.classList.remove('hidden');
    }

    function renderStats() {
      var eff = current();
      $('stats').textContent = 'Basis: ' + base.length + ' Einträge · +' + edits.added.length + ' hinzugefügt · −' + edits.removed.length + ' entfernt = ' + eff.length + ' effektiv';
    }

    var editsVersion = 0;
    var normedCache = { v: -1, entries: [], norms: [] };
    function saveEdits() {
      try { localStorage.setItem(LS_KEY, JSON.stringify(edits)); } catch (e) {}
      editsVersion++;
    }
    function normedCurrent() {
      if (normedCache.v !== editsVersion) {
        var eff = current();
        normedCache = { v: editsVersion, entries: eff, norms: eff.map(function (e) { return ortNorm(e.name); }) };
      }
      return normedCache;
    }

    function renderTable() {
      var q = String($('search').value || '').trim();
      var nc = normedCurrent();
      var list = findOrtEntries(nc.entries, q, nc.norms);
      var ak = addedKeys();
      var tb = $('rows');
      tb.innerHTML = '';
      var shown = Math.min(list.length, MAX_ROWS);
      for (var i = 0; i < shown; i++) {
        (function (e) {
          var tr = document.createElement('tr');
          if (ak[ortKeyOf(e)]) { tr.className = 'added'; }
          var cells = [e.name, String(e.lat), String(e.lon), e.cc];
          cells.forEach(function (c) {
            var td = document.createElement('td');
            td.textContent = c;
            tr.appendChild(td);
          });
          var tdDel = document.createElement('td');
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'del';
          b.title = 'Eintrag entfernen (lokal)';
          b.textContent = '🗑';
          b.addEventListener('click', function () {
            var k = ortKeyOf(e);
            edits.removed = edits.removed.filter(function (x) { return x !== k; });
            edits.added = edits.added.filter(function (x) { return ortKeyOf(x) !== k; });
            if (base.some(function (x) { return ortKeyOf(x) === k; })) { edits.removed.push(k); }
            saveEdits(); renderStats(); renderTable();
          });
          tdDel.appendChild(b);
          tr.appendChild(tdDel);
          tb.appendChild(tr);
        })(list[i]);
      }
      $('more').textContent = list.length > shown
        ? 'Zeige ' + shown + ' von ' + list.length + ' Treffern – Suche eingrenzen für mehr.'
        : (list.length + ' Treffer' + (q ? ' für «' + q + '»' : ''));
    }

    function download(name, text, type) {
      var blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    }

    $('addForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = $('fName').value, lat = $('fLat').value, lon = $('fLon').value, cc = $('fCc').value;
      var v = ortDbValidate(name, lat, lon, cc);
      if (v) { err(v); return; }
      err(null);
      var r = addOrtEntry(current(), name, lat, lon, cc);
      if (r.error) { err(r.error); return; }
      var k = ortKeyOf(r.entries[r.entries.length - 1]);
      edits.removed = edits.removed.filter(function (x) { return x !== k; });
      edits.added = edits.added.filter(function (x) { return ortKeyOf(x) !== k; });
      edits.added.push(r.entries[r.entries.length - 1]);
      saveEdits();
      $('fName').value = ''; $('fLat').value = ''; $('fLon').value = ''; $('fCc').value = '';
      $('fName').focus();
      renderStats(); renderTable();
    });

    $('search').addEventListener('input', renderTable);
    $('expJs').addEventListener('click', function () { download('ort-db.js', ortDbFileContent(current()), 'text/javascript;charset=utf-8'); });
    $('expSql').addEventListener('click', function () { download('ort-db.sql', ortDbSqlContent(current()), 'text/plain;charset=utf-8'); });
    $('expCsv').addEventListener('click', function () { download('ort-db.csv', ortDbCsvContent(current()), 'text/csv;charset=utf-8'); });
    $('resetEdits').addEventListener('click', function () {
      edits = { added: [], removed: [] };
      saveEdits(); renderStats(); renderTable();
    });
    $('importFile').addEventListener('change', function (ev) {
      var f = ev.target && ev.target.files && ev.target.files[0];
      if (!f) { return; }
      var rd = new FileReader();
      rd.onload = function () {
        var imported = parseOrtDbImport(String(rd.result || ''));
        if (!imported.length) { $('impMsg').textContent = 'Import: keine Einträge erkannt (erwartet: js/ort-db.js, ort-db.sql oder Name|lat|lon|CC).'; return; }
        imported.forEach(function (e) {
          var k = ortKeyOf(e);
          edits.removed = edits.removed.filter(function (x) { return x !== k; });
          edits.added = edits.added.filter(function (x) { return ortKeyOf(x) !== k; });
          edits.added.push(e);
        });
        saveEdits(); renderStats(); renderTable();
        $('impMsg').textContent = 'Import: ' + imported.length + ' Einträge übernommen (lokal gespeichert, noch nicht exportiert).';
        ev.target.value = '';
      };
      rd.readAsText(f);
    });

    renderStats();
    renderTable();
  })();
}
