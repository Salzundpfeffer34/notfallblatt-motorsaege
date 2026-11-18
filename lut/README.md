# LUT für DaVinci Resolve

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

`generate_lut.py` erzeugt die Datei neu (reines Python 3, keine Abhängigkeiten):

```bash
cd lut
python3 generate_lut.py
```

Die Look-Parameter stehen oben in der Datei als Konstanten (`BLACK_LIFT`, `CONTRAST`, `SATURATION`,
`SHOULDER_*`, `WARM_HIGHLIGHTS`, `COOL_SHADOWS`, `SIZE`) – z. B. `SATURATION = 1.0` für volle Sättigung,
`BLACK_LIFT = 0.0` für tiefes Schwarz, `SIZE = 65` für eine feinere 65³-LUT.
