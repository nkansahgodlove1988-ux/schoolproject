<?php
// api.php
header('Content-Type: application/json');
require_once 'db_connect.php';

// Handle CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Simple Router
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
    default:
        echo json_encode(['error' => 'Invalid action']);
        break;
}

function handleLogin($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $user = $data['username'];
    $pass = $data['password'];

    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ? AND password = ?");
    $stmt->bind_param("ss", $user, $pass);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        unset($row['password']);
        echo json_encode(['success' => true, 'user' => $row]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
    }
}

function handleFetchAll($conn) {
    $table = $_GET['table'];
    // Dangerous: In production, whitelist tables
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
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (isset($data['id'])) unset($data['id']);
    
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
    $criteria = json_decode(file_get_contents('php://input'), true);
    
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
    $data = json_decode(file_get_contents('php://input'), true);
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
