<?php

class UploadService
{
    private ?string $cloudinaryCloud;
    private ?string $cloudinaryKey;
    private ?string $cloudinarySecret;

    private array $allowedTypes = [
        'audio' => [
            'extensions' => ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'],
            'mime_types' => ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/ogg', 'audio/flac', 'audio/x-m4a', 'audio/aac', 'audio/x-aac'],
            'max_size' => 52428800,
        ],
        'video' => [
            'extensions' => ['mp4', 'webm', 'mov', 'avi', 'mkv'],
            'mime_types' => ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
            'max_size' => 209715200,
        ],
        'image' => [
            'extensions' => ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            'mime_types' => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            'max_size' => 10485760,
        ],
    ];

    public function __construct()
    {
        $this->cloudinaryCloud = $_ENV['CLOUDINARY_CLOUD_NAME'] ?? getenv('CLOUDINARY_CLOUD_NAME') ?: null;
        $this->cloudinaryKey = $_ENV['CLOUDINARY_API_KEY'] ?? getenv('CLOUDINARY_API_KEY') ?: null;
        $this->cloudinarySecret = $_ENV['CLOUDINARY_API_SECRET'] ?? getenv('CLOUDINARY_API_SECRET') ?: null;
    }

    public function upload(array $file, string $type = 'audio'): array
    {
        $validation = $this->validateFile($file, $type);
        if (!$validation['valid']) {
            return $validation;
        }

        $cloudinaryResult = $this->uploadToCloudinary($file, $type);
        if ($cloudinaryResult['success']) {
            return $cloudinaryResult;
        }

        return $this->uploadLocal($file, $type);
    }

    public function uploadToCloudinary(array $file, string $type): array
    {
        if (
            $this->cloudinaryCloud === null || $this->cloudinaryKey === null || $this->cloudinarySecret === null
            || $this->cloudinaryCloud === 'YOUR_CLOUDINARY_CLOUD_NAME_HERE'
        ) {
            return ['success' => false, 'message' => 'Cloudinary not configured'];
        }

        $resourceType = match ($type) {
            'video' => 'video',
            'image' => 'image',
            default => 'video',
        };

        $folder = 'zemalink/' . $type;

        $timestamp = (string) time();
        $sigBase = "folder={$folder}&timestamp={$timestamp}{$this->cloudinarySecret}";
        $signature = sha1($sigBase);
        $url = "https://api.cloudinary.com/v1_1/{$this->cloudinaryCloud}/{$resourceType}/upload";

        $ch = curl_init($url);
        if ($ch === false) {
            return ['success' => false, 'message' => 'Failed to initialize cURL'];
        }

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_POSTFIELDS => [
                'file' => new CURLFile($file['tmp_name']),
                'api_key' => $this->cloudinaryKey,
                'timestamp' => $timestamp,
                'signature' => $signature,
                'folder' => $folder,
            ],
        ]);

        $response = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false || $error !== '') {
            error_log("UploadService Cloudinary error: {$error}");
            return ['success' => false, 'message' => 'Cloudinary upload failed'];
        }

        $json = json_decode($response, true);

        if (!is_array($json) || empty($json['secure_url'])) {
            error_log("UploadService Cloudinary response invalid");
            return ['success' => false, 'message' => 'Invalid Cloudinary response'];
        }

        return [
            'success' => true,
            'url' => (string) $json['secure_url'],
            'public_id' => (string) ($json['public_id'] ?? ''),
            'format' => (string) ($json['format'] ?? ''),
            'size' => (int) ($json['bytes'] ?? 0),
            'width' => (int) ($json['width'] ?? 0),
            'height' => (int) ($json['height'] ?? 0),
            'duration' => (float) ($json['duration'] ?? 0),
            'cloudinary' => true,
        ];
    }

    public function uploadLocal(array $file, string $type): array
    {
        $config = $this->getTypeConfig($type);
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        $subdir = $type === 'image' ? 'covers' : $type;
        $uploadDir = UPLOAD_PATH . $subdir . '/';

        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0777, true);
        }

        $filename = uniqid($type[0] . '_', true) . '.' . $extension;
        $filePath = $uploadDir . $filename;
        $publicUrl = '/uploads/' . $subdir . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            return ['success' => false, 'message' => 'Failed to save uploaded file'];
        }

        return [
            'success' => true,
            'url' => $publicUrl,
            'path' => $filePath,
            'filename' => $filename,
            'size' => $file['size'],
            'type' => $type,
            'extension' => $extension,
            'cloudinary' => false,
        ];
    }

    public function validateFile(array $file, string $type): array
    {
        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            return ['valid' => false, 'message' => 'No valid file uploaded'];
        }

        $config = $this->getTypeConfig($type);

        if ($file['size'] > $config['max_size']) {
            $maxMB = $config['max_size'] / (1024 * 1024);
            return ['valid' => false, 'message' => "File exceeds maximum size of {$maxMB}MB"];
        }

        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $config['extensions'], true)) {
            return [
                'valid' => false,
                'message' => 'Invalid file type. Allowed: ' . implode(', ', $config['extensions']),
            ];
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $config['mime_types'], true)) {
            return ['valid' => false, 'message' => 'Invalid file format. Please upload a valid ' . $type . ' file'];
        }

        return ['valid' => true, 'message' => ''];
    }

    public function deleteFile(string $path): bool
    {
        if (filter_var($path, FILTER_VALIDATE_URL)) {
            if ($this->isCloudinaryUrl($path)) {
                return $this->deleteFromCloudinary($path);
            }
            return false;
        }

        $fullPath = UPLOAD_PATH . ltrim($path, '/');
        if (file_exists($fullPath)) {
            return unlink($fullPath);
        }

        return false;
    }

    private function deleteFromCloudinary(string $url): bool
    {
        preg_match('/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/', $url, $matches);
        if (empty($matches[1])) {
            return false;
        }

        $publicId = $matches[1];
        $timestamp = (string) time();
        $sigBase = "public_ids[]={$publicId}&timestamp={$timestamp}{$this->cloudinarySecret}";
        $signature = sha1($sigBase);

        $ch = curl_init("https://api.cloudinary.com/v1_1/{$this->cloudinaryCloud}/image/destroy");
        if ($ch === false) {
            return false;
        }

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_POSTFIELDS => json_encode([
                'public_id' => $publicId,
                'api_key' => $this->cloudinaryKey,
                'timestamp' => $timestamp,
                'signature' => $signature,
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        ]);

        $response = curl_exec($ch);
        curl_close($ch);

        $result = json_decode($response, true);
        return isset($result['result']) && $result['result'] === 'ok';
    }

    private function isCloudinaryUrl(string $url): bool
    {
        return str_contains($url, 'cloudinary.com');
    }

    public function getTypeConfig(string $type): array
    {
        return $this->allowedTypes[$type] ?? $this->allowedTypes['audio'];
    }

    public function getAllowedExtensions(string $type): array
    {
        return $this->getTypeConfig($type)['extensions'];
    }
}
