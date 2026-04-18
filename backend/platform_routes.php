<?php

function zemalink_ensure_upload_dirs(): void {
    @mkdir(__DIR__ . '/uploads/audio', 0777, true);
    @mkdir(__DIR__ . '/uploads/covers', 0777, true);
}

function zemalink_require_login_platform(PDO $pdo): int {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return 0;
    }
    return (int) $_SESSION['user_id'];
}

function zemalink_require_musician_approved(PDO $pdo): int {
    $uid = zemalink_require_login_platform($pdo);
    if ($uid === 0) {
        return 0;
    }
    $stmt = $pdo->prepare("SELECT role, is_approved FROM users WHERE id = ?");
    $stmt->execute([$uid]);
    $u = $stmt->fetch();
    if (!$u || $u['role'] !== 'musician' || (int) $u['is_approved'] !== 1) {
        echo json_encode(['success' => false, 'message' => 'Approved musician only']);
        return 0;
    }
    return $uid;
}

/**
 * @return bool true if request was handled (response sent)
 */
function zemalink_dispatch_platform(PDO $pdo, array $segments, User $userModel): bool {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $r0 = $segments[0] ?? '';
    $r1 = $segments[1] ?? '';
    $r2 = $segments[2] ?? '';
    $r3 = $segments[3] ?? '';

    // --- Admin: stats ---
    if ($r0 === 'admin' && $r1 === 'stats' && $method === 'GET') {
        require_admin_json($pdo);
        $users = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $songs = (int) $pdo->query('SELECT COUNT(*) FROM songs')->fetchColumn();
        $rev = $pdo->query(
            "SELECT COALESCE(SUM(amount),0) AS t FROM payments WHERE status = 'completed'"
        )->fetch();
        echo json_encode([
            'success' => true,
            'stats' => [
                'total_users' => $users,
                'total_songs' => $songs,
                'revenue' => (float) ($rev['t'] ?? 0),
            ],
        ]);
        return true;
    }

    // --- Admin: pending songs ---
    if ($r0 === 'admin' && $r1 === 'pending-songs' && $method === 'GET') {
        require_admin_json($pdo);
        $stmt = $pdo->query(
            "SELECT s.*, u.name AS uploader_name FROM songs s
             LEFT JOIN users u ON s.uploader_id = u.id
             WHERE s.is_approved = 0 ORDER BY s.created_at DESC"
        );
        echo json_encode(['success' => true, 'songs' => $stmt->fetchAll()]);
        return true;
    }

    // --- Admin: all songs ---
    if ($r0 === 'admin' && $r1 === 'all-songs' && $method === 'GET') {
        require_admin_json($pdo);
        $stmt = $pdo->query(
            "SELECT s.*, u.name AS uploader_name FROM songs s
             LEFT JOIN users u ON s.uploader_id = u.id ORDER BY s.created_at DESC"
        );
        echo json_encode(['success' => true, 'songs' => $stmt->fetchAll()]);
        return true;
    }

    // --- Admin: approve / reject song ---
    if ($r0 === 'admin' && $r1 === 'approve-song' && $method === 'POST') {
        require_admin_json($pdo);
        $input = getInputData();
        $sid = (int) ($input['song_id'] ?? $_POST['song_id'] ?? 0);
        if ($sid <= 0) {
            echo json_encode(['success' => false, 'message' => 'song_id required']);
            return true;
        }
        $pdo->prepare('UPDATE songs SET is_approved = 1 WHERE id = ?')->execute([$sid]);
        echo json_encode(['success' => true, 'message' => 'Song approved']);
        return true;
    }

    if ($r0 === 'admin' && $r1 === 'reject-song' && $method === 'POST') {
        require_admin_json($pdo);
        $input = getInputData();
        $sid = (int) ($input['song_id'] ?? $_POST['song_id'] ?? 0);
        if ($sid <= 0) {
            echo json_encode(['success' => false, 'message' => 'song_id required']);
            return true;
        }
        $pdo->prepare('DELETE FROM songs WHERE id = ?')->execute([$sid]);
        echo json_encode(['success' => true, 'message' => 'Song rejected and removed']);
        return true;
    }

    // --- Admin: feature song ---
    if ($r0 === 'admin' && $r1 === 'feature-song' && $method === 'POST') {
        require_admin_json($pdo);
        $input = getInputData();
        $sid = (int) ($input['song_id'] ?? 0);
        $feat = !empty($input['featured']) ? 1 : 0;
        $pdo->prepare('UPDATE songs SET featured = ? WHERE id = ?')->execute([$feat, $sid]);
        echo json_encode(['success' => true]);
        return true;
    }

    // --- Admin: set premium ---
    if ($r0 === 'admin' && $r1 === 'set-song-premium' && $method === 'POST') {
        require_admin_json($pdo);
        $input = getInputData();
        $sid = (int) ($input['song_id'] ?? 0);
        $prem = !empty($input['is_premium']) ? 1 : 0;
        $price = isset($input['price']) ? (float) $input['price'] : 0;
        $pdo->prepare('UPDATE songs SET is_premium = ?, price = ? WHERE id = ?')->execute([$prem, $price, $sid]);
        echo json_encode(['success' => true]);
        return true;
    }

    // --- Admin: delete song ---
    if ($r0 === 'admin' && $r1 === 'delete-song' && $method === 'POST') {
        require_admin_json($pdo);
        $input = getInputData();
        $sid = (int) ($input['song_id'] ?? 0);
        $pdo->prepare('DELETE FROM songs WHERE id = ?')->execute([$sid]);
        echo json_encode(['success' => true]);
        return true;
    }

    // --- Admin: reject musician (keep pending / remove) ---
    if ($r0 === 'admin' && $r1 === 'reject-musician' && $method === 'POST') {
        require_admin_json($pdo);
        $input = getInputData();
        $uid = (int) ($input['user_id'] ?? 0);
        $pdo->prepare(
            "UPDATE users SET role = 'audience', is_approved = 1 WHERE id = ? AND role = 'musician' AND is_approved = 0"
        )->execute([$uid]);
        echo json_encode(['success' => true, 'message' => 'Registration rejected']);
        return true;
    }

    // --- Admin: delete user ---
    if ($r0 === 'admin' && $r1 === 'delete-user' && $method === 'POST') {
        require_admin_json($pdo);
        $input = getInputData();
        $uid = (int) ($input['user_id'] ?? 0);
        $adminId = (int) $_SESSION['user_id'];
        if ($uid === $adminId) {
            echo json_encode(['success' => false, 'message' => 'Cannot delete self']);
            return true;
        }
        $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$uid]);
        echo json_encode(['success' => true]);
        return true;
    }

    // --- Admin: reports ---
    if ($r0 === 'admin' && $r1 === 'reports' && $method === 'GET') {
        require_admin_json($pdo);
        $stmt = $pdo->query(
            "SELECT r.*, u.name AS reporter_name, s.title AS song_title FROM reports r
             JOIN users u ON r.reported_by = u.id
             JOIN songs s ON r.song_id = s.id
             ORDER BY r.created_at DESC"
        );
        echo json_encode(['success' => true, 'reports' => $stmt->fetchAll()]);
        return true;
    }

    if ($r0 === 'admin' && $r1 === 'report-status' && $method === 'POST') {
        require_admin_json($pdo);
        $input = getInputData();
        $rid = (int) ($input['report_id'] ?? 0);
        $status = $input['status'] ?? 'reviewed';
        if (!in_array($status, ['open', 'reviewed', 'dismissed'], true)) {
            $status = 'reviewed';
        }
        $pdo->prepare('UPDATE reports SET status = ? WHERE id = ?')->execute([$status, $rid]);
        echo json_encode(['success' => true]);
        return true;
    }

    // --- Admin: payments list ---
    if ($r0 === 'admin' && $r1 === 'payments' && $method === 'GET') {
        require_admin_json($pdo);
        $stmt = $pdo->query(
            'SELECT p.*, u.name AS user_name FROM payments p JOIN users u ON p.user_id = u.id ORDER BY p.payment_date DESC LIMIT 200'
        );
        echo json_encode(['success' => true, 'payments' => $stmt->fetchAll()]);
        return true;
    }

    // --- Musician: my songs ---
    if ($r0 === 'musician' && $r1 === 'my-songs' && $method === 'GET') {
        $uid = zemalink_require_musician_approved($pdo);
        if ($uid === 0) {
            return true;
        }
        $stmt = $pdo->prepare('SELECT * FROM songs WHERE uploader_id = ? ORDER BY created_at DESC');
        $stmt->execute([$uid]);
        echo json_encode(['success' => true, 'songs' => $stmt->fetchAll()]);
        return true;
    }

    // --- Musician: earnings ---
    if ($r0 === 'musician' && $r1 === 'earnings' && $method === 'GET') {
        $uid = zemalink_require_musician_approved($pdo);
        if ($uid === 0) {
            return true;
        }
        $stmt = $pdo->prepare(
            "SELECT COALESCE(SUM(p.amount),0) AS total FROM payments p
             JOIN songs s ON p.song_id = s.id
             WHERE p.status = 'completed' AND p.payment_type = 'song' AND s.uploader_id = ?"
        );
        $stmt->execute([$uid]);
        $row = $stmt->fetch();
        echo json_encode(['success' => true, 'earnings' => (float) ($row['total'] ?? 0)]);
        return true;
    }

    // --- Musician: stats ---
    if ($r0 === 'musician' && $r1 === 'stats' && $method === 'GET') {
        $uid = zemalink_require_musician_approved($pdo);
        if ($uid === 0) {
            return true;
        }
        $stmt = $pdo->prepare(
            'SELECT COALESCE(SUM(plays),0) AS plays, COUNT(*) AS songs FROM songs WHERE uploader_id = ?'
        );
        $stmt->execute([$uid]);
        $s = $stmt->fetch();
        $likes = $pdo->prepare(
            'SELECT COUNT(*) FROM likes l JOIN songs s ON l.song_id = s.id WHERE s.uploader_id = ?'
        );
        $likes->execute([$uid]);
        $purchases = $pdo->prepare(
            "SELECT COUNT(*) FROM user_purchases up JOIN songs s ON up.song_id = s.id WHERE s.uploader_id = ?"
        );
        $purchases->execute([$uid]);
        echo json_encode([
            'success' => true,
            'stats' => [
                'plays' => (int) ($s['plays'] ?? 0),
                'songs' => (int) ($s['songs'] ?? 0),
                'likes' => (int) $likes->fetchColumn(),
                'purchases' => (int) $purchases->fetchColumn(),
            ],
        ]);
        return true;
    }

    // --- Musician: upload ---
    if ($r0 === 'musician' && $r1 === 'upload-song' && $method === 'POST') {
        $uid = zemalink_require_musician_approved($pdo);
        if ($uid === 0) {
            return true;
        }
        zemalink_ensure_upload_dirs();
        if (empty($_FILES['file']['tmp_name'])) {
            echo json_encode(['success' => false, 'message' => 'Audio file (file) required']);
            return true;
        }
        $title = $_POST['title'] ?? '';
        $artist = $_POST['artist'] ?? '';
        $album = $_POST['album'] ?? '';
        $genre = trim((string) ($_POST['genre'] ?? ''));
        $isPremium = !empty($_POST['is_premium']) ? 1 : 0;
        $price = isset($_POST['price']) ? (float) $_POST['price'] : 0;
        if ($isPremium && $price <= 0) {
            echo json_encode(['success' => false, 'message' => 'Set a valid premium price']);
            return true;
        }
        if (!$isPremium) {
            $price = 0;
        }
        if ($title === '' || $artist === '') {
            echo json_encode(['success' => false, 'message' => 'Title and artist required']);
            return true;
        }
        $audioPath = zemalink_cloudinary_upload($_FILES['file']['tmp_name'], 'zemalink/audio', 'video');
        if (!$audioPath) {
            $ext = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION) ?: 'mp3';
            $base = 'a_' . uniqid('', true) . '.' . preg_replace('/[^a-zA-Z0-9]/', '', $ext);
            $audioPath = 'uploads/audio/' . $base;
            if (!move_uploaded_file($_FILES['file']['tmp_name'], __DIR__ . '/' . $audioPath)) {
                echo json_encode(['success' => false, 'message' => 'Upload failed']);
                return true;
            }
        }
        $coverPath = null;
        if (!empty($_FILES['cover']['tmp_name'])) {
            $coverPath = zemalink_cloudinary_upload($_FILES['cover']['tmp_name'], 'zemalink/covers', 'image');
            if (!$coverPath) {
                $cext = pathinfo($_FILES['cover']['name'], PATHINFO_EXTENSION) ?: 'jpg';
                $cbase = 'c_' . uniqid('', true) . '.' . preg_replace('/[^a-zA-Z0-9]/', '', $cext);
                $coverPath = 'uploads/covers/' . $cbase;
                move_uploaded_file($_FILES['cover']['tmp_name'], __DIR__ . '/' . $coverPath);
            }
        }
        $stmt = $pdo->prepare(
            'INSERT INTO songs (title, artist, album, genre, file_path, cover_image, uploader_id, is_premium, price, is_approved, plays)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)'
        );
        $stmt->execute([$title, $artist, $album, $genre !== '' ? $genre : null, $audioPath, $coverPath, $uid, $isPremium, $price]);
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        return true;
    }

    // --- Musician: update song (POST multipart or JSON meta only) ---
    if ($r0 === 'musician' && $r1 === 'update-song' && $method === 'POST' && $r2 !== '') {
        $uid = zemalink_require_musician_approved($pdo);
        if ($uid === 0) {
            return true;
        }
        $songId = (int) $r2;
        $stmt = $pdo->prepare('SELECT * FROM songs WHERE id = ? AND uploader_id = ?');
        $stmt->execute([$songId, $uid]);
        $song = $stmt->fetch();
        if (!$song) {
            echo json_encode(['success' => false, 'message' => 'Song not found']);
            return true;
        }
        $title = $_POST['title'] ?? $song['title'];
        $artist = $_POST['artist'] ?? $song['artist'];
        $album = $_POST['album'] ?? $song['album'];
        $genre = isset($_POST['genre']) ? trim((string) $_POST['genre']) : (string) ($song['genre'] ?? '');
        $isPremium = isset($_POST['is_premium']) ? (!empty($_POST['is_premium']) ? 1 : 0) : (int) $song['is_premium'];
        $price = isset($_POST['price']) ? (float) $_POST['price'] : (float) $song['price'];
        if ($isPremium && $price <= 0) {
            echo json_encode(['success' => false, 'message' => 'Set a valid premium price']);
            return true;
        }
        if (!$isPremium) {
            $price = 0;
        }
        $filePath = $song['file_path'];
        $coverPath = $song['cover_image'];
        zemalink_ensure_upload_dirs();
        if (!empty($_FILES['file']['tmp_name'])) {
            $uploadedAudio = zemalink_cloudinary_upload($_FILES['file']['tmp_name'], 'zemalink/audio', 'video');
            if ($uploadedAudio) {
                $filePath = $uploadedAudio;
            } else {
                $ext = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION) ?: 'mp3';
                $base = 'a_' . uniqid('', true) . '.' . preg_replace('/[^a-zA-Z0-9]/', '', $ext);
                $filePath = 'uploads/audio/' . $base;
                move_uploaded_file($_FILES['file']['tmp_name'], __DIR__ . '/' . $filePath);
            }
        }
        if (!empty($_FILES['cover']['tmp_name'])) {
            $uploadedCover = zemalink_cloudinary_upload($_FILES['cover']['tmp_name'], 'zemalink/covers', 'image');
            if ($uploadedCover) {
                $coverPath = $uploadedCover;
            } else {
                $cext = pathinfo($_FILES['cover']['name'], PATHINFO_EXTENSION) ?: 'jpg';
                $cbase = 'c_' . uniqid('', true) . '.' . preg_replace('/[^a-zA-Z0-9]/', '', $cext);
                $coverPath = 'uploads/covers/' . $cbase;
                move_uploaded_file($_FILES['cover']['tmp_name'], __DIR__ . '/' . $coverPath);
            }
        }
        $pdo->prepare(
            'UPDATE songs SET title = ?, artist = ?, album = ?, genre = ?, file_path = ?, cover_image = ?, is_premium = ?, price = ?, is_approved = 0 WHERE id = ? AND uploader_id = ?'
        )->execute([$title, $artist, $album, $genre !== '' ? $genre : null, $filePath, $coverPath, $isPremium, $price, $songId, $uid]);
        echo json_encode(['success' => true, 'message' => 'Updated; pending approval']);
        return true;
    }

    // --- Musician: delete song (DELETE or POST for broader client support) ---
    if ($r0 === 'musician' && $r1 === 'delete-song' && ($method === 'DELETE' || $method === 'POST') && $r2 !== '') {
        $uid = zemalink_require_musician_approved($pdo);
        if ($uid === 0) {
            return true;
        }
        $songId = (int) $r2;
        $pdo->prepare('DELETE FROM songs WHERE id = ? AND uploader_id = ?')->execute([$songId, $uid]);
        echo json_encode(['success' => true]);
        return true;
    }

    // --- Payment: mock purchase song ---
    if ($r0 === 'payment' && $r1 === 'purchase-song' && $method === 'POST') {
        $uid = zemalink_require_login_platform($pdo);
        if ($uid === 0) {
            return true;
        }
        $input = getInputData();
        $songId = (int) ($input['song_id'] ?? 0);
        $stmt = $pdo->prepare('SELECT * FROM songs WHERE id = ? AND is_approved = 1');
        $stmt->execute([$songId]);
        $song = $stmt->fetch();
        if (!$song || empty($song['is_premium'])) {
            echo json_encode(['success' => false, 'message' => 'Invalid premium song']);
            return true;
        }
        $own = $pdo->prepare('SELECT id FROM user_purchases WHERE user_id = ? AND song_id = ?');
        $own->execute([$uid, $songId]);
        if ($own->fetch()) {
            echo json_encode(['success' => true, 'message' => 'Already purchased']);
            return true;
        }
        $amount = (float) ($song['price'] ?? 0);
        if ($amount <= 0) {
            $amount = 0.99;
        }
        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                "INSERT INTO payments (user_id, song_id, amount, payment_type, status) VALUES (?, ?, ?, 'song', 'completed')"
            )->execute([$uid, $songId, $amount]);
            $pid = (int) $pdo->lastInsertId();
            $pdo->prepare(
                'INSERT INTO user_purchases (user_id, song_id, payment_id) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE payment_id = VALUES(payment_id)'
            )->execute([$uid, $songId, $pid]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'Payment failed']);
            return true;
        }
        echo json_encode(['success' => true, 'message' => 'Purchase complete', 'payment_id' => $pid]);
        $uStmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
        $uStmt->execute([$uid]);
        $u = $uStmt->fetch();
        if ($u && !empty($u['email'])) {
            zemalink_send_payment_email((string) $u['email'], (string) ($u['name'] ?? 'User'), 'Premium song purchase', $amount);
        }
        return true;
    }

    // --- User: purchased songs ---
    if ($r0 === 'user' && $r1 === 'purchased-songs' && $method === 'GET') {
        $uid = zemalink_require_login_platform($pdo);
        if ($uid === 0) {
            return true;
        }
        $stmt = $pdo->prepare(
            'SELECT s.* FROM user_purchases up JOIN songs s ON up.song_id = s.id WHERE up.user_id = ? ORDER BY up.purchased_at DESC'
        );
        $stmt->execute([$uid]);
        echo json_encode(['success' => true, 'songs' => $stmt->fetchAll()]);
        return true;
    }

    // --- User: upgrade subscription (mock) ---
    if ($r0 === 'user' && $r1 === 'upgrade-subscription' && $method === 'POST') {
        $uid = zemalink_require_login_platform($pdo);
        if ($uid === 0) {
            return true;
        }
        $input = getInputData();
        $plan = $input['plan'] ?? 'monthly';
        $amount = $plan === 'yearly' ? 99.0 : 9.99;
        $months = $plan === 'yearly' ? 12 : 1;
        $pdo->prepare(
            "INSERT INTO payments (user_id, song_id, amount, payment_type, status) VALUES (?, NULL, ?, 'subscription', 'completed')"
        )->execute([$uid, $amount]);
        $expires = date('Y-m-d', strtotime("+{$months} months"));
        $pdo->prepare(
            "UPDATE users SET subscription = 'premium', subscription_expires = ? WHERE id = ?"
        )->execute([$expires, $uid]);
        echo json_encode([
            'success' => true,
            'subscription_status' => 'premium',
            'subscription_expires' => $expires,
        ]);
        $uStmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
        $uStmt->execute([$uid]);
        $u = $uStmt->fetch();
        if ($u && !empty($u['email'])) {
            zemalink_send_payment_email((string) $u['email'], (string) ($u['name'] ?? 'User'), 'Premium subscription', $amount);
        }
        return true;
    }

    // --- Payment: initialize Chapa transaction (optional provider mode) ---
    if ($r0 === 'payment' && $r1 === 'initiate-song' && $method === 'POST') {
        $uid = zemalink_require_login_platform($pdo);
        if ($uid === 0) {
            return true;
        }
        $input = getInputData();
        $songId = (int) ($input['song_id'] ?? 0);
        $stmt = $pdo->prepare('SELECT id, title, artist, price FROM songs WHERE id = ? AND is_premium = 1 AND is_approved = 1');
        $stmt->execute([$songId]);
        $song = $stmt->fetch();
        if (!$song) {
            echo json_encode(['success' => false, 'message' => 'Premium song not found']);
            return true;
        }
        $uStmt = $pdo->prepare('SELECT name, email FROM users WHERE id = ?');
        $uStmt->execute([$uid]);
        $u = $uStmt->fetch();
        if (!$u || empty($u['email'])) {
            echo json_encode(['success' => false, 'message' => 'User email is required']);
            return true;
        }
        $amount = (float) ($song['price'] ?? 0.99);
        // Chapa validation: enforce a sensible minimum numeric amount.
        if ($amount < 10) {
            $amount = 10;
        }
        $txRef = 'zema_song_' . $uid . '_' . $songId . '_' . time();
        $parts = explode(' ', trim((string) ($u['name'] ?? 'User')));
        $firstName = $parts[0] ?? 'User';
        $lastName = $parts[1] ?? 'User';
        $returnUrlInput = trim((string) ($input['return_url'] ?? ''));
        if ($returnUrlInput === '') {
            $returnUrlInput = rtrim((string) zemalink_env('APP_FRONTEND_URL', 'http://localhost:5173'), '/') . '/pro-deal?songId=' . $songId;
        }
        $returnJoin = str_contains($returnUrlInput, '?') ? '&' : '?';
        $returnUrl = $returnUrlInput . $returnJoin . 'tx_ref=' . rawurlencode($txRef);
        $payload = [
            'amount' => number_format($amount, 2, '.', ''),
            'currency' => 'ETB',
            'email' => (string) $u['email'],
            'first_name' => (string) $firstName,
            'last_name' => (string) $lastName,
            'tx_ref' => $txRef,
            'callback_url' => rtrim((string) zemalink_env('APP_BASE_URL', 'http://127.0.0.1/ZemaLink/backend'), '/') . '/payment/verify-song',
            'return_url' => $returnUrl,
            'customization' => [
                'title' => 'ZemaLink Pro',
                'description' => (string) ($song['title'] . ' - ' . $song['artist']),
            ],
            'meta' => [
                'song_id' => $songId,
                'user_id' => $uid,
            ],
        ];
        $init = zemalink_chapa_initialize($payload);
        if (!$init['success']) {
            echo json_encode($init);
            return true;
        }
        echo json_encode(['success' => true, 'chapa' => $init['data'], 'tx_ref' => $txRef]);
        return true;
    }

    // --- Payment: verify Chapa transaction and grant song access ---
    if ($r0 === 'payment' && $r1 === 'verify-song' && ($method === 'POST' || $method === 'GET')) {
        $input = $method === 'POST' ? getInputData() : $_GET;
        $txRef = trim((string) ($input['tx_ref'] ?? ''));
        $uid = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : 0;
        $songId = (int) ($input['song_id'] ?? 0);

        // Fallback: decode tx_ref format zema_song_{uid}_{songId}_{timestamp}
        if ($txRef !== '' && preg_match('/^zema_song_(\d+)_(\d+)_\d+$/', $txRef, $m)) {
            if ($uid <= 0) {
                $uid = (int) $m[1];
            }
            if ($songId <= 0) {
                $songId = (int) $m[2];
            }
        }

        if ($uid <= 0 || $songId <= 0 || $txRef === '') {
            echo json_encode(['success' => false, 'message' => 'Invalid verification payload']);
            return true;
        }
        $songStmt = $pdo->prepare('SELECT id, title, price, is_premium, is_approved FROM songs WHERE id = ?');
        $songStmt->execute([$songId]);
        $song = $songStmt->fetch();
        if (!$song || empty($song['is_premium']) || empty($song['is_approved'])) {
            echo json_encode(['success' => false, 'message' => 'Invalid premium song']);
            return true;
        }
        $already = $pdo->prepare('SELECT id FROM user_purchases WHERE user_id = ? AND song_id = ?');
        $already->execute([$uid, $songId]);
        if ($already->fetch()) {
            echo json_encode(['success' => true, 'message' => 'Already purchased']);
            return true;
        }
        $verify = zemalink_chapa_verify($txRef);
        if (!$verify['success']) {
            echo json_encode($verify);
            return true;
        }
        $vData = $verify['data']['data'] ?? [];
        $vStatus = strtolower((string) ($verify['data']['status'] ?? ''));
        $paymentStatus = strtolower((string) ($vData['status'] ?? ''));
        if ($vStatus !== 'success' || !in_array($paymentStatus, ['success', 'successful'], true)) {
            echo json_encode(['success' => false, 'message' => 'Payment not completed yet']);
            return true;
        }
        $paidAmount = isset($vData['amount']) ? (float) $vData['amount'] : (float) ($song['price'] ?? 0);
        if ($paidAmount <= 0) {
            $paidAmount = (float) ($song['price'] ?? 0.99);
        }
        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                "INSERT INTO payments (user_id, song_id, amount, payment_type, status) VALUES (?, ?, ?, 'song', 'completed')"
            )->execute([$uid, $songId, $paidAmount]);
            $pid = (int) $pdo->lastInsertId();
            $pdo->prepare(
                'INSERT INTO user_purchases (user_id, song_id, payment_id) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE payment_id = VALUES(payment_id)'
            )->execute([$uid, $songId, $pid]);
            $pdo->commit();
            echo json_encode([
                'success' => true,
                'message' => 'Purchase verified',
                'payment_id' => $pid,
                'song_id' => $songId,
                'user_id' => $uid,
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'Failed to finalize purchase']);
        }
        return true;
    }

    // --- User: report song ---
    if ($r0 === 'user' && $r1 === 'report-song' && $method === 'POST') {
        $uid = zemalink_require_login_platform($pdo);
        if ($uid === 0) {
            return true;
        }
        $input = getInputData();
        $songId = (int) ($input['song_id'] ?? 0);
        $reason = trim((string) ($input['reason'] ?? ''));
        if ($songId <= 0 || $reason === '') {
            echo json_encode(['success' => false, 'message' => 'song_id and reason required']);
            return true;
        }
        $pdo->prepare(
            'INSERT INTO reports (reported_by, song_id, reason) VALUES (?, ?, ?)'
        )->execute([$uid, $songId, $reason]);
        echo json_encode(['success' => true]);
        return true;
    }

    // --- User: listening history ---
    if ($r0 === 'user' && $r1 === 'listen' && $method === 'POST') {
        $uid = zemalink_require_login_platform($pdo);
        if ($uid === 0) {
            return true;
        }
        $input = getInputData();
        $songId = (int) ($input['song_id'] ?? 0);
        if ($songId > 0) {
            // Keep full listening history log.
            $pdo->prepare(
                'INSERT INTO listening_history (user_id, song_id) VALUES (?, ?)'
            )->execute([$uid, $songId]);
            // Count plays uniquely per user/song for leaderboard counters.
            $view = $pdo->prepare(
                'INSERT IGNORE INTO song_views (user_id, song_id) VALUES (?, ?)'
            );
            $view->execute([$uid, $songId]);
            if ($view->rowCount() > 0) {
                $pdo->prepare('UPDATE songs SET plays = plays + 1 WHERE id = ?')->execute([$songId]);
            }
        }
        echo json_encode(['success' => true]);
        return true;
    }

    if ($r0 === 'user' && $r1 === 'listening-history' && $method === 'GET') {
        $uid = zemalink_require_login_platform($pdo);
        if ($uid === 0) {
            return true;
        }
        $stmt = $pdo->prepare(
            'SELECT s.*, lh.played_at FROM listening_history lh
             JOIN songs s ON lh.song_id = s.id WHERE lh.user_id = ?
             ORDER BY lh.played_at DESC LIMIT 100'
        );
        $stmt->execute([$uid]);
        echo json_encode(['success' => true, 'songs' => $stmt->fetchAll()]);
        return true;
    }

    return false;
}
