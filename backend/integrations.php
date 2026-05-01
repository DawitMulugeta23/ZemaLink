<?php

function zemalink_env(string $key, ?string $default = null): ?string
{
    static $loaded = false;
    static $vars = [];
    if (!$loaded) {
        $loaded = true;
        $envPath = __DIR__ . '/.env';
        if (is_file($envPath)) {
            $lines = @file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                    continue;
                }
                [$k, $v] = explode('=', $line, 2);
                $k = trim($k);
                $v = trim($v);
                if ($k !== '') {
                    $vars[$k] = $v;
                }
            }
        }
    }
    $fromEnv = getenv($key);
    if ($fromEnv !== false && $fromEnv !== '') {
        return $fromEnv;
    }
    return $vars[$key] ?? $default;
}

function zemalink_cloudinary_upload(string $tmpFile, string $folder, string $resourceType = 'auto'): ?string
{
    $cloud = zemalink_env('CLOUDINARY_CLOUD_NAME');
    $apiKey = zemalink_env('CLOUDINARY_API_KEY');
    $apiSecret = zemalink_env('CLOUDINARY_API_SECRET');
    if (!$cloud || !$apiKey || !$apiSecret || !is_file($tmpFile)) {
        return null;
    }
    $timestamp = (string) time();
    $folder = trim($folder, '/');
    $sigBase = "folder={$folder}&timestamp={$timestamp}{$apiSecret}";
    $signature = sha1($sigBase);
    $url = "https://api.cloudinary.com/v1_1/{$cloud}/{$resourceType}/upload";

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_POSTFIELDS => [
            'file' => new CURLFile($tmpFile),
            'api_key' => $apiKey,
            'timestamp' => $timestamp,
            'signature' => $signature,
            'folder' => $folder,
        ],
    ]);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    if (!$resp || $err) {
        return null;
    }
    $json = json_decode($resp, true);
    if (!is_array($json) || empty($json['secure_url'])) {
        return null;
    }
    return (string) $json['secure_url'];
}

function zemalink_send_email(string $to, string $subject, string $html): bool
{
    $host = (string) zemalink_env('SMTP_HOST', '');
    $port = (int) zemalink_env('SMTP_PORT', '587');
    $user = (string) zemalink_env('SMTP_USER', '');
    $pass = (string) zemalink_env('SMTP_PASS', '');
    $from = (string) zemalink_env('EMAIL_FROM', $user ?: 'no-reply@zemalink.local');

    if ($host === '' || $port <= 0 || $user === '' || $pass === '') {
        error_log('SMTP not configured - email not sent');
        return false;
    }

    // Try PHPMailer if available, fallback to native SMTP
    if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        try {
            $mail = new PHPMailer\PHPMailer\PHPMailer(true);
            $mail->isSMTP();
            $mail->Host = $host;
            $mail->SMTPAuth = true;
            $mail->Username = $user;
            $mail->Password = $pass;
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = $port;
            $mail->setFrom($from, 'ZemaLink');
            $mail->addAddress($to);
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $html;
            return $mail->send();
        } catch (Exception $e) {
            error_log('PHPMailer error: ' . $e->getMessage());
            return false;
        }
    }

    // Fallback to native SMTP
    $socket = @stream_socket_client(
        "tcp://{$host}:{$port}",
        $errno,
        $errstr,
        20,
        STREAM_CLIENT_CONNECT
    );
    if (!$socket) {
        error_log("SMTP connect failed: {$errstr} ({$errno})");
        return false;
    }

    stream_set_timeout($socket, 20);

    try {
        // Read greeting
        $greeting = fgets($socket);
        if (strpos($greeting, '220') === false) {
            throw new RuntimeException('SMTP greeting failed');
        }
        
        // EHLO
        fwrite($socket, "EHLO zemalink.local\r\n");
        $response = '';
        while ($line = fgets($socket)) {
            $response .= $line;
            if (substr($line, 3, 1) === ' ') break;
        }
        
        // STARTTLS
        fwrite($socket, "STARTTLS\r\n");
        $response = fgets($socket);
        if (strpos($response, '220') === false) {
            throw new RuntimeException('SMTP STARTTLS failed');
        }
        
        // Enable crypto
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new RuntimeException('SMTP TLS negotiation failed');
        }
        
        // EHLO again
        fwrite($socket, "EHLO zemalink.local\r\n");
        while ($line = fgets($socket)) {
            if (substr($line, 3, 1) === ' ') break;
        }
        
        // AUTH LOGIN
        fwrite($socket, "AUTH LOGIN\r\n");
        $response = fgets($socket);
        if (strpos($response, '334') === false) {
            throw new RuntimeException('SMTP AUTH LOGIN failed');
        }
        
        fwrite($socket, base64_encode($user) . "\r\n");
        $response = fgets($socket);
        if (strpos($response, '334') === false) {
            throw new RuntimeException('SMTP username auth failed');
        }
        
        fwrite($socket, base64_encode($pass) . "\r\n");
        $response = fgets($socket);
        if (strpos($response, '235') === false) {
            throw new RuntimeException('SMTP password auth failed');
        }
        
        // MAIL FROM
        fwrite($socket, "MAIL FROM:<{$from}>\r\n");
        $response = fgets($socket);
        if (strpos($response, '250') === false) {
            throw new RuntimeException('SMTP MAIL FROM failed');
        }
        
        // RCPT TO
        fwrite($socket, "RCPT TO:<{$to}>\r\n");
        $response = fgets($socket);
        if (strpos($response, '250') === false && strpos($response, '251') === false) {
            throw new RuntimeException('SMTP RCPT TO failed');
        }
        
        // DATA
        fwrite($socket, "DATA\r\n");
        $response = fgets($socket);
        if (strpos($response, '354') === false) {
            throw new RuntimeException('SMTP DATA failed');
        }
        
        // Message headers
        $headers = [
            'Date: ' . date(DATE_RFC2822),
            'From: ZemaLink <' . $from . '>',
            'To: <' . $to . '>',
            'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        $message = implode("\r\n", $headers) . "\r\n\r\n" . $html . "\r\n.";
        fwrite($socket, $message);
        $response = fgets($socket);
        if (strpos($response, '250') === false) {
            throw new RuntimeException('SMTP message body failed');
        }
        
        fwrite($socket, "QUIT\r\n");
        fclose($socket);
        return true;
    } catch (Throwable $e) {
        error_log('SMTP send failed: ' . $e->getMessage());
        @fclose($socket);
        return false;
    }
}

function zemalink_send_verification_email(string $toEmail, string $name, string $code): bool
{
    $subject = 'Your ZemaLink verification code';
    $html = '<!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee;">
        <div style="background: linear-gradient(135deg, #ff6b6b, #feca57); padding: 30px; text-align: center; border-radius: 20px 20px 0 0;">
            <h1 style="margin: 0; color: white;">🎵 ZemaLink</h1>
        </div>
        <div style="background: #16213e; padding: 30px; border-radius: 0 0 20px 20px;">
            <h2 style="color: #feca57;">Welcome to ZemaLink!</h2>
            <p>Hello ' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . ',</p>
            <p>Use this 6-digit verification code to activate your account:</p>
            <div style="background: #0f3460; padding: 15px; text-align: center; border-radius: 10px; margin: 20px 0;">
                <code style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #feca57;">' . htmlspecialchars($code, ENT_QUOTES, 'UTF-8') . '</code>
            </div>
            <p>This code expires in 15 minutes.</p>
            <p style="margin-top: 30px; color: #888; font-size: 12px;">If you didn\'t create an account, please ignore this email.</p>
        </div>
    </body>
    </html>';
    return zemalink_send_email($toEmail, $subject, $html);
}

function zemalink_send_payment_email(string $toEmail, string $name, string $label, float $amount): bool
{
    $subject = 'Payment confirmation - ZemaLink';
    $html = '<!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee;">
        <div style="background: linear-gradient(135deg, #00b894, #55efc4); padding: 30px; text-align: center; border-radius: 20px 20px 0 0;">
            <h1 style="margin: 0; color: white;">✅ Payment Confirmed</h1>
        </div>
        <div style="background: #16213e; padding: 30px; border-radius: 0 0 20px 20px;">
            <h2 style="color: #55efc4;">Thank you for your purchase!</h2>
            <p>Hello ' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . ',</p>
            <p>Your payment for <strong>' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</strong> was successful.</p>
            <div style="background: #0f3460; padding: 15px; text-align: center; border-radius: 10px; margin: 20px 0;">
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #55efc4;">$' . number_format($amount, 2) . '</p>
            </div>
            <p>You can now enjoy your content in your library.</p>
            <p style="margin-top: 30px; color: #888; font-size: 12px;">Thank you for supporting ZemaLink musicians!</p>
        </div>
    </body>
    </html>';
    return zemalink_send_email($toEmail, $subject, $html);
}

function zemalink_chapa_initialize(array $payload): array
{
    $secret = zemalink_env('CHAPA_SECRET_KEY');
    $base = rtrim((string) zemalink_env('CHAPA_BASE_URL', 'https://api.chapa.co/v1'), '/');
    if (!$secret) {
        return ['success' => false, 'message' => 'CHAPA_SECRET_KEY missing'];
    }
    
    // Ensure amount is a string with proper format
    if (isset($payload['amount'])) {
        $payload['amount'] = number_format((float) $payload['amount'], 2, '.', '');
    }
    
    $ch = curl_init($base . '/transaction/initialize');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $secret,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 30,
    ]);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if (!$resp || $err) {
        error_log('Chapa initialize error: ' . $err);
        return ['success' => false, 'message' => 'Unable to connect to Chapa'];
    }
    
    $json = json_decode($resp, true);
    if (!is_array($json)) {
        error_log('Chapa invalid response: ' . $resp);
        return ['success' => false, 'message' => 'Invalid Chapa response'];
    }
    
    if ($httpCode === 200 && isset($json['status']) && $json['status'] === 'success') {
        return ['success' => true, 'data' => $json];
    }
    
    $errorMsg = $json['message'] ?? 'Chapa initialization failed';
    if (is_array($errorMsg)) {
        $errorMsg = $errorMsg['message'] ?? json_encode($errorMsg);
    }
    
    return ['success' => false, 'message' => $errorMsg];
}

function zemalink_chapa_verify(string $txRef): array
{
    $secret = zemalink_env('CHAPA_SECRET_KEY');
    $base = rtrim((string) zemalink_env('CHAPA_BASE_URL', 'https://api.chapa.co/v1'), '/');
    if (!$secret) {
        return ['success' => false, 'message' => 'CHAPA_SECRET_KEY missing'];
    }
    if ($txRef === '') {
        return ['success' => false, 'message' => 'tx_ref required'];
    }
    
    $ch = curl_init($base . '/transaction/verify/' . rawurlencode($txRef));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $secret,
            'Content-Type: application/json',
        ],
        CURLOPT_TIMEOUT => 30,
    ]);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if (!$resp || $err) {
        error_log('Chapa verify error: ' . $err);
        return ['success' => false, 'message' => 'Unable to verify Chapa transaction'];
    }
    
    $json = json_decode($resp, true);
    if (!is_array($json)) {
        return ['success' => false, 'message' => 'Invalid Chapa verify response'];
    }
    
    return ['success' => true, 'data' => $json];
}