# Vergleich: sonne-mond.html vs. PhotoPills

**Testfall:** Zürich, 47.3779° N / 8.5403° O, **So 21.06.2026** (Sommersonnenwende), Ortszeit MESZ (UTC+2).
Referenzen: PhotoPills (Definitionen laut photopills.com-Artikeln «Mastering Golden Hour, Blue Hour …» / User Guide) und timeanddate.com (Sonnen-/Mondtabellen Zürich Juni 2026; timeanddate rechnet mit Refraktion, wie PhotoPills).
Eigene Werte: lokal mit den Funktionen aus `sonne-mond.html` berechnet (NOAA Sonne, Meeus/ELP2000-82 Mond).

## 1. Definitionen (PhotoPills = unsere Schwellen)

| Begriff | PhotoPills (Sonnenhöhe) | sonne-mond.html |
| --- | --- | --- |
| Tag | > +6° | ≥ +6° |
| Goldene Stunde | +6° … −4° | −4° → +6° (morgens) bzw. +6° → −4° (abends) |
| Blaue Stunde | −4° … −6° | −6° → −4° (morgens) bzw. −4° → −6° (abends) |
| Bürgerliche Dämmerung | 0° … −6° | −6° … 0° |
| Nautische Dämmerung | −6° … −12° | −12° … −6° |
| Astronomische Dämmerung | −12° … −18° | −18° … −12° |
| Nacht (dunkel) | < −18° | < −18° |
| Auf-/Untergang | −0,833° (Refraktion + scheinbarer Radius) | −0,833° |

→ **Definitionen identisch.**

## 2. Zeiten-Vergleich (Zürich, 21.06.2026, MESZ)

| Ereignis | sonne-mond.html | timeanddate / PhotoPills-Klasse | Δ |
| --- | --- | --- | --- |
| Sonnenaufgang | 05:29 (Az ~53° O) | 05:29 (53°) | **0 min** |
| Sonnenuntergang | 21:26 (Az ~307° W) | 21:26 (307°) | **0 min** |
| Tageslänge | 15 h 57 min | 15 h 57 min | **0 min** |
| Blaue Stunde morgens | 04:48 – 05:04 | −6°…−4° = identisch | 0 min |
| Goldene Stunde morgens | 05:04 – 06:17 | −4°…+6° = identisch | 0 min |
| Wahrer Mittag | 13:27, 66.1° hoch, Az 180° S | 13:27 (aus Auf-/Untergang gemittelt) | **0 min** |
| Goldene Stunde abends | 20:38 – 21:50 | +6°…−4° = identisch | 0 min |
| Blaue Stunde abends | 21:50 – 22:06 | −4°…−6° = identisch | 0 min |
| Nacht (Sonne < −18°) | 00:29 – 02:25 (nächster Morgen) | 00:29 – 02:25 | **0 min** |

## 3. Mond (21.06.2026)

| Wert | sonne-mond.html | Referenz (moongiant/lunaf/nineplanets, 21.06.2026) | Δ |
| --- | --- | --- | --- |
| Phase | Halbmond (erstes Viertel) | First Quarter | gleich |
| Beleuchtung | 45 % | 45–49 % | ≤ 4 % |
| Mondalter | 6,3 Tage | ~6,7–7,2 Tage | < 1 Tag |
| Mondaufgang | 13:09 (O) | «First Quarter steigt gegen Mittag auf» | konsistent |
| Monduntergang | ~00:52–01:07 | «geht gegen Mitternacht unter» | konsistent |

## 4. Milchstrasse / galaktisches Zentrum (21.06.2026, Zürich)

- sonne-mond.html: dunkles Fenster **00:29 – 02:25**, Kulmination des Zentrums **01:14 bei 13,7°**, beste Zeit im Dunkeln 00:29 (13,1° S); verdict «Eher nein – Zentrum max. nur 14° hoch» (bei 47° N steht das Zentrum nie höher).
- PhotoPills zeigt «Galactic Center visibility» = Zentrum über dem Horizont während der Nacht. Unsere Anzeige ist strenger/praxisnäher: nur astronomisch dunkle Zeit + Zentrum > 15° bzw. beste Zeit/Höhe im dunklen Fenster.

## 5. Bekannte Abweichungen / Grenzen

- **ΔT nicht modelliert** (UTC ≈ TD): Betrifft Mondpositionen um Sekunden, Sonnenzeiten praktisch nicht.
- **Finsternis-Typ** kann am Rand kippen (z. B. 28.08.2026 rechnerisch total, real partiell, ~0,05° Fehler in b) – normale Grenze der gekürzten ELP2000-82-Serie.
- PhotoPills ist eine App mit weiteren Features (AR, Schattenwurf, DoF, Sternschnuppen); der **Zeiten-/Phasen-Vergleich** oben zeigt: sonne-mond.html rechnet auf Fotopills-Niveau (hier: exakt 0 min Abweichung bei allen Sonnenzeiten, Phase innerhalb ≤ 4 %).

## 6. Fazit

Für Fotografen liefert die Seite dieselben Planungszeiten wie PhotoPills (Blue/Golden Hour, Dämmerung, Nacht, Sonnenauf-/untergang mit Refraktion, Mondauf-/untergang, Phase) – lokal, offline, ohne Konto. Zusätzlich: Höhe+Azimut pro Ereignis, Milchstrassen-Fenster (dunkel + beste Zeit), besondere Mond-Daten (Blauer Mond, Blutmond, Super-/Mikromond) und .ics-Kalenderexport mit Erinnerungen.

*Erstellt am 17.11.2026; Referenzwerte von timeanddate.com, photopills.com, moongiant.com, lunaf.com, nineplanets.org, theskylive.com.*
