// bokeh.js – Schärfentiefe & Bokeh (bokeh.html). Reine Physik oben, DOM-Block unten (wie sonne-mond.js).
// Alles lokal, keine Netzwerkzugriffe.
var BOKEH_STOPS = [1, 1.2, 1.4, 1.8, 2, 2.5, 2.8, 3.5, 4, 5.6, 8, 11, 16, 22];

// Zerstreuungskreis (CoC) am Sensor: Diagonale / 1500 (Faustregel)
function cocMm(sensor) { return Math.hypot(sensor.w, sensor.h) / 1500; }
// Hyperfokale Distanz H in mm
function hyperfocalMm(f, n, c) { return f * f / (n * c) + f; }
// Schärfentiefe: nahe Grenze in mm (s, f in mm, n = Blende, c = CoC mm)
function dofNearMm(s, f, n, c) { var H = hyperfocalMm(f, n, c); return s * (H - f) / (H + s - 2 * f); }
// ferne Grenze in mm; Infinity wenn s >= H
function dofFarMm(s, f, n, c) { var H = hyperfocalMm(f, n, c); if (s >= H) { return Infinity; } return s * (H - f) / (H - s); }
// Unschärfekreis (Durchmesser in mm am Sensor) für ein Objekt in Entfernung u (mm), fokussiert auf s (mm)
function blurMm(u, s, f, n) {
  if (u == null || s == null || u === s) { return 0; }
  return f * f / n * Math.abs(s - u) / (u * Math.max(1, s - f));
}
// Unschärfekreis in px, wenn das Sensorbild svgW px breit gerendert wird
function blurPx(uMm, sMm, f, n, sensor, svgW) { return blurMm(uMm, sMm, f, n) * (svgW / sensor.w); }
// mm -> lesbarer Text (de, Komma), Infinity -> ∞
function fmtM(mm) {
  if (!isFinite(mm)) { return '∞'; }
  var m = mm / 1000, v;
  if (m >= 100) { v = m.toFixed(0); } else if (m >= 10) { v = m.toFixed(1); } else if (m >= 1) { v = m.toFixed(2); } else { return Math.round(m * 100) + ' cm'; }
  return v.replace('.', ',') + ' m';
}
function stopsFor(lens) { return BOKEH_STOPS.filter(function (x) { return x >= lens.n - 1e-9; }); }
function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

if (typeof document !== 'undefined') {
  var $ = function (id) { return document.getElementById(id); };
  var st = { lens: null, sensor: BOKEH_SENSORS[0], n: 1.8, s: 2 };
  var W = 800, H = 320, HOR = 225, GY = 268;

  function objBlurPx(dM) { return Math.min(26, blurPx(dM * 1000, st.s * 1000, st.lens.f, st.n, st.sensor, W)); }

  function personG() { return '<circle cx="0" cy="-158" r="15" fill="#7a4a2b"/><rect x="-13" y="-144" width="26" height="118" rx="9" fill="#33507a"/><rect x="-9" y="-30" width="7" height="30" fill="#26262b"/><rect x="2" y="-30" width="7" height="30" fill="#26262b"/>'; }
  function treeG() { return '<rect x="-4" y="-46" width="8" height="46" fill="#6d4a2f"/><polygon points="0,-118 34,-46 -34,-46" fill="#3d7a44"/><polygon points="0,-92 26,-34 -26,-34" fill="#478a4e"/>'; }
  function bushG() { return '<circle cx="-14" cy="-22" r="18" fill="#478a4e"/><circle cx="8" cy="-30" r="22" fill="#3d7a44"/><circle cx="22" cy="-16" r="14" fill="#55975a"/>'; }
  function houseG() { return '<rect x="-34" y="-52" width="68" height="52" fill="#c9b8a3"/><polygon points="-40,-52 0,-86 40,-52" fill="#a8442e"/><rect x="-10" y="-30" width="20" height="30" fill="#5a4632"/>'; }
  var KINDS = { person: personG, tree: treeG, bush: bushG, house: houseG };

  function sceneSvg() {
    var s = st.s;
    var objs = [
      { d: 0.7 * s, x: 140, kind: 'bush' },
      { d: s,       x: 400, kind: 'person' },
      { d: 1.4 * s, x: 545, kind: 'tree' },
      { d: 2.1 * s, x: 645, kind: 'house' },
      { d: 3.2 * s, x: 722, kind: 'tree' },
      { d: 5 * s,   x: 776, kind: 'tree' }
    ];
    var defs = '<defs><linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#bcd6ee"/><stop offset="100%" stop-color="#e8f1f8"/></linearGradient>'
      + '<radialGradient id="ballG" cx="42%" cy="38%" r="70%"><stop offset="0%" stop-color="#fff6d8"/><stop offset="70%" stop-color="#ffd76e"/><stop offset="100%" stop-color="#f0a92e"/></radialGradient></defs>';
    var body = '';
    body += '<rect x="0" y="0" width="' + W + '" height="' + HOR + '" fill="url(#skyG)"/>';
    body += '<rect x="0" y="' + HOR + '" width="' + W + '" height="' + (H - HOR) + '" fill="#a9bd93"/>';
    body += '<line x1="0" y1="' + HOR + '" x2="' + W + '" y2="' + HOR + '" stroke="#8aa377" stroke-width="2"/>';
    var uL = 2.2 * s;
    var rL = Math.max(1.5, Math.min(24, objBlurPx(uL) / 2));
    for (var i = 0; i < 7; i++) {
      body += '<circle cx="' + (470 + i * 48) + '" cy="' + (58 + (i % 3) * 26) + '" r="' + rL.toFixed(1) + '" fill="url(#ballG)" opacity="0.92"/>';
    }
    var fi = 0;
    objs.forEach(function (o) {
      var sc = s / o.d;
      var b = objBlurPx(o.d);
      var filt = '';
      if (b > 0.4) {
        var id = 'bl' + (fi++);
        defs += '<filter id="' + id + '" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="' + b.toFixed(1) + '"/></filter>';
        filt = ' filter="url(#' + id + ')"';
      }
      var sharp = b <= 0.8;
      body += '<g transform="translate(' + o.x + ',' + GY + ') scale(' + sc.toFixed(3) + ')' + '"' + filt + '>' + KINDS[o.kind]() + '</g>';
      body += '<text x="' + o.x + '" y="' + (GY + 16) + '" text-anchor="middle" font-size="11" fill="' + (sharp ? '#2c7a4b' : '#b0432f') + '" font-weight="600">' + escHtml(fmtM(o.d * 1000)) + (sharp ? ' · scharf' : ' · unscharf') + '</text>';
    });
    body += '<text x="14" y="20" font-size="12" fill="var(--muted)" font-weight="600">Szene – Motiv in ' + escHtml(fmtM(s * 1000)) + ', Lichter bei ' + escHtml(fmtM(uL * 1000)) + ' (Bokeh Ø ' + (rL * 2).toFixed(0) + ' px)</text>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Szene mit Schärfentiefe und Bokeh">' + defs + body + '</svg>';
  }

  function dofBarHtml() {
    var lo = 0.3, hi = 100;
    function x(m) { m = Math.max(lo, Math.min(hi, m)); return Math.log(m / lo) / Math.log(hi / lo) * 100; }
    var c = cocMm(st.sensor);
    var Hm = hyperfocalMm(st.lens.f, st.n, c) / 1000;
    var dn = dofNearMm(st.s * 1000, st.lens.f, st.n, c) / 1000;
    var df = dofFarMm(st.s * 1000, st.lens.f, st.n, c) / 1000;
    var x1 = x(dn), x2 = x(isFinite(df) ? df : hi);
    var h = '<div class="dofbar">';
    h += '<div class="zone" style="left:' + x1.toFixed(1) + '%;width:' + Math.max(1, x2 - x1).toFixed(1) + '%"><span>scharf</span></div>';
    h += '<div class="mark" style="left:' + x(st.s).toFixed(1) + '%"></div><div class="mlab" style="left:' + x(st.s).toFixed(1) + '%">Motiv ' + escHtml(fmtM(st.s * 1000)) + '</div>';
    h += '<div class="mark hmark" style="left:' + x(Hm).toFixed(1) + '%"></div><div class="mlab" style="left:' + x(Hm).toFixed(1) + '%">Hyperfokus ' + escHtml(fmtM(Hm * 1000)) + '</div>';
    h += '</div>';
    return h;
  }

  function outText() {
    var c = cocMm(st.sensor);
    var Hm = hyperfocalMm(st.lens.f, st.n, c) / 1000;
    var dn = dofNearMm(st.s * 1000, st.lens.f, st.n, c) / 1000;
    var df = dofFarMm(st.s * 1000, st.lens.f, st.n, c) / 1000;
    var bg = blurPx(2.2 * st.s * 1000, st.s * 1000, st.lens.f, st.n, st.sensor, W);
    return st.lens.name + ' · ' + st.sensor.name + ' (CoC ' + c.toFixed(3).replace('.', ',') + ' mm) → Hyperfokus ' + fmtM(Hm * 1000)
      + ' · scharf ' + fmtM(dn * 1000) + ' – ' + fmtM(df * 1000)
      + ' · Bokeh Ø ca. ' + Math.max(1, Math.round(bg * 2)) + ' px';
  }

  function render() {
    $('apOut').textContent = 'f/' + st.n;
    $('distOut').textContent = fmtM(st.s * 1000);
    $('lensInfo').textContent = st.lens.note ? st.lens.note : (st.lens.f + ' mm · Lichtstärke bis f/' + st.lens.n);
    $('scene').innerHTML = sceneSvg();
    $('dofbar').innerHTML = dofBarHtml();
    $('dofOut').textContent = outText();
  }

  function buildApSlider() {
    var stops = stopsFor(st.lens);
    var el = $('ap');
    el.min = 0; el.max = stops.length - 1; el.step = 1; el.value = 0;
    st.n = stops[0];
  }

  function buildControls() {
    var byGroup = {}, order = [];
    BOKEH_LINSEN.forEach(function (l) {
      if (!byGroup[l.group]) { byGroup[l.group] = []; order.push(l.group); }
      byGroup[l.group].push(l);
    });
    var h = '';
    order.forEach(function (g) {
      h += '<optgroup label="' + escHtml(g) + '">';
      byGroup[g].forEach(function (l) { h += '<option value="' + l.id + '">' + escHtml(l.name) + '</option>'; });
      h += '</optgroup>';
    });
    $('lens').innerHTML = h;
    var hs = '';
    BOKEH_SENSORS.forEach(function (s, i) { hs += '<option value="' + i + '">' + escHtml(s.name) + '</option>'; });
    $('sensor').innerHTML = hs;
    var def = null;
    BOKEH_LINSEN.forEach(function (l) { if (l.id === 'l5018') { def = l; } });
    st.lens = def || BOKEH_LINSEN[0];
    $('lens').value = st.lens.id;
    $('sensor').value = '0';
    $('lens').addEventListener('change', function () {
      BOKEH_LINSEN.forEach(function (l) { if (l.id === $('lens').value) { st.lens = l; } });
      buildApSlider();
      render();
    });
    $('sensor').addEventListener('change', function () { st.sensor = BOKEH_SENSORS[+$('sensor').value]; render(); });
    $('ap').addEventListener('input', function () {
      var stops = stopsFor(st.lens);
      st.n = stops[+$('ap').value] || st.lens.n;
      render();
    });
    $('dist').addEventListener('input', function () {
      st.s = 0.3 * Math.pow(100 / 0.3, $('dist').value / 1000);
      render();
    });
    $('dist').value = String(Math.round(1000 * Math.log(st.s / 0.3) / Math.log(100 / 0.3)));
    buildApSlider();
    render();
  }

  buildControls();
}
