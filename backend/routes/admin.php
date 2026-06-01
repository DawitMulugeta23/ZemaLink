<?php

$auth->requireAdmin();

switch ($method) {
    case 'GET':
        match ($sub) {
            'stats' => handleAdminStats($pdo),
            'pending-songs' => handlePendingSongs($pdo),
            'all-songs' => handleAllSongs($pdo),
            'users' => handleAllUsers($pdo),
            'musicians' => handleMusicians($pdo),
            'payments' => handlePayments($pdo),
            'reports' => handleReports($pdo),
            'revenue' => handleRevenue($pdo),
            '' => handleAdminStats($pdo),
            default => api_error('Admin route not found', 404),
        };
        break;

    case 'POST':
        match ($sub) {
            'approve-song' => handleApproveSong($pdo),
            'reject-song' => handleRejectSong($pdo, $uploadService),
            'feature-song' => handleFeatureSong($pdo),
            'set-song-premium' => handleSetSongPremium($pdo),
            'delete-song' => handleAdminDeleteSong($pdo, $uploadService),
            'approve-musician' => handleApproveMusician($pdo),
            'reject-musician' => handleRejectMusician($pdo),
            'delete-user' => handleDeleteUser($pdo),
            'report-status' => handleReportStatus($pdo),
            default => api_error('Admin route not found', 404),
        };
        break;

    default:
        api_error('Method not allowed', 405);
}

function handleAdminStats(PDO $pdo): void
{
    $users = (int) $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $songs = (int) $pdo->query("SELECT COUNT(*) FROM songs")->fetchColumn();
    $approved = (int) $pdo->query("SELECT COUNT(*) FROM songs WHERE is_approved = 1")->fetchColumn();
    $pending = (int) $pdo->query("SELECT COUNT(*) FROM songs WHERE is_approved = 0")->fetchColumn();
    $musicians = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'musician'")->fetchColumn();
    $pendingMusicians = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'musician' AND is_approved = 0")->fetchColumn();

    $revenue = $pdo->query("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed'")->fetchColumn();
    $totalPlays = $pdo->query("SELECT COALESCE(SUM(plays), 0) FROM songs")->fetchColumn();
    $events = (int) $pdo->query("SELECT COUNT(*) FROM events")->fetchColumn();
    $reports = (int) $pdo->query("SELECT COUNT(*) FROM reports WHERE status = 'open'")->fetchColumn();

    api_response([
        'success' => true,
        'stats' => [
            'total_users' => $users,
            'total_songs' => $songs,
            'approved_songs' => $approved,
            'pending_songs' => $pending,
            'total_musicians' => $musicians,
            'pending_musicians' => $pendingMusicians,
            'revenue' => (float) $revenue,
            'total_plays' => (int) $totalPlays,
            'total_events' => $events,
            'open_reports' => $reports,
        ],
    ]);
}

function handlePendingSongs(PDO $pdo): void
{
    $stmt = $pdo->query(
        "SELECT s.*, u.name AS uploader_name 
         FROM songs s 
         LEFT JOIN users u ON s.uploader_id = u.id 
         WHERE s.is_approved = 0 
         ORDER BY s.created_at DESC"
    );
    api_response(['success' => true, 'songs' => $stmt->fetchAll()]);
}

function handleAllSongs(PDO $pdo): void
{
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int) ($_GET['limit'] ?? ITEMS_PER_PAGE)));
    $offset = ($page - 1) * $limit;

    $total = (int) $pdo->query("SELECT COUNT(*) FROM songs")->fetchColumn();

    $stmt = $pdo->query(
        "SELECT s.*, u.name AS uploader_name 
         FROM songs s 
         LEFT JOIN users u ON s.uploader_id = u.id 
         ORDER BY s.created_at DESC 
         LIMIT {$limit} OFFSET {$offset}"
    );

    api_response([
        'success' => true,
        'songs' => $stmt->fetchAll(),
        'pagination' => paginate($page, $limit, $total),
    ]);
}

function handleAllUsers(PDO $pdo): void
{
    $stmt = $pdo->query(
        "SELECT id, name, email, role, is_approved, email_verified, subscription, 
                subscription_expires, created_at 
         FROM users 
         ORDER BY created_at DESC 
         LIMIT 200"
    );
    api_response(['success' => true, 'users' => $stmt->fetchAll()]);
}

function handleMusicians(PDO $pdo): void
{
    $stmt = $pdo->query(
        "SELECT u.*, 
                (SELECT COUNT(*) FROM songs WHERE uploader_id = u.id) as song_count,
                (SELECT COALESCE(SUM(plays), 0) FROM songs WHERE uploader_id = u.id) as total_plays
         FROM users u 
         WHERE u.role = 'musician' 
         ORDER BY u.created_at DESC"
    );
    api_response(['success' => true, 'musicians' => $stmt->fetchAll()]);
}

function handlePayments(PDO $pdo): void
{
    $stmt = $pdo->query(
        "SELECT p.*, u.name AS user_name 
         FROM payments p 
         JOIN users u ON p.user_id = u.id 
         ORDER BY p.payment_date DESC 
         LIMIT 200"
    );
    api_response(['success' => true, 'payments' => $stmt->fetchAll()]);
}

function handleReports(PDO $pdo): void
{
    $stmt = $pdo->query(
        "SELECT r.*, u.name AS reporter_name, s.title AS song_title 
         FROM reports r 
         JOIN users u ON r.reported_by = u.id 
         JOIN songs s ON r.song_id = s.id 
         ORDER BY r.created_at DESC"
    );
    api_response(['success' => true, 'reports' => $stmt->fetchAll()]);
}

function handleRevenue(PDO $pdo): void
{
    $total = $pdo->query("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed'")->fetchColumn();

    $byType = $pdo->query(
        "SELECT payment_type, COALESCE(SUM(amount), 0) as total, COUNT(*) as count 
         FROM payments WHERE status = 'completed' 
         GROUP BY payment_type"
    )->fetchAll();

    $monthly = $pdo->query(
        "SELECT DATE_FORMAT(payment_date, '%Y-%m') as month, COALESCE(SUM(amount), 0) as total 
         FROM payments WHERE status = 'completed' 
         GROUP BY DATE_FORMAT(payment_date, '%Y-%m') 
         ORDER BY month DESC 
         LIMIT 12"
    )->fetchAll();

    api_response([
        'success' => true,
        'revenue' => [
            'total' => (float) $total,
            'by_type' => $byType,
            'monthly' => $monthly,
        ],
    ]);
}

function handleApproveSong(PDO $pdo): void
{
    $input = get_json_input();
    $songId = (int) ($input['song_id'] ?? 0);
    if ($songId <= 0) {
        api_error('Song ID is required');
    }

    $pdo->prepare("UPDATE songs SET is_approved = 1 WHERE id = ?")->execute([$songId]);
    api_response(['success' => true, 'message' => 'Song approved']);
}

function handleRejectSong(PDO $pdo, UploadService $uploadService): void
{
    $input = get_json_input();
    $songId = (int) ($input['song_id'] ?? 0);
    if ($songId <= 0) {
        api_error('Song ID is required');
    }

    $stmt = $pdo->prepare("SELECT file_path, cover_image FROM songs WHERE id = ?");
    $stmt->execute([$songId]);
    $song = $stmt->fetch();

    if ($song) {
        $uploadService->deleteFile($song['file_path']);
        if ($song['cover_image']) {
            $uploadService->deleteFile($song['cover_image']);
        }
    }

    $pdo->prepare("DELETE FROM songs WHERE id = ?")->execute([$songId]);
    api_response(['success' => true, 'message' => 'Song rejected and removed']);
}

function handleFeatureSong(PDO $pdo): void
{
    $input = get_json_input();
    $songId = (int) ($input['song_id'] ?? 0);
    $featured = !empty($input['featured']) ? 1 : 0;

    if ($songId <= 0) {
        api_error('Song ID is required');
    }

    $pdo->prepare("UPDATE songs SET featured = ? WHERE id = ?")->execute([$featured, $songId]);
    api_response(['success' => true, 'message' => $featured ? 'Song featured' : 'Song unfeatured']);
}

function handleSetSongPremium(PDO $pdo): void
{
    $input = get_json_input();
    $songId = (int) ($input['song_id'] ?? 0);
    $isPremium = !empty($input['is_premium']) ? 1 : 0;
    $price = isset($input['price']) ? (float) $input['price'] : 0;

    if ($songId <= 0) {
        api_error('Song ID is required');
    }

    $pdo->prepare("UPDATE songs SET is_premium = ?, price = ? WHERE id = ?")->execute([$isPremium, $price, $songId]);
    api_response(['success' => true, 'message' => 'Song premium status updated']);
}

function handleAdminDeleteSong(PDO $pdo, UploadService $uploadService): void
{
    $input = get_json_input();
    $songId = (int) ($input['song_id'] ?? 0);
    if ($songId <= 0) {
        api_error('Song ID is required');
    }

    $stmt = $pdo->prepare("SELECT file_path, cover_image FROM songs WHERE id = ?");
    $stmt->execute([$songId]);
    $song = $stmt->fetch();

    if ($song) {
        $uploadService->deleteFile($song['file_path']);
        if ($song['cover_image']) {
            $uploadService->deleteFile($song['cover_image']);
        }
    }

    $pdo->prepare("DELETE FROM songs WHERE id = ?")->execute([$songId]);
    api_response(['success' => true, 'message' => 'Song deleted']);
}

function handleApproveMusician(PDO $pdo): void
{
    $input = get_json_input();
    $userId = (int) ($input['user_id'] ?? 0);
    if ($userId <= 0) {
        api_error('User ID is required');
    }

    $pdo->prepare("UPDATE users SET is_approved = 1 WHERE id = ? AND role = 'musician'")
        ->execute([$userId]);
    api_response(['success' => true, 'message' => 'Musician approved']);
}

function handleRejectMusician(PDO $pdo): void
{
    $input = get_json_input();
    $userId = (int) ($input['user_id'] ?? 0);
    if ($userId <= 0) {
        api_error('User ID is required');
    }

    $pdo->prepare("UPDATE users SET role = 'audience', is_approved = 1 WHERE id = ? AND role = 'musician' AND is_approved = 0")
        ->execute([$userId]);
    api_response(['success' => true, 'message' => 'Musician registration rejected']);
}

function handleDeleteUser(PDO $pdo): void
{
    $input = get_json_input();
    $userId = (int) ($input['user_id'] ?? 0);
    $adminId = (int) $_SESSION['user_id'];

    if ($userId <= 0) {
        api_error('User ID is required');
    }

    if ($userId === $adminId) {
        api_error('Cannot delete your own account');
    }

    $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$userId]);
    api_response(['success' => true, 'message' => 'User deleted']);
}

function handleReportStatus(PDO $pdo): void
{
    $input = get_json_input();
    $reportId = (int) ($input['report_id'] ?? 0);
    $status = $input['status'] ?? 'reviewed';

    if ($reportId <= 0) {
        api_error('Report ID is required');
    }

    if (!in_array($status, ['open', 'reviewed', 'dismissed'], true)) {
        api_error('Invalid status');
    }

    $pdo->prepare("UPDATE reports SET status = ? WHERE id = ?")->execute([$status, $reportId]);
    api_response(['success' => true, 'message' => 'Report status updated']);
}
