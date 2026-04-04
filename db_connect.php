<?php
$servername = "sql113.infinityfree.com";
$username = "if0_41478939";
$password = "QYLqhzZrd4"; 
$dbname = "if0_41478939_elyon_school_db";

$conn = new mysqli($servername, $username, $password, $dbname, 3306);

if ($conn->connect_error) {
    die("Database Connection Failed: " . $conn->connect_error);
}
?>