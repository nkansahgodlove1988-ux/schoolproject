<?php

header('Content-Type: application/json');
require_once 'db_connect.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

require_once 'payment_handler.php';
require_once 'notification_service.php';

$notifier = new NotificationService($conn);
$payHandler = new PaymentHandler($conn, $notifier);

switch ($action) {
    case 'login':
        handleLogin($conn);
        break;
    case 'fetch_all':
        handleFetchAll($conn);
        break;
    case 'insert':
        handleInsert($conn);
        break;
    case 'update':
        handleUpdate($conn);
        break;
    case 'delete':
        handleDelete($conn);
        break;
    case 'query':
        handleQuery($conn);
        break;
    case 'log_action':
        handleLogAction($conn);
        break;
    case 'initiate_payment':
        $data = json_decode(file_get_contents('php://input'), true);
        $res = $payHandler->initiatePayment($data['student_id'], $data['amount'], $data['method'], $data['email'] ?? '');
        echo json_encode($res);
        break;
    case 'verify_payment':
        $ref = $_GET['reference'] ?? '';
        $status = $_GET['status'] ?? 'success';
        $res = $payHandler->verifyPayment($ref, $status);
        echo json_encode(['success' => $res]);
        break;
    case 'send_announcement':
        $data = json_decode(file_get_contents('php://input'), true);
        $title = $data['title'];
        $body = $data['body'];
        $target = $data['target']; // e.g. "all", "parents", specific_class
        $notifType = $data['notification_type']; // "email", "sms", "both"

        // Insert into announcements table
        $stmt = $conn->prepare("INSERT INTO announcements (title, body, target_audience, notification_type) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $title, $body, $target, $notifType);
        $stmt->execute();

        // Broadcast notifications based on target
        // (Mock logic: fetch eligible contacts and send)
        echo json_encode(['success' => true]);
        break;
    default:
        echo json_encode(['error' => 'Invalid action']);
        break;
}

function handleLogin($conn) {
    if ($method !== 'POST') {
        // Handle read-only login requests if needed, but normally should be POST
    }
    $data = json_decode(file_get_contents('php://input'), true);
    $user = $data['username'];
    $pass = $data['password'];

    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->bind_param("s", $user);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        if (password_verify($pass, $row['password'])) {
            unset($row['password']);
            echo json_encode(['success' => true, 'user' => $row]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid password']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'User not found']);
    }
}

function handleFetchAll($conn) {
    $table = $_GET['table'];
    
    $result = $conn->query("SELECT * FROM $table");
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    echo json_encode($data);
}

function handleInsert($conn) {
    $table = $_GET['table'];
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Hash password if inserting into 'users' table
    if ($table === 'users' && isset($data['password'])) {
        $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
    }
    
    $keys = array_keys($data);
    $values = array_values($data);
    $cols = implode(',', $keys);
    $placeholders = implode(',', array_fill(0, count($keys), '?'));
    
    $stmt = $conn->prepare("INSERT INTO $table ($cols) VALUES ($placeholders)");
    
    $types = '';
    foreach ($values as $v) {
        if (is_int($v)) $types .= 'i';
        elseif (is_double($v)) $types .= 'd';
        else $types .= 's';
    }
    
    $stmt->bind_param($types, ...$values);
    if ($stmt->execute()) {
        $data['id'] = $conn->insert_id;
        echo json_encode(['success' => true, 'data' => $data]);
    } else {
        echo json_encode(['success' => false, 'error' => $stmt->error]);
    }
}

function handleUpdate($conn) {
    $table = $_GET['table'];
    $id = $_GET['id'];
    $data = json_decode(file_get_contents('php:
    
    if (isset($data['id'])) unset($data['id']);
    
    $sets = [];
    $values = [];
    // Hash password if updating 'users' table and password is set
    if ($table === 'users' && isset($data['password'])) {
        $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
    }
    
    $sets = [];
    $values = [];
    foreach ($data as $key => $val) {
        $sets[] = "$key = ?";
        $values[] = $val;
    }
    $values[] = $id;
    
    $stmt = $conn->prepare("UPDATE $table SET " . implode(',', $sets) . " WHERE id = ?");
    
    $types = '';
    foreach ($values as $v) {
        if (is_int($v)) $types .= 'i';
        elseif (is_double($v)) $types .= 'd';
        else $types .= 's';
    }
    
    $stmt->bind_param($types, ...$values);
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => $stmt->error]);
    }
}

function handleDelete($conn) {
    $table = $_GET['table'];
    $id = $_GET['id'];
    $stmt = $conn->prepare("DELETE FROM $table WHERE id = ?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false]);
    }
}

function handleQuery($conn) {
    $table = $_GET['table'];
    $criteria = json_decode(file_get_contents('php:
    
    $where = [];
    $values = [];
    foreach ($criteria as $key => $val) {
        $where[] = "$key = ?";
        $values[] = $val;
    }
    
    $sql = "SELECT * FROM $table";
    if (!empty($where)) {
        $sql .= " WHERE " . implode(' AND ', $where);
    }
    
    $stmt = $conn->prepare($sql);
    if (!empty($values)) {
        $types = str_repeat('s', count($values));
        $stmt->bind_param($types, ...$values);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    echo json_encode($data);
}

function handleLogAction($conn) {
    $data = json_decode(file_get_contents('php:
    $actor = $data['actor'];
    $action = $data['action'];
    $details = $data['details'];
    
    $stmt = $conn->prepare("INSERT INTO audit_logs (actor, action, details) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $actor, $action, $details);
    $stmt->execute();
    echo json_encode(['success' => true]);
}

$conn->close();
?>
