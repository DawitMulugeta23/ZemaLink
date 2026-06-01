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

// User id=4 - full details
$stmt = $pdo->query("SELECT * FROM users WHERE id = 4");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
echo "User id=4:\n";
foreach ($row as $k => $v) {
    printf("  %s = %s\n", $k, $v);
}

// Count musicians by approval status
echo "\n--- Musicians breakdown ---\n";
$stmt = $pdo->query('SELECT is_approved, COUNT(*) as cnt FROM users WHERE role = "musician" GROUP BY is_approved');
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
    printf("  is_approved=%d: %d users\n", $r['is_approved'], $r['cnt']);
}

// All musicians
echo "\n--- All Musicians ---\n";
$stmt = $pdo->query('SELECT id, name, email, role, is_approved FROM users WHERE role = "musician"');
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $u) {
    printf("  id=%d name=%s email=%s is_approved=%d\n", $u['id'], $u['name'], $u['email'], $u['is_approved']);
}
