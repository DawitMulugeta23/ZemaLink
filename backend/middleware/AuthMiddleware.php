<?php
function isAuthenticated() {
    return isset($_SESSION['user_id']);
}

function requireAuth() {
    if (!isAuthenticated()) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        exit();
    }
}

function requireRole($role) {
    requireAuth();
    global $pdo;
    
    $stmt = $pdo->prepare("SELECT role, is_approved FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user || $user['role'] !== $role) {
        http_response_code(403);
        echo json_encode(['error' => 'Access denied. ' . ucfirst($role) . ' privileges required.']);
        exit();
    }
    
    if ($role === 'musician' && $user['is_approved'] != 1) {
        http_response_code(403);
        echo json_encode(['error' => 'Your musician account is pending approval.']);
        exit();
    }
    
    return true;
}

function requireAnyRole($roles) {
    requireAuth();
    global $pdo;
    
    $stmt = $pdo->prepare("SELECT role, is_approved FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user || !in_array($user['role'], $roles)) {
        http_response_code(403);
        echo json_encode(['error' => 'Access denied. Required roles: ' . implode(', ', $roles)]);
        exit();
    }
    
    if ($user['role'] === 'musician' && $user['is_approved'] != 1) {
        http_response_code(403);
        echo json_encode(['error' => 'Your musician account is pending approval.']);
        exit();
    }
    
    return true;
}
?>