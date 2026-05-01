<?php
// backend/models/Song.php
class Song {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function getAll() {
        $stmt = $this->pdo->query("
            SELECT s.id, s.title, s.artist, s.album, s.duration, s.genre, s.description, s.lyrics,
                   s.file_path, s.cover_image, s.plays, s.created_at, s.is_premium, s.price, s.rating,
                   (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count
            FROM songs s
            WHERE s.is_approved = 1
            ORDER BY s.created_at DESC 
            LIMIT 50
        ");
        return $stmt->fetchAll();
    }
    
    public function find($id) {
        $stmt = $this->pdo->prepare("
            SELECT s.*, 
                   (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                   (SELECT COUNT(*) FROM listening_history WHERE song_id = s.id) as total_plays
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
            SELECT s.*, 
                   (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                   COALESCE(s.rating, 0) as rating
            FROM songs s 
            WHERE (s.title LIKE ? OR s.artist LIKE ? OR s.album LIKE ? OR s.genre LIKE ? OR COALESCE(s.description, '') LIKE ?)
            AND s.is_approved = 1
            ORDER BY s.plays DESC
            LIMIT 30
        ");
        $stmt->execute([$search, $search, $search, $search, $search]);
        return $stmt->fetchAll();
    }

    /**
     * AI-powered contextual search
     */
    public function aiSearch($query, $userId = null) {
        require_once __DIR__ . '/../services/AIService.php';
        $aiService = new AIService();
        
        return $aiService->intelligentSearch($query, $userId, 30);
    }
    
    /**
     * Get search suggestions based on partial query
     */
    public function getSearchSuggestions($partial, $userId = null) {
        $suggestions = [];
        $searchTerm = "%{$partial}%";
        
        $stmt = $this->pdo->prepare("
            SELECT DISTINCT genre as value, 'genre' as type
            FROM songs 
            WHERE genre IS NOT NULL AND genre != '' AND genre LIKE ?
            LIMIT 5
        ");
        $stmt->execute([$searchTerm]);
        $suggestions = array_merge($suggestions, $stmt->fetchAll());
        
        $stmt = $this->pdo->prepare("
            SELECT DISTINCT artist as value, 'artist' as type
            FROM songs 
            WHERE artist LIKE ? AND is_approved = 1
            LIMIT 5
        ");
        $stmt->execute([$searchTerm]);
        $suggestions = array_merge($suggestions, $stmt->fetchAll());
        
        $stmt = $this->pdo->prepare("
            SELECT DISTINCT title as value, 'song' as type
            FROM songs 
            WHERE title LIKE ? AND is_approved = 1
            LIMIT 5
        ");
        $stmt->execute([$searchTerm]);
        $suggestions = array_merge($suggestions, $stmt->fetchAll());
        
        return $suggestions;
    }
    
    public function getTrending($limit = 10) {
        $stmt = $this->pdo->prepare("
            SELECT s.*, 
                   (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                   COALESCE(s.rating, 0) as rating
            FROM songs s 
            WHERE s.is_approved = 1 
            ORDER BY s.plays DESC, s.created_at DESC 
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }
    
    public function getTopRated($limit = 10) {
        $stmt = $this->pdo->prepare("
            SELECT s.*, 
                   (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                   COALESCE(s.rating, 0) as rating
            FROM songs s 
            WHERE s.is_approved = 1 
            ORDER BY s.rating DESC, s.plays DESC 
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }
    
    public function getUserRecentListens($userId, $limit = 10) {
        $stmt = $this->pdo->prepare("
            SELECT s.*, lh.played_at as listened_at
            FROM listening_history lh
            JOIN songs s ON lh.song_id = s.id
            WHERE lh.user_id = ?
            ORDER BY lh.played_at DESC
            LIMIT ?
        ");
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
    }
}
?>