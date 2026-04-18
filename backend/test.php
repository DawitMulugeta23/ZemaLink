<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

$response = [
    'success' => true,
    'message' => 'CORS is working correctly!',
    'method' => $_SERVER['REQUEST_METHOD'],
    'headers' => getallheaders(),
    'time' => date('Y-m-d H:i:s')
];

echo json_encode($response);
?>