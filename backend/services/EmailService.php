<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

class EmailService
{
    private ?string $smtpHost;
    private int $smtpPort;
    private ?string $smtpUser;
    private ?string $smtpPass;
    private ?string $fromEmail;
    private string $fromName;
    private bool $configured = false;

    public function __construct()
    {
        $this->smtpHost = $_ENV['SMTP_HOST'] ?? getenv('SMTP_HOST') ?: null;
        $this->smtpPort = (int) ($_ENV['SMTP_PORT'] ?? getenv('SMTP_PORT') ?: 587);
        $this->smtpUser = $_ENV['SMTP_USER'] ?? getenv('SMTP_USER') ?: null;
        $this->smtpPass = $_ENV['SMTP_PASS'] ?? getenv('SMTP_PASS') ?: null;
        $this->fromEmail = $_ENV['EMAIL_FROM'] ?? getenv('EMAIL_FROM') ?: $this->smtpUser;
        $this->fromName = 'ZemaLink';

        if (
            $this->smtpHost !== null && $this->smtpHost !== ''
            && $this->smtpUser !== null && $this->smtpUser !== ''
            && $this->smtpPass !== null && $this->smtpPass !== ''
            && $this->smtpUser !== 'YOUR_SMTP_USER_HERE'
        ) {
            $this->configured = true;
        }
    }

    public function sendVerificationCode(string $email, string $code, string $name): bool
    {
        $subject = 'Verify Your ZemaLink Account';

        $body = $this->buildTemplate(
            'Welcome to ZemaLink!',
            "Hello <strong>" . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . "</strong>,<br><br>
             Please use the verification code below to activate your account:",
            '<div style="background:rgba(255,255,255,0.1);padding:20px;margin:20px 0;border-radius:15px;text-align:center;">
                <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#feca57;font-family:monospace;">'
                . htmlspecialchars($code, ENT_QUOTES, 'UTF-8') .
                '</div>
              </div>',
            'This code will expire in <strong>15 minutes</strong>.<br>
             If you didn\'t create an account, please ignore this email.'
        );

        return $this->send($email, $subject, $body);
    }

    public function sendPaymentConfirmation(string $email, array $details): bool
    {
        $label = htmlspecialchars($details['label'] ?? 'Purchase', ENT_QUOTES, 'UTF-8');
        $amount = number_format((float) ($details['amount'] ?? 0), 2);
        $name = htmlspecialchars($details['name'] ?? 'Valued User', ENT_QUOTES, 'UTF-8');

        $subject = 'Payment Confirmed - ZemaLink';

        $body = $this->buildTemplate(
            'Payment Confirmed',
            "Hello <strong>{$name}</strong>,<br><br>
             Your payment for <strong>{$label}</strong> was successful.",
            '<div style="background:rgba(255,255,255,0.1);padding:20px;margin:20px 0;border-radius:15px;text-align:center;">
                <div style="font-size:36px;font-weight:bold;color:#55efc4;">$' . $amount . '</div>
              </div>',
            'You can now enjoy your content in your library.<br>
             Thank you for supporting ZemaLink musicians!'
        );

        return $this->send($email, $subject, $body);
    }

    public function sendPasswordReset(string $email, string $resetLink, string $name): bool
    {
        $subject = 'Reset Your ZemaLink Password';

        $body = $this->buildTemplate(
            'Password Reset',
            "Hello <strong>" . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . "</strong>,<br><br>
             We received a request to reset your password.",
            '<div style="text-align:center;margin:20px 0;">
                <a href="' . htmlspecialchars($resetLink, ENT_QUOTES, 'UTF-8') . '"
                   style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#ff6b6b,#feca57);
                          color:#fff;text-decoration:none;border-radius:30px;font-size:16px;font-weight:bold;">
                    Reset Password
                </a>
              </div>',
            'This link will expire in <strong>1 hour</strong>.<br>
             If you didn\'t request this, please ignore this email.'
        );

        return $this->send($email, $subject, $body);
    }

    public function send(string $to, string $subject, string $htmlBody): bool
    {
        if (!$this->configured) {
            error_log("EmailService: SMTP not configured. Would send to {$to}: {$subject}");
            return false;
        }

        try {
            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->Host = $this->smtpHost;
            $mail->SMTPAuth = true;
            $mail->Username = $this->smtpUser;
            $mail->Password = $this->smtpPass;
            $mail->SMTPSecure = $this->smtpPort === 465 ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = $this->smtpPort;

            $mail->setFrom($this->fromEmail ?? $this->smtpUser, $this->fromName);
            $mail->addAddress($to);
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $htmlBody;
            $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $htmlBody));
            $mail->CharSet = 'UTF-8';

            return $mail->send();
        } catch (PHPMailerException $e) {
            error_log("EmailService: Failed to send to {$to}: " . $e->getMessage());
            return false;
        } catch (Throwable $e) {
            error_log("EmailService: Unexpected error sending to {$to}: " . $e->getMessage());
            return false;
        }
    }

    private function buildTemplate(string $title, string $greeting, string $content, string $footerNote): string
    {
        return '<!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8">
        <style>
            body{font-family:Arial,sans-serif;background:#1a1a2e;margin:0;padding:20px}
            .container{max-width:500px;margin:0 auto;background:linear-gradient(135deg,#16213e,#0f3460);border-radius:20px;overflow:hidden}
            .header{background:linear-gradient(135deg,#ff6b6b,#feca57);padding:30px;text-align:center}
            .header h1{margin:0;color:#fff;font-size:24px}
            .content{padding:30px;text-align:center;color:#ddd}
            .content h2{color:#feca57}
            .footer{background:#0f3460;padding:20px;text-align:center;font-size:12px;color:#888}
        </style>
        </head>
        <body>
        <div class="container">
            <div class="header"><h1>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</h1></div>
            <div class="content">
                <h2>' . htmlspecialchars(APP_NAME, ENT_QUOTES, 'UTF-8') . '</h2>
                <p>' . $greeting . '</p>
                ' . $content . '
                <p style="margin-top:30px;font-size:12px;color:#aaa">' . $footerNote . '</p>
            </div>
            <div class="footer">
                <p>&copy; ' . date('Y') . ' ' . htmlspecialchars(APP_NAME, ENT_QUOTES, 'UTF-8') . '. All rights reserved.</p>
            </div>
        </div>
        </body>
        </html>';
    }

    public function isConfigured(): bool
    {
        return $this->configured;
    }
}
