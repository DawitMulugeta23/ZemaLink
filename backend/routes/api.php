<?php
$routes = [
    'POST /auth/register' => ['AuthController', 'register'],
    'POST /auth/login' => ['AuthController', 'login'],
    'POST /auth/logout' => ['AuthController', 'logout'],
    'GET /auth/check' => ['AuthController', 'check'],
    'GET /songs' => ['SongController', 'getAll'],
    'GET /songs/trending' => ['SongController', 'getTrending'],
    'GET /songs/search/{query}' => ['SongController', 'search'],
    'GET /songs/{id}' => ['SongController', 'getOne'],
    'GET /playlists' => ['PlaylistController', 'getUserPlaylists'],
    'POST /playlists' => ['PlaylistController', 'create'],
    'POST /playlists/add-song' => ['PlaylistController', 'addSong'],
    'GET /playlist-songs/{id}' => ['PlaylistController', 'getSongs'],
    'GET /user/profile' => ['UserController', 'getProfile'],
    'GET /user/likes' => ['UserController', 'getLikes'],
    'POST /user/like' => ['UserController', 'toggleLike']
];
?>