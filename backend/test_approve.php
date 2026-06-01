<?php
// Manual dotenv
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

$stmt = $pdo->query('SELECT id, name, role, is_approved FROM users WHERE role = "musician"');
echo "=== Current Musicians ===\n";
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $u) {
    printf("  id=%d name=%s is_approved=%d\n", $u['id'], $u['name'], $u['is_approved']);
}

// Create a test pending musician
$pw = password_hash('test1234', PASSWORD_DEFAULT);
$pdo->prepare("INSERT INTO users (name, email, password, role, is_approved, email_verified) VALUES (?, ?, ?, ?, ?, ?)")
    ->execute(['Test Pending Musician', 'test.pending@test.com', $pw, 'musician', 0, 1]);
$newId = (int)$pdo->lastInsertId();
echo "\nCreated test pending musician id=$newId\n";

// Test approve
$stmt = $pdo->prepare("UPDATE users SET is_approved = 1 WHERE id = ? AND role = 'musician'");
$stmt->execute([$newId]);
printf("Approve affected rows: %d\n", $stmt->rowCount());

// Verify
$stmt = $pdo->query("SELECT is_approved FROM users WHERE id = $newId");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
printf("After approve: is_approved=%s\n", json_encode($row));

// Reject test - create another
$pw2 = password_hash('test1234', PASSWORD_DEFAULT);
$pdo->prepare("INSERT INTO users (name, email, password, role, is_approved, email_verified) VALUES (?, ?, ?, ?, ?, ?)")
    ->execute(['Test Pending Musician 2', 'test.pending2@test.com', $pw2, 'musician', 0, 1]);
$newId2 = (int)$pdo->lastInsertId();
echo "\nCreated test pending musician id=$newId2\n";

// Test reject
$stmt = $pdo->prepare("UPDATE users SET role = 'audience', is_approved = 1 WHERE id = ? AND role = 'musician' AND is_approved = 0");
$stmt->execute([$newId2]);
printf("Reject affected rows: %d\n", $stmt->rowCount());

// Verify
$stmt = $pdo->query("SELECT id, role, is_approved FROM users WHERE id = $newId2");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
printf("After reject: %s\n", json_encode($row));

// Clean up
$pdo->prepare("DELETE FROM users WHERE email IN ('test.pending@test.com', 'test.pending2@test.com')")->execute();
echo "\nCleaned up test users\n";
