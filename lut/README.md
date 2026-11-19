# LUTs für DaVinci Resolve

## 1) Apple ProRes RAW / Apple Log → korrekte Farben (Rec.709)

`apple-log-to-rec709-33.cube` ist eine **technische Konvertierungs-LUT** (kein kreativer Look): Sie rechnet
**Apple Log Profile in Rec.2020-Primaries** (so wie Apple ProRes RAW über die „RAW → Log“-Konvertierung bzw.
ProRes Log auf dem iPhone landet) linear um, konvertiert das Gamut **Rec.2020 → Rec.709** und encodiert mit
**BT.1886 (Gamma 2.4)** – also genau das Rec.709, das Resolve als Ausgabe erwartet.

- Kurve: Apple Log Profile White Paper (Apple, 2023) – identisch zu `log_decoding_AppleLogProfile` in colour-science
  (18 % Grau = Code 0,4883 → BT.1886 ≈ 0,489; Weisspunkt linear ≈ 12,0).
- 33×33×33, `.cube`. Generator: `generate_apple_log_lut.py` (reines Python 3; Kurve, Gamut-Matrix und Gamma als
  Konstanten oben anpassbar, z. B. `SIZE = 65`).

**Anwendung in Resolve:** LUT auf den **ersten Node** jedes Clips ziehen (vor jeglichem Grading), wenn das
Projekt **nicht** color-managed arbeitet (kein RCM/ACES). Mit RCM/ACES oder Apple-Log-CST **nicht zusätzlich**
anwenden – sonst wird doppelt konvertiert.

**Wichtig zu ProRes RAW direkt:** Ab **Resolve 20.2** decodiert Resolve Apple ProRes RAW nativ. Dann brauchst du
für korrekte Farben **keine LUT**, sondern Color Management (Projekt-Einstellungen → Color Management →
„DaVinci YRGB Color Managed" oder ACES) plus ggf. den **Camera-RAW-Tab** (Exposure/Kelvin) – echte RAW-Daten
haben kein fixes Gamut, die korrekte Wandlung hängt von den Clip-Metadaten ab. Die LUT oben ist für Material,
das bereits als Apple Log (Rec.2020) vorliegt (z. B. „RAW → Log“-Konvertierung in Final Cut Camera / Atomos,
ProRes Log), oder für Workflows ohne Color Management.

## 2) DJI D-Log / D-Log2 (z. B. ProRes RAW von Inspire 3 / Ronin 4D) → Rec.709

Zwei technische Konvertierungs-LUTs, identischer Ziel-Farbraum wie bei (1) – **Rec.709 / BT.1886 (Gamma 2.4)**,
damit DJI- und Apple-Material nach der LUT farblich matchen (18 % Grau landet bei beiden exakt auf ≈ 0,489):

- `dji-dlog-dgamut-to-rec709-33.cube` – klassisches **D-Log + D-Gamut** (DJI White Paper 2017; Kurve wie im ACES-Referenz-CTL
  `CSC.DJI.DLog_DGamut_to_ACES`: 18 % Grau = 10-bit Code 408, Weiss = 4200 % ≈ linear 42). Für DJI-Kameras, die ProRes RAW
  aufnehmen (Inspire 3 / Zenmuse X9, Ronin 4D) und allgemein D-Log-Material.
- `dji-dlog2-dgamut2-to-rec709-33.cube` – **D-Log2 + D-Gamut2** (Konstanten aus DJIs offiziellem DCTL: 18 % Grau = Code 312,
  Weiss = 47500 % ≈ linear 475; D-Gamut2-Primaries aus dem offiziellen ACES-DCTL). Z. B. Osmo Pocket 4P.

Generator: `generate_dji_lut.py` (erzeugt beide Dateien; Profil-Konstanten oben anpassbar).
Anwendung wie bei (1): auf den **ersten Node**, wenn nicht color-managed gearbeitet wird. In RCM/ACES-Projekten
stattdessen die CST „DJI D-Log“ / „DJI D-Gamut“ (bzw. ACES-IDT) nutzen – nicht beides kombinieren.
Hinweis: **D-Log M** ist eine eigene, flachere Kurve in Rec.709-naher Umgebung – dafür diese LUTs nicht verwenden.

## 3) Kreativer Look: Cinematic Outdoor

`cinematic-outdoor-33.cube` ist eine 3D-LUT (33×33×33, Adobe/Resolve-`.cube`-Format) mit filmischem Outdoor-Look:
angehobene, leicht kühle Schwarzwerte, weiche Highlight-Schulter, dezente S-Kurve (Kontrast), 90 % Sättigung
und warm/kühl Split-Toning (warme Lichter, kühle Schatten). Gedacht für Rec.709-/Display-referred-Material.

## Installation in DaVinci Resolve

Variante A (einfachste): `.cube`-Datei direkt in Resolve ziehen – auf das LUT-Panel der Color-Seite
(oben rechts: Dreipunkt-Menü → LUTs) oder auf einen Node in der Node-Editor-Ansicht.

Variante B (dauerhaft im LUT-Browser): Datei in den LUT-Ordner von Resolve kopieren und danach im
LUT-Panel rechtsklicken → „Update LUTs":

- Windows: `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\LUT\`
- macOS: `/Library/Application Support/Blackmagic Design/DaVinci Resolve/LUT/`
- Linux: `~/.local/share/Blackmagic Design/DaVinci Resolve/LUT/`

(Alternativ in den Projekt-Einstellungen unter Color Management → „Open LUT Folder" den Ordner öffnen.)

## Anwendung

- Color-Seite: LUT aus dem LUT-Panel auf einen eigenen Node ziehen (empfohlen als letzter Node nach dem Grading).
- Oder als Look-LUT des Projekts: Projekt-Einstellungen → Color Management → Look LUT.
- Stärke anpassen: am LUT-Node den Blend-/Mix-Regler des Nodes reduzieren (z. B. 60–80 % für dezenteren Look).
- Bei Color Managed (Davinci YRGB) am besten nach der Ausgabetransformation bzw. als Look LUT einsetzen,
  damit die LUT im Display-Farbraum wirkt.

## Anpassen / eigene Varianten

Beide Generatoren erzeugen ihre Datei neu (reines Python 3, keine Abhängigkeiten):

```bash
cd lut
python3 generate_apple_log_lut.py   # apple-log-to-rec709-33.cube
python3 generate_dji_lut.py         # dji-dlog-... und dji-dlog2-...cube
python3 generate_lut.py             # cinematic-outdoor-33.cube
```

Die Look-Parameter von `generate_lut.py` stehen oben in der Datei als Konstanten (`BLACK_LIFT`, `CONTRAST`,
`SATURATION`, `SHOULDER_*`, `WARM_HIGHLIGHTS`, `COOL_SHADOWS`, `SIZE`) – z. B. `SATURATION = 1.0` für volle
Sättigung, `BLACK_LIFT = 0.0` für tiefes Schwarz, `SIZE = 65` für eine feinere 65³-LUT. Bei
`generate_apple_log_lut.py` sind Kurvenkonstanten (`R0`, `RT`, `C`, `BETA`, `GAMMA`, `DELTA`), die
Gamut-Matrizen und `OUTPUT_GAMMA` anpassbar.
