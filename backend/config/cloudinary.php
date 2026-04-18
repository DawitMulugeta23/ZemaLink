<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Cloudinary\Cloudinary;

$cloudinary = new Cloudinary([
    'cloud' => [
        'cloud_name' => 'YOUR_CLOUD_NAME', // Replace with your cloud name
        'api_key' => 'YOUR_API_KEY',       // Replace with your API key
        'api_secret' => 'YOUR_API_SECRET'  // Replace with your API secret
    ],
    'url' => [
        'secure' => true
    ]
]);

// Configuration array for direct access
$cloudinaryConfig = [
    'cloudName' => 'YOUR_CLOUD_NAME',
    'apiKey' => 'YOUR_API_KEY', 
    'apiSecret' => 'YOUR_API_SECRET',
    'uploadPreset' => 'music_upload' // Create this in Cloudinary dashboard
];

function uploadToCloudinary($file, $type = 'image') {
    global $cloudinary;
    
    try {
        if ($type === 'image') {
            $result = $cloudinary->uploadApi()->upload($file, [
                'folder' => 'zema_music/covers',
                'transformation' => [
                    'width' => 500,
                    'height' => 500,
                    'crop' => 'limit'
                ]
            ]);
        } else {
            $result = $cloudinary->uploadApi()->upload($file, [
                'folder' => 'zema_music/songs',
                'resource_type' => 'video', // Audio files use video resource type
                'format' => 'mp3'
            ]);
        }
        
        return [
            'success' => true,
            'url' => $result['secure_url'],
            'public_id' => $result['public_id']
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

function deleteFromCloudinary($publicId, $type = 'image') {
    global $cloudinary;
    
    try {
        $resourceType = ($type === 'audio') ? 'video' : 'image';
        $result = $cloudinary->uploadApi()->destroy($publicId, [
            'resource_type' => $resourceType
        ]);
        return $result['result'] === 'ok';
    } catch (Exception $e) {
        return false;
    }
}
?>