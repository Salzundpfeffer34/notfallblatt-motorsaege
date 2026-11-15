# Koordinaten-Konverter (PHP)

Eine einzige PHP-Datei (`index.php`), keine Abhängigkeiten, keine Datenbank.

> **Hinweis:** Diese PHP-Version ist die Basisversion für eigenes Hosting (z. B. Hostpoint).
> Stapel-Umrechnung, Live-Umrechnung, Mehrsprachigkeit und GPX-Download bietet die
> HTML-Version (`index.html`) – sie ist der Massstab.
Koordinaten in irgendeinem Format eingeben – alle anderen Formate werden automatisch berechnet.

## Unterstützte Formate

| Format | Beispiel |
|---|---|
| WGS84 Dezimalgrad (Breite, Länge) | `48.8566, 2.3522` |
| WGS84 Grad/Minuten/Sekunden (auch Dezimalminuten) | `41° 54' 10.1" N, 12° 29' 47" E` |
| NAD83 (Nordamerika, geografisch) | `48.8566, 2.3522` – Werte wie WGS84 (Abweichung < 2 m) |
| Schweiz LV95 / CH1903+ (Ost, Nord) | `2624043, 1096620` |
| UTM (Zone/Band, Ost, Nord) | `30U 699316 5710164` |
| MGRS | `54SUE8843349290` oder `54SUE 88433 49290` |
| Web Mercator EPSG:3857 (Google Maps) | `-8238310, 4970072` |

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

- Trennzeichen: Komma, Semikolon, Leerzeichen oder `/`; Dezimalpunkt oder -komma; Schweizer Tausendertrennung mit Apostroph (`2'624'043`) wird erkannt.
- Eingabebegrenzung: Ausser bei UTM/MGRS nur Zahlen. UTM: höchstens zwei Buchstaben (`30U` oder `E … N …`), MGRS: drei (`54SUE…`), Grad/Min/Sekunden: nur N/S/E/W. Das Feld filtert ungültige Zeichen sofort; PHP prüft zusätzlich serverseitig.
- Standard-Reihenfolge ist **Breite, Länge**. Bei «Länge zuerst» das Häkchen «Erste Zahl ist die Länge» setzen.
- UTM ohne Zone: es wird Zone 32 angenommen (Hinweis wird angezeigt). Besser Zone mit angeben.
- Kleine Web-Mercator-Werte können mit UTM verwechselt werden – in dem Fall Format explizit wählen.
- Genauigkeit: UTM/Mercator/MGRS auf Zentimeter genau; LV95/LV03 über die offiziellen
  Näherungsformeln von swisstopo (Abweichung typischerweise < 0,2 m). Höhen werden nicht umgerechnet.
- Die Umrechnungsformeln wurden gegen Referenzimplementierungen (pyproj/EPSG, mgrs) verifiziert.

## Lizenz Grafik

Die Kompassrose (SVG, als Data-URI in `index.html` und `index.php` eingebettet) wurde
für dieses Projekt eigenständig gezeichnet und steht unter **CC0 1.0**
(Public Domain Dedication): <https://creativecommons.org/publicdomain/zero/1.0/deed.de>

Sie darf ohne Bedingungen kopiert, verändert und auch kommerziell genutzt werden;
eine Namensnennung ist nicht erforderlich. Es wurde kein Fremdmaterial verwendet
(keine Bilder von Wikimedia/Commons o. Ä.) – es bestehen keine Lizenzansprüche Dritter.
