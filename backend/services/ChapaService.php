<?php

class ChapaService
{
    private ?string $secretKey;
    private ?string $publicKey;
    private string $baseUrl;
    private bool $useMock = false;

    public function __construct()
    {
        $this->secretKey = $_ENV['CHAPA_SECRET_KEY'] ?? getenv('CHAPA_SECRET_KEY') ?: null;
        $this->publicKey = $_ENV['CHAPA_PUBLIC_KEY'] ?? getenv('CHAPA_PUBLIC_KEY') ?: null;
        $this->baseUrl = rtrim($_ENV['CHAPA_BASE_URL'] ?? getenv('CHAPA_BASE_URL') ?: 'https://api.chapa.co/v1', '/');

        if ($this->secretKey === null || $this->secretKey === '' || $this->secretKey === 'YOUR_CHAPA_SECRET_KEY_HERE') {
            $this->useMock = true;
        }
    }

    public function initializePayment(
        float $amount,
        string $currency,
        string $email,
        string $txRef,
        string $callbackUrl,
        array $options = []
    ): array {
        if ($this->useMock) {
            return $this->mockInitialize($amount, $currency, $email, $txRef);
        }

        $payload = [
            'amount' => number_format(max(0.01, $amount), 2, '.', ''),
            'currency' => strtoupper($currency),
            'email' => $email,
            'tx_ref' => $txRef,
            'callback_url' => $callbackUrl,
            'return_url' => $options['return_url'] ?? $callbackUrl,
            'customization' => [
                'title' => $options['title'] ?? 'ZemaLink Purchase',
                'description' => $options['description'] ?? 'Payment for ZemaLink content',
            ],
            'meta' => $options['meta'] ?? [],
        ];

        if (!empty($options['first_name'])) {
            $payload['first_name'] = $options['first_name'];
        }
        if (!empty($options['last_name'])) {
            $payload['last_name'] = $options['last_name'];
        }

        $ch = curl_init($this->baseUrl . '/transaction/initialize');
        if ($ch === false) {
            return ['success' => false, 'message' => 'Failed to initialize cURL'];
        }

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->secretKey,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false || $error !== '') {
            error_log("ChapaService initialize error: {$error}");
            return ['success' => false, 'message' => 'Connection to payment gateway failed'];
        }

        $result = json_decode($response, true);

        if (!is_array($result)) {
            return ['success' => false, 'message' => 'Invalid response from payment gateway'];
        }

        if ($httpCode === 200 && isset($result['status']) && $result['status'] === 'success') {
            return [
                'success' => true,
                'data' => $result,
                'checkout_url' => $result['data']['checkout_url'] ?? null,
                'tx_ref' => $txRef,
            ];
        }

        $errorMsg = $result['message'] ?? 'Payment initialization failed';
        if (is_array($errorMsg)) {
            $errorMsg = json_encode($errorMsg);
        }

        return ['success' => false, 'message' => (string) $errorMsg];
    }

    public function verifyPayment(string $txRef): array
    {
        if ($this->useMock) {
            return $this->mockVerify($txRef);
        }

        $ch = curl_init($this->baseUrl . '/transaction/verify/' . rawurlencode($txRef));
        if ($ch === false) {
            return ['success' => false, 'message' => 'Failed to initialize cURL'];
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->secretKey,
                'Content-Type: application/json',
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false || $error !== '') {
            error_log("ChapaService verify error: {$error}");
            return ['success' => false, 'message' => 'Unable to verify payment'];
        }

        $result = json_decode($response, true);

        if (!is_array($result)) {
            return ['success' => false, 'message' => 'Invalid verification response'];
        }

        if ($httpCode === 200 && isset($result['status']) && $result['status'] === 'success') {
            return [
                'success' => true,
                'data' => $result,
                'status' => $result['data']['status'] ?? 'unknown',
            ];
        }

        return [
            'success' => false,
            'message' => $result['message'] ?? 'Payment verification failed',
        ];
    }

    public function generateTransactionRef(string $prefix = 'ZEMA'): string
    {
        return $prefix . '_' . bin2hex(random_bytes(8)) . '_' . time();
    }

    public function isMockMode(): bool
    {
        return $this->useMock;
    }

    private function mockInitialize(float $amount, string $currency, string $email, string $txRef): array
    {
        return [
            'success' => true,
            'data' => [
                'status' => 'success',
                'message' => 'Mock payment initialized',
                'data' => [
                    'checkout_url' => null,
                    'tx_ref' => $txRef,
                ],
            ],
            'checkout_url' => null,
            'tx_ref' => $txRef,
            'mock' => true,
        ];
    }

    private function mockVerify(string $txRef): array
    {
        if (strpos($txRef, 'fail_') === 0) {
            return [
                'success' => false,
                'message' => 'Mock payment verification failed',
            ];
        }

        return [
            'success' => true,
            'data' => [
                'status' => 'success',
                'message' => 'Mock payment verified successfully',
                'data' => [
                    'tx_ref' => $txRef,
                    'status' => 'success',
                    'amount' => 10.00,
                    'currency' => 'ETB',
                ],
            ],
            'status' => 'success',
            'mock' => true,
        ];
    }
}
