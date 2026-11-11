(function () {
  'use strict';

  const SPEICHER_KEY = 'notfallblatt.einsaetze.v1';
  const AKTUELL_KEY = 'notfallblatt.aktuell.v1';

  const TEXTFELDER = [
    'mitteOrt', 'mitteE', 'mitteN',
    'tOrt', 'tE', 'tN',
    'wasWoWozu', 'gruppenchef', 'gruppenchefTel', 'mitarbeiter', 'betreuerLernende',
    'wieWomit', 'besonderes', 'hiebsmenge', 'auftraggeber', 'gefahren',
    'beginnDatum', 'beginnZeit', 'endeDatum', 'endeZeit', 'ausweicharbeiten',
    'meldeName', 'meldeStandort', 'meldeTel',
    'arztName', 'arztTel', 'arztOrt', 'spitalName', 'spitalTel', 'spitalOrt',
    'hinweise'
  ];
  const CHECKFELDER = ['meldeGruppenchef', 'meldeAuftraggeber', 'meldeFamilie'];

  const MELDE_LABELS = {
    meldeGruppenchef: 'chkGruppenchef',
    meldeAuftraggeber: 'chkAuftraggeber',
    meldeFamilie: 'chkFamilie'
  };

  function T(key) {
    return window.NotfallI18n ? window.NotfallI18n.t(key) : key;
  }

  function sprache() {
    return window.NotfallI18n ? window.NotfallI18n.sprache() : 'de';
  }

  function locale() {
    return { de: 'de-CH', fr: 'fr-CH', it: 'it-CH', es: 'es-CH', pt: 'pt-CH' }[sprache()] || 'de-CH';
  }

  const state = {
    einsaetze: [],
    aktuellId: null,
    skizze: [],
    skizzeUndo: []
  };

  let kartenZiel = 'mitte';
  let map = null;
  let markerMitte = null;
  let markerT = null;
  let speicherTimer = null;
  let reverseTimer = null;

  const $ = id => document.getElementById(id);

  function heute() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function neueDaten() {
    const daten = {};
    TEXTFELDER.forEach(f => { daten[f] = ''; });
    CHECKFELDER.forEach(f => { daten[f] = false; });
    daten.beginnDatum = heute();
    daten.endeDatum = heute();
    return daten;
  }

  function neuerEinsatz(name) {
    return {
      id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name || T('msgNeuerEinsatz') + ' ' + new Date().toLocaleDateString(locale()),
      daten: neueDaten(),
      skizze: []
    };
  }

  function aktuellerEinsatz() {
    return state.einsaetze.find(e => e.id === state.aktuellId) || null;
  }

  function speichern() {
    clearTimeout(speicherTimer);
    speicherTimer = setTimeout(() => {
      const e = aktuellerEinsatz();
      if (e) e.skizze = state.skizze;
      try {
        localStorage.setItem(SPEICHER_KEY, JSON.stringify(state.einsaetze));
        localStorage.setItem(AKTUELL_KEY, state.aktuellId || '');
      } catch (err) { /* Speicher voll oder gesperrt */ }
    }, 250);
  }

  function laden() {
    try {
      const raw = localStorage.getItem(SPEICHER_KEY);
      if (raw) state.einsaetze = JSON.parse(raw);
    } catch (err) {
      state.einsaetze = [];
    }
    if (!Array.isArray(state.einsaetze)) state.einsaetze = [];
    state.aktuellId = localStorage.getItem(AKTUELL_KEY) || null;
    if (!state.einsaetze.length) {
      const e = neuerEinsatz();
      state.einsaetze.push(e);
      state.aktuellId = e.id;
    }
    if (!aktuellerEinsatz()) state.aktuellId = state.einsaetze[0].id;
  }

  function formularFuellen() {
    const e = aktuellerEinsatz();
    if (!e) return;
    TEXTFELDER.forEach(f => { $(f).value = e.daten[f] || ''; });
    CHECKFELDER.forEach(f => { $(f).checked = !!e.daten[f]; });
    state.skizze = Array.isArray(e.skizze) ? e.skizze : [];
    state.skizzeUndo = [];
    zeichneSkizze();
    chipsAktualisieren();
    abgeleiteteFelderAktualisieren();
    markerAktualisieren();
    einsatzSelectFuellen();
  }

  function einsatzSelectFuellen() {
    const sel = $('einsatzSelect');
    sel.innerHTML = '';
    state.einsaetze.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = e.name;
      sel.appendChild(opt);
    });
    sel.value = state.aktuellId;
  }

  function inputHandler(feld) {
    return function () {
      const e = aktuellerEinsatz();
      if (!e) return;
      e.daten[feld] = this.type === 'checkbox' ? this.checked : this.value;
      if (feld === 'mitteE' || feld === 'mitteN') koordinateManuell('mitte');
      if (feld === 'tE' || feld === 'tN') koordinateManuell('tpunkt');
      if (feld === 'mitteOrt') chipsAktualisieren();
      abgeleiteteFelderAktualisieren();
      speichern();
    };
  }

  function eventsBinden() {
    TEXTFELDER.forEach(f => {
      const el = $(f);
      if (el) el.addEventListener('input', inputHandler(f));
    });
    CHECKFELDER.forEach(f => {
      const el = $(f);
      if (el) el.addEventListener('change', inputHandler(f));
    });

    document.querySelectorAll('[data-geocode]').forEach(btn => {
      btn.addEventListener('click', () => geocode(btn.dataset.geocode));
    });
    document.querySelectorAll('[data-gps]').forEach(btn => {
      btn.addEventListener('click', () => gpsUebernehmen(btn.dataset.gps));
    });
    document.querySelectorAll('[data-karte]').forEach(btn => {
      btn.addEventListener('click', () => {
        kartenZiel = btn.dataset.karte;
        const radio = document.querySelector('input[name="kartenZiel"][value="' + kartenZiel + '"]');
        if (radio) radio.checked = true;
        toast(T('msgKarteSetzen'));
        if (map) map.getContainer().scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    document.querySelectorAll('input[name="kartenZiel"]').forEach(radio => {
      radio.addEventListener('change', () => { kartenZiel = radio.value; });
    });

    $('einsatzSelect').addEventListener('change', function () {
      const e = aktuellerEinsatz();
      if (e) e.skizze = state.skizze;
      speichern();
      state.aktuellId = this.value;
      localStorage.setItem(AKTUELL_KEY, state.aktuellId);
      formularFuellen();
    });

    $('btnNeu').addEventListener('click', () => {
      const e = neuerEinsatz();
      state.einsaetze.push(e);
      state.aktuellId = e.id;
      formularFuellen();
      speichern();
      toast(T('msgNeu'));
    });

    $('btnDuplizieren').addEventListener('click', () => {
      const e = aktuellerEinsatz();
      if (!e) return;
      const kopie = JSON.parse(JSON.stringify(e));
      kopie.id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      kopie.name = e.name + T('msgKopie');
      state.einsaetze.push(kopie);
      state.aktuellId = kopie.id;
      formularFuellen();
      speichern();
      toast(T('msgDupliziert'));
    });

    $('btnUmbenennen').addEventListener('click', () => {
      const e = aktuellerEinsatz();
      if (!e) return;
      const name = prompt(T('promptUmbenennen'), e.name);
      if (name && name.trim()) {
        e.name = name.trim();
        einsatzSelectFuellen();
        speichern();
      }
    });

    $('btnLoeschen').addEventListener('click', () => {
      const e = aktuellerEinsatz();
      if (!e) return;
      if (!confirm(T('confirmLoeschen1') + e.name + T('confirmLoeschen2'))) return;
      state.einsaetze = state.einsaetze.filter(x => x.id !== e.id);
      if (!state.einsaetze.length) state.einsaetze.push(neuerEinsatz());
      state.aktuellId = state.einsaetze[0].id;
      formularFuellen();
      speichern();
      toast(T('msgGeloescht'));
    });

    $('btnExport').addEventListener('click', () => {
      const e = aktuellerEinsatz();
      if (!e) return;
      const blob = new Blob([JSON.stringify(e, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'notfallblatt-' + e.name.replace(/[^\wäöüÄÖÜ-]+/g, '_') + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    $('btnImport').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', function () {
      const file = this.files[0];
      this.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const e = JSON.parse(reader.result);
          if (!e || !e.daten) throw new Error('ungültig');
          e.id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          if (!e.name) e.name = T('msgImportierterEinsatz');
          state.einsaetze.push(e);
          state.aktuellId = e.id;
          formularFuellen();
          speichern();
          toast(T('msgImportOk'));
        } catch (err) {
          toast(T('msgImportFehler'));
        }
      };
      reader.readAsText(file);
    });

    $('btnDrucken').addEventListener('click', () => {
      druckBereichAktualisieren();
      window.print();
    });
    window.addEventListener('beforeprint', druckBereichAktualisieren);

    $('btnWetter').addEventListener('click', wetterAbrufen);
    $('btnNahe').addEventListener('click', naheSuchen);

    chipsErzeugen();

    skizzeEventsBinden();
  }

  function chipsErzeugen() {
    const gefahrenTA = $('gefahren');
    $('gefahrenChips').innerHTML = '';
    window.NotfallI18n.gefahrenListe().forEach(g => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = g;
      chip.addEventListener('click', () => {
        const e = aktuellerEinsatz();
        if (!e) return;
        const zeilen = (e.daten.gefahren || '').split('\n').map(s => s.trim()).filter(Boolean);
        const idx = zeilen.indexOf(g);
        if (idx >= 0) zeilen.splice(idx, 1); else zeilen.push(g);
        e.daten.gefahren = zeilen.join('\n');
        gefahrenTA.value = e.daten.gefahren;
        chipsAktualisieren();
        speichern();
      });
      $('gefahrenChips').appendChild(chip);
    });
  }

  function chipsAktualisieren() {
    const e = aktuellerEinsatz();
    const text = e ? (e.daten.gefahren || '') : '';
    const zeilen = text.split('\n').map(s => s.trim());
    document.querySelectorAll('#gefahrenChips .chip').forEach(chip => {
      chip.classList.toggle('aktiv', zeilen.indexOf(chip.textContent) >= 0);
    });
  }

  function zielFelder(ziel) {
    return ziel === 'tpunkt'
      ? { ort: 'tOrt', e: 'tE', n: 'tN', lv03: 'tLv03', link: 'linkKarteT' }
      : { ort: 'mitteOrt', e: 'mitteE', n: 'mitteN', lv03: 'mitteLv03', link: 'linkKarteMitte' };
  }

  function koordinatenVonFeldern(ziel) {
    const f = zielFelder(ziel);
    return parseLv95Pair($(f.e).value, $(f.n).value);
  }

  function koordinateManuell(ziel) {
    const kv = koordinatenVonFeldern(ziel);
    if (!kv) return;
    abgeleiteteFelderAktualisieren();
    markerAktualisieren();
    clearTimeout(reverseTimer);
    reverseTimer = setTimeout(() => reverseGeocode(ziel, kv), 900);
  }

  function koordinatenSetzen(ziel, lat, lon, ortText) {
    const f = zielFelder(ziel);
    const e = aktuellerEinsatz();
    if (!e) return;
    const kv = wgs84ToLv95(lat, lon);
    e.daten[f.e] = Math.round(kv.e).toLocaleString('de-CH');
    e.daten[f.n] = Math.round(kv.n).toLocaleString('de-CH');
    if (ortText) e.daten[f.ort] = ortText;
    $(f.e).value = e.daten[f.e];
    $(f.n).value = e.daten[f.n];
    if (ortText) $(f.ort).value = ortText;
    abgeleiteteFelderAktualisieren();
    markerAktualisieren();
    speichern();
    if (!ortText) {
      clearTimeout(reverseTimer);
      reverseTimer = setTimeout(() => reverseGeocode(ziel, kv), 400);
    }
  }

  function abgeleiteteFelderAktualisieren() {
    ['mitte', 'tpunkt'].forEach(ziel => {
      const f = zielFelder(ziel);
      const kv = koordinatenVonFeldern(ziel);
      const e = aktuellerEinsatz();
      if (kv) {
        const lv03 = formatLv03(kv.e, kv.n);
        $(f.lv03).value = 'y ' + lv03.y + ' / x ' + lv03.x;
        $(f.link).href = 'https://map.geo.admin.ch/#/map?lang=de&bgLayer=ch.swisstopo.pixelkarte-farbe&zoom=10&E=' +
          Math.round(kv.e) + '&N=' + Math.round(kv.n);
        $(f.link).style.display = '';
      } else {
        $(f.lv03).value = '';
        $(f.link).removeAttribute('href');
        $(f.link).style.display = 'none';
      }
      if (e) {
        e.daten[f.lv03] = $(f.lv03).value;
      }
    });
    $('btnNahe').disabled = !koordinatenVonFeldern('mitte');
  }

  function ortLabelAusPhoton(p) {
    const pr = p.properties || {};
    const teile = [
      pr.name,
      [pr.street, pr.housenumber].filter(Boolean).join(' '),
      [pr.postcode, pr.city || pr.district || pr.county].filter(Boolean).join(' ')
    ].filter(Boolean);
    if (!teile.length && pr.country) teile.push(pr.country);
    return teile.join(', ');
  }

  async function geocode(ziel) {
    const f = zielFelder(ziel);
    const q = $(f.ort).value.trim();
    if (!q) {
      toast(T('msgBitteOrt'));
      return;
    }
    toast(T('msgSuche'));
    let treffer = [];
    try {
      const url = 'https://photon.komoot.io/api/?q=' + encodeURIComponent(q) +
        '&lang=' + sprache() + '&limit=5&bbox=5.9,45.7,10.9,48.0';
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      treffer = (data.features || []).filter(ft => {
        const c = ft.geometry && ft.geometry.coordinates;
        return c && c[0] > 5.5 && c[0] < 11.5 && c[1] > 45.5 && c[1] < 48.2;
      }).map(ft => ({
        lat: ft.geometry.coordinates[1],
        lon: ft.geometry.coordinates[0],
        label: ortLabelAusPhoton(ft)
      }));
    } catch (err) {
      treffer = [];
    }
    if (!treffer.length) {
      try {
        const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ch,li&q=' + encodeURIComponent(q);
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        treffer = (data || []).map(ft => ({
          lat: parseFloat(ft.lat),
          lon: parseFloat(ft.lon),
          label: ft.display_name || ''
        }));
      } catch (err) {
        toast(T('msgSucheOffline'));
        return;
      }
    }
    if (!treffer.length) {
      toast(T('msgKeinTreffer'));
      return;
    }
    if (treffer.length === 1) {
      koordinatenSetzen(ziel, treffer[0].lat, treffer[0].lon, treffer[0].label);
      toast(T('msgKoordUebernommen'));
    } else {
      zeigeVorschlaege(ziel, treffer);
    }
  }

  function zeigeVorschlaege(ziel, treffer) {
    const f = zielFelder(ziel);
    const ulId = ziel === 'tpunkt' ? 'suggestTpunkt' : 'suggestMitte';
    const ul = $(ulId);
    ul.innerHTML = '';
    treffer.forEach(t => {
      const li = document.createElement('li');
      const name = document.createElement('div');
      name.textContent = t.label || T('msgUnbekannterOrt');
      const koord = document.createElement('div');
      koord.className = 'koord';
      const kv = wgs84ToLv95(t.lat, t.lon);
      koord.textContent = 'E ' + Math.round(kv.e).toLocaleString('de-CH') + ' / N ' + Math.round(kv.n).toLocaleString('de-CH');
      li.appendChild(name);
      li.appendChild(koord);
      li.addEventListener('click', () => {
        koordinatenSetzen(ziel, t.lat, t.lon, t.label);
        ul.innerHTML = '';
        toast(T('msgKoordUebernommen'));
      });
      ul.appendChild(li);
    });
    ul.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function reverseGeocode(ziel, kv) {
    const w = lv95ToWgs84(kv.e, kv.n);
    const f = zielFelder(ziel);
    const e = aktuellerEinsatz();
    if (!e) return;
    try {
      const res = await fetch('https://photon.komoot.io/reverse?lat=' + w.lat + '&lon=' + w.lon + '&lang=' + sprache());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const feat = data.features && data.features[0];
      if (!feat) return;
      const label = ortLabelAusPhoton(feat);
      if (!label) return;
      if (!e.daten[f.ort]) {
        e.daten[f.ort] = label;
        $(f.ort).value = label;
        speichern();
      } else if (e.daten[f.ort] !== label) {
        toast(T('msgOrtErkannt') + label);
      }
    } catch (err) { /* offline: Koordinaten reichen */ }
  }

  function gpsUebernehmen(ziel) {
    if (!navigator.geolocation) {
      toast(T('msgGpsNicht'));
      return;
    }
    toast(T('msgGpsErmitteln'));
    navigator.geolocation.getCurrentPosition(pos => {
      koordinatenSetzen(ziel, pos.coords.latitude, pos.coords.longitude, null);
      toast(T('msgGpsOk1') + Math.round(pos.coords.accuracy) + T('msgGpsOk2'));
    }, () => {
      toast(T('msgGpsFehler'));
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }

  function karteInitialisieren() {
    if (!window.L) {
      $('mapStatus').textContent = T('msgKarteOffline');
      return;
    }
    map = L.map('karte').setView([46.8, 8.2], 8);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap-Mitwirkende'
    }).addTo(map);
    const iconMitte = L.divIcon({ className: '', html: '<div style="background:#d52b1e;color:#fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">H</div>', iconSize: [26, 26], iconAnchor: [13, 13] });
    const iconT = L.divIcon({ className: '', html: '<div style="background:#1c5d99;color:#fff;border-radius:4px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">T</div>', iconSize: [26, 26], iconAnchor: [13, 13] });
    markerMitte = L.marker([46.8, 8.2], { icon: iconMitte, draggable: true });
    markerT = L.marker([46.8, 8.2], { icon: iconT, draggable: true });
    markerMitte.on('dragend', () => {
      const ll = markerMitte.getLatLng();
      koordinatenSetzen('mitte', ll.lat, ll.lng, null);
    });
    markerT.on('dragend', () => {
      const ll = markerT.getLatLng();
      koordinatenSetzen('tpunkt', ll.lat, ll.lng, null);
    });
    map.on('click', ev => {
      koordinatenSetzen(kartenZiel, ev.latlng.lat, ev.latlng.lng, null);
      toast(T('msgPunkt1') + (kartenZiel === 'tpunkt' ? T('tTitel') : T('mitteTitel')) + T('msgPunkt2'));
    });
    markerAktualisieren();
    $('mapStatus').textContent = T('msgKarteBereit');
  }

  function markerAktualisieren() {
    if (!map) return;
    const m = koordinatenVonFeldern('mitte');
    const t = koordinatenVonFeldern('tpunkt');
    let bounds = null;
    if (m) {
      const w = lv95ToWgs84(m.e, m.n);
      markerMitte.setLatLng([w.lat, w.lon]).addTo(map);
      bounds = L.latLngBounds([w.lat, w.lon]);
    } else {
      map.removeLayer(markerMitte);
    }
    if (t) {
      const w = lv95ToWgs84(t.e, t.n);
      markerT.setLatLng([w.lat, w.lon]).addTo(map);
      bounds = bounds ? bounds.extend([w.lat, w.lon]) : L.latLngBounds([w.lat, w.lon]);
    } else {
      map.removeLayer(markerT);
    }
    if (bounds && !markerAktualisieren._gesetzt) {
      map.fitBounds(bounds.pad(0.4), { maxZoom: 15 });
      markerAktualisieren._gesetzt = true;
    }
  }

  async function wetterAbrufen() {
    const kv = koordinatenVonFeldern('mitte');
    if (!kv) {
      toast(T('msgBitteKoord'));
      return;
    }
    const w = lv95ToWgs84(kv.e, kv.n);
    const box = $('wetterBox');
    box.hidden = false;
    box.innerHTML = '<p class="hint">' + T('msgWetterLaden') + '</p>';
    try {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + w.lat + '&longitude=' + w.lon +
        '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max' +
        '&current=temperature_2m,precipitation,wind_speed_10m&timezone=Europe%2FZurich&forecast_days=3';
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const d = data.daily;
      const cur = data.current;
      let html = '<table><tr><th></th>' + d.time.map(t => '<th>' + new Date(t).toLocaleDateString(locale(), { weekday: 'short', day: '2-digit', month: '2-digit' }) + '</th>').join('') + '</tr>';
      html += '<tr><th>' + T('wetterTemp') + '</th>' + d.temperature_2m_min.map((v, i) => '<td>' + Math.round(v) + ' / ' + Math.round(d.temperature_2m_max[i]) + ' °C</td>').join('') + '</tr>';
      html += '<tr><th>' + T('wetterNiederschlag') + '</th>' + d.precipitation_sum.map((v, i) => '<td>' + v + ' mm (' + (d.precipitation_probability_max[i] || 0) + ' %)</td>').join('') + '</tr>';
      html += '<tr><th>' + T('wetterWind') + '</th>' + d.wind_speed_10m_max.map(v => '<td>' + Math.round(v) + ' km/h</td>').join('') + '</tr></table>';
      if (cur) {
        html += '<p class="hint">' + T('wetterAktuell') + Math.round(cur.temperature_2m) + ' °C, ' + cur.precipitation + ' mm, ' + Math.round(cur.wind_speed_10m) + ' km/h – ' + T('wetterPruefen') + '</p>';
      }
      box.innerHTML = html;
    } catch (err) {
      box.innerHTML = '<p class="hint">' + T('msgWetterOffline') + '</p>';
    }
  }

  async function naheSuchen() {
    const kv = koordinatenVonFeldern('mitte');
    if (!kv) return;
    const w = lv95ToWgs84(kv.e, kv.n);
    const ul = $('naheListe');
    ul.innerHTML = '<li>' + T('msgNaheLaden') + '</li>';
    try {
      const query = '[out:json][timeout:25];(' +
        'node["amenity"~"^(hospital|clinic|doctors)$"](around:15000,' + w.lat + ',' + w.lon + ');' +
        'way["amenity"~"^(hospital|clinic|doctors)$"](around:15000,' + w.lat + ',' + w.lon + ');' +
        ');out center 40;';
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const elemente = (data.elements || []).map(el => {
        const lat = el.lat || (el.center && el.center.lat);
        const lon = el.lon || (el.center && el.center.lon);
        const tags = el.tags || {};
        const name = tags.name || T('msgUnbenannt');
        const adresse = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
        const ort = [tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' ');
        const tel = tags.phone || tags['contact:phone'] || '';
        const dist = Math.round(Math.hypot((lat - w.lat) * 111.32, (lon - w.lon) * 111.32 * Math.cos(w.lat * Math.PI / 180)) * 10) / 10;
        return { name, adresse, ort, tel, art: tags.amenity, dist, lat, lon };
      }).filter(x => x.lat).sort((a, b) => a.dist - b.dist).slice(0, 10);
      ul.innerHTML = '';
      if (!elemente.length) {
        ul.innerHTML = '<li>' + T('msgNaheLeer') + '</li>';
        return;
      }
      elemente.forEach(x => {
        const li = document.createElement('li');
        const titel = (x.art === 'doctors' ? T('arztpraxis') : T('spitalKlinik')) + ': ' + x.name +
          (x.adresse ? ', ' + x.adresse : '') + (x.ort ? ', ' + x.ort : '') +
          (x.tel ? ', Tel. ' + x.tel : '') + ' – ' + x.dist + ' km';
        li.textContent = titel;
        li.addEventListener('click', () => {
          const e = aktuellerEinsatz();
          if (!e) return;
          if (x.art === 'doctors') {
            e.daten.arztName = x.name; e.daten.arztTel = x.tel; e.daten.arztOrt = [x.adresse, x.ort].filter(Boolean).join(', ');
          } else {
            e.daten.spitalName = x.name; e.daten.spitalTel = x.tel; e.daten.spitalOrt = [x.adresse, x.ort].filter(Boolean).join(', ');
          }
          formularFuellen();
          speichern();
          toast(T('msgUebernommen1') + (x.art === 'doctors' ? T('arzt') : T('spital')) + T('msgUebernommen2'));
        });
        ul.appendChild(li);
      });
    } catch (err) {
      ul.innerHTML = '<li>' + T('msgNaheOffline') + '</li>';
    }
  }

  function skizzeEventsBinden() {
    const canvas = $('skizze');
    const ctx = canvas.getContext('2d');
    let zeichnet = false;
    let aktuellerStrich = null;

    function pos(ev) {
      const rect = canvas.getBoundingClientRect();
      const p = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
      return [
        (p.clientX - rect.left) * (canvas.width / rect.width),
        (p.clientY - rect.top) * (canvas.height / rect.height)
      ];
    }

    function down(ev) {
      ev.preventDefault();
      zeichnet = true;
      aktuellerStrich = { farbe: '#c0392b', breite: 3, punkte: [pos(ev)] };
      state.skizze.push(aktuellerStrich);
      zeichneSkizze();
    }
    function move(ev) {
      if (!zeichnet) return;
      ev.preventDefault();
      aktuellerStrich.punkte.push(pos(ev));
      zeichneSkizze();
    }
    function up() {
      if (!zeichnet) return;
      zeichnet = false;
      aktuellerStrich = null;
      speichern();
    }

    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointerleave', up);

    $('skizzeUndo').addEventListener('click', () => {
      if (state.skizze.length) {
        state.skizzeUndo.push(state.skizze.pop());
        zeichneSkizze();
        speichern();
      }
    });
    $('skizzeClear').addEventListener('click', () => {
      if (!state.skizze.length) return;
      if (!confirm(T('confirmSkizze'))) return;
      state.skizzeUndo = state.skizze.slice();
      state.skizze = [];
      zeichneSkizze();
      speichern();
    });
    $('skizzeNord').addEventListener('click', () => {
      state.skizze.push({ nord: true, x: canvas.width - 70, y: 70 });
      zeichneSkizze();
      speichern();
    });
  }

  function zeichneSkizze() {
    const canvas = $('skizze');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    state.skizze.forEach(strich => {
      if (strich.nord) {
        ctx.strokeStyle = '#1c1c1c';
        ctx.fillStyle = '#1c1c1c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(strich.x, strich.y + 30);
        ctx.lineTo(strich.x, strich.y - 30);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(strich.x, strich.y - 40);
        ctx.lineTo(strich.x - 9, strich.y - 22);
        ctx.lineTo(strich.x + 9, strich.y - 22);
        ctx.closePath();
        ctx.fill();
        ctx.font = 'bold 22px Helvetica, Arial, sans-serif';
        ctx.fillText('N', strich.x - 8, strich.y + 58);
        return;
      }
      ctx.strokeStyle = strich.farbe || '#c0392b';
      ctx.lineWidth = strich.breite || 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      strich.punkte.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      });
      ctx.stroke();
    });
  }

  function textOderStrich(v) {
    return (v && String(v).trim()) ? String(v).trim() : '–';
  }

  function druckBereichAktualisieren() {
    const e = aktuellerEinsatz();
    if (!e) return;
    const d = e.daten;
    const set = (name, wert) => {
      document.querySelectorAll('[data-print="' + name + '"]').forEach(el => {
        el.textContent = wert;
      });
    };
    set('titel', e.name);
    set('datumHeute', new Date().toLocaleDateString(locale()));

    set('wasWoWozu', textOderStrich(d.wasWoWozu));
    const wer = [
      d.gruppenchef ? T('pGruppenchef') + d.gruppenchef + (d.gruppenchefTel ? ' (' + d.gruppenchefTel + ')' : '') : '',
      d.mitarbeiter ? T('pMitarbeiter') + d.mitarbeiter : '',
      d.betreuerLernende ? T('pBetreuer') + d.betreuerLernende : ''
    ].filter(Boolean).join(' · ');
    set('wer', textOderStrich(wer));
    set('wieWomit', textOderStrich(d.wieWomit));
    set('besonderes', textOderStrich(d.besonderes));
    set('menge', [d.hiebsmenge ? T('pHiebsmenge') + d.hiebsmenge : '', d.auftraggeber ? T('pAuftraggeber') + d.auftraggeber : ''].filter(Boolean).join(' · ') || '–');
    set('gefahren', textOderStrich(d.gefahren));
    const wann = [
      d.beginnDatum ? T('pBeginn') + new Date(d.beginnDatum).toLocaleDateString(locale()) + (d.beginnZeit ? ' ' + d.beginnZeit : '') : '',
      d.endeDatum ? T('pEnde') + new Date(d.endeDatum).toLocaleDateString(locale()) + (d.endeZeit ? ' ' + d.endeZeit : '') : '',
      d.ausweicharbeiten ? T('pAusweich') + d.ausweicharbeiten : ''
    ].filter(Boolean).join(' · ');
    set('wann', textOderStrich(wann));

    const melde = [
      d.meldeName ? T('pName') + d.meldeName : '',
      d.meldeStandort ? T('pStandort') + d.meldeStandort : '',
      d.meldeTel ? T('pTel') + d.meldeTel : '',
      CHECKFELDER.filter(f => d[f]).length ? T('pMeldungAn') + CHECKFELDER.filter(f => d[f]).map(f => T(MELDE_LABELS[f])).join(', ') : ''
    ].filter(Boolean).join(' · ');
    set('meldung', textOderStrich(melde));

    const m = parseLv95Pair(d.mitteE, d.mitteN);
    const t = parseLv95Pair(d.tE, d.tN);
    const mKoord = m ? 'E ' + fmtZahl(m.e) + ' / N ' + fmtZahl(m.n) + ' (LV95)' : '–';
    const tKoord = t ? 'E ' + fmtZahl(t.e) + ' / N ' + fmtZahl(t.n) + ' (LV95)' : '–';
    set('luft', (d.mitteOrt ? d.mitteOrt + ' · ' : '') + mKoord);
    set('boden', (d.tOrt ? d.tOrt + ' · ' : '') + tKoord);
    set('arzt', [d.arztName, d.arztTel, d.arztOrt].filter(Boolean).join(', ') || '–');
    set('spital', [d.spitalName, d.spitalTel, d.spitalOrt].filter(Boolean).join(', ') || '–');
    set('hinweise', textOderStrich(d.hinweise));

    const quelCanvas = $('skizze');
    const zielCanvas = $('skizzeDruck');
    const zctx = zielCanvas.getContext('2d');
    zctx.fillStyle = '#fff';
    zctx.fillRect(0, 0, zielCanvas.width, zielCanvas.height);
    zctx.drawImage(quelCanvas, 0, 0);

    document.querySelectorAll('.karte-druck').forEach(el => {
      el.innerHTML = notfallKarteHtml(e);
    });
  }

  function fmtZahl(z) {
    return Math.round(z).toLocaleString('de-CH');
  }

  function notfallKarteHtml(e) {
    const d = e.daten;
    const m = parseLv95Pair(d.mitteE, d.mitteN);
    const t = parseLv95Pair(d.tE, d.tN);
    const esc = s => {
      const div = document.createElement('div');
      div.textContent = s || '';
      return div.innerHTML;
    };
    return '<h3>' + T('karteTitel') + '</h3>' +
      '<table>' +
      '<tr><td>' + T('kWasWo') + '</td><td>' + esc(e.name) + (d.mitteOrt ? ' – ' + esc(d.mitteOrt) : '') + '</td></tr>' +
      '<tr><td>' + T('kKoord') + '</td><td>' + (m ? 'E ' + fmtZahl(m.e) + ' / N ' + fmtZahl(m.n) + ' (LV95)' : '–') + '</td></tr>' +
      '<tr><td>' + T('kTpunkt') + '</td><td>' + (d.tOrt ? esc(d.tOrt) + ' · ' : '') + (t ? 'E ' + fmtZahl(t.e) + ' / N ' + fmtZahl(t.n) : '–') + '</td></tr>' +
      '<tr><td>' + T('kMelder') + '</td><td>' + esc(d.meldeName) + (d.meldeTel ? ' · ' + esc(d.meldeTel) : '') + '</td></tr>' +
      '<tr><td>' + T('chkGruppenchef') + '</td><td>' + esc(d.gruppenchef) + (d.gruppenchefTel ? ' · ' + esc(d.gruppenchefTel) : '') + '</td></tr>' +
      '<tr><td>' + T('kArzt') + '</td><td>' + esc(d.arztName) + (d.arztTel ? ' · ' + esc(d.arztTel) : '') + '</td></tr>' +
      '<tr><td>' + T('kSpital') + '</td><td>' + esc(d.spitalName) + (d.spitalOrt ? ' · ' + esc(d.spitalOrt) : '') + '</td></tr>' +
      '</table>' +
      '<div class="kd-notfall">' + T('kNummern') + '</div>';
  }

  function toast(text) {
    let el = document.querySelector('.toast');
    if (el) el.remove();
    el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function init() {
    laden();
    eventsBinden();
    formularFuellen();
    karteInitialisieren();

    document.addEventListener('spracheGeaendert', () => {
      chipsErzeugen();
      chipsAktualisieren();
      druckBereichAktualisieren();
      if (map) $('mapStatus').textContent = T('msgKarteBereit');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
