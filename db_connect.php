<?php
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors in JSON responses

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "elyon_school_db";

$conn = new mysqli($servername, $username, $password, $dbname, 3307);

if ($conn->connect_error) {
    header('Content-Type: application/json');
    die(json_encode(['error' => 'Connection failed: ' . $conn->connect_error]));
}
?>