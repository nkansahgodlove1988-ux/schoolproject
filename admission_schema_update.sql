-- Update Admissions table to support the new application form fields

ALTER TABLE admissions
ADD COLUMN userId INT AFTER id,
ADD COLUMN childName VARCHAR(255) AFTER userId,
ADD COLUMN age INT AFTER childName,
ADD COLUMN dob DATE AFTER age,
ADD COLUMN gender VARCHAR(10) AFTER dob,
ADD COLUMN previousSchool VARCHAR(255) AFTER gender,
ADD COLUMN classApplying VARCHAR(100) AFTER previousSchool,
ADD COLUMN reportCard LONGTEXT AFTER classApplying,
ADD COLUMN pname VARCHAR(255) AFTER reportCard,
ADD COLUMN rchild VARCHAR(100) AFTER pname,
ADD COLUMN pnumber VARCHAR(20) AFTER rchild,
ADD COLUMN occupation VARCHAR(255) AFTER email,
ADD COLUMN residentialAddress VARCHAR(255) AFTER occupation,
ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP AFTER status;

-- Note: The `apply.html` form relies on these exact column names for MySQL insertion.
-- The reportCard column is LONGTEXT to support base64 encoded file uploads.
