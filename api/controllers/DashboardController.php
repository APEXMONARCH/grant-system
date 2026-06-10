<?php
// ─────────────────────────────────────────────────────────────
//  controllers/DashboardController.php
//
//  GET /api/dashboard/summary       admin
//  GET /api/dashboard/user-summary  applicant
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/../models/Application.php';
require_once __DIR__ . '/../models/Beneficiary.php';

$auth       = requireAuth();
$dashAction = $id ?? 'summary';

if ($method !== 'GET') jsonError('Method not allowed.', 405);

// ── Admin dashboard summary ─────────────────────────────────
if ($dashAction === 'summary') {
    requireAdmin();
    $pdo = db();

    $totalFunds     = (float) $pdo->query("SELECT COALESCE(SUM(total_budget),0) FROM grants WHERE status='active'")->fetchColumn();
    $allocatedFunds = (float) $pdo->query("SELECT COALESCE(SUM(requested_amount),0) FROM applications WHERE status='approved'")->fetchColumn();
    $remainingFunds = $totalFunds - $allocatedFunds;

    // Stat card counts
    $totalAppsStmt = $pdo->query("SELECT COUNT(*) FROM applications");
    $totalApps     = (int)$totalAppsStmt->fetchColumn();

    $pendingStmt   = $pdo->query("SELECT COUNT(*) FROM applications WHERE status='submitted'");
    $pendingReview = (int)$pendingStmt->fetchColumn();

    // 6-month chart data
    $labels = []; $allocated = []; $available = []; $disbursed = [];
    for ($i = 5; $i >= 0; $i--) {
        $month    = date('Y-m', strtotime("-{$i} months"));
        $labels[] = date('M', strtotime("-{$i} months"));

        $alloc = $pdo->prepare("SELECT COALESCE(SUM(requested_amount),0) FROM applications WHERE status='approved' AND DATE_FORMAT(submitted_at,'%Y-%m') <= ?");
        $alloc->execute([$month]); $allocated[] = (float)$alloc->fetchColumn();

        $avail = $pdo->prepare("SELECT COALESCE(SUM(total_budget),0) FROM grants WHERE status='active' AND DATE_FORMAT(created_at,'%Y-%m') <= ?");
        $avail->execute([$month]); $available[] = (float)$avail->fetchColumn();

        $disb = $pdo->prepare("SELECT COALESCE(SUM(amount),0) FROM beneficiaries WHERE status IN ('paid','disbursed') AND DATE_FORMAT(created_at,'%Y-%m') <= ?");
        $disb->execute([$month]); $disbursed[] = (float)$disb->fetchColumn();
    }

    jsonSuccess([
        'total_funds'        => $totalFunds,
        'allocated_funds'    => $allocatedFunds,
        'remaining_funds'    => $remainingFunds,
        'total_applications' => $totalApps,
        'pending_review'     => $pendingReview,
        'funds_trend'        => 12.5,
        'allocated_trend'    => 8.2,
        'remaining_trend'    => -5.3,
        'chart'              => compact('labels', 'allocated', 'available', 'disbursed'),
    ]);
}

// ── Applicant dashboard summary ─────────────────────────────
if ($dashAction === 'user-summary') {
    $userId = $auth['id'];
    $pdo    = db();

    // BUG FIX: removed the broken chained && assignment
    // Each query is a clean separate prepared statement
    $stmtTotal = $pdo->prepare("SELECT COUNT(*) FROM applications WHERE user_id=?");
    $stmtTotal->execute([$userId]);

    $stmtApprv = $pdo->prepare("SELECT COUNT(*) FROM applications WHERE user_id=? AND status='approved'");
    $stmtApprv->execute([$userId]);

    $stmtRevw  = $pdo->prepare("SELECT COUNT(*) FROM applications WHERE user_id=? AND status='under-review'");
    $stmtRevw->execute([$userId]);

    $stmtGrant = $pdo->prepare("SELECT COUNT(*) FROM grants WHERE status='active'");
    $stmtGrant->execute([]);

    $recent = Application::forUser($userId, [], 1, 5);

    jsonSuccess([
        'total_applications'  => (int)$stmtTotal->fetchColumn(),
        'approved'            => (int)$stmtApprv->fetchColumn(),
        'under_review'        => (int)$stmtRevw->fetchColumn(),
        'open_grants'         => (int)$stmtGrant->fetchColumn(),
        'recent_applications' => $recent['items'],
    ]);
}

jsonError('Dashboard route not found.', 404);
