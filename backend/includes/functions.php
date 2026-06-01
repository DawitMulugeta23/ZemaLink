<?php

function api_response(mixed $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

function api_error(string $message, int $status = 400): void
{
    api_response(['success' => false, 'message' => $message], $status);
}

function get_json_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function validate_email(string $email): bool
{
    $email = trim($email);
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false
        && preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $email) === 1;
}

function sanitize_output(string $str): string
{
    return htmlspecialchars($str, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8', false);
}

function generate_token(int $length = 32): string
{
    return bin2hex(random_bytes($length));
}

function generate_otp(int $length = 6): string
{
    $otp = '';
    for ($i = 0; $i < $length; $i++) {
        $otp .= (string) random_int(0, 9);
    }
    return $otp;
}

function format_play_count(int $count): string
{
    if ($count >= 1000000) {
        return round($count / 1000000, 1) . 'M';
    }
    if ($count >= 1000) {
        return round($count / 1000, 1) . 'K';
    }
    return (string) $count;
}

function time_ago(string $datetime): string
{
    $timestamp = strtotime($datetime);
    if ($timestamp === false) {
        return 'Unknown';
    }

    $diff = time() - $timestamp;

    if ($diff < 60) {
        return 'Just now';
    }
    if ($diff < 3600) {
        $mins = intdiv($diff, 60);
        return $mins . 'm ago';
    }
    if ($diff < 86400) {
        $hours = intdiv($diff, 3600);
        return $hours . 'h ago';
    }
    if ($diff < 604800) {
        $days = intdiv($diff, 86400);
        return $days . 'd ago';
    }
    if ($diff < 2592000) {
        $weeks = intdiv($diff, 604800);
        return $weeks . 'w ago';
    }
    if ($diff < 31536000) {
        $months = intdiv($diff, 2592000);
        return $months . 'mo ago';
    }

    return date('M j, Y', $timestamp);
}

function get_client_ip(): string
{
    $headers = [
        'HTTP_X_FORWARDED_FOR',
        'HTTP_X_REAL_IP',
        'HTTP_CLIENT_IP',
        'HTTP_X_FORWARDED',
        'HTTP_FORWARDED_FOR',
        'HTTP_FORWARDED',
        'REMOTE_ADDR',
    ];

    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ip = trim(explode(',', $_SERVER[$header])[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
    }

    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function paginate(int $page, int $perPage, int $total): array
{
    $page = max(1, $page);
    $perPage = max(1, min(100, $perPage));
    $totalPages = max(1, (int) ceil($total / $perPage));
    $page = min($page, $totalPages);

    return [
        'current_page' => $page,
        'per_page' => $perPage,
        'total' => $total,
        'total_pages' => $totalPages,
        'offset' => ($page - 1) * $perPage,
        'has_next' => $page < $totalPages,
        'has_previous' => $page > 1,
    ];
}

function slugify(string $text): string
{
    $text = preg_replace('/[^\p{L}\p{N}\s-]/u', '', mb_strtolower(trim($text), 'UTF-8'));
    $text = preg_replace('/[\s-]+/', '-', $text);
    return trim($text, '-');
}

function mask_email(string $email): string
{
    $parts = explode('@', $email);
    if (count($parts) !== 2) {
        return $email;
    }
    $name = $parts[0];
    $domain = $parts[1];
    $masked = substr($name, 0, 2) . str_repeat('*', max(0, strlen($name) - 2));
    return $masked . '@' . $domain;
}
