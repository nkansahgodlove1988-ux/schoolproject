-- Elyon Montessori School Management System Database Schema
-- Compatible with MySQL (XAMPP / MariaDB)



-- 1. Roles
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (role_name) VALUES ('admin'), ('teacher'), ('student'), ('applicant'), ('finance');

-- 2. Users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(100),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default Admin
INSERT INTO users (username, password, role, name) VALUES ('admin', 'admin123', 'admin', 'System Admin');
INSERT INTO users (username, password, role, name) VALUES ('finance', 'password123', 'finance', 'School Accountant');

-- 3. Departments
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    head VARCHAR(255)
);

-- 4. Classes
CREATE TABLE classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    tuition_fee DECIMAL(10, 2) DEFAULT 0.00,
    teacher_id INT -- Link to teachers.id later
);

-- 5. Academic Terms
CREATE TABLE terms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    year VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE
);

-- 6. Students
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    student_id VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    class_id INT,
    class_name VARCHAR(100),
    gender VARCHAR(10),
    dob DATE,
    guardian_name VARCHAR(255),
    guardian_phone VARCHAR(20),
    arrears DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('active', 'inactive', 'graduated') DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- 7. Teachers
CREATE TABLE teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    teacher_id VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    department_id INT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- 8. Subjects
CREATE TABLE subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    class_id INT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- 9. Admissions / Applicants
CREATE TABLE admissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    child_name VARCHAR(255),
    child_age INT,
    target_class VARCHAR(100),
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    date_applied TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Attendance
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50),
    student_name VARCHAR(255),
    class_name VARCHAR(100),
    date DATE,
    status ENUM('Present', 'Absent', 'Late') NOT NULL,
    remark TEXT,
    teacher_id INT,
    term VARCHAR(100)
);

-- 11. Results
CREATE TABLE results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50),
    student_name VARCHAR(255),
    subject VARCHAR(100),
    term VARCHAR(100),
    class_score INT,
    exam_score INT,
    total INT,
    remark TEXT,
    status ENUM('submitted', 'published', 'rejected') DEFAULT 'submitted',
    teacher_id INT,
    rejection_reason TEXT
);

-- 12. Payments
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50),
    amount_paid DECIMAL(10, 2),
    date DATETIME,
    receipt_no VARCHAR(100),
    status VARCHAR(50),
    recorded_by VARCHAR(100)
);

-- 13. Expenses
CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(100),
    description TEXT,
    amount DECIMAL(10, 2),
    date DATE,
    payment_method VARCHAR(50),
    reference VARCHAR(100)
);

-- 14. Library Books
CREATE TABLE library_books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    isbn VARCHAR(50),
    category VARCHAR(100),
    total_copies INT DEFAULT 1,
    available_copies INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'available'
);

-- 15. Library Issues
CREATE TABLE library_issues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT,
    book_title VARCHAR(255),
    borrower VARCHAR(255),
    borrower_type VARCHAR(50),
    issue_date DATE,
    due_date DATE,
    status ENUM('issued', 'returned') DEFAULT 'issued',
    return_date DATE,
    FOREIGN KEY (book_id) REFERENCES library_books(id)
);

-- 16. Timetables
CREATE TABLE timetables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    target VARCHAR(50),
    file_name VARCHAR(255),
    content LONGTEXT, -- Base64 for local version or file path
    date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 17. Learning Materials
CREATE TABLE learning_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    class_name VARCHAR(100),
    teacher_id INT,
    teacher_name VARCHAR(255),
    file_name VARCHAR(255),
    content LONGTEXT, -- Base64 or path
    date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 18. Announcements
CREATE TABLE announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    target VARCHAR(50),
    body TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. Messages
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT,
    sender_name VARCHAR(255),
    sender_role VARCHAR(50),
    receiver_role VARCHAR(50),
    class_name VARCHAR(100),
    subject VARCHAR(255),
    body TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 20. Audit Logs
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actor VARCHAR(255),
    action VARCHAR(255),
    details TEXT
);
