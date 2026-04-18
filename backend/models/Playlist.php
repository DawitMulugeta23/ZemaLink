<?php
class Playlist {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function getUserPlaylists($userId) {
        $stmt = $this->pdo->prepare("
            SELECT p.*, COUNT(ps.song_id) as song_count 
            FROM playlists p 
            LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id 
            WHERE p.user_id = ?
            GROUP BY p.id 
            ORDER BY p.created_at DESC
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }
    
    public function create($name, $userId, $isPublic = false) {
        $stmt = $this->pdo->prepare("INSERT INTO playlists (name, user_id, is_public) VALUES (?, ?, ?)");
        return $stmt->execute([$name, $userId, $isPublic ? 1 : 0]);
    }
    
    public function addSong($playlistId, $songId) {
        // Check if already exists
        $check = $this->pdo->prepare("SELECT * FROM playlist_songs WHERE playlist_id = ? AND song_id = ?");
        $check->execute([$playlistId, $songId]);
        if ($check->fetch()) {
            return false;
        }
        $stmt = $this->pdo->prepare("INSERT INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)");
        return $stmt->execute([$playlistId, $songId]);
    }
    
    public function removeSong($playlistId, $songId) {
        $stmt = $this->pdo->prepare("DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?");
        return $stmt->execute([$playlistId, $songId]);
    }
    
    public function delete($playlistId, $userId) {
        $stmt = $this->pdo->prepare("DELETE FROM playlists WHERE id = ? AND user_id = ?");
        return $stmt->execute([$playlistId, $userId]);
    }
    
    public function getSongs($playlistId) {
        $stmt = $this->pdo->prepare("
            SELECT s.*, (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count
            FROM playlist_songs ps
            JOIN songs s ON ps.song_id = s.id
            WHERE ps.playlist_id = ?
            ORDER BY ps.created_at
        ");
        $stmt->execute([$playlistId]);
        return $stmt->fetchAll();
    }
}
?>