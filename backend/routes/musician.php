<?php

$user = $auth->requireApprovedMusician();
$userId = (int) $user['id'];

switch ($method) {
    case 'GET':
        match ($sub) {
            'my-songs' => handleMySongs($pdo, $userId),
            'stats' => handleMusicianStats($pdo, $userId),
            'earnings' => handleMusicianEarnings($pdo, $userId),
            'events' => handleMyEvents($pdo, $userId),
            'live-streams' => handleMyStreams($pdo, $userId),
            'profile' => handleMusicianProfile($pdo, $userId),
            default => api_error('Musician route not found', 404),
        };
        break;

    case 'POST':
        match ($sub) {
            'upload-song' => handleUploadSong($pdo, $userId, $uploadService),
            'update-song' => handleUpdateSong($pdo, $userId, $uploadService),
            'delete-song' => handleDeleteSong($pdo, $userId),
            default => api_error('Musician route not found', 404),
        };
        break;

    default:
        api_error('Method not allowed', 405);
}

function handleMySongs(PDO $pdo, int $userId): void
{
    $stmt = $pdo->prepare(
        "SELECT s.*, 
                (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                (SELECT COUNT(*) FROM user_purchases WHERE song_id = s.id) as purchase_count,
                COALESCE(s.rating, 0) as rating
         FROM songs s 
         WHERE s.uploader_id = ? 
         ORDER BY s.created_at DESC"
    );
    $stmt->execute([$userId]);
    api_response(['success' => true, 'songs' => $stmt->fetchAll()]);
}

function handleMusicianStats(PDO $pdo, int $userId): void
{
    $stmt = $pdo->prepare("SELECT COUNT(*) as songs, COALESCE(SUM(plays), 0) as plays FROM songs WHERE uploader_id = ?");
    $stmt->execute([$userId]);
    $songStats = $stmt->fetch();

    $stmt = $pdo->prepare("SELECT COUNT(*) as likes FROM likes l JOIN songs s ON l.song_id = s.id WHERE s.uploader_id = ?");
    $stmt->execute([$userId]);
    $likesCount = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT COUNT(*) as purchases FROM user_purchases up JOIN songs s ON up.song_id = s.id WHERE s.uploader_id = ?");
    $stmt->execute([$userId]);
    $purchasesCount = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT COUNT(*) as events FROM events WHERE musician_id = ?");
    $stmt->execute([$userId]);
    $eventsCount = (int) $stmt->fetchColumn();

    api_response([
        'success' => true,
        'stats' => [
            'songs' => (int) ($songStats['songs'] ?? 0),
            'plays' => (int) ($songStats['plays'] ?? 0),
            'likes' => $likesCount,
            'purchases' => $purchasesCount,
            'events' => $eventsCount,
        ],
    ]);
}

function handleMusicianEarnings(PDO $pdo, int $userId): void
{
    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(p.amount), 0) as total 
         FROM payments p 
         JOIN songs s ON p.song_id = s.id 
         WHERE s.uploader_id = ? AND p.status = 'completed' AND p.payment_type = 'song'"
    );
    $stmt->execute([$userId]);
    $earnings = (float) $stmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT p.amount, p.payment_date, p.payment_type, s.title as song_title
         FROM payments p 
         JOIN songs s ON p.song_id = s.id 
         WHERE s.uploader_id = ? AND p.status = 'completed' AND p.payment_type = 'song'
         ORDER BY p.payment_date DESC 
         LIMIT 50"
    );
    $stmt->execute([$userId]);
    $transactions = $stmt->fetchAll();

    api_response([
        'success' => true,
        'earnings' => $earnings,
        'transactions' => $transactions,
    ]);
}

function handleMyEvents(PDO $pdo, int $userId): void
{
    $stmt = $pdo->prepare("SELECT * FROM events WHERE musician_id = ? ORDER BY event_date ASC");
    $stmt->execute([$userId]);
    api_response(['success' => true, 'events' => $stmt->fetchAll()]);
}

function handleMyStreams(PDO $pdo, int $userId): void
{
    $stmt = $pdo->prepare("SELECT * FROM live_streams WHERE musician_id = ? ORDER BY scheduled_at ASC");
    $stmt->execute([$userId]);
    api_response(['success' => true, 'streams' => $stmt->fetchAll()]);
}

function handleMusicianProfile(PDO $pdo, int $userId): void
{
    $stmt = $pdo->prepare(
        "SELECT u.id, u.name, u.email, u.avatar, u.created_at as member_since,
                (SELECT COUNT(*) FROM songs WHERE uploader_id = u.id AND is_approved = 1) as song_count,
                (SELECT COALESCE(SUM(plays), 0) FROM songs WHERE uploader_id = u.id) as total_plays
         FROM users u WHERE u.id = ?"
    );
    $stmt->execute([$userId]);
    $profile = $stmt->fetch();

    if (!$profile) {
        api_error('Profile not found', 404);
    }

    api_response(['success' => true, 'profile' => $profile]);
}

function handleUploadSong(PDO $pdo, int $userId, UploadService $uploadService): void
{
    $title = trim($_POST['title'] ?? '');
    $artist = trim($_POST['artist'] ?? '');
    $album = trim($_POST['album'] ?? '');
    $genre = trim($_POST['genre'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $lyrics = trim($_POST['lyrics'] ?? '');
    $isPremium = !empty($_POST['is_premium']) ? 1 : 0;
    $price = isset($_POST['price']) ? (float) $_POST['price'] : 0;
    $mediaType = $_POST['media_type'] ?? 'audio';

    if ($title === '' || $artist === '') {
        api_error('Title and artist are required');
    }

    if ($isPremium && $price <= 0) {
        api_error('Please set a valid price for premium content');
    }

    if (!isset($_FILES['media_file']) || $_FILES['media_file']['error'] !== UPLOAD_ERR_OK) {
        api_error('Media file is required');
    }

    $uploadType = $mediaType === 'video' ? 'video' : 'audio';
    $uploadResult = $uploadService->upload($_FILES['media_file'], $uploadType);

    if (!$uploadResult['success']) {
        api_error($uploadResult['message'] ?? 'Upload failed');
    }

    $mediaPath = $uploadResult['url'];

    $coverPath = null;
    if (isset($_FILES['cover_image']) && $_FILES['cover_image']['error'] === UPLOAD_ERR_OK) {
        $coverResult = $uploadService->upload($_FILES['cover_image'], 'image');
        if ($coverResult['success']) {
            $coverPath = $coverResult['url'];
        }
    }

    $duration = 0;
    if (!$uploadResult['cloudinary'] && isset($uploadResult['path']) && file_exists($uploadResult['path'])) {
        if (function_exists('shell_exec')) {
            $ffprobe = shell_exec(
                "ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "
                . escapeshellarg($uploadResult['path']) . " 2>/dev/null"
            );
            if ($ffprobe !== null && is_numeric(trim($ffprobe))) {
                $duration = (int) ceil((float) trim($ffprobe));
            }
        }
    }

    $stmt = $pdo->prepare(
        "INSERT INTO songs (title, artist, album, genre, description, lyrics, 
                           file_path, cover_image, media_type, duration, 
                           is_premium, price, uploader_id, uploaded_by, 
                           is_approved, plays, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW())"
    );
    $stmt->execute([
        $title, $artist, $album, $genre, $description, $lyrics,
        $mediaPath, $coverPath, $mediaType, $duration,
        $isPremium, $price, $userId, $userId,
    ]);

    $songId = $pdo->lastInsertId();

    api_response([
        'success' => true,
        'message' => 'Song uploaded successfully! Pending admin approval.',
        'song_id' => (int) $songId,
        'media_url' => $mediaPath,
        'cover_url' => $coverPath,
        'duration' => $duration,
    ]);
}

function handleUpdateSong(PDO $pdo, int $userId, UploadService $uploadService): void
{
    $input = get_json_input() + $_POST;
    $songId = (int) ($id !== 'update-song' ? $id : ($input['song_id'] ?? 0));
    if (is_numeric($sub)) {
        $songId = (int) $sub;
    }

    if ($songId <= 0) {
        api_error('Song ID is required');
    }

    $stmt = $pdo->prepare("SELECT * FROM songs WHERE id = ? AND uploader_id = ?");
    $stmt->execute([$songId, $userId]);
    $song = $stmt->fetch();

    if (!$song) {
        api_error('Song not found or unauthorized', 404);
    }

    $title = trim($input['title'] ?? $song['title']);
    $artist = trim($input['artist'] ?? $song['artist']);
    $album = trim($input['album'] ?? $song['album']);
    $genre = trim($input['genre'] ?? $song['genre'] ?? '');
    $isPremium = isset($input['is_premium']) ? ($input['is_premium'] ? 1 : 0) : (int) $song['is_premium'];
    $price = isset($input['price']) ? (float) $input['price'] : (float) $song['price'];

    if ($isPremium && $price <= 0) {
        api_error('Set a valid price for premium content');
    }

    $filePath = $song['file_path'];
    if (isset($_FILES['media_file']) && $_FILES['media_file']['error'] === UPLOAD_ERR_OK) {
        $uploadResult = $uploadService->upload($_FILES['media_file'], $song['media_type'] ?? 'audio');
        if ($uploadResult['success']) {
            $filePath = $uploadResult['url'];
        }
    }

    $coverPath = $song['cover_image'];
    if (isset($_FILES['cover_image']) && $_FILES['cover_image']['error'] === UPLOAD_ERR_OK) {
        $coverResult = $uploadService->upload($_FILES['cover_image'], 'image');
        if ($coverResult['success']) {
            $coverPath = $coverResult['url'];
        }
    }

    $pdo->prepare(
        "UPDATE songs SET title = ?, artist = ?, album = ?, genre = ?, 
                          file_path = ?, cover_image = ?, is_premium = ?, price = ?, 
                          is_approved = 0 
         WHERE id = ? AND uploader_id = ?"
    )->execute([$title, $artist, $album, $genre, $filePath, $coverPath, $isPremium, $price, $songId, $userId]);

    api_response(['success' => true, 'message' => 'Song updated. Pending approval.']);
}

function handleDeleteSong(PDO $pdo, int $userId): void
{
    $input = get_json_input();
    $songId = (int) ($input['song_id'] ?? 0);
    if (is_numeric($sub)) {
        $songId = (int) $sub;
    }

    if ($songId <= 0) {
        api_error('Song ID is required');
    }

    $stmt = $pdo->prepare("SELECT file_path, cover_image FROM songs WHERE id = ? AND uploader_id = ?");
    $stmt->execute([$songId, $userId]);
    $song = $stmt->fetch();

    if (!$song) {
        api_error('Song not found or unauthorized', 404);
    }

    $uploadService->deleteFile($song['file_path']);
    if ($song['cover_image']) {
        $uploadService->deleteFile($song['cover_image']);
    }

    $pdo->prepare("DELETE FROM songs WHERE id = ? AND uploader_id = ?")->execute([$songId, $userId]);

    api_response(['success' => true, 'message' => 'Song deleted']);
}
