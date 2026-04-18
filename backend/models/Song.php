<?php
class Song {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function getAll() {
        $stmt = $this->pdo->query("
            SELECT s.id, s.title, s.artist, s.album, s.duration, 
                   s.file_path, s.cover_image, s.plays, s.created_at,
                   (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count
            FROM songs s
            ORDER BY s.created_at DESC 
            LIMIT 50
        ");
        return $stmt->fetchAll();
    }
    
    public function find($id) {
        $stmt = $this->pdo->prepare("
            SELECT s.*, (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count
            FROM songs s 
            WHERE s.id = ?
        ");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }
    
    public function incrementPlays($id) {
        $stmt = $this->pdo->prepare("UPDATE songs SET plays = plays + 1 WHERE id = ?");
        return $stmt->execute([$id]);
    }
    
    public function search($query) {
        $search = "%{$query}%";
        $stmt = $this->pdo->prepare("
            SELECT s.*, (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count
            FROM songs s 
            WHERE s.title LIKE ? OR s.artist LIKE ? OR s.album LIKE ?
            ORDER BY s.plays DESC
            LIMIT 30
        ");
        $stmt->execute([$search, $search, $search]);
        return $stmt->fetchAll();
    }
    
    public function getTrending() {
        $stmt = $this->pdo->query("
            SELECT s.*, (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count
            FROM songs s 
            ORDER BY s.plays DESC, s.created_at DESC
            LIMIT 10
        ");
        return $stmt->fetchAll();
    }
}
?>