<?php
require_once __DIR__ . '/../integrations.php';

$host = zemalink_env('DB_HOST', 'localhost');
$dbname = zemalink_env('DB_NAME', 'zema_music');
$username = zemalink_env('DB_USER', 'root');
$password = zemalink_env('DB_PASSWORD', '');

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
}
?>