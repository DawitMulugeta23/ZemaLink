<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_start();

require_once __DIR__ . '/config/database.php';

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['success' => false, 'error' => 'Invalid data']);
    exit();
}

$title = $input['title'] ?? '';
$artist = $input['artist'] ?? '';
$album = $input['album'] ?? '';
$genre = $input['genre'] ?? '';
$description = $input['description'] ?? '';
$lyrics = $input['lyrics'] ?? '';
$duration = $input['audio_duration'] ?? 0;
$audioUrl = $input['audio_url'] ?? '';
$audioPublicId = $input['audio_public_id'] ?? '';
$coverUrl = $input['cover_url'] ?? '';
$coverPublicId = $input['cover_public_id'] ?? '';
$isPremium = $input['is_premium'] ?? 0;
$price = $input['price'] ?? 0;
$userId = $_SESSION['user_id'] ?? 0;

if (empty($title) || empty($artist) || empty($audioUrl)) {
    echo json_encode(['success' => false, 'error' => 'Title, artist, and audio file are required']);
    exit();
}

$stmt = $pdo->prepare("
    INSERT INTO songs (title, artist, album, genre, description, lyrics, duration, file_path, cover_image, 
                      cloudinary_public_id, cloudinary_cover_id, is_premium, price, uploaded_by) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
");

$result = $stmt->execute([
    $title, $artist, $album, $genre, $description, $lyrics, $duration, $audioUrl, $coverUrl,
    $audioPublicId, $coverPublicId, $isPremium, $price, $userId
]);

if ($result) {
    echo json_encode(['success' => true, 'message' => 'Song uploaded successfully']);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to save song']);
}
?>