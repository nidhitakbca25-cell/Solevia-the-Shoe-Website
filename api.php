<?php
require_once __DIR__ . "/config.php";

$action = $_GET["action"] ?? "";
$data = json_input();

try {
    switch ($action) {
        case "session":
            if (!empty($_SESSION["user_id"])) {
                $stmt = $pdo->prepare("SELECT id, name, email, created_at FROM users WHERE id = ?");
                $stmt->execute([(int)$_SESSION["user_id"]]);
                $user = $stmt->fetch();
                if ($user) {
                    respond(["success" => true, "loggedIn" => true, "user" => $user]);
                }
                unset($_SESSION["user_id"]);
            }
            respond(["success" => true, "loggedIn" => false]);

        case "signup":
            $name = clean($data["name"] ?? "");
            $email = strtolower(clean($data["email"] ?? ""));
            $password = (string)($data["password"] ?? "");

            if (strlen($name) < 2) respond(["success"=>false,"message"=>"Please enter your full name."], 422);
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(["success"=>false,"message"=>"Please enter a valid email."], 422);
            if (strlen($password) < 6) respond(["success"=>false,"message"=>"Password must be at least 6 characters."], 422);

            $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $check->execute([$email]);
            if ($check->fetch()) respond(["success"=>false,"message"=>"An account with this email already exists."], 409);

            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)");
            $stmt->execute([$name, $email, $hash]);
            $userId = (int)$pdo->lastInsertId();
            $_SESSION["user_id"] = $userId;

            respond([
                "success"=>true,
                "message"=>"Account created successfully!",
                "user"=>["id"=>$userId,"name"=>$name,"email"=>$email]
            ]);

        case "login":
            $email = strtolower(clean($data["email"] ?? ""));
            $password = (string)($data["password"] ?? "");

            $stmt = $pdo->prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($password, $user["password_hash"])) {
                respond(["success"=>false,"message"=>"Invalid email or password."], 401);
            }

            session_regenerate_id(true);
            $_SESSION["user_id"] = (int)$user["id"];

            respond([
                "success"=>true,
                "message"=>"Login successful!",
                "user"=>["id"=>$user["id"],"name"=>$user["name"],"email"=>$user["email"]]
            ]);

        case "logout":
            $_SESSION = [];
            if (ini_get("session.use_cookies")) {
                $params = session_get_cookie_params();
                setcookie(session_name(), "", time()-42000, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
            }
            session_destroy();
            respond(["success"=>true,"message"=>"Logged out successfully."]);

        case "contact":
            $name = clean($data["name"] ?? "");
            $email = strtolower(clean($data["email"] ?? ""));
            $subject = clean($data["subject"] ?? "");
            $message = clean($data["message"] ?? "");

            if ($name === "" || !filter_var($email, FILTER_VALIDATE_EMAIL) || $subject === "" || $message === "") {
                respond(["success"=>false,"message"=>"Please fill all contact fields correctly."], 422);
            }

            $stmt = $pdo->prepare("INSERT INTO contact_messages (user_id, name, email, subject, message) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$_SESSION["user_id"] ?? null, $name, $email, $subject, $message]);
            respond(["success"=>true,"message"=>"Your message has been saved in the database."]);

        case "add_cart":
            $userId = require_login();
            $productId = (int)($data["product_id"] ?? 0);
            $stmt = $pdo->prepare("SELECT id FROM products WHERE id = ?");
            $stmt->execute([$productId]);
            if (!$stmt->fetch()) respond(["success"=>false,"message"=>"Product not found."], 404);

            $stmt = $pdo->prepare("INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, 1)
                ON DUPLICATE KEY UPDATE quantity = quantity + 1");
            $stmt->execute([$userId, $productId]);
            respond(["success"=>true,"message"=>"Product added to cart."]);

        case "get_cart":
            $userId = require_login();
            $stmt = $pdo->prepare("SELECT c.product_id, c.quantity, p.name, p.category, p.price, p.image_url AS image
                FROM cart_items c JOIN products p ON p.id = c.product_id
                WHERE c.user_id = ? ORDER BY c.created_at DESC");
            $stmt->execute([$userId]);
            respond(["success"=>true,"items"=>$stmt->fetchAll()]);

        case "update_cart":
            $userId = require_login();
            $productId = (int)($data["product_id"] ?? 0);
            $quantity = max(1, (int)($data["quantity"] ?? 1));
            $stmt = $pdo->prepare("UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?");
            $stmt->execute([$quantity, $userId, $productId]);
            respond(["success"=>true,"message"=>"Cart updated."]);

        case "remove_cart":
            $userId = require_login();
            $productId = (int)($data["product_id"] ?? 0);
            $stmt = $pdo->prepare("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?");
            $stmt->execute([$userId, $productId]);
            respond(["success"=>true,"message"=>"Item removed."]);

        case "place_order":
            $userId = require_login();
            $name = clean($data["name"] ?? "");
            $phone = clean($data["phone"] ?? "");
            $address = clean($data["address"] ?? "");
            $payment = clean($data["payment_method"] ?? "");

            if ($name === "" || $phone === "" || $address === "" || $payment === "") {
                respond(["success"=>false,"message"=>"Please complete all checkout fields."], 422);
            }

            $pdo->beginTransaction();

            $stmt = $pdo->prepare("SELECT c.product_id, c.quantity, p.name, p.price
                FROM cart_items c JOIN products p ON p.id = c.product_id
                WHERE c.user_id = ?");
            $stmt->execute([$userId]);
            $items = $stmt->fetchAll();

            if (!$items) {
                $pdo->rollBack();
                respond(["success"=>false,"message"=>"Your cart is empty."], 422);
            }

            $total = 0;
            foreach ($items as $item) {
                $total += (float)$item["price"] * (int)$item["quantity"];
            }

            $stmt = $pdo->prepare("INSERT INTO orders (user_id, customer_name, phone, address, payment_method, total_amount, status)
                VALUES (?, ?, ?, ?, ?, ?, 'Pending')");
            $stmt->execute([$userId, $name, $phone, $address, $payment, $total]);
            $orderId = (int)$pdo->lastInsertId();

            $itemStmt = $pdo->prepare("INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
                VALUES (?, ?, ?, ?, ?)");
            foreach ($items as $item) {
                $itemStmt->execute([$orderId, $item["product_id"], $item["name"], $item["quantity"], $item["price"]]);
            }

            $pdo->prepare("DELETE FROM cart_items WHERE user_id = ?")->execute([$userId]);
            $pdo->commit();

            respond(["success"=>true,"message"=>"Order placed successfully!","order_id"=>$orderId,"total"=>$total]);

        case "add_wishlist":
            $userId = require_login();
            $productId = (int)($data["product_id"] ?? 0);
            $stmt = $pdo->prepare("INSERT IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)");
            $stmt->execute([$userId, $productId]);
            respond(["success"=>true,"message"=>"Added to wishlist."]);

        case "remove_wishlist":
            $userId = require_login();
            $productId = (int)($data["product_id"] ?? 0);
            $stmt = $pdo->prepare("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?");
            $stmt->execute([$userId, $productId]);
            respond(["success"=>true,"message"=>"Removed from wishlist."]);

        default:
            respond(["success"=>false,"message"=>"Unknown API action."], 404);
    }
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    respond([
        "success"=>false,
        "message"=>"Server/database error. Check database.sql import and XAMPP settings."
    ], 500);
}
?>
