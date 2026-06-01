<?php

class AIService
{
    private ?string $apiKey;
    private string $baseUrl = 'https://api.openai.com/v1';
    private bool $useMock = false;
    private PDO $pdo;
    private array $cache = [];

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->apiKey = $_ENV['OPENAI_API_KEY'] ?? getenv('OPENAI_API_KEY') ?: null;

        if ($this->apiKey === null || $this->apiKey === '' || $this->apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
            $this->useMock = true;
        }
    }

    public function search(string $query, ?int $userId = null): array
    {
        $cacheKey = md5($query . ($userId ?? '0'));
        if (isset($this->cache[$cacheKey])) {
            return $this->cache[$cacheKey];
        }

        $interpretation = $this->interpretQuery($query, $userId);

        $songs = $this->searchSongs($interpretation, $query);

        $result = [
            'songs' => $songs,
            'search_metadata' => [
                'query' => $query,
                'mood' => $interpretation['mood'],
                'genre' => $interpretation['primary_genre'],
                'reason' => $this->generateResultReason($interpretation),
                'ai_interpreted' => !$this->useMock,
            ],
        ];

        $this->cache[$cacheKey] = $result;

        return $result;
    }

    private function interpretQuery(string $query, ?int $userId = null): array
    {
        if ($this->useMock) {
            return $this->mockInterpret($query);
        }

        $systemPrompt = "You are ZemaLink's AI music search engine. Analyze music search queries and extract structured search parameters. Return ONLY valid JSON with these fields: {\"primary_genre\": string|null, \"mood\": string|null, \"tempo\": \"slow\"|\"medium\"|\"fast\"|null, \"artists\": string[], \"keywords\": string[], \"search_intent\": \"discovery\"|\"specific\"|\"mood_match\"}";

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => "Analyze this music search query and return structured JSON: \"{$query}\""],
        ];

        $response = $this->callOpenAI($messages);

        if ($response !== null) {
            $content = $response['choices'][0]['message']['content'] ?? '';
            $parsed = json_decode($content, true);
            if (is_array($parsed)) {
                return $parsed;
            }
        }

        return $this->fallbackInterpret($query);
    }

    private function callOpenAI(array $messages): ?array
    {
        $data = [
            'model' => 'gpt-3.5-turbo',
            'messages' => $messages,
            'max_tokens' => 200,
            'temperature' => 0.3,
        ];

        $ch = curl_init($this->baseUrl . '/chat/completions');
        if ($ch === false) {
            return null;
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->apiKey,
            ],
            CURLOPT_TIMEOUT => 10,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);

        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($result === false || $error !== '' || $httpCode !== 200) {
            error_log("AIService OpenAI error: {$httpCode} - {$error}");
            return null;
        }

        return json_decode($result, true);
    }

    private function mockInterpret(string $query): array
    {
        $lower = mb_strtolower($query);

        $moodKeywords = [
            'happy' => ['happy', 'joy', 'upbeat', 'cheerful', 'party', 'celebration', 'fun'],
            'sad' => ['sad', 'melancholy', 'emotional', 'cry', 'heartbreak', 'lonely', 'depressed'],
            'energetic' => ['energetic', 'workout', 'gym', 'pump', 'intense', 'powerful', 'hype'],
            'chill' => ['chill', 'relax', 'calm', 'peaceful', 'mellow', 'smooth', 'lazy'],
            'romantic' => ['romantic', 'love', 'valentine', 'date', 'crush', 'passion'],
            'focused' => ['focus', 'study', 'concentrate', 'work', 'reading', 'productivity'],
            'angry' => ['angry', 'rage', 'frustrated', 'metal', 'heavy'],
            'nostalgic' => ['nostalgic', 'old', 'classic', 'retro', 'vintage', 'memory'],
        ];

        $detectedMood = null;
        foreach ($moodKeywords as $mood => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($lower, $keyword)) {
                    $detectedMood = $mood;
                    break 2;
                }
            }
        }

        $knownGenres = ['pop', 'rock', 'jazz', 'blues', 'hip hop', 'rap', 'country', 'classical',
            'reggae', 'metal', 'electronic', 'r&b', 'rnb', 'soul', 'funk', 'disco',
            'punk', 'alternative', 'dance', 'ambient', 'lofi', 'indie', 'folk',
            'latin', 'afrobeat', 'gospel', 'k-pop', 'trap'];

        $detectedGenres = [];
        foreach ($knownGenres as $genre) {
            if (str_contains($lower, $genre)) {
                $detectedGenres[] = $genre === 'rnb' ? 'R&B' : ucfirst($genre);
            }
        }

        $tempo = null;
        if (str_contains($lower, 'fast') || str_contains($lower, 'upbeat') || str_contains($lower, 'quick')) {
            $tempo = 'fast';
        } elseif (str_contains($lower, 'slow') || str_contains($lower, 'ballad')) {
            $tempo = 'slow';
        } elseif (str_contains($lower, 'medium') || str_contains($lower, 'moderate')) {
            $tempo = 'medium';
        }

        $searchIntent = 'discovery';
        if ($detectedMood !== null) {
            $searchIntent = 'mood_match';
        }
        if (!empty($detectedGenres)) {
            $searchIntent = 'specific';
        }

        return [
            'primary_genre' => $detectedGenres[0] ?? null,
            'mood' => $detectedMood,
            'tempo' => $tempo,
            'artists' => [],
            'keywords' => explode(' ', $query),
            'search_intent' => $searchIntent,
        ];
    }

    private function fallbackInterpret(string $query): array
    {
        return [
            'primary_genre' => null,
            'mood' => null,
            'tempo' => null,
            'artists' => [],
            'keywords' => explode(' ', $query),
            'search_intent' => 'discovery',
        ];
    }

    private function searchSongs(array $interpretation, string $query): array
    {
        $conditions = ['s.is_approved = 1'];
        $params = [];

        if (!empty($interpretation['primary_genre'])) {
            $conditions[] = 's.genre = :genre';
            $params[':genre'] = $interpretation['primary_genre'];
        }

        if (!empty($interpretation['mood'])) {
            $moodGenres = $this->getMoodGenreMapping($interpretation['mood']);
            if (!empty($moodGenres)) {
                $placeholders = [];
                foreach ($moodGenres as $i => $g) {
                    $key = ":mood_genre_{$i}";
                    $placeholders[] = $key;
                    $params[$key] = $g;
                }
                $conditions[] = '(s.genre IN (' . implode(',', $placeholders) . '))';
            }
        }

        $searchTerm = '%' . $query . '%';
        $conditions[] = "(s.title LIKE :search OR s.artist LIKE :search OR s.album LIKE :search OR COALESCE(s.description, '') LIKE :search)";
        $params[':search'] = $searchTerm;

        $where = implode(' AND ', $conditions);

        $sql = "SELECT s.*, 
                       (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                       COALESCE(s.rating, 0) as rating,
                       s.plays as total_plays
                FROM songs s 
                WHERE {$where}
                ORDER BY s.featured DESC, s.rating DESC, s.plays DESC 
                LIMIT 50";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    private function getMoodGenreMapping(string $mood): array
    {
        $map = [
            'happy' => ['Pop', 'Dance', 'Disco', 'Funk', 'Soul'],
            'sad' => ['Blues', 'Ballad', 'Slow Rock', 'Country'],
            'energetic' => ['Rock', 'Metal', 'Electronic', 'Dance', 'Punk'],
            'chill' => ['Jazz', 'Ambient', 'Lofi', 'Reggae', 'Indie'],
            'romantic' => ['R&B', 'Soul', 'Ballad', 'Pop'],
            'angry' => ['Metal', 'Punk', 'Hard Rock', 'Industrial'],
            'focused' => ['Classical', 'Ambient', 'Instrumental', 'Lofi'],
            'nostalgic' => ['Classic Rock', 'Retro', 'Folk', 'Blues'],
        ];
        return $map[$mood] ?? [];
    }

    private function generateResultReason(array $interpretation): string
    {
        $parts = [];

        if (!empty($interpretation['mood'])) {
            $parts[] = "Matched mood: {$interpretation['mood']}";
        }
        if (!empty($interpretation['primary_genre'])) {
            $parts[] = "Genre: {$interpretation['primary_genre']}";
        }
        if (!empty($interpretation['tempo'])) {
            $parts[] = "Tempo: {$interpretation['tempo']}";
        }

        if (empty($parts)) {
            return 'Showing popular and recommended songs';
        }

        return implode(' | ', $parts);
    }
}
