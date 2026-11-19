/* Ortssuche-Daten (US-Staaten, EU-Länder, Kantone, Aliase) für sonne-mond.html.
 * Wird erst bei Bedarf per loadOrtData() nachgeladen (erstes Tippen/Fokus im Ortsfeld).
 * Braucht normalizeQuery() aus der Hauptdatei (global). */
var US_STATES = {
  'al': 'Alabama', 'ak': 'Alaska', 'az': 'Arizona', 'ar': 'Arkansas', 'ca': 'Kalifornien', 'co': 'Colorado', 'ct': 'Connecticut', 'de': 'Delaware', 'fl': 'Florida', 'ga': 'Georgia', 'hi': 'Hawaii', 'id': 'Idaho', 'il': 'Illinois', 'in': 'Indiana', 'ia': 'Iowa', 'ks': 'Kansas', 'ky': 'Kentucky', 'la': 'Louisiana', 'me': 'Maine', 'md': 'Maryland', 'ma': 'Massachusetts', 'mi': 'Michigan', 'mn': 'Minnesota', 'ms': 'Mississippi', 'mo': 'Missouri', 'mt': 'Montana', 'ne': 'Nebraska', 'nv': 'Nevada', 'nh': 'New Hampshire', 'nj': 'New Jersey', 'nm': 'New Mexico', 'ny': 'New York', 'nc': 'North Carolina', 'nd': 'North Dakota', 'oh': 'Ohio', 'ok': 'Oklahoma', 'or': 'Oregon', 'pa': 'Pennsylvania', 'ri': 'Rhode Island', 'sc': 'South Carolina', 'sd': 'South Dakota', 'tn': 'Tennessee', 'tx': 'Texas', 'ut': 'Utah', 'vt': 'Vermont', 'va': 'Virginia', 'wa': 'Washington', 'wv': 'West Virginia', 'wi': 'Wisconsin', 'wy': 'Wyoming', 'dc': 'District of Columbia'
};
var US_STATE_NAMES = {};
Object.keys(US_STATES).forEach(function (code) {
  US_STATE_NAMES[US_STATES[code].toLowerCase()] = code;
  US_STATE_NAMES[code] = code;
});
var EU_COUNTRIES = {
  'al': ['Albanien', 'Albania'],
  'ad': ['Andorra'],
  'at': ['Österreich', 'Oesterreich', 'Austria'],
  'by': ['Weißrussland', 'Weissrussland', 'Belarus'],
  'be': ['Belgien', 'Belgium', 'Belgique'],
  'ba': ['Bosnien und Herzegowina', 'Bosnien', 'Bosnia and Herzegovina', 'Bosnia'],
  'bg': ['Bulgarien', 'Bulgaria'],
  'hr': ['Kroatien', 'Croatia', 'Hrvatska'],
  'cy': ['Zypern', 'Cyprus'],
  'cz': ['Tschechien', 'Czechia', 'Czech Republic'],
  'dk': ['Dänemark', 'Daenemark', 'Denmark'],
  'ee': ['Estland', 'Estonia'],
  'fi': ['Finnland', 'Finland'],
  'fr': ['Frankreich', 'France'],
  'de': ['Deutschland', 'Germany'],
  'gr': ['Griechenland', 'Greece'],
  'hu': ['Ungarn', 'Hungary'],
  'is': ['Island'],
  'ie': ['Irland', 'Ireland'],
  'it': ['Italien', 'Italy'],
  'lv': ['Lettland', 'Latvia'],
  'li': ['Liechtenstein'],
  'lt': ['Litauen', 'Lithuania'],
  'lu': ['Luxemburg', 'Luxembourg'],
  'mt': ['Malta'],
  'md': ['Moldawien', 'Moldova'],
  'mc': ['Monaco'],
  'me': ['Montenegro'],
  'nl': ['Niederlande', 'Holland', 'Netherlands', 'Nederland'],
  'mk': ['Nordmazedonien', 'Mazedonien', 'North Macedonia', 'Macedonia'],
  'no': ['Norwegen', 'Norway', 'Norge'],
  'pl': ['Polen', 'Poland'],
  'pt': ['Portugal'],
  'ro': ['Rumänien', 'Romania'],
  'ru': ['Russland', 'Russia'],
  'sm': ['San Marino'],
  'rs': ['Serbien', 'Serbia'],
  'sk': ['Slowakei', 'Slovakia'],
  'si': ['Slowenien', 'Slovenia'],
  'es': ['Spanien', 'Spain'],
  'se': ['Schweden', 'Sweden', 'Sverige'],
  'ch': ['Schweiz', 'Switzerland', 'Suisse', 'Svizzera'],
  'ua': ['Ukraine'],
  'gb': ['Grossbritannien', 'Vereinigtes Königreich', 'United Kingdom', 'UK', 'Great Britain', 'England', 'Schottland', 'Scotland', 'Wales'],
  'va': ['Vatikan', 'Vatican'],
  'xk': ['Kosovo'],
  'tr': ['Türkei', 'Turkey'],
  'us': ['USA', 'Vereinigte Staaten', 'United States', 'United States of America']
};
var COUNTRY_ALIASES = {};
function addCountryAlias(code, names, overwrite) {
  (names || []).forEach(function (nm) {
    var key = normalizeQuery(nm);
    if (key && (overwrite || !COUNTRY_ALIASES[key])) { COUNTRY_ALIASES[key] = code; }
  });
  var cc2 = String(code).toLowerCase();
  if (cc2.length === 2 && (overwrite || !COUNTRY_ALIASES[cc2])) { COUNTRY_ALIASES[cc2] = code; }
}
Object.keys(EU_COUNTRIES).forEach(function (code) { addCountryAlias(code, EU_COUNTRIES[code], false); });
Object.keys(US_STATES).forEach(function (code) {
  addCountryAlias('us', [US_STATES[code]], false);
  COUNTRY_ALIASES[code] = 'us';
});
var CH_CANTONS = {
  'zh': ['Zürich', 'Zurich'],
  'be': ['Bern'],
  'lu': ['Luzern', 'Lucerne'],
  'ur': ['Uri'],
  'sz': ['Schwyz'],
  'ow': ['Obwalden'],
  'nw': ['Nidwalden'],
  'gl': ['Glarus'],
  'zg': ['Zug'],
  'fr': ['Freiburg', 'Fribourg'],
  'so': ['Solothurn'],
  'bs': ['Basel-Stadt', 'Basel Stadt', 'Basel-Stadt', 'Bâle-Ville'],
  'bl': ['Basel-Landschaft', 'Basel Landschaft', 'Bâle-Campagne'],
  'sh': ['Schaffhausen'],
  'ar': ['Appenzell Ausserrhoden', 'Appenzell'],
  'ai': ['Appenzell Innerrhoden'],
  'sg': ['St. Gallen', 'St Gallen', 'Sankt Gallen', 'Saint Gall'],
  'gr': ['Graubünden', 'Grisons', 'Grigioni'],
  'ag': ['Aargau'],
  'tg': ['Thurgau'],
  'ti': ['Tessin', 'Ticino'],
  'vd': ['Waadt', 'Vaud'],
  'vs': ['Wallis', 'Valais'],
  'ne': ['Neuenburg', 'Neuchâtel', 'Neuchatel'],
  'ge': ['Genf', 'Genève', 'Geneva'],
  'ju': ['Jura']
};
Object.keys(CH_CANTONS).forEach(function (code) {
  addCountryAlias('ch', CH_CANTONS[code], false);
  if (!COUNTRY_ALIASES[code]) { COUNTRY_ALIASES[code] = 'ch'; }
});
