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

function zemalink_smtp_read($socket): string
{
    $data = '';
    while (($line = fgets($socket, 515)) !== false) {
        $data .= $line;
        // SMTP multiline replies end when 4th char is a space.
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    return $data;
}

function zemalink_smtp_expect($socket, array $codes): bool
{
    $reply = zemalink_smtp_read($socket);
    if ($reply === '' || strlen($reply) < 3) {
        return false;
    }
    $code = (int) substr($reply, 0, 3);
    return in_array($code, $codes, true);
}

function zemalink_smtp_write($socket, string $command): bool
{
    return fwrite($socket, $command . "\r\n") !== false;
}

function zemalink_send_email(string $to, string $subject, string $html): bool
{
    $host = (string) zemalink_env('SMTP_HOST', '');
    $port = (int) zemalink_env('SMTP_PORT', '587');
    $user = (string) zemalink_env('SMTP_USER', '');
    $pass = (string) zemalink_env('SMTP_PASS', '');
    $from = (string) zemalink_env('EMAIL_FROM', $user ?: 'no-reply@zemalink.local');

    if ($host === '' || $port <= 0 || $user === '' || $pass === '') {
        error_log('SMTP not configured');
        return false;
    }

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
        if (!zemalink_smtp_expect($socket, [220])) {
            throw new RuntimeException('SMTP greeting failed');
        }
        if (!zemalink_smtp_write($socket, 'EHLO zemalink.local') || !zemalink_smtp_expect($socket, [250])) {
            throw new RuntimeException('SMTP EHLO failed');
        }
        if (!zemalink_smtp_write($socket, 'STARTTLS') || !zemalink_smtp_expect($socket, [220])) {
            throw new RuntimeException('SMTP STARTTLS failed');
        }
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new RuntimeException('SMTP TLS negotiation failed');
        }
        if (!zemalink_smtp_write($socket, 'EHLO zemalink.local') || !zemalink_smtp_expect($socket, [250])) {
            throw new RuntimeException('SMTP EHLO after TLS failed');
        }
        if (!zemalink_smtp_write($socket, 'AUTH LOGIN') || !zemalink_smtp_expect($socket, [334])) {
            throw new RuntimeException('SMTP AUTH LOGIN failed');
        }
        if (!zemalink_smtp_write($socket, base64_encode($user)) || !zemalink_smtp_expect($socket, [334])) {
            throw new RuntimeException('SMTP username auth failed');
        }
        if (!zemalink_smtp_write($socket, base64_encode($pass)) || !zemalink_smtp_expect($socket, [235])) {
            throw new RuntimeException('SMTP password auth failed');
        }
        if (!zemalink_smtp_write($socket, 'MAIL FROM:<' . $from . '>') || !zemalink_smtp_expect($socket, [250])) {
            throw new RuntimeException('SMTP MAIL FROM failed');
        }
        if (!zemalink_smtp_write($socket, 'RCPT TO:<' . $to . '>') || !zemalink_smtp_expect($socket, [250, 251])) {
            throw new RuntimeException('SMTP RCPT TO failed');
        }
        if (!zemalink_smtp_write($socket, 'DATA') || !zemalink_smtp_expect($socket, [354])) {
            throw new RuntimeException('SMTP DATA failed');
        }

        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $headers = [
            'Date: ' . date(DATE_RFC2822),
            'From: ZemaLink <' . $from . '>',
            'To: <' . $to . '>',
            'Subject: ' . $encodedSubject,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        $message = implode("\r\n", $headers) . "\r\n\r\n" . $html . "\r\n.";
        if (!zemalink_smtp_write($socket, $message) || !zemalink_smtp_expect($socket, [250])) {
            throw new RuntimeException('SMTP message body failed');
        }
        zemalink_smtp_write($socket, 'QUIT');
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
    $html = '<h2>Welcome to ZemaLink</h2>'
        . '<p>Hello ' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . ',</p>'
        . '<p>Use this 6-digit verification code to activate your account:</p>'
        . '<p style="font-size:24px;font-weight:700;letter-spacing:4px;">' . htmlspecialchars($code, ENT_QUOTES, 'UTF-8') . '</p>'
        . '<p>This code expires in 15 minutes.</p>';
    return zemalink_send_email($toEmail, $subject, $html);
}

function zemalink_send_payment_email(string $toEmail, string $name, string $label, float $amount): bool
{
    $subject = 'Payment confirmation - ZemaLink';
    $html = '<h2>Payment successful</h2>'
        . '<p>Hello ' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . ',</p>'
        . '<p>Your payment for <strong>' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8')
        . '</strong> was successful.</p>'
        . '<p>Amount: $' . number_format($amount, 2) . '</p>';
    return zemalink_send_email($toEmail, $subject, $html);
}

function zemalink_chapa_initialize(array $payload): array
{
    $secret = zemalink_env('CHAPA_SECRET_KEY');
    $base = rtrim((string) zemalink_env('CHAPA_BASE_URL', 'https://api.chapa.co/v1'), '/');
    if (!$secret) {
        return ['success' => false, 'message' => 'CHAPA_SECRET_KEY missing'];
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
    curl_close($ch);
    if (!$resp || $err) {
        return ['success' => false, 'message' => 'Unable to connect to Chapa'];
    }
    $json = json_decode($resp, true);
    if (!is_array($json)) {
        return ['success' => false, 'message' => 'Invalid Chapa response'];
    }
    $status = strtolower((string) ($json['status'] ?? ''));
    $checkoutUrl = $json['data']['checkout_url'] ?? null;
    if ($status !== 'success' || !$checkoutUrl) {
        $rawMsg = $json['message'] ?? 'Chapa initialization failed';
        if (is_array($rawMsg)) {
            $msg = (string) ($rawMsg['message'] ?? $rawMsg['error'] ?? json_encode($rawMsg));
        } else {
            $msg = (string) $rawMsg;
        }
        if ($msg === '') {
            $msg = 'Chapa initialization failed';
        }
        return ['success' => false, 'message' => $msg, 'data' => $json];
    }
    return ['success' => true, 'data' => $json];
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
    curl_close($ch);
    if (!$resp || $err) {
        return ['success' => false, 'message' => 'Unable to verify Chapa transaction'];
    }
    $json = json_decode($resp, true);
    if (!is_array($json)) {
        return ['success' => false, 'message' => 'Invalid Chapa verify response'];
    }
    return ['success' => true, 'data' => $json];
}
