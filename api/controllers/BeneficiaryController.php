<?php
// ─────────────────────────────────────────────────────────────
//  controllers/BeneficiaryController.php
// ─────────────────────────────────────────────────────────────
// This file is loaded when $resource === 'beneficiaries'
require_once __DIR__ . '/../models/Beneficiary.php';

requireAdmin();

if ($id === 'stats' && $method === 'GET') {
    jsonSuccess([
        'by_category'   => Beneficiary::byCategory(),
        'approval_rate' => Beneficiary::approvalRateByCategory(),
    ]);
}

if ($id === 'export' && $method === 'GET') {
    $result = Beneficiary::all(1, 9999);
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="beneficiaries-' . date('Y-m-d') . '.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['Name','Email','Grant','Amount','Status','Date']);
    foreach ($result['items'] as $row) {
        fputcsv($out, [$row['name'], $row['email'], $row['grant_title'], $row['amount'], $row['status'], $row['date']]);
    }
    fclose($out);
    exit;
}

if ($method === 'GET') {
    $page   = max(1, (int)($_GET['page']  ?? 1));
    $limit  = min(100, max(1, (int)($_GET['limit'] ?? 20)));
    $result = Beneficiary::all($page, $limit);
    jsonSuccess(array_merge($result, [
        'total_disbursed' => Beneficiary::totalDisbursed(),
        'pending_payments'=> Beneficiary::pendingCount(),
    ]));
}

jsonError('Method not allowed.', 405);
