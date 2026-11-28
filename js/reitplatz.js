// reitplatz.js – Reitplatz & Blende (reitplatz.html). Foto img/reiterin-dressurplatz-4k.jpg + Blenden-Regler.
// Tiefenmodell: 3 Ebenen (Vordergrund scharf / Mitte Bande+Versammlung / Ferne Bäume+Himmel),
// jede mit eigenem Unschärfekreis aus der Optik-Physik (bokeh.js-Globals). Alles lokal.
var R_MAX_AP = 16;          // Blenden-Regler geht bis f/16
var R_PHOTO_W = 3840;       // Breite des Fotos img/reiterin-dressurplatz-4k.jpg in px
var R_PHOTO = 'img/reiterin-dressurplatz-4k.jpg';
// Tiefen-Ebenen: d = Faktor auf den Motiv-Abstand s; Blur = Unschärfekreis/2 in CSS-px (skaliert auf Darstellungsbreite)
var R_LAYERS = [
  { cls: 'l-far', d: 8,   label: 'Bäume/Himmel' },
  { cls: 'l-mid', d: 2.2, label: 'Bande + Versammlung' },
  { cls: 'l-fg',  d: 1.0, label: 'Reiterin + Pferd' }
];
var R_CHIPS = [
  { id: 'l2014', mm: 20 },
  { id: 'l24',   mm: 24 },
  { id: 'l28',   mm: 28 },
  { id: 'l352',  mm: 35 },
  { id: 'l5014', mm: 50 },
  { id: 'l8514', mm: 85 }
];

// Beugung (Airy-Scheibchen) am Sensor: d = 2,44 * lambda * N; lambda = 550 nm = 0,00055 mm
function airyMm(n) { return 2.44 * 0.00055 * n; }
// effektiver Unschärfekreis am Sensor: geometrischer Defokus + Beugung (Quadratur-Summe)
function effBlurMm(uMm, sMm, f, n) { var b = blurMm(uMm, sMm, f, n); var d = airyMm(n); return Math.sqrt(b * b + d * d); }

if (typeof document !== 'undefined' && document.getElementById('chips')) {
  var $ = function (id) { return document.getElementById(id); };
  var st = { lens: null, sensor: BOKEH_SENSORS[0], n: 1.4, s: 3 };

  function rStops() { return stopsFor(st.lens).filter(function (x) { return x <= R_MAX_AP; }); }
  function aovDeg() { return 2 * Math.atan(st.sensor.w / (2 * st.lens.f)) * 180 / Math.PI; }
  // 20 mm = volle Bildbreite (Referenz); laengere Brennweite croppt proportional: scale = f/20
  function zoomF() { return st.lens.f / 20; }
  // Unschärfekreis-Durchmesser (Fotopixel) für eine Ebene in Abstand d*s; CSS-Blur-Radius = Hälfte
  function layerBlurPhotoPx(L) {
    return Math.min(60, effBlurMm(L.d * st.s * 1000, st.s * 1000, st.lens.f, st.n) * (R_PHOTO_W / st.sensor.w) / 2);
  }

  function photoHtml() {
    return '<div class="photo">'
      + '<img class="ph l-far" src="' + R_PHOTO + '" alt="" aria-hidden="true">'
      + '<img class="ph l-mid" src="' + R_PHOTO + '" alt="" aria-hidden="true">'
      + '<img class="ph l-fg" src="' + R_PHOTO + '" alt="Reiterin mit Samt-Showhelm, Reithose und Reitstiefeln am Pferd – im Hintergrund Dressurplatz mit Bande und zweiter Reiterin in der Versammlung">'
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
    var parts = R_LAYERS.map(function (L) {
      return L.label + ' (' + fmtM(L.d * st.s * 1000) + '): Blur ' + layerBlurPhotoPx(L).toFixed(1) + ' px';
    });
    return st.lens.name + ' · ' + st.sensor.name + ' (CoC ' + c.toFixed(3).replace('.', ',') + ' mm) → Hyperfokus ' + fmtM(Hm * 1000)
      + ' · scharf ' + fmtM(dn * 1000) + ' – ' + fmtM(df * 1000)
      + ' · Bildwinkel ca. ' + aovDeg().toFixed(0) + '° · Ausschnitt: zeigt ' + Math.round(100 / zoomF()) + ' % der Bildbreite'
      + ' · Beugung (Airy, 550 nm) Ø ' + (airyMm(st.n) * 1000).toFixed(1).replace('.', ',') + ' µm'
      + ' · Ebenen: ' + parts.join(' | ');
  }

  function render() {
    $('apOut').textContent = 'f/' + st.n;
    $('distOut').textContent = fmtM(st.s * 1000);
    $('lensInfo').textContent = (st.lens.note ? st.lens.note + ' · ' : '') + st.lens.f + ' mm · Lichtstärke bis f/' + st.lens.n + ' · Bildwinkel ca. ' + aovDeg().toFixed(0) + '°';
    $('scene').innerHTML = photoHtml();
    var ph = $('scene').querySelector('.photo');
    if (ph) {
      ph.style.transform = 'scale(' + zoomF().toFixed(3) + ')';
      var k = (ph.clientWidth || 800) / R_PHOTO_W; // Fotopixel -> CSS-px der aktuellen Darstellung
      R_LAYERS.forEach(function (L) {
        var el = ph.querySelector('.' + L.cls);
        if (el) { el.style.filter = 'blur(' + (layerBlurPhotoPx(L) * k).toFixed(2) + 'px)'; }
      });
    }
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
