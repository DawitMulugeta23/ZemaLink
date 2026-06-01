<?php

switch ($method) {
    case 'POST':
        match ($sub) {
            'register' => handleRegister($pdo, $emailService),
            'login' => handleLogin($pdo),
            'verify-code' => handleVerifyCode($pdo),
            'resend-code' => handleResendCode($pdo, $emailService),
            'logout' => handleLogout(),
            'forgot-password' => handleForgotPassword($pdo, $emailService),
            'reset-password' => handleResetPassword($pdo),
            default => api_error('Auth route not found', 404),
        };
        break;

    case 'GET':
        match ($sub) {
            'check' => handleCheckAuth($pdo),
            'admin-exists' => handleAdminExists($pdo),
            default => api_error('Auth route not found', 404),
        };
        break;

    default:
        api_error('Method not allowed', 405);
}

function handleRegister(PDO $pdo, EmailService $emailService): void
{
    $input = get_json_input();
    $name = trim($input['name'] ?? '');
    $email = strtolower(trim($input['email'] ?? ''));
    $password = $input['password'] ?? '';
    $role = in_array($input['role'] ?? '', ['audience', 'musician', 'admin'], true) ? $input['role'] : 'audience';

    if ($name === '' || $email === '' || $password === '') {
        api_error('All fields are required');
    }

    if (!validate_email($email)) {
        api_error('Invalid email address');
    }

    if (strlen($password) < 6) {
        api_error('Password must be at least 6 characters');
    }

    $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $check->execute([$email]);
    if ($check->fetch()) {
        api_error('An account with this email already exists');
    }

    if ($role === 'admin') {
        $adminCount = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
        if ($adminCount > 0) {
            api_error('An administrator account already exists');
        }
    }

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $isApproved = ($role === 'audience' || $role === 'admin') ? 1 : 0;
    $emailVerified = ($role === 'admin' && $adminCount === 0) ? 1 : 0;
    $verificationCode = $emailVerified ? null : generate_otp(6);
    $verificationExpires = $emailVerified ? null : date('Y-m-d H:i:s', time() + 900);

    $stmt = $pdo->prepare(
        "INSERT INTO users (name, email, password, role, is_approved, email_verified, 
                           email_verification_code, email_verification_expires) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$name, $email, $hashedPassword, $role, $isApproved, $emailVerified, $verificationCode, $verificationExpires]);

    if (!$emailVerified && $verificationCode !== null) {
        $emailService->sendVerificationCode($email, $verificationCode, $name);
    }

    $message = $emailVerified
        ? 'Registration successful'
        : 'Registration successful! Check your email for the verification code.';

    api_response([
        'success' => true,
        'message' => $message,
        'requires_verification' => $emailVerified !== 1,
        'verification_email' => $email,
    ]);
}

function handleLogin(PDO $pdo): void
{
    $input = get_json_input();
    $email = strtolower(trim($input['email'] ?? ''));
    $password = $input['password'] ?? '';

    if ($email === '' || $password === '') {
        api_error('Email and password are required');
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        api_error('Invalid email or password');
    }

    session_regenerate_id(true);

    if ((int) ($user['email_verified'] ?? 0) !== 1) {
        api_response([
            'success' => false,
            'message' => 'Please verify your email first',
            'requires_verification' => true,
            'verification_email' => $user['email'],
        ]);
    }

    if ($user['role'] === 'musician' && (int) ($user['is_approved'] ?? 0) !== 1) {
        api_response([
            'success' => false,
            'message' => 'Your musician account is pending approval',
            'pending_approval' => true,
        ]);
    }

    $_SESSION['user_id'] = (int) $user['id'];

    api_response([
        'success' => true,
        'user' => [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'is_approved' => (int) ($user['is_approved'] ?? 0),
            'subscription_status' => $user['subscription'] ?? 'free',
            'subscription_expires' => $user['subscription_expires'] ?? null,
            'email_verified' => (int) ($user['email_verified'] ?? 0),
            'avatar' => $user['avatar'] ?? null,
        ],
    ]);
}

function handleVerifyCode(PDO $pdo): void
{
    $input = get_json_input();
    $email = strtolower(trim($input['email'] ?? ''));
    $code = trim($input['code'] ?? '');

    if ($email === '' || $code === '') {
        api_error('Email and verification code are required');
    }

    $stmt = $pdo->prepare("SELECT id, email_verification_code, email_verification_expires FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        api_error('Account not found');
    }

    if ((int) ($user['email_verified'] ?? 0) === 1) {
        api_response(['success' => true, 'message' => 'Email already verified']);
    }

    if (empty($user['email_verification_code'])) {
        api_error('No verification code found. Request a new one.');
    }

    $expires = $user['email_verification_expires'] ?? null;
    if ($expires === null || strtotime($expires) < time()) {
        api_error('Verification code has expired. Please request a new code.');
    }

    if ((string) $user['email_verification_code'] !== $code) {
        api_error('Invalid verification code');
    }

    $pdo->prepare("UPDATE users SET email_verified = 1, email_verification_code = NULL, email_verification_expires = NULL WHERE id = ?")
        ->execute([$user['id']]);

    api_response(['success' => true, 'message' => 'Email verified successfully']);
}

function handleResendCode(PDO $pdo, EmailService $emailService): void
{
    $input = get_json_input();
    $email = strtolower(trim($input['email'] ?? ''));

    if ($email === '') {
        api_error('Email is required');
    }

    $stmt = $pdo->prepare("SELECT id, name, email, email_verified FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        api_response(['success' => true, 'message' => 'If that email exists, a new code has been sent']);
    }

    if ((int) ($user['email_verified'] ?? 0) === 1) {
        api_error('This email is already verified');
    }

    $code = generate_otp(6);
    $expires = date('Y-m-d H:i:s', time() + 900);

    $pdo->prepare("UPDATE users SET email_verification_code = ?, email_verification_expires = ? WHERE id = ?")
        ->execute([$code, $expires, $user['id']]);

    $emailService->sendVerificationCode($email, $code, $user['name']);

    api_response(['success' => true, 'message' => 'A new verification code has been sent']);
}

function handleLogout(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    api_response(['success' => true, 'message' => 'Logged out successfully']);
}

function handleCheckAuth(PDO $pdo): void
{
    if (!isset($_SESSION['user_id'])) {
        api_response(['authenticated' => false]);
    }

    $stmt = $pdo->prepare(
        "SELECT id, name, email, role, is_approved, subscription, subscription_expires, 
                email_verified, avatar FROM users WHERE id = ?"
    );
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        api_response(['authenticated' => false]);
    }

    api_response([
        'authenticated' => true,
        'user' => [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'is_approved' => (int) ($user['is_approved'] ?? 0),
            'subscription_status' => $user['subscription'] ?? 'free',
            'subscription_expires' => $user['subscription_expires'] ?? null,
            'email_verified' => (int) ($user['email_verified'] ?? 0),
            'avatar' => $user['avatar'] ?? null,
        ],
    ]);
}

function handleAdminExists(PDO $pdo): void
{
    $count = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
    api_response(['success' => true, 'admin_exists' => $count > 0]);
}

function handleForgotPassword(PDO $pdo, EmailService $emailService): void
{
    $input = get_json_input();
    $email = strtolower(trim($input['email'] ?? ''));

    if ($email === '') {
        api_error('Email is required');
    }

    $stmt = $pdo->prepare("SELECT id, name FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        $token = generate_token(32);
        $expires = date('Y-m-d H:i:s', time() + 3600);

        $pdo->prepare("UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?")
            ->execute([$token, $expires, $user['id']]);

        $resetLink = rtrim($_ENV['APP_FRONTEND_URL'] ?? getenv('APP_FRONTEND_URL') ?: 'http://localhost:5173', '/')
                    . '/reset-password?token=' . $token;
        $emailService->sendPasswordReset($email, $resetLink, $user['name']);
    }

    api_response(['success' => true, 'message' => 'If that email exists, a reset link has been sent']);
}

function handleResetPassword(PDO $pdo): void
{
    $input = get_json_input();
    $token = trim($input['token'] ?? '');
    $password = $input['password'] ?? '';

    if ($token === '' || $password === '') {
        api_error('Token and new password are required');
    }

    if (strlen($password) < 6) {
        api_error('Password must be at least 6 characters');
    }

    $stmt = $pdo->prepare("SELECT id, reset_expires FROM users WHERE reset_token = ?");
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user || strtotime($user['reset_expires']) < time()) {
        api_error('Invalid or expired reset token');
    }

    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $pdo->prepare("UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?")
        ->execute([$hashed, $user['id']]);

    api_response(['success' => true, 'message' => 'Password has been reset successfully']);
}
