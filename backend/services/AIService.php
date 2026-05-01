<?php
// backend/services/AIService.php
require_once __DIR__ . '/../config/config.php';

class AIService {
    private $apiKey;
    private $baseUrl = 'https://api.openai.com/v1';
    public $useMockData = false;

    public function __construct() {
        $this->apiKey = getenv('OPENAI_API_KEY') ?: $_ENV['OPENAI_API_KEY'] ?? '';
        if (!$this->apiKey || $this->apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
            $this->useMockData = true;
            error_log('OpenAI API key not configured - using mock search responses');
        }
    }

    /**
     * Interpret natural language search query with user context
     */
    public function interpretSearchQuery($query, $userContext = []) {
        if ($this->useMockData) {
            return $this->mockInterpretation($query, $userContext);
        }

        $systemPrompt = "You are ZemaLink's AI music search engine. Analyze music search queries and extract structured search parameters.

Return ONLY valid JSON with these fields:
{
    \"primary_genre\": string|null,
    \"secondary_genres\": string[],
    \"mood\": string|null,
    \"tempo\": \"slow\"|\"medium\"|\"fast\"|null,
    \"era\": string|null,
    \"artists\": string[],
    \"instruments\": string[],
    \"keywords\": string[],
    \"explicit_filter\": boolean,
    \"language\": string|null,
    \"search_intent\": \"discovery\"|\"specific\"|\"similar\"|\"mood_match\"
}

Be specific and accurate. If query mentions multiple genres, list secondary ones separately.";

        $contextStr = '';
        if (!empty($userContext)) {
            $contextStr = "\n\nUser Context:\n";
            if (!empty($userContext['recent_genres'])) {
                $contextStr .= "- Recently played genres: " . implode(', ', array_slice($userContext['recent_genres'], 0, 5)) . "\n";
            }
            if (!empty($userContext['favorite_artists'])) {
                $contextStr .= "- Favorite artists: " . implode(', ', array_slice($userContext['favorite_artists'], 0, 5)) . "\n";
            }
            if (!empty($userContext['time_of_day'])) {
                $contextStr .= "- Time of day: " . $userContext['time_of_day'] . "\n";
            }
        }

        $userPrompt = "Search Query: \"$query\"$contextStr\n\nAnalyze this search query and return structured search parameters as JSON.";

        $response = $this->callOpenAI($systemPrompt, $userPrompt);

        if ($response && isset($response['choices'][0]['message']['content'])) {
            $content = $response['choices'][0]['message']['content'];
            $parsed = json_decode($content, true);
            return $parsed ?: $this->fallbackInterpretation($query);
        }

        return $this->fallbackInterpretation($query);
    }

    /**
     * Enhanced search with vector similarity and context ranking
     */
    public function intelligentSearch($query, $userId = null, $limit = 30) {
        $pdo = $this->getDbConnection();
        
        $userContext = $this->getUserContext($pdo, $userId);
        $interpretation = $this->interpretSearchQuery($query, $userContext);
        
        $sql = $this->buildDynamicSearchQuery($interpretation);
        $params = $this->buildSearchParams($interpretation, $query);
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll();
        
        $scoredResults = $this->rankResults($results, $interpretation, $userContext, $query);
        
        usort($scoredResults, function($a, $b) {
            return $b['relevance_score'] <=> $a['relevance_score'];
        });
        
        return array_slice($scoredResults, 0, $limit);
    }

    private function buildDynamicSearchQuery($interpretation) {
        $conditions = ["s.is_approved = 1"];
        
        if (!empty($interpretation['primary_genre'])) {
            $conditions[] = "(s.genre = :primary_genre OR s.genre LIKE :primary_genre_like)";
        }
        
        if (!empty($interpretation['secondary_genres'])) {
            $genreConditions = [];
            foreach ($interpretation['secondary_genres'] as $idx => $genre) {
                $genreConditions[] = "s.genre LIKE :secondary_genre_{$idx}";
            }
            if (!empty($genreConditions)) {
                $conditions[] = "(" . implode(' OR ', $genreConditions) . ")";
            }
        }
        
        if (!empty($interpretation['artists'])) {
            $artistConditions = [];
            foreach ($interpretation['artists'] as $idx => $artist) {
                $artistConditions[] = "s.artist LIKE :artist_{$idx}";
            }
            if (!empty($artistConditions)) {
                $conditions[] = "(" . implode(' OR ', $artistConditions) . ")";
            }
        }
        
        if (!empty($interpretation['mood'])) {
            $moodGenres = $this->getMoodGenreMapping($interpretation['mood']);
            if (!empty($moodGenres)) {
                $moodConditions = [];
                foreach ($moodGenres as $idx => $genre) {
                    $moodConditions[] = "s.genre = :mood_genre_{$idx}";
                }
                if (!empty($moodConditions)) {
                    $conditions[] = "(" . implode(' OR ', $moodConditions) . ")";
                }
            }
        }
        
        $conditions[] = "(s.title LIKE :search OR s.artist LIKE :search OR s.album LIKE :search OR COALESCE(s.description, '') LIKE :search)";
        
        $whereClause = implode(' AND ', $conditions);
        
        return "
            SELECT 
                s.*,
                (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                COALESCE(s.rating, 0) as rating,
                (SELECT COUNT(*) FROM listening_history WHERE song_id = s.id) as total_plays,
                CASE 
                    WHEN DATEDIFF(NOW(), s.created_at) <= 7 THEN 'new'
                    WHEN DATEDIFF(NOW(), s.created_at) <= 30 THEN 'recent'
                    ELSE 'classic'
                END as freshness
            FROM songs s 
            WHERE {$whereClause}
            ORDER BY 
                CASE WHEN s.featured = 1 THEN 1 ELSE 0 END DESC,
                s.rating DESC,
                s.plays DESC
            LIMIT 100
        ";
    }

    private function buildSearchParams($interpretation, $query) {
        $params = [];
        
        if (!empty($interpretation['primary_genre'])) {
            $params[':primary_genre'] = $interpretation['primary_genre'];
            $params[':primary_genre_like'] = '%' . $interpretation['primary_genre'] . '%';
        }
        
        if (!empty($interpretation['secondary_genres'])) {
            foreach ($interpretation['secondary_genres'] as $idx => $genre) {
                $params[":secondary_genre_{$idx}"] = '%' . $genre . '%';
            }
        }
        
        if (!empty($interpretation['artists'])) {
            foreach ($interpretation['artists'] as $idx => $artist) {
                $params[":artist_{$idx}"] = '%' . $artist . '%';
            }
        }
        
        if (!empty($interpretation['mood'])) {
            $moodGenres = $this->getMoodGenreMapping($interpretation['mood']);
            foreach ($moodGenres as $idx => $genre) {
                $params[":mood_genre_{$idx}"] = $genre;
            }
        }
        
        $params[':search'] = '%' . $query . '%';
        
        return $params;
    }

    private function rankResults($results, $interpretation, $userContext, $originalQuery) {
        $scored = [];
        
        foreach ($results as $result) {
            $score = 0;
            
            $titleScore = $this->calculateTextSimilarity($result['title'], $originalQuery);
            $score += $titleScore * 0.4;
            
            $artistScore = $this->calculateTextSimilarity($result['artist'], $originalQuery);
            $score += $artistScore * 0.25;
            
            $genreScore = $this->calculateGenreMatchScore($result['genre'], $interpretation);
            $score += $genreScore * 0.2;
            
            $popularityScore = min(1, ($result['plays'] / 1000)) * 0.5 + min(1, ($result['likes_count'] / 100)) * 0.5;
            $score += $popularityScore * 0.1;
            
            if (!empty($userContext['favorite_artists'])) {
                $personalizationScore = in_array($result['artist'], $userContext['favorite_artists']) ? 1 : 0;
                $score += $personalizationScore * 0.05;
            }
            
            $daysOld = (time() - strtotime($result['created_at'])) / 86400;
            if ($daysOld <= 7) {
                $score += 0.1;
            }
            
            $scored[] = array_merge($result, [
                'relevance_score' => round($score, 3),
                'match_reason' => $this->generateMatchReason($result, $interpretation, $titleScore, $artistScore, $genreScore)
            ]);
        }
        
        return $scored;
    }

    private function calculateTextSimilarity($text, $query) {
        if (empty($text) || empty($query)) return 0;
        
        $textLower = strtolower($text);
        $queryLower = strtolower($query);
        $queryWords = explode(' ', $queryLower);
        
        $score = 0;
        foreach ($queryWords as $word) {
            if (strlen($word) < 3) continue;
            if (strpos($textLower, $word) !== false) {
                $score += 1;
            }
        }
        
        if ($textLower === $queryLower) {
            $score += 2;
        }
        
        if (strpos($textLower, $queryLower) === 0) {
            $score += 1;
        }
        
        return min(1, $score / max(1, count($queryWords)));
    }

    private function calculateGenreMatchScore($songGenre, $interpretation) {
        if (empty($songGenre)) return 0;
        
        $score = 0;
        $songGenreLower = strtolower($songGenre);
        
        if (!empty($interpretation['primary_genre']) && 
            stripos($songGenreLower, $interpretation['primary_genre']) !== false) {
            $score += 1;
        }
        
        if (!empty($interpretation['secondary_genres'])) {
            foreach ($interpretation['secondary_genres'] as $genre) {
                if (stripos($songGenreLower, $genre) !== false) {
                    $score += 0.5;
                }
            }
        }
        
        if (!empty($interpretation['mood'])) {
            $moodGenres = $this->getMoodGenreMapping($interpretation['mood']);
            if (in_array($songGenre, $moodGenres)) {
                $score += 0.3;
            }
        }
        
        return min(1, $score);
    }

    private function getMoodGenreMapping($mood) {
        $mappings = [
            'happy' => ['Pop', 'Dance', 'Disco', 'Funk', 'Soul'],
            'sad' => ['Blues', 'Country', 'Ballad', 'Emo', 'Slow Rock'],
            'energetic' => ['Rock', 'Metal', 'Electronic', 'Drum and Bass', 'Hardstyle'],
            'chill' => ['Jazz', 'Lofi', 'Ambient', 'Downtempo', 'Reggae'],
            'romantic' => ['R&B', 'Soul', 'Ballad', 'Love Songs'],
            'angry' => ['Metal', 'Punk', 'Hard Rock', 'Industrial'],
            'focused' => ['Classical', 'Ambient', 'Instrumental', 'Lofi Hip Hop'],
            'nostalgic' => ['Classic Rock', 'Oldies', 'Retro', '80s', '90s']
        ];
        
        return $mappings[$mood] ?? [];
    }

    private function getUserContext($pdo, $userId) {
        $context = [];
        
        if ($userId) {
            $stmt = $pdo->prepare("
                SELECT DISTINCT s.genre, COUNT(*) as count
                FROM listening_history lh
                JOIN songs s ON lh.song_id = s.id
                WHERE lh.user_id = ? AND s.genre IS NOT NULL AND s.genre != ''
                GROUP BY s.genre
                ORDER BY count DESC
                LIMIT 5
            ");
            $stmt->execute([$userId]);
            $context['recent_genres'] = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
            
            $stmt = $pdo->prepare("
                SELECT s.artist, COUNT(*) as listen_count
                FROM listening_history lh
                JOIN songs s ON lh.song_id = s.id
                WHERE lh.user_id = ? AND s.artist IS NOT NULL AND s.artist != ''
                GROUP BY s.artist
                ORDER BY listen_count DESC
                LIMIT 10
            ");
            $stmt->execute([$userId]);
            $context['favorite_artists'] = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
            
            $hour = (int) date('H');
            if ($hour >= 5 && $hour < 12) $context['time_of_day'] = 'morning';
            elseif ($hour >= 12 && $hour < 17) $context['time_of_day'] = 'afternoon';
            elseif ($hour >= 17 && $hour < 22) $context['time_of_day'] = 'evening';
            else $context['time_of_day'] = 'night';
        }
        
        return $context;
    }

    private function getDbConnection() {
        require_once __DIR__ . '/../config/database.php';
        global $pdo;
        return $pdo;
    }

    private function callOpenAI($systemPrompt, $userPrompt) {
        $data = [
            'model' => 'gpt-3.5-turbo',
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userPrompt]
            ],
            'max_tokens' => 300,
            'temperature' => 0.7
        ];

        $ch = curl_init($this->baseUrl . '/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->apiKey
            ],
            CURLOPT_TIMEOUT => 10
        ]);

        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            error_log("OpenAI API error: $httpCode - " . substr($result, 0, 200));
            return null;
        }

        return json_decode($result, true);
    }

    private function mockInterpretation($query, $userContext) {
        $queryLower = strtolower($query);
        
        if (strpos($queryLower, 'happy') !== false || strpos($queryLower, 'upbeat') !== false) {
            return [
                'primary_genre' => 'Pop',
                'secondary_genres' => ['Dance', 'Electronic'],
                'mood' => 'happy',
                'tempo' => 'fast',
                'artists' => [],
                'keywords' => ['happy', 'upbeat'],
                'search_intent' => 'mood_match'
            ];
        }
        
        if (strpos($queryLower, 'sad') !== false || strpos($queryLower, 'emotional') !== false) {
            return [
                'primary_genre' => 'Blues',
                'secondary_genres' => ['Ballad', 'Slow Rock'],
                'mood' => 'sad',
                'tempo' => 'slow',
                'artists' => [],
                'keywords' => ['sad', 'emotional'],
                'search_intent' => 'mood_match'
            ];
        }
        
        if (strpos($queryLower, 'rock') !== false) {
            return [
                'primary_genre' => 'Rock',
                'secondary_genres' => ['Hard Rock', 'Alternative'],
                'mood' => 'energetic',
                'tempo' => 'fast',
                'artists' => [],
                'keywords' => ['rock'],
                'search_intent' => 'specific'
            ];
        }
        
        if (strpos($queryLower, 'jazz') !== false) {
            return [
                'primary_genre' => 'Jazz',
                'secondary_genres' => ['Smooth Jazz', 'Bossa Nova'],
                'mood' => 'chill',
                'tempo' => 'slow',
                'artists' => [],
                'keywords' => ['jazz'],
                'search_intent' => 'specific'
            ];
        }
        
        if (strpos($queryLower, 'study') !== false || strpos($queryLower, 'focus') !== false) {
            return [
                'primary_genre' => 'Classical',
                'secondary_genres' => ['Ambient', 'Instrumental'],
                'mood' => 'focused',
                'tempo' => 'slow',
                'artists' => [],
                'keywords' => ['study', 'focus'],
                'search_intent' => 'discovery'
            ];
        }
        
        return [
            'primary_genre' => null,
            'secondary_genres' => [],
            'mood' => null,
            'tempo' => null,
            'artists' => [],
            'keywords' => explode(' ', $query),
            'search_intent' => 'discovery'
        ];
    }

    private function fallbackInterpretation($query) {
        return [
            'primary_genre' => null,
            'secondary_genres' => [],
            'mood' => null,
            'tempo' => null,
            'artists' => [],
            'keywords' => explode(' ', $query),
            'search_intent' => 'discovery'
        ];
    }

    private function generateMatchReason($song, $interpretation, $titleScore, $artistScore, $genreScore) {
        $reasons = [];
        
        if ($titleScore > 0.7) {
            $reasons[] = "title matches your search";
        } elseif ($titleScore > 0.3) {
            $reasons[] = "title contains search terms";
        }
        
        if ($artistScore > 0.5) {
            $reasons[] = "by {$song['artist']}";
        }
        
        if ($genreScore > 0.7 && !empty($interpretation['primary_genre'])) {
            $reasons[] = "in the {$interpretation['primary_genre']} genre";
        }
        
        if (!empty($reasons)) {
            return implode(' • ', $reasons);
        }
        
        return "popular with listeners";
    }
}
?>