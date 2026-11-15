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
 *   - counter-data/ ist zusätzlich per .htaccess geschützt (Require all denied).
 *   - Statistik-Abruf nur mit Key und mit X-Robots-Tag: noindex.
 *   - Aufbewahrung: Einträge älter als COUNTER_RETENTION_DAYS Tage werden automatisch gelöscht.
 *
 * Einbindung: Die Seiten senden per navigator.sendBeacon/fetch ein POST an diese Datei.
 * Lokal (file://) oder ohne PHP (GitHub Pages) passiert nichts – der Request schlägt fehl und
 * wird stillschweigend ignoriert.
 *
 * Abruf der Statistik (nur mit Key):
 *   counter.php?view=1&site=notfallblatt&key=DEIN_KEY
 *   counter.php?view=1&site=koordinaten&key=DEIN_KEY
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

function counterDir(): string
{
    return __DIR__ . '/counter-data';
}

function counterDataFile(string $site): string
{
    return counterDir() . '/hits-' . $site . '.php';
}

function counterSites(): array
{
    return array('notfallblatt', 'koordinaten');
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

function counterView(string $site): void
{
    $key = isset($_GET['key']) ? (string) $_GET['key'] : '';
    if (COUNTER_KEY === 'BITTE-EIGENEN-KEY-EINSETZEN' || !hash_equals(COUNTER_KEY, $key)) {
        http_response_code(403);
        echo 'Forbidden';
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
    $other = counterDefaultSite() === $site ? 'koordinaten' : 'notfallblatt';
    $keyQ = counterH($key);
    $self = counterH(basename(__FILE__));
    $siteH = counterH($site);

    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="robots" content="noindex,nofollow">'
        . '<title>Zähler · ' . $siteH . '</title>'
        . '<style>body{font-family:system-ui,sans-serif;max-width:860px;margin:24px auto;padding:0 16px;color:#222}'
        . 'h1{font-size:1.4rem}table{border-collapse:collapse;width:100%;margin:10px 0 24px}'
        . 'td,th{border-bottom:1px solid #e5e5e0;padding:5px 8px;text-align:left;font-size:.92rem}'
        . 'th{color:#666;font-weight:600}.num{text-align:right;font-variant-numeric:tabular-nums}'
        . '.note{color:#666;font-size:.85rem}.switcher a{margin-right:12px}</style></head><body>'
        . '<h1>Besucherzähler · ' . $siteH . '</h1>'
        . '<p class="switcher">Ansicht: <a href="' . $self . '?view=1&amp;site=' . $siteH . '&amp;key=' . $keyQ . '"><strong>' . $siteH . '</strong></a>'
        . '<a href="' . $self . '?view=1&amp;site=' . counterH($other) . '&amp;key=' . $keyQ . '">' . counterH($other) . '</a></p>'
        . '<p><strong>Aufrufe gesamt:</strong> ' . $total . '</p>'
        . '<p class="note">Cookielos. Keine IP-Adressen gespeichert – das Land wird aus der Browser-Zeitzone abgeleitet; '
        . 'zur Drosselung wird nur ein gesalzener Hash der IP max. ' . COUNTER_THROTTLE_MEMORY . ' s vorgehalten. '
        . 'Referrer nur als Host (ohne Pfad/Query). Einträge älter als ' . COUNTER_RETENTION_DAYS . ' Tage werden automatisch gelöscht. '
        . 'Daten liegen in <code>counter-data/hits-' . $siteH . '.php</code> (per .htaccess geschützt, als .php mit exit-Kopf auch ohne Apache sicher).</p>'
        . '<h2>Pro Tag (letzte 31 Tage)</h2><table><tr><th>Tag</th><th class="num">Aufrufe</th></tr>';
    $days = array_slice($byDate, 0, 31, true);
    if (!$days) {
        echo '<tr><td colspan="2" class="note">noch keine Daten</td></tr>';
    }
    foreach ($days as $d => $c) {
        echo '<tr><td>' . counterH($d) . '</td><td class="num">' . $c . '</td></tr>';
    }
    echo '</table><h2>Herkunft (Land)</h2><table><tr><th>Land</th><th>Code</th><th class="num">Aufrufe</th></tr>';
    foreach ($byCc as $cc => $c) {
        echo '<tr><td>' . counterFlag($cc) . '</td><td>' . counterH($cc) . '</td><td class="num">' . $c . '</td></tr>';
    }
    if (!$byCc) {
        echo '<tr><td colspan="3" class="note">noch keine Daten</td></tr>';
    }
    echo '</table><h2>Browsersprache</h2><table><tr><th>Sprache</th><th class="num">Aufrufe</th></tr>';
    foreach ($byLang as $l => $c) {
        echo '<tr><td>' . counterH($l === '' ? '(unbekannt)' : $l) . '</td><td class="num">' . $c . '</td></tr>';
    }
    if (!$byLang) {
        echo '<tr><td colspan="2" class="note">noch keine Daten</td></tr>';
    }
    echo '</table><h2>Referrer (nur Host)</h2><table><tr><th>Host</th><th class="num">Aufrufe</th></tr>';
    foreach ($byRef as $h => $c) {
        echo '<tr><td>' . counterH($h) . '</td><td class="num">' . $c . '</td></tr>';
    }
    if (!$byRef) {
        echo '<tr><td colspan="2" class="note">noch keine Daten (Direktaufrufe ohne Referrer werden nicht gelistet)</td></tr>';
    }
    echo '</table></body></html>';
}

if (PHP_SAPI !== 'cli') {
    if (isset($_GET['view'])) {
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
