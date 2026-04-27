<?php
class ChapaService {
    private $secretKey;
    private $baseUrl;
    
    public function __construct() {
        $this->secretKey = getenv('CHAPA_SECRET_KEY') ?: zemalink_env('CHAPA_SECRET_KEY');
        $this->baseUrl = getenv('CHAPA_BASE_URL') ?: zemalink_env('CHAPA_BASE_URL', 'https://api.chapa.co/v1');
    }
    
    public function initializePayment($data) {
        $curl = curl_init();
        
        $payload = [
            'amount' => $data['amount'],
            'currency' => 'ETB',
            'email' => $data['email'],
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'tx_ref' => $data['tx_ref'],
            'callback_url' => $data['callback_url'],
            'return_url' => $data['return_url'],
            'customization' => [
                'title' => $data['title'] ?? 'ZemaLink Premium',
                'description' => $data['description'] ?? 'Purchase premium content'
            ]
        ];
        
        curl_setopt_array($curl, [
            CURLOPT_URL => $this->baseUrl . '/transaction/initialize',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 0,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->secretKey,
                'Content-Type: application/json'
            ],
        ]);
        
        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        
        if ($httpCode === 200) {
            $result = json_decode($response, true);
            return ['success' => true, 'data' => $result];
        }
        
        return ['success' => false, 'message' => 'Payment initialization failed', 'response' => $response];
    }
    
    public function verifyPayment($tx_ref) {
        $curl = curl_init();
        
        curl_setopt_array($curl, [
            CURLOPT_URL => $this->baseUrl . '/transaction/verify/' . $tx_ref,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 0,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'GET',
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->secretKey
            ],
        ]);
        
        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        
        if ($httpCode === 200) {
            $result = json_decode($response, true);
            if ($result['status'] === 'success') {
                return ['success' => true, 'data' => $result];
            }
        }
        
        return ['success' => false, 'message' => 'Payment verification failed'];
    }
}
?>