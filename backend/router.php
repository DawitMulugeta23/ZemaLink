<?php
// router.php - For PHP built-in server
require_once __DIR__ . '/config/cors.php';
handleCORS();

// Preflight handled in handleCORS()

// Route all requests to index.php
return require_once __DIR__ . '/index.php';
?>