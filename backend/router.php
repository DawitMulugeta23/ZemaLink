<?php
$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// Strip /api prefix so Vite-proxied static files resolve correctly
if (str_starts_with($path, '/api/')) {
    $path = substr($path, 4) ?: '/';
}

// Serve existing static files directly
$filePath = __DIR__ . $path;
if ($path !== '/' && is_file($filePath)) {
    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    $mimeTypes = [
        'css' => 'text/css',
        'js' => 'application/javascript',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'svg' => 'image/svg+xml',
        'mp3' => 'audio/mpeg',
        'wav' => 'audio/wav',
        'ogg' => 'audio/ogg',
        'flac' => 'audio/flac',
        'aac' => 'audio/aac',
        'm4a' => 'audio/mp4',
        'wma' => 'audio/x-ms-wma',
        'opus' => 'audio/opus',
        'mp4' => 'video/mp4',
        'webm' => 'video/webm',
        'mov' => 'video/quicktime',
        'avi' => 'video/x-msvideo',
        'mkv' => 'video/x-matroska',
        'm4v' => 'video/mp4',
        '3gp' => 'video/3gpp',
        'wmv' => 'video/x-ms-wmv',
        'flv' => 'video/x-flv',
        'mpeg' => 'video/mpeg',
        'mpg' => 'video/mpeg',
        'ico' => 'image/x-icon',
        'json' => 'application/json',
        'pdf' => 'application/pdf',
        'zip' => 'application/zip',
    ];
    if (isset($mimeTypes[$ext])) {
        header('Content-Type: ' . $mimeTypes[$ext]);
    }
    header('Accept-Ranges: bytes');
    header('Cache-Control: public, max-age=86400');
    $fileSize = filesize($filePath);
    $range = $_SERVER['HTTP_RANGE'] ?? '';
    if ($range !== '' && preg_match('/bytes=(\d+)-(\d*)/', $range, $matches)) {
        $start = (int) $matches[1];
        $end = $matches[2] !== '' ? (int) $matches[2] : $fileSize - 1;
        header('HTTP/1.1 206 Partial Content');
        header("Content-Range: bytes {$start}-{$end}/{$fileSize}");
        header('Content-Length: ' . ($end - $start + 1));
        $fh = fopen($filePath, 'rb');
        if ($fh) {
            fseek($fh, $start);
            echo fread($fh, $end - $start + 1);
            fclose($fh);
        }
    } else {
        header('Content-Length: ' . $fileSize);
        readfile($filePath);
    }
    return true;
}

// Route all other requests through index.php
require __DIR__ . '/index.php';