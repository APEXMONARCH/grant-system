<?php
// ─────────────────────────────────────────────────────────────
//  controllers/ReportController.php
// ─────────────────────────────────────────────────────────────
require_once __DIR__ . '/../models/Beneficiary.php';

requireAdmin();

$reportType = $id ?? 'summary';
$dateRange  = $_GET['dateRange'] ?? 'last30';
$grantType  = $_GET['grantType'] ?? 'all';
$status     = $_GET['status']    ?? 'all';

// Date cutoff helper
function dateCutoff(string $range): string {
    return match($range) {
        'last7'    => date('Y-m-d', strtotime('-7 days')),
        'last30'   => date('Y-m-d', strtotime('-30 days')),
        'last90'   => date('Y-m-d', strtotime('-90 days')),
        'last365'  => date('Y-m-d', strtotime('-365 days')),
        'thisYear' => date('Y-01-01'),
        default    => date('Y-m-d', strtotime('-30 days')),
    };
}
$cutoff = dateCutoff($dateRange);
$pdo    = db();

switch ($reportType) {

    case 'summary':
        $totalFunds   = (float)$pdo->prepare("SELECT COALESCE(SUM(total_budget),0) FROM grants WHERE status='active' AND created_at >= ?")->execute([$cutoff]) ? (function() use ($pdo,$cutoff){ $s=$pdo->prepare("SELECT COALESCE(SUM(total_budget),0) FROM grants WHERE status='active' AND created_at >= ?"); $s->execute([$cutoff]); return (float)$s->fetchColumn(); })() : 0;

        // Clean queries
        $s1 = $pdo->prepare("SELECT COALESCE(SUM(total_budget),0) FROM grants WHERE status='active' AND created_at >= ?"); $s1->execute([$cutoff]);
        $s2 = $pdo->prepare("SELECT COALESCE(SUM(amount),0) FROM beneficiaries WHERE created_at >= ?"); $s2->execute([$cutoff]);
        $s3 = $pdo->prepare("SELECT COUNT(DISTINCT user_id) FROM beneficiaries WHERE created_at >= ?"); $s3->execute([$cutoff]);
        $s4 = $pdo->prepare("SELECT COUNT(*) FROM applications WHERE submitted_at >= ?"); $s4->execute([$cutoff]);
        $s5 = $pdo->prepare("SELECT COUNT(*) FROM applications WHERE status='approved' AND submitted_at >= ?"); $s5->execute([$cutoff]);
        $totalApps = (int)$s4->fetchColumn();
        $approved  = (int)$s5->fetchColumn();

        jsonSuccess([
            'total_funds'          => (float)$s1->fetchColumn(),
            'total_disbursed'      => (float)$s2->fetchColumn(),
            'beneficiaries'        => (int)$s3->fetchColumn(),
            'total_applications'   => $totalApps,
            'approval_rate'        => $totalApps > 0 ? round($approved / $totalApps * 100, 1) : 0,
            'avg_grant_size'       => $approved > 0 ? round((float)$s2->fetchColumn() / $approved, 2) : 0,
            'avg_processing_time'  => 14, // days — implement with DATEDIFF if tracking review dates
            'success_rate'         => 82,
        ]);
        break;

    case 'funds-distribution':
        $labels = []; $disbursed = []; $allocated = [];
        for ($i = 5; $i >= 0; $i--) {
            $month    = date('Y-m', strtotime("-{$i} months"));
            $labels[] = date('M Y', strtotime("-{$i} months"));
            $sd = $pdo->prepare("SELECT COALESCE(SUM(amount),0) FROM beneficiaries WHERE DATE_FORMAT(created_at,'%Y-%m')=?"); $sd->execute([$month]);
            $sa = $pdo->prepare("SELECT COALESCE(SUM(requested_amount),0) FROM applications WHERE status='approved' AND DATE_FORMAT(submitted_at,'%Y-%m')=?"); $sa->execute([$month]);
            $disbursed[] = (float)$sd->fetchColumn();
            $allocated[] = (float)$sa->fetchColumn();
        }
        jsonSuccess(compact('labels','disbursed','allocated'));
        break;

    case 'allocation':
        jsonSuccess(Beneficiary::byCategory());
        break;

    case 'approval-rate':
        $stmt = $pdo->prepare("
            SELECT DATE_FORMAT(submitted_at,'%b %Y') AS label,
                   ROUND(SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END)/COUNT(*)*100,1) AS rate
            FROM applications
            WHERE submitted_at >= ?
            GROUP BY DATE_FORMAT(submitted_at,'%Y-%m')
            ORDER BY MIN(submitted_at) ASC
            LIMIT 6
        ");
        $stmt->execute([$cutoff]);
        $rows = $stmt->fetchAll();
        jsonSuccess([
            'labels' => array_column($rows, 'label'),
            'rates'  => array_map('floatval', array_column($rows, 'rate')),
        ]);
        break;

    case 'top-grants':
        $limit = min(10, (int)($_GET['limit'] ?? 5));
        $stmt  = $pdo->prepare("
            SELECT g.title,
                   COALESCE(SUM(b.amount),0) AS disbursed,
                   COUNT(DISTINCT a.id) AS applicants
            FROM grants g
            LEFT JOIN applications a  ON a.grant_id = g.id AND a.submitted_at >= ?
            LEFT JOIN beneficiaries b ON b.grant_id = g.id AND b.created_at  >= ?
            GROUP BY g.id, g.title
            ORDER BY disbursed DESC
            LIMIT ?
        ");
        $stmt->execute([$cutoff, $cutoff, $limit]);
        jsonSuccess($stmt->fetchAll());
        break;

    case 'export':
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="report-' . date('Y-m-d') . '.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, ['Applicant', 'Grant', 'Amount', 'Status', 'Date']);
        $stmt = $pdo->prepare("
            SELECT CONCAT(u.first_name,' ',u.last_name), g.title, a.requested_amount, a.status, a.submitted_at
            FROM applications a
            JOIN users  u ON u.id = a.user_id
            JOIN grants g ON g.id = a.grant_id
            WHERE a.submitted_at >= ?
            ORDER BY a.submitted_at DESC
        ");
        $stmt->execute([$cutoff]);
        foreach ($stmt->fetchAll() as $row) fputcsv($out, $row);
        fclose($out);
        exit;

    default:
        jsonError('Report type not found.', 404);
}
