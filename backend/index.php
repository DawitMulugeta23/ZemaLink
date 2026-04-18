<?php
// Session cookie path "/" so the Vite dev proxy (http://localhost:5173/api/*)
// still sends PHPSESSID on subsequent API calls.
if (session_status() === PHP_SESSION_NONE) {
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
}

$allowed_origins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
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

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_start();

/**
 * Older DBs may lack columns expected by auth / User model — add them once.
 */
function ensure_users_schema(PDO $pdo): void {
    try {
        $dbRow = $pdo->query('SELECT DATABASE() AS db')->fetch();
        $schema = $dbRow['db'] ?? '';
        if ($schema === '') {
            return;
        }
        $check = $pdo->prepare(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = ?"
        );
        $columnExists = function (string $name) use ($check, $schema): bool {
            $check->execute([$schema, $name]);
            return (int) $check->fetchColumn() > 0;
        };
        if (!$columnExists('role')) {
            $pdo->exec(
                "ALTER TABLE users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'audience' AFTER password"
            );
        }
        if (!$columnExists('is_approved')) {
            $pdo->exec(
                'ALTER TABLE users ADD COLUMN is_approved TINYINT(1) NOT NULL DEFAULT 1 AFTER role'
            );
        }
        if (!$columnExists('bio')) {
            $pdo->exec('ALTER TABLE users ADD COLUMN bio TEXT NULL AFTER is_approved');
        }
        if (!$columnExists('profile_image')) {
            $pdo->exec(
                'ALTER TABLE users ADD COLUMN profile_image VARCHAR(500) NULL AFTER bio'
            );
        }
        if (!$columnExists('genre')) {
            $pdo->exec('ALTER TABLE users ADD COLUMN genre VARCHAR(80) NULL AFTER profile_image');
        }
        if (!$columnExists('subscription')) {
            $pdo->exec(
                "ALTER TABLE users ADD COLUMN subscription VARCHAR(20) NOT NULL DEFAULT 'free'"
            );
        }
        if (!$columnExists('subscription_expires')) {
            $pdo->exec('ALTER TABLE users ADD COLUMN subscription_expires DATE NULL');
        }
        if (!$columnExists('email_verified')) {
            $pdo->exec('ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0');
        }
        if (!$columnExists('verification_token')) {
            $pdo->exec('ALTER TABLE users ADD COLUMN verification_token VARCHAR(120) NULL');
        }
        if (!$columnExists('email_verification_code')) {
            $pdo->exec('ALTER TABLE users ADD COLUMN email_verification_code VARCHAR(12) NULL');
        }
        if (!$columnExists('email_verification_expires')) {
            $pdo->exec('ALTER TABLE users ADD COLUMN email_verification_expires DATETIME NULL');
        }
    } catch (Throwable $e) {
        error_log('ensure_users_schema: ' . $e->getMessage());
    }
}

// Database connection
$host = 'localhost';
$dbname = 'zema_music';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
}

ensure_users_schema($pdo);

require_once __DIR__ . '/schema_platform.php';
ensure_platform_schema($pdo);
require_once __DIR__ . '/integrations.php';

require_once __DIR__ . '/models/User.php';
require_once __DIR__ . '/platform_routes.php';
$userModel = new User($pdo);

// Function to get input data from either JSON or FormData
function getInputData() {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    
    if (strpos($contentType, 'application/json') !== false) {
        // Handle JSON data
        return json_decode(file_get_contents('php://input'), true);
    } else {
        // Handle form data (POST)
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
        echo json_encode(['success' => false, 'message' => 'Forbidden']);
        exit();
    }
}

/**
 * Path segments after the backend folder (e.g. auth/login, musician/delete-song/5).
 */
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

$segments = api_route_segments();
$resource = $segments[0] ?? '';
$id = $segments[1] ?? '';
$sub = $segments[2] ?? '';

// AUTH REGISTER - Using $_POST or JSON
if ($resource === 'auth' && $id === 'register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getInputData();
    
    // Get data from either JSON or POST
    $name = $input['name'] ?? $_POST['name'] ?? '';
    $email = $input['email'] ?? $_POST['email'] ?? '';
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
    
    $name = trim($name);
    $email = strtolower(trim($email));
    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $isApproved = ($role === 'audience') ? 1 : 0;
    $adminCount = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
    $emailVerified = ($adminCount === 0 && $role === 'admin') ? 1 : 0;
    $verificationCode = $emailVerified ? null : str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $verificationExpires = $emailVerified ? null : date('Y-m-d H:i:s', time() + (15 * 60));
    $stmt = $pdo->prepare(
        "INSERT INTO users
        (name, email, password, role, is_approved, email_verified, verification_token, email_verification_code, email_verification_expires)
        VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)"
    );
    
    if ($stmt->execute([$name, $email, $hashed, $role, $isApproved, $emailVerified, $verificationCode, $verificationExpires])) {
        $userId = $pdo->lastInsertId();
        $emailSent = true;
        if (!empty($verificationCode)) {
            $emailSent = zemalink_send_verification_email($email, $name, $verificationCode);
        }
        $registerMessage = $emailVerified
            ? ($role === 'musician' ? 'Registration successful! Your account is pending approval.' : 'Registration successful!')
            : 'Registration successful! Enter the 6-digit code sent to your email.';
        if (!$emailVerified && !$emailSent) {
            $registerMessage = 'Email sending failed right now. Use this OTP code: ' . $verificationCode;
        }
        echo json_encode([
            'success' => true,
            'message' => $registerMessage,
            'requires_verification' => $emailVerified !== 1,
            'verification_email' => $email,
            'email_sent' => $emailSent,
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Registration failed']);
    }
    exit();
}

// AUTH LOGIN - Using $_POST or JSON
elseif ($resource === 'auth' && $id === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getInputData();
    
    // Get data from either JSON or POST
    $email = $input['email'] ?? $_POST['email'] ?? '';
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
        $subStatus = $user['subscription'] ?? 'free';
        $subExpires = $user['subscription_expires'] ?? null;
        if (is_string($subExpires) && $subExpires === '') {
            $subExpires = null;
        }
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'is_approved' => $user['is_approved'],
                'subscription_status' => $subStatus,
                'subscription_expires' => $subExpires,
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
    }
    exit();
}

// AUTH LOGOUT
elseif ($resource === 'auth' && $id === 'logout' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    session_destroy();
    echo json_encode(['success' => true]);
    exit();
}

// AUTH CHECK
elseif ($resource === 'auth' && $id === 'check' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_SESSION['user_id'])) {
        $stmt = $pdo->prepare(
            "SELECT id, name, email, role, is_approved, subscription, subscription_expires FROM users WHERE id = ?"
        );
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        if ($user) {
            $user['subscription_status'] = $user['subscription'] ?? 'free';
            unset($user['subscription']);
            echo json_encode(['authenticated' => true, 'user' => $user]);
        } else {
            echo json_encode(['authenticated' => false]);
        }
    } else {
        echo json_encode(['authenticated' => false]);
    }
    exit();
}

// AUTH VERIFY EMAIL CODE
elseif ($resource === 'auth' && $id === 'verify-code' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getInputData();
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $code = trim((string) ($input['code'] ?? ''));
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
    if (empty($user['email_verification_code']) || empty($expiresAt) || strtotime((string) $expiresAt) < time()) {
        echo json_encode(['success' => false, 'message' => 'Verification code expired. Request a new code.']);
        exit();
    }
    if ((string) $user['email_verification_code'] !== $code) {
        echo json_encode(['success' => false, 'message' => 'Invalid verification code']);
        exit();
    }
    $pdo->prepare(
        "UPDATE users SET email_verified = 1, verification_token = NULL, email_verification_code = NULL, email_verification_expires = NULL WHERE id = ?"
    )->execute([$user['id']]);
    echo json_encode(['success' => true, 'message' => 'Email verified. You can now sign in.']);
    exit();
}

// AUTH RESEND CODE
elseif ($resource === 'auth' && $id === 'resend-code' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getInputData();
    $email = strtolower(trim((string) ($input['email'] ?? '')));
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
    $emailSent = zemalink_send_verification_email((string) $user['email'], (string) ($user['name'] ?? 'User'), $code);
    if ($emailSent) {
        echo json_encode(['success' => true, 'message' => 'A new verification code has been sent']);
    } else {
        echo json_encode([
            'success' => true,
            'message' => 'Email sending failed right now. Use this OTP code: ' . $code,
            'email_sent' => false,
        ]);
    }
    exit();
}

// AUTH ADMIN EXISTS (public bootstrap helper)
elseif ($resource === 'auth' && $id === 'admin-exists' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'");
    $row = $stmt->fetch();
    echo json_encode(['success' => true, 'admin_exists' => ((int) ($row['c'] ?? 0) > 0)]);
    exit();
}

// GET SONGS (public browse: approved only; trending by plays)
elseif ($resource === 'songs' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $uid = $_SESSION['user_id'] ?? null;
    $purchasedIds = [];
    $hasPremiumSub = false;
    if ($uid) {
        $uStmt = $pdo->prepare(
            "SELECT subscription, subscription_expires FROM users WHERE id = ?"
        );
        $uStmt->execute([$uid]);
        $uRow = $uStmt->fetch();
        if ($uRow && ($uRow['subscription'] ?? '') === 'premium') {
            $exp = $uRow['subscription_expires'] ?? null;
            if ($exp === null || $exp === '' || strtotime((string) $exp) >= strtotime('today')) {
                $hasPremiumSub = true;
            }
        }
        $pStmt = $pdo->prepare("SELECT song_id FROM user_purchases WHERE user_id = ?");
        $pStmt->execute([$uid]);
        foreach ($pStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $purchasedIds[(int) $row['song_id']] = true;
        }
    }

    $mapSong = function (array $s) use ($uid, $purchasedIds, $hasPremiumSub): array {
        $s['uploaded_by'] = $s['uploader_id'] ?? null;
        $sid = (int) ($s['id'] ?? 0);
        $isPrem = !empty($s['is_premium']);
        $s['can_play'] = true;
        if ($isPrem) {
            $s['can_play'] = $hasPremiumSub || ($uid && !empty($purchasedIds[$sid]));
        }
        return $s;
    };

    if ($id === 'trending') {
        $stmt = $pdo->query(
            "SELECT * FROM songs WHERE is_approved = 1 ORDER BY plays DESC LIMIT 10"
        );
        $songs = array_map($mapSong, $stmt->fetchAll());
        echo json_encode(['success' => true, 'songs' => $songs]);
    } else {
        $stmt = $pdo->query(
            "SELECT * FROM songs WHERE is_approved = 1 ORDER BY featured DESC, created_at DESC LIMIT 50"
        );
        $songs = array_map($mapSong, $stmt->fetchAll());
        echo json_encode(['success' => true, 'songs' => $songs]);
    }
    exit();
}

// GET USER LIKES
elseif ($resource === 'user' && $id === 'likes' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => true, 'likes' => []]);
        exit();
    }
    $stmt = $pdo->prepare("SELECT s.* FROM likes l JOIN songs s ON l.song_id = s.id WHERE l.user_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $likes = $stmt->fetchAll();
    echo json_encode(['success' => true, 'likes' => $likes]);
    exit();
}

// TOGGLE LIKE - Using $_POST
elseif ($resource === 'user' && $id === 'like' && $_SERVER['REQUEST_METHOD'] === 'POST') {
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
        echo json_encode(['liked' => false]);
    } else {
        $stmt = $pdo->prepare("INSERT IGNORE INTO likes (user_id, song_id) VALUES (?, ?)");
        $stmt->execute([$userId, $songId]);
        echo json_encode(['liked' => true]);
    }
    exit();
}

// GET PLAYLIST SONGS (must be before generic GET /playlists)
elseif ($resource === 'playlists' && $sub === 'songs' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'error' => 'Login required']);
        exit();
    }
    $playlistId = (int) $id;
    if ($playlistId <= 0) {
        echo json_encode(['success' => false, 'error' => 'Invalid playlist']);
        exit();
    }
    $stmt = $pdo->prepare("SELECT id FROM playlists WHERE id = ? AND user_id = ?");
    $stmt->execute([$playlistId, $_SESSION['user_id']]);
    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'error' => 'Playlist not found']);
        exit();
    }
    $stmt = $pdo->prepare(
        "SELECT s.* FROM playlist_songs ps INNER JOIN songs s ON ps.song_id = s.id WHERE ps.playlist_id = ? ORDER BY ps.id ASC"
    );
    $stmt->execute([$playlistId]);
    $songs = $stmt->fetchAll();
    echo json_encode(['success' => true, 'songs' => $songs]);
    exit();
}

// GET PLAYLISTS
elseif ($resource === 'playlists' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => true, 'playlists' => []]);
        exit();
    }
    $stmt = $pdo->prepare("SELECT * FROM playlists WHERE user_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $playlists = $stmt->fetchAll();
    echo json_encode(['success' => true, 'playlists' => $playlists]);
    exit();
}

// CREATE PLAYLIST - Using $_POST
elseif ($resource === 'playlists' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'error' => 'Login required']);
        exit();
    }
    
    $input = getInputData();
    $name = $input['name'] ?? $_POST['name'] ?? '';
    $userId = $_SESSION['user_id'];
    
    $stmt = $pdo->prepare("INSERT INTO playlists (name, user_id) VALUES (?, ?)");
    if ($stmt->execute([$name, $userId])) {
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to create playlist']);
    }
    exit();
}

elseif ($resource === 'admin' && $id === 'pending-musicians' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    require_admin_json($pdo);
    $musicians = $userModel->getPendingMusicians();
    echo json_encode(['success' => true, 'musicians' => $musicians]);
    exit();
}

elseif ($resource === 'admin' && $id === 'users' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    require_admin_json($pdo);
    $users = $userModel->getAllUsers();
    echo json_encode(['success' => true, 'users' => $users]);
    exit();
}

elseif ($resource === 'admin' && $id === 'approve-musician' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin_json($pdo);
    $input = getInputData();
    $userId = $input['user_id'] ?? $_POST['user_id'] ?? 0;
    if (empty($userId)) {
        echo json_encode(['success' => false, 'message' => 'User ID required']);
        exit();
    }
    $userModel->approveUser($userId);
    echo json_encode(['success' => true, 'message' => 'Musician approved successfully']);
    exit();
}

elseif ($resource === 'admin' && $id === 'update-role' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin_json($pdo);
    $input = getInputData();
    $userId = $input['user_id'] ?? $_POST['user_id'] ?? 0;
    $role = $input['role'] ?? $_POST['role'] ?? '';
    if (empty($userId) || $role === '') {
        echo json_encode(['success' => false, 'message' => 'User ID and role required']);
        exit();
    }
    $allowed = ['audience', 'musician', 'admin'];
    if (!in_array($role, $allowed, true)) {
        echo json_encode(['success' => false, 'message' => 'Invalid role']);
        exit();
    }
    $userModel->updateRole($userId, $role);
    echo json_encode(['success' => true, 'message' => 'User role updated successfully']);
    exit();
}

if (zemalink_dispatch_platform($pdo, $segments, $userModel)) {
    exit();
}

// Default response
echo json_encode(['success' => false, 'error' => 'Route not found']);
?>