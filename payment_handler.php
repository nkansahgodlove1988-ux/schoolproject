<?php
require_once 'db_connect.php';
require_once 'notification_service.php';

class PaymentHandler {
    private $conn;
    private $notifier;

    public function __construct($db, $notifier) {
        $this->conn = $db;
        $this->notifier = $notifier;
    }

    // --- Core Logic --- //
    public function initiatePayment($studentId, $amount, $method, $email) {
        $reference = $this->generateReference();
        $status = "pending";

        $stmt = $this->conn->prepare("INSERT INTO payments (student_id, amount_paid, payment_method, transaction_reference, status, date) VALUES (?, ?, ?, ?, ?, NOW())");
        $stmt->bind_param("sdsss", $studentId, $amount, $method, $reference, $status);
        
        if ($stmt->execute()) {
            return [
                'success' => true,
                'reference' => $reference,
                'checkout_url' => $this->getMockCheckoutUrl($reference, $amount, $method)
            ];
        }
        return ['success' => false, 'error' => $stmt->error];
    }

    public function verifyPayment($reference, $status) {
        $stmt = $this->conn->prepare("SELECT * FROM payments WHERE transaction_reference = ?");
        $stmt->bind_param("s", $reference);
        $stmt->execute();
        $payment = $stmt->get_result()->fetch_assoc();

        if ($payment && $payment['status'] === 'pending') {
            $receiptNo = $this->generateReceiptNo();
            $newStatus = ($status === 'success') ? 'success' : 'failed';

            $stmtUpdate = $this->conn->prepare("UPDATE payments SET status = ?, receipt_no = ?, date = NOW() WHERE transaction_reference = ?");
            $stmtUpdate->bind_param("sss", $newStatus, $receiptNo, $reference);
            
            if ($stmtUpdate->execute() && $newStatus === 'success') {
                $this->onPaymentSuccess($payment['student_id'], $payment['amount_paid'], $receiptNo);
            }
            return true;
        }
        return false;
    }

    private function onPaymentSuccess($studentId, $amount, $receipt) {
        // Fetch student contact data
        $stmt = $this->conn->prepare("SELECT * FROM students WHERE student_id = ?");
        $stmt->bind_param("s", $studentId);
        $stmt->execute();
        $student = $stmt->get_result()->fetch_assoc();

        if ($student) {
            $msg = "Dear {$student['name']}, payment of GHS {$amount} received. Receipt No: {$receipt}. Elyon Montessori.";
            
            // Send Notifications
            if ($student['email']) $this->notifier->sendEmail($student['email'], "Fee Payment Confirmation - Elyon Montessori", "Your payment of GHS {$amount} was successful. Receipt No: {$receipt}. Thank you for choosing Elyon Montessori.");
            if ($student['phone']) $this->notifier->sendSMS($student['phone'], $msg);
            if ($student['parent_email']) $this->notifier->sendEmail($student['parent_email'], "Ward Fee Payment Received - Elyon Montessori", "We have received a fee payment of GHS {$amount} for {$student['name']}. Receipt No: {$receipt}.");
        }
    }

    // --- Dynamic ID Generators --- //
    private function generateReference() { return "EMS_" . strtoupper(bin2hex(random_bytes(6))); }
    private function generateReceiptNo() { return "RCP_" . date('Ymd') . "_" . rand(1000, 9999); }

    // --- API Mock Wrappers --- //
    private function getMockCheckoutUrl($ref, $amt, $method) {
        // Here you would integrate Paystack, Hubtel or PayPal API to get actual checkout URLs
        $urls = [
            'momo' => "https://api.hubtel.com/checkout/$ref",
            'card' => "https://checkout.paystack.com/$ref",
            'paypal' => "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&amount=$amt&item_name=School+Fees&invoice=$ref"
        ];
        return $urls[$method] ?? "#";
    }
}
?>
