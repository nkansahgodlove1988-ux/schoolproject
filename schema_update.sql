-- Schema Update for Fee Payment and Notification System

-- 1. Update Students Table
ALTER TABLE students ADD COLUMN email VARCHAR(100) AFTER name;
ALTER TABLE students ADD COLUMN phone VARCHAR(20) AFTER email;
ALTER TABLE students ADD COLUMN parent_email VARCHAR(100) AFTER guardian_name;
ALTER TABLE students ADD COLUMN parent_phone VARCHAR(20) AFTER parent_email;

-- 2. Update Payments Table for Online Transactions
ALTER TABLE payments ADD COLUMN payment_method VARCHAR(50);
ALTER TABLE payments ADD COLUMN transaction_reference VARCHAR(100) UNIQUE;
ALTER TABLE payments ADD COLUMN transaction_status ENUM('pending', 'success', 'failed') DEFAULT 'pending';
ALTER TABLE payments ADD COLUMN date_paid TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3. Update Announcements for Notifications
ALTER TABLE announcements ADD COLUMN target_audience VARCHAR(100) DEFAULT 'all';
ALTER TABLE announcements ADD COLUMN notification_type ENUM('email', 'sms', 'both', 'none') DEFAULT 'none';

-- 4. Create Notification Log System
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50),
    type ENUM('email', 'sms') NOT NULL,
    message TEXT NOT NULL,
    status ENUM('sent', 'failed') DEFAULT 'sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
