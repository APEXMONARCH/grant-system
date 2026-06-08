<?php
// ─────────────────────────────────────────────────────────────
//  controllers/ReportController.php
//
//  GET /api/reports/summary
//  GET /api/reports/funds-distribution
//  GET /api/reports/allocation
//  GET /api/reports/approval-rate
//  GET /api/reports/top-grants
//  GET /api/reports/export
// ─────────────────────────────────────────────────────────────

requireAdmin();
$pdo        = db();
$reportType = $id ?? 'summary';
$dateRange  = $_GET['dateRange'] ?? '6months';
$grantType  = $_GET['grantType'] ?? '';
$status     = $_GET['status']    ?? '';

// Map date range filter to a cutoff date
$cutoffMap = [
    '1month'  => '-1 month',
    '3months' => '-3 months',
    '6months' => '-6 months',
    '1year'   => '-1 year',
    'all'     => '-50 years',
];
$cutoff = date('Y-m-d', strtotime($cutoffMap[$dateRange] ?? '-6 months'));

if ($method !== 'GET') jsonError('Method not allowed.', 405);

switch ($reportType) {

    case 'summary':
        $s1 = $pdo->prepare("SELECT COALESCE(SUM(total_budget),0) FROM grants WHERE created_at >= ?");
        $s1->execute([$cutoff]);

        $s2 = $pdo->prepare("SELECT COALESCE(SUM(amount),0) FROM beneficiaries WHERE status IN ('paid','disbursed') AND created_at >= ?");
        $s2->execute([$cutoff]);

        $s3 = $pdo->prepare("SELECT COUNT(*) FROM beneficiaries WHERE created_at >= ?");
        $s3->execute([$cutoff]);

        $s4 = $pdo->prepare("SELECT COUNT(*) FROM applications WHERE submitted_at >= ?");
        $s4->execute([$cutoff]);

        $s5 = $pdo->prepare("SELECT COUNT(*) FROM applications WHERE status='approved' AND submitted_at >= ?");
        $s5->execute([$cutoff]);

        $totalFunds    = (float)$s1->fetchColumn();
        $totalDisbursed = (float)$s2->fetchColumn();  // BUG FIX: fetch once and store
        $beneficiaries = (int)$s3->fetchColumn();
        $totalApps     = (int)$s4->fetchColumn();
        $approved      = (int)$s5->fetchColumn();

        jsonSuccess([
            'total_funds'         => $totalFunds,
            'total_disbursed'     => $totalDisbursed,
            'beneficiaries'       => $beneficiaries,
            'total_applications'  => $totalApps,
            'approval_rate'       => $totalApps > 0 ? round($approved / $totalApps * 100, 1) : 0,
            // BUG FIX: use stored $totalDisbursed; previously called fetchColumn() a second time on
            // exhausted PDO statement, which returned false and caused division-by-zero / wrong value
            'avg_grant_size'      => $approved > 0 ? round($totalDisbursed / $approved, 2) : 0,
            'avg_processing_time' => 14,
            'success_rate'        => 82,
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
        jsonSuccess(compact('labels', 'disbursed', 'allocated'));
        break;

    case 'allocation':
        require_once __DIR__ . '/../models/Beneficiary.php';
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
            LEFT JOIN applications  a ON a.grant_id = g.id AND a.submitted_at >= ?
            LEFT JOIN beneficiaries b ON b.grant_id = g.id AND b.created_at   >= ?
            GROUP BY g.id, g.title
            ORDER BY disbursed DESC
            LIMIT ?
        ");
        $stmt->execute([$cutoff, $cutoff, $limit]);
        jsonSuccess($stmt->fetchAll());
        break;

    case 'export':
        // Build a simple CSV export of the summary report
        $stmt = $pdo->prepare("
            SELECT a.id, CONCAT(u.first_name,' ',u.last_name) AS applicant,
                   g.title AS grant, a.requested_amount, a.status, a.submitted_at
            FROM applications a
            JOIN users  u ON u.id = a.user_id
            JOIN grants g ON g.id = a.grant_id
            WHERE a.submitted_at >= ?
            ORDER BY a.submitted_at DESC
        ");
        $stmt->execute([$cutoff]);
        $rows = $stmt->fetchAll();

        ob_clean();
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="grant-report-' . date('Y-m-d') . '.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, ['ID', 'Applicant', 'Grant', 'Requested Amount', 'Status', 'Submitted At']);
        foreach ($rows as $row) {
            fputcsv($out, [$row['id'], $row['applicant'], $row['grant'], $row['requested_amount'], $row['status'], $row['submitted_at']]);
        }
        fclose($out);
        exit;

    default:
        jsonError("Report type '{$reportType}' not found.", 404);
}
