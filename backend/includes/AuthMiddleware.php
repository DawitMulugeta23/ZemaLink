<?php

class AuthMiddleware
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function authenticate(): array
    {
        $userId = $_SESSION['user_id'] ?? null;

        if ($userId === null) {
            api_error('Authentication required. Please log in.', 401);
        }

        $stmt = $this->pdo->prepare(
            "SELECT id, name, email, role, is_approved, subscription, subscription_expires, 
                    email_verified, profile_image, created_at 
             FROM users WHERE id = ?"
        );
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            session_destroy();
            api_error('User not found', 401);
        }

        return $user;
    }

    public function getUser(): ?array
    {
        $userId = $_SESSION['user_id'] ?? null;
        if ($userId === null) {
            return null;
        }

        $stmt = $this->pdo->prepare(
            "SELECT id, name, email, role, is_approved, subscription, subscription_expires, 
                    email_verified, profile_image, created_at 
             FROM users WHERE id = ?"
        );
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public function requireRole(string $role): array
    {
        $user = $this->authenticate();

        if ($user['role'] !== $role) {
            api_error('Access denied. ' . ucfirst($role) . ' privileges required.', 403);
        }

        return $user;
    }

    public function requireAnyRole(array $roles): array
    {
        $user = $this->authenticate();

        if (!in_array($user['role'], $roles, true)) {
            $roleList = implode(', ', array_map('ucfirst', $roles));
            api_error("Access denied. One of the following roles required: {$roleList}", 403);
        }

        return $user;
    }

    public function isAdmin(): bool
    {
        $user = $this->getUser();
        return $user !== null && $user['role'] === 'admin';
    }

    public function isMusician(): bool
    {
        $user = $this->getUser();
        return $user !== null && $user['role'] === 'musician';
    }

    public function isPremium(): bool
    {
        $user = $this->getUser();
        if ($user === null) {
            return false;
        }

        if (($user['subscription'] ?? 'free') !== 'premium') {
            return false;
        }

        $expires = $user['subscription_expires'] ?? null;
        if ($expires !== null && strtotime($expires) < time()) {
            return false;
        }

        return true;
    }

    public function requireAdmin(): array
    {
        return $this->requireRole('admin');
    }

    public function requireMusician(): array
    {
        $user = $this->requireRole('musician');

        if ((int) ($user['is_approved'] ?? 0) !== 1) {
            api_error('Your musician account is pending approval.', 403);
        }

        return $user;
    }

    public function requireApprovedMusician(): array
    {
        return $this->requireMusician();
    }

    public function requireSubscription(): void
    {
        $this->authenticate();

        if (!$this->isPremium()) {
            api_error('Premium subscription required. Please upgrade your account.', 403);
        }
    }

    public function checkVerified(): array
    {
        $user = $this->authenticate();

        if ((int) ($user['email_verified'] ?? 0) !== 1) {
            api_error('Please verify your email address before proceeding.', 403);
        }

        return $user;
    }
}
