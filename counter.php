<?php
declare(strict_types=1);

/*
 * DSGVO-konformer Besucherzähler (self-hosted, "wie Google Analytics, aber datenschutzkonform").
 *
 * Was gespeichert wird (pro Aufruf, eine Zeile CSV in counter-data/hits-<site>.php):
 *   - Datum/Uhrzeit (ISO 8601)
 *   - Ländercode, abgeleitet aus der Browser-Zeitzone (die IP-Adresse wird NICHT gespeichert)
 *   - Browsersprache (z. B. de-CH) – damit man sieht, welche Sprache als Nächstes sinnvoll wäre
 *   - Referrer-Host (nur die Domain, ohne Pfad/Query – Koordinaten in Share-Links bleiben privat)
 *
 * Was NICHT passiert: keine Cookies, kein Fingerprinting, keine Weitergabe an Dritte.
 * Bot-Aufrufe werden ignoriert; Missbrauch wird per Rate-Limit gedrosselt (dafür wird nur ein
 * mit COUNTER_KEY gesalzener Hash der IP kurzzeitig (max. 120 s) verglichen, nie die IP selbst).
 *
 * Härtung:
 *   - Datenfiles heissen *.php und beginnen mit "<?php exit; ?>" – selbst wenn .htaccess
 *     (Apache) mal nicht greift (z. B. nginx), liefert der Server keinen Inhalt aus.
 *   - counter-data/ ist zusätzlich per .htaccess geschützt (Require all denied) und
 *     enthält eine leere index.html (gegen Directory-Listing auf statischen Servern).
 *   - Optional kann das Datenverzeichnis per COUNTER_DATA_DIR ausserhalb des Webroots
 *     gelegt werden (z. B. '/var/private/counter-data').
 *   - CSV-Formel-Injection: Felder, die mit = + - @ beginnen, bekommen ein fuehrendes '
 *     (damit Excel/LibreOffice sie beim Oeffnen der Datendatei nicht als Formel ausfuehren).
 *   - Statistik-Abruf nur mit Key und mit X-Robots-Tag: noindex.
 *   - Aufbewahrung: Einträge älter als COUNTER_RETENTION_DAYS Tage werden automatisch gelöscht.
 *
 * Einbindung: Die Seiten senden per navigator.sendBeacon/fetch ein POST an diese Datei.
 * Lokal (file://) oder ohne PHP (GitHub Pages) passiert nichts – der Request schlägt fehl und
 * wird stillschweigend ignoriert.
 *
 * Abruf der Statistik (nur mit Key; der Key wird per POST übertragen, nie in der URL/Logs):
 *   counter.php?view=1&site=notfallblatt   -> Formular erscheint, Key per POST eingeben
 *   counter.php?view=1&site=koordinaten
 *   counter.php?view=1&site=sonne-mond
 * Vor der produktiven Nutzung COUNTER_KEY unten auf einen eigenen geheimen Wert ändern!
 *
 * Rechtsgrundlage: berechtigtes Interesse am Betrieb/Reichweitenmessung der Website
 * (Art. 6 Abs. 1 lit. f DSGVO bzw. Art. 31 DSG / Art. 30 revDSG), cookielos, IP nicht gespeichert.
 */

const COUNTER_KEY = 'BITTE-EIGENEN-KEY-EINSETZEN';
const COUNTER_RETENTION_DAYS = 400;
const COUNTER_FILE_HEADER = "<?php exit; ?>\n";
const COUNTER_THROTTLE_SECONDS = 10;
const COUNTER_THROTTLE_MEMORY = 120;
/* Optional: absoluter Pfad ausserhalb des Webroots, z. B. '/var/private/counter-data'. Leer = counter-data/ neben dieser Datei. */
const COUNTER_DATA_DIR = '';

function counterDir(): string
{
    return COUNTER_DATA_DIR !== '' ? COUNTER_DATA_DIR : __DIR__ . '/counter-data';
}

function counterDataFile(string $site): string
{
    return counterDir() . '/hits-' . $site . '.php';
}

function counterSites(): array
{
    return array('notfallblatt', 'koordinaten', 'sonne-mond');
}

function counterDefaultSite(): string
{
    return basename(__DIR__) === 'koordinaten' ? 'koordinaten' : 'notfallblatt';
}

function counterRequestedSite(): string
{
    $s = isset($_REQUEST['site']) ? (string) $_REQUEST['site'] : '';
    if (!in_array($s, counterSites(), true)) {
        $s = counterDefaultSite();
    }
    return $s;
}

function counterEnsureDir(): void
{
    $d = counterDir();
    if (!is_dir($d)) {
        @mkdir($d, 0705, true);
    }
    $ht = $d . '/.htaccess';
    if (!file_exists($ht)) {
        @file_put_contents(
            $ht,
            "# Zaehlerdaten nicht oeffentlich auslieferbar\n"
            . "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n"
            . "<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\n"
        );
    }
    $ix = $d . '/index.html';
    if (!file_exists($ix)) {
        @file_put_contents($ix, '');
    }
}

function counterIsBot(): bool
{
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? strtolower((string) $_SERVER['HTTP_USER_AGENT']) : '';
    if ($ua === '') {
        return true;
    }
    $needles = array('bot', 'crawl', 'spider', 'slurp', 'curl', 'wget', 'python', 'headless', 'lighthouse', 'monitoring', 'preview');
    foreach ($needles as $n) {
        if (strpos($ua, $n) !== false) {
            return true;
        }
    }
    return false;
}

/*
 * Rate-Limit: pro IP nur 1 Hit pro COUNTER_THROTTLE_SECONDS Sekunden.
 * Gespeichert wird nur hash(sha256, COUNTER_KEY + IP) mit Zeitstempel;
 * Einträge älter als COUNTER_THROTTLE_MEMORY Sekunden werden automatisch gelöscht.
 * Die IP-Adresse selbst wird nirgends gespeichert.
 */
function counterThrottled(): bool
{
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '';
    if ($ip === '' || !function_exists('hash')) {
        return false;
    }
    $h = hash('sha256', COUNTER_KEY . '|' . $ip);
    $rf = counterDir() . '/rl.php';
    $map = array();
    if (is_file($rf)) {
        $lines = file($rf, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (is_array($lines)) {
            foreach ($lines as $l) {
                if (strpos($l, '<?php') === 0) {
                    continue;
                }
                $d = json_decode($l, true);
                if (is_array($d)) {
                    $map = $d;
                }
            }
        }
    }
    $now = time();
    foreach ($map as $k => $ts) {
        if (!is_int($ts) || $now - $ts > COUNTER_THROTTLE_MEMORY) {
            unset($map[$k]);
        }
    }
    if (isset($map[$h]) && is_int($map[$h]) && $now - $map[$h] < COUNTER_THROTTLE_SECONDS) {
        return true;
    }
    $map[$h] = $now;
    @file_put_contents($rf, COUNTER_FILE_HEADER . json_encode($map) . "\n", LOCK_EX);
    return false;
}

function counterField(string $v, int $max): string
{
    $v = (string) preg_replace('/[\x00-\x1F\x7F|]/', '', $v);
    $v = trim($v);
    if ($v !== '' && in_array($v[0], array('=', '+', '-', '@'), true)) {
        $v = "'" . $v;
    }
    if (function_exists('mb_strlen') && mb_strlen($v, 'UTF-8') > $max) {
        $v = mb_substr($v, 0, $max, 'UTF-8');
    } elseif (strlen($v) > $max) {
        $v = substr($v, 0, $max);
    }
    return $v;
}

function counterTzMap(): array
{
    return array(
        'Europe/Zurich' => 'CH', 'Europe/Berlin' => 'DE', 'Europe/Vienna' => 'AT', 'Europe/Vaduz' => 'LI',
        'Europe/Paris' => 'FR', 'Europe/Rome' => 'IT', 'Europe/Madrid' => 'ES', 'Europe/Barcelona' => 'ES',
        'Europe/Lisbon' => 'PT', 'Europe/London' => 'GB', 'Europe/Dublin' => 'IE', 'Europe/Amsterdam' => 'NL',
        'Europe/Brussels' => 'BE', 'Europe/Luxembourg' => 'LU', 'Europe/Copenhagen' => 'DK', 'Europe/Oslo' => 'NO',
        'Europe/Stockholm' => 'SE', 'Europe/Helsinki' => 'FI', 'Europe/Warsaw' => 'PL', 'Europe/Prague' => 'CZ',
        'Europe/Bratislava' => 'SK', 'Europe/Budapest' => 'HU', 'Europe/Bucharest' => 'RO', 'Europe/Sofia' => 'BG',
        'Europe/Athens' => 'GR', 'Europe/Nicosia' => 'CY', 'Europe/Tallinn' => 'EE', 'Europe/Riga' => 'LV',
        'Europe/Vilnius' => 'LT', 'Europe/Kyiv' => 'UA', 'Europe/Minsk' => 'BY', 'Europe/Moscow' => 'RU',
        'Europe/Istanbul' => 'TR', 'Europe/Malta' => 'MT', 'Europe/Zagreb' => 'HR', 'Europe/Belgrade' => 'RS',
        'America/New_York' => 'US', 'America/Chicago' => 'US', 'America/Denver' => 'US', 'America/Los_Angeles' => 'US',
        'America/Anchorage' => 'US', 'Pacific/Honolulu' => 'US',
        'America/Toronto' => 'CA', 'America/Montreal' => 'CA', 'America/Vancouver' => 'CA', 'America/Edmonton' => 'CA', 'America/Halifax' => 'CA',
        'America/Mexico_City' => 'MX', 'America/Tijuana' => 'MX', 'America/Sao_Paulo' => 'BR', 'America/Argentina/Buenos_Aires' => 'AR',
        'America/Santiago' => 'CL', 'America/Bogota' => 'CO', 'America/Lima' => 'PE',
        'Asia/Tokyo' => 'JP', 'Asia/Seoul' => 'KR', 'Asia/Shanghai' => 'CN', 'Asia/Taipei' => 'TW', 'Asia/Hong_Kong' => 'HK',
        'Asia/Singapore' => 'SG', 'Asia/Bangkok' => 'TH', 'Asia/Jakarta' => 'ID', 'Asia/Manila' => 'PH',
        'Asia/Kuala_Lumpur' => 'MY', 'Asia/Dubai' => 'AE', 'Asia/Tel_Aviv' => 'IL', 'Asia/Kolkata' => 'IN', 'Asia/Calcutta' => 'IN',
        'Australia/Sydney' => 'AU', 'Australia/Melbourne' => 'AU', 'Australia/Brisbane' => 'AU', 'Australia/Perth' => 'AU',
        'Pacific/Auckland' => 'NZ', 'Africa/Johannesburg' => 'ZA', 'Africa/Cairo' => 'EG', 'Africa/Lagos' => 'NG',
        'Africa/Nairobi' => 'KE', 'Africa/Casablanca' => 'MA',
    );
}

function counterCountry(string $tz): string
{
    $tz = counterField($tz, 64);
    $map = counterTzMap();
    if (isset($map[$tz])) {
        return $map[$tz];
    }
    $region = explode('/', $tz)[0];
    if ($region === 'Europe') {
        return 'EU';
    }
    return 'XX';
}

function counterFlag(string $cc): string
{
    $cc = strtoupper($cc);
    if ($cc === 'EU') {
        return "\xF0\x9F\x87\xAA\xF0\x9F\x87\xBA";
    }
    if (strlen($cc) !== 2 || !ctype_alpha($cc)) {
        return "\xF0\x9F\x8F\xB3\xEF\xB8\x8F";
    }
    $a = ord($cc[0]) - 65;
    $b = ord($cc[1]) - 65;
    if ($a < 0 || $a > 25 || $b < 0 || $b > 25) {
        return "\xF0\x9F\x8F\xB3\xEF\xB8\x8F";
    }
    return chr(0xF0) . chr(0x9F) . chr(0x87) . chr(0xA6 + $a) . chr(0xF0) . chr(0x9F) . chr(0x87) . chr(0xA6 + $b);
}

function counterHit(string $site, string $tz, string $lang, string $ref): void
{
    if (counterIsBot()) {
        return;
    }
    counterEnsureDir();
    if (counterThrottled()) {
        return;
    }
    $cc = counterCountry($tz);
    $lang = counterField($lang, 12);
    $refHost = '';
    if ($ref !== '') {
        $h = parse_url($ref, PHP_URL_HOST);
        if (is_string($h) && $h !== '') {
            $refHost = counterField(strtolower($h), 100);
        }
    }
    $line = date('c') . '|' . $cc . '|' . $lang . '|' . $refHost . "\n";
    $f = counterDataFile($site);
    $legacy = counterDir() . '/hits-' . $site . '.csv';
    $fh = @fopen($f, 'c+');
    if (!$fh) {
        return;
    }
    flock($fh, LOCK_EX);
    $cutoff = time() - COUNTER_RETENTION_DAYS * 86400;
    $keep = array();
    rewind($fh);
    while (($l = fgets($fh)) !== false) {
        if (strpos($l, '<?php') === 0) {
            continue;
        }
        $ts = strtotime(substr($l, 0, 25));
        if ($ts !== false && $ts >= $cutoff) {
            $keep[] = $l;
        }
    }
    if (!$keep && is_file($legacy)) {
        // Migration vom alten CSV-Format
        $ll = file($legacy, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (is_array($ll)) {
            foreach ($ll as $l) {
                $ts = strtotime(substr($l, 0, 25));
                if ($ts !== false && $ts >= $cutoff) {
                    $keep[] = $l . "\n";
                }
            }
        }
        @unlink($legacy);
    }
    $keep[] = $line;
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, COUNTER_FILE_HEADER . implode('', $keep));
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
}

function counterRead(string $site): array
{
    $f = counterDataFile($site);
    if (!is_file($f)) {
        $f = counterDir() . '/hits-' . $site . '.csv';
    }
    if (!is_file($f)) {
        return array();
    }
    $rows = array();
    $lines = file($f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return array();
    }
    foreach ($lines as $l) {
        if (strpos($l, '<?php') === 0) {
            continue;
        }
        $p = explode('|', $l);
        if (count($p) < 4) {
            continue;
        }
        $ts = strtotime(substr($p[0], 0, 25));
        $rows[] = array(
            'ts' => $ts === false ? 0 : $ts,
            'date' => substr($p[0], 0, 10),
            'cc' => $p[1],
            'lang' => $p[2],
            'ref' => $p[3],
        );
    }
    return $rows;
}

function counterH(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

function counterBarRow(string $label, int $c, int $max): string
{
    $pct = $max > 0 ? (int) round(100 * $c / $max) : 0;
    return '<div class="brow"><span class="bl">' . $label . '</span>'
        . '<span class="bbar"><span style="width:' . $pct . '%"></span></span>'
        . '<span class="bc">' . $c . '</span></div>';
}

function counterDayChart(array $byDate, int $days = 31): string
{
    $keys = array_slice(array_keys($byDate), 0, $days);
    $keys = array_reverse($keys);
    $n = count($keys);
    if ($n === 0) {
        return '<p class="note">noch keine Daten</p>';
    }
    $max = 1;
    foreach ($byDate as $c) {
        if ($c > $max) {
            $max = $c;
        }
    }
    $w = 860; $h = 200; $pl = 36; $pb = 24; $pt = 14;
    $bw = ($w - $pl - 8) / $n;
    $s = '<svg viewBox="0 0 ' . $w . ' ' . $h . '" role="img" aria-label="Aufrufe pro Tag" style="width:100%;height:auto;background:#fafaf8;border:1px solid #e5e5e0;border-radius:8px">';
    foreach (array(0.0, 0.5, 1.0) as $f) {
        $v = (int) round($max * $f);
        $y = $h - $pb - ($h - $pt - $pb) * $f;
        $s .= '<line x1="' . $pl . '" y1="' . $y . '" x2="' . ($w - 8) . '" y2="' . $y . '" stroke="#e5e5e0" stroke-width="1"/>'
            . '<text x="' . ($pl - 6) . '" y="' . ($y + 4) . '" text-anchor="end" font-size="11" fill="#888">' . $v . '</text>';
    }
    foreach ($keys as $i => $d) {
        $c = $byDate[$d];
        $bh = ($h - $pt - $pb) * ($c / $max);
        $x = $pl + $i * $bw + 1;
        $y = $h - $pb - $bh;
        $s .= '<rect x="' . round($x, 1) . '" y="' . round($y, 1) . '" width="' . max(1, round($bw - 2, 1)) . '" height="' . round($bh, 1) . '" fill="#3b6ea5" rx="2"><title>' . counterH($d) . ': ' . $c . ' Aufrufe</title></rect>';
        if ($i % 5 === 0 || $i === $n - 1) {
            $s .= '<text x="' . round($x + $bw / 2 - 1, 1) . '" y="' . ($h - 8) . '" text-anchor="middle" font-size="10" fill="#888">' . substr($d, 5) . '</text>';
        }
    }
    $s .= '</svg>';
    return $s;
}

function counterViewKey(): string
{
    return isset($_POST['key']) ? (string) $_POST['key'] : '';
}

function counterViewForm(string $site): void
{
    http_response_code(403);
    header('Content-Type: text/html; charset=utf-8');
    header('X-Robots-Tag: noindex, nofollow');
    $self = counterH(basename(__FILE__));
    $siteH = counterH($site);
    echo '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="robots" content="noindex,nofollow">'
        . '<title>Zähler · ' . $siteH . '</title>'
        . '<style>body{font-family:system-ui,sans-serif;max-width:420px;margin:48px auto;padding:0 16px;color:#222}input,button{font:inherit;padding:8px 10px}button{margin-top:10px}</style></head><body>'
        . '<h1>Besucherzähler · ' . $siteH . '</h1>'
        . '<p>Statistik nur mit Key. Der Key wird per POST übertragen (steht nicht in der URL).</p>'
        . '<form method="post" action="' . $self . '?view=1&amp;site=' . $siteH . '">'
        . '<input type="password" name="key" placeholder="Key" autocomplete="off" style="width:100%">'
        . '<br><button type="submit">Anzeigen</button>'
        . '</form></body></html>';
}

function counterView(string $site): void
{
    $key = counterViewKey();
    if (COUNTER_KEY === 'BITTE-EIGENEN-KEY-EINSETZEN' || !hash_equals(COUNTER_KEY, $key)) {
        counterViewForm($site);
        return;
    }
    header('X-Robots-Tag: noindex, nofollow');
    $rows = counterRead($site);
    $total = count($rows);
    $byDate = array();
    $byCc = array();
    $byLang = array();
    $byRef = array();
    foreach ($rows as $r) {
        $byDate[$r['date']] = ($byDate[$r['date']] ?? 0) + 1;
        $byCc[$r['cc']] = ($byCc[$r['cc']] ?? 0) + 1;
        $byLang[$r['lang']] = ($byLang[$r['lang']] ?? 0) + 1;
        if ($r['ref'] !== '') {
            $byRef[$r['ref']] = ($byRef[$r['ref']] ?? 0) + 1;
        }
    }
    krsort($byDate);
    arsort($byCc);
    arsort($byLang);
    arsort($byRef);
    $today = date('Y-m-d');
    $month = date('Y-m');
    $todayN = isset($byDate[$today]) ? $byDate[$today] : 0;
    $monthN = 0;
    foreach ($byDate as $d => $c) {
        if (strpos($d, $month) === 0) {
            $monthN += $c;
        }
    }
    $maxCc = $byCc ? max($byCc) : 1;
    $maxLang = $byLang ? max($byLang) : 1;
    $maxRef = $byRef ? max($byRef) : 1;
    $keyQ = counterH($key);
    $self = counterH(basename(__FILE__));
    $siteH = counterH($site);
    $switcher = '';
    foreach (counterSites() as $s2) {
        $s2h = counterH($s2);
        $label = $s2 === $site ? '<strong>' . $s2h . '</strong>' : $s2h;
        $switcher .= '<form method="post" action="' . $self . '?view=1&amp;site=' . $s2h . '" style="display:inline;margin-right:12px">'
            . '<input type="hidden" name="key" value="' . $keyQ . '">'
            . '<button type="submit" style="background:none;border:none;padding:0;color:#3b6ea5;cursor:pointer;text-decoration:underline;font:inherit">' . $label . '</button>'
            . '</form>';
    }

    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="robots" content="noindex,nofollow">'
        . '<title>Zähler · ' . $siteH . '</title>'
        . '<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#222}'
        . 'h1{font-size:1.4rem}h2{font-size:1.05rem;margin:24px 0 8px}'
        . '.note{color:#666;font-size:.85rem}.switcher form{display:inline;margin-right:12px}'
        . '.cards{display:flex;gap:12px;flex-wrap:wrap;margin:14px 0}'
        . '.card2{flex:1;min-width:130px;border:1px solid #e5e5e0;border-radius:10px;padding:12px 14px;background:#fafaf8}'
        . '.card2 .big{font-size:1.7rem;font-weight:700;font-variant-numeric:tabular-nums}'
        . '.card2 .cap{color:#666;font-size:.8rem}'
        . '.brow{display:flex;align-items:center;gap:8px;margin:5px 0;font-size:.92rem}'
        . '.bl{flex:0 0 190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
        . '.bbar{flex:1;background:#f0f0ec;border-radius:4px;height:14px;overflow:hidden}'
        . '.bbar span{display:block;height:100%;background:#3b6ea5}'
        . '.bc{flex:0 0 52px;text-align:right;font-variant-numeric:tabular-nums}</style></head><body>'
        . '<h1>Besucherzähler · ' . $siteH . '</h1>'
        . '<p class="switcher">Ansicht: ' . $switcher . '</p>'
        . '<div class="cards">'
        . '<div class="card2"><div class="big">' . $total . '</div><div class="cap">Aufrufe gesamt</div></div>'
        . '<div class="card2"><div class="big">' . $todayN . '</div><div class="cap">heute (' . $today . ')</div></div>'
        . '<div class="card2"><div class="big">' . $monthN . '</div><div class="cap">diesen Monat (' . $month . ')</div></div>'
        . '<div class="card2"><div class="big">' . count($byDate) . '</div><div class="cap">aktive Tage</div></div>'
        . '<div class="card2"><div class="big">' . count($byCc) . '</div><div class="cap">Länder</div></div>'
        . '</div>'
        . '<p class="note">Cookielos. Keine IP-Adressen gespeichert – das Land wird aus der Browser-Zeitzone abgeleitet; '
        . 'zur Drosselung wird nur ein gesalzener Hash der IP max. ' . COUNTER_THROTTLE_MEMORY . ' s vorgehalten. '
        . 'Referrer nur als Host (ohne Pfad/Query). Einträge älter als ' . COUNTER_RETENTION_DAYS . ' Tage werden automatisch gelöscht. '
        . 'Daten liegen in <code>counter-data/hits-' . $siteH . '.php</code> (per .htaccess geschützt, als .php mit exit-Kopf auch ohne Apache sicher).</p>'
        . '<h2>Aufrufe pro Tag (letzte 31 Tage)</h2>' . counterDayChart($byDate, 31)
        . '<h2>Herkunft (Land)</h2>';
    if (!$byCc) {
        echo '<p class="note">noch keine Daten</p>';
    }
    foreach ($byCc as $cc => $c) {
        echo counterBarRow(counterFlag($cc) . ' ' . counterH($cc), $c, $maxCc);
    }
    echo '<h2>Browsersprache</h2>';
    if (!$byLang) {
        echo '<p class="note">noch keine Daten</p>';
    }
    foreach ($byLang as $l => $c) {
        echo counterBarRow(counterH($l === '' ? '(unbekannt)' : $l), $c, $maxLang);
    }
    echo '<h2>Referrer (nur Host)</h2>';
    if (!$byRef) {
        echo '<p class="note">noch keine Daten (Direktaufrufe ohne Referrer werden nicht gelistet)</p>';
    }
    foreach ($byRef as $h => $c) {
        echo counterBarRow(counterH($h), $c, $maxRef);
    }
    echo '</body></html>';
}

function counterSecurityHeaders(): void
{
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'");
    header('Referrer-Policy: no-referrer');
}

if (PHP_SAPI !== 'cli') {
    counterSecurityHeaders();
    if (isset($_REQUEST['view'])) {
        counterView(counterRequestedSite());
    } elseif (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
        counterHit(
            counterRequestedSite(),
            isset($_POST['tz']) ? (string) $_POST['tz'] : '',
            isset($_POST['lang']) ? (string) $_POST['lang'] : '',
            isset($_POST['ref']) ? (string) $_POST['ref'] : ''
        );
        http_response_code(204);
    } else {
        http_response_code(204);
    }
}
