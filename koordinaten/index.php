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
            'note' => 'Keine UTM-Zone angegeben – es wurde Zone 32 angenommen. Gib die Zone am besten mit an, z. B. «32T 465403 5247150».');
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
            throw new RuntimeException('Bei MGRS sind höchstens 3 Buchstaben erlaubt (z. B. 32TMT…).');
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
            throw new RuntimeException('Format unbekannt: MGRS nicht erkannt. Beispiel: 32TMT6540247150 oder 32T MT 65402 47150.');
        }
        return array('lat' => $ll['lat'], 'lon' => $ll['lon'], 'note' => 'MGRS erkannt.');
    }

    if ($mode === 'dms') {
        $ll = parseDmsString($raw);
        if ($ll === null) {
            $ll = parseDmmString($raw);
        }
        if ($ll === null) {
            throw new RuntimeException('Format unbekannt: Grad/Minuten/Sekunden nicht erkannt. Beispiel: 37° 42\' 10" N, 111° 23\' 16" W oder N37 09.729 W111 42.701');
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
            throw new RuntimeException('Bitte Ost und Nord angeben, z. B. 2\'683\'303, 1\'247\'925');
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
            throw new RuntimeException('Bitte Zone (optional), Ost und Nord angeben, z. B. 32T 465403 5247150');
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
            $note = 'Keine Zone angegeben – Zone 32 angenommen. Beispiel mit Zone: «32T 465403 5247150».';
        }
        return array('lat' => $ll['lat'], 'lon' => $ll['lon'], 'note' => $note);
    }

    if ($mode === 'auto') {
        $ll = parseDmmString($raw);
        if ($ll !== null) {
            $ll['lon'] = normalizeLon($ll['lon']);
            $ll['note'] = 'Grad + Dezimalminuten erkannt (z. B. N37 09.729 W111 42.701).';
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

    throw new RuntimeException('Format unbekannt. Beispiele: «47.376895, 8.541694» · «37° 42\' 10" N, 111° 23\' 16" W» · «2683303, 1247925» (LV95) · «32T 465403 5247150» (UTM) · «32TMT6540247150» (MGRS)');
}

function formatNum(float $v, int $dec): string
{
    return number_format($v, $dec, '.', '');
}

function buildResults(float $lat, float $lon): array
{
    $lv95 = latlonToLv95($lat, $lon);
    $utm = latlonToUtm($lat, $lon);
    $merc = latlonToMercator($lat, $lon);
    $mgrs = latlonToMgrs($lat, $lon);

    return array(
        array('WGS84 · Dezimalgrad (Breite, Länge)', formatNum($lat, 6) . ', ' . formatNum($lon, 6)),
        array('WGS84 · Grad, Minuten, Sekunden', formatDms($lat, $lon)),
        array('WGS84 · Dezimalgrad (Länge, Breite) — GeoJSON/Leaflet', formatNum($lon, 6) . ', ' . formatNum($lat, 6)),
        array('NAD83 (Nordamerika) · geografisch (B, L)', formatNum($lat, 6) . ', ' . formatNum($lon, 6)),
        array('Schweiz · LV95 / CH1903+ (Ost, Nord)', formatNum($lv95['east'], 1) . ', ' . formatNum($lv95['north'], 1)),
        array('UTM (Zone, Ost, Nord)', sprintf('%d%s %s %s', $utm['zone'], latBand($lat), formatNum($utm['east'], 2), formatNum($utm['north'], 2))),
        array('MGRS / USNG (1 m)', $mgrs),
        array('Web Mercator · EPSG:3857 (Google Maps) (X, Y)', formatNum($merc['x'], 2) . ', ' . formatNum($merc['y'], 2)),
    );
}

function renderPage(): void
{
    $q = isset($_GET['q']) ? (string) $_GET['q'] : '';
    $f = isset($_GET['f']) ? (string) $_GET['f'] : 'auto';
    $swap = !empty($_GET['swap']);
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
            $results = buildResults($lat, $lon);
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
<meta name="description" content="Koordinaten online umrechnen: WGS84 (Dezimalgrad), Grad/Minuten/Sekunden, Schweizer LV95/CH1903+, NAD83, UTM, MGRS und Web Mercator (EPSG:3857 / Google Maps).">
<style>
:root { --bg:#f0f0ee; --card:#ffffff; --ink:#1c1c1c; --muted:#6b6b6b; --line:#d8d8d4; --accent:#d52b1e; --accent2:#a91e14; }
* { box-sizing: border-box; }
body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background:var(--bg); color:var(--ink); line-height:1.5; }
.schrift { display:flex; justify-content:flex-end; gap:6px; margin-bottom:2px; }
.schrift button { font-size:.85rem; padding:4px 12px; border:1px solid var(--line); border-radius:8px; background:#fff; color:var(--ink); cursor:pointer; font-family:inherit; }
.schrift button:hover { border-color:var(--accent); color:var(--accent); }
.wrap { max-width: 880px; margin: 0 auto; padding: 24px 16px 48px; }
header h1 { font-size: 1.6rem; margin: 8px 0 4px; }
header p { color: var(--muted); margin: 0 0 20px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(16,24,40,.06); margin-bottom: 20px; }
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
<input type="text" id="q" name="q" value="<?php echo $qHtml; ?>" placeholder="z. B. 47.376895, 8.541694" autofocus autocomplete="off">
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
<button type="button" class="chip" data-q="2683303, 1247925">LV95 · Zürich</button>
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
<p>Als Trennzeichen funktionieren Komma, Semikolon, Leerzeichen oder Schrägstrich. Dezimalpunkt oder Dezimalkomma sind erlaubt, Schweizer Tausendertrennung mit Apostroph (<code>2'683'303</code>) ebenfalls.</p>
<p><strong>Eingabebegrenzung:</strong> Ausser bei UTM/MGRS können nur Zahlen eingegeben werden. Bei UTM sind höchstens zwei Buchstaben erlaubt (z. B. <code>32T</code> oder <code>E … N …</code>), bei MGRS drei (<code>32TMT…</code>), bei Grad/Min/Sekunden nur N, S, E oder W. Das Eingabefeld filtert ungültige Zeichen sofort heraus.</p>
<ul>
<li><strong>WGS84 Dezimalgrad:</strong> <code>47.376895, 8.541694</code> (Breite zuerst; bei <code>8.541694, 47.376895</code> Häkchen «Erste Zahl ist die Länge» setzen)</li>
<li><strong>Grad/Minuten/Sekunden:</strong> <code>37°42'10"N 111°23'16"W</code> oder <code>47° 22' 36.8" N, 8° 32' 30.1" E</code> (auch Dezimalminuten: <code>47° 22.615' N</code>; auch typografische Zeichen ‘ ’ bzw. ‘‘ ’’ ” ´´ werden erkannt)</li>
<li><strong>Grad + Dezimalminuten (GPS):</strong> <code>N37 09.729 W111 42.701</code> (ohne Gradzeichen; Himmelsrichtung N/S/E/W vor oder nach den Zahlen)</li>
<li><strong>LV95 / CH1903+:</strong> <code>2683303, 1247925</code> (Ost 2'4xx xxx–2'9xx xxx, Nord 1'0xx xxx–1'4xx xxx)</li>
<li><strong>NAD83 (Nordamerika):</strong> geografische Koordinaten; die Werte entsprechen WGS84 (Abweichung typischerweise &lt; 2 m, weil NAD83 fest mit der nordamerikanischen Platte verbunden ist)</li>
<li><strong>UTM:</strong> <code>32T 465403 5247150</code> oder <code>465403, 5247150</code> (ohne Zone wird Zone 32 angenommen)</li>
<li><strong>MGRS:</strong> <code>32TMT6540247150</code> oder <code>32T MT 65402 47150</code></li>
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
</body>
</html>
<?php
}

if (PHP_SAPI !== 'cli') {
    renderPage();
}
