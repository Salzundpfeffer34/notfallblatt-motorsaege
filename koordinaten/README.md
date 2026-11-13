# Koordinaten-Konverter (PHP)

Eine einzige PHP-Datei (`index.php`), keine Abhängigkeiten, keine Datenbank.

> **Hinweis:** Diese PHP-Version ist die Basisversion für eigenes Hosting (z. B. Hostpoint).
> Stapel-Umrechnung, Live-Umrechnung, Mehrsprachigkeit und GPX-Download bietet die
> HTML-Version (`index.html`) – sie ist der Massstab.
Koordinaten in irgendeinem Format eingeben – alle anderen Formate werden automatisch berechnet.

## Unterstützte Formate

| Format | Beispiel |
|---|---|
| WGS84 Dezimalgrad (Breite, Länge) | `47.376895, 8.541694` |
| WGS84 Grad/Minuten/Sekunden (auch Dezimalminuten) | `47° 22' 36.8" N, 8° 32' 30.1" E` |
| NAD83 (Nordamerika, geografisch) | `47.376895, 8.541694` – Werte wie WGS84 (Abweichung < 2 m) |
| Schweiz LV95 / CH1903+ (Ost, Nord) | `2683303, 1247925` |
| UTM (Zone/Band, Ost, Nord) | `32T 465403 5247150` |
| MGRS | `32TMT6540247150` oder `32T MT 65402 47150` |
| Web Mercator EPSG:3857 (Google Maps) | `-8237525, 4985977` |

Zusätzlich ausgegeben: GeoJSON-Reihenfolge (Länge, Breite) sowie Direktlinks zu
Google Maps, Swisstopo (geo.admin.ch) und OpenStreetMap + Kartenausschnitt.
LV95 wird nur angezeigt, wenn die Koordinaten im Schweiz-Bereich liegen.

## Installation

`index.php` auf einen beliebigen PHP-Hosting laden (PHP 7.2+). Fertig.

Lokal testen:

```bash
php -S localhost:8000
```

## Hinweise

- Trennzeichen: Komma, Semikolon, Leerzeichen oder `/`; Dezimalpunkt oder -komma; Schweizer Tausendertrennung mit Apostroph (`2'683'303`) wird erkannt.
- Eingabebegrenzung: Ausser bei UTM/MGRS nur Zahlen. UTM: höchstens zwei Buchstaben (`32T` oder `E … N …`), MGRS: drei (`32TMT…`), Grad/Min/Sekunden: nur N/S/E/W. Das Feld filtert ungültige Zeichen sofort; PHP prüft zusätzlich serverseitig.
- Standard-Reihenfolge ist **Breite, Länge**. Bei «Länge zuerst» das Häkchen «Erste Zahl ist die Länge» setzen.
- UTM ohne Zone: es wird Zone 32 angenommen (Hinweis wird angezeigt). Besser Zone mit angeben.
- Kleine Web-Mercator-Werte können mit UTM verwechselt werden – in dem Fall Format explizit wählen.
- Genauigkeit: UTM/Mercator/MGRS auf Zentimeter genau; LV95/LV03 über die offiziellen
  Näherungsformeln von swisstopo (Abweichung typischerweise < 0,2 m). Höhen werden nicht umgerechnet.
- Die Umrechnungsformeln wurden gegen Referenzimplementierungen (pyproj/EPSG, mgrs) verifiziert.
