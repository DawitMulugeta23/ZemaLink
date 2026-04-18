<?php
class PlaylistController {
    private $playlistModel;
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->playlistModel = new Playlist($pdo);
    }
    
    public function getUserPlaylists() {
        $userId = $_SESSION['user_id'] ?? 0;
        if (!$userId) {
            return ['success' => true, 'playlists' => []];
        }
        $playlists = $this->playlistModel->getUserPlaylists($userId);
        return ['success' => true, 'playlists' => $playlists];
    }
    
    public function create($data) {
        $userId = $_SESSION['user_id'] ?? 0;
        if (!$userId) {
            return ['success' => false, 'error' => 'Login required'];
        }
        
        if (empty($data['name'])) {
            return ['success' => false, 'error' => 'Playlist name required'];
        }
        
        $this->playlistModel->create($data['name'], $userId, $data['is_public'] ?? false);
        return ['success' => true, 'id' => $this->pdo->lastInsertId()];
    }
    
    public function addSong($data) {
        $userId = $_SESSION['user_id'] ?? 0;
        if (!$userId) {
            return ['success' => false, 'error' => 'Login required'];
        }
        
        $this->playlistModel->addSong($data['playlist_id'], $data['song_id']);
        return ['success' => true];
    }
    
    public function getSongs($playlistId) {
        $songs = $this->playlistModel->getSongs($playlistId);
        return ['success' => true, 'songs' => $songs];
    }
}
?>