<?php
// ============================================
// FIX: Ensure session directory exists
// ============================================
$possibleSessionPaths = [
    'D:\dawit\xampp\tmp',
    'C:\xampp\tmp', 
    'C:\Windows\Temp',
    __DIR__ . '/sessions',
    sys_get_temp_dir()
];

$sessionPath = null;
foreach ($possibleSessionPaths as $path) {
    if (!is_dir($path)) {
        @mkdir($path, 0777, true);
    }
    if (is_dir($path) && is_writable($path)) {
        $sessionPath = $path;
        break;
    }
}

if ($sessionPath) {
    session_save_path($sessionPath);
}

// ============================================
// Session cookie configuration
// ============================================
$secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
if (PHP_VERSION_ID >= 70300) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
} else {
    session_set_cookie_params(0, '/', '', $secure, true);
}

// ============================================
// Start session with error suppression
// ============================================
@session_start();

// ============================================
// CORS Headers
// ============================================
$allowed_origins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:3000',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ============================================
// Error reporting (development only)
// ============================================
error_reporting(E_ALL);
ini_set('display_errors', 1);

// ============================================
// Load required files
// ============================================
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/schema_platform.php';
require_once __DIR__ . '/integrations.php';
require_once __DIR__ . '/models/User.php';
require_once __DIR__ . '/models/Song.php';
require_once __DIR__ . '/platform_routes.php';
require_once __DIR__ . '/services/RatingService.php';
require_once __DIR__ . '/services/ChapaService.php';
require_once __DIR__ . '/services/AIService.php';

$userModel = new User($pdo);
$ratingService = new RatingService($pdo);
$chapaService = new ChapaService();
$aiService = new AIService();
$songModel = new Song($pdo);

// ============================================
// Helper functions
// ============================================
function getInputData() {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    
    if (strpos($contentType, 'application/json') !== false) {
        $input = json_decode(file_get_contents('php://input'), true);
        return is_array($input) ? $input : [];
    } else {
        return $_POST;
    }
}

function require_admin_json($pdo) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit();
    }
    $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $row = $stmt->fetch();
    if (!$row || $row['role'] !== 'admin') {
        echo json_encode(['success' => false, 'message' => 'Forbidden - Admin access required']);
        exit();
    }
}

function api_route_segments(): array {
    $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    $uriPath = $uriPath ? str_replace('\\', '/', $uriPath) : '';
    $script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '/index.php');
    $baseDir = dirname($script);
    if ($baseDir === '/' || $baseDir === '.') {
        $baseDir = '';
    }
    if ($baseDir !== '' && strncmp($uriPath, $baseDir, strlen($baseDir)) === 0) {
        $rest = substr($uriPath, strlen($baseDir));
    } else {
        $rest = $uriPath;
    }
    $rest = trim($rest, '/');
    if ($rest !== '' && strncasecmp($rest, 'index.php', 9) === 0) {
        $rest = trim(substr($rest, 9), '/');
    }
    if ($rest === '') {
        return [];
    }
    return explode('/', $rest);
}

// ============================================
// Ensure database schema is up to date
// ============================================
ensure_platform_schema($pdo);

// ============================================
// Route handling
// ============================================
$segments = api_route_segments();
$resource = $segments[0] ?? '';
$id = $segments[1] ?? '';
$sub = $segments[2] ?? '';

// ============================================
// AI-POWERED SEARCH ENDPOINTS (PRIORITY)
// ============================================

// GET /search - Main search endpoint with context
if ($resource === 'search' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $query = trim($_GET['q'] ?? $_GET['query'] ?? '');
    $type = $_GET['type'] ?? 'songs';
    
    if (empty($query)) {
        echo json_encode(['success' => false, 'message' => 'Search query required']);
        exit();
    }
    
    try {
        $userId = $_SESSION['user_id'] ?? null;
        
        if ($type === 'suggestions') {
            $suggestions = $songModel->getSearchSuggestions($query, $userId);
            echo json_encode([
                'success' => true,
                'suggestions' => $suggestions,
                'query' => $query
            ]);
            exit();
        }
        
        $results = $aiService->intelligentSearch($query, $userId, 50);
        
        $userContext = [];
        if ($userId) {
            $stmt = $pdo->prepare("
                SELECT DISTINCT s.genre 
                FROM listening_history lh 
                JOIN songs s ON lh.song_id = s.id 
                WHERE lh.user_id = ? AND s.genre IS NOT NULL AND s.genre != ''
                GROUP BY s.genre 
                ORDER BY COUNT(*) DESC 
                LIMIT 3
            ");
            $stmt->execute([$userId]);
            $userContext['recent_genres'] = $stmt->fetchAll(PDO::FETCH_COLUMN);
        }
        
        $interpretation = $aiService->interpretSearchQuery($query, $userContext);
        
        echo json_encode([
            'success' => true,
            'data' => $results,
            'count' => count($results),
            'query' => $query,
            'interpretation' => $interpretation,
            'ai_powered' => !$aiService->useMockData
        ]);
        
    } catch (Exception $e) {
        error_log("AI Search failed: " . $e->getMessage());
        
        $results = $songModel->search($query);
        
        echo json_encode([
            'success' => true,
            'data' => $results,
            'count' => count($results),
            'query' => $query,
            'fallback' => true,
            'error' => $e->getMessage()
        ]);
    }
    exit();
}

// GET /search/trending - Get trending searches
if ($resource === 'search' && $id === 'trending' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("
            SELECT search_query, COUNT(*) as search_count 
            FROM search_history 
            WHERE searched_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY search_query 
            ORDER BY search_count DESC 
            LIMIT 10
        ");
        $trending = $stmt->fetchAll();
    } catch (PDOException $e) {
        $trending = [];
    }
    
    echo json_encode([
        'success' => true,
        'trending' => $trending
    ]);
    exit();
}

// POST /search/track - Track search for analytics
if ($resource === 'search' && $id === 'track' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getInputData();
    $query = $input['query'] ?? '';
    
    if (!empty($query) && isset($_SESSION['user_id'])) {
        try {
            $stmt = $pdo->prepare("
                INSERT INTO search_history (user_id, search_query, searched_at) 
                VALUES (?, ?, NOW())
            ");
            $stmt->execute([$_SESSION['user_id'], $query]);
        } catch (PDOException $e) {
            error_log("Failed to track search: " . $e->getMessage());
        }
    }
    
    echo json_encode(['success' => true]);
    exit();
}

// ============================================
// AUTH ROUTES
// ============================================

// REGISTER
if ($resource === 'auth' && $id === 'register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getInputData();
    
    $name = trim($input['name'] ?? $_POST['name'] ?? '');
    $email = strtolower(trim($input['email'] ?? $_POST['email'] ?? ''));
    $password = $input['password'] ?? $_POST['password'] ?? '';
    $role = $input['role'] ?? $_POST['role'] ?? 'audience';
    
    if (empty($name) || empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'All fields required']);
        exit();
    }
    
    // Check if user exists
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Email already exists']);
        exit();
    }
    
    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $isApproved = ($role === 'audience' || $role === 'admin') ? 1 : 0;
    $adminCount = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
    
    if ($role === 'admin' && $adminCount > 0) {
        echo json_encode(['success' => false, 'message' => 'An administrator account already exists.']);
        exit();
    }
    
    $emailVerified = ($adminCount === 0 && $role === 'admin') ? 1 : 0;
    $verificationCode = $emailVerified ? null : str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $verificationExpires = $emailVerified ? null : date('Y-m-d H:i:s', time() + (15 * 60));
    
    $stmt = $pdo->prepare(
        "INSERT INTO users
        (name, email, password, role, is_approved, email_verified, email_verification_code, email_verification_expires)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    
    if ($stmt->execute([$name, $email, $hashed, $role, $isApproved, $emailVerified, $verificationCode, $verificationExpires])) {
        if (!$emailVerified && $verificationCode) {
            zemalink_send_verification_email($email, $name, $verificationCode);
        }
        
        $registerMessage = $emailVerified
            ? ($role === 'musician' ? 'Registration successful! Your account is pending approval.' : 'Registration successful!')
            : 'Registration successful! Enter the 6-digit code sent to your email.';
        
        $out = [
            'success' => true,
            'message' => $registerMessage,
            'requires_verification' => $emailVerified !== 1,
            'verification_email' => $email,
        ];
        if ($verificationCode !== null && $verificationCode !== '') {
            $out['verification_code'] = $verificationCode;
        }
        echo json_encode($out);
    } else {
        echo json_encode(['success' => false, 'message' => 'Registration failed']);
    }
    exit();
}

// LOGIN
if ($resource === 'auth' && $id === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getInputData();
    
    $email = strtolower(trim($input['email'] ?? $_POST['email'] ?? ''));
    $password = $input['password'] ?? $_POST['password'] ?? '';
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        if ((int) ($user['email_verified'] ?? 0) !== 1) {
            echo json_encode([
                'success' => false,
                'message' => 'Please verify your email first',
                'requires_verification' => true,
                'verification_email' => $user['email'],
            ]);
            exit();
        }
        if ($user['role'] === 'musician' && $user['is_approved'] != 1) {
            echo json_encode(['success' => false, 'message' => 'Your account is pending approval']);
            exit();
        }
        
        $_SESSION['user_id'] = $user['id'];
        
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'is_approved' => $user['is_approved'],
                'subscription_status' => $user['subscription'] ?? 'free',
                'subscription_expires' => $user['subscription_expires'] ?? null,
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
    }
    exit();
}

// LOGOUT
if ($resource === 'auth' && $id === 'logout' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();
    echo json_encode(['success' => true]);
    exit();
}

// CHECK AUTH
if ($resource === 'auth' && $id === 'check' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_SESSION['user_id'])) {
        $stmt = $pdo->prepare(
            "SELECT id, name, email, role, is_approved, subscription, subscription_expires, email_verified FROM users WHERE id = ?"
        );
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        if ($user) {
            echo json_encode([
                'authenticated' => true, 
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                    'is_approved' => $user['is_approved'],
                    'subscription_status' => $user['subscription'] ?? 'free',
                    'subscription_expires' => $user['subscription_expires'] ?? null,
                    'email_verified' => $user['email_verified'] ?? 0,
                ]
            ]);
        } else {
            echo json_encode(['authenticated' => false]);
        }
    } else {
        echo json_encode(['authenticated' => false]);
    }
    exit();
}

// VERIFY EMAIL CODE
if ($resource === 'auth' && $id === 'verify-code' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getInputData();
    $email = strtolower(trim($input['email'] ?? ''));
    $code = trim($input['code'] ?? '');
    
    if ($email === '' || $code === '') {
        echo json_encode(['success' => false, 'message' => 'Email and verification code are required']);
        exit();
    }
    
    $stmt = $pdo->prepare("SELECT id, email_verification_code, email_verification_expires FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Account not found']);
        exit();
    }
    
    $expiresAt = $user['email_verification_expires'] ?? null;
    if (empty($user['email_verification_code']) || empty($expiresAt) || strtotime($expiresAt) < time()) {
        echo json_encode(['success' => false, 'message' => 'Verification code expired. Request a new code.']);
        exit();
    }
    
    if ((string) $user['email_verification_code'] !== $code) {
        echo json_encode(['success' => false, 'message' => 'Invalid verification code']);
        exit();
    }
    
    $pdo->prepare(
        "UPDATE users SET email_verified = 1, email_verification_code = NULL, email_verification_expires = NULL WHERE id = ?"
    )->execute([$user['id']]);
    
    echo json_encode(['success' => true, 'message' => 'Email verified. You can now sign in.']);
    exit();
}

// RESEND CODE
if ($resource === 'auth' && $id === 'resend-code' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getInputData();
    $email = strtolower(trim($input['email'] ?? ''));
    
    if ($email === '') {
        echo json_encode(['success' => false, 'message' => 'Email is required']);
        exit();
    }
    
    $stmt = $pdo->prepare("SELECT id, name, email, email_verified FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        echo json_encode(['success' => true, 'message' => 'If that email exists, a new code has been sent']);
        exit();
    }
    
    if ((int) ($user['email_verified'] ?? 0) === 1) {
        echo json_encode(['success' => false, 'message' => 'This email is already verified']);
        exit();
    }
    
    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires = date('Y-m-d H:i:s', time() + (15 * 60));
    
    $pdo->prepare("UPDATE users SET email_verification_code = ?, email_verification_expires = ? WHERE id = ?")
        ->execute([$code, $expires, $user['id']]);
    
    zemalink_send_verification_email($email, $user['name'], $code);
    
    echo json_encode([
        'success' => true,
        'message' => 'A new verification code has been sent',
        'verification_code' => $code,
    ]);
    exit();
}

// ADMIN EXISTS CHECK
if ($resource === 'auth' && $id === 'admin-exists' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'");
    $row = $stmt->fetch();
    echo json_encode(['success' => true, 'admin_exists' => ((int) ($row['c'] ?? 0) > 0)]);
    exit();
}

// ============================================
// SONGS ROUTES
// ============================================

// GET SONGS
if ($resource === 'songs' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($id === 'trending') {
        $stmt = $pdo->query(
            "SELECT s.*, 
                    (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                    COALESCE(s.rating, 0) as rating
             FROM songs s 
             WHERE s.is_approved = 1 
             ORDER BY s.plays DESC 
             LIMIT 10"
        );
        $songs = $stmt->fetchAll();
        echo json_encode(['success' => true, 'songs' => $songs]);
    } elseif ($id === 'top-rated') {
        $limit = (int) ($_GET['limit'] ?? 10);
        $songs = $ratingService->getTopRated($limit);
        echo json_encode(['success' => true, 'songs' => $songs]);
    } else {
        $stmt = $pdo->query(
            "SELECT s.*, 
                    (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                    COALESCE(s.rating, 0) as rating
             FROM songs s 
             WHERE s.is_approved = 1 
             ORDER BY s.featured DESC, s.created_at DESC 
             LIMIT 50"
        );
        $songs = $stmt->fetchAll();
        echo json_encode(['success' => true, 'songs' => $songs]);
    }
    exit();
}

// GET SINGLE SONG
if ($resource === 'song' && is_numeric($id) && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $songId = (int) $id;
    $stmt = $pdo->prepare(
        "SELECT s.*, 
                (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                COALESCE(s.rating, 0) as rating
         FROM songs s 
         WHERE s.id = ?"
    );
    $stmt->execute([$songId]);
    $song = $stmt->fetch();
    
    if ($song) {
        $hasAccess = true;
        if ($song['is_premium'] == 1 && isset($_SESSION['user_id'])) {
            $stmt2 = $pdo->prepare("SELECT id FROM user_purchases WHERE user_id = ? AND song_id = ?");
            $stmt2->execute([$_SESSION['user_id'], $songId]);
            $hasAccess = $stmt2->fetch() ? true : false;
        } elseif ($song['is_premium'] == 1 && !isset($_SESSION['user_id'])) {
            $hasAccess = false;
        }
        
        $song['can_play'] = $hasAccess;
        echo json_encode(['success' => true, 'data' => $song]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Song not found']);
    }
    exit();
}

// ============================================
// USER ROUTES
// ============================================

// GET USER LIKES
if ($resource === 'user' && $id === 'likes' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => true, 'likes' => []]);
        exit();
    }
    $stmt = $pdo->prepare(
        "SELECT s.*, 
                (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                COALESCE(s.rating, 0) as rating
         FROM likes l 
         JOIN songs s ON l.song_id = s.id 
         WHERE l.user_id = ? AND s.is_approved = 1"
    );
    $stmt->execute([$_SESSION['user_id']]);
    $likes = $stmt->fetchAll();
    echo json_encode(['success' => true, 'likes' => $likes]);
    exit();
}

// TOGGLE LIKE
if ($resource === 'user' && $id === 'like' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'error' => 'Login required']);
        exit();
    }
    
    $input = getInputData();
    $songId = $input['song_id'] ?? $_POST['song_id'] ?? 0;
    $userId = $_SESSION['user_id'];
    
    $stmt = $pdo->prepare("SELECT * FROM likes WHERE user_id = ? AND song_id = ?");
    $stmt->execute([$userId, $songId]);
    
    if ($stmt->fetch()) {
        $stmt = $pdo->prepare("DELETE FROM likes WHERE user_id = ? AND song_id = ?");
        $stmt->execute([$userId, $songId]);
        $liked = false;
    } else {
        $stmt = $pdo->prepare("INSERT IGNORE INTO likes (user_id, song_id) VALUES (?, ?)");
        $stmt->execute([$userId, $songId]);
        $liked = true;
    }
    
    $ratingService->updateSongRating($songId);
    
    echo json_encode(['liked' => $liked]);
    exit();
}

// RECORD LISTEN
if ($resource === 'user' && $id === 'listen' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'error' => 'Login required']);
        exit();
    }
    
    $input = getInputData();
    $songId = (int) ($input['song_id'] ?? 0);
    $userId = $_SESSION['user_id'];
    
    if ($songId > 0) {
        $stmt = $pdo->prepare("INSERT INTO listening_history (user_id, song_id) VALUES (?, ?)");
        $stmt->execute([$userId, $songId]);
        
        $stmt = $pdo->prepare("SELECT id FROM song_views WHERE user_id = ? AND song_id = ?");
        $stmt->execute([$userId, $songId]);
        
        if (!$stmt->fetch()) {
            $stmt = $pdo->prepare("INSERT INTO song_views (user_id, song_id) VALUES (?, ?)");
            $stmt->execute([$userId, $songId]);
            
            $stmt = $pdo->prepare("UPDATE songs SET plays = plays + 1 WHERE id = ?");
            $stmt->execute([$songId]);
            
            $ratingService->updateSongRating($songId);
        }
    }
    
    echo json_encode(['success' => true]);
    exit();
}

// GET LISTENING HISTORY
if ($resource === 'user' && $id === 'listening-history' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => true, 'songs' => []]);
        exit();
    }
    
    $stmt = $pdo->prepare(
        "SELECT s.*, 
                lh.played_at,
                (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                COALESCE(s.rating, 0) as rating
         FROM listening_history lh 
         JOIN songs s ON lh.song_id = s.id 
         WHERE lh.user_id = ? AND s.is_approved = 1
         ORDER BY lh.played_at DESC 
         LIMIT 50"
    );
    $stmt->execute([$_SESSION['user_id']]);
    $history = $stmt->fetchAll();
    echo json_encode(['success' => true, 'songs' => $history]);
    exit();
}

// GET PURCHASED SONGS
if ($resource === 'user' && $id === 'purchased-songs' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => true, 'songs' => []]);
        exit();
    }
    
    $stmt = $pdo->prepare(
        "SELECT s.*, 
                (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                COALESCE(s.rating, 0) as rating
         FROM user_purchases up 
         JOIN songs s ON up.song_id = s.id 
         WHERE up.user_id = ? AND s.is_approved = 1
         ORDER BY up.purchased_at DESC"
    );
    $stmt->execute([$_SESSION['user_id']]);
    $purchased = $stmt->fetchAll();
    echo json_encode(['success' => true, 'songs' => $purchased]);
    exit();
}

// REPORT SONG
if ($resource === 'user' && $id === 'report-song' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'error' => 'Login required']);
        exit();
    }
    
    $input = getInputData();
    $songId = (int) ($input['song_id'] ?? 0);
    $reason = trim($input['reason'] ?? '');
    $userId = $_SESSION['user_id'];
    
    if ($songId <= 0 || empty($reason)) {
        echo json_encode(['success' => false, 'error' => 'Song ID and reason required']);
        exit();
    }
    
    $stmt = $pdo->prepare("INSERT INTO reports (reported_by, song_id, reason) VALUES (?, ?, ?)");
    $stmt->execute([$userId, $songId, $reason]);
    
    echo json_encode(['success' => true]);
    exit();
}

// UPGRADE SUBSCRIPTION
if ($resource === 'user' && $id === 'upgrade-subscription' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Login required']);
        exit();
    }
    
    $input = getInputData();
    $plan = $input['plan'] ?? 'monthly';
    $userId = $_SESSION['user_id'];
    $months = $plan === 'yearly' ? 12 : 1;
    $amount = $plan === 'yearly' ? 99.00 : 9.99;
    $expires = date('Y-m-d', strtotime("+{$months} months"));
    
    $stmt = $pdo->prepare("UPDATE users SET subscription = 'premium', subscription_expires = ? WHERE id = ?");
    $stmt->execute([$expires, $userId]);
    
    $stmt = $pdo->prepare("INSERT INTO payments (user_id, amount, payment_type, status) VALUES (?, ?, 'subscription', 'completed')");
    $stmt->execute([$userId, $amount]);
    
    $userStmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
    $userStmt->execute([$userId]);
    $user = $userStmt->fetch();
    zemalink_send_payment_email($user['email'], $user['name'], 'Premium Subscription', $amount);
    
    echo json_encode([
        'success' => true,
        'subscription_status' => 'premium',
        'subscription_expires' => $expires
    ]);
    exit();
}

// ============================================
// RATING API ROUTES
// ============================================

// Get song rating breakdown
if ($resource === 'song' && $id === 'rating-breakdown' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $songId = (int) ($_GET['song_id'] ?? 0);
    if ($songId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid song ID']);
        exit();
    }
    
    $breakdown = $ratingService->getRatingBreakdown($songId);
    echo json_encode(['success' => true, 'data' => $breakdown]);
    exit();
}

// ============================================
// PAYMENT ROUTES
// ============================================

// Initialize payment for subscription
if ($resource === 'payment' && $id === 'initiate-subscription' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Login required']);
        exit();
    }
    
    $input = getInputData();
    $plan = $input['plan'] ?? 'monthly';
    
    $stmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    $amount = $plan === 'yearly' ? 99.00 : 9.99;
    $tx_ref = 'SUB_' . $_SESSION['user_id'] . '_' . time();
    $callbackUrl = zemalink_env('APP_BASE_URL', 'http://localhost:8000') . '/payment/verify-subscription';
    $returnUrl = zemalink_env('APP_FRONTEND_URL', 'http://localhost:5173') . '/subscription?status=success';
    
    $paymentData = [
        'amount' => number_format($amount, 2, '.', ''),
        'currency' => 'ETB',
        'email' => $user['email'],
        'first_name' => explode(' ', $user['name'])[0],
        'last_name' => explode(' ', $user['name'])[1] ?? '',
        'tx_ref' => $tx_ref,
        'callback_url' => $callbackUrl,
        'return_url' => $returnUrl,
        'title' => 'ZemaLink Premium Subscription',
        'description' => ucfirst($plan) . ' subscription plan'
    ];
    
    $result = zemalink_chapa_initialize($paymentData);
    echo json_encode($result);
    exit();
}

// Verify subscription payment
if ($resource === 'payment' && $id === 'verify-subscription' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $tx_ref = $_GET['tx_ref'] ?? '';
    
    if (empty($tx_ref)) {
        echo json_encode(['success' => false, 'message' => 'Transaction reference required']);
        exit();
    }
    
    $result = zemalink_chapa_verify($tx_ref);
    
    if ($result['success'] && isset($result['data']['status']) && $result['data']['status'] === 'success') {
        preg_match('/SUB_(\d+)_/', $tx_ref, $matches);
        $userId = $matches[1] ?? 0;
        
        if ($userId) {
            $plan = strpos($tx_ref, 'yearly') !== false ? 'yearly' : 'monthly';
            $months = $plan === 'yearly' ? 12 : 1;
            $expires = date('Y-m-d', strtotime("+{$months} months"));
            
            $stmt = $pdo->prepare("UPDATE users SET subscription = 'premium', subscription_expires = ? WHERE id = ?");
            $stmt->execute([$expires, $userId]);
            
            $amount = $plan === 'yearly' ? 99.00 : 9.99;
            $stmt = $pdo->prepare("INSERT INTO payments (user_id, amount, payment_type, status) VALUES (?, ?, 'subscription', 'completed')");
            $stmt->execute([$userId, $amount]);
            
            $userStmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
            $userStmt->execute([$userId]);
            $user = $userStmt->fetch();
            zemalink_send_payment_email($user['email'], $user['name'], 'Premium Subscription', $amount);
        }
        
        echo json_encode(['success' => true, 'message' => 'Subscription activated']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Payment verification failed']);
    }
    exit();
}

// MOCK PURCHASE SONG
if ($resource === 'payment' && $id === 'purchase-song' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Login required']);
        exit();
    }
    
    $input = getInputData();
    $songId = (int) ($input['song_id'] ?? 0);
    $userId = $_SESSION['user_id'];
    
    $songStmt = $pdo->prepare("SELECT id, title, price, is_premium FROM songs WHERE id = ? AND is_premium = 1");
    $songStmt->execute([$songId]);
    $song = $songStmt->fetch();
    
    if (!$song) {
        echo json_encode(['success' => false, 'message' => 'Premium song not found']);
        exit();
    }
    
    $checkStmt = $pdo->prepare("SELECT id FROM user_purchases WHERE user_id = ? AND song_id = ?");
    $checkStmt->execute([$userId, $songId]);
    if ($checkStmt->fetch()) {
        echo json_encode(['success' => true, 'message' => 'Already purchased']);
        exit();
    }
    
    $amount = (float) ($song['price'] > 0 ? $song['price'] : 0.99);
    
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO payments (user_id, song_id, amount, payment_type, status) VALUES (?, ?, ?, 'song', 'completed')");
        $stmt->execute([$userId, $songId, $amount]);
        $paymentId = $pdo->lastInsertId();
        
        $stmt = $pdo->prepare("INSERT INTO user_purchases (user_id, song_id, payment_id) VALUES (?, ?, ?)");
        $stmt->execute([$userId, $songId, $paymentId]);
        
        $pdo->commit();
        
        $userStmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
        $userStmt->execute([$userId]);
        $user = $userStmt->fetch();
        zemalink_send_payment_email($user['email'], $user['name'], 'Song: ' . $song['title'], $amount);
        
        echo json_encode(['success' => true, 'message' => 'Purchase complete']);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Purchase failed: ' . $e->getMessage()]);
    }
    exit();
}

// ============================================
// PLAYLIST ROUTES
// ============================================

// GET PLAYLISTS
if ($resource === 'playlists' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => true, 'playlists' => []]);
        exit();
    }
    
    if ($sub === 'songs' && $id !== '') {
        $playlistId = (int) $id;
        $stmt = $pdo->prepare("
            SELECT s.*, 
                   (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count
            FROM playlist_songs ps 
            JOIN songs s ON ps.song_id = s.id 
            WHERE ps.playlist_id = ?
            ORDER BY ps.created_at
        ");
        $stmt->execute([$playlistId]);
        $songs = $stmt->fetchAll();
        echo json_encode(['success' => true, 'songs' => $songs]);
        exit();
    }
    
    $stmt = $pdo->prepare("
        SELECT p.*, 
               (SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = p.id) as song_count
        FROM playlists p 
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $playlists = $stmt->fetchAll();
    echo json_encode(['success' => true, 'playlists' => $playlists]);
    exit();
}

// CREATE PLAYLIST
if ($resource === 'playlists' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'error' => 'Login required']);
        exit();
    }
    
    $input = getInputData();
    $name = trim($input['name'] ?? $_POST['name'] ?? '');
    
    if (empty($name)) {
        echo json_encode(['success' => false, 'error' => 'Playlist name required']);
        exit();
    }
    
    $stmt = $pdo->prepare("INSERT INTO playlists (name, user_id) VALUES (?, ?)");
    if ($stmt->execute([$name, $_SESSION['user_id']])) {
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to create playlist']);
    }
    exit();
}

// ADD SONG TO PLAYLIST
if ($resource === 'playlist' && $id === 'add-song' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'error' => 'Login required']);
        exit();
    }
    
    $input = getInputData();
    $playlistId = (int) ($input['playlist_id'] ?? 0);
    $songId = (int) ($input['song_id'] ?? 0);
    
    $stmt = $pdo->prepare("SELECT id FROM playlists WHERE id = ? AND user_id = ?");
    $stmt->execute([$playlistId, $_SESSION['user_id']]);
    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'error' => 'Playlist not found']);
        exit();
    }
    
    $stmt = $pdo->prepare("INSERT IGNORE INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)");
    if ($stmt->execute([$playlistId, $songId])) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to add song']);
    }
    exit();
}

// ============================================
// ADMIN ROUTES
// ============================================

// Get pending musicians
if ($resource === 'admin' && $id === 'pending-musicians' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    require_admin_json($pdo);
    $musicians = $userModel->getPendingMusicians();
    echo json_encode(['success' => true, 'musicians' => $musicians]);
    exit();
}

// Get all users
if ($resource === 'admin' && $id === 'users' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    require_admin_json($pdo);
    $users = $userModel->getAllUsers();
    echo json_encode(['success' => true, 'users' => $users]);
    exit();
}

// Approve musician
if ($resource === 'admin' && $id === 'approve-musician' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin_json($pdo);
    $input = getInputData();
    $userId = $input['user_id'] ?? $_POST['user_id'] ?? 0;
    $userModel->approveUser($userId);
    echo json_encode(['success' => true, 'message' => 'Musician approved']);
    exit();
}

// Reject musician
if ($resource === 'admin' && $id === 'reject-musician' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin_json($pdo);
    $input = getInputData();
    $userId = (int) ($input['user_id'] ?? 0);
    $pdo->prepare("UPDATE users SET role = 'audience', is_approved = 1 WHERE id = ? AND role = 'musician' AND is_approved = 0")->execute([$userId]);
    echo json_encode(['success' => true, 'message' => 'Registration rejected']);
    exit();
}

// Update user role
if ($resource === 'admin' && $id === 'update-role' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin_json($pdo);
    $input = getInputData();
    $userId = $input['user_id'] ?? 0;
    $role = $input['role'] ?? '';
    $userModel->updateRole($userId, $role);
    echo json_encode(['success' => true]);
    exit();
}

// Delete user
if ($resource === 'admin' && $id === 'delete-user' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin_json($pdo);
    $input = getInputData();
    $userId = (int) ($input['user_id'] ?? 0);
    $adminId = (int) $_SESSION['user_id'];
    if ($userId === $adminId) {
        echo json_encode(['success' => false, 'message' => 'Cannot delete self']);
        exit();
    }
    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);
    echo json_encode(['success' => true]);
    exit();
}

// Get pending songs
if ($resource === 'admin' && $id === 'pending-songs' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    require_admin_json($pdo);
    $stmt = $pdo->query(
        "SELECT s.*, u.name AS uploader_name FROM songs s
         LEFT JOIN users u ON s.uploader_id = u.id
         WHERE s.is_approved = 0 ORDER BY s.created_at DESC"
    );
    echo json_encode(['success' => true, 'songs' => $stmt->fetchAll()]);
    exit();
}

// Get all songs (admin)
if ($resource === 'admin' && $id === 'all-songs' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    require_admin_json($pdo);
    $stmt = $pdo->query(
        "SELECT s.*, u.name AS uploader_name FROM songs s
         LEFT JOIN users u ON s.uploader_id = u.id ORDER BY s.created_at DESC"
    );
    echo json_encode(['success' => true, 'songs' => $stmt->fetchAll()]);
    exit();
}

// Approve song
if ($resource === 'admin' && $id === 'approve-song' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin_json($pdo);
    $input = getInputData();
    $sid = (int) ($input['song_id'] ?? $_POST['song_id'] ?? 0);
    if ($sid <= 0) {
        echo json_encode(['success' => false, 'message' => 'song_id required']);
        exit();
    }
    $pdo->prepare('UPDATE songs SET is_approved = 1 WHERE id = ?')->execute([$sid]);
    echo json_encode(['success' => true, 'message' => 'Song approved']);
    exit();
}

// Reject song
if ($resource === 'admin' && $id === 'reject-song' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin_json($pdo);
    $input = getInputData();
    $sid = (int) ($input['song_id'] ?? $_POST['song_id'] ?? 0);
    if ($sid <= 0) {
        echo json_encode(['success' => false, 'message' => 'song_id required']);
        exit();
    }
    $pdo->prepare('DELETE FROM songs WHERE id = ?')->execute([$sid]);
    echo json_encode(['success' => true, 'message' => 'Song rejected and removed']);
    exit();
}

// Feature song
if ($resource === 'admin' && $id === 'feature-song' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin_json($pdo);
    $input = getInputData();
    $sid = (int) ($input['song_id'] ?? 0);
    $feat = !empty($input['featured']) ? 1 : 0;
    $pdo->prepare('UPDATE songs SET featured = ? WHERE id = ?')->execute([$feat, $sid]);
    echo json_encode(['success' => true]);
    exit();
}

// Set song premium
if ($resource === 'admin' && $id === 'set-song-premium' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin_json($pdo);
    $input = getInputData();
    $sid = (int) ($input['song_id'] ?? 0);
    $prem = !empty($input['is_premium']) ? 1 : 0;
    $price = isset($input['price']) ? (float) $input['price'] : 0;
    $pdo->prepare('UPDATE songs SET is_premium = ?, price = ? WHERE id = ?')->execute([$prem, $price, $sid]);
    echo json_encode(['success' => true]);
    exit();
}

// Delete song (admin)
if ($resource === 'admin' && $id === 'delete-song' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin_json($pdo);
    $input = getInputData();
    $sid = (int) ($input['song_id'] ?? 0);
    $pdo->prepare('DELETE FROM songs WHERE id = ?')->execute([$sid]);
    echo json_encode(['success' => true]);
    exit();
}

// Get reports
if ($resource === 'admin' && $id === 'reports' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    require_admin_json($pdo);
    $stmt = $pdo->query(
        "SELECT r.*, u.name AS reporter_name, s.title AS song_title FROM reports r
         JOIN users u ON r.reported_by = u.id
         JOIN songs s ON r.song_id = s.id
         ORDER BY r.created_at DESC"
    );
    echo json_encode(['success' => true, 'reports' => $stmt->fetchAll()]);
    exit();
}

// Update report status
if ($resource === 'admin' && $id === 'report-status' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin_json($pdo);
    $input = getInputData();
    $rid = (int) ($input['report_id'] ?? 0);
    $status = $input['status'] ?? 'reviewed';
    if (!in_array($status, ['open', 'reviewed', 'dismissed'], true)) {
        $status = 'reviewed';
    }
    $pdo->prepare('UPDATE reports SET status = ? WHERE id = ?')->execute([$status, $rid]);
    echo json_encode(['success' => true]);
    exit();
}

// Get payments
if ($resource === 'admin' && $id === 'payments' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    require_admin_json($pdo);
    $stmt = $pdo->query(
        'SELECT p.*, u.name AS user_name FROM payments p JOIN users u ON p.user_id = u.id ORDER BY p.payment_date DESC LIMIT 200'
    );
    echo json_encode(['success' => true, 'payments' => $stmt->fetchAll()]);
    exit();
}

// Get stats
if ($resource === 'admin' && $id === 'stats' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    require_admin_json($pdo);
    $users = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $songs = (int) $pdo->query('SELECT COUNT(*) FROM songs')->fetchColumn();
    $rev = $pdo->query(
        "SELECT COALESCE(SUM(amount),0) AS t FROM payments WHERE status = 'completed'"
    )->fetch();
    echo json_encode([
        'success' => true,
        'stats' => [
            'total_users' => $users,
            'total_songs' => $songs,
            'revenue' => (float) ($rev['t'] ?? 0),
        ],
    ]);
    exit();
}

// ============================================
// MUSICIAN ROUTES
// ============================================

// Get my songs (musician)
if ($resource === 'musician' && $id === 'my-songs' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit();
    }
    $uid = $_SESSION['user_id'];
    $stmt = $pdo->prepare("SELECT * FROM songs WHERE uploader_id = ? ORDER BY created_at DESC");
    $stmt->execute([$uid]);
    echo json_encode(['success' => true, 'songs' => $stmt->fetchAll()]);
    exit();
}

// Get earnings (musician)
if ($resource === 'musician' && $id === 'earnings' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit();
    }
    $uid = $_SESSION['user_id'];
    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(p.amount),0) AS total FROM payments p
         JOIN songs s ON p.song_id = s.id
         WHERE p.status = 'completed' AND p.payment_type = 'song' AND s.uploader_id = ?"
    );
    $stmt->execute([$uid]);
    $row = $stmt->fetch();
    echo json_encode(['success' => true, 'earnings' => (float) ($row['total'] ?? 0)]);
    exit();
}

// Get stats (musician)
if ($resource === 'musician' && $id === 'stats' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit();
    }
    $uid = $_SESSION['user_id'];
    $stmt = $pdo->prepare(
        'SELECT COALESCE(SUM(plays),0) AS plays, COUNT(*) AS songs FROM songs WHERE uploader_id = ?'
    );
    $stmt->execute([$uid]);
    $s = $stmt->fetch();
    $likes = $pdo->prepare(
        'SELECT COUNT(*) FROM likes l JOIN songs s ON l.song_id = s.id WHERE s.uploader_id = ?'
    );
    $likes->execute([$uid]);
    $purchases = $pdo->prepare(
        "SELECT COUNT(*) FROM user_purchases up JOIN songs s ON up.song_id = s.id WHERE s.uploader_id = ?"
    );
    $purchases->execute([$uid]);
    echo json_encode([
        'success' => true,
        'stats' => [
            'plays' => (int) ($s['plays'] ?? 0),
            'songs' => (int) ($s['songs'] ?? 0),
            'likes' => (int) $likes->fetchColumn(),
            'purchases' => (int) $purchases->fetchColumn(),
        ],
    ]);
    exit();
}

// Upload song (musician)
if ($resource === 'musician' && $id === 'upload-song' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit();
    }
    $uid = $_SESSION['user_id'];
    
    $title = $_POST['title'] ?? '';
    $artist = $_POST['artist'] ?? '';
    $album = $_POST['album'] ?? '';
    $genre = trim((string) ($_POST['genre'] ?? ''));
    $isPremium = !empty($_POST['is_premium']) ? 1 : 0;
    $price = isset($_POST['price']) ? (float) $_POST['price'] : 0;
    
    if ($isPremium && $price <= 0) {
        echo json_encode(['success' => false, 'message' => 'Set a valid premium price']);
        exit();
    }
    if (!$isPremium) {
        $price = 0;
    }
    if ($title === '' || $artist === '') {
        echo json_encode(['success' => false, 'message' => 'Title and artist required']);
        exit();
    }
    
    if (empty($_FILES['file']['tmp_name'])) {
        echo json_encode(['success' => false, 'message' => 'Audio/video file required']);
        exit();
    }
    
    $uploadDir = __DIR__ . '/uploads/';
    $audioDir = $uploadDir . 'audio/';
    $coversDir = $uploadDir . 'covers/';
    
    if (!is_dir($audioDir)) mkdir($audioDir, 0777, true);
    if (!is_dir($coversDir)) mkdir($coversDir, 0777, true);
    
    $audioPath = zemalink_cloudinary_upload($_FILES['file']['tmp_name'], 'zemalink/audio', 'video');
    if (!$audioPath) {
        $ext = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION) ?: 'mp3';
        $base = 'a_' . uniqid('', true) . '.' . preg_replace('/[^a-zA-Z0-9]/', '', $ext);
        $audioPath = '/uploads/audio/' . $base;
        move_uploaded_file($_FILES['file']['tmp_name'], __DIR__ . $audioPath);
    }
    
    $coverPath = null;
    if (!empty($_FILES['cover']['tmp_name'])) {
        $coverPath = zemalink_cloudinary_upload($_FILES['cover']['tmp_name'], 'zemalink/covers', 'image');
        if (!$coverPath) {
            $cext = pathinfo($_FILES['cover']['name'], PATHINFO_EXTENSION) ?: 'jpg';
            $cbase = 'c_' . uniqid('', true) . '.' . preg_replace('/[^a-zA-Z0-9]/', '', $cext);
            $coverPath = '/uploads/covers/' . $cbase;
            move_uploaded_file($_FILES['cover']['tmp_name'], __DIR__ . $coverPath);
        }
    }
    
    $mediaType = $_POST['media_type'] ?? 'audio';
    $stmt = $pdo->prepare(
        'INSERT INTO songs (title, artist, album, genre, file_path, cover_image, uploader_id, is_premium, price, is_approved, plays, media_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)'
    );
    $stmt->execute([$title, $artist, $album, $genre !== '' ? $genre : null, $audioPath, $coverPath, $uid, $isPremium, $price, $mediaType]);
    
    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId(), 'message' => 'Song uploaded pending approval']);
    exit();
}

// Delete song (musician)
if ($resource === 'musician' && $id === 'delete-song' && is_numeric($sub) && ($_SERVER['REQUEST_METHOD'] === 'DELETE' || $_SERVER['REQUEST_METHOD'] === 'POST')) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit();
    }
    $uid = $_SESSION['user_id'];
    $songId = (int) $sub;
    $pdo->prepare('DELETE FROM songs WHERE id = ? AND uploader_id = ?')->execute([$songId, $uid]);
    echo json_encode(['success' => true]);
    exit();
}

// ============================================
// DEFAULT RESPONSE
// ============================================
echo json_encode(['success' => false, 'error' => 'Route not found']);
exit();
?>