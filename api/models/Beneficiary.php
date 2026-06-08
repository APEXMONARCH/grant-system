<?php
// ─────────────────────────────────────────────────────────────
//  models/Beneficiary.php
// ─────────────────────────────────────────────────────────────

class Beneficiary {

    public static function all(int $page = 1, int $limit = 20): array {
        $offset = ($page - 1) * $limit;

        $cntStmt = db()->query('SELECT COUNT(*) FROM beneficiaries');
        $total   = (int) $cntStmt->fetchColumn();

        $stmt = db()->prepare('
            SELECT b.*,
                   CONCAT(u.first_name, " ", u.last_name) AS name,
                   u.email,
                   g.title AS grant_title,
                   b.payment_date AS date
            FROM beneficiaries b
            JOIN users  u ON u.id = b.user_id
            JOIN grants g ON g.id = b.grant_id
            ORDER BY b.created_at DESC
            LIMIT ? OFFSET ?
        ');
        $stmt->execute([$limit, $offset]);
        return ['items' => $stmt->fetchAll(), 'total' => $total];
    }

    public static function totalDisbursed(): float {
        return (float) db()->query("SELECT COALESCE(SUM(amount),0) FROM beneficiaries WHERE status IN ('paid','disbursed')")->fetchColumn();
    }

    public static function pendingCount(): int {
        return (int) db()->query("SELECT COUNT(*) FROM beneficiaries WHERE status = 'pending'")->fetchColumn();
    }

    public static function byCategory(): array {
        $stmt = db()->query('
            SELECT g.category AS label, SUM(b.amount) AS value
            FROM beneficiaries b
            JOIN grants g ON g.id = b.grant_id
            GROUP BY g.category
            ORDER BY value DESC
        ');
        return $stmt->fetchAll();
    }

    public static function approvalRateByCategory(): array {
        $stmt = db()->query('
            SELECT g.category AS label,
                   SUM(CASE WHEN a.status = "approved"  THEN 1 ELSE 0 END) AS approved,
                   SUM(CASE WHEN a.status = "rejected"  THEN 1 ELSE 0 END) AS rejected
            FROM applications a
            JOIN grants g ON g.id = a.grant_id
            GROUP BY g.category
        ');
        $rows     = $stmt->fetchAll();
        $labels   = array_column($rows, 'label');
        $approved = array_map('intval', array_column($rows, 'approved'));
        $rejected = array_map('intval', array_column($rows, 'rejected'));
        return ['labels' => $labels, 'approved' => $approved, 'rejected' => $rejected];
    }
}
