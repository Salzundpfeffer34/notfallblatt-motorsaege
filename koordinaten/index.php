<?php
declare(strict_types=1);

const MERC_R = 6378137.0;
const MERC_MAX = 20037508.342789244;

function utmZoneFromLon(float $lon): int
{
    $z = (int) floor(($lon + 180.0) / 6.0) + 1;
    if ($z < 1) { $z = 1; }
    if ($z > 60) { $z = 60; }
    return $z;
}

function latBand(float $lat): string
{
    $bands = 'CDEFGHJKLMNPQRSTUVWX';
    $i = (int) floor(($lat + 80.0) / 8.0);
    if ($i < 0) { $i = 0; }
    if ($i > 19) { $i = 19; }
    return $bands[$i];
}

function latlonToUtm(float $lat, float $lon): array
{
    $a = 6378137.0;
    $f = 1.0 / 298.257223563;
    $e2 = $f * (2.0 - $f);
    $ep2 = $e2 / (1.0 - $e2);
    $k0 = 0.9996;
    $zone = utmZoneFromLon($lon);
    $lon0 = deg2rad($zone * 6.0 - 183.0);
    $phi = deg2rad($lat);
    $lam = deg2rad($lon);
    $sp = sin($phi);
    $cp = cos($phi);
    $tp = tan($phi);
    $N = $a / sqrt(1.0 - $e2 * $sp * $sp);
    $T = $tp * $tp;
    $C = $ep2 * $cp * $cp;
    $A = $cp * ($lam - $lon0);
    $e4 = $e2 * $e2;
    $e6 = $e4 * $e2;
    $M = $a * ((1.0 - $e2 / 4.0 - 3.0 * $e4 / 64.0 - 5.0 * $e6 / 256.0) * $phi
        - (3.0 * $e2 / 8.0 + 3.0 * $e4 / 32.0 + 45.0 * $e6 / 1024.0) * sin(2.0 * $phi)
        + (15.0 * $e4 / 256.0 + 45.0 * $e6 / 1024.0) * sin(4.0 * $phi)
        - (35.0 * $e6 / 3072.0) * sin(6.0 * $phi));
    $east = 500000.0 + $k0 * $N * ($A
        + (1.0 - $T + $C) * pow($A, 3) / 6.0
        + (5.0 - 18.0 * $T + $T * $T + 72.0 * $C - 58.0 * $ep2) * pow($A, 5) / 120.0);
    $north = $k0 * ($M + $N * $tp * ($A * $A / 2.0
        + (5.0 - $T + 9.0 * $C + 4.0 * $C * $C) * pow($A, 4) / 24.0
        + (61.0 - 58.0 * $T + $T * $T + 600.0 * $C - 330.0 * $ep2) * pow($A, 6) / 720.0));
    if ($lat < 0.0) {
        $north += 10000000.0;
    }
    return array('zone' => $zone, 'east' => $east, 'north' => $north);
}

function utmToLatLon(float $zone, float $east, float $north, bool $south = false): array
{
    $a = 6378137.0;
    $f = 1.0 / 298.257223563;
    $e2 = $f * (2.0 - $f);
    $ep2 = $e2 / (1.0 - $e2);
    $k0 = 0.9996;
    $x = $east - 500000.0;
    $y = $south ? $north - 10000000.0 : $north;
    $e4 = $e2 * $e2;
    $e6 = $e4 * $e2;
    $M = $y / $k0;
    $mu = $M / ($a * (1.0 - $e2 / 4.0 - 3.0 * $e4 / 64.0 - 5.0 * $e6 / 256.0));
    $e1 = (1.0 - sqrt(1.0 - $e2)) / (1.0 + sqrt(1.0 - $e2));
    $phi1 = $mu
        + (3.0 * $e1 / 2.0 - 27.0 * pow($e1, 3) / 32.0) * sin(2.0 * $mu)
        + (21.0 * pow($e1, 2) / 16.0 - 55.0 * pow($e1, 4) / 32.0) * sin(4.0 * $mu)
        + (151.0 * pow($e1, 3) / 96.0) * sin(6.0 * $mu)
        + (1097.0 * pow($e1, 4) / 512.0) * sin(8.0 * $mu);
    $s1 = sin($phi1);
    $c1 = cos($phi1);
    $t1 = tan($phi1);
    $C1 = $ep2 * $c1 * $c1;
    $T1 = $t1 * $t1;
    $N1 = $a / sqrt(1.0 - $e2 * $s1 * $s1);
    $R1 = $a * (1.0 - $e2) / pow(1.0 - $e2 * $s1 * $s1, 1.5);
    $D = $x / ($N1 * $k0);
    $lat = $phi1 - ($N1 * $t1 / $R1) * ($D * $D / 2.0
        - (5.0 + 3.0 * $T1 + 10.0 * $C1 - 4.0 * $C1 * $C1 - 9.0 * $ep2) * pow($D, 4) / 24.0
        + (61.0 + 90.0 * $T1 + 298.0 * $C1 + 45.0 * $T1 * $T1 - 252.0 * $ep2 - 3.0 * $C1 * $C1) * pow($D, 6) / 720.0);
    $lon = ($D
        - (1.0 + 2.0 * $T1 + $C1) * pow($D, 3) / 6.0
        + (5.0 - 2.0 * $C1 + 28.0 * $T1 - 3.0 * $C1 * $C1 + 8.0 * $ep2 + 24.0 * $T1 * $T1) * pow($D, 5) / 120.0) / $c1;
    $lon0 = $zone * 6.0 - 183.0;
    return array('lat' => rad2deg($lat), 'lon' => $lon0 + rad2deg($lon));
}

function latlonToLv03(float $lat, float $lon): array
{
    $phi = ($lat * 3600.0 - 169028.66) / 10000.0;
    $lam = ($lon * 3600.0 - 26782.5) / 10000.0;
    $east = 600072.37
        + 211455.93 * $lam
        - 10938.51 * $lam * $phi
        - 0.36 * $lam * $phi * $phi
        - 44.54 * pow($lam, 3);
    $north = 200147.07
        + 308807.95 * $phi
        + 3745.25 * $lam * $lam
        + 76.63 * $phi * $phi
        - 194.56 * $lam * $lam * $phi
        + 119.79 * pow($phi, 3);
    return array('east' => $east, 'north' => $north);
}

function lv03ToLatLon(float $east, float $north): array
{
    $lat = 46.95;
    $lon = 7.44;
    $h = 0.00001;
    for ($i = 0; $i < 20; $i++) {
        $p0 = latlonToLv03($lat, $lon);
        $dE = $p0['east'] - $east;
        $dN = $p0['north'] - $north;
        if (abs($dE) < 0.0000001 && abs($dN) < 0.0000001) {
            break;
        }
        $px = latlonToLv03($lat + $h, $lon);
        $py = latlonToLv03($lat, $lon + $h);
        $j11 = ($px['east'] - $p0['east']) / $h;
        $j21 = ($px['north'] - $p0['north']) / $h;
        $j12 = ($py['east'] - $p0['east']) / $h;
        $j22 = ($py['north'] - $p0['north']) / $h;
        $det = $j11 * $j22 - $j12 * $j21;
        if (abs($det) < 1e-12) {
            break;
        }
        $lat = $lat - ($j22 * $dE - $j12 * $dN) / $det;
        $lon = $lon - ($j11 * $dN - $j21 * $dE) / $det;
    }
    return array('lat' => $lat, 'lon' => $lon);
}

function latlonToLv95(float $lat, float $lon): array
{
    $p = latlonToLv03($lat, $lon);
    return array('east' => $p['east'] + 2000000.0, 'north' => $p['north'] + 1000000.0);
}

function lv95ToLatLon(float $east, float $north): array
{
    return lv03ToLatLon($east - 2000000.0, $north - 1000000.0);
}

function latlonToMercator(float $lat, float $lon): array
{
    return array(
        'x' => MERC_R * deg2rad($lon),
        'y' => MERC_R * log(tan(M_PI / 4.0 + deg2rad($lat) / 2.0)),
    );
}

function mercatorToLatLon(float $x, float $y): array
{
    return array(
        'lat' => rad2deg(2.0 * atan(exp($y / MERC_R)) - M_PI / 2.0),
        'lon' => rad2deg($x / MERC_R),
    );
}

function latlonToMgrs(float $lat, float $lon): string
{
    $u = latlonToUtm($lat, $lon);
    $zone = $u['zone'];
    $e = (int) floor($u['east']);
    $n = (int) floor($u['north']);
    $colSets = array('ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ');
    $rows = 'ABCDEFGHJKLMNPQRSTUV';
    $col = intdiv($e, 100000) - 1;
    if ($col < 0 || $col > 7) {
        throw new RuntimeException('Koordinate liegt ausserhalb des MGRS-Bereichs dieser Zone.');
    }
    $row = intdiv($n, 100000) % 20;
    if ($zone % 2 == 0) {
        $row = ($row + 5) % 20;
    }
    $bi = (int) floor(($lat + 80.0) / 8.0);
    if ($bi < 0) { $bi = 0; }
    if ($bi > 19) { $bi = 19; }
    return sprintf('%02d%s%s%s%05d%05d',
        $zone,
        latBand($lat),
        $colSets[($zone - 1) % 3][$col],
        $rows[$row],
        $e % 100000,
        $n % 100000
    );
}

function mgrsToLatLon(string $mgrs): ?array
{
    $ok = preg_match('/^\s*(\d{1,2})\s*([C-HJ-NP-X])\s*([A-HJ-NP-Z])\s*([A-HJ-NP-Z])\s*(\d+)\s*$/i', $mgrs, $m);
    if (!$ok) {
        return null;
    }
    $zone = (int) $m[1];
    $band = strtoupper($m[2]);
    $colLetter = strtoupper($m[3]);
    $rowLetter = strtoupper($m[4]);
    $digits = $m[5];
    if ($zone < 1 || $zone > 60 || strlen($digits) % 2 !== 0) {
        return null;
    }
    $half = intdiv(strlen($digits), 2);
    $easting = (float) substr($digits, 0, $half) * pow(10.0, 5 - $half);
    $northing = (float) substr($digits, $half) * pow(10.0, 5 - $half);
    $colSets = array('ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ');
    $rows = 'ABCDEFGHJKLMNPQRSTUV';
    $ci = strpos($colSets[($zone - 1) % 3], $colLetter);
    $ri = strpos($rows, $rowLetter);
    if ($ci === false || $ri === false) {
        return null;
    }
    $east = ($ci + 1) * 100000.0 + $easting;
    $row = $ri;
    if ($zone % 2 == 0) {
        $row = ($ri + 15) % 20;
    }
    $north = $row * 100000.0 + $northing;
    $bandMin = array(
        'C' => 1100000, 'D' => 2000000, 'E' => 2800000, 'F' => 3700000,
        'G' => 4600000, 'H' => 5500000, 'J' => 6400000, 'K' => 7300000,
        'L' => 8200000, 'M' => 9100000, 'N' => 0, 'P' => 800000,
        'Q' => 1700000, 'R' => 2600000, 'S' => 3500000, 'T' => 4400000,
        'U' => 5300000, 'V' => 6000000, 'W' => 6600000, 'X' => 7000000,
    );
    $minN = isset($bandMin[$band]) ? $bandMin[$band] : 0;
    while ($north < $minN) {
        $north += 2000000.0;
    }
    $south = strpos('CDEFGHJKLM', $band) !== false;
    return utmToLatLon((float) $zone, $east, $north, $south);
}

function formatDmsPart(float $v, bool $isLat): string
{
    $h = $isLat ? ($v >= 0 ? 'N' : 'S') : ($v >= 0 ? 'E' : 'W');
    $v = abs($v);
    $d = (int) floor($v);
    $mF = ($v - $d) * 60.0;
    $m = (int) floor($mF);
    $s = ($mF - $m) * 60.0;
    if ($s >= 59.95) {
        $s = 0.0;
        $m++;
        if ($m >= 60) {
            $m = 0;
            $d++;
        }
    }
    return sprintf('%d° %02d′ %04.1f″ %s', $d, $m, $s, $h);
}

function formatDms(float $lat, float $lon): string
{
    return formatDmsPart($lat, true) . ', ' . formatDmsPart($lon, false);
}

function normalizeLon(float $lon): float
{
    return $lon - 360.0 * floor(($lon + 180.0) / 360.0);
}

function checkLatLon(float $lat, float $lon): void
{
    if (abs($lat) > 90.0) {
        throw new RuntimeException('Breite ausserhalb des gültigen Bereichs (-90 bis +90).');
    }
    if (abs($lon) > 180.0000001) {
        throw new RuntimeException('Länge ausserhalb des gültigen Bereichs (-180 bis +180).');
    }
}

function extractNumbers(string $s): array
{
    if (!preg_match_all('/-?\d+(?:[.,]\d+)?/', $s, $m)) {
        return array();
    }
    $out = array();
    foreach ($m[0] as $v) {
        $out[] = (float) str_replace(',', '.', $v);
    }
    return $out;
}

function orderLatLon(float $a, float $b): array
{
    if (abs($a) > 90.0 && abs($b) <= 90.0) {
        return array('lat' => $b, 'lon' => $a);
    }
    return array('lat' => $a, 'lon' => $b);
}

function parseDmsString(string $s): ?array
{
    if (strpos($s, '°') === false) {
        return null;
    }
    $regexes = array(
        '/([NSEW])?\s*(-?\d+(?:[.,]\d+)?)\s*°\s*(?:(\d+(?:[.,]\d+)?)\s*[\'′‘’´m](?![\'′‘’´m])\s*)?(?:(\d+(?:[.,]\d+)?)\s*(?:"|\'\'|″|‘‘|’’|”|´´))?\s*([NSEW])?/i',
        '/([NSEW])?\s*(-?\d+(?:[.,]\d+)?)\s*°\s*(?:(\d+(?:[.,]\d+)?)\s*(?:\'\'|′′|″|[\'′‘’´m](?![\'′‘’´m]))\s*)?(?:(\d+(?:[.,]\d+)?)\s*(?:"|\'\'|″|‘‘|’’|”|´´))?\s*([NSEW])?/i'
    );
    $result = null;
    foreach ($regexes as $re) {
        if (!preg_match_all($re, $s, $ms, PREG_SET_ORDER)) {
            continue;
        }
        $consumed = 0;
        foreach ($ms as $g) {
            $consumed += 1;
            if (isset($g[3]) && $g[3] !== '') { $consumed++; }
            if (isset($g[4]) && $g[4] !== '') { $consumed++; }
        }
        if ($consumed !== count(extractNumbers($s))) {
            continue;
        }
        $vals = array();
        $hems = array();
        foreach ($ms as $g) {
            $deg = (float) str_replace(',', '.', $g[2]);
            $min = (isset($g[3]) && $g[3] !== '') ? (float) str_replace(',', '.', $g[3]) : 0.0;
            $sec = (isset($g[4]) && $g[4] !== '') ? (float) str_replace(',', '.', $g[4]) : 0.0;
            $val = abs($deg) + $min / 60.0 + $sec / 3600.0;
            $h = strtoupper(($g[1] !== '' && $g[1] !== null) ? $g[1] : (($g[5] !== '' && $g[5] !== null) ? $g[5] : ''));
            if ($h === 'S' || $h === 'W') {
                $val = -$val;
            } elseif ($h === '' && $deg < 0.0) {
                $val = -$val;
            }
            $vals[] = $val;
            $hems[] = $h;
        }
        if (count($vals) < 2) {
            continue;
        }
        $a = $vals[0];
        $b = $vals[1];
        $ha = $hems[0];
        $hb = $hems[1];
        if (($ha === 'E' || $ha === 'W') && ($hb === 'N' || $hb === 'S')) {
            $result = array('lat' => $b, 'lon' => $a);
        } else {
            $result = orderLatLon($a, $b);
        }
        break;
    }
    return $result;
}

function parseDmmString(string $s): ?array
{
    $forms = array(
        '/([NSEW])\s*(\d{1,3})\s+(\d{1,2}(?:[.,]\d+))\s*[\'′‘’´m]?/i',
        '/(\d{1,3})\s+(\d{1,2}(?:[.,]\d+))\s*[\'′‘’´m]?\s*([NSEW])/i'
    );
    $hemIdx = array(1, 3);
    $degIdx = array(2, 1);
    $minIdx = array(3, 2);
    foreach ($forms as $f => $re) {
        if (!preg_match_all($re, $s, $ms, PREG_SET_ORDER)) {
            continue;
        }
        if (count($ms) !== 2) {
            continue;
        }
        if (count($ms) * 2 !== count(extractNumbers($s))) {
            continue;
        }
        $vals = array();
        $hems = array();
        $ok = true;
        foreach ($ms as $g) {
            $deg = (float) $g[$degIdx[$f]];
            $min = (float) str_replace(',', '.', $g[$minIdx[$f]]);
            $h = strtoupper($g[$hemIdx[$f]] ?? '');
            if ($h === '' || $min >= 60.0) {
                $ok = false;
                break;
            }
            $val = $deg + $min / 60.0;
            if ($h === 'S' || $h === 'W') {
                $val = -abs($val);
            }
            $vals[] = $val;
            $hems[] = $h;
        }
        if (!$ok) {
            continue;
        }
        $a = $vals[0];
        $b = $vals[1];
        $ha = $hems[0];
        $hb = $hems[1];
        if (($ha === 'E' || $ha === 'W') && ($hb === 'N' || $hb === 'S')) {
            $ll = array('lat' => $b, 'lon' => $a);
        } else {
            $ll = orderLatLon($a, $b);
        }
        if (abs($ll['lat']) > 90.0 || abs($ll['lon']) > 180.0) {
            continue;
        }
        return $ll;
    }
    return null;
}

function classifyPair(float $a, float $b): ?array
{
    $inLv95 = ($a >= 2300000.0 && $a <= 3000000.0 && $b >= 1000000.0 && $b <= 1400000.0);
    $inLv03 = ($a >= 300000.0 && $a <= 1000000.0 && $b >= 0.0 && $b <= 400000.0);
    $inWgs = (abs($a) <= 90.0 && abs($b) <= 180.0);
    if ($inWgs && !$inLv03) {
        return array('type' => 'wgs84', 'a' => $a, 'b' => $b, 'note' => '');
    }
    if ($inLv95) {
        return array('type' => 'lv95', 'a' => $a, 'b' => $b, 'note' => '');
    }
    if ($inLv03) {
        return array('type' => 'lv03', 'a' => $a, 'b' => $b, 'note' => '');
    }
    if ((abs($a) > 1000000.0 || abs($b) > 10000000.0)
        && abs($a) <= MERC_MAX && abs($b) <= MERC_MAX) {
        return array('type' => 'mercator', 'a' => $a, 'b' => $b, 'note' => '');
    }
    if ($a >= 100000.0 && $a < 1000000.0 && $b >= 0.0 && $b <= 10000000.0) {
        return array('type' => 'utm', 'a' => $a, 'b' => $b,
            'note' => 'Keine UTM-Zone angegeben – es wurde Zone 32 angenommen. Gib die Zone am besten mit an, z. B. «30U 699316 5710164».');
    }
    if (abs($a) <= MERC_MAX && abs($b) <= MERC_MAX) {
        return array('type' => 'mercator', 'a' => $a, 'b' => $b, 'note' => '');
    }
    return null;
}

function pairToLatLon(array $c): array
{
    $a = $c['a'];
    $b = $c['b'];
    switch ($c['type']) {
        case 'wgs84':
            $ll = orderLatLon($a, $b);
            return array('lat' => $ll['lat'], 'lon' => normalizeLon($ll['lon']), 'note' => $c['note']);
        case 'lv95':
            $ll = lv95ToLatLon($a, $b);
            return array('lat' => $ll['lat'], 'lon' => $ll['lon'], 'note' => $c['note']);
        case 'lv03':
            $ll = lv03ToLatLon($a, $b);
            return array('lat' => $ll['lat'], 'lon' => $ll['lon'], 'note' => $c['note']);
        case 'mercator':
            $ll = mercatorToLatLon($a, $b);
            return array('lat' => $ll['lat'], 'lon' => normalizeLon($ll['lon']), 'note' => $c['note']);
        case 'utm':
            $ll = utmToLatLon(32.0, $a, $b, $b < 0.0);
            return array('lat' => $ll['lat'], 'lon' => $ll['lon'], 'note' => $c['note']);
    }
    throw new RuntimeException('Unbekanntes Format.');
}

function parseInput(string $raw, string $mode, bool $swap): array
{
    $raw = preg_replace('/[\x09\x0A\x0D\x0B\x0C]/', ' ', $raw);
    $raw = preg_replace('/[\x00-\x08\x0E-\x1F]/', '', $raw);
    $uni = preg_replace('/[\x{007F}-\x{009F}\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2060}-\x{206F}\x{FEFF}\x{E0000}-\x{E007F}]/u', '', $raw);
    if (is_string($uni)) { $raw = $uni; }
    $raw = trim($raw);
    if ($raw === '') {
        throw new RuntimeException('Bitte Koordinaten eingeben.');
    }

    $compact = preg_replace('/\s+/', '', $raw);

    if ($mode === 'auto' && preg_match('/^\d{1,2}[C-HJ-NP-X][A-HJ-NP-Z][A-HJ-NP-Z]\d+$/i', $compact)) {
        $mode = 'mgrs';
    }
    if ($mode === 'auto' && strpos($raw, '°') !== false) {
        $mode = 'dms';
    }
    if (in_array($mode, array('wgs84', 'lv95', 'lv03', 'mercator'), true) && strpos($raw, '°') !== false) {
        $mode = 'dms';
    }

    preg_match_all('/[A-Za-z]/', $raw, $letterMatches);
    $letters = array_map('strtoupper', $letterMatches[0]);
    $letterCount = count($letters);

    if ($mode === 'mgrs') {
        if ($letterCount > 3) {
            throw new RuntimeException('Bei MGRS sind höchstens 3 Buchstaben erlaubt (z. B. 54SUE…).');
        }
    } elseif ($mode === 'dms') {
        if ($letterCount > 2 || array_diff($letters, array('N', 'S', 'E', 'W'))) {
            throw new RuntimeException('Bei Grad/Minuten/Sekunden sind höchstens zwei Buchstaben erlaubt: N, S, E oder W.');
        }
    } elseif ($mode === 'utm') {
        if ($letterCount > 2) {
            throw new RuntimeException('Bei UTM sind höchstens zwei Buchstaben erlaubt (z. B. «32T» oder «E … N …»).');
        }
    } elseif ($mode === 'wgs84' || $mode === 'lv95' || $mode === 'lv03' || $mode === 'mercator') {
        if ($letterCount > 0) {
            throw new RuntimeException('Bitte nur Zahlen eingeben – Buchstaben sind hier nicht erlaubt.');
        }
    } elseif ($letterCount > 3) {
        throw new RuntimeException('Bitte nur Zahlen eingeben – Buchstaben nur bei UTM/MGRS oder als Himmelsrichtung (N/S/E/W).');
    }

    if ($mode === 'mgrs') {
        $ll = mgrsToLatLon($compact);
        if ($ll === null) {
            throw new RuntimeException('Format unbekannt: MGRS nicht erkannt. Beispiel: 54SUE8843349290 oder 54SUE 88433 49290.');
        }
        return array('lat' => $ll['lat'], 'lon' => $ll['lon'], 'note' => 'MGRS erkannt.');
    }

    if ($mode === 'dms') {
        $ll = parseDmsString($raw);
        if ($ll === null) {
            $ll = parseDmmString($raw);
        }
        if ($ll === null) {
            throw new RuntimeException('Format unbekannt: Grad/Minuten/Sekunden nicht erkannt. Beispiel: 41° 54\' 10.1" N, 12° 29\' 47" E oder N40 42.767 W74 00.367');
        }
        if ($swap) {
            $t = $ll['lat'];
            $ll['lat'] = $ll['lon'];
            $ll['lon'] = $t;
        }
        $ll['lon'] = normalizeLon($ll['lon']);
        $ll['note'] = 'WGS84 in Grad/Minuten/Sekunden erkannt.';
        return $ll;
    }

    $clean = str_replace(array('\'', '’'), '', $raw);
    $nums = extractNumbers($clean);

    if ($mode === 'wgs84') {
        if (count($nums) < 2) {
            throw new RuntimeException('Bitte zwei Werte angeben (Breite, Länge).');
        }
        $ll = orderLatLon($nums[0], $nums[1]);
        if ($swap) {
            $t = $ll['lat'];
            $ll['lat'] = $ll['lon'];
            $ll['lon'] = $t;
        }
        checkLatLon($ll['lat'], $ll['lon']);
        $ll['lon'] = normalizeLon($ll['lon']);
        $ll['note'] = '';
        return $ll;
    }

    if ($mode === 'lv95') {
        if (count($nums) < 2) {
            throw new RuntimeException('Bitte Ost und Nord angeben, z. B. 2\'624\'043, 1\'096\'620');
        }
        $ll = lv95ToLatLon($nums[0], $nums[1]);
        $ll['note'] = '';
        return $ll;
    }

    if ($mode === 'lv03') {
        if (count($nums) < 2) {
            throw new RuntimeException('Bitte Ost (x) und Nord (y) angeben, z. B. 683303, 247925');
        }
        $ll = lv03ToLatLon($nums[0], $nums[1]);
        $ll['note'] = '';
        return $ll;
    }

    if ($mode === 'mercator') {
        if (count($nums) < 2) {
            throw new RuntimeException('Bitte X und Y in Metern angeben (EPSG:3857).');
        }
        $ll = mercatorToLatLon($nums[0], $nums[1]);
        checkLatLon($ll['lat'], $ll['lon']);
        $ll['lon'] = normalizeLon($ll['lon']);
        $ll['note'] = '';
        return $ll;
    }

    if ($mode === 'utm') {
        $count = count($nums);
        if ($count < 2) {
            throw new RuntimeException('Bitte Zone (optional), Ost und Nord angeben, z. B. 30U 699316 5710164');
        }
        $zone = 32.0;
        $idx = 0;
        $band = '';
        if ($count >= 3 && $nums[0] >= 1.0 && $nums[0] <= 60.0 && $nums[0] == floor($nums[0])) {
            $zone = $nums[0];
            $idx = 1;
        }
        if (preg_match('/^\s*(\d{1,2})\s*([C-HJ-NP-X])\b/i', $raw, $zm)) {
            $zone = (float) $zm[1];
            $band = strtoupper($zm[2]);
        }
        $east = $nums[$idx];
        $north = $nums[$idx + 1];
        $south = ($band !== '' && strpos('CDEFGHJKLM', $band) !== false) || $north < 0.0;
        if ($north < 0.0 && $north > -10000000.0) {
            $north = abs($north);
        }
        $ll = utmToLatLon($zone, $east, $north, $south);
        $note = '';
        if ($band === '' && $count === 2) {
            $note = 'Keine Zone angegeben – Zone 32 angenommen. Beispiel mit Zone: «30U 699316 5710164».';
        }
        return array('lat' => $ll['lat'], 'lon' => $ll['lon'], 'note' => $note);
    }

    if ($mode === 'auto') {
        $ll = parseDmmString($raw);
        if ($ll !== null) {
            $ll['lon'] = normalizeLon($ll['lon']);
            $ll['note'] = 'Grad + Dezimalminuten erkannt (z. B. N40 42.767 W74 00.367).';
            return $ll;
        }
    }

    $count = count($nums);
    if ($count >= 3 && $nums[0] >= 1.0 && $nums[0] <= 60.0 && $nums[0] == floor($nums[0])
        && $nums[1] >= 100000.0 && $nums[1] < 1000000.0 && $nums[2] >= 0.0 && $nums[2] <= 10000000.0) {
        $zone = $nums[0];
        $band = '';
        if (preg_match('/^\s*(\d{1,2})\s*([C-HJ-NP-X])\b/i', $raw, $zm)) {
            $zone = (float) $zm[1];
            $band = strtoupper($zm[2]);
        }
        $east = $nums[1];
        $north = $nums[2];
        $south = ($band !== '' && strpos('CDEFGHJKLM', $band) !== false) || $north < 0.0;
        if ($north < 0.0 && $north > -10000000.0) {
            $north = abs($north);
        }
        $ll = utmToLatLon($zone, $east, $north, $south);
        return array('lat' => $ll['lat'], 'lon' => $ll['lon'], 'note' => 'UTM mit Zone ' . (int) $zone . ' erkannt.');
    }

    if ($count === 2) {
        $c = classifyPair($nums[0], $nums[1]);
        if ($c !== null) {
            if ($swap && $c['type'] === 'wgs84') {
                $t = $c['a'];
                $c['a'] = $c['b'];
                $c['b'] = $t;
            }
            $ll = pairToLatLon($c);
            checkLatLon($ll['lat'], $ll['lon']);
            return $ll;
        }
    }

    throw new RuntimeException('Format unbekannt. Beispiele: «48.8566, 2.3522» · «41° 54\' 10.1" N, 12° 29\' 47" E» · «2624043, 1096620» (LV95) · «30U 699316 5710164» (UTM) · «54SUE8843349290» (MGRS)');
}

function formatNum(float $v, int $dec): string
{
    return number_format($v, $dec, '.', '');
}

function buildResults(float $lat, float $lon, bool $forceLv95 = false): array
{
    $lv95 = latlonToLv95($lat, $lon);
    $utm = latlonToUtm($lat, $lon);
    $merc = latlonToMercator($lat, $lon);
    $mgrs = latlonToMgrs($lat, $lon);

    $rows = array(
        array('WGS84 · Dezimalgrad (Breite, Länge)', formatNum($lat, 6) . ', ' . formatNum($lon, 6)),
        array('WGS84 · Grad, Minuten, Sekunden', formatDms($lat, $lon)),
        array('WGS84 · Dezimalgrad (Länge, Breite) — GeoJSON/Leaflet', formatNum($lon, 6) . ', ' . formatNum($lat, 6)),
        array('NAD83 (Nordamerika) · geografisch (B, L)', formatNum($lat, 6) . ', ' . formatNum($lon, 6)),
    );
    if ($forceLv95 || ($lv95['east'] >= 2400000 && $lv95['east'] <= 2900000 && $lv95['north'] >= 1000000 && $lv95['north'] <= 1350000)) {
        $rows[] = array('Schweiz · LV95 / CH1903+ (Ost, Nord)', formatNum($lv95['east'], 1) . ', ' . formatNum($lv95['north'], 1));
    }
    $rows[] = array('UTM (Zone, Ost, Nord)', sprintf('%d%s %s %s', $utm['zone'], latBand($lat), formatNum($utm['east'], 2), formatNum($utm['north'], 2)));
    $rows[] = array('MGRS / USNG (1 m)', $mgrs);
    $rows[] = array('Web Mercator · EPSG:3857 (Google Maps) (X, Y)', formatNum($merc['x'], 2) . ', ' . formatNum($merc['y'], 2));
    return $rows;
}

function renderPage(): void
{
    $q = isset($_GET['q']) ? (string) $_GET['q'] : '';
    $f = isset($_GET['f']) ? (string) $_GET['f'] : 'auto';
    $swap = !empty($_GET['swap']);
    $lv95force = !empty($_GET['lv95force']);
    $allowed = array('auto', 'wgs84', 'dms', 'lv95', 'lv03', 'utm', 'mgrs', 'mercator');
    if (!in_array($f, $allowed, true)) {
        $f = 'auto';
    }

    $error = null;
    $note = '';
    $results = null;
    $lat = 0.0;
    $lon = 0.0;

    if ($q !== '') {
        try {
            $ll = parseInput($q, $f, $swap);
            $lat = $ll['lat'];
            $lon = $ll['lon'];
            $note = isset($ll['note']) ? $ll['note'] : '';
            $results = buildResults($lat, $lon, $lv95force);
        } catch (RuntimeException $e) {
            $error = $e->getMessage();
        } catch (Exception $e) {
            $error = 'Unerwarteter Fehler: ' . $e->getMessage();
        } catch (Throwable $e) {
            $error = 'Unerwarteter Fehler: ' . $e->getMessage();
        }
    }

    $qHtml = htmlspecialchars($q, ENT_QUOTES, 'UTF-8');
    $latUrl = formatNum($lat, 6);
    $lonUrl = formatNum($lon, 6);
    $lv95Link = latlonToLv95($lat, $lon);
    $geoE = formatNum($lv95Link['east'], 0);
    $geoN = formatNum($lv95Link['north'], 0);
    $bbox = formatNum($lon - 0.004, 5) . ',' . formatNum($lat - 0.002, 5) . ',' . formatNum($lon + 0.004, 5) . ',' . formatNum($lat + 0.002, 5);
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Koordinaten-Konverter · WGS84, DMS, LV95, NAD83, UTM, MGRS, Mercator</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20200%20200'%3E%3Ccircle%20cx='100'%20cy='100'%20r='93'%20fill='none'%20stroke='%234c504c'%20stroke-width='6'/%3E%3Ccircle%20cx='100'%20cy='100'%20r='72'%20fill='none'%20stroke='%236e726e'%20stroke-width='3'/%3E%3Cg%20fill='%234c504c'%3E%3Cpath%20d='M100%2012%20L107%20102%20L100%20114%20Z'/%3E%3Cpath%20d='M100%2012%20L93%20102%20L100%20114%20Z'%20fill='%23b7bab7'/%3E%3Cpath%20d='M100%2012%20L107%20102%20L100%20114%20Z'%20transform='rotate(90%20100%20100)'/%3E%3Cpath%20d='M100%2012%20L93%20102%20L100%20114%20Z'%20transform='rotate(90%20100%20100)'%20fill='%23b7bab7'/%3E%3Cpath%20d='M100%2012%20L107%20102%20L100%20114%20Z'%20transform='rotate(180%20100%20100)'/%3E%3Cpath%20d='M100%2012%20L93%20102%20L100%20114%20Z'%20transform='rotate(180%20100%20100)'%20fill='%23b7bab7'/%3E%3Cpath%20d='M100%2012%20L107%20102%20L100%20114%20Z'%20transform='rotate(270%20100%20100)'/%3E%3Cpath%20d='M100%2012%20L93%20102%20L100%20114%20Z'%20transform='rotate(270%20100%20100)'%20fill='%23b7bab7'/%3E%3C/g%3E%3Cg%20fill='%236e726e'%3E%3Cpath%20d='M100%2038%20L106%20102%20L100%20114%20Z'/%3E%3Cpath%20d='M100%2038%20L94%20102%20L100%20114%20Z'%20fill='%23d4d6d4'/%3E%3Cpath%20d='M100%2038%20L106%20102%20L100%20114%20Z'%20transform='rotate(45%20100%20100)'/%3E%3Cpath%20d='M100%2038%20L94%20102%20L100%20114%20Z'%20transform='rotate(45%20100%20100)'%20fill='%23d4d6d4'/%3E%3Cpath%20d='M100%2038%20L106%20102%20L100%20114%20Z'%20transform='rotate(135%20100%20100)'/%3E%3Cpath%20d='M100%2038%20L94%20102%20L100%20114%20Z'%20transform='rotate(135%20100%20100)'%20fill='%23d4d6d4'/%3E%3Cpath%20d='M100%2038%20L106%20102%20L100%20114%20Z'%20transform='rotate(225%20100%20100)'/%3E%3Cpath%20d='M100%2038%20L94%20102%20L100%20114%20Z'%20transform='rotate(225%20100%20100)'%20fill='%23d4d6d4'/%3E%3Cpath%20d='M100%2038%20L106%20102%20L100%20114%20Z'%20transform='rotate(315%20100%20100)'/%3E%3Cpath%20d='M100%2038%20L94%20102%20L100%20114%20Z'%20transform='rotate(315%20100%20100)'%20fill='%23d4d6d4'/%3E%3C/g%3E%3Ccircle%20cx='100'%20cy='100'%20r='7'%20fill='%234c504c'/%3E%3C/svg%3E">
<meta name="description" content="Koordinaten online umrechnen: WGS84 (Dezimalgrad), Grad/Minuten/Sekunden, Schweizer LV95/CH1903+, NAD83, UTM, MGRS und Web Mercator (EPSG:3857 / Google Maps).">
<style>
:root { --bg:#f0f0ee; --card:#ffffff; --ink:#1c1c1c; --muted:#6b6b6b; --line:#d8d8d4; --accent:#d52b1e; --accent2:#a91e14; }
* { box-sizing: border-box; }
body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background:var(--bg); color:var(--ink); line-height:1.5; }
.schrift { display:flex; justify-content:flex-end; gap:6px; margin-bottom:2px; }
.schrift button { font-size:.85rem; padding:4px 12px; border:1px solid var(--line); border-radius:8px; background:#fff; color:var(--ink); cursor:pointer; font-family:inherit; }
.schrift button:hover { border-color:var(--accent); color:var(--accent); }
.wrap { max-width: 880px; margin: 0 auto; padding: 24px 16px 48px; position: relative; z-index: 1; }
header h1 { font-size: 1.6rem; margin: 8px 0 4px; }
header p { color: var(--muted); margin: 0 0 20px; }
.card { position:relative; z-index:0; background: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20200%20200'%3E%3Ccircle%20cx='100'%20cy='100'%20r='93'%20fill='none'%20stroke='%23d6dad6'%20stroke-width='2'/%3E%3Ccircle%20cx='100'%20cy='100'%20r='72'%20fill='none'%20stroke='%23e1e4e1'%20stroke-width='1'/%3E%3Cg%20fill='%23d6dad6'%3E%3Cpath%20d='M100%2012%20L107%20102%20L100%20114%20Z'/%3E%3Cpath%20d='M100%2012%20L93%20102%20L100%20114%20Z'%20fill='%23eaecea'/%3E%3Cpath%20d='M100%2012%20L107%20102%20L100%20114%20Z'%20transform='rotate(90%20100%20100)'/%3E%3Cpath%20d='M100%2012%20L93%20102%20L100%20114%20Z'%20transform='rotate(90%20100%20100)'%20fill='%23eaecea'/%3E%3Cpath%20d='M100%2012%20L107%20102%20L100%20114%20Z'%20transform='rotate(180%20100%20100)'/%3E%3Cpath%20d='M100%2012%20L93%20102%20L100%20114%20Z'%20transform='rotate(180%20100%20100)'%20fill='%23eaecea'/%3E%3Cpath%20d='M100%2012%20L107%20102%20L100%20114%20Z'%20transform='rotate(270%20100%20100)'/%3E%3Cpath%20d='M100%2012%20L93%20102%20L100%20114%20Z'%20transform='rotate(270%20100%20100)'%20fill='%23eaecea'/%3E%3C/g%3E%3Cg%20fill='%23e1e4e1'%3E%3Cpath%20d='M100%2038%20L106%20102%20L100%20114%20Z'/%3E%3Cpath%20d='M100%2038%20L94%20102%20L100%20114%20Z'%20fill='%23f4f5f4'/%3E%3Cpath%20d='M100%2038%20L106%20102%20L100%20114%20Z'%20transform='rotate(45%20100%20100)'/%3E%3Cpath%20d='M100%2038%20L94%20102%20L100%20114%20Z'%20transform='rotate(45%20100%20100)'%20fill='%23f4f5f4'/%3E%3Cpath%20d='M100%2038%20L106%20102%20L100%20114%20Z'%20transform='rotate(135%20100%20100)'/%3E%3Cpath%20d='M100%2038%20L94%20102%20L100%20114%20Z'%20transform='rotate(135%20100%20100)'%20fill='%23f4f5f4'/%3E%3Cpath%20d='M100%2038%20L106%20102%20L100%20114%20Z'%20transform='rotate(225%20100%20100)'/%3E%3Cpath%20d='M100%2038%20L94%20102%20L100%20114%20Z'%20transform='rotate(225%20100%20100)'%20fill='%23f4f5f4'/%3E%3Cpath%20d='M100%2038%20L106%20102%20L100%20114%20Z'%20transform='rotate(315%20100%20100)'/%3E%3Cpath%20d='M100%2038%20L94%20102%20L100%20114%20Z'%20transform='rotate(315%20100%20100)'%20fill='%23f4f5f4'/%3E%3C/g%3E%3Ccircle%20cx='100'%20cy='100'%20r='5'%20fill='%23d6dad6'/%3E%3C/svg%3E") no-repeat center / 230px auto var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 20px 20px 130px; box-shadow: 0 1px 3px rgba(16,24,40,.06); margin-bottom: 20px; }
.card::before, .card::after { content:""; position:absolute; z-index:-2; left:0; right:0; bottom:0; height:110px; pointer-events:none; border-radius:0 0 11px 11px; }
.card::before { background: radial-gradient(closest-side, rgba(255,243,205,.50), rgba(255,243,205,0)) right 30% top 48% / 170px 30px no-repeat, url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20560%2070'%20preserveAspectRatio%3D'none'%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20offset%3D'0'%20stop-color%3D'%238fc3e8'%20stop-opacity%3D'0.55'%2F%3E%3Cstop%20offset%3D'0.45'%20stop-color%3D'%234a7fa5'%20stop-opacity%3D'0.62'%2F%3E%3Cstop%20offset%3D'1'%20stop-color%3D'%232e5a78'%20stop-opacity%3D'0.72'%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cpath%20d%3D'M0%2046%20Q35%2026%2070%2046%20T140%2046%20T210%2046%20T280%2046%20T350%2046%20T420%2046%20T490%2046%20T560%2046%20L560%2070%20L0%2070%20Z'%20fill%3D'url(%23g)'%2F%3E%3Cpath%20d%3D%22M0%2046%20Q35%2026%2070%2046%20T140%2046%20T210%2046%20T280%2046%20T350%2046%20T420%2046%20T490%2046%20T560%2046%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-opacity%3D%220.38%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E") repeat-x left bottom / 560px 110px, url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20420%2070'%20preserveAspectRatio%3D'none'%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20offset%3D'0'%20stop-color%3D'%23a8d0e8'%20stop-opacity%3D'0.45'%2F%3E%3Cstop%20offset%3D'0.5'%20stop-color%3D'%236ba3c9'%20stop-opacity%3D'0.5'%2F%3E%3Cstop%20offset%3D'1'%20stop-color%3D'%233d6f96'%20stop-opacity%3D'0.58'%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cpath%20d%3D'M0%2038%20Q52.5%2014%2070%2038%20T140%2038%20T210%2038%20T280%2038%20T350%2038%20T420%2038%20L420%2070%20L0%2070%20Z'%20fill%3D'url(%23g)'%2F%3E%3Cpath%20d%3D%22M0%2038%20Q52.5%2014%2070%2038%20T140%2038%20T210%2038%20T280%2038%20T350%2038%20T420%2038%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-opacity%3D%220.26%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E") repeat-x left bottom / 420px 110px, url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20560%2070'%20preserveAspectRatio%3D'none'%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20offset%3D'0'%20stop-color%3D'%23d3e7f4'%20stop-opacity%3D'0.5'%2F%3E%3Cstop%20offset%3D'1'%20stop-color%3D'%239cc8e4'%20stop-opacity%3D'0.5'%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cpath%20d%3D'M0%2052%20Q35%2034%2070%2052%20T140%2052%20T210%2052%20T280%2052%20T350%2052%20T420%2052%20T490%2052%20T560%2052%20L560%2070%20L0%2070%20Z'%20fill%3D'url(%23g)'%2F%3E%3Cpath%20d%3D%22M0%2052%20Q35%2034%2070%2052%20T140%2052%20T210%2052%20T280%2052%20T350%2052%20T420%2052%20T490%2052%20T560%2052%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-opacity%3D%220.15%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E") repeat-x left bottom / 560px 110px; animation: welle 16s linear infinite, farbton 43s ease-in-out infinite; }
.card::after {  z-index:-1;background: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20130%2076'%3E%3Cg%20fill%3D'none'%20stroke-linecap%3D'round'%3E%3Cg%3E%3Cpath%20d%3D'M36%2050%20Q52%2058%2068%2054%20Q82%2051%2094%2056'%20stroke%3D'%23c06a42'%20stroke-width%3D'6'%2F%3E%3Ccircle%20cx%3D'50'%20cy%3D'57'%20r%3D'1.8'%20fill%3D'%23e9b08a'%2F%3E%3Ccircle%20cx%3D'64'%20cy%3D'56'%20r%3D'1.8'%20fill%3D'%23e9b08a'%2F%3E%3Ccircle%20cx%3D'80'%20cy%3D'54'%20r%3D'1.8'%20fill%3D'%23e9b08a'%2F%3E%3Ccircle%20cx%3D'92'%20cy%3D'56'%20r%3D'1.8'%20fill%3D'%23e9b08a'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'-8%2046%2052%3B8%2046%2052%3B-8%2046%2052'%20dur%3D'0.90s'%20begin%3D'0s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3Cg%3E%3Cpath%20d%3D'M42%2054%20Q62%2064%2084%2060%20Q96%2058%20106%2062'%20stroke%3D'%23c06a42'%20stroke-width%3D'6'%2F%3E%3Ccircle%20cx%3D'56'%20cy%3D'62'%20r%3D'1.8'%20fill%3D'%23e9b08a'%2F%3E%3Ccircle%20cx%3D'72'%20cy%3D'64'%20r%3D'1.8'%20fill%3D'%23e9b08a'%2F%3E%3Ccircle%20cx%3D'88'%20cy%3D'62'%20r%3D'1.8'%20fill%3D'%23e9b08a'%2F%3E%3Ccircle%20cx%3D'102'%20cy%3D'63'%20r%3D'1.8'%20fill%3D'%23e9b08a'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'-6%2046%2052%3B6%2046%2052%3B-6%2046%2052'%20dur%3D'1.10s'%20begin%3D'-0.4s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3Cg%3E%3Cpath%20d%3D'M48%2056%20Q70%2068%2094%2064'%20stroke%3D'%23c06a42'%20stroke-width%3D'5'%2F%3E%3Ccircle%20cx%3D'62'%20cy%3D'64'%20r%3D'1.6'%20fill%3D'%23e9b08a'%2F%3E%3Ccircle%20cx%3D'78'%20cy%3D'67'%20r%3D'1.6'%20fill%3D'%23e9b08a'%2F%3E%3Ccircle%20cx%3D'92'%20cy%3D'66'%20r%3D'1.6'%20fill%3D'%23e9b08a'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'-9%2046%2052%3B9%2046%2052%3B-9%2046%2052'%20dur%3D'0.80s'%20begin%3D'-0.2s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3Cg%3E%3Cpath%20d%3D'M32%2046%20Q46%2052%2060%2048%20Q72%2045%2084%2048'%20stroke%3D'%23b85f38'%20stroke-width%3D'5'%2F%3E%3Ccircle%20cx%3D'44'%20cy%3D'52'%20r%3D'1.6'%20fill%3D'%23e9b08a'%2F%3E%3Ccircle%20cx%3D'58'%20cy%3D'51'%20r%3D'1.6'%20fill%3D'%23e9b08a'%2F%3E%3Ccircle%20cx%3D'72'%20cy%3D'48'%20r%3D'1.6'%20fill%3D'%23e9b08a'%2F%3E%3Ccircle%20cx%3D'84'%20cy%3D'50'%20r%3D'1.6'%20fill%3D'%23e9b08a'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'-7%2046%2052%3B7%2046%2052%3B-7%2046%2052'%20dur%3D'1.20s'%20begin%3D'-0.7s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3Cg%3E%3Cpath%20d%3D'M46%2046%20Q60%2040%2074%2042%20Q86%2044%2098%2040'%20stroke%3D'%23b85f38'%20stroke-width%3D'5'%2F%3E%3Ccircle%20cx%3D'56'%20cy%3D'44'%20r%3D'1.6'%20fill%3D'%23e9b08a'%2F%3E%3Ccircle%20cx%3D'70'%20cy%3D'43'%20r%3D'1.6'%20fill%3D'%23e9b08a'%2F%3E%3Ccircle%20cx%3D'84'%20cy%3D'44'%20r%3D'1.6'%20fill%3D'%23e9b08a'%2F%3E%3Ccircle%20cx%3D'96'%20cy%3D'42'%20r%3D'1.6'%20fill%3D'%23e9b08a'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'-5%2046%2052%3B5%2046%2052%3B-5%2046%2052'%20dur%3D'1.00s'%20begin%3D'-0.5s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3Cg%3E%3Cpath%20d%3D'M52%2052%20Q70%2060%2092%2058'%20stroke%3D'%23b85f38'%20stroke-width%3D'4'%2F%3E%3Ccircle%20cx%3D'64'%20cy%3D'58'%20r%3D'1.4'%20fill%3D'%23e9b08a'%2F%3E%3Ccircle%20cx%3D'80'%20cy%3D'60'%20r%3D'1.4'%20fill%3D'%23e9b08a'%2F%3E%3Ccircle%20cx%3D'90'%20cy%3D'59'%20r%3D'1.4'%20fill%3D'%23e9b08a'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'-8%2046%2052%3B8%2046%2052%3B-8%2046%2052'%20dur%3D'0.85s'%20begin%3D'-0.3s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Cpath%20d%3D'M16%2040%20C16%2022%2032%2010%2050%2010%20C68%2010%2080%2022%2080%2036%20C80%2046%2074%2054%2064%2058%20L34%2058%20C24%2054%2016%2048%2016%2040%20Z'%20fill%3D'%23b3552e'%2F%3E%3Cellipse%20cx%3D'42'%20cy%3D'22'%20rx%3D'12'%20ry%3D'6'%20fill%3D'%23d98a5a'%20opacity%3D'0.8'%2F%3E%3Ccircle%20cx%3D'30'%20cy%3D'38'%20r%3D'5'%20fill%3D'%23ffffff'%2F%3E%3Ccircle%20cx%3D'29'%20cy%3D'39'%20r%3D'2.4'%20fill%3D'%23222222'%2F%3E%3Ccircle%20cx%3D'47'%20cy%3D'42'%20r%3D'4'%20fill%3D'%23ffffff'%2F%3E%3Ccircle%20cx%3D'46'%20cy%3D'43'%20r%3D'2'%20fill%3D'%23222222'%2F%3E%3C%2Fsvg%3E") no-repeat left calc(100% + 300px) top 70% / 120px 70px, url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20140%2078'%3E%3Cdefs%3E%3Cfilter%20id%3D'soft'%20x%3D'-20%25'%20y%3D'-20%25'%20width%3D'140%25'%20height%3D'140%25'%3E%3CfeGaussianBlur%20stdDeviation%3D'0.5'%2F%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Cg%20filter%3D%22url(%23soft)%22%3E%3Cdefs%3E%3CradialGradient%20id%3D'cg'%20cx%3D'0.44'%20cy%3D'0.3'%20r%3D'1'%3E%3Cstop%20offset%3D'0'%20stop-color%3D'%23c89a68'%2F%3E%3Cstop%20offset%3D'0.45'%20stop-color%3D'%23a87848'%2F%3E%3Cstop%20offset%3D'0.78'%20stop-color%3D'%237d5630'%2F%3E%3Cstop%20offset%3D'1'%20stop-color%3D'%235f4022'%2F%3E%3C%2FradialGradient%3E%3ClinearGradient%20id%3D'lg'%20x1%3D'0'%20y1%3D'0'%20x2%3D'0'%20y2%3D'1'%3E%3Cstop%20offset%3D'0'%20stop-color%3D'%238f6238'%2F%3E%3Cstop%20offset%3D'1'%20stop-color%3D'%234f3018'%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cellipse%20cx%3D'62'%20cy%3D'48'%20rx%3D'47'%20ry%3D'20'%20fill%3D'%23120a04'%20opacity%3D'0.14'%2F%3E%3Cellipse%20cx%3D'62'%20cy%3D'46'%20rx%3D'41'%20ry%3D'17'%20fill%3D'%23120a04'%20opacity%3D'0.12'%2F%3E%3Cg%20stroke%3D'%236b4a2a'%20stroke-width%3D'3.2'%20fill%3D'none'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Cpath%20d%3D'M30%2032%20Q23%2024%2016%2020'%2F%3E%3Cpath%20d%3D'M41%2025%20Q35%2016%2028%2012'%2F%3E%3Cpath%20d%3D'M54%2022%20Q50%2013%2044%209'%2F%3E%3Cpath%20d%3D'M33%2050%20Q27%2058%2020%2063'%2F%3E%3Cpath%20d%3D'M45%2056%20Q41%2065%2034%2070'%2F%3E%3Cpath%20d%3D'M59%2058%20Q57%2067%2051%2073'%2F%3E%3C%2Fg%3E%3Cg%20stroke%3D'%233f2a14'%20stroke-width%3D'1.8'%20fill%3D'none'%20stroke-linecap%3D'round'%3E%3Cpath%20d%3D'M16%2020%20L9%2017'%2F%3E%3Cpath%20d%3D'M28%2012%20L22%208'%2F%3E%3Cpath%20d%3D'M44%209%20L39%205'%2F%3E%3Cpath%20d%3D'M20%2063%20L13%2067'%2F%3E%3Cpath%20d%3D'M34%2070%20L28%2075'%2F%3E%3Cpath%20d%3D'M51%2073%20L46%2077'%2F%3E%3C%2Fg%3E%3Cpath%20d%3D'M18%2042%20C15%2031%2027%2020%2049%2015%20C70%2010%2090%2016%2098%2026%20C103%2033%20105%2040%2098%2047%20C91%2055%2074%2060%2057%2060%20C43%2060%2027%2056%2021%2049%20C18%2046%2018%2044%2018%2042%20Z'%20fill%3D'url(%23cg)'%2F%3E%3Cg%20fill%3D'url(%23cg)'%3E%3Cpath%20d%3D'M96%2024%20L105%2021%20L100%2029%20Z'%2F%3E%3Cpath%20d%3D'M100%2032%20L109%2031%20L101%2038%20Z'%2F%3E%3Cpath%20d%3D'M100%2041%20L108%2043%20L99%2047%20Z'%2F%3E%3Cpath%20d%3D'M95%2049%20L101%2054%20L92%2054%20Z'%2F%3E%3Cpath%20d%3D'M89%2055%20L94%2060%20L86%2058%20Z'%2F%3E%3C%2Fg%3E%3Cpath%20d%3D'M18%2042%20C15%2031%2027%2020%2049%2015%20C70%2010%2090%2016%2098%2026%20C103%2033%20105%2040%2098%2047%20C91%2055%2074%2060%2057%2060%20C43%2060%2027%2056%2021%2049%20C18%2046%2018%2044%2018%2042%20Z'%20fill%3D'none'%20stroke%3D'%234f3018'%20stroke-width%3D'1.2'%20opacity%3D'0.45'%2F%3E%3Cg%20fill%3D'%235f4022'%20opacity%3D'0.4'%3E%3Cellipse%20cx%3D'38'%20cy%3D'29'%20rx%3D'11'%20ry%3D'6.5'%2F%3E%3Cellipse%20cx%3D'67'%20cy%3D'47'%20rx%3D'13'%20ry%3D'7'%2F%3E%3Cellipse%20cx%3D'81'%20cy%3D'30'%20rx%3D'7'%20ry%3D'5'%2F%3E%3Cellipse%20cx%3D'52'%20cy%3D'54'%20rx%3D'8'%20ry%3D'4.5'%2F%3E%3Cellipse%20cx%3D'29'%20cy%3D'41'%20rx%3D'6'%20ry%3D'3.5'%2F%3E%3Cellipse%20cx%3D'72'%20cy%3D'38'%20rx%3D'6'%20ry%3D'4'%2F%3E%3C%2Fg%3E%3Cg%20fill%3D'%23d9b183'%20opacity%3D'0.45'%3E%3Cellipse%20cx%3D'52'%20cy%3D'22'%20rx%3D'10'%20ry%3D'5'%2F%3E%3Cellipse%20cx%3D'32'%20cy%3D'47'%20rx%3D'7'%20ry%3D'4.5'%2F%3E%3Cellipse%20cx%3D'62'%20cy%3D'30'%20rx%3D'5'%20ry%3D'3'%2F%3E%3Cellipse%20cx%3D'44'%20cy%3D'38'%20rx%3D'5'%20ry%3D'3'%2F%3E%3C%2Fg%3E%3Cg%20fill%3D'%234f3018'%20opacity%3D'0.45'%3E%3Ccircle%20cx%3D'44'%20cy%3D'34'%20r%3D'1.3'%2F%3E%3Ccircle%20cx%3D'60'%20cy%3D'27'%20r%3D'1.1'%2F%3E%3Ccircle%20cx%3D'75'%20cy%3D'42'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'36'%20cy%3D'52'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'56'%20cy%3D'48'%20r%3D'1'%2F%3E%3Ccircle%20cx%3D'85'%20cy%3D'36'%20r%3D'1.1'%2F%3E%3Ccircle%20cx%3D'48'%20cy%3D'43'%20r%3D'0.9'%2F%3E%3Ccircle%20cx%3D'66'%20cy%3D'52'%20r%3D'1'%2F%3E%3Ccircle%20cx%3D'42'%20cy%3D'25'%20r%3D'1'%2F%3E%3Ccircle%20cx%3D'70'%20cy%3D'24'%20r%3D'0.9'%2F%3E%3C%2Fg%3E%3Cellipse%20cx%3D'48'%20cy%3D'23'%20rx%3D'15'%20ry%3D'5'%20fill%3D'%23e8c9a0'%20opacity%3D'0.14'%2F%3E%3Cg%20stroke%3D'%234f3018'%20stroke-width%3D'1.8'%20stroke-linecap%3D'round'%3E%3Cpath%20d%3D'M89%2024%20L93%2018'%2F%3E%3Cpath%20d%3D'M96%2028%20L101%2023'%2F%3E%3C%2Fg%3E%3Ccircle%20cx%3D'93'%20cy%3D'17'%20r%3D'2.2'%20fill%3D'%23140b05'%2F%3E%3Ccircle%20cx%3D'94'%20cy%3D'16'%20r%3D'0.7'%20fill%3D'%23ffffff'%2F%3E%3Ccircle%20cx%3D'101'%20cy%3D'22'%20r%3D'1.9'%20fill%3D'%23140b05'%2F%3E%3Ccircle%20cx%3D'102'%20cy%3D'21'%20r%3D'0.6'%20fill%3D'%23ffffff'%2F%3E%3Cg%3E%3Cpath%20d%3D'M92%2034%20Q104%2032%20110%2027'%20stroke%3D'url(%23lg)'%20stroke-width%3D'5.5'%20fill%3D'none'%20stroke-linecap%3D'round'%2F%3E%3Cpath%20d%3D'M110%2027%20C116%2020%20127%2018%20132%2023%20C136%2028%20133%2034%20126%2036%20C119%2038%20111%2033%20110%2027%20Z'%20fill%3D'url(%23lg)'%2F%3E%3Cpath%20d%3D'M129%2022%20L139%2020%20L130%2028%20Z'%20fill%3D'url(%23lg)'%2F%3E%3Cg%3E%3Cpath%20d%3D'M128%2027%20Q136%2030%20134%2037%20Q127%2032%20125%2029%20Z'%20fill%3D'url(%23lg)'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'-18%20128%2027%3B12%20128%2027%3B-18%20128%2027'%20dur%3D'1.1s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Cg%3E%3Cpath%20d%3D'M90%2046%20Q100%2049%20106%2045'%20stroke%3D'url(%23lg)'%20stroke-width%3D'5'%20fill%3D'none'%20stroke-linecap%3D'round'%2F%3E%3Cpath%20d%3D'M106%2045%20C111%2040%20120%2040%20123%2044%20C126%2048%20123%2053%20117%2054%20C111%2055%20105%2051%20106%2045%20Z'%20fill%3D'url(%23lg)'%2F%3E%3Cpath%20d%3D'M122%2043%20L131%2042%20L123%2048%20Z'%20fill%3D'url(%23lg)'%2F%3E%3Cg%3E%3Cpath%20d%3D'M121%2047%20Q128%2051%20125%2057%20Q119%2052%20118%2049%20Z'%20fill%3D'url(%23lg)'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'14%20121%2047%3B-10%20121%2047%3B14%20121%2047'%20dur%3D'1.1s'%20begin%3D'-0.55s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fg%3E%3Crect%20x%3D'0'%20y%3D'0'%20width%3D'140'%20height%3D'78'%20fill%3D'%232e5a78'%20opacity%3D'0.13'%2F%3E%3C%2Fsvg%3E") no-repeat left -260px top 80% / 110px 62px, url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2080%2076'%3E%3Cdefs%3E%3Cfilter%20id%3D'soft'%20x%3D'-20%25'%20y%3D'-20%25'%20width%3D'140%25'%20height%3D'140%25'%3E%3CfeGaussianBlur%20stdDeviation%3D'0.5'%2F%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Cg%20filter%3D%22url(%23soft)%22%3E%3Cdefs%3E%3CradialGradient%20id%3D'sg'%20cx%3D'0.5'%20cy%3D'0.47'%20r%3D'0.65'%3E%3Cstop%20offset%3D'0'%20stop-color%3D'%23e8b075'%2F%3E%3Cstop%20offset%3D'0.4'%20stop-color%3D'%23d98a50'%2F%3E%3Cstop%20offset%3D'0.75'%20stop-color%3D'%23c06a35'%2F%3E%3Cstop%20offset%3D'1'%20stop-color%3D'%239a4e22'%2F%3E%3C%2FradialGradient%3E%3C%2Fdefs%3E%3Cg%3E%3Cellipse%20cx%3D'40'%20cy%3D'41'%20rx%3D'27'%20ry%3D'22'%20fill%3D'%23140a04'%20opacity%3D'0.16'%2F%3E%3Cpath%20d%3D'M45.1%2025.0%20Q44.2%2015.1%2040.0%205.5%20Q40.0%207.1%2035.8%2015.1%20Q35.8%2015.1%2034.9%2025.0%20Q43.9%2031.9%2052.9%2038.7%20Q61.6%2035.9%2069.4%2029.8%20Q67.9%2030.2%2059.7%2028.0%20Q59.7%2028.0%2050.6%2029.5%20Q46.3%2039.7%2041.9%2049.9%20Q47.8%2057.7%2056.2%2063.5%20Q55.4%2062.1%2054.9%2053.3%20Q54.9%2053.3%2050.6%2044.5%20Q39.7%2044.1%2028.8%2043.6%20Q24.1%2050.0%2022.0%2058.5%20Q23.0%2057.3%2030.0%2054.9%20Q30.0%2054.9%2035.5%2049.2%20Q32.4%2039.5%2029.2%2029.7%20Q21.1%2028.3%2012.3%2030.2%20Q13.8%2030.6%2019.3%2035.9%20Q19.3%2035.9%2027.1%2038.4%20Q36.1%2031.7%2045.1%2025.0%20Z'%20fill%3D'url(%23sg)'%20stroke%3D'url(%23sg)'%20stroke-width%3D'6'%20stroke-linejoin%3D'round'%2F%3E%3Cpath%20d%3D'M45.1%2025.0%20Q44.2%2015.1%2040.0%205.5%20Q40.0%207.1%2035.8%2015.1%20Q35.8%2015.1%2034.9%2025.0%20Q43.9%2031.9%2052.9%2038.7%20Q61.6%2035.9%2069.4%2029.8%20Q67.9%2030.2%2059.7%2028.0%20Q59.7%2028.0%2050.6%2029.5%20Q46.3%2039.7%2041.9%2049.9%20Q47.8%2057.7%2056.2%2063.5%20Q55.4%2062.1%2054.9%2053.3%20Q54.9%2053.3%2050.6%2044.5%20Q39.7%2044.1%2028.8%2043.6%20Q24.1%2050.0%2022.0%2058.5%20Q23.0%2057.3%2030.0%2054.9%20Q30.0%2054.9%2035.5%2049.2%20Q32.4%2039.5%2029.2%2029.7%20Q21.1%2028.3%2012.3%2030.2%20Q13.8%2030.6%2019.3%2035.9%20Q19.3%2035.9%2027.1%2038.4%20Q36.1%2031.7%2045.1%2025.0%20Z'%20fill%3D'none'%20stroke%3D'%238a4a20'%20stroke-width%3D'1.6'%20opacity%3D'0.5'%20stroke-linejoin%3D'round'%2F%3E%3Cg%20fill%3D'%238a4a20'%20opacity%3D'0.6'%3E%3Ccircle%20cx%3D'38.0'%20cy%3D'19.2'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'36.2'%20cy%3D'19.9'%20r%3D'1.6'%2F%3E%3Ccircle%20cx%3D'36.3'%20cy%3D'12.1'%20r%3D'1.9'%2F%3E%3Ccircle%20cx%3D'46.1'%20cy%3D'14.6'%20r%3D'1.9'%2F%3E%3Ccircle%20cx%3D'45.7'%20cy%3D'16.6'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'62.7'%20cy%3D'25.3'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'61.8'%20cy%3D'31.4'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'55.0'%20cy%3D'36.6'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'48.3'%20cy%3D'56.7'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'24.5'%20cy%3D'54.8'%20r%3D'1.3'%2F%3E%3Ccircle%20cx%3D'23.9'%20cy%3D'49.0'%20r%3D'1.6'%2F%3E%3Ccircle%20cx%3D'32.0'%20cy%3D'53.5'%20r%3D'1.3'%2F%3E%3Ccircle%20cx%3D'22.5'%20cy%3D'53.0'%20r%3D'1.6'%2F%3E%3Ccircle%20cx%3D'31.8'%20cy%3D'51.6'%20r%3D'0.9'%2F%3E%3Ccircle%20cx%3D'27.1'%20cy%3D'52.1'%20r%3D'0.9'%2F%3E%3Ccircle%20cx%3D'22.6'%20cy%3D'27.1'%20r%3D'1.9'%2F%3E%3Ccircle%20cx%3D'25.0'%20cy%3D'31.1'%20r%3D'0.9'%2F%3E%3Ccircle%20cx%3D'19.1'%20cy%3D'36.1'%20r%3D'0.8'%2F%3E%3Ccircle%20cx%3D'19.2'%20cy%3D'28.5'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'23.0'%20cy%3D'32.0'%20r%3D'1.9'%2F%3E%3Ccircle%20cx%3D'36.0'%20cy%3D'29.6'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'29.4'%20cy%3D'30.9'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'30.2'%20cy%3D'30.5'%20r%3D'2.0'%2F%3E%3Ccircle%20cx%3D'39.2'%20cy%3D'45.3'%20r%3D'1.8'%2F%3E%3Ccircle%20cx%3D'40.0'%20cy%3D'39.4'%20r%3D'2.2'%2F%3E%3Ccircle%20cx%3D'44.3'%20cy%3D'34.9'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'42.1'%20cy%3D'36.2'%20r%3D'1.9'%2F%3E%3C%2Fg%3E%3Cg%20fill%3D'%23eec49a'%20opacity%3D'0.75'%3E%3Ccircle%20cx%3D'45.4'%20cy%3D'15.7'%20r%3D'2.0'%2F%3E%3Ccircle%20cx%3D'39.3'%20cy%3D'22.3'%20r%3D'1.8'%2F%3E%3Ccircle%20cx%3D'38.1'%20cy%3D'10.0'%20r%3D'0.9'%2F%3E%3Ccircle%20cx%3D'56.5'%20cy%3D'33.6'%20r%3D'1.3'%2F%3E%3Ccircle%20cx%3D'59.8'%20cy%3D'25.7'%20r%3D'1.7'%2F%3E%3Ccircle%20cx%3D'55.7'%20cy%3D'36.5'%20r%3D'1.6'%2F%3E%3Ccircle%20cx%3D'55.5'%20cy%3D'32.7'%20r%3D'0.9'%2F%3E%3Ccircle%20cx%3D'60.2'%20cy%3D'32.4'%20r%3D'1.9'%2F%3E%3Ccircle%20cx%3D'45.6'%20cy%3D'51.9'%20r%3D'1.7'%2F%3E%3Ccircle%20cx%3D'48.3'%20cy%3D'54.2'%20r%3D'0.9'%2F%3E%3Ccircle%20cx%3D'51.6'%20cy%3D'60.1'%20r%3D'2.0'%2F%3E%3Ccircle%20cx%3D'57.2'%20cy%3D'56.3'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'46.4'%20cy%3D'51.4'%20r%3D'1.7'%2F%3E%3Ccircle%20cx%3D'53.1'%20cy%3D'54.3'%20r%3D'0.9'%2F%3E%3Ccircle%20cx%3D'56.5'%20cy%3D'56.0'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'32.3'%20cy%3D'53.1'%20r%3D'1.3'%2F%3E%3Ccircle%20cx%3D'30.8'%20cy%3D'48.4'%20r%3D'1.6'%2F%3E%3Ccircle%20cx%3D'17.5'%20cy%3D'35.6'%20r%3D'0.9'%2F%3E%3Ccircle%20cx%3D'18.8'%20cy%3D'30.0'%20r%3D'1.8'%2F%3E%3Ccircle%20cx%3D'23.4'%20cy%3D'29.2'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'43.5'%20cy%3D'27.2'%20r%3D'1.1'%2F%3E%3Ccircle%20cx%3D'29.5'%20cy%3D'36.5'%20r%3D'1.6'%2F%3E%3Ccircle%20cx%3D'51.1'%20cy%3D'33.5'%20r%3D'1.6'%2F%3E%3Ccircle%20cx%3D'37.4'%20cy%3D'40.2'%20r%3D'2.2'%2F%3E%3Ccircle%20cx%3D'40.3'%20cy%3D'34.0'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'45.1'%20cy%3D'32.5'%20r%3D'1.6'%2F%3E%3Ccircle%20cx%3D'41.6'%20cy%3D'27.4'%20r%3D'1.6'%2F%3E%3Ccircle%20cx%3D'33.5'%20cy%3D'29.4'%20r%3D'1.0'%2F%3E%3Ccircle%20cx%3D'41.0'%20cy%3D'31.5'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'29.8'%20cy%3D'38.3'%20r%3D'1.8'%2F%3E%3Ccircle%20cx%3D'33.1'%20cy%3D'43.8'%20r%3D'2.0'%2F%3E%3C%2Fg%3E%3Cg%20fill%3D'%23f8e2bd'%20opacity%3D'0.95'%3E%3Ccircle%20cx%3D'39.4'%20cy%3D'21.0'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'41.0'%20cy%3D'20.9'%20r%3D'1.1'%2F%3E%3Ccircle%20cx%3D'39.4'%20cy%3D'18.6'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'41.0'%20cy%3D'19.0'%20r%3D'1.3'%2F%3E%3Ccircle%20cx%3D'39.2'%20cy%3D'15.9'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'41.2'%20cy%3D'15.9'%20r%3D'1.1'%2F%3E%3Ccircle%20cx%3D'38.8'%20cy%3D'13.8'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'41.1'%20cy%3D'13.7'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'38.4'%20cy%3D'10.9'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'41.0'%20cy%3D'10.7'%20r%3D'1.1'%2F%3E%3Ccircle%20cx%3D'38.1'%20cy%3D'8.4'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'41.7'%20cy%3D'8.4'%20r%3D'1.3'%2F%3E%3Ccircle%20cx%3D'55.1'%20cy%3D'32.2'%20r%3D'1.6'%2F%3E%3Ccircle%20cx%3D'55.9'%20cy%3D'33.7'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'57.3'%20cy%3D'31.5'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'58.0'%20cy%3D'33.3'%20r%3D'1.3'%2F%3E%3Ccircle%20cx%3D'59.9'%20cy%3D'31.1'%20r%3D'1.3'%2F%3E%3Ccircle%20cx%3D'60.4'%20cy%3D'33.5'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'61.9'%20cy%3D'30.4'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'62.5'%20cy%3D'32.9'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'63.7'%20cy%3D'29.8'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'64.5'%20cy%3D'32.3'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'65.7'%20cy%3D'29.4'%20r%3D'1.3'%2F%3E%3Ccircle%20cx%3D'66.7'%20cy%3D'32.2'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'49.3'%20cy%3D'50.3'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'47.4'%20cy%3D'50.8'%20r%3D'1.3'%2F%3E%3Ccircle%20cx%3D'50.1'%20cy%3D'52.6'%20r%3D'1.3'%2F%3E%3Ccircle%20cx%3D'48.7'%20cy%3D'53.0'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'51.7'%20cy%3D'54.2'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'49.7'%20cy%3D'54.8'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'52.8'%20cy%3D'56.5'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'50.7'%20cy%3D'57.3'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'54.5'%20cy%3D'58.0'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'52.0'%20cy%3D'59.8'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'56.3'%20cy%3D'60.2'%20r%3D'1.1'%2F%3E%3Ccircle%20cx%3D'53.7'%20cy%3D'61.3'%20r%3D'1.3'%2F%3E%3Ccircle%20cx%3D'30.8'%20cy%3D'49.3'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'29.5'%20cy%3D'48.2'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'29.8'%20cy%3D'51.3'%20r%3D'1.3'%2F%3E%3Ccircle%20cx%3D'28.6'%20cy%3D'50.2'%20r%3D'1.6'%2F%3E%3Ccircle%20cx%3D'28.0'%20cy%3D'52.2'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'27.3'%20cy%3D'50.7'%20r%3D'1.3'%2F%3E%3Ccircle%20cx%3D'27.5'%20cy%3D'54.1'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'25.3'%20cy%3D'52.4'%20r%3D'1.1'%2F%3E%3Ccircle%20cx%3D'25.9'%20cy%3D'55.3'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'24.4'%20cy%3D'53.8'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'24.8'%20cy%3D'57.1'%20r%3D'1.3'%2F%3E%3Ccircle%20cx%3D'22.7'%20cy%3D'55.7'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'24.6'%20cy%3D'34.2'%20r%3D'1.5'%2F%3E%3Ccircle%20cx%3D'25.3'%20cy%3D'32.6'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'22.7'%20cy%3D'34.2'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'23.0'%20cy%3D'32.0'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'21.2'%20cy%3D'33.1'%20r%3D'1.6'%2F%3E%3Ccircle%20cx%3D'20.9'%20cy%3D'31.7'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'19.3'%20cy%3D'32.6'%20r%3D'1.4'%2F%3E%3Ccircle%20cx%3D'19.9'%20cy%3D'31.0'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'17.4'%20cy%3D'33.0'%20r%3D'1.2'%2F%3E%3Ccircle%20cx%3D'17.9'%20cy%3D'29.8'%20r%3D'1.1'%2F%3E%3Ccircle%20cx%3D'15.3'%20cy%3D'32.4'%20r%3D'1.6'%2F%3E%3Ccircle%20cx%3D'15.8'%20cy%3D'29.7'%20r%3D'1.2'%2F%3E%3C%2Fg%3E%3Ccircle%20cx%3D'40'%20cy%3D'37'%20r%3D'8'%20fill%3D'%23e8b075'%20opacity%3D'0.4'%2F%3E%3Ccircle%20cx%3D'46.5'%20cy%3D'31'%20r%3D'2.4'%20fill%3D'%23eec49a'%2F%3E%3Ccircle%20cx%3D'46.5'%20cy%3D'31'%20r%3D'1.1'%20fill%3D'%238a4a20'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'-4%2040%2037%3B4%2040%2037%3B-4%2040%2037'%20dur%3D'7s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Crect%20x%3D'0'%20y%3D'0'%20width%3D'80'%20height%3D'76'%20fill%3D'%232e5a78'%20opacity%3D'0.13'%2F%3E%3C%2Fsvg%3E") no-repeat left calc(100% + 300px) top 84% / 72px 64px, url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20240%2060'%3E%3Cg%20transform%3D'translate(0%2C10)%20scale(0.90)'%3E%3Cg%20transform%3D'scale(-1%2C1)%20translate(-100%2C0)'%3E%3Cdefs%3E%3ClinearGradient%20id%3D'g'%20x1%3D'0'%20y1%3D'0'%20x2%3D'0'%20y2%3D'1'%3E%3Cstop%20offset%3D'0'%20stop-color%3D'%237a93a8'%2F%3E%3Cstop%20offset%3D'0.55'%20stop-color%3D'%23e2e8ec'%2F%3E%3Cstop%20offset%3D'1'%20stop-color%3D'%23e2e8ec'%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cg%20fill%3D'%2363798c'%3E%3Cpath%20d%3D'M14%2022%20L2%2011%20Q8%2022%202%2033%20Z'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'-12%2014%2022%3B12%2014%2022%3B-12%2014%2022'%20dur%3D'0.7s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3Cpath%20d%3D'M14%2022%20C28%208%2068%206%2092%2022%20C68%2038%2028%2036%2014%2022%20Z'%20fill%3D'url(%23g)'%2F%3E%3Cpath%20d%3D'M40%2010%20Q50%201%2060%209%20Q50%2013%2040%2010%20Z'%20fill%3D'%2363798c'%2F%3E%3Cpath%20d%3D'M44%2034%20Q52%2041%2060%2035%20Q52%2036%2044%2034%20Z'%20fill%3D'%2363798c'%20opacity%3D'0.9'%2F%3E%3Cpath%20d%3D'M56%2026%20Q62%2033%2068%2031%20Q62%2027%2056%2026%20Z'%20fill%3D'%2363798c'%20opacity%3D'0.85'%2F%3E%3Cpath%20d%3D'M68%2014%20Q63%2022%2068%2030'%20stroke%3D'%237a93a8'%20stroke-width%3D'1'%20fill%3D'none'%20opacity%3D'0.5'%2F%3E%3Ccircle%20cx%3D'76'%20cy%3D'19'%20r%3D'3.2'%20fill%3D'%2314181c'%2F%3E%3Ccircle%20cx%3D'77'%20cy%3D'18'%20r%3D'1.1'%20fill%3D'%23ffffff'%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Cg%20transform%3D'translate(50%2C35)%20scale(1.10)'%3E%3Cg%20transform%3D'scale(-1%2C1)%20translate(-100%2C0)'%3E%3Cdefs%3E%3ClinearGradient%20id%3D'g'%20x1%3D'0'%20y1%3D'0'%20x2%3D'0'%20y2%3D'1'%3E%3Cstop%20offset%3D'0'%20stop-color%3D'%237a93a8'%2F%3E%3Cstop%20offset%3D'0.55'%20stop-color%3D'%23e2e8ec'%2F%3E%3Cstop%20offset%3D'1'%20stop-color%3D'%23e2e8ec'%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cg%20fill%3D'%2363798c'%3E%3Cpath%20d%3D'M14%2022%20L2%2011%20Q8%2022%202%2033%20Z'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'-12%2014%2022%3B12%2014%2022%3B-12%2014%2022'%20dur%3D'0.85s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3Cpath%20d%3D'M14%2022%20C28%208%2068%206%2092%2022%20C68%2038%2028%2036%2014%2022%20Z'%20fill%3D'url(%23g)'%2F%3E%3Cpath%20d%3D'M40%2010%20Q50%201%2060%209%20Q50%2013%2040%2010%20Z'%20fill%3D'%2363798c'%2F%3E%3Cpath%20d%3D'M44%2034%20Q52%2041%2060%2035%20Q52%2036%2044%2034%20Z'%20fill%3D'%2363798c'%20opacity%3D'0.9'%2F%3E%3Cpath%20d%3D'M56%2026%20Q62%2033%2068%2031%20Q62%2027%2056%2026%20Z'%20fill%3D'%2363798c'%20opacity%3D'0.85'%2F%3E%3Cpath%20d%3D'M68%2014%20Q63%2022%2068%2030'%20stroke%3D'%237a93a8'%20stroke-width%3D'1'%20fill%3D'none'%20opacity%3D'0.5'%2F%3E%3Ccircle%20cx%3D'76'%20cy%3D'19'%20r%3D'3.2'%20fill%3D'%2314181c'%2F%3E%3Ccircle%20cx%3D'77'%20cy%3D'18'%20r%3D'1.1'%20fill%3D'%23ffffff'%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Cg%20transform%3D'translate(105%2C5)%20scale(0.80)'%3E%3Cg%20transform%3D'scale(-1%2C1)%20translate(-100%2C0)'%3E%3Cdefs%3E%3ClinearGradient%20id%3D'g'%20x1%3D'0'%20y1%3D'0'%20x2%3D'0'%20y2%3D'1'%3E%3Cstop%20offset%3D'0'%20stop-color%3D'%237a93a8'%2F%3E%3Cstop%20offset%3D'0.55'%20stop-color%3D'%23e2e8ec'%2F%3E%3Cstop%20offset%3D'1'%20stop-color%3D'%23e2e8ec'%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cg%20fill%3D'%2363798c'%3E%3Cpath%20d%3D'M14%2022%20L2%2011%20Q8%2022%202%2033%20Z'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'-12%2014%2022%3B12%2014%2022%3B-12%2014%2022'%20dur%3D'0.75s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3Cpath%20d%3D'M14%2022%20C28%208%2068%206%2092%2022%20C68%2038%2028%2036%2014%2022%20Z'%20fill%3D'url(%23g)'%2F%3E%3Cpath%20d%3D'M40%2010%20Q50%201%2060%209%20Q50%2013%2040%2010%20Z'%20fill%3D'%2363798c'%2F%3E%3Cpath%20d%3D'M44%2034%20Q52%2041%2060%2035%20Q52%2036%2044%2034%20Z'%20fill%3D'%2363798c'%20opacity%3D'0.9'%2F%3E%3Cpath%20d%3D'M56%2026%20Q62%2033%2068%2031%20Q62%2027%2056%2026%20Z'%20fill%3D'%2363798c'%20opacity%3D'0.85'%2F%3E%3Cpath%20d%3D'M68%2014%20Q63%2022%2068%2030'%20stroke%3D'%237a93a8'%20stroke-width%3D'1'%20fill%3D'none'%20opacity%3D'0.5'%2F%3E%3Ccircle%20cx%3D'76'%20cy%3D'19'%20r%3D'3.2'%20fill%3D'%2314181c'%2F%3E%3Ccircle%20cx%3D'77'%20cy%3D'18'%20r%3D'1.1'%20fill%3D'%23ffffff'%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Cg%20transform%3D'translate(150%2C30)%20scale(1.00)'%3E%3Cg%20transform%3D'scale(-1%2C1)%20translate(-100%2C0)'%3E%3Cdefs%3E%3ClinearGradient%20id%3D'g'%20x1%3D'0'%20y1%3D'0'%20x2%3D'0'%20y2%3D'1'%3E%3Cstop%20offset%3D'0'%20stop-color%3D'%237a93a8'%2F%3E%3Cstop%20offset%3D'0.55'%20stop-color%3D'%23e2e8ec'%2F%3E%3Cstop%20offset%3D'1'%20stop-color%3D'%23e2e8ec'%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cg%20fill%3D'%2363798c'%3E%3Cpath%20d%3D'M14%2022%20L2%2011%20Q8%2022%202%2033%20Z'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'-12%2014%2022%3B12%2014%2022%3B-12%2014%2022'%20dur%3D'0.95s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3Cpath%20d%3D'M14%2022%20C28%208%2068%206%2092%2022%20C68%2038%2028%2036%2014%2022%20Z'%20fill%3D'url(%23g)'%2F%3E%3Cpath%20d%3D'M40%2010%20Q50%201%2060%209%20Q50%2013%2040%2010%20Z'%20fill%3D'%2363798c'%2F%3E%3Cpath%20d%3D'M44%2034%20Q52%2041%2060%2035%20Q52%2036%2044%2034%20Z'%20fill%3D'%2363798c'%20opacity%3D'0.9'%2F%3E%3Cpath%20d%3D'M56%2026%20Q62%2033%2068%2031%20Q62%2027%2056%2026%20Z'%20fill%3D'%2363798c'%20opacity%3D'0.85'%2F%3E%3Cpath%20d%3D'M68%2014%20Q63%2022%2068%2030'%20stroke%3D'%237a93a8'%20stroke-width%3D'1'%20fill%3D'none'%20opacity%3D'0.5'%2F%3E%3Ccircle%20cx%3D'76'%20cy%3D'19'%20r%3D'3.2'%20fill%3D'%2314181c'%2F%3E%3Ccircle%20cx%3D'77'%20cy%3D'18'%20r%3D'1.1'%20fill%3D'%23ffffff'%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Cg%20transform%3D'translate(195%2C12)%20scale(0.85)'%3E%3Cg%20transform%3D'scale(-1%2C1)%20translate(-100%2C0)'%3E%3Cdefs%3E%3ClinearGradient%20id%3D'g'%20x1%3D'0'%20y1%3D'0'%20x2%3D'0'%20y2%3D'1'%3E%3Cstop%20offset%3D'0'%20stop-color%3D'%237a93a8'%2F%3E%3Cstop%20offset%3D'0.55'%20stop-color%3D'%23e2e8ec'%2F%3E%3Cstop%20offset%3D'1'%20stop-color%3D'%23e2e8ec'%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cg%20fill%3D'%2363798c'%3E%3Cpath%20d%3D'M14%2022%20L2%2011%20Q8%2022%202%2033%20Z'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'-12%2014%2022%3B12%2014%2022%3B-12%2014%2022'%20dur%3D'0.8s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3Cpath%20d%3D'M14%2022%20C28%208%2068%206%2092%2022%20C68%2038%2028%2036%2014%2022%20Z'%20fill%3D'url(%23g)'%2F%3E%3Cpath%20d%3D'M40%2010%20Q50%201%2060%209%20Q50%2013%2040%2010%20Z'%20fill%3D'%2363798c'%2F%3E%3Cpath%20d%3D'M44%2034%20Q52%2041%2060%2035%20Q52%2036%2044%2034%20Z'%20fill%3D'%2363798c'%20opacity%3D'0.9'%2F%3E%3Cpath%20d%3D'M56%2026%20Q62%2033%2068%2031%20Q62%2027%2056%2026%20Z'%20fill%3D'%2363798c'%20opacity%3D'0.85'%2F%3E%3Cpath%20d%3D'M68%2014%20Q63%2022%2068%2030'%20stroke%3D'%237a93a8'%20stroke-width%3D'1'%20fill%3D'none'%20opacity%3D'0.5'%2F%3E%3Ccircle%20cx%3D'76'%20cy%3D'19'%20r%3D'3.2'%20fill%3D'%2314181c'%2F%3E%3Ccircle%20cx%3D'77'%20cy%3D'18'%20r%3D'1.1'%20fill%3D'%23ffffff'%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E") no-repeat left calc(100% + 300px) top 62% / 240px 60px, url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20100%2044'%3E%3Cdefs%3E%3ClinearGradient%20id%3D'g'%20x1%3D'0'%20y1%3D'0'%20x2%3D'0'%20y2%3D'1'%3E%3Cstop%20offset%3D'0'%20stop-color%3D'%235b7a94'%2F%3E%3Cstop%20offset%3D'0.55'%20stop-color%3D'%23cfd8de'%2F%3E%3Cstop%20offset%3D'1'%20stop-color%3D'%23cfd8de'%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cg%20fill%3D'%234a6a84'%3E%3Cpath%20d%3D'M14%2022%20L2%2011%20Q8%2022%202%2033%20Z'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'-14%2014%2022%3B14%2014%2022%3B-14%2014%2022'%20dur%3D'0.8s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3Cpath%20d%3D'M14%2022%20C28%208%2068%206%2092%2022%20C68%2038%2028%2036%2014%2022%20Z'%20fill%3D'url(%23g)'%2F%3E%3Cpath%20d%3D'M40%2010%20Q50%201%2060%209%20Q50%2013%2040%2010%20Z'%20fill%3D'%234a6a84'%2F%3E%3Cpath%20d%3D'M44%2034%20Q52%2041%2060%2035%20Q52%2036%2044%2034%20Z'%20fill%3D'%234a6a84'%20opacity%3D'0.9'%2F%3E%3Cpath%20d%3D'M56%2026%20Q62%2033%2068%2031%20Q62%2027%2056%2026%20Z'%20fill%3D'%234a6a84'%20opacity%3D'0.85'%2F%3E%3Cpath%20d%3D'M68%2014%20Q63%2022%2068%2030'%20stroke%3D'%235b7a94'%20stroke-width%3D'1'%20fill%3D'none'%20opacity%3D'0.5'%2F%3E%3Ccircle%20cx%3D'76'%20cy%3D'19'%20r%3D'3.2'%20fill%3D'%2314181c'%2F%3E%3Ccircle%20cx%3D'77'%20cy%3D'18'%20r%3D'1.1'%20fill%3D'%23ffffff'%2F%3E%3C%2Fsvg%3E") no-repeat left -260px top 55% / 90px 40px, url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20100%2044'%3E%3Cdefs%3E%3ClinearGradient%20id%3D'g'%20x1%3D'0'%20y1%3D'0'%20x2%3D'0'%20y2%3D'1'%3E%3Cstop%20offset%3D'0'%20stop-color%3D'%2367755f'%2F%3E%3Cstop%20offset%3D'0.55'%20stop-color%3D'%23d9ddcf'%2F%3E%3Cstop%20offset%3D'1'%20stop-color%3D'%23d9ddcf'%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cg%20fill%3D'%23556349'%3E%3Cpath%20d%3D'M14%2022%20L2%2011%20Q8%2022%202%2033%20Z'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'-14%2014%2022%3B14%2014%2022%3B-14%2014%2022'%20dur%3D'0.9s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3Cpath%20d%3D'M14%2022%20C28%208%2068%206%2092%2022%20C68%2038%2028%2036%2014%2022%20Z'%20fill%3D'url(%23g)'%2F%3E%3Cpath%20d%3D'M40%2010%20Q50%201%2060%209%20Q50%2013%2040%2010%20Z'%20fill%3D'%23556349'%2F%3E%3Cpath%20d%3D'M44%2034%20Q52%2041%2060%2035%20Q52%2036%2044%2034%20Z'%20fill%3D'%23556349'%20opacity%3D'0.9'%2F%3E%3Cpath%20d%3D'M56%2026%20Q62%2033%2068%2031%20Q62%2027%2056%2026%20Z'%20fill%3D'%23556349'%20opacity%3D'0.85'%2F%3E%3Cpath%20d%3D'M68%2014%20Q63%2022%2068%2030'%20stroke%3D'%2367755f'%20stroke-width%3D'1'%20fill%3D'none'%20opacity%3D'0.5'%2F%3E%3Ccircle%20cx%3D'76'%20cy%3D'19'%20r%3D'3.2'%20fill%3D'%2314181c'%2F%3E%3Ccircle%20cx%3D'77'%20cy%3D'18'%20r%3D'1.1'%20fill%3D'%23ffffff'%2F%3E%3C%2Fsvg%3E") no-repeat left -260px top 55% / 100px 46px, url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20100%2044'%3E%3Cdefs%3E%3ClinearGradient%20id%3D'g'%20x1%3D'0'%20y1%3D'0'%20x2%3D'0'%20y2%3D'1'%3E%3Cstop%20offset%3D'0'%20stop-color%3D'%234f6b8a'%2F%3E%3Cstop%20offset%3D'0.55'%20stop-color%3D'%23e8e8e8'%2F%3E%3Cstop%20offset%3D'1'%20stop-color%3D'%23e8e8e8'%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cg%20fill%3D'%233f586f'%3E%3Cpath%20d%3D'M14%2022%20L2%2011%20Q8%2022%202%2033%20Z'%2F%3E%3CanimateTransform%20attributeName%3D'transform'%20type%3D'rotate'%20values%3D'-14%2014%2022%3B14%2014%2022%3B-14%2014%2022'%20dur%3D'0.7s'%20repeatCount%3D'indefinite'%2F%3E%3C%2Fg%3E%3Cpath%20d%3D'M14%2022%20C28%208%2068%206%2092%2022%20C68%2038%2028%2036%2014%2022%20Z'%20fill%3D'url(%23g)'%2F%3E%3Cpath%20d%3D'M40%2010%20Q50%201%2060%209%20Q50%2013%2040%2010%20Z'%20fill%3D'%233f586f'%2F%3E%3Cpath%20d%3D'M44%2034%20Q52%2041%2060%2035%20Q52%2036%2044%2034%20Z'%20fill%3D'%233f586f'%20opacity%3D'0.9'%2F%3E%3Cpath%20d%3D'M56%2026%20Q62%2033%2068%2031%20Q62%2027%2056%2026%20Z'%20fill%3D'%233f586f'%20opacity%3D'0.85'%2F%3E%3Cpath%20d%3D'M68%2014%20Q63%2022%2068%2030'%20stroke%3D'%234f6b8a'%20stroke-width%3D'1'%20fill%3D'none'%20opacity%3D'0.5'%2F%3E%3Ccircle%20cx%3D'76'%20cy%3D'19'%20r%3D'3.2'%20fill%3D'%2314181c'%2F%3E%3Ccircle%20cx%3D'77'%20cy%3D'18'%20r%3D'1.1'%20fill%3D'%23ffffff'%2F%3E%3C%2Fsvg%3E") no-repeat left -260px top 55% / 80px 34px, radial-gradient(closest-side, rgba(255,236,180,.30), rgba(255,236,180,0)) right 30% top 55% / 240px 46px no-repeat; animation: fischwechsel 128s linear infinite, sonnenglanz 9s ease-in-out infinite, farbton 61s ease-in-out infinite; }
@keyframes welle { 0% { background-position: right 34% top 48%, left 0 bottom, left 0 bottom, left -560px bottom; } 25% { background-position: right 30% top 52%, left -140px bottom -2px, left -105px bottom -3px, left -420px bottom -2px; } 50% { background-position: right 27% top 48%, left -280px bottom, left -210px bottom, left -280px bottom; } 75% { background-position: right 30% top 52%, left -420px bottom -2px, left -315px bottom -3px, left -140px bottom -2px; } 100% { background-position: right 34% top 48%, left -560px bottom, left -420px bottom, left 0 bottom; } }
@keyframes sonnenglanz { 0%,100% { opacity:.5; } 50% { opacity:1; } }
@keyframes fischwechsel { 0.0% { background-position: left calc(100% + 300px) top 70%, left -260px top 80%, left calc(100% + 300px) top 84%, left calc(100% + 300px) top 62%, left -260px top 55%, left -260px top 55%, left -260px top 55%, right 30% top 55%; } 6.25% { background-position: left calc(100% + 300px) top 70%, left -260px top 80%, left calc(100% + 300px) top 84%, left calc(100% + 300px) top 62%, left 50% top 62%, left -260px top 55%, left -260px top 55%, right 30% top 55%; } 12.5% { background-position: left calc(100% + 300px) top 70%, left -260px top 80%, left calc(100% + 300px) top 84%, left calc(100% + 300px) top 62%, left calc(100% + 300px) top 55%, left -260px top 55%, left -260px top 55%, right 30% top 55%; } 18.75% { background-position: left calc(100% + 300px) top 70%, left -260px top 80%, left calc(100% + 300px) top 84%, left calc(100% + 300px) top 62%, left calc(100% + 300px) top 55%, left 50% top 62%, left -260px top 55%, right 30% top 55%; } 25.0% { background-position: left calc(100% + 300px) top 70%, left -260px top 80%, left calc(100% + 300px) top 84%, left calc(100% + 300px) top 62%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, left -260px top 55%, right 30% top 55%; } 31.25% { background-position: left calc(100% + 300px) top 70%, left -260px top 80%, left calc(100% + 300px) top 84%, left calc(100% + 300px) top 62%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, left 50% top 62%, right 30% top 55%; } 37.5% { background-position: left calc(100% + 300px) top 70%, left -260px top 80%, left calc(100% + 300px) top 84%, left calc(100% + 300px) top 62%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, right 30% top 55%; } 43.75% { background-position: left calc(100% + 300px) top 70%, left -260px top 80%, left calc(100% + 300px) top 84%, left 50% top 58%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, right 30% top 55%; } 50.0% { background-position: left calc(100% + 300px) top 70%, left -260px top 80%, left calc(100% + 300px) top 84%, left -260px top 62%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, right 30% top 55%; } 56.25% { background-position: left calc(100% + 300px) top 70%, left 50% top 84%, left calc(100% + 300px) top 84%, left -260px top 62%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, right 30% top 55%; } 62.5% { background-position: left calc(100% + 300px) top 70%, left calc(100% + 300px) top 80%, left calc(100% + 300px) top 84%, left -260px top 62%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, right 30% top 55%; } 68.75% { background-position: left calc(100% + 300px) top 70%, left calc(100% + 300px) top 80%, left 50% top 80%, left -260px top 62%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, right 30% top 55%; } 75.0% { background-position: left calc(100% + 300px) top 70%, left calc(100% + 300px) top 80%, left -260px top 84%, left -260px top 62%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, right 30% top 55%; } 81.25% { background-position: left 50% top 76%, left calc(100% + 300px) top 80%, left -260px top 84%, left -260px top 62%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, right 30% top 55%; } 87.5% { background-position: left -260px top 70%, left calc(100% + 300px) top 80%, left -260px top 84%, left -260px top 62%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, right 30% top 55%; } 93.75% { background-position: left -260px top 70%, left calc(100% + 300px) top 80%, left -260px top 84%, left -260px top 62%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, right 30% top 55%; } 100.0% { background-position: left -260px top 70%, left calc(100% + 300px) top 80%, left -260px top 84%, left -260px top 62%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, left calc(100% + 300px) top 55%, right 30% top 55%; } }
@keyframes farbton { 0%,100% { filter:hue-rotate(-8deg); } 50% { filter:hue-rotate(14deg); } }
@media (prefers-reduced-motion: reduce) { .card, .card::before, .card::after { animation:none; } }
.card.help { background:#eef4f9; border-color:#c7d9e8; animation:none; }
.card.help::before, .card.help::after { content:none; }
label { display:block; font-weight:600; margin-bottom:6px; }
.row { display:flex; gap:10px; flex-wrap:wrap; }
.row > * { flex:1 1 220px; }
input[type=text], select { width:100%; padding:12px 14px; font-size:1.05rem; border:1px solid var(--line); border-radius:8px; background:#fff; color:var(--ink); }
input[type=text]:focus, select:focus { outline:2px solid var(--accent); outline-offset:1px; border-color:var(--accent); }
button.go { flex:0 0 auto; padding:12px 22px; font-size:1.05rem; font-weight:600; color:#fff; background:var(--accent); border:0; border-radius:8px; cursor:pointer; }
button.go:hover { background:var(--accent2); }
.check { display:flex; align-items:center; gap:8px; margin-top:10px; color:var(--muted); font-size:.92rem; }
.check input { width:auto; }
.beispiele { margin-top:14px; border:1px solid var(--line); border-radius:10px; padding:10px 12px; background:#fafaf8; }
.beispiele-titel { margin:0; font-size:.8rem; font-weight:600; color:var(--muted); }
.chips { margin-top:8px; display:flex; flex-wrap:wrap; gap:8px; }
.chip { font-size:.82rem; padding:6px 10px; border:1px solid var(--line); border-radius:999px; background:#f7f7f5; cursor:pointer; color:var(--ink); }
.chip:hover { border-color:var(--accent); color:var(--accent); }
.error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; border-radius:10px; padding:14px 16px; margin-bottom:20px; }
.note { background:#f7f7f5; border:1px solid var(--line); color:#444444; border-radius:10px; padding:12px 16px; margin-bottom:20px; font-size:.93rem; }
.results { padding:0; overflow:hidden; }
.hidden { display:none; }
.results h2 { font-size:1.05rem; margin:0; padding:16px 20px 4px; }
.resrow { display:flex; align-items:center; gap:12px; padding:12px 20px; border-top:1px solid var(--line); }
.resrow .lbl { flex:0 0 46%; color:var(--muted); font-size:.9rem; }
.resrow .val { flex:1 1 auto; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:.95rem; word-break:break-all; }
.copy { flex:0 0 auto; font-size:.78rem; padding:5px 10px; border:1px solid var(--line); border-radius:6px; background:#f7f7f5; cursor:pointer; color:var(--muted); }
.copy:hover { border-color:var(--accent); color:var(--accent); }
.links { display:flex; flex-wrap:wrap; gap:10px; margin-top:4px; }
.links a, .links button { font-size:.9rem; color:var(--accent); text-decoration:none; border:1px solid var(--line); padding:8px 12px; border-radius:8px; background:#fff; font-family:inherit; }
.links button { cursor:pointer; }
.links a:hover, .links button:hover { border-color:var(--accent); }
.map { width:100%; height:300px; border:0; border-radius:10px; margin-top:14px; }
.help { font-size:.9rem; color:var(--muted); }
.help h2 { font-size:1rem; color:var(--ink); }
.help code { background:#e9e9e5; padding:1px 5px; border-radius:4px; font-size:.85rem; }
footer { margin-top:24px; font-size:.8rem; color:var(--muted); }
</style>
</head>
<body>
<div class="wrap">
<header>
<div class="schrift" role="group" aria-label="Schriftgrösse">
<button type="button" id="fontMinus" aria-label="Schrift verkleinern" title="Schrift verkleinern">A−</button>
<button type="button" id="fontReset" aria-label="Normale Schriftgrösse" title="Normale Schriftgrösse">A</button>
<button type="button" id="fontPlus" aria-label="Schrift vergrössern" title="Schrift vergrössern">A+</button>
</div>
<h1>Koordinaten-Konverter</h1>
<p>Koordinaten in <em>irgendeinem</em> Format einsetzen – alle anderen Formate werden automatisch berechnet.</p>
</header>

<form method="get" action="">
<div class="card">
<label for="q">Koordinaten</label>
<div class="row">
<input type="text" id="q" name="q" value="<?php echo $qHtml; ?>" placeholder="z. B. 48.8566, 2.3522" autofocus autocomplete="off">
<select name="f" aria-label="Format">
<option value="auto"<?php echo $f === 'auto' ? ' selected' : ''; ?>>Automatisch erkennen</option>
<option value="wgs84"<?php echo $f === 'wgs84' ? ' selected' : ''; ?>>WGS84 · Dezimalgrad</option>
<option value="dms"<?php echo $f === 'dms' ? ' selected' : ''; ?>>Grad / Minuten / Sekunden</option>
<option value="lv95"<?php echo $f === 'lv95' ? ' selected' : ''; ?>>Schweiz · LV95 (CH1903+)</option>
<option value="utm"<?php echo $f === 'utm' ? ' selected' : ''; ?>>UTM</option>
<option value="mgrs"<?php echo $f === 'mgrs' ? ' selected' : ''; ?>>MGRS</option>
<option value="mercator"<?php echo $f === 'mercator' ? ' selected' : ''; ?>>Web Mercator (EPSG:3857)</option>
</select>
<button class="go" type="submit">Umrechnen</button>
</div>
<div class="check">
<input type="checkbox" id="swap" name="swap" value="1"<?php echo $swap ? ' checked' : ''; ?>>
<label for="swap" style="margin:0;font-weight:400">Erste Zahl ist die Länge (lon, y) – nicht die Breite</label>
</div>
<div class="check">
<input type="checkbox" id="lv95force" name="lv95force" value="1"<?php echo $lv95force ? ' checked' : ''; ?>>
<label for="lv95force" style="margin:0;font-weight:400">LV95 immer anzeigen (auch ausserhalb der Schweiz)</label>
</div>
<div class="check">
<input type="checkbox" id="autoclear" checked>
<label for="autoclear" style="margin:0;font-weight:400">Feld beim Klicken automatisch leeren</label>
</div>
<div class="check">
<input type="checkbox" id="karte" checked>
<label for="karte" style="margin:0;font-weight:400">Karte anzeigen (OpenStreetMap wird erst beim Umrechnen geladen)</label>
</div>
<div class="beispiele">
<p class="beispiele-titel">Beispiele – zum Ausprobieren anklicken:</p>
<div class="chips">
<button type="button" class="chip" data-q="48.8566, 2.3522">WGS84 · Paris</button>
<button type="button" class="chip" data-q="41° 54' 10.1&quot; N, 12° 29' 47&quot; E">DMS · Rom</button>
<button type="button" class="chip" data-q="40°42‘46‘‘N 74°00‘22‘‘W">DMS · New York</button>
<button type="button" class="chip" data-q="N34 03.133 W118 14.622">Dezimalmin · Los Angeles</button>
<button type="button" class="chip" data-q="2624043, 1096620">LV95 · Zermatt</button>
<button type="button" class="chip" data-q="30U 699316 5710164">UTM · London</button>
<button type="button" class="chip" data-q="54SUE8843349290">MGRS · Tokio</button>
<button type="button" class="chip" data-q="-8238310, 4970072">Mercator · New York</button>
</div>
</div>
</div>
</form>

<?php if ($error !== null) { ?>
<div class="error"><strong> Eingabe nicht erkannt:</strong> <?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></div>
<?php } ?>

<?php if ($results !== null) { ?>
<div class="card results">
<h2>Umrechnung für <?php echo $latUrl; ?>, <?php echo $lonUrl; ?> (WGS84)</h2>
<?php foreach ($results as $r) { ?>
<div class="resrow">
<div class="lbl"><?php echo htmlspecialchars($r[0], ENT_QUOTES, 'UTF-8'); ?></div>
<div class="val"><?php echo htmlspecialchars($r[1], ENT_QUOTES, 'UTF-8'); ?></div>
<button type="button" class="copy" data-v="<?php echo htmlspecialchars($r[1], ENT_QUOTES, 'UTF-8'); ?>">Kopieren</button>
</div>
<?php } ?>
<div class="resrow">
<div class="lbl">Karten-Links</div>
<div class="links">
<a href="https://www.google.com/maps/search/?api=1&amp;query=<?php echo $latUrl; ?>,<?php echo $lonUrl; ?>" target="_blank" rel="noopener">Google Maps</a>
<a href="https://map.geo.admin.ch/?E=<?php echo $geoE; ?>&amp;N=<?php echo $geoN; ?>" target="_blank" rel="noopener">Swisstopo (geo.admin.ch)</a>
<a href="https://www.openstreetmap.org/?mlat=<?php echo $latUrl; ?>&amp;mlon=<?php echo $lonUrl; ?>#map=16/<?php echo $latUrl; ?>/<?php echo $lonUrl; ?>" target="_blank" rel="noopener">OpenStreetMap</a>
</div>
</div>
<div class="resrow">
<div class="lbl">Teilen</div>
<div class="links">
<button type="button" id="copyAll">Alle kopieren</button>
<button type="button" id="copyLink">Link kopieren</button>
</div>
</div>
</div>
<?php if ($note !== '') { ?>
<div class="note"><?php echo htmlspecialchars($note, ENT_QUOTES, 'UTF-8'); ?></div>
<?php } ?>
<div class="card">
<iframe id="osmmap" class="map" loading="lazy" title="Kartenausschnitt" src="https://www.openstreetmap.org/export/embed.html?bbox=<?php echo $bbox; ?>&amp;layer=mapnik&amp;marker=<?php echo $latUrl; ?>,<?php echo $lonUrl; ?>"></iframe>
</div>
<?php } ?>

<div class="card help">
<h2>Erkannte Eingabeformate</h2>
<p>Als Trennzeichen funktionieren Komma, Semikolon, Leerzeichen oder Schrägstrich. Dezimalpunkt oder Dezimalkomma sind erlaubt, Schweizer Tausendertrennung mit Apostroph (<code>2'624'043</code>) ebenfalls.</p>
<p><strong>Eingabebegrenzung:</strong> Ausser bei UTM/MGRS können nur Zahlen eingegeben werden. Bei UTM sind höchstens zwei Buchstaben erlaubt (z. B. <code>30U</code> oder <code>E … N …</code>), bei MGRS drei (<code>54SUE…</code>), bei Grad/Min/Sekunden nur N, S, E oder W. Das Eingabefeld filtert ungültige Zeichen sofort heraus.</p>
<ul>
<li><strong>WGS84 Dezimalgrad:</strong> <code>48.8566, 2.3522</code> (Breite zuerst; bei <code>2.3522, 48.8566</code> Häkchen «Erste Zahl ist die Länge» setzen)</li>
<li><strong>Grad/Minuten/Sekunden:</strong> <code>41°54'10.1"N 12°29'47"W</code> oder <code>41° 54' 10.1" N, 12° 29' 47" E</code> (auch Dezimalminuten: <code>48° 51.396' N</code>; auch typografische Zeichen ‘ ’ bzw. ‘‘ ’’ ” ´´ werden erkannt)</li>
<li><strong>Grad + Dezimalminuten (GPS):</strong> <code>N40 42.767 W74 00.367</code> (ohne Gradzeichen; Himmelsrichtung N/S/E/W vor oder nach den Zahlen)</li>
<li><strong>LV95 / CH1903+:</strong> <code>2624043, 1096620</code> (Ost 2'4xx xxx–2'9xx xxx, Nord 1'0xx xxx–1'4xx xxx)</li>
<li><strong>NAD83 (Nordamerika):</strong> geografische Koordinaten; die Werte entsprechen WGS84 (Abweichung typischerweise &lt; 2 m, weil NAD83 fest mit der nordamerikanischen Platte verbunden ist)</li>
<li><strong>UTM:</strong> <code>30U 699316 5710164</code> oder <code>699316, 5710164</code> (ohne Zone wird Zone 32 angenommen)</li>
<li><strong>MGRS:</strong> <code>54SUE8843349290</code> oder <code>54SUE 88433 49290</code></li>
<li><strong>Web Mercator (EPSG:3857, Google Maps):</strong> <code>-8238310, 4970072</code> – bei kleinen Werten, die auch als UTM interpretierbar sind, Format oben explizit wählen</li>
</ul>
</div>

<footer>
Genauigkeit: UTM/Mercator/MGRS rechnerisch auf Zentimeter genau; LV95 über die offiziellen Näherungsformeln von swisstopo (Abweichung typischerweise &lt; 0,2 m). Höhenangaben werden nicht umgerechnet. · <a href="datenschutz.html">Datenschutz</a>
</footer>
</div>

<script>
(function () {
  var el = document.getElementById('q');
  var sel = document.querySelector('select[name=f]');
  var autoclearEl = document.getElementById('autoclear');
  if (!el || !sel) { return; }
  var OKCHARS = '0123456789 ,;./*+-\t\'' + '\u2019\u2018\u201D\u00B4\u00B0"';
  var CFG = {
    wgs84:    { letters: '', max: 0 },
    lv95:     { letters: '', max: 0 },
    lv03:     { letters: '', max: 0 },
    mercator: { letters: '', max: 0 },
    dms:      { letters: 'NSEW', max: 2 },
    utm:      { letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', max: 2 },
    mgrs:     { letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', max: 3 },
    auto:     { letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', max: 3 }
  };
  function clean(v) {
    var cfg = CFG[sel.value] || CFG.auto;
    v = v.toUpperCase();
    var out = '';
    var n = 0;
    for (var i = 0; i < v.length; i++) {
      var c = v.charAt(i);
      if (c >= 'A' && c <= 'Z') {
        if (cfg.letters.indexOf(c) !== -1 && n < cfg.max) { out += c; n++; }
      } else if (OKCHARS.indexOf(c) !== -1) {
        out += c;
      }
    }
    return out;
  }
  el.addEventListener('input', function () {
    var v = clean(el.value);
    if (v !== el.value) { el.value = v; }
  });
  el.addEventListener('focus', function () {
    if (autoclearEl && autoclearEl.checked && el.value !== '') { el.value = ''; }
  });
  if (autoclearEl) {
    try {
      if (localStorage.getItem('konverter-autoclear') === '0') { autoclearEl.checked = false; }
    } catch (e) {}
    autoclearEl.addEventListener('change', function () {
      try { localStorage.setItem('konverter-autoclear', autoclearEl.checked ? '1' : '0'); } catch (e) {}
    });
  }
  var mapToggle = document.getElementById('karte');
  var mapFrame = document.getElementById('osmmap');
  if (mapToggle && mapFrame) {
    var mapSrcSaved = mapFrame.src;
    var karteAn = true;
    try {
      if (localStorage.getItem('konverter-karte') === '0') { karteAn = false; }
    } catch (e) {}
    mapToggle.checked = karteAn;
    if (!karteAn) {
      mapFrame.src = 'about:blank';
      mapFrame.classList.add('hidden');
    }
    mapToggle.addEventListener('change', function () {
      try { localStorage.setItem('konverter-karte', mapToggle.checked ? '1' : '0'); } catch (e) {}
      if (!mapToggle.checked) {
        mapSrcSaved = mapFrame.src;
        mapFrame.src = 'about:blank';
        mapFrame.classList.add('hidden');
      } else {
        if (mapSrcSaved && mapSrcSaved.indexOf('about:blank') !== 0) { mapFrame.src = mapSrcSaved; }
        mapFrame.classList.remove('hidden');
      }
    });
  }
  sel.addEventListener('change', function () {
    var v = clean(el.value);
    if (v !== el.value) { el.value = v; }
  });
})();
  var FONT_SIZES = [90, 100, 115, 130, 150];
  var fontIdx = 1;
  try {
    var savedFont = parseInt(localStorage.getItem('konverter-schrift'), 10);
    if (savedFont >= 0 && savedFont < FONT_SIZES.length) { fontIdx = savedFont; }
  } catch (e) {}
  function applyFont() {
    document.documentElement.style.fontSize = (16 * FONT_SIZES[fontIdx] / 100) + 'px';
    try { localStorage.setItem('konverter-schrift', String(fontIdx)); } catch (e) {}
  }
  applyFont();
  document.getElementById('fontMinus').addEventListener('click', function () {
    if (fontIdx > 0) { fontIdx--; applyFont(); }
  });
  document.getElementById('fontPlus').addEventListener('click', function () {
    if (fontIdx < FONT_SIZES.length - 1) { fontIdx++; applyFont(); }
  });
  document.getElementById('fontReset').addEventListener('click', function () {
    fontIdx = 1; applyFont();
  });

document.querySelectorAll('.chip').forEach(function (b) {
  b.addEventListener('click', function () {
    var el = document.getElementById('q');
    el.value = b.getAttribute('data-q');
    document.querySelector('select[name=f]').value = 'auto';
    el.closest('form').submit();
  });
});
function copyFeedback(btn) {
  var t = btn.textContent;
  btn.textContent = 'Kopiert \u2713';
  setTimeout(function () { btn.textContent = t; }, 1200);
}
var copyAllBtn = document.getElementById('copyAll');
if (copyAllBtn) {
  copyAllBtn.addEventListener('click', function () {
    var lines = [];
    document.querySelectorAll('.results .resrow').forEach(function (r) {
      if (r.querySelector('.links')) { return; }
      var lbl = r.querySelector('.lbl');
      var val = r.querySelector('.val');
      if (lbl && val) { lines.push(lbl.textContent + ': ' + val.textContent); }
    });
    if (navigator.clipboard && lines.length) {
      navigator.clipboard.writeText(lines.join('\n')).then(function () { copyFeedback(copyAllBtn); });
    }
  });
}
var copyLinkBtn = document.getElementById('copyLink');
if (copyLinkBtn) {
  copyLinkBtn.addEventListener('click', function () {
    var qEl = document.getElementById('q');
    var fSel = document.querySelector('select[name=f]');
    var params = new URLSearchParams();
    params.set('q', qEl.value);
    params.set('f', fSel.value);
    var swapEl = document.getElementById('swap');
    if (swapEl && swapEl.checked) { params.set('swap', '1'); }
    var url = location.origin + location.pathname + '?' + params.toString();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () { copyFeedback(copyLinkBtn); });
    }
  });
}
document.querySelectorAll('.copy').forEach(function (b) {
  b.addEventListener('click', function () {
    var v = b.getAttribute('data-v');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(v).then(function () {
        var t = b.textContent;
        b.textContent = 'Kopiert ✓';
        setTimeout(function () { b.textContent = t; }, 1200);
      });
    }
  });
});
</script>
<script>
(function () {
  try {
    if (location.protocol !== 'http:' && location.protocol !== 'https:') { return; }
    var d = { site: 'koordinaten', tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || ''), lang: (navigator.language || ''), ref: (document.referrer || '') };
    if (navigator.sendBeacon) { var fd = new FormData(); for (var k in d) { fd.append(k, d[k]); } navigator.sendBeacon('counter.php', fd); }
    else { fetch('counter.php', { method: 'POST', keepalive: true, body: new URLSearchParams(d) }).catch(function () {}); }
  } catch (e) {}
})();
</script>
</body>
</html>
<?php
}

if (PHP_SAPI !== 'cli') {
    renderPage();
}
