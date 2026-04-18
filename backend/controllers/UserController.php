<?php
class UserController {
    private $likeModel;
    private $playlistModel;
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->likeModel = new Like($pdo);
        $this->playlistModel = new Playlist($pdo);
    }
    
    public function getProfile() {
        $userId = $_SESSION['user_id'] ?? 0;
        if (!$userId) {
            return ['success' => false, 'error' => 'Login required'];
        }
        
        $userModel = new User($this->pdo);
        $user = $userModel->find($userId);
        $likes = $this->likeModel->getUserLikes($userId);
        $playlists = $this->playlistModel->getUserPlaylists($userId);
        
        return [
            'success' => true,
            'user' => $user,
            'likes' => $likes,
            'playlists' => $playlists
        ];
    }
    
    public function toggleLike($data) {
        $userId = $_SESSION['user_id'] ?? 0;
        if (!$userId) {
            return ['success' => false, 'error' => 'Login required'];
        }
        
        return $this->likeModel->toggle($userId, $data['song_id']);
    }
    
    public function getLikes() {
        $userId = $_SESSION['user_id'] ?? 0;
        if (!$userId) {
            return ['success' => true, 'likes' => []];
        }
        
        $likes = $this->likeModel->getUserLikes($userId);
        return ['success' => true, 'likes' => $likes];
    }
}
?>