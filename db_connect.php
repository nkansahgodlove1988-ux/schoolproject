<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$servername = "sql113.infinityfree.com";
$username = "if0_41478939";
$password = "PASTE_CORRECT_PASSWORD_HERE";
$dbname = "if0_41478939_elyon_school_db";

$conn = new mysqli($servername, $username, $password, $dbname, 3306);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "CONNECTED SUCCESSFULLY";
?>