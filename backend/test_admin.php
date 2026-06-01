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

$stmt = $pdo->query('SELECT id, name, email, role, is_approved FROM users WHERE role = "admin"');
echo "=== Admin users ===\n";
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $a) {
    printf("  id=%d name=%s email=%s is_approved=%d\n", $a['id'], $a['name'], $a['email'], $a['is_approved']);
}

// Check if admin user #5 exists directly
$stmt = $pdo->prepare('SELECT id, name, email, role, is_approved FROM users WHERE email = ?');
$stmt->execute(['dawitmulugetas23@gmail.com']);
$user5 = $stmt->fetch(PDO::FETCH_ASSOC);
if ($user5) {
    printf("\nUser 5: %s\n", json_encode($user5));
}
