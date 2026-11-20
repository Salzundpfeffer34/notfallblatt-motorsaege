// bokeh-linsen.js – Datenbank: Sensoren + Optiken für bokeh.html (rein lokal, keine Netzwerkzugriffe)
// f = Brennweite in mm, n = größte Blende (kleinste Zahl), note = optionaler Hinweis (z. B. Zoom-Enden)
var BOKEH_SENSORS = [
  { id: 'ff',    name: 'Vollformat 36×24 mm',              w: 36,   h: 24   },
  { id: 'apsc',  name: 'APS-C 23,5×15,6 mm',               w: 23.5, h: 15.6 },
  { id: 'mft',   name: 'Micro Four Thirds 17,3×13 mm',     w: 17.3, h: 13   },
  { id: '1zoll', name: '1 Zoll 13,2×8,8 mm',               w: 13.2, h: 8.8  },
  { id: 'phone', name: 'Smartphone ca. 1/2,5 Zoll (5,7×4,3 mm)', w: 5.7, h: 4.3 }
];

var BOKEH_LINSEN = [
  // Ultra-Weitwinkel
  { id: 'l08',   group: 'Ultra-Weitwinkel', name: '8 mm Fisheye f/2.8',            f: 8,   n: 2.8 },
  { id: 'l10',   group: 'Ultra-Weitwinkel', name: '10 mm f/2.8',                   f: 10,  n: 2.8 },
  { id: 'l12',   group: 'Ultra-Weitwinkel', name: '12 mm f/4',                     f: 12,  n: 4   },
  { id: 'l14',   group: 'Ultra-Weitwinkel', name: '14 mm f/2.8',                   f: 14,  n: 2.8 },
  { id: 'l15',   group: 'Ultra-Weitwinkel', name: '15 mm f/2.8',                   f: 15,  n: 2.8 },
  { id: 'l16',   group: 'Ultra-Weitwinkel', name: '16 mm f/2.8',                   f: 16,  n: 2.8 },
  // Weitwinkel
  { id: 'l1635', group: 'Weitwinkel',        name: '16–35 mm f/2.8 (Zoom)',         f: 35,  n: 2.8, note: 'Zoom – gerechnet bei 35 mm (Tele-Ende)' },
  { id: 'l20',   group: 'Weitwinkel',        name: '20 mm f/1.8',                   f: 20,  n: 1.8 },
  { id: 'l24',   group: 'Weitwinkel',        name: '24 mm f/1.4',                   f: 24,  n: 1.4 },
  { id: 'l28',   group: 'Weitwinkel',        name: '28 mm f/2',                     f: 28,  n: 2   },
  { id: 'l2470', group: 'Weitwinkel',        name: '24–70 mm f/2.8 (Zoom)',         f: 70,  n: 2.8, note: 'Zoom – gerechnet bei 70 mm' },
  // Standard
  { id: 'l3514', group: 'Standard',          name: '35 mm f/1.4',                   f: 35,  n: 1.4 },
  { id: 'l352',  group: 'Standard',          name: '35 mm f/2',                     f: 35,  n: 2   },
  { id: 'l40',   group: 'Standard',          name: '40 mm f/2.8',                   f: 40,  n: 2.8 },
  { id: 'l5012', group: 'Standard',          name: '50 mm f/1.2',                   f: 50,  n: 1.2 },
  { id: 'l5014', group: 'Standard',          name: '50 mm f/1.4',                   f: 50,  n: 1.4 },
  { id: 'l5018', group: 'Standard',          name: '50 mm f/1.8',                   f: 50,  n: 1.8 },
  { id: 'l58',   group: 'Standard',          name: '58 mm f/1.2',                   f: 58,  n: 1.2 },
  // Porträt / Tele
  { id: 'l8514', group: 'Porträt / Tele',    name: '85 mm f/1.4',                   f: 85,  n: 1.4 },
  { id: 'l8518', group: 'Porträt / Tele',    name: '85 mm f/1.8',                   f: 85,  n: 1.8 },
  { id: 'l10528',group: 'Porträt / Tele',    name: '105 mm f/2.8',                  f: 105, n: 2.8 },
  { id: 'l1352', group: 'Porträt / Tele',    name: '135 mm f/2',                    f: 135, n: 2   },
  { id: 'l13528',group: 'Porträt / Tele',    name: '135 mm f/2.8',                  f: 135, n: 2.8 },
  { id: 'l2002', group: 'Porträt / Tele',    name: '200 mm f/2',                    f: 200, n: 2   },
  { id: 'l20028',group: 'Porträt / Tele',    name: '200 mm f/2.8',                  f: 200, n: 2.8 },
  // Makro
  { id: 'l60m',  group: 'Makro',             name: '60 mm f/2.8 Macro',             f: 60,  n: 2.8 },
  { id: 'l90m',  group: 'Makro',             name: '90 mm f/2.8 Macro',             f: 90,  n: 2.8 },
  { id: 'l100m', group: 'Makro',             name: '100 mm f/2.8 Macro',            f: 100, n: 2.8 },
  { id: 'l180m', group: 'Makro',             name: '180 mm f/3.5 Macro',            f: 180, n: 3.5 },
  // Zoom-Tele / Allround
  { id: 'l1855', group: 'Zoom / Allround',   name: '18–55 mm f/3.5–5.6 (Kit)',      f: 55,  n: 5.6, note: 'Kit-Objektiv – gerechnet bei 55 mm' },
  { id: 'l55250',group: 'Zoom / Allround',   name: '55–250 mm f/4–5.6',             f: 250, n: 5.6, note: 'gerechnet bei 250 mm' },
  { id: 'l18200',group: 'Zoom / Allround',   name: '18–200 mm f/3.5–5.6',           f: 200, n: 5.6, note: 'gerechnet bei 200 mm' },
  { id: 'l24105',group: 'Zoom / Allround',   name: '24–105 mm f/4',                 f: 105, n: 4,   note: 'gerechnet bei 105 mm' },
  { id: 'l28300',group: 'Zoom / Allround',   name: '28–300 mm f/3.5–5.6',           f: 300, n: 5.6, note: 'gerechnet bei 300 mm' },
  { id: 'l70200',group: 'Zoom / Allround',   name: '70–200 mm f/2.8',               f: 200, n: 2.8, note: 'gerechnet bei 200 mm' },
  { id: 'l702004',group:'Zoom / Allround',   name: '70–200 mm f/4',                 f: 200, n: 4,   note: 'gerechnet bei 200 mm' },
  { id: 'l100400',group:'Zoom / Allround',   name: '100–400 mm f/4.5–5.6',          f: 400, n: 5.6, note: 'gerechnet bei 400 mm' },
  { id: 'l150600',group:'Zoom / Allround',   name: '150–600 mm f/5.6–6.3',          f: 600, n: 6.3, note: 'gerechnet bei 600 mm' },
  // Super-Tele
  { id: 'l300',  group: 'Super-Tele',        name: '300 mm f/2.8',                  f: 300, n: 2.8 },
  { id: 'l400',  group: 'Super-Tele',        name: '400 mm f/2.8',                  f: 400, n: 2.8 },
  { id: 'l500',  group: 'Super-Tele',        name: '500 mm f/4 (Spiegel)',          f: 500, n: 4   },
  { id: 'l600',  group: 'Super-Tele',        name: '600 mm f/4',                    f: 600, n: 4   },
  { id: 'l800',  group: 'Super-Tele',        name: '800 mm f/5.6',                  f: 800, n: 5.6 },
  // Smartphone
  { id: 'phone26', group: 'Smartphone',      name: 'Smartphone-Hauptkamera (ca. 26 mm KB-äquiv.)', f: 26, n: 1.7 }
];
