<?php

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

if (PHP_SAPI !== 'cli') {
    if (file_exists(__DIR__ . '/vendor/autoload.php')) {
        require_once __DIR__ . '/vendor/autoload.php';
    }

    if (class_exists('Dotenv\Dotenv')) {
        $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
        $dotenv->safeLoad();
    } else {
        $envFile = __DIR__ . '/.env';
        if (is_file($envFile)) {
            $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                    continue;
                }
                [$key, $value] = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                if ($key !== '') {
                    $_ENV[$key] = $value;
                    putenv("{$key}={$value}");
                }
            }
        }
    }
}

session_name('ZEMALINK_SESSION');
session_set_cookie_params([
    'lifetime' => 86400 * 7,
    'path' => '/',
    'domain' => '',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'httponly' => true,
    'samesite' => 'Lax',
]);

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/cors.php';
applyCorsHeaders();

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/Database.php';
require_once __DIR__ . '/includes/AuthMiddleware.php';

$db = Database::getInstance();
$pdo = $db->getConnection();

$auth = new AuthMiddleware($pdo);

$ratingService = new RatingService($pdo);
$uploadService = new UploadService();
$emailService = new EmailService();
$chapaService = new ChapaService();
$aiService = new AIService($pdo);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
$uri = rtrim($uri, '/');

$basePath = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/'));
if ($basePath !== '/' && str_starts_with($uri, $basePath)) {
    $uri = substr($uri, strlen($basePath));
}
$uri = '/' . trim($uri, '/');

if (str_starts_with($uri, '/index.php')) {
    $uri = substr($uri, 10);
    $uri = '/' . trim($uri, '/');
}

$uri = '/' . ltrim(preg_replace('#/index\.php(/|$)#', '/', $uri), '/');

$segments = array_values(array_filter(explode('/', $uri), fn($s) => $s !== ''));
$resource = $segments[0] ?? '';
$id = $segments[1] ?? '';
$sub = $segments[2] ?? '';
$subId = $segments[3] ?? '';
$subId2 = $segments[4] ?? '';
$subId3 = $segments[5] ?? '';

try {

if ($resource === 'api' && $id === 'check' && $method === 'GET') {
    api_response([
        'success' => true,
        'message' => APP_NAME . ' API is online',
        'version' => APP_VERSION,
        'timestamp' => date('c'),
    ]);
}

if ($resource === 'api' && $id === 'ai-search' && $method === 'GET') {
    $query = trim($_GET['q'] ?? '');
    if ($query === '') {
        api_error('Search query required', 400);
    }
    $userId = $_SESSION['user_id'] ?? null;
    $result = $aiService->search($query, $userId);
    api_response($result);
}

if ($resource !== 'api') {
    api_error('Route not found', 404);
}

switch ($id) {

    // ===========================
    // AUTH ROUTES
    // ===========================
    case 'auth':
        require __DIR__ . '/routes/auth.php';
        break;

    // ===========================
    // SONGS ROUTES
    // ===========================
    case 'songs':
        require __DIR__ . '/routes/songs.php';
        break;

    case 'song':
        if ($method === 'GET' && is_numeric($sub)) {
            $songId = (int) $sub;
            $stmt = $pdo->prepare(
                "SELECT s.*, 
                        (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                        COALESCE(s.rating, 0) as rating
                 FROM songs s WHERE s.id = ?"
            );
            $stmt->execute([$songId]);
            $song = $stmt->fetch();

            if (!$song) {
                api_error('Song not found', 404);
            }

            $hasAccess = true;
            if ($song['is_premium'] == 1) {
                $user = $auth->getUser();
                if ($user === null) {
                    $hasAccess = false;
                } elseif ($user['subscription'] === 'premium') {
                    $hasAccess = true;
                } else {
                    $check = $pdo->prepare("SELECT id FROM user_purchases WHERE user_id = ? AND song_id = ?");
                    $check->execute([$user['id'], $songId]);
                    $hasAccess = $check->fetch() ? true : false;
                }
            }

            $song['can_play'] = $hasAccess;
            api_response(['success' => true, 'data' => $song]);
        }
        api_error('Route not found', 404);

    // ===========================
    // USER ROUTES
    // ===========================
    case 'user':
        require __DIR__ . '/routes/user.php';
        break;

    // ===========================
    // PLAYLIST ROUTES
    // ===========================
    case 'playlists':
        require __DIR__ . '/routes/playlists.php';
        break;

    case 'playlist':
        require __DIR__ . '/routes/playlists.php';
        break;

    // ===========================
    // MUSICIAN ROUTES
    // ===========================
    case 'musician':
        require __DIR__ . '/routes/musician.php';
        break;

    // ===========================
    // EVENTS ROUTES
    // ===========================
    case 'events':
        require __DIR__ . '/routes/events.php';
        break;

    // ===========================
    // LIVE STREAMS ROUTES
    // ===========================
    case 'live-streams':
        require __DIR__ . '/routes/live-streams.php';
        break;

    // ===========================
    // PAYMENT ROUTES
    // ===========================
    case 'payment':
        require __DIR__ . '/routes/payments.php';
        break;

    // ===========================
    // ADMIN ROUTES
    // ===========================
    case 'admin':
        require __DIR__ . '/routes/admin.php';
        break;

    default:
        api_error('Route not found', 404);
}

} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    api_error('A database error occurred', 500);
} catch (Throwable $e) {
    error_log("Application error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    api_error('An internal error occurred', 500);
}
