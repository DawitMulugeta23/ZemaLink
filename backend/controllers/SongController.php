<?php
class SongController {
    private $songModel;
    
    public function __construct($pdo) {
        $this->songModel = new Song($pdo);
    }
    
    public function getAll() {
        try {
            $songs = $this->songModel->getAll();
            return ['success' => true, 'songs' => $songs, 'count' => count($songs)];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage(), 'songs' => []];
        }
    }
    
    public function getOne($id) {
        $song = $this->songModel->find($id);
        if ($song) {
            $this->songModel->incrementPlays($id);
            return ['success' => true, 'data' => $song];
        }
        return ['success' => false, 'error' => 'Song not found'];
    }
    
    public function getTrending() {
        try {
            $songs = $this->songModel->getTrending();
            return ['success' => true, 'songs' => $songs];
        } catch (Exception $e) {
            return ['success' => false, 'songs' => [], 'error' => $e->getMessage()];
        }
    }
    
    public function search($query) {
        $songs = $this->songModel->search($query);
        return ['success' => true, 'songs' => $songs];
    }
}
?>