# Notfallblatt Motorsägearbeiten

Digitales Formular für **Arbeitsauftrag und Notfallorganisation im Forst** (nach Suva-Formular 88216.d) mit dazugehöriger **Notfallkarte** (nach Suva 88217). Die Website ist eine einzelne statische Seite – kein Server, keine Registrierung, keine Daten verlassen das Gerät.

## Starten

Einfach `index.html` im Browser öffnen (Doppelklick genügt). Für Handy: Dateien auf einen beliebigen statischen Webspace legen oder lokal über das Netzwerk öffnen.

## Funktionen

- **Alle Felder des Suva-Originalformulars**: Arbeitsauftrag (Was/wo/wozu, Wer, Wie/womit, Besonderes, Hiebsmenge, Gefahren/Massnahmen, Wann, Ausweicharbeiten), Notfallmeldung, Notfall-Nummern, Arzt/Spital, Schlagskizze.
- **Adresse → Koordinaten**: Ortsbezeichnung eingeben (Flurname, Adresse), Koordinaten (LV95) werden automatisch berechnet (Geocoding via Photon/OpenStreetMap, auf CH/LI begrenzt).
- **Koordinaten → Adresse**: LV95-Koordinaten eingeben, der Ort wird automatisch gesucht (Reverse-Geocoding).
- **GPS-Dezimal (wie Google)**: Das Feld «GPS (WGS84, Dezimal)» zeigt automatisch Breite/Länge im Dezimalgrad-Format an (z. B. `46.5225, 6.6325`) – direkt aus Google Maps kopierbar. Umgekehrt kann man dort Google-Koordinaten einfügen; sie werden automatisch in LV95 umgerechnet.
- **GPS**: «Meine Position» übernimmt die aktuelle Standort-Position als Koordinaten.
- **Karte**: Punkte (Mitte Holzschlag / T-Punkt) durch Klicken oder Ziehen der Marker setzen; Direktlink zu map.geo.admin.ch.
- **Wetter-Check**: 3-Tage-Prognose für den Einsatzort (Open-Meteo) – unterstützt die von der Suva geforderte tägliche Überprüfung (Witterung, Sicht, Zufahrt).
- **Arzt/Spital in der Nähe**: automatische Suche über OpenStreetMap (Overpass), per Klick in die Felder übernehmen.
- **Gefahren-Chips**: häufige Gefahren bei Motorsägearbeiten per Klick in den Gefahren-Text übernehmen.
- **Schlagskizze**: zeichnen mit Finger/Maus, Nordpfeil, Undo.
- **Pro Einsatzort ein Blatt**: Einsätze anlegen, duplizieren (als Vorlage für den nächsten Ort), umbenennen, löschen, als JSON exportieren/importieren. Alles wird automatisch lokal gespeichert (localStorage).
- **Drucken / PDF**: druckfertiges A4-Blatt im Layout des Originalformulars plus Seite mit **2× Notfallkarte** (85×54 mm) zum Ausschneiden – alle Werte werden automatisch übernommen.
- **Mehrsprachig**: Deutsch, Français, Italiano, Español, Português – über den Sprachwähler oben rechts. Die Auswahl wird gespeichert; auch Gefahren-Chips, Druckblatt und Notfallkarte erscheinen in der gewählten Sprache. Die Übersetzungen liegen in `js/texte-*.js` (eine Datei pro Sprache) und können leicht angepasst werden.

## Technik

- Reines HTML/CSS/JavaScript, keine Build-Werkzeuge, keine Abhängigkeiten ausser Leaflet (CDN; ohne Internet bleibt das Formular voll nutzbar, nur Karte/Suche/Wetter sind offline nicht verfügbar).
- Koordinaten-Umrechnung WGS84 ↔ LV95/LV03 mit der Näherungslösung von swisstopo (Genauigkeit ca. 1 m), getestet gegen Referenzpunkte (Bern, Zimmerwald, Pfänder, Monte Generoso, Zürich).
- Externe Dienste: Photon (Geocoding), Open-Meteo (Wetter), Overpass (Spital/Arzt-Suche), OpenStreetMap-Kacheln. Alle ohne API-Schlüssel.

## Rechtliches

Das Blatt orientiert sich am Suva-Formular 88216.d («Arbeitsauftrag und Notfallorganisation im Forst») und ersetzt dieses nicht. Massgebend sind die Vorgaben der Suva (www.suva.ch/88216.d).
