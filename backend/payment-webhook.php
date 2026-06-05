<?php

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

require_once __DIR__ . '/vendor/autoload.php';

if (class_exists('Dotenv\Dotenv')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->safeLoad();
} else {
    $envFile = __DIR__ . '/.env';
    if (is_file($envFile)) {
        $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            if ($key !== '') {
                $_ENV[$key] = $value;
                putenv("{$key}={$value}");
            }
        }
    }
}

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/Database.php';
require_once __DIR__ . '/includes/AuthMiddleware.php';
require_once __DIR__ . '/services/ChapaService.php';
require_once __DIR__ . '/services/EmailService.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDatabaseConnection();
$chapaService = new ChapaService();
$emailService = new EmailService();

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

error_log('Chapa Webhook received: ' . ($rawInput ?? 'empty payload'));

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payload']);
    exit();
}

// Verify HMAC signature if present (Chapa standard webhook security)
$signature = $_SERVER['HTTP_CHAPA_SIGNATURE'] ?? $_SERVER['HTTP_X_CHAPA_SIGNATURE'] ?? '';
$secretKey = $_ENV['CHAPA_SECRET_KEY'] ?? getenv('CHAPA_SECRET_KEY') ?: '';
if ($signature !== '' && $secretKey !== '' && $secretKey !== 'YOUR_CHAPA_SECRET_KEY_HERE') {
    $expected = hash_hmac('sha256', $rawInput, $secretKey);
    if (!hash_equals($expected, $signature)) {
        error_log('Chapa Webhook: Invalid HMAC signature');
        http_response_code(403);
        echo json_encode(['error' => 'Invalid signature']);
        exit();
    }
}

// Legacy secret check (fallback)
if (!empty($data['secret'])) {
    $expectedSecret = $secretKey;
    if ($expectedSecret !== '' && $expectedSecret !== 'YOUR_CHAPA_SECRET_KEY_HERE' && $data['secret'] !== $expectedSecret) {
        error_log('Chapa Webhook: Invalid secret');
        http_response_code(403);
        echo json_encode(['error' => 'Invalid secret']);
        exit();
    }
}

$txRef = trim((string) ($data['tx_ref'] ?? ''));
$status = trim((string) ($data['status'] ?? ''));

if ($status !== 'success' || $txRef === '') {
    http_response_code(200);
    echo json_encode(['status' => 'ignored', 'message' => 'Non-success or missing reference']);
    exit();
}

// Duplicate prevention
$checkDup = $pdo->prepare("SELECT id FROM payments WHERE transaction_id = ?");
$checkDup->execute([$txRef]);
if ($checkDup->fetch()) {
    error_log("Chapa Webhook: Duplicate webhook for {$txRef}, already processed");
    http_response_code(200);
    echo json_encode(['status' => 'already_processed']);
    exit();
}

$verifyResult = $chapaService->verifyPayment($txRef);

if (!$verifyResult['success']) {
    error_log("Chapa Webhook: Verification failed for tx_ref={$txRef}");
    http_response_code(200);
    echo json_encode(['status' => 'verification_failed']);
    exit();
}

$verificationStatus = $verifyResult['status'] ?? '';
if ($verificationStatus !== 'success') {
    error_log("Chapa Webhook: Payment not completed for tx_ref={$txRef}");
    http_response_code(200);
    echo json_encode(['status' => 'not_completed']);
    exit();
}

$chapaData = $verifyResult['data']['data'] ?? [];
$paidAmount = (float) ($chapaData['amount'] ?? 0);
$currency = (string) ($chapaData['currency'] ?? 'ETB');

try {
    if (str_starts_with($txRef, 'SONG_')) {
        handleSongPurchase($pdo, $txRef, $paidAmount, $emailService);
    } elseif (str_starts_with($txRef, 'SUB_')) {
        handleSubscriptionUpgrade($pdo, $txRef, $paidAmount, $emailService);
    } elseif (str_starts_with($txRef, 'TKT_')) {
        handleTicketPurchase($pdo, $txRef, $paidAmount, $emailService);
    } elseif (str_starts_with($txRef, 'ZEMA_')) {
        handleGenericPayment($pdo, $txRef, $paidAmount, $emailService);
    } else {
        error_log("Chapa Webhook: Unknown tx_ref prefix: {$txRef}");
    }
} catch (Throwable $e) {
    error_log("Chapa Webhook error for {$txRef}: " . $e->getMessage());
}

http_response_code(200);
echo json_encode(['status' => 'success']);
exit();

function handleSongPurchase(PDO $pdo, string $txRef, float $amount, EmailService $emailService): void
{
    preg_match('/SONG_(\d+)_(\d+)_/', $txRef, $matches);
    $userId = (int) ($matches[1] ?? 0);
    $songId = (int) ($matches[2] ?? 0);

    if ($userId <= 0 || $songId <= 0) {
        error_log("Chapa Webhook: Invalid song tx_ref format: {$txRef}");
        return;
    }

    $check = $pdo->prepare("SELECT id FROM user_purchases WHERE user_id = ? AND song_id = ?");
    $check->execute([$userId, $songId]);
    if ($check->fetch()) {
        error_log("Chapa Webhook: Song {$songId} already purchased by user {$userId}");
        return;
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO payments (user_id, song_id, amount, payment_type, status, transaction_id) 
             VALUES (?, ?, ?, 'song', 'completed', ?)"
        );
        $stmt->execute([$userId, $songId, $amount, $txRef]);
        $paymentId = $pdo->lastInsertId();

        $pdo->prepare(
            "INSERT INTO user_purchases (user_id, song_id, payment_id) VALUES (?, ?, ?)"
        )->execute([$userId, $songId, $paymentId]);

        $pdo->commit();

        $user = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
        $user->execute([$userId]);
        $u = $user->fetch();

        $song = $pdo->prepare("SELECT title FROM songs WHERE id = ?");
        $song->execute([$songId]);
        $s = $song->fetch();

        if ($u && $s) {
            $emailService->sendPaymentConfirmation($u['email'], [
                'name' => $u['name'],
                'label' => 'Song: ' . $s['title'],
                'amount' => $amount,
            ]);
        }

        error_log("Chapa Webhook: Song {$songId} purchased by user {$userId}, payment {$paymentId}");
    } catch (Throwable $e) {
        $pdo->rollBack();
        error_log("Chapa Webhook song purchase failed: " . $e->getMessage());
    }
}

function handleSubscriptionUpgrade(PDO $pdo, string $txRef, float $amount, EmailService $emailService): void
{
    preg_match('/SUB_(\d+)_/', $txRef, $matches);
    $userId = (int) ($matches[1] ?? 0);

    if ($userId <= 0) {
        error_log("Chapa Webhook: Invalid subscription tx_ref format: {$txRef}");
        return;
    }

    $plan = str_contains($txRef, 'YEARLY') ? 'yearly' : 'monthly';
    $months = $plan === 'yearly' ? 12 : 1;
    $expires = date('Y-m-d', strtotime("+{$months} months"));

    $pdo->prepare("UPDATE users SET subscription = 'premium', subscription_expires = ? WHERE id = ?")
        ->execute([$expires, $userId]);

    $pdo->prepare(
        "INSERT INTO payments (user_id, amount, payment_type, status, transaction_id) 
         VALUES (?, ?, 'subscription', 'completed', ?)"
    )->execute([$userId, $amount, $txRef]);

    $user = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
    $user->execute([$userId]);
    $u = $user->fetch();

    if ($u) {
        $emailService->sendPaymentConfirmation($u['email'], [
            'name' => $u['name'],
            'label' => 'Premium Subscription (' . ucfirst($plan) . ')',
            'amount' => $amount,
        ]);
    }

    error_log("Chapa Webhook: Subscription activated for user {$userId}, plan={$plan}");
}

function handleTicketPurchase(PDO $pdo, string $txRef, float $amount, EmailService $emailService): void
{
    preg_match('/TKT_(\d+)_(\d+)_/', $txRef, $matches);
    $userId = (int) ($matches[1] ?? 0);
    $eventId = (int) ($matches[2] ?? 0);

    if ($userId <= 0 || $eventId <= 0) {
        error_log("Chapa Webhook: Invalid ticket tx_ref format: {$txRef}");
        return;
    }

    $check = $pdo->prepare("SELECT id FROM tickets WHERE user_id = ? AND event_id = ?");
    $check->execute([$userId, $eventId]);
    if ($check->fetch()) {
        error_log("Chapa Webhook: Ticket already exists for user {$userId}, event {$eventId}");
        return;
    }

    $event = $pdo->prepare("SELECT title, total_tickets, tickets_sold FROM events WHERE id = ?");
    $event->execute([$eventId]);
    $e = $event->fetch();

    if (!$e) {
        error_log("Chapa Webhook: Event {$eventId} not found");
        return;
    }

    if ((int) $e['tickets_sold'] >= (int) $e['total_tickets']) {
        error_log("Chapa Webhook: Event {$eventId} is sold out");
        return;
    }

    $ticketCode = 'TKT-' . strtoupper(bin2hex(random_bytes(4))) . '-' . $eventId;

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO payments (user_id, event_id, amount, payment_type, status, transaction_id) 
             VALUES (?, ?, ?, 'ticket', 'completed', ?)"
        );
        $stmt->execute([$userId, $eventId, $amount, $txRef]);
        $paymentId = $pdo->lastInsertId();

        $pdo->prepare(
            "INSERT INTO tickets (user_id, event_id, payment_id, ticket_code) VALUES (?, ?, ?, ?)"
        )->execute([$userId, $eventId, $paymentId, $ticketCode]);

        $pdo->prepare("UPDATE events SET tickets_sold = tickets_sold + 1 WHERE id = ?")
            ->execute([$eventId]);

        $pdo->commit();

        $user = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
        $user->execute([$userId]);
        $u = $user->fetch();

        if ($u && $e) {
            $emailService->sendPaymentConfirmation($u['email'], [
                'name' => $u['name'],
                'label' => 'Ticket: ' . $e['title'],
                'amount' => $amount,
            ]);
        }

        error_log("Chapa Webhook: Ticket {$ticketCode} purchased for event {$eventId} by user {$userId}");
    } catch (Throwable $e) {
        $pdo->rollBack();
        error_log("Chapa Webhook ticket purchase failed: " . $e->getMessage());
    }
}

function handleGenericPayment(PDO $pdo, string $txRef, float $amount, EmailService $emailService): void
{
    preg_match('/ZEMA_(\d+)_/', $txRef, $matches);
    $userId = (int) ($matches[1] ?? 0);

    $pdo->prepare(
        "INSERT INTO payments (user_id, amount, payment_type, status, transaction_id) 
         VALUES (?, ?, 'general', 'completed', ?)"
    )->execute([$userId, $amount, $txRef]);

    error_log("Chapa Webhook: Generic payment {$txRef} processed for user {$userId}");
}
