<?php
$envFile = __DIR__ . '/.env';
if (is_file($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key); $value = trim($value);
        if ($key !== '') { $_ENV[$key] = $value; putenv("{$key}={$value}"); }
    }
}
require 'config/database.php';
$pdo = getDatabaseConnection();

$stmt = $pdo->query("DESCRIBE users");
echo "=== users table schema ===\n";
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $col) {
    printf("  %-25s %-15s %s\n", $col['Field'], $col['Type'], $col['Null'] === 'NO' ? 'NOT NULL' : '');
}

$stmt = $pdo->query('SELECT id, name, role, CAST(is_approved AS UNSIGNED) as is_app, is_approved FROM users WHERE role = "musician" AND is_approved = 0');
echo "\n=== Pending musicians query ===\n";
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
    printf("  %s\n", json_encode($r));
}
