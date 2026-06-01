<?php
require 'config/database.php';
$pdo = getDatabaseConnection();
$stmt = $pdo->query('SELECT id, name, email, role, is_approved FROM users WHERE role = "musician" AND is_approved = 0');
$pending = $stmt->fetchAll(PDO::FETCH_ASSOC);
if ($pending) {
    echo 'Found pending musicians: ' . count($pending) . "\n";
    foreach ($pending as $u) {
        echo json_encode($u) . "\n";
    }
} else {
    echo "No pending musicians found\n";
    $stmt = $pdo->query('SELECT id, name, email, role, is_approved FROM users LIMIT 5');
    echo "Sample users:\n";
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $u) {
        echo json_encode($u) . "\n";
    }
}
