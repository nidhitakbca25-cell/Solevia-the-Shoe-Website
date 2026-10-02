<?php
require_once __DIR__ . "/config.php";
if (empty($_SESSION["user_id"])) {
    header("Location: index.html");
    exit;
}
$userId = (int)$_SESSION["user_id"];

$userStmt = $pdo->prepare("SELECT id,name,email,created_at FROM users WHERE id=?");
$userStmt->execute([$userId]);
$user = $userStmt->fetch();

$orderStmt = $pdo->prepare("SELECT id,total_amount,status,payment_method,created_at FROM orders WHERE user_id=? ORDER BY id DESC");
$orderStmt->execute([$userId]);
$orders = $orderStmt->fetchAll();

$msgStmt = $pdo->prepare("SELECT subject,message,created_at FROM contact_messages WHERE user_id=? ORDER BY id DESC");
$msgStmt->execute([$userId]);
$messages = $msgStmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Solevia Demo Dashboard</title>
<link rel="stylesheet" href="style.css">
<style>
body{padding:40px 5%;background:#fff8f6}.dash{max-width:1050px;margin:auto}.top{display:flex;justify-content:space-between;gap:20px;align-items:center;margin-bottom:25px}.top h1{font-family:"Playfair Display",serif;color:#ed1745}.card{background:#fff;border:1px solid #f1dfe2;border-radius:16px;padding:22px;margin-bottom:18px}.table{width:100%;border-collapse:collapse}.table th,.table td{padding:11px;border-bottom:1px solid #eee;text-align:left;font-size:13px}.pill{display:inline-block;padding:5px 9px;border-radius:20px;background:#ffe1e5;color:#d70d39;font-size:11px;font-weight:700}.back{color:#ed1745;font-weight:700}
@media(max-width:700px){.table{display:block;overflow:auto;white-space:nowrap}.top{align-items:flex-start;flex-direction:column}}
</style>
</head>
<body>
<div class="dash">
    <div class="top">
        <div>
            <span class="section-label">SOLEVIA</span>
            <h1>My Account / Demo Dashboard</h1>
            <p>Use this page during your teacher demonstration to show saved backend data.</p>
        </div>
        <a class="back" href="index.html">← Back to Store</a>
    </div>

    <div class="card">
        <h3>Logged-in User</h3>
        <p><strong>Name:</strong> <?= htmlspecialchars($user["name"]) ?></p>
        <p><strong>Email:</strong> <?= htmlspecialchars($user["email"]) ?></p>
        <p><strong>Account Created:</strong> <?= htmlspecialchars($user["created_at"]) ?></p>
    </div>

    <div class="card">
        <h3>Orders Saved in MySQL</h3>
        <?php if (!$orders): ?>
            <p class="empty-state">No orders yet. Place an order from the store.</p>
        <?php else: ?>
        <table class="table">
            <tr><th>Order ID</th><th>Total</th><th>Status</th><th>Payment</th><th>Date</th></tr>
            <?php foreach ($orders as $o): ?>
            <tr>
                <td>#<?= (int)$o["id"] ?></td>
                <td>$<?= number_format((float)$o["total_amount"],2) ?></td>
                <td><span class="pill"><?= htmlspecialchars($o["status"]) ?></span></td>
                <td><?= htmlspecialchars($o["payment_method"]) ?></td>
                <td><?= htmlspecialchars($o["created_at"]) ?></td>
            </tr>
            <?php endforeach; ?>
        </table>
        <?php endif; ?>
    </div>

    <div class="card">
        <h3>Contact Messages Saved in MySQL</h3>
        <?php if (!$messages): ?>
            <p class="empty-state">No messages yet. Submit the contact form from the store.</p>
        <?php else: ?>
        <table class="table">
            <tr><th>Subject</th><th>Message</th><th>Date</th></tr>
            <?php foreach ($messages as $m): ?>
            <tr>
                <td><?= htmlspecialchars($m["subject"]) ?></td>
                <td><?= nl2br(htmlspecialchars($m["message"])) ?></td>
                <td><?= htmlspecialchars($m["created_at"]) ?></td>
            </tr>
            <?php endforeach; ?>
        </table>
        <?php endif; ?>
    </div>
</div>
</body>
</html>
