<?php
// db_connect.php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "elyon_school_db";

// Create connection
$conn = new mysqli($servername, $username, $password);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Create database if not exists
$conn->query("CREATE DATABASE IF NOT EXISTS $dbname");
$conn->select_db($dbname);

// Note: You should import database.sql into phpMyAdmin for the table structures.
?>
