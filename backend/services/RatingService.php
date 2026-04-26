<?php
class RatingService {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * Calculate song rating based ONLY on system data:
     * - Number of plays (40% weight)
     * - Number of likes (35% weight)
     * - Upload date freshness (25% weight)
     * 
     * Rating formula: (plays_score * 0.4) + (likes_score * 0.35) + (freshness_score * 0.25)
     * Final rating is between 0-5 stars
     */
    public function calculateSongRating($songId) {
        // Get song stats
        $stmt = $this->pdo->prepare("
            SELECT 
                s.id,
                s.plays,
                s.created_at,
                (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count
            FROM songs s 
            WHERE s.id = ?
        ");
        $stmt->execute([$songId]);
        $song = $stmt->fetch();
        
        if (!$song) return 0;
        
        $plays = (int) $song['plays'];
        $likesCount = (int) $song['likes_count'];
        $createdAt = strtotime($song['created_at']);
        $daysSinceUpload = max(0, (time() - $createdAt) / 86400);
        
        // Calculate plays score (0-5)
        // 0 plays = 0, 1000+ plays = 5
        $playsScore = min(5, $plays / 200);
        
        // Calculate likes score (0-5)
        // 0 likes = 0, 100+ likes = 5
        $likesScore = min(5, $likesCount / 20);
        
        // Calculate freshness score (0-5)
        // New songs (0 days) = 5, Old songs (30+ days) = 0
        $freshnessScore = max(0, 5 - ($daysSinceUpload / 6));
        $freshnessScore = min(5, $freshnessScore);
        
        // Weighted calculation
        $finalRating = (
            ($playsScore * 0.40) + 
            ($likesScore * 0.35) + 
            ($freshnessScore * 0.25)
        );
        
        // Round to 1 decimal place
        return round($finalRating, 1);
    }
    
    /**
     * Update song rating in database
     */
    public function updateSongRating($songId) {
        $rating = $this->calculateSongRating($songId);
        $stmt = $this->pdo->prepare("UPDATE songs SET rating = ? WHERE id = ?");
        $stmt->execute([$rating, $songId]);
        return $rating;
    }
    
    /**
     * Update all songs ratings
     */
    public function updateAllRatings() {
        $stmt = $this->pdo->query("SELECT id FROM songs");
        $songs = $stmt->fetchAll();
        
        foreach ($songs as $song) {
            $this->updateSongRating($song['id']);
        }
        
        return count($songs);
    }
    
    /**
     * Get top rated songs
     */
    public function getTopRated($limit = 10) {
        $stmt = $this->pdo->prepare("
            SELECT s.*, 
                   (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count
            FROM songs s 
            WHERE s.is_approved = 1 
            ORDER BY s.rating DESC, s.plays DESC 
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }
    
    /**
     * Get rating breakdown for a song
     */
    public function getRatingBreakdown($songId) {
        $stmt = $this->pdo->prepare("
            SELECT 
                s.plays,
                s.rating,
                (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                s.created_at
            FROM songs s 
            WHERE s.id = ?
        ");
        $stmt->execute([$songId]);
        $song = $stmt->fetch();
        
        if (!$song) return null;
        
        $playsScore = min(5, $song['plays'] / 200);
        $likesScore = min(5, $song['likes_count'] / 20);
        
        $daysSinceUpload = max(0, (time() - strtotime($song['created_at'])) / 86400);
        $freshnessScore = max(0, min(5, 5 - ($daysSinceUpload / 6)));
        
        return [
            'total_rating' => (float) $song['rating'],
            'plays_score' => round($playsScore, 1),
            'likes_score' => round($likesScore, 1),
            'freshness_score' => round($freshnessScore, 1),
            'plays_count' => (int) $song['plays'],
            'likes_count' => (int) $song['likes_count'],
            'days_since_upload' => round($daysSinceUpload, 0)
        ];
    }
}
?>