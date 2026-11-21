<?php
declare(strict_types=1);

/*
 * ort-db.php – naechster Ort im Umkreis aus MySQL/MariaDB (Haversine).
 *
 * Aufruf (nur same-origin, von sonne-mond.html):
 *   ort-db.php?lat=47.3779&lon=8.5403&maxkm=60
 *   -> 200 JSON {"name":"Zuerich","lat":47.377,"lon":8.542,"cc":"CH","distKm":0.16}
 *   -> 404 JSON {"error":"..."} wenn kein Ort im Umkreis
 *   -> 400/500 JSON {"error":"..."} bei falschen Parametern / DB-Fehler
 *   ort-db.php?count=1  -> 200 JSON {"count":65076} (Kontrolle nach dem Import)
 *
 * Setup: ort-db.sql in eine MySQL/MariaDB-Datenbank importieren, dann unten
 * DB_HOST/DB_NAME/DB_USER/DB_PASS anpassen. Ohne PHP/MySQL (z. B. GitHub Pages)
 * antwortet die Datei nicht – sonne-mond.html faellt dann auf die lokale
 * js/ort-db.js zurueck (Offline-Fallback).
 *
 * Haertung: prepared statements (PDO), Parameter-Validierung, nosniff/CSP/no-store,
 * JSON-Ausgabe mit UNESCAPED_UNICODE, keine Logs mit Koordinaten.
 */

const DB_HOST = 'localhost';
const DB_NAME = 'notfallblatt';
const DB_USER = 'CHANGEME';
const DB_PASS = 'CHANGEME';
const DEFAULT_MAXKM = 60.0;
const MAX_MAXKM = 500.0;

function ortDbHeaders(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: default-src 'none'");
    header('Referrer-Policy: no-referrer');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex');
}

function ortDbOut(int $code, array $payload): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function ortDbFail(int $code, string $msg): void
{
    ortDbOut($code, ['error' => $msg]);
}

function ortDbConnect(): PDO
{
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

ortDbHeaders();

// Parameter validieren
$rawLat = $_GET['lat'] ?? null;
$rawLon = $_GET['lon'] ?? null;
$lat = is_numeric($rawLat) ? (float) $rawLat : null;
$lon = is_numeric($rawLon) ? (float) $rawLon : null;
if ($lat === null || $lon === null || abs($lat) > 90.0 || abs($lon) > 180.0) {
    ortDbFail(400, 'Parameter lat/lon fehlen oder sind ungueltig (lat +-90, lon +-180).');
}
$maxkm = DEFAULT_MAXKM;
if (isset($_GET['maxkm']) && is_numeric($_GET['maxkm'])) {
    $maxkm = (float) $_GET['maxkm'];
    if ($maxkm < 1.0 || $maxkm > MAX_MAXKM) {
        ortDbFail(400, 'maxkm muss zwischen 1 und ' . MAX_MAXKM . ' liegen.');
    }
}

try {
    $pdo = ortDbConnect();
} catch (Throwable $e) {
    ortDbFail(500, 'Datenbank nicht erreichbar (DB_* in ort-db.php anpassen + ort-db.sql importieren).');
}

// Import-Kontrolle: ort-db.php?count=1
if (isset($_GET['count'])) {
    try {
        $c = (int) $pdo->query('SELECT COUNT(*) FROM orte')->fetchColumn();
        ortDbOut(200, ['count' => $c]);
    } catch (Throwable $e) {
        ortDbFail(500, 'Tabelle orte fehlt – ort-db.sql importieren.');
    }
}

// Bounding-Box als Vorfilter (Index auf lat/lon), dann Haversine (6371 km Erdradius)
$dLat = $maxkm / 111.0;
$dLon = $maxkm / (111.0 * max(0.01, cos(deg2rad($lat))));
$sql = 'SELECT name, lat, lon, cc,
          6371.0 * ACOS(LEAST(1.0,
            COS(RADIANS(?)) * COS(RADIANS(lat)) * COS(RADIANS(?) - RADIANS(lon))
            + SIN(RADIANS(?)) * SIN(RADIANS(lat))
          )) AS distKm
        FROM orte
        WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
        ORDER BY distKm
        LIMIT 1';
try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $lat, $lon, $lat,                 // Haversine-Parameter
        $lat - $dLat, $lat + $dLat,        // Bounding-Box lat
        $lon - $dLon, $lon + $dLon,        // Bounding-Box lon
    ]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    ortDbFail(500, 'Abfrage fehlgeschlagen.');
}

if (!$row || (float) $row['distKm'] > $maxkm) {
    ortDbFail(404, 'Kein Ort im Umkreis von ' . $maxkm . ' km.');
}

ortDbOut(200, [
    'name' => (string) $row['name'],
    'lat' => (float) $row['lat'],
    'lon' => (float) $row['lon'],
    'cc' => (string) $row['cc'],
    'distKm' => round((float) $row['distKm'], 2),
]);
