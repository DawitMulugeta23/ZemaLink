<?php
class Like {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function getUserLikes($userId) {
        $stmt = $this->pdo->prepare("
            SELECT s.*, (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count
            FROM likes l
            JOIN songs s ON l.song_id = s.id
            WHERE l.user_id = ?
            ORDER BY l.created_at DESC
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }
    
    public function toggle($userId, $songId) {
        $stmt = $this->pdo->prepare("SELECT * FROM likes WHERE user_id = ? AND song_id = ?");
        $stmt->execute([$userId, $songId]);
        
        if ($stmt->fetch()) {
            $stmt = $this->pdo->prepare("DELETE FROM likes WHERE user_id = ? AND song_id = ?");
            $stmt->execute([$userId, $songId]);
            return ['success' => true, 'liked' => false];
        } else {
            $stmt = $this->pdo->prepare("INSERT INTO likes (user_id, song_id) VALUES (?, ?)");
            $stmt->execute([$userId, $songId]);
            return ['success' => true, 'liked' => true];
        }
    }
    
    public function count($songId) {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) as count FROM likes WHERE song_id = ?");
        $stmt->execute([$songId]);
        return $stmt->fetch()['count'];
    }
}
?>