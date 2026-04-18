<?php
class User {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function find($id) {
        $stmt = $this->pdo->prepare("SELECT id, name, email, role, is_approved, bio, profile_image, genre, subscription, subscription_expires, created_at FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }
    
    public function findByEmail($email) {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch();
    }
    
    public function create($name, $email, $password, $role = 'audience') {
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $isApproved = ($role === 'audience') ? 1 : 0; // Audience auto-approved, musicians need approval
        $stmt = $this->pdo->prepare("INSERT INTO users (name, email, password, role, is_approved) VALUES (?, ?, ?, ?, ?)");
        return $stmt->execute([$name, $email, $hashed, $role, $isApproved]);
    }
    
    public function updateRole($userId, $role) {
        $stmt = $this->pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
        return $stmt->execute([$role, $userId]);
    }
    
    public function approveUser($userId) {
        $stmt = $this->pdo->prepare("UPDATE users SET is_approved = 1 WHERE id = ?");
        return $stmt->execute([$userId]);
    }
    
    public function getPendingMusicians() {
        $stmt = $this->pdo->prepare("SELECT id, name, email, role, is_approved, created_at FROM users WHERE role = 'musician' AND is_approved = 0");
        $stmt->execute();
        return $stmt->fetchAll();
    }
    
    public function getAllUsers() {
        $stmt = $this->pdo->prepare("SELECT id, name, email, role, is_approved, created_at FROM users ORDER BY created_at DESC");
        $stmt->execute();
        return $stmt->fetchAll();
    }
    
    public function updateProfile($userId, $data) {
        $stmt = $this->pdo->prepare("UPDATE users SET bio = ?, profile_image = ?, genre = ? WHERE id = ?");
        return $stmt->execute([$data['bio'], $data['profile_image'], $data['genre'], $userId]);
    }
}
?>