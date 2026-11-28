<?php
/* Zentrale Top-Navigation, serverseitig eingebunden per:
     <navi navi><?php include "body/kleine-navigation.php"; ?></navi>                     (Root-Seiten)
     <navi navi><?php $naviTiefe = 1; include "../body/kleine-navigation.php"; ?></navi> (Unterordner wie koordinaten/)
   Ohne PHP (GitHub Pages, file://) bleibt das <?php ... ?> ein unsichtbarer Bogus-Comment
   im HTML und js/navi.js rendert die Navi clientseitig als Fallback. CSS: css/navi.css. */
if (!isset($naviTiefe)) { $naviTiefe = 0; }
$naviBasis = str_repeat('../', (int) $naviTiefe);
$naviScript = isset($_SERVER['SCRIPT_NAME']) ? basename($_SERVER['SCRIPT_NAME']) : '';
$naviLinks = array(
  array('notfallblatt.html', 'Notfallblatt'),
  array('koordinaten/', 'Koordinaten'),
  array('gpx-reduce.html', 'GPX reduzieren'),
  array('sonne-mond.html', 'Sonne & Mond'),
  array('bokeh.html', 'Bokeh'),
  array('reitplatz.html', 'Reitplatz'),
  array('ort-db-editor.html', 'Ort-DB'),
  array('koordinaten/datenschutz.html', 'Datenschutz')
);
if (!function_exists('navi_schluessel')) {
  function navi_schluessel($href) {
    $b = basename($href);
    return preg_replace('/\.(html|php)$/', '', $b);
  }
}
$naviSeite = preg_replace('/\.(html|php)$/', '', $naviScript);
if ($naviSeite === 'index') { $naviSeite = ((int) $naviTiefe > 0) ? 'koordinaten' : 'index'; }
?>
<nav class="navi-bar" aria-label="Hauptnavigation">
  <div class="navi-inner">
    <a class="navi-brand<?php if ($naviSeite === 'index') { echo ' aktiv'; } ?>" href="<?php echo $naviBasis; ?>index.html"<?php if ($naviSeite === 'index') { echo ' aria-current="page"'; } ?>><img src="<?php echo $naviBasis; ?>img/motorsaege.svg" alt="" width="26" height="26"><span>Notfallblatt &amp; Werkzeuge</span></a>
    <ul class="navi-links">
<?php foreach ($naviLinks as $naviLink) { $naviKey = navi_schluessel($naviLink[0]); $naviAktiv = ($naviKey === $naviSeite); ?>
      <li><a href="<?php echo $naviBasis . htmlspecialchars($naviLink[0], ENT_QUOTES); ?>"<?php if ($naviAktiv) { echo ' class="aktiv" aria-current="page"'; } ?>><?php echo htmlspecialchars($naviLink[1], ENT_QUOTES); ?></a></li>
<?php } ?>
    </ul>
  </div>
</nav>
