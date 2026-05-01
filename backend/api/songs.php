<?php
require_once '../config/database.php';
require_once '../models/Song.php';

$songModel = new Song($pdo);
$method = $_SERVER['REQUEST_METHOD'];

// GET /songs - Get all songs
if ($method === 'GET' && !isset($_GET['search'])) {
    try {
        $songs = $songModel->getAll();
        
        // If no songs exist, return empty array with message
        if (empty($songs)) {
            echo json_encode([
                'success' => true,
                'data' => [],
                'message' => 'No songs found. Add some songs to the database.'
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'data' => $songs,
                'count' => count($songs)
            ]);
        }
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'error' => 'Database error: ' . $e->getMessage()
        ]);
    }
}
// GET /songs?search=query - AI-powered search
elseif ($method === 'GET' && isset($_GET['search'])) {
    $query = trim($_GET['search']);
    if (empty($query)) {
        echo json_encode(['success' => false, 'error' => 'Search query is required']);
        exit;
    }

    try {
        $userId = $_SESSION['user_id'] ?? null;
        $songs = $songModel->aiSearch($query, $userId);
        echo json_encode([
            'success' => true,
            'data' => $songs,
            'count' => count($songs),
            'query' => $query
        ]);
    } catch (Exception $e) {
        // Fallback to basic search if AI fails
        try {
            $songs = $songModel->search($query);
            echo json_encode([
                'success' => true,
                'data' => $songs,
                'count' => count($songs),
                'query' => $query,
                'fallback' => true
            ]);
        } catch (PDOException $dbError) {
            echo json_encode([
                'success' => false,
                'error' => 'Search failed: ' . $dbError->getMessage()
            ]);
        }
    }
}
// GET /songs/{id} - Get single song
elseif ($method === 'GET' && isset($_GET['id'])) {
    $id = $_GET['id'];
    $song = $songModel->find($id);
    
    if ($song) {
        echo json_encode(['success' => true, 'data' => $song]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Song not found']);
    }
}
else {
    echo json_encode(['error' => 'Method not allowed']);
}
?>