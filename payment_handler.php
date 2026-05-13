<?php
/**
 * PaymentHandler
 * 
 * Handles all payment logic including initiation, verification, 
 * database updates (debt reduction), and notifications.
 * Implements security best practices, atomic transactions, and input validation.
 */

require_once 'db_connect.php';
require_once 'notification_service.php';

class PaymentHandler {
    private mysqli $conn;
    private $notifier; // Assumes a NotificationService object

    // Allowed payment methods to prevent injection or invalid requests
    private const ALLOWED_METHODS = ['momo', 'card', 'paypal'];
    
    // Status constants to avoid magic strings and typos
    private const STATUS_PENDING = 'pending';
    private const STATUS_SUCCESS = 'success';
    private const STATUS_FAILED = 'failed';

    public function __construct(mysqli $db, $notifier) {
        $this->conn = $db;
        $this->notifier = $notifier;
    }

    /**
     * Initiates a payment process.
     * Validates input, generates a secure reference, and records the pending transaction.
     * 
     * @param string $studentId
     * @param float $amount
     * @param string $method
     * @param string $email
     * @return array Result containing success status, reference, or safe error message.
     */
    public function initiatePayment(string $studentId, float $amount, string $method, string $email = ''): array {
        try {
            // 1. Strict Input Validation
            $studentId = trim($studentId);
            if (empty($studentId)) {
                throw new InvalidArgumentException("Student ID cannot be empty.");
            }

            if ($amount <= 0) {
                throw new InvalidArgumentException("Payment amount must be greater than zero.");
            }

            $method = strtolower(trim($method));
            if (!in_array($method, self::ALLOWED_METHODS, true)) {
                throw new InvalidArgumentException("Invalid payment method selected.");
            }

            // 2. Generate cryptographically secure transaction reference
            $reference = $this->generateSecureReference();

            // 3. Record pending transaction using Prepared Statements (SQL Injection prevention)
            $query = "INSERT INTO payments (student_id, amount_paid, payment_method, transaction_reference, status, date) 
                      VALUES (?, ?, ?, ?, ?, NOW())";
            
            $stmt = $this->conn->prepare($query);
            if (!$stmt) {
                throw new RuntimeException("Database error preparing statement.");
            }

            $status = self::STATUS_PENDING;
            // "sdsss" = string, double, string, string, string
            $stmt->bind_param("sdsss", $studentId, $amount, $method, $reference, $status);
            
            if (!$stmt->execute()) {
                throw new RuntimeException("Failed to insert payment record.");
            }
            $stmt->close();

            // 4. Return success with mock checkout URL
            return [
                'success' => true,
                'reference' => $reference,
                'checkout_url' => $this->getMockCheckoutUrl($reference, $amount, $method)
            ];

        } catch (Exception $e) {
            // Log the actual error internally to avoid exposing sensitive DB info to the client
            error_log("Payment Initiation Error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => "An error occurred while processing the payment. Please verify the details and try again."
            ];
        }
    }

    /**
     * Verifies a payment callback, updates the transaction, and safely reduces student debt.
     * Utilizes atomic DB transactions to ensure data integrity.
     * 
     * @param string $reference
     * @param string $status
     * @return bool True if successfully processed, false otherwise.
     */
    public function verifyPayment(string $reference, string $status): bool {
        try {
            $reference = trim($reference);
            $newStatus = (strtolower($status) === 'success') ? self::STATUS_SUCCESS : self::STATUS_FAILED;

            // Begin Atomic Transaction (ACID compliance ensures no partial updates occur)
            $this->conn->begin_transaction();

            // 1. Fetch pending payment (FOR UPDATE locks the row to prevent race conditions/double spending)
            $stmt = $this->conn->prepare("SELECT student_id, amount_paid, status FROM payments WHERE transaction_reference = ? FOR UPDATE");
            $stmt->bind_param("s", $reference);
            $stmt->execute();
            $result = $stmt->get_result();
            $payment = $result->fetch_assoc();
            $stmt->close();

            // Validate that payment exists and hasn't been processed already
            if (!$payment || $payment['status'] !== self::STATUS_PENDING) {
                $this->conn->rollback();
                return false;
            }

            $receiptNo = $this->generateSecureReceiptNo();

            // 2. Update payment status
            $stmtUpdate = $this->conn->prepare("UPDATE payments SET status = ?, receipt_no = ?, date = NOW() WHERE transaction_reference = ?");
            $stmtUpdate->bind_param("sss", $newStatus, $receiptNo, $reference);
            if (!$stmtUpdate->execute()) {
                throw new RuntimeException("Failed to update payment status.");
            }
            $stmtUpdate->close();

            // 3. Deduct from student's arrears if payment was successful
            // We use 'arrears - amount' directly. A negative value safely acts as a credit balance.
            if ($newStatus === self::STATUS_SUCCESS) {
                $stmtDebt = $this->conn->prepare("UPDATE students SET arrears = arrears - ? WHERE student_id = ?");
                $stmtDebt->bind_param("ds", $payment['amount_paid'], $payment['student_id']);
                if (!$stmtDebt->execute()) {
                    throw new RuntimeException("Failed to update student arrears.");
                }
                $stmtDebt->close();
            }

            // Commit transaction to finalize updates securely
            $this->conn->commit();

            // 4. Send asynchronous/non-blocking notifications (after commit to guarantee DB state)
            if ($newStatus === self::STATUS_SUCCESS) {
                $this->onPaymentSuccess($payment['student_id'], $payment['amount_paid'], $receiptNo);
            }

            return true;

        } catch (Exception $e) {
            // Rollback any database changes if an error occurred during the transaction
            $this->conn->rollback();
            error_log("Payment Verification Error [Ref: $reference]: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Handles notifications to student/parent upon successful payment.
     * Includes error wrapping so failure to send an email doesn't rollback the payment.
     */
    private function onPaymentSuccess(string $studentId, float $amount, string $receipt): void {
        try {
            $stmt = $this->conn->prepare("SELECT name, email, phone, parent_email FROM students WHERE student_id = ?");
            $stmt->bind_param("s", $studentId);
            $stmt->execute();
            $student = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if ($student) {
                $formattedAmount = number_format($amount, 2);
                $smsMsg = "Dear {$student['name']}, your payment of GHS {$formattedAmount} has been received. RCP: {$receipt}.";
                
                $emailSubject = "Fee Payment Confirmation - Elyon Montessori";
                $emailBody = "Success: GHS {$formattedAmount} received. Receipt Number: {$receipt}. Thank you.";

                if (!empty($student['email'])) {
                    $this->notifier->sendEmail($student['email'], $emailSubject, $emailBody);
                }
                if (!empty($student['phone'])) {
                    $this->notifier->sendSMS($student['phone'], $smsMsg);
                }
                if (!empty($student['parent_email'])) {
                    $this->notifier->sendEmail($student['parent_email'], "Ward Fee Received", "Received GHS {$formattedAmount} for your ward, {$student['name']}. Receipt: {$receipt}.");
                }
            }
        } catch (Exception $e) {
            // Catch notification errors separately so they don't impact the main transaction flow
            error_log("Notification Error for Payment RCP {$receipt}: " . $e->getMessage());
        }
    }

    /**
     * Generates a cryptographically secure random reference ID.
     */
    private function generateSecureReference(): string {
        try {
            // random_bytes is cryptographically secure and resistant to prediction
            return "EMS_" . strtoupper(bin2hex(random_bytes(8)));
        } catch (Exception $e) {
            // Fallback (rare but possible on older/unsupported systems)
            return "EMS_" . strtoupper(uniqid(mt_rand(), true));
        }
    }

    /**
     * Generates a cryptographically secure, readable receipt number.
     */
    private function generateSecureReceiptNo(): string {
        try {
            // random_int provides an unbiased, cryptographically secure random integer
            $randomPart = random_int(10000, 99999);
            return "RCP_" . date('Ymd') . "_" . $randomPart;
        } catch (Exception $e) {
            return "RCP_" . date('Ymd') . "_" . mt_rand(10000, 99999);
        }
    }

    /**
     * Retrieves the mock checkout URL depending on the payment gateway.
     * Sanitizes inputs to prevent XSS or Malformed URL Injection.
     */
    private function getMockCheckoutUrl(string $ref, float $amt, string $method): string {
        $urls = [
            'momo'   => "https://api.hubtel.com/checkout/" . urlencode($ref),
            'card'   => "https://checkout.paystack.com/" . urlencode($ref),
            'paypal' => "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&amount=" . urlencode((string)$amt) . "&item_name=School+Fees&invoice=" . urlencode($ref)
        ];
        
        return $urls[$method] ?? "#";
    }
}
?>
