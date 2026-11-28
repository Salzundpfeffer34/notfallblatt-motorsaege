// reitplatz.js – Reitplatz & Blende (reitplatz.html). Foto img/reiterin-dressurplatz.jpg + Blenden-Regler.
// Nutzt die Physik-Globals aus bokeh.js (BOKEH_STOPS, BOKEH_SENSORS, BOKEH_LINSEN, cocMm, hyperfocalMm,
// dofNearMm, dofFarMm, blurMm, blurPx, fmtM, stopsFor, escHtml). Alles lokal, keine Netzwerkzugriffe.
var R_MAX_AP = 16;          // Blenden-Regler geht bis f/16
var R_PHOTO_W = 1184;       // Breite des Fotos img/reiterin-dressurplatz.jpg in px
var R_BG_FACTOR = 2.6;      // Hintergrund (zweite Reiterin in der Versammlung) ca. 2,6x Motiv-Abstand
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

  function rStops() { return stopsFor(st.lens).filter(function (x) { return x <= R_MAX_AP; }); }
  // CSS-blur-Radius (px) fuer den Hintergrund des Fotos; blurPx liefert Durchmesser -> ca. halber Radius
  function bgBlurCss() {
    var d = blurPx(R_BG_FACTOR * st.s * 1000, st.s * 1000, st.lens.f, st.n, st.sensor, R_PHOTO_W);
    return Math.min(30, d / 2);
  }

  function photoHtml() {
    var b = bgBlurCss();
    return '<div class="photo">'
      + '<img class="ph" src="img/reiterin-dressurplatz.jpg" alt="Reiterin mit Reitkappe, Reithose und Reitstiefeln neben ihrem Pferd – im Hintergrund der Dressurplatz mit einer zweiten Reiterin in der Versammlung">'
      + '<img class="ph phblur" src="img/reiterin-dressurplatz.jpg" alt="" aria-hidden="true" style="filter:blur(' + b.toFixed(1) + 'px)">'
      + '</div>';
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
    var bg = blurPx(R_BG_FACTOR * st.s * 1000, st.s * 1000, st.lens.f, st.n, st.sensor, R_PHOTO_W);
    return st.lens.name + ' · ' + st.sensor.name + ' (CoC ' + c.toFixed(3).replace('.', ',') + ' mm) → Hyperfokus ' + fmtM(Hm * 1000)
      + ' · scharf ' + fmtM(dn * 1000) + ' – ' + fmtM(df * 1000)
      + ' · Hintergrund (Versammlung, ' + fmtM(R_BG_FACTOR * st.s * 1000) + ') Unschärfekreis Ø ca. ' + Math.max(1, Math.round(bg)) + ' px'
      + ' → CSS-Blur ' + bgBlurCss().toFixed(1) + ' px';
  }

  function render() {
    $('apOut').textContent = 'f/' + st.n;
    $('distOut').textContent = fmtM(st.s * 1000);
    $('lensInfo').textContent = st.lens.note ? st.lens.note : (st.lens.f + ' mm · Lichtstärke bis f/' + st.lens.n);
    $('scene').innerHTML = photoHtml();
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
