// reitplatz.js – Reitplatz & Blende (reitplatz.html). Nutzt die Physik-Globals aus bokeh.js
// (BOKEH_STOPS, BOKEH_SENSORS, BOKEH_LINSEN, cocMm, hyperfocalMm, dofNearMm, dofFarMm, blurPx, fmtM, stopsFor, escHtml).
// Alles lokal, keine Netzwerkzugriffe.
var R_MAX_AP = 16; // Blenden-Regler geht bis f/16
var R_CHIPS = [
  { id: 'l2014', mm: 20 },
  { id: 'l24',   mm: 24 },
  { id: 'l28',   mm: 28 },
  { id: 'l352',  mm: 35 },
  { id: 'l5014', mm: 50 },
  { id: 'l8514', mm: 85 }
];

if (typeof document !== 'undefined' && document.getElementById('chips')) {
  var $ = function (id) { return document.getElementById(id); };
  var st = { lens: null, sensor: BOKEH_SENSORS[0], n: 1.4, s: 3 };
  var W = 800, H = 340, HOR = 222, GY = 285, FY = 258;

  function rStops() { return stopsFor(st.lens).filter(function (x) { return x <= R_MAX_AP; }); }
  function objBlurPx(dM) { return Math.min(26, blurPx(dM * 1000, st.s * 1000, st.lens.f, st.n, st.sensor, W)); }

  // --- Figuren (Ursprung am Boden, y nach oben negativ) ---
  function horseG() {
    return '<rect x="-38" y="-78" width="7" height="78" fill="#2c1f16"/><rect x="-20" y="-78" width="7" height="78" fill="#3a2a20"/>'
      + '<rect x="14" y="-78" width="7" height="78" fill="#2c1f16"/><rect x="32" y="-78" width="7" height="78" fill="#3a2a20"/>'
      + '<ellipse cx="0" cy="-92" rx="52" ry="26" fill="#3a2a20"/>'
      + '<polygon points="-38,-108 -62,-152 -46,-156 -24,-112" fill="#3a2a20"/>'
      + '<polygon points="-62,-152 -80,-144 -76,-132 -56,-140" fill="#241a12"/>'
      + '<polygon points="-60,-154 -64,-164 -56,-158" fill="#241a12"/>'
      + '<path d="M48,-108 Q66,-80 60,-38" stroke="#241a12" stroke-width="7" fill="none" stroke-linecap="round"/>'
      + '<rect x="-16" y="-120" width="34" height="9" rx="4" fill="#6b1f1f"/>';
  }
  function riderStehendG() {
    return '<rect x="-12" y="-58" width="10" height="58" fill="#17171c"/><rect x="4" y="-58" width="10" height="58" fill="#17171c"/>'
      + '<rect x="-13" y="-112" width="12" height="56" fill="#f2efe8"/><rect x="3" y="-112" width="12" height="56" fill="#f2efe8"/>'
      + '<rect x="-18" y="-170" width="36" height="62" rx="10" fill="#22304a"/>'
      + '<rect x="10" y="-162" width="26" height="9" rx="4.5" fill="#22304a" transform="rotate(18 10 -162)"/>'
      + '<circle cx="0" cy="-182" r="11" fill="#d9a077"/>'
      + '<path d="M-12,-184 a12,12 0 0 1 24,0 z" fill="#17171c"/><rect x="-15" y="-186" width="30" height="3.5" rx="1.75" fill="#17171c"/>'
      + '<circle cx="-11" cy="-193" r="4.5" fill="#4a3423"/>';
  }
  function reiterinPferdG() {
    return '<g transform="translate(-72,0)">' + riderStehendG() + '</g><g transform="translate(58,0)">' + horseG() + '</g>';
  }
  function versammlungG() { // zweite Reiterin, versammelt (hoher Hals, aufgerichteter Sitz)
    return '<rect x="-30" y="-70" width="6" height="70" fill="#2c1f16" transform="rotate(8 -27 -70)"/>'
      + '<rect x="-12" y="-70" width="6" height="70" fill="#3a2a20" transform="rotate(-6 -9 -70)"/>'
      + '<rect x="10" y="-70" width="6" height="70" fill="#2c1f16" transform="rotate(-10 13 -70)"/>'
      + '<rect x="26" y="-70" width="6" height="70" fill="#3a2a20" transform="rotate(12 29 -70)"/>'
      + '<ellipse cx="0" cy="-84" rx="46" ry="23" fill="#4a3423"/>'
      + '<polygon points="-34,-98 -52,-146 -38,-150 -20,-102" fill="#4a3423"/>'
      + '<polygon points="-52,-146 -68,-140 -64,-128 -48,-136" fill="#33241a"/>'
      + '<path d="M44,-98 Q60,-72 54,-34" stroke="#33241a" stroke-width="6" fill="none" stroke-linecap="round"/>'
      + '<rect x="-14" y="-108" width="28" height="8" rx="4" fill="#1f3a5f"/>'
      + '<rect x="-9" y="-150" width="20" height="46" rx="8" fill="#5a2430"/>'
      + '<rect x="4" y="-110" width="8" height="34" fill="#f2efe8" transform="rotate(-8 8 -110)"/>'
      + '<rect x="6" y="-78" width="9" height="10" fill="#17171c" transform="rotate(-8 10 -78)"/>'
      + '<circle cx="1" cy="-161" r="10" fill="#d9a077"/>'
      + '<path d="M-9,-163 a10,10 0 0 1 20,0 z" fill="#17171c"/><rect x="-12" y="-165" width="26" height="3" rx="1.5" fill="#17171c"/>';
  }
  function treeG() {
    return '<rect x="-4" y="-46" width="8" height="46" fill="#6d4a2f"/><polygon points="0,-118 34,-46 -34,-46" fill="#3d7a44"/><polygon points="0,-92 26,-34 -26,-34" fill="#478a4e"/>';
  }
  function bushG() {
    return '<circle cx="-14" cy="-22" r="18" fill="#478a4e"/><circle cx="8" cy="-30" r="22" fill="#3d7a44"/><circle cx="22" cy="-16" r="14" fill="#55975a"/>';
  }
  function bandeG() { // Dressurbande mit Bahnbuchstaben, volle Breite, unskaliert
    var h = '', letters = ['A', 'K', 'V', 'E', 'B', 'M', 'C', 'H'];
    for (var x = 30; x <= W - 20; x += 85) { h += '<rect x="' + (x - 3) + '" y="' + (FY - 64) + '" width="6" height="64" fill="#e8e6df"/>'; }
    h += '<rect x="0" y="' + (FY - 58) + '" width="' + W + '" height="7" fill="#f4f2ea"/>';
    h += '<rect x="0" y="' + (FY - 38) + '" width="' + W + '" height="7" fill="#f4f2ea"/>';
    letters.forEach(function (L, i) {
      var x = 55 + i * 92;
      h += '<rect x="' + (x - 13) + '" y="' + (FY - 92) + '" width="26" height="32" rx="3" fill="#fff" stroke="#c9c7bf"/>'
        + '<text x="' + x + '" y="' + (FY - 70) + '" text-anchor="middle" font-size="19" font-weight="700" fill="#23231f">' + L + '</text>';
    });
    return h;
  }

  function blurGroup(dM, x, y, sc, inner, label) {
    var b = objBlurPx(dM), defs = '', filt = '';
    if (b > 0.4) {
      var id = 'rb' + Math.round(dM * 10) + '_' + Math.round(x);
      defs = '<filter id="' + id + '" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="' + b.toFixed(1) + '"/></filter>';
      filt = ' filter="url(#' + id + ')"';
    }
    var sharp = b <= 0.8;
    var g = '<g transform="translate(' + x + ',' + y + ') scale(' + sc.toFixed(3) + ')"' + filt + '>' + inner + '</g>';
    if (label) {
      g += '<text x="' + x + '" y="' + (y + 16) + '" text-anchor="middle" font-size="11" fill="' + (sharp ? '#2c7a4b' : '#b0432f') + '" font-weight="600">' + escHtml(fmtM(dM * 1000)) + (sharp ? ' · scharf' : ' · unscharf') + '</text>';
    }
    return { defs: defs, body: g };
  }

  function sceneSvg() {
    var s = st.s, defs = '<defs>', body = '';
    defs += '<linearGradient id="rsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#bcd6ee"/><stop offset="100%" stop-color="#e8f1f8"/></linearGradient>'
      + '<radialGradient id="rball" cx="42%" cy="38%" r="70%"><stop offset="0%" stop-color="#fff6d8"/><stop offset="70%" stop-color="#ffd76e"/><stop offset="100%" stop-color="#f0a92e"/></radialGradient>';
    body += '<rect x="0" y="0" width="' + W + '" height="' + HOR + '" fill="url(#rsky)"/>';
    body += '<rect x="0" y="' + HOR + '" width="' + W + '" height="' + (H - HOR) + '" fill="#d9c49a"/>';
    body += '<line x1="0" y1="' + HOR + '" x2="' + W + '" y2="' + HOR + '" stroke="#b39d6e" stroke-width="2"/>';
    body += '<line x1="0" y1="' + FY + '" x2="' + W + '" y2="' + FY + '" stroke="#c4ad7c" stroke-width="1.5"/>';
    // Bokeh-Lichter (hinter der Bande)
    var uL = 2.6 * s, rL = Math.max(1.5, Math.min(24, objBlurPx(uL) / 2));
    var bL = objBlurPx(uL), lfilt = '';
    if (bL > 0.4) {
      defs += '<filter id="rbl" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="' + bL.toFixed(1) + '"/></filter>';
      lfilt = ' filter="url(#rbl)"';
    }
    var lbody = '<g' + lfilt + '>';
    for (var i = 0; i < 7; i++) {
      lbody += '<circle cx="' + (500 + i * 44) + '" cy="' + (52 + (i % 3) * 26) + '" r="' + rL.toFixed(1) + '" fill="url(#rball)" opacity="0.92"/>';
    }
    lbody += '</g>';
    body += lbody;
    // Hintergrund-Objekte, fern nach nah
    var far = blurGroup(6.5 * s, 300, 266, s / (6.5 * s), treeG(), 'Bäume');
    defs += far.defs; body += far.body;
    var t2 = blurGroup(5.5 * s, 735, 268, s / (5.5 * s), treeG(), null);
    defs += t2.defs; body += t2.body;
    var t1 = blurGroup(4 * s, 95, 268, s / (4 * s), treeG(), null);
    defs += t1.defs; body += t1.body;
    var bd = blurGroup(1.7 * s, W / 2, FY, 1, bandeG(), 'Bande');
    defs += bd.defs; body += bd.body;
    var vr = blurGroup(2.6 * s, 630, 272, s / (2.6 * s), versammlungG(), 'Versammlung');
    defs += vr.defs; body += vr.body;
    var bu = blurGroup(0.8 * s, 140, GY, s / (0.8 * s), bushG(), null);
    defs += bu.defs; body += bu.body;
    // Vordergrund: Reiterin mit Pferd, scharf (d = s)
    var fg = blurGroup(s, 400, GY, 1, reiterinPferdG(), 'Reiterin');
    defs += fg.defs; body += fg.body;
    body += '<text x="14" y="20" font-size="12" fill="#6b6b64" font-weight="600">Dressurplatz – Motiv Reiterin in ' + escHtml(fmtM(s * 1000)) + ', zweite Reiterin (Versammlung) bei ' + escHtml(fmtM(uL * 1000)) + ' (Bokeh Ø ' + (rL * 2).toFixed(0) + ' px)</text>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Dressurplatz mit Schärfentiefe und Bokeh">' + defs + '</defs>' + body + '</svg>';
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
    var bg = blurPx(2.6 * st.s * 1000, st.s * 1000, st.lens.f, st.n, st.sensor, W);
    return st.lens.name + ' · ' + st.sensor.name + ' (CoC ' + c.toFixed(3).replace('.', ',') + ' mm) → Hyperfokus ' + fmtM(Hm * 1000)
      + ' · scharf ' + fmtM(dn * 1000) + ' – ' + fmtM(df * 1000)
      + ' · Hintergrund-Unschärfe Ø ca. ' + Math.max(1, Math.round(bg * 2)) + ' px';
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
    var stops = rStops();
    var el = $('ap');
    el.min = 0; el.max = stops.length - 1; el.step = 1;
    var idx = 0;
    for (var i = 0; i < stops.length; i++) { if (Math.abs(stops[i] - st.n) < 1e-9) { idx = i; } }
    el.value = String(idx);
    st.n = stops[idx];
    var h = '';
    stops.forEach(function (v) { h += '<span>f/' + v + '</span>'; });
    $('apTicks').innerHTML = h;
  }

  function lensById(id) {
    var r = null;
    BOKEH_LINSEN.forEach(function (l) { if (l.id === id) { r = l; } });
    return r;
  }

  function buildControls() {
    var h = '';
    R_CHIPS.forEach(function (c) {
      h += '<button type="button" class="chip" data-id="' + c.id + '" aria-pressed="false">' + c.mm + '&nbsp;mm</button>';
    });
    $('chips').innerHTML = h;
    Array.prototype.forEach.call($('chips').children, function (btn) {
      btn.addEventListener('click', function () {
        st.lens = lensById(btn.getAttribute('data-id')) || st.lens;
        st.n = st.lens.n;
        Array.prototype.forEach.call($('chips').children, function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        buildApSlider();
        render();
      });
    });
    var hs = '';
    BOKEH_SENSORS.forEach(function (sn, i) { hs += '<option value="' + i + '">' + escHtml(sn.name) + '</option>'; });
    $('sensor').innerHTML = hs;
    st.lens = lensById('l8514') || BOKEH_LINSEN[0];
    st.n = st.lens.n;
    Array.prototype.forEach.call($('chips').children, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-id') === st.lens.id ? 'true' : 'false'); });
    $('sensor').value = '0';
    $('sensor').addEventListener('change', function () { st.sensor = BOKEH_SENSORS[+$('sensor').value]; render(); });
    $('ap').addEventListener('input', function () {
      var stops = rStops();
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
