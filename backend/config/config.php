<?php

define('APP_NAME', 'ZemaLink');
define('APP_VERSION', '1.0.0');
define('UPLOAD_PATH', __DIR__ . '/../uploads/');
define('MAX_FILE_SIZE', 52428800);
define('ITEMS_PER_PAGE', 20);
define('SESSION_LIFETIME', 86400);
define('SESSION_NAME', 'zemalink_session');

define('GENRES', [
    'Pop', 'Rock', 'Hip Hop', 'R&B', 'Jazz', 'Blues', 'Country', 'Electronic',
    'Classical', 'Reggae', 'Metal', 'Folk', 'Indie', 'Soul', 'Funk', 'Disco',
    'Punk', 'Alternative', 'Dance', 'Ambient', 'Lofi', 'Instrumental', 'Ballad',
    'Latin', 'Afrobeat', 'Gospel', 'K-Pop', 'World', 'Trap', 'Drill'
]);

define('ALLOWED_AUDIO_EXTENSIONS', ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac']);
define('ALLOWED_VIDEO_EXTENSIONS', ['mp4', 'webm', 'mov', 'avi', 'mkv']);
define('ALLOWED_IMAGE_EXTENSIONS', ['jpg', 'jpeg', 'png', 'webp', 'gif']);

define('MAX_AUDIO_SIZE', 52428800);
define('MAX_VIDEO_SIZE', 209715200);
define('MAX_IMAGE_SIZE', 10485760);
