<?php
class AuthController {
    private $userModel;
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->userModel = new User($pdo);
    }
    
    public function register($data) {
        if (empty($data['name']) || empty($data['email']) || empty($data['password'])) {
            return ['success' => false, 'message' => 'All fields required'];
        }
        
        $role = isset($data['role']) && in_array($data['role'], ['musician', 'audience']) 
                ? $data['role'] 
                : 'audience';
        
        $existing = $this->userModel->findByEmail($data['email']);
        if ($existing) {
            return ['success' => false, 'message' => 'Email already exists'];
        }
        
        if ($this->userModel->create($data['name'], $data['email'], $data['password'], $role)) {
            $user = $this->userModel->findByEmail($data['email']);
            $_SESSION['user_id'] = $user['id'];
            
            $message = $role === 'musician' 
                ? 'Registration successful! Your musician account is pending admin approval.' 
                : 'Registration successful!';
            
            return [
                'success' => true,
                'message' => $message,
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                    'is_approved' => $user['is_approved']
                ]
            ];
        }
        
        return ['success' => false, 'message' => 'Registration failed'];
    }
    
    public function login($data) {
        if (empty($data['email']) || empty($data['password'])) {
            return ['success' => false, 'message' => 'Email and password required'];
        }
        
        $user = $this->userModel->findByEmail($data['email']);
        
        if ($user && password_verify($data['password'], $user['password'])) {
            if ($user['role'] === 'musician' && $user['is_approved'] != 1) {
                return ['success' => false, 'message' => 'Your account is pending admin approval.'];
            }
            
            $_SESSION['user_id'] = $user['id'];
            
            return [
                'success' => true,
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                    'is_approved' => $user['is_approved'],
                    'subscription' => $user['subscription'] ?? 'free'
                ]
            ];
        }
        
        return ['success' => false, 'message' => 'Invalid credentials'];
    }
    
    public function logout() {
        $_SESSION = array();
        if (isset($_COOKIE[session_name()])) {
            setcookie(session_name(), '', time()-3600, '/');
        }
        session_destroy();
        return ['success' => true];
    }
    
    public function check() {
        if (isset($_SESSION['user_id'])) {
            $user = $this->userModel->find($_SESSION['user_id']);
            if ($user) {
                return ['authenticated' => true, 'user' => $user];
            }
        }
        return ['authenticated' => false];
    }
}
?>