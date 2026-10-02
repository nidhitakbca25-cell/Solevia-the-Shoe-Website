<?php
// Solevia XAMPP configuration
// Change these only if your XAMPP MySQL username/password is different.

session_start();

$DB_HOST = "127.0.0.1";
$DB_NAME = "solevia_db";
$DB_USER = "root";
$DB_PASS = ""; // Default XAMPP MySQL password is empty

try {
    $pdo = new PDO(
        "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed. Start MySQL in XAMPP and import database.sql."
    ]);
    exit;
}

function json_input(): array {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond(array $data, int $status = 200): void {
    header("Content-Type: application/json; charset=UTF-8");
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function require_login(): int {
    if (empty($_SESSION["user_id"])) {
        respond(["success" => false, "message" => "Please login first."], 401);
    }
    return (int)$_SESSION["user_id"];
}

function clean($value): string {
    return trim((string)$value);
}
?>
