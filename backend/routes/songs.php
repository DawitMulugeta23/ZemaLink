<?php

$limit = min(100, max(1, (int) ($_GET['limit'] ?? ITEMS_PER_PAGE)));
$page = max(1, (int) ($_GET['page'] ?? 1));
$offset = ($page - 1) * $limit;
$genre = trim($_GET['genre'] ?? '');
$sort = $_GET['sort'] ?? 'latest';

if ($method === 'GET' && $sub === '') {
    $conditions = ['s.is_approved = 1'];
    $params = [];

    if ($genre !== '') {
        $conditions[] = 's.genre = :genre';
        $params[':genre'] = $genre;
    }

    $orderClause = match ($sort) {
        'popular' => 's.plays DESC, s.rating DESC',
        'rated' => 's.rating DESC, s.plays DESC',
        'oldest' => 's.created_at ASC',
        default => 's.featured DESC, s.created_at DESC',
    };

    $where = implode(' AND ', $conditions);

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM songs s WHERE {$where}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT s.*, 
                (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                COALESCE(s.rating, 0) as rating
         FROM songs s 
         WHERE {$where}
         ORDER BY {$orderClause}
         LIMIT ? OFFSET ?"
    );
    $stmt->execute([...array_values($params), $limit, $offset]);
    $songs = $stmt->fetchAll();

    api_response([
        'success' => true,
        'songs' => $songs,
        'pagination' => paginate($page, $limit, $total),
        'filters' => [
            'genre' => $genre,
            'sort' => $sort,
        ],
    ]);
}

if ($method === 'GET' && $sub === 'featured') {
    $stmt = $pdo->query(
        "SELECT s.*, 
                (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                COALESCE(s.rating, 0) as rating
         FROM songs s 
         WHERE s.is_approved = 1 AND s.featured = 1
         ORDER BY s.created_at DESC 
         LIMIT 10"
    );
    api_response(['success' => true, 'songs' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $sub === 'genres') {
    $stmt = $pdo->query(
        "SELECT genre, COUNT(*) as count 
         FROM songs 
         WHERE is_approved = 1 AND genre IS NOT NULL AND genre != '' 
         GROUP BY genre 
         ORDER BY count DESC"
    );
    api_response(['success' => true, 'genres' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $sub === 'search') {
    $query = trim($_GET['q'] ?? '');
    if ($query === '') {
        api_error('Search query required');
    }

    $searchTerm = '%' . $query . '%';

    if (isset($_GET['ai']) && $_GET['ai'] === 'true') {
        $userId = $_SESSION['user_id'] ?? null;
        $result = $aiService->search($query, $userId);
        api_response($result);
    }

    $stmt = $pdo->prepare(
        "SELECT s.*, 
                (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                COALESCE(s.rating, 0) as rating
         FROM songs s 
         WHERE s.is_approved = 1 
           AND (s.title LIKE ? OR s.artist LIKE ? OR s.album LIKE ? OR COALESCE(s.description, '') LIKE ?)
         ORDER BY s.featured DESC, s.rating DESC, s.plays DESC 
         LIMIT 50"
    );
    $stmt->execute([$searchTerm, $searchTerm, $searchTerm, $searchTerm]);

    api_response([
        'success' => true,
        'songs' => $stmt->fetchAll(),
        'query' => $query,
    ]);
}

if ($method === 'GET' && $sub === 'trending') {
    $limit = min(50, max(1, (int) ($_GET['limit'] ?? 20)));
    $songs = $ratingService->getTrendingSongs($limit);
    api_response(['success' => true, 'songs' => $songs]);
}

if ($method === 'GET' && $sub === 'top-rated') {
    $limit = min(50, max(1, (int) ($_GET['limit'] ?? 20)));
    $songs = $ratingService->getTopRatedSongs($limit);
    api_response(['success' => true, 'songs' => $songs]);
}

if ($method === 'GET' && $sub === 'new-releases') {
    $limit = min(50, max(1, (int) ($_GET['limit'] ?? 20)));
    $songs = $ratingService->getNewReleases($limit);
    api_response(['success' => true, 'songs' => $songs]);
}

if ($method === 'GET' && is_numeric($sub) && $subId === '') {
    $songId = (int) $sub;
    $stmt = $pdo->prepare(
        "SELECT s.*, 
                (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                COALESCE(s.rating, 0) as rating,
                u.name as uploader_name
         FROM songs s 
         LEFT JOIN users u ON s.uploader_id = u.id
         WHERE s.id = ?"
    );
    $stmt->execute([$songId]);
    $song = $stmt->fetch();

    if (!$song) {
        api_error('Song not found', 404);
    }

    $hasAccess = true;
    if ($song['is_premium'] == 1) {
        $user = $auth->getUser();
        if ($user === null) {
            $hasAccess = false;
        } elseif (($user['subscription'] ?? 'free') === 'premium') {
            $hasAccess = true;
        } else {
            $check = $pdo->prepare("SELECT id FROM user_purchases WHERE user_id = ? AND song_id = ?");
            $check->execute([$user['id'], $songId]);
            $hasAccess = $check->fetch() ? true : false;
        }
    }

    $song['can_play'] = $hasAccess;

    api_response(['success' => true, 'data' => $song]);
}

api_error('Songs route not found', 404);
