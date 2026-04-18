<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class MusicianController {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function uploadSong($data) {
        requireRole('musician');
        
        if (empty($data['title']) || empty($data['artist']) || empty($data['file_path'])) {
            return ['success' => false, 'message' => 'Title, artist, and file are required'];
        }
        
        $userId = $_SESSION['user_id'];
        $stmt = $this->pdo->prepare("
            INSERT INTO songs (title, artist, album, duration, file_path, cover_image, genre, lyrics, uploaded_by, is_approved) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        ");
        
        $result = $stmt->execute([
            $data['title'], 
            $data['artist'], 
            $data['album'] ?? null, 
            $data['duration'] ?? 0, 
            $data['file_path'], 
            $data['cover_image'] ?? null,
            $data['genre'] ?? null,
            $data['lyrics'] ?? null,
            $userId
        ]);
        
        if ($result) {
            return ['success' => true, 'message' => 'Song uploaded successfully! Pending admin approval.'];
        }
        
        return ['success' => false, 'message' => 'Failed to upload song'];
    }
    
    public function getMySongs() {
        requireRole('musician');
        $userId = $_SESSION['user_id'];
        
        $stmt = $this->pdo->prepare("
            SELECT s.*, 
                   (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count
            FROM songs s 
            WHERE s.uploaded_by = ? 
            ORDER BY s.created_at DESC
        ");
        $stmt->execute([$userId]);
        $songs = $stmt->fetchAll();
        
        return ['success' => true, 'songs' => $songs];
    }
    
    public function updateSong($id, $data) {
        requireRole('musician');
        $userId = $_SESSION['user_id'];
        
        // Check if song belongs to the musician
        $check = $this->pdo->prepare("SELECT id FROM songs WHERE id = ? AND uploaded_by = ?");
        $check->execute([$id, $userId]);
        if (!$check->fetch()) {
            return ['success' => false, 'message' => 'You can only edit your own songs'];
        }
        
        $stmt = $this->pdo->prepare("
            UPDATE songs SET title = ?, artist = ?, album = ?, genre = ?, lyrics = ? 
            WHERE id = ? AND uploaded_by = ?
        ");
        
        $result = $stmt->execute([
            $data['title'], 
            $data['artist'], 
            $data['album'] ?? null, 
            $data['genre'] ?? null,
            $data['lyrics'] ?? null,
            $id, 
            $userId
        ]);
        
        return ['success' => $result, 'message' => $result ? 'Song updated successfully' : 'Failed to update song'];
    }
}
?>