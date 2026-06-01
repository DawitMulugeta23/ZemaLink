<?php
session_name('ZEMALINK_SESSION');
ini_set('session.use_cookies', 0);
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['CONTENT_TYPE'] = 'application/json';

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/Database.php';
require_once __DIR__ . '/includes/AuthMiddleware.php';
require_once __DIR__ . '/services/EmailService.php';

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

$db = Database::getInstance();
$pdo = $db->getConnection();

// Login as admin
$email = 'admin@zemalink.com';
$password = 'admin123';  // need to check actual admin password

$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND role = 'admin'");
$stmt->execute([$email]);
$admin = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$admin) {
    echo "Admin not found, trying other admins...\n";
    $stmt = $pdo->query("SELECT id, name, email, role FROM users WHERE role = 'admin'");
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $a) {
        printf("  Admin: id=%d name=%s email=%s\n", $a['id'], $a['name'], $a['email']);
    }
} else {
    printf("Admin found: id=%d name=%s\n", $admin['id'], $admin['name']);
    // Check pending musicians
    $stmt = $pdo->query('SELECT id, name, is_approved FROM users WHERE role = "musician" AND is_approved = 0');
    $pending = $stmt->fetchAll(PDO::FETCH_ASSOC);
    printf("Pending musicians: %d\n", count($pending));
    foreach ($pending as $m) {
        printf("  id=%d name=%s\n", $m['id'], $m['name']);
        
        // Simulate the POST body
        $input = ['user_id' => (int)$m['id']];
        $userId = $input['user_id'];
        printf("  Testing approve for id=%d...\n", $userId);
        
        $upd = $pdo->prepare("UPDATE users SET is_approved = 1 WHERE id = ? AND role = 'musician'");
        $upd->execute([$userId]);
        $affected = $upd->rowCount();
        printf("  Affected rows: %d\n", $affected);
        
        if ($affected === 0) {
            echo "  FAIL: No rows affected!\n";
            // Check if user is already approved
            $chk = $pdo->query("SELECT id, is_approved FROM users WHERE id = {$m['id']}");
            $row = $chk->fetch(PDO::FETCH_ASSOC);
            printf("  Current state: %s\n", json_encode($row));
        }
    }
    
    // Reset pending for id=4 back
    $pdo->prepare("UPDATE users SET is_approved = 0 WHERE id = 4 AND role = 'musician'")->execute([4]);
    echo "\nReset pending musician id=4 back to unapproved\n";
}
