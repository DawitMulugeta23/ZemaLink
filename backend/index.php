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
require_once __DIR__ . '/platform_routes.php';
require_once __DIR__ . '/services/RatingService.php';

$userModel = new User($pdo);
$ratingService = new RatingService($pdo);

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
    $isApproved = ($role === 'audience') ? 1 : 0;
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
         WHERE l.user_id = ?"
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
    
    // Recalculate rating after like changes
    $ratingService->updateSongRating($songId);
    
    echo json_encode(['liked' => $liked]);
    exit();
}

// RECORD LISTEN (PLAY COUNT)
if ($resource === 'user' && $id === 'listen' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'error' => 'Login required']);
        exit();
    }
    
    $input = getInputData();
    $songId = (int) ($input['song_id'] ?? 0);
    $userId = $_SESSION['user_id'];
    
    if ($songId > 0) {
        // Record in listening history
        $stmt = $pdo->prepare("INSERT INTO listening_history (user_id, song_id) VALUES (?, ?)");
        $stmt->execute([$userId, $songId]);
        
        // Check if user already viewed this song
        $stmt = $pdo->prepare("SELECT id FROM song_views WHERE user_id = ? AND song_id = ?");
        $stmt->execute([$userId, $songId]);
        
        if (!$stmt->fetch()) {
            // First time view - increment plays and record view
            $stmt = $pdo->prepare("INSERT INTO song_views (user_id, song_id) VALUES (?, ?)");
            $stmt->execute([$userId, $songId]);
            
            $stmt = $pdo->prepare("UPDATE songs SET plays = plays + 1 WHERE id = ?");
            $stmt->execute([$songId]);
            
            // Recalculate rating after play count increases
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
         WHERE lh.user_id = ? 
         ORDER BY lh.played_at DESC 
         LIMIT 50"
    );
    $stmt->execute([$_SESSION['user_id']]);
    $history = $stmt->fetchAll();
    echo json_encode(['success' => true, 'songs' => $history]);
    exit();
}

// ============================================
// RATING API ROUTES
// ============================================

// Rate a song
if ($resource === 'song' && $id === 'rate' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Login required']);
        exit();
    }
    
    $input = getInputData();
    $songId = (int) ($input['song_id'] ?? 0);
    $rating = (int) ($input['rating'] ?? 0);
    
    if ($songId <= 0 || $rating < 1 || $rating > 5) {
        echo json_encode(['success' => false, 'message' => 'Invalid rating (1-5)']);
        exit();
    }
    
    $result = $ratingService->rateSong($_SESSION['user_id'], $songId, $rating);
    echo json_encode($result);
    exit();
}

// Get user's rating for a song
if ($resource === 'song' && $id === 'user-rating' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Login required']);
        exit();
    }
    
    $songId = (int) ($_GET['song_id'] ?? 0);
    if ($songId <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid song ID']);
        exit();
    }
    
    $rating = $ratingService->getUserRating($_SESSION['user_id'], $songId);
    echo json_encode(['success' => true, 'rating' => $rating]);
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
    
    // Verify playlist belongs to user
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

// ============================================
// DEFAULT RESPONSE
// ============================================
echo json_encode(['success' => false, 'error' => 'Route not found']);
exit();
?>