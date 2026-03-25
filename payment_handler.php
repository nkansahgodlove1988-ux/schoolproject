<?php
require_once 'db_connect.php';
require_once 'notification_service.php';
class PaymentHandler {
    private $conn; private $notifier;
    public function __construct($db, $notifier) { $this->conn = $db; $this->notifier = $notifier; }
    public function initiatePayment($studentId, $amount, $method, $email) {
        $reference = $this->generateReference();
        $stmt = $this->conn->prepare("INSERT INTO payments (student_id, amount_paid, payment_method, transaction_reference, status, date) VALUES (?, ?, ?, ?, 'pending', NOW())");
        $stmt->bind_param("sdss", $studentId, $amount, $method, $reference);
        if ($stmt->execute()) return ['success' => true, 'reference' => $reference, 'checkout_url' => $this->getMockCheckoutUrl($reference, $amount, $method)];
        return ['success' => false, 'error' => $stmt->error];
    }
    public function verifyPayment($reference, $status) {
        $stmt = $this->conn->prepare("SELECT * FROM payments WHERE transaction_reference = ?");
        $stmt->bind_param("s", $reference); $stmt->execute();
        $p = $stmt->get_result()->fetch_assoc();
        if ($p && $p['status'] === 'pending') {
            $rn = $this->generateReceiptNo(); $ns = ($status === 'success') ? 'success' : 'failed';
            $stmtU = $this->conn->prepare("UPDATE payments SET status = ?, receipt_no = ?, date = NOW() WHERE transaction_reference = ?");
            $stmtU->bind_param("sss", $ns, $rn, $reference);
            if ($stmtU->execute() && $ns === 'success') $this->onPaymentSuccess($p['student_id'], $p['amount_paid'], $rn);
            return true;
        }
        return false;
    }
    private function onPaymentSuccess($studentId, $amount, $receipt) {
        $stmt = $this->conn->prepare("SELECT * FROM students WHERE student_id = ?");
        $stmt->bind_param("s", $studentId); $stmt->execute();
        $s = $stmt->get_result()->fetch_assoc();
        if ($s) {
            $msg = "Dear {$s['name']}, payment GHS {$amount} received. RCP: {$receipt}.";
            if ($s['email']) $this->notifier->sendEmail($s['email'], "Fee Confirmed", "Success: GHS {$amount}. RCP: {$receipt}.");
            if ($s['phone']) $this->notifier->sendSMS($s['phone'], $msg);
            if ($s['parent_email']) $this->notifier->sendEmail($s['parent_email'], "Ward Fee Received", "Received GHS {$amount} for {$s['name']}. RCP: {$receipt}.");
        }
    }
    private function generateReference() { return "EMS_" . strtoupper(bin2hex(random_bytes(6))); }
    private function generateReceiptNo() { return "RCP_" . date('Ymd') . "_" . rand(1000, 9999); }
    private function getMockCheckoutUrl($ref, $amt, $method) {
        $urls = ['momo' => "https://api.hubtel.com/checkout/$ref", 'card' => "https://checkout.paystack.com/$ref", 'paypal' => "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&amount=$amt&item_name=Fees&invoice=$ref"];
        return $urls[$method] ?? "#";
    }
}
?>
