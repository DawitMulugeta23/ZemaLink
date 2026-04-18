<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class AdminController {
    private $userModel;
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->userModel = new User($pdo);
    }
    
    public function getPendingMusicians() {
        requireRole('admin');
        $musicians = $this->userModel->getPendingMusicians();
        return ['success' => true, 'musicians' => $musicians];
    }
    
    public function approveMusician($data) {
        requireRole('admin');
        if (empty($data['user_id'])) {
            return ['success' => false, 'message' => 'User ID required'];
        }
        
        $this->userModel->approveUser($data['user_id']);
        return ['success' => true, 'message' => 'Musician approved successfully'];
    }
    
    public function getAllUsers() {
        requireRole('admin');
        $users = $this->userModel->getAllUsers();
        return ['success' => true, 'users' => $users];
    }
    
    public function updateUserRole($data) {
        requireRole('admin');
        if (empty($data['user_id']) || empty($data['role'])) {
            return ['success' => false, 'message' => 'User ID and role required'];
        }
        
        $this->userModel->updateRole($data['user_id'], $data['role']);
        return ['success' => true, 'message' => 'User role updated successfully'];
    }
}
?>