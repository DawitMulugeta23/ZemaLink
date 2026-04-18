<?php
require_once '../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET /songs - Get all songs
if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT id, title, artist, album, duration, cover_image, plays FROM songs ORDER BY created_at DESC LIMIT 20");
        $songs = $stmt->fetchAll();
        
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
// GET /songs/{id} - Get single song
elseif ($method === 'GET' && isset($_GET['id'])) {
    $id = $_GET['id'];
    $stmt = $pdo->prepare("SELECT * FROM songs WHERE id = ?");
    $stmt->execute([$id]);
    $song = $stmt->fetch();
    
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