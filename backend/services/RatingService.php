<?php

class RatingService
{
    private PDO $pdo;

    private const WEIGHT_PLAYS = 0.40;
    private const WEIGHT_LIKES = 0.35;
    private const WEIGHT_FRESHNESS = 0.25;

    private const MAX_SCORE = 5.0;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function calculateSongRating(int $songId): float
    {
        $stmt = $this->pdo->prepare(
            "SELECT s.plays, s.created_at, 
                    (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count
             FROM songs s WHERE s.id = ?"
        );
        $stmt->execute([$songId]);
        $song = $stmt->fetch();

        if (!$song) {
            return 0.0;
        }

        $plays = (int) $song['plays'];
        $likesCount = (int) $song['likes_count'];
        $createdAt = strtotime($song['created_at']);
        $daysSinceUpload = max(0, (time() - $createdAt) / 86400);

        $playsScore = min(self::MAX_SCORE, $plays / 200);
        $likesScore = min(self::MAX_SCORE, $likesCount / 20);
        $freshnessScore = min(self::MAX_SCORE, max(0, self::MAX_SCORE - ($daysSinceUpload / 6)));

        $finalRating = ($playsScore * self::WEIGHT_PLAYS)
                     + ($likesScore * self::WEIGHT_LIKES)
                     + ($freshnessScore * self::WEIGHT_FRESHNESS);

        return round(min(self::MAX_SCORE, $finalRating), 1);
    }

    public function getTrendingSongs(int $limit = 20): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT s.*, 
                    (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                    COALESCE(s.rating, 0) as rating,
                    u.name as uploader_name,
                    (SELECT COUNT(*) FROM listening_history 
                     WHERE song_id = s.id AND played_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as recent_plays
             FROM songs s 
             LEFT JOIN users u ON s.uploader_id = u.id
             WHERE s.is_approved = 1
             HAVING recent_plays > 0 OR rating > 0
             ORDER BY (recent_plays * 0.6 + rating * 20 * 0.4) DESC, s.created_at DESC
             LIMIT ?"
        );
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }

    public function getTopRatedSongs(int $limit = 20): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT s.*, 
                    (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                    COALESCE(s.rating, 0) as rating,
                    s.plays as total_plays,
                    u.name as uploader_name
             FROM songs s 
             LEFT JOIN users u ON s.uploader_id = u.id
             WHERE s.is_approved = 1 AND COALESCE(s.rating, 0) > 0
             ORDER BY s.rating DESC, s.plays DESC 
             LIMIT ?"
        );
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }

    public function updateAllRatings(): int
    {
        $stmt = $this->pdo->query("SELECT id FROM songs");
        $songs = $stmt->fetchAll();
        $count = 0;

        foreach ($songs as $song) {
            $rating = $this->calculateSongRating((int) $song['id']);
            $updateStmt = $this->pdo->prepare("UPDATE songs SET rating = ? WHERE id = ?");
            $updateStmt->execute([$rating, (int) $song['id']]);
            $count++;
        }

        return $count;
    }

    public function updateSongRating(int $songId): float
    {
        $rating = $this->calculateSongRating($songId);
        $stmt = $this->pdo->prepare("UPDATE songs SET rating = ? WHERE id = ?");
        $stmt->execute([$rating, $songId]);
        return $rating;
    }

    public function getRatingBreakdown(int $songId): ?array
    {
        $stmt = $this->pdo->prepare(
            "SELECT s.plays, s.rating, s.created_at,
                    (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count
             FROM songs s WHERE s.id = ?"
        );
        $stmt->execute([$songId]);
        $song = $stmt->fetch();

        if (!$song) {
            return null;
        }

        $plays = (int) $song['plays'];
        $likesCount = (int) $song['likes_count'];
        $daysSinceUpload = max(0, (time() - strtotime($song['created_at'])) / 86400);

        return [
            'total_rating' => (float) $song['rating'],
            'plays_score' => round(min(self::MAX_SCORE, $plays / 200), 2),
            'likes_score' => round(min(self::MAX_SCORE, $likesCount / 20), 2),
            'freshness_score' => round(min(self::MAX_SCORE, max(0, self::MAX_SCORE - ($daysSinceUpload / 6))), 2),
            'plays_count' => $plays,
            'likes_count' => $likesCount,
            'days_since_upload' => (int) round($daysSinceUpload),
            'weights' => [
                'plays' => self::WEIGHT_PLAYS,
                'likes' => self::WEIGHT_LIKES,
                'freshness' => self::WEIGHT_FRESHNESS,
            ],
        ];
    }

    public function getNewReleases(int $limit = 20): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT s.*, 
                    (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                    COALESCE(s.rating, 0) as rating,
                    u.name as uploader_name
             FROM songs s 
             LEFT JOIN users u ON s.uploader_id = u.id
             WHERE s.is_approved = 1
             ORDER BY s.created_at DESC 
             LIMIT ?"
        );
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }

    public function getRecommendedSongs(int $userId, int $limit = 20): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT s.*, 
                    (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                    COALESCE(s.rating, 0) as rating,
                    MATCH(s.genre) AGAINST((
                        SELECT GROUP_CONCAT(DISTINCT s2.genre ORDER BY COUNT(*) DESC SEPARATOR ' ')
                        FROM listening_history lh
                        JOIN songs s2 ON lh.song_id = s2.id
                        WHERE lh.user_id = ? AND s2.genre IS NOT NULL AND s2.genre != ''
                        GROUP BY s2.genre
                        ORDER BY COUNT(*) DESC LIMIT 3
                    ) IN BOOLEAN MODE) as relevance
             FROM songs s
             WHERE s.is_approved = 1
               AND s.id NOT IN (
                   SELECT song_id FROM listening_history WHERE user_id = ?
               )
             ORDER BY relevance DESC, s.rating DESC, s.plays DESC
             LIMIT ?"
        );
        $stmt->execute([$userId, $userId, $limit]);
        return $stmt->fetchAll();
    }
}
