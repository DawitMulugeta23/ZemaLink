<?php
// Simulate the exact PHP backend flow
session_name('ZEMALINK_SESSION');
$_SERVER['REQUEST_METHOD'] = 'POST';

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
require 'includes/functions.php';

$pdo = getDatabaseConnection();

// Simulate handleApproveMusician
$userId = 4; // dave - pending musician
echo "Testing approve for user_id=$userId\n";

// The exact query from handleApproveMusician
$stmt = $pdo->prepare("UPDATE users SET is_approved = 1 WHERE id = ? AND role = 'musician'");
$stmt->execute([$userId]);
$affected = $stmt->rowCount();

echo "Affected rows: $affected\n";

if ($affected > 0) {
    echo "SUCCESS: User approved\n";
} else {
    echo "FAIL: No rows affected\n";
    // Check current state
    $chk = $pdo->prepare("SELECT id, role, is_approved FROM users WHERE id = ?");
    $chk->execute([$userId]);
    echo "Current state: " . json_encode($chk->fetch(PDO::FETCH_ASSOC)) . "\n";
}

// Reset back
$pdo->prepare("UPDATE users SET is_approved = 0 WHERE id = ?")->execute([$userId]);
echo "Reset back to pending\n";

// Now test reject flow
$userId = 4;
echo "\nTesting reject for user_id=$userId\n";

$stmt = $pdo->prepare("UPDATE users SET role = 'audience', is_approved = 1 WHERE id = ? AND role = 'musician' AND is_approved = 0");
$stmt->execute([$userId]);
$affected = $stmt->rowCount();

echo "Affected rows: $affected\n";

// Reset back
$pdo->prepare("UPDATE users SET role = 'musician', is_approved = 0 WHERE id = ?")->execute([$userId]);
echo "Reset musician back to pending\n";
