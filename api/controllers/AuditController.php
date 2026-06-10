<?php
// ─────────────────────────────────────────────────────────────
//  controllers/AuditController.php
//
//  GET /api/audit   [admin] — paginated audit log
//
//  Also exposes the global auditLog() helper used by other
//  controllers to record actions.
// ─────────────────────────────────────────────────────────────

// ── Global helper — call from any controller ────────────────
if (!function_exists('auditLog')) {
    function auditLog(int $userId, string $action, string $detail = '', string $level = 'info'): void {
        try {
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);
            db()->prepare("
                INSERT INTO audit_logs (user_id, action, detail, level, ip_address, user_agent, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            ")->execute([$userId, $action, $detail, $level, $ip, $ua]);
        } catch (Throwable $e) {
            error_log('Audit log failed: ' . $e->getMessage());
        }
    }
}

// ── HTTP handler (only runs when router hits /api/audit) ────
$auth = requireAdmin();

if ($method !== 'GET') jsonError('Method not allowed.', 405);

$page   = max(1, (int)($_GET['page']  ?? 1));
$limit  = min(100, max(1, (int)($_GET['limit'] ?? 50)));
$q      = $_GET['q']     ?? '';
$level  = $_GET['level'] ?? '';

$where  = ['1=1'];
$params = [];

if ($q) {
    $where[]  = '(al.action LIKE ? OR al.detail LIKE ? OR CONCAT(u.first_name," ",u.last_name) LIKE ?)';
    $params[] = "%{$q}%";
    $params[] = "%{$q}%";
    $params[] = "%{$q}%";
}
if ($level) {
    $where[]  = 'al.level = ?';
    $params[] = $level;
}

$whereStr = implode(' AND ', $where);
$pdo      = db();

$cntStmt = $pdo->prepare("
    SELECT COUNT(*) FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE {$whereStr}
");
$cntStmt->execute($params);
$total  = (int)$cntStmt->fetchColumn();
$offset = ($page - 1) * $limit;

$stmt = $pdo->prepare("
    SELECT al.id, al.action, al.detail, al.level, al.ip_address, al.created_at,
           CONCAT(u.first_name,' ',u.last_name) AS user_name, u.role
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE {$whereStr}
    ORDER BY al.created_at DESC
    LIMIT ? OFFSET ?
");
$stmt->execute(array_merge($params, [$limit, $offset]));
jsonList($stmt->fetchAll(), $total, $page, $limit);
