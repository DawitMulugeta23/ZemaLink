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

echo "=== All users ===\n";
$stmt = $pdo->query('SELECT id, name, email, role, is_approved, email_verified FROM users ORDER BY id');
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $u) {
    printf("  id=%d name=%-20s email=%-35s role=%-10s is_approved=%d verified=%d\n", 
        $u['id'], $u['name'], $u['email'], $u['role'], $u['is_approved'], $u['email_verified']);
}
