<?php
require_once 'db_connect.php';

class NotificationService {
    private $conn;

    // TODO: Update these with real API credentials
    private $smsApiUrl = "https://api.hubtel.com/v1/messages/send"; 
    private $smsClientId = "YOUR_CLIENT_ID";
    private $smsClientSecret = "YOUR_CLIENT_SECRET";
    private $fromName = "ELYON SMS";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function sendEmail($to, $subject, $body) {
        // Elyon Montessori School Branding Template
        $header = "From: info@elyonmontessori.com\r\n";
        $header .= "MIME-Version: 1.0\r\n";
        $header .= "Content-Type: text/html; charset=UTF-8\r\n";

        $html = "
        <div style='font-family: Arial, sans-serif; border: 1px solid #eee; padding: 20px; max-width: 600px; margin: auto;'>
            <div style='text-align: center; border-bottom: 2px solid #003366; padding-bottom: 20px; margin-bottom: 20px;'>
                <h1 style='color: #003366; margin: 0;'>Elyon Montessori School</h1>
                <p style='color: #FFC107; font-weight: bold; margin: 5px 0 0;'>Nurturing Potential, Building Character</p>
            </div>
            <div style='color: #333; line-height: 1.6;'>
                $body
            </div>
            <div style='margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #888;'>
                &copy; " . date('Y') . " Elyon Montessori School | Brafoyaw, Cape Coast | 024-443-0918
            </div>
        </div>";

        if (mail($to, $subject, $html, $header)) {
            $this->logNotification(null, 'email', $subject, 'sent');
            return true;
        }
        $this->logNotification(null, 'email', $subject, 'failed');
        return false;
    }

    public function sendSMS($phone, $message) {
        // Hubtel/REST API Mock logic
        // In property system, use cURL to hit the SMS provider
        $this->logNotification(null, 'sms', $message, 'sent');
        return true; 
    }

    private function logNotification($studentId, $type, $message, $status) {
        $stmt = $this->conn->prepare("INSERT INTO notifications (student_id, type, message, status) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $studentId, $type, $message, $status);
        $stmt->execute();
    }
}
?>
