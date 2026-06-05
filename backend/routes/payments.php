<?php

switch ($method) {
    case 'GET':
        if ($sub === 'verify-song' && isset($_GET['tx_ref'])) {
            handleVerifySongPayment($pdo, $auth, $chapaService);
        }
        if ($sub === 'verify-subscription' && isset($_GET['tx_ref'])) {
            handleVerifySubscription($pdo, $auth, $chapaService, $emailService);
        }
        if ($sub === 'verify-ticket' && isset($_GET['tx_ref'])) {
            handleVerifyTicketPayment($pdo, $auth, $chapaService);
        }
        api_error('Payment route not found', 404);

    case 'POST':
        match ($sub) {
            'initiate-song' => handleInitiateSongPayment($pdo, $auth, $chapaService),
            'initiate-subscription' => handleInitiateSubscription($pdo, $auth, $chapaService),
            'initiate-ticket' => handleInitiateTicketPayment($pdo, $auth, $chapaService),
            'purchase-song-mock' => handleMockSongPurchase($pdo, $auth, $emailService),
            'purchase-ticket-mock' => handleMockTicketPurchase($pdo, $auth, $emailService),
            'verify-song' => handleVerifySongPayment($pdo, $auth, $chapaService),
            'verify-subscription' => handleVerifySubscription($pdo, $auth, $chapaService),
            'verify-ticket' => handleVerifyTicketPayment($pdo, $auth, $chapaService),
            default => api_error('Payment route not found', 404),
        };
        break;

    default:
        api_error('Method not allowed', 405);
}

function handleInitiateSongPayment(PDO $pdo, AuthMiddleware $auth, ChapaService $chapaService): void
{
    $user = $auth->authenticate();
    $input = get_json_input();
    $songId = (int) ($input['song_id'] ?? 0);

    if ($songId <= 0) {
        api_error('Song ID is required');
    }

    $stmt = $pdo->prepare("SELECT id, title, artist, price FROM songs WHERE id = ? AND is_premium = 1 AND is_approved = 1");
    $stmt->execute([$songId]);
    $song = $stmt->fetch();

    if (!$song) {
        api_error('Premium song not found');
    }

    $stmt = $pdo->prepare("SELECT id FROM user_purchases WHERE user_id = ? AND song_id = ?");
    $stmt->execute([$user['id'], $songId]);
    if ($stmt->fetch()) {
        api_response(['success' => true, 'message' => 'Already purchased', 'already_purchased' => true]);
    }

    $amount = max(0.01, (float) ($song['price'] > 0 ? $song['price'] : 0.99));
    $txRef = $chapaService->generateTransactionRef('SONG');
    $callbackUrl = rtrim($_ENV['APP_BASE_URL'] ?? getenv('APP_BASE_URL') ?: 'http://localhost:8000', '/') . '/payment-webhook.php';
    $returnUrl = rtrim($_ENV['APP_FRONTEND_URL'] ?? getenv('APP_FRONTEND_URL') ?: 'http://localhost:5173', '/')
                . '/pro-deal?songId=' . $songId;

    $nameParts = explode(' ', trim($user['name'] ?? 'User'));
    $firstName = $nameParts[0] ?? 'User';
    $lastName = $nameParts[1] ?? 'User';

    $result = $chapaService->initializePayment(
        $amount,
        'ETB',
        $user['email'],
        $txRef,
        $callbackUrl,
        [
            'return_url' => $returnUrl,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'title' => 'ZemaLink - ' . $song['title'],
            'description' => $song['title'] . ' by ' . $song['artist'],
            'meta' => [
                'song_id' => $songId,
                'user_id' => $user['id'],
            ],
        ]
    );

    if ($result['success']) {
        api_response([
            'success' => true,
            'data' => $result['data'],
            'checkout_url' => $result['checkout_url'],
            'tx_ref' => $txRef,
        ]);
    }

    api_response($result);
}

function handleInitiateSubscription(PDO $pdo, AuthMiddleware $auth, ChapaService $chapaService): void
{
    $user = $auth->authenticate();
    $input = get_json_input();
    $plan = $input['plan'] ?? 'monthly';

    $amount = $plan === 'yearly' ? 99.00 : 9.99;
    $txRef = $chapaService->generateTransactionRef('SUB');
    $callbackUrl = rtrim($_ENV['APP_BASE_URL'] ?? getenv('APP_BASE_URL') ?: 'http://localhost:8000', '/') . '/payment-webhook.php';
    $returnUrl = rtrim($_ENV['APP_FRONTEND_URL'] ?? getenv('APP_FRONTEND_URL') ?: 'http://localhost:5173', '/')
                . '/subscription?status=success';

    $nameParts = explode(' ', trim($user['name'] ?? 'User'));
    $firstName = $nameParts[0] ?? 'User';
    $lastName = $nameParts[1] ?? 'User';

    $result = $chapaService->initializePayment(
        $amount,
        'ETB',
        $user['email'],
        $txRef,
        $callbackUrl,
        [
            'return_url' => $returnUrl,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'title' => 'ZemaLink Premium Subscription',
            'description' => ucfirst($plan) . ' subscription plan',
            'meta' => [
                'user_id' => $user['id'],
                'plan' => $plan,
            ],
        ]
    );

    if ($result['success']) {
        api_response([
            'success' => true,
            'data' => $result['data'],
            'checkout_url' => $result['checkout_url'],
            'tx_ref' => $txRef,
        ]);
    }

    api_response($result);
}

function handleInitiateTicketPayment(PDO $pdo, AuthMiddleware $auth, ChapaService $chapaService): void
{
    $user = $auth->authenticate();
    $input = get_json_input();
    $eventId = (int) ($input['event_id'] ?? 0);

    if ($eventId <= 0) {
        api_error('Event ID is required');
    }

    $stmt = $pdo->prepare("SELECT id, title, ticket_price, total_tickets, tickets_sold FROM events WHERE id = ?");
    $stmt->execute([$eventId]);
    $event = $stmt->fetch();

    if (!$event) {
        api_error('Event not found');
    }

    if ((int) $event['tickets_sold'] >= (int) $event['total_tickets']) {
        api_error('Event is sold out');
    }

    $check = $pdo->prepare("SELECT id FROM tickets WHERE user_id = ? AND event_id = ?");
    $check->execute([$user['id'], $eventId]);
    if ($check->fetch()) {
        api_response(['success' => true, 'message' => 'Already have a ticket', 'already_purchased' => true]);
    }

    $amount = max(0.01, (float) $event['ticket_price']);
    $txRef = $chapaService->generateTransactionRef('TKT');
    $callbackUrl = rtrim($_ENV['APP_BASE_URL'] ?? getenv('APP_BASE_URL') ?: 'http://localhost:8000', '/') . '/payment-webhook.php';
    $returnUrl = rtrim($_ENV['APP_FRONTEND_URL'] ?? getenv('APP_FRONTEND_URL') ?: 'http://localhost:5173', '/')
                . '/events?status=success';

    $nameParts = explode(' ', trim($user['name'] ?? 'User'));
    $firstName = $nameParts[0] ?? 'User';
    $lastName = $nameParts[1] ?? 'User';

    $result = $chapaService->initializePayment(
        $amount,
        'ETB',
        $user['email'],
        $txRef,
        $callbackUrl,
        [
            'return_url' => $returnUrl,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'title' => 'ZemaLink Event Ticket',
            'description' => $event['title'] . ' Ticket',
            'meta' => [
                'event_id' => $eventId,
                'user_id' => $user['id'],
            ],
        ]
    );

    if ($result['success']) {
        api_response([
            'success' => true,
            'data' => $result['data'],
            'checkout_url' => $result['checkout_url'],
            'tx_ref' => $txRef,
        ]);
    }

    api_response($result);
}

function handleMockSongPurchase(PDO $pdo, AuthMiddleware $auth, EmailService $emailService): void
{
    $user = $auth->authenticate();
    $input = get_json_input();
    $songId = (int) ($input['song_id'] ?? 0);
    $accountNumber = trim($input['account_number'] ?? '');
    $bankPassword = trim($input['bank_password'] ?? '');
    $phone = trim($input['phone'] ?? '');

    if ($songId <= 0) {
        api_error('Song ID is required');
    }

    if ($accountNumber === '') {
        api_error('Account number is required');
    }

    if ($bankPassword === '' && $phone === '') {
        api_error('Bank password or phone number is required');
    }

    $stmt = $pdo->prepare("SELECT id, title, price FROM songs WHERE id = ? AND is_premium = 1 AND is_approved = 1");
    $stmt->execute([$songId]);
    $song = $stmt->fetch();

    if (!$song) {
        api_error('Premium song not found');
    }

    $check = $pdo->prepare("SELECT id FROM user_purchases WHERE user_id = ? AND song_id = ?");
    $check->execute([$user['id'], $songId]);
    if ($check->fetch()) {
        api_response(['success' => true, 'message' => 'Already purchased']);
    }

    $amount = max(0.01, (float) ($song['price'] > 0 ? $song['price'] : 0.99));
    $txRef = 'mock_' . $user['id'] . '_' . $songId . '_' . time();

    $pdo->beginTransaction();
    try {
        $pdo->prepare("INSERT INTO payments (user_id, song_id, amount, payment_type, status, transaction_id) VALUES (?, ?, ?, 'song', 'completed', ?)")
            ->execute([$user['id'], $songId, $amount, $txRef]);
        $paymentId = $pdo->lastInsertId();

        $pdo->prepare("INSERT INTO user_purchases (user_id, song_id, payment_id) VALUES (?, ?, ?)")
            ->execute([$user['id'], $songId, $paymentId]);

        $pdo->commit();

        $emailService->sendPaymentConfirmation($user['email'], [
            'name' => $user['name'],
            'label' => 'Song: ' . $song['title'],
            'amount' => $amount,
        ]);

        api_response(['success' => true, 'message' => 'Purchase complete']);
    } catch (Throwable $e) {
        $pdo->rollBack();
        api_error('Purchase failed: ' . $e->getMessage());
    }
}

function handleMockTicketPurchase(PDO $pdo, AuthMiddleware $auth, EmailService $emailService): void
{
    $user = $auth->authenticate();
    $input = get_json_input();
    $eventId = (int) ($input['event_id'] ?? 0);
    $accountNumber = trim($input['account_number'] ?? '');
    $bankPassword = trim($input['bank_password'] ?? '');
    $phone = trim($input['phone'] ?? '');

    if ($eventId <= 0) {
        api_error('Event ID is required');
    }

    if ($accountNumber === '') {
        api_error('Account number is required');
    }

    if ($bankPassword === '' && $phone === '') {
        api_error('Bank password or phone number is required');
    }

    $stmt = $pdo->prepare("SELECT id, title, ticket_price, total_tickets, tickets_sold FROM events WHERE id = ?");
    $stmt->execute([$eventId]);
    $event = $stmt->fetch();

    if (!$event) {
        api_error('Event not found');
    }

    if ((int) $event['tickets_sold'] >= (int) $event['total_tickets']) {
        api_error('Event is sold out');
    }

    $check = $pdo->prepare("SELECT id FROM tickets WHERE user_id = ? AND event_id = ?");
    $check->execute([$user['id'], $eventId]);
    if ($check->fetch()) {
        api_response(['success' => true, 'message' => 'Already have a ticket', 'already_purchased' => true]);
    }

    $amount = max(0.01, (float) $event['ticket_price']);
    $txRef = 'mock_ticket_' . $user['id'] . '_' . $eventId . '_' . time();
    $ticketCode = 'TKT-' . strtoupper(bin2hex(random_bytes(4))) . '-' . $eventId;

    $pdo->beginTransaction();
    try {
        $pdo->prepare("INSERT INTO payments (user_id, event_id, amount, payment_type, status, transaction_id) VALUES (?, ?, ?, 'ticket', 'completed', ?)")
            ->execute([$user['id'], $eventId, $amount, $txRef]);
        $paymentId = $pdo->lastInsertId();

        $pdo->prepare("INSERT INTO tickets (user_id, event_id, payment_id, ticket_code) VALUES (?, ?, ?, ?)")
            ->execute([$user['id'], $eventId, $paymentId, $ticketCode]);

        $pdo->prepare("UPDATE events SET tickets_sold = tickets_sold + 1 WHERE id = ?")
            ->execute([$eventId]);

        $pdo->commit();

        $emailService->sendPaymentConfirmation($user['email'], [
            'name' => $user['name'],
            'label' => 'Ticket: ' . $event['title'],
            'amount' => $amount,
        ]);

        api_response(['success' => true, 'message' => 'Ticket purchased', 'ticket_code' => $ticketCode]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        api_error('Ticket purchase failed: ' . $e->getMessage());
    }
}

function handleVerifySongPayment(PDO $pdo, AuthMiddleware $auth, ChapaService $chapaService): void
{
    $input = $_SERVER['REQUEST_METHOD'] === 'POST' ? get_json_input() : $_GET;
    $txRef = trim($input['tx_ref'] ?? '');

    if ($txRef === '') {
        api_error('Transaction reference is required');
    }

    preg_match('/SONG_(\d+)_(\d+)_/', $txRef, $m);
    $userId = (int) ($m[1] ?? 0);
    $songId = (int) ($m[2] ?? ($input['song_id'] ?? 0));

    if ($userId <= 0) {
        try {
            $user = $auth->authenticate();
            $userId = (int) $user['id'];
        } catch (Throwable $e) {
            api_error('Authentication required', 401);
        }
    }

    if ($songId <= 0) {
        api_error('Song ID is required');
    }

    $verifyResult = $chapaService->verifyPayment($txRef);
    if (!$verifyResult['success']) {
        api_response($verifyResult);
    }

    $status = $verifyResult['status'] ?? '';
    if ($status !== 'success') {
        api_error('Payment not completed');
    }

    $check = $pdo->prepare("SELECT id FROM user_purchases WHERE user_id = ? AND song_id = ?");
    $check->execute([$userId, $songId]);
    if ($check->fetch()) {
        api_response(['success' => true, 'message' => 'Already purchased']);
    }

    $stmt = $pdo->prepare("SELECT price FROM songs WHERE id = ?");
    $stmt->execute([$songId]);
    $song = $stmt->fetch();
    $amount = $song ? (float) $song['price'] : 0;

    $pdo->beginTransaction();
    try {
        $pdo->prepare("INSERT INTO payments (user_id, song_id, amount, payment_type, status, transaction_id) VALUES (?, ?, ?, 'song', 'completed', ?)")
            ->execute([$userId, $songId, $amount, $txRef]);
        $paymentId = $pdo->lastInsertId();

        $pdo->prepare("INSERT INTO user_purchases (user_id, song_id, payment_id) VALUES (?, ?, ?)")
            ->execute([$userId, $songId, $paymentId]);

        $pdo->commit();

        api_response(['success' => true, 'message' => 'Payment verified and access granted']);
    } catch (Throwable $e) {
        $pdo->rollBack();
        api_error('Failed to finalize purchase');
    }
}

function handleVerifySubscription(PDO $pdo, AuthMiddleware $auth, ChapaService $chapaService, EmailService $emailService): void
{
    $input = $_SERVER['REQUEST_METHOD'] === 'POST' ? get_json_input() : $_GET;
    $txRef = trim($input['tx_ref'] ?? '');
    if ($txRef === '') {
        api_error('Transaction reference is required');
    }

    $verifyResult = $chapaService->verifyPayment($txRef);
    if (!$verifyResult['success']) {
        api_response($verifyResult);
    }

    $status = $verifyResult['status'] ?? '';
    if ($status !== 'success') {
        api_error('Payment not completed');
    }

    preg_match('/SUB_(\d+)_/', $txRef, $matches);
    $userId = (int) ($matches[1] ?? 0);

    if ($userId <= 0) {
        api_error('User not identified');
    }

    $plan = strpos($txRef, 'YEARLY') !== false ? 'yearly' : 'monthly';
    $months = $plan === 'yearly' ? 12 : 1;
    $amount = $plan === 'yearly' ? 99.00 : 9.99;
    $expires = date('Y-m-d', strtotime("+{$months} months"));

    $check = $pdo->prepare("SELECT id FROM payments WHERE transaction_id = ?");
    $check->execute([$txRef]);
    if ($check->fetch()) {
        api_response(['success' => true, 'message' => 'Subscription already activated']);
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare("UPDATE users SET subscription = 'premium', subscription_expires = ? WHERE id = ?")
            ->execute([$expires, $userId]);

        $pdo->prepare("INSERT INTO payments (user_id, amount, payment_type, status, transaction_id) VALUES (?, ?, 'subscription', 'completed', ?)")
            ->execute([$userId, $amount, $txRef]);

        $pdo->commit();

        $stmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $u = $stmt->fetch();
        if ($u) {
            $emailService->sendPaymentConfirmation($u['email'], [
                'name' => $u['name'],
                'label' => 'Premium Subscription',
                'amount' => $amount,
            ]);
        }

        api_response(['success' => true, 'message' => 'Subscription activated']);
    } catch (Throwable $e) {
        $pdo->rollBack();
        api_error('Failed to activate subscription');
    }
}

function handleVerifyTicketPayment(PDO $pdo, AuthMiddleware $auth, ChapaService $chapaService): void
{
    $input = $_SERVER['REQUEST_METHOD'] === 'POST' ? get_json_input() : $_GET;
    $txRef = trim($input['tx_ref'] ?? '');

    if ($txRef === '') {
        api_error('Transaction reference is required');
    }

    preg_match('/TKT_(\d+)_(\d+)_/', $txRef, $m);
    $userId = (int) ($m[1] ?? 0);
    $eventId = (int) ($m[2] ?? ($input['event_id'] ?? 0));

    if ($userId <= 0) {
        try {
            $user = $auth->authenticate();
            $userId = (int) $user['id'];
        } catch (Throwable $e) {
            api_error('Authentication required', 401);
        }
    }

    if ($eventId <= 0) {
        api_error('Event ID is required');
    }

    $verifyResult = $chapaService->verifyPayment($txRef);
    if (!$verifyResult['success']) {
        api_response($verifyResult);
    }

    $status = $verifyResult['status'] ?? '';
    if ($status !== 'success') {
        api_error('Payment not completed');
    }

    $check = $pdo->prepare("SELECT id FROM tickets WHERE user_id = ? AND event_id = ?");
    $check->execute([$userId, $eventId]);
    if ($check->fetch()) {
        api_response(['success' => true, 'message' => 'Already have a ticket']);
    }

    $event = $pdo->prepare("SELECT title, ticket_price, total_tickets, tickets_sold FROM events WHERE id = ?");
    $event->execute([$eventId]);
    $ev = $event->fetch();

    if (!$ev) {
        api_error('Event not found');
    }

    if ((int) $ev['tickets_sold'] >= (int) $ev['total_tickets']) {
        api_error('Event is sold out');
    }

    $amount = (float) $ev['ticket_price'];
    $ticketCode = 'TKT-' . strtoupper(bin2hex(random_bytes(4))) . '-' . $eventId;

    $pdo->beginTransaction();
    try {
        $pdo->prepare("INSERT INTO payments (user_id, event_id, amount, payment_type, status, transaction_id) VALUES (?, ?, ?, 'ticket', 'completed', ?)")
            ->execute([$userId, $eventId, $amount, $txRef]);
        $paymentId = $pdo->lastInsertId();

        $pdo->prepare("INSERT INTO tickets (user_id, event_id, payment_id, ticket_code) VALUES (?, ?, ?, ?)")
            ->execute([$userId, $eventId, $paymentId, $ticketCode]);

        $pdo->prepare("UPDATE events SET tickets_sold = tickets_sold + 1 WHERE id = ?")
            ->execute([$eventId]);

        $pdo->commit();

        api_response(['success' => true, 'message' => 'Ticket verified and granted', 'ticket_code' => $ticketCode]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        api_error('Failed to finalize ticket purchase');
    }
}
