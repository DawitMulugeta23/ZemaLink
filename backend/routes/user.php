<?php

switch ($method) {
    case 'GET':
        match ($sub) {
            'profile' => handleGetProfile($pdo, $auth),
            'likes' => handleGetLikes($pdo, $auth),
            'purchased-songs' => handleGetPurchased($pdo, $auth),
            'listening-history' => handleListeningHistory($pdo, $auth),
            'playlists' => handleUserPlaylists($pdo, $auth),
            'tickets' => handleUserTickets($pdo, $auth),
            'stats' => handleUserStats($pdo, $auth),
            default => api_error('User route not found', 404),
        };
        break;

    case 'POST':
        match ($sub) {
            'like' => handleToggleLike($pdo, $auth),
            'listen' => handleRecordListen($pdo, $auth),
            'rate' => handleRateSong($pdo, $auth, $ratingService),
            'update-profile' => handleUpdateProfile($pdo, $auth, $uploadService),
            'change-password' => handleChangePassword($pdo, $auth),
            'upgrade-subscription' => handleUpgradeSubscription($pdo, $auth, $emailService),
            'report-song' => handleReportSong($pdo, $auth),
            default => api_error('User route not found', 404),
        };
        break;

    default:
        api_error('Method not allowed', 405);
}

function handleGetProfile(PDO $pdo, AuthMiddleware $auth): void
{
    $user = $auth->authenticate();

    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM listening_history WHERE user_id = ?"
    );
    $stmt->execute([$user['id']]);
    $totalListens = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM likes WHERE user_id = ?"
    );
    $stmt->execute([$user['id']]);
    $totalLikes = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM playlists WHERE user_id = ?"
    );
    $stmt->execute([$user['id']]);
    $totalPlaylists = (int) $stmt->fetchColumn();

    $user['stats'] = [
        'total_listens' => $totalListens,
        'total_likes' => $totalLikes,
        'total_playlists' => $totalPlaylists,
    ];

    api_response(['success' => true, 'user' => $user]);
}

function handleGetLikes(PDO $pdo, AuthMiddleware $auth): void
{
    $user = $auth->getUser();
    if ($user === null) {
        api_response(['success' => true, 'songs' => []]);
    }

    $stmt = $pdo->prepare(
        "SELECT s.*, 
                (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                COALESCE(s.rating, 0) as rating,
                u.name as uploader_name
         FROM likes l 
         JOIN songs s ON l.song_id = s.id 
         LEFT JOIN users u ON s.uploader_id = u.id
         WHERE l.user_id = ? AND s.is_approved = 1
         ORDER BY l.created_at DESC"
    );
    $stmt->execute([$user['id']]);
    api_response(['success' => true, 'songs' => $stmt->fetchAll()]);
}

function handleGetPurchased(PDO $pdo, AuthMiddleware $auth): void
{
    $user = $auth->authenticate();

    $stmt = $pdo->prepare(
        "SELECT s.*, up.purchased_at,
                (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                u.name as uploader_name
         FROM user_purchases up 
         JOIN songs s ON up.song_id = s.id 
         LEFT JOIN users u ON s.uploader_id = u.id
         WHERE up.user_id = ? AND s.is_approved = 1
         ORDER BY up.purchased_at DESC"
    );
    $stmt->execute([$user['id']]);
    api_response(['success' => true, 'songs' => $stmt->fetchAll()]);
}

function handleListeningHistory(PDO $pdo, AuthMiddleware $auth): void
{
    $user = $auth->getUser();
    if ($user === null) {
        api_response(['success' => true, 'songs' => []]);
    }

    $limit = min(100, max(1, (int) ($_GET['limit'] ?? 50)));

    $stmt = $pdo->prepare(
        "SELECT s.*, lh.played_at, u.name as uploader_name
         FROM listening_history lh 
         JOIN songs s ON lh.song_id = s.id 
         LEFT JOIN users u ON s.uploader_id = u.id
         WHERE lh.user_id = ? AND s.is_approved = 1
         ORDER BY lh.played_at DESC 
         LIMIT ?"
    );
    $stmt->execute([$user['id'], $limit]);
    api_response(['success' => true, 'songs' => $stmt->fetchAll()]);
}

function handleUserPlaylists(PDO $pdo, AuthMiddleware $auth): void
{
    $user = $auth->getUser();
    if ($user === null) {
        api_response(['success' => true, 'playlists' => []]);
    }

    $stmt = $pdo->prepare(
        "SELECT p.*, 
                (SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = p.id) as song_count
         FROM playlists p 
         WHERE p.user_id = ?
         ORDER BY p.created_at DESC"
    );
    $stmt->execute([$user['id']]);
    api_response(['success' => true, 'playlists' => $stmt->fetchAll()]);
}

function handleUserTickets(PDO $pdo, AuthMiddleware $auth): void
{
    $user = $auth->authenticate();

    $stmt = $pdo->prepare(
        "SELECT t.*, e.title AS event_title, e.description AS event_description, 
                e.event_date, e.location, e.cover_image, u.name AS musician_name
         FROM tickets t
         JOIN events e ON t.event_id = e.id
         JOIN users u ON e.musician_id = u.id
         WHERE t.user_id = ?
         ORDER BY e.event_date ASC"
    );
    $stmt->execute([$user['id']]);
    api_response(['success' => true, 'tickets' => $stmt->fetchAll()]);
}

function handleUserStats(PDO $pdo, AuthMiddleware $auth): void
{
    $user = $auth->authenticate();

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM likes WHERE user_id = ?");
    $stmt->execute([$user['id']]);
    $likes = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM listening_history WHERE user_id = ?");
    $stmt->execute([$user['id']]);
    $listens = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM playlists WHERE user_id = ?");
    $stmt->execute([$user['id']]);
    $playlists = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM user_purchases WHERE user_id = ?");
    $stmt->execute([$user['id']]);
    $purchases = (int) $stmt->fetchColumn();

    api_response([
        'success' => true,
        'stats' => [
            'total_likes' => $likes,
            'total_listens' => $listens,
            'total_playlists' => $playlists,
            'total_purchases' => $purchases,
        ],
    ]);
}

function handleToggleLike(PDO $pdo, AuthMiddleware $auth): void
{
    $user = $auth->authenticate();
    $input = get_json_input();
    $songId = (int) ($input['song_id'] ?? 0);

    if ($songId <= 0) {
        api_error('Song ID is required');
    }

    $stmt = $pdo->prepare("SELECT * FROM likes WHERE user_id = ? AND song_id = ?");
    $stmt->execute([$user['id'], $songId]);

    if ($stmt->fetch()) {
        $pdo->prepare("DELETE FROM likes WHERE user_id = ? AND song_id = ?")->execute([$user['id'], $songId]);
        $liked = false;
    } else {
        $pdo->prepare("INSERT IGNORE INTO likes (user_id, song_id) VALUES (?, ?)")->execute([$user['id'], $songId]);
        $liked = true;
    }

    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM likes WHERE song_id = ?");
    $stmt->execute([$songId]);
    $likeCount = (int) $stmt->fetchColumn();

    api_response(['success' => true, 'liked' => $liked, 'likes_count' => $likeCount]);
}

function handleRateSong(PDO $pdo, AuthMiddleware $auth, RatingService $ratingService): void
{
    $user = $auth->authenticate();
    $input = get_json_input();
    $songId = (int) ($input['song_id'] ?? 0);
    $rating = (int) ($input['rating'] ?? 0);

    if ($songId <= 0) {
        api_error('Song ID is required');
    }

    if ($rating < 1 || $rating > 5) {
        api_error('Rating must be between 1 and 5');
    }

    $stmt = $pdo->prepare("SELECT id FROM songs WHERE id = ?");
    $stmt->execute([$songId]);
    if (!$stmt->fetch()) {
        api_error('Song not found');
    }

    $pdo->prepare("INSERT INTO song_ratings (user_id, song_id, rating) VALUES (?, ?, ?)
                   ON DUPLICATE KEY UPDATE rating = VALUES(rating)")
        ->execute([$user['id'], $songId, $rating]);

    $stmt = $pdo->prepare("SELECT ROUND(AVG(rating), 2) as avg_rating, COUNT(*) as total FROM song_ratings WHERE song_id = ?");
    $stmt->execute([$songId]);
    $stats = $stmt->fetch();

    $ratingService->updateSongRating($songId);

    api_response([
        'success' => true,
        'message' => 'Rating saved',
        'avg_rating' => (float) ($stats['avg_rating'] ?? 0),
        'total_ratings' => (int) ($stats['total'] ?? 0),
    ]);
}

function handleRecordListen(PDO $pdo, AuthMiddleware $auth): void
{
    $user = $auth->authenticate();
    $input = get_json_input();
    $songId = (int) ($input['song_id'] ?? 0);

    if ($songId <= 0) {
        api_error('Song ID is required');
    }

    $pdo->prepare("INSERT INTO listening_history (user_id, song_id) VALUES (?, ?)")
        ->execute([$user['id'], $songId]);

    $view = $pdo->prepare("INSERT IGNORE INTO song_views (user_id, song_id) VALUES (?, ?)");
    $view->execute([$user['id'], $songId]);

    if ($view->rowCount() > 0) {
        $pdo->prepare("UPDATE songs SET plays = plays + 1 WHERE id = ?")->execute([$songId]);
    }

    api_response(['success' => true]);
}

function handleUpdateProfile(PDO $pdo, AuthMiddleware $auth, UploadService $uploadService): void
{
    $user = $auth->authenticate();
    $input = get_json_input();
    $name = trim($input['name'] ?? '');

    if ($name !== '') {
        $pdo->prepare("UPDATE users SET name = ? WHERE id = ?")->execute([$name, $user['id']]);
    }

    if (!empty($_FILES['avatar']) && $_FILES['avatar']['error'] === UPLOAD_ERR_OK) {
        $result = $uploadService->upload($_FILES['avatar'], 'image');
        if ($result['success']) {
            $pdo->prepare("UPDATE users SET avatar = ? WHERE id = ?")->execute([$result['url'], $user['id']]);
        }
    }

    api_response(['success' => true, 'message' => 'Profile updated']);
}

function handleChangePassword(PDO $pdo, AuthMiddleware $auth): void
{
    $user = $auth->authenticate();
    $input = get_json_input();
    $currentPassword = $input['current_password'] ?? '';
    $newPassword = $input['new_password'] ?? '';

    if ($currentPassword === '' || $newPassword === '') {
        api_error('Current and new passwords are required');
    }

    if (strlen($newPassword) < 6) {
        api_error('New password must be at least 6 characters');
    }

    $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$user['id']]);
    $stored = $stmt->fetch();

    if (!password_verify($currentPassword, $stored['password'])) {
        api_error('Current password is incorrect');
    }

    $hashed = password_hash($newPassword, PASSWORD_DEFAULT);
    $pdo->prepare("UPDATE users SET password = ? WHERE id = ?")->execute([$hashed, $user['id']]);

    api_response(['success' => true, 'message' => 'Password changed successfully']);
}

function handleUpgradeSubscription(PDO $pdo, AuthMiddleware $auth, EmailService $emailService): void
{
    $user = $auth->authenticate();
    $input = get_json_input();
    $plan = $input['plan'] ?? 'monthly';

    $months = $plan === 'yearly' ? 12 : 1;
    $amount = $plan === 'yearly' ? 99.00 : 9.99;
    $expires = date('Y-m-d', strtotime("+{$months} months"));

    $pdo->prepare("UPDATE users SET subscription = 'premium', subscription_expires = ? WHERE id = ?")
        ->execute([$expires, $user['id']]);

    $pdo->prepare("INSERT INTO payments (user_id, amount, payment_type, status) VALUES (?, ?, 'subscription', 'completed')")
        ->execute([$user['id'], $amount]);

    $emailService->sendPaymentConfirmation($user['email'], [
        'name' => $user['name'],
        'label' => 'Premium Subscription (' . ucfirst($plan) . ')',
        'amount' => $amount,
    ]);

    api_response([
        'success' => true,
        'subscription_status' => 'premium',
        'subscription_expires' => $expires,
    ]);
}

function handleReportSong(PDO $pdo, AuthMiddleware $auth): void
{
    $user = $auth->authenticate();
    $input = get_json_input();
    $songId = (int) ($input['song_id'] ?? 0);
    $reason = trim($input['reason'] ?? '');

    if ($songId <= 0 || $reason === '') {
        api_error('Song ID and reason are required');
    }

    $pdo->prepare("INSERT INTO reports (reported_by, song_id, reason) VALUES (?, ?, ?)")
        ->execute([$user['id'], $songId, $reason]);

    api_response(['success' => true, 'message' => 'Report submitted']);
}
