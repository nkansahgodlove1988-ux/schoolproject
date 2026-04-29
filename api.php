<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Content-Type: application/json");

// Handle preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

include 'db_connect.php';
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
require_once 'payment_handler.php';
require_once 'notification_service.php';
$notifier = new NotificationService($conn);
$payHandler = new PaymentHandler($conn, $notifier);
switch ($action) {
    case 'login': handleLogin($conn); break;
    case 'fetch_all': handleFetchAll($conn); break;
    case 'insert': handleInsert($conn); break;
    case 'update': handleUpdate($conn); break;
    case 'delete': handleDelete($conn); break;
    case 'query': handleQuery($conn); break;
    case 'log_action': handleLogAction($conn); break;
    case 'initiate_payment':
        $data = json_decode(file_get_contents('php://input'), true);
        echo json_encode($payHandler->initiatePayment($data['student_id'], $data['amount'], $data['method'], $data['email'] ?? ''));
        break;
    case 'verify_payment':
        echo json_encode(['success' => $payHandler->verifyPayment($_GET['reference'] ?? '', $_GET['status'] ?? 'success')]);
        break;
    case 'send_announcement':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $conn->prepare("INSERT INTO announcements (title, body, target_audience, notification_type) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $data['title'], $data['body'], $data['target'], $data['notification_type']);
        $stmt->execute();
        echo json_encode(['success' => true]);
        break;
    case 'notify_admission':
        $data = json_decode(file_get_contents('php://input'), true);
        $email = $data['email'] ?? '';
        $phone = $data['phone'] ?? '';
        $childName = $data['childName'] ?? '';
        $studentId = $data['studentId'] ?? '';
        
        $subject = "Admission Approved - Elyon Montessori School";
        $body = "Dear Parent/Guardian,<br><br>Congratulations! We are pleased to inform you that <b>$childName</b> has been successfully admitted to Elyon Montessori School.<br><br>Your child's official Student ID is: <b>$studentId</b><br><br>Please keep this ID safe as you will need it to pay fees and log into the Parent Portal.<br><br>Welcome to the Elyon Family!";
        
        $smsMsg = "Congratulations! $childName has been admitted to Elyon Montessori. Student ID: $studentId. Welcome to the Elyon Family!";
        
        if (!empty($email)) $notifier->sendEmail($email, $subject, $body);
        if (!empty($phone)) $notifier->sendSMS($phone, $smsMsg);
        
        echo json_encode(['success' => true]);
        break;
    default: echo json_encode(['error' => 'Invalid action']); break;
}
function handleLogin($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data)) { $data = $_POST; }
    
    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->bind_param("s", $data['username']);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($row = $res->fetch_assoc()) {
        if (password_verify($data['password'], $row['password']) || $data['password'] === $row['password']) { 
            unset($row['password']); echo json_encode(['success' => true, 'user' => $row]); 
        }
        else echo json_encode(['success' => false, 'message' => 'Invalid password']);
    } else echo json_encode(['success' => false, 'message' => 'User not found']);
}
function handleFetchAll($conn) {
    $table = preg_replace('/[^a-zA-Z0-9_]/', '', $_GET['table']); // sanitize table name
    $res = $conn->query("SELECT * FROM `$table`");
    if (!$res) { echo json_encode([]); return; }
    $data = [];
    while ($row = $res->fetch_assoc()) $data[] = $row;
    echo json_encode($data);
}
function handleInsert($conn) {
    $table = $_GET['table'];
    $data = json_decode(file_get_contents('php://input'), true);
    if ($table === 'users' && isset($data['password'])) $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
    $keys = array_keys($data); $values = array_values($data);
    $cols = implode(',', $keys); $phs = implode(',', array_fill(0, count($keys), '?'));
    $stmt = $conn->prepare("INSERT INTO $table ($cols) VALUES ($phs)");
    $types = '';
    foreach ($values as $v) { if (is_int($v)) $types .= 'i'; elseif (is_double($v)) $types .= 'd'; else $types .= 's'; }
    $stmt->bind_param($types, ...$values);
    if ($stmt->execute()) { $data['id'] = $conn->insert_id; echo json_encode(['success' => true, 'data' => $data]); }
    else echo json_encode(['success' => false, 'error' => $stmt->error]);
}
function handleUpdate($conn) {
    $table = $_GET['table']; $id = $_GET['id'];
    $data = json_decode(file_get_contents('php://input'), true);
    if (isset($data['id'])) unset($data['id']);
    if ($table === 'users' && isset($data['password'])) $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
    $sets = []; $values = [];
    foreach ($data as $k => $v) { $sets[] = "$k = ?"; $values[] = $v; }
    $values[] = $id;
    $stmt = $conn->prepare("UPDATE $table SET " . implode(',', $sets) . " WHERE id = ?");
    $types = '';
    foreach ($values as $v) { if (is_int($v)) $types .= 'i'; elseif (is_double($v)) $types .= 'd'; else $types .= 's'; }
    $stmt->bind_param($types, ...$values);
    if ($stmt->execute()) echo json_encode(['success' => true]);
    else echo json_encode(['success' => false, 'error' => $stmt->error]);
}
function handleDelete($conn) {
    $stmt = $conn->prepare("DELETE FROM " . $_GET['table'] . " WHERE id = ?");
    $stmt->bind_param("i", $_GET['id']);
    echo json_encode(['success' => $stmt->execute()]);
}
function handleQuery($conn) {
    $table = $_GET['table']; $criteria = json_decode(file_get_contents('php://input'), true);
    $where = []; $values = [];
    foreach ($criteria as $k => $v) { $where[] = "$k = ?"; $values[] = $v; }
    $sql = "SELECT * FROM $table";
    if (!empty($where)) $sql .= " WHERE " . implode(' AND ', $where);
    $stmt = $conn->prepare($sql);
    if (!empty($values)) { $types = str_repeat('s', count($values)); $stmt->bind_param($types, ...$values); }
    $stmt->execute();
    $res = $stmt->get_result();
    $data = [];
    while ($row = $res->fetch_assoc()) $data[] = $row;
    echo json_encode($data);
}
function handleLogAction($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $conn->prepare("INSERT INTO audit_logs (actor, action, details) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $data['actor'], $data['action'], $data['details']);
    $stmt->execute();
    echo json_encode(['success' => true]);
}
$conn->close();
?>
