<?php
// ─────────────────────────────────────────────────────────────
//  controllers/BeneficiaryController.php
//  Loaded when $resource === 'beneficiaries'
// ─────────────────────────────────────────────────────────────
require_once __DIR__ . '/../models/Beneficiary.php';
require_once __DIR__ . '/../models/Notification.php';

$admin = requireAdmin();   // capture admin for audit logging

// ── PATCH /api/beneficiaries/{id}/disburse ──────────────────
if ($action === 'disburse' && $method === 'PATCH') {
    $body = jsonBody();

    $ben = Beneficiary::findFull((int)$id);
    if (!$ben) jsonError('Beneficiary not found.', 404);

    if (in_array($ben['status'], ['paid', 'disbursed'], true)) {
        jsonError('This beneficiary has already been paid.', 409);
    }

    $errors = validate($body, [
        'amount'         => 'required|numeric',
        'payment_method' => 'required|max:50',
    ]);
    if ($errors) jsonError('Validation failed.', 422, $errors);

    $amount = (float)$body['amount'];
    if ($amount <= 0) jsonError('Amount must be greater than zero.', 422);

    $ref  = trim($body['transaction_ref'] ?? '');
    if ($ref === '') $ref = 'TXN-' . strtoupper(bin2hex(random_bytes(4)));
    $note = isset($body['note']) && $body['note'] !== '' ? $body['note'] : null;

    Beneficiary::disburse((int)$id, $amount, $body['payment_method'], $ref, $note);

    Notification::create(
        (int)$ben['user_id'],
        'Funds Disbursed',
        'A payment of ' . number_format($amount, 2) . ' for "' . $ben['grant_title']
            . '" has been disbursed via ' . $body['payment_method']
            . '. Reference: ' . $ref . '.'
    );

    // Audit log — non-fatal if it fails
    try {
        db()->prepare('
            INSERT INTO audit_logs (user_id, action, detail, level, ip_address, user_agent)
            VALUES (?,?,?,?,?,?)
        ')->execute([
            $admin['id'],
            'disburse_funds',
            'Disbursed ' . number_format($amount, 2) . ' to ' . $ben['name']
                . ' (beneficiary #' . (int)$id . '), ref ' . $ref,
            'info',
            $_SERVER['REMOTE_ADDR'] ?? null,
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
        ]);
    } catch (Throwable $e) {
        // audit failure must not block the payout response
    }

    jsonSuccess([
        'id'              => (int)$id,
        'status'          => 'disbursed',
        'amount'          => $amount,
        'transaction_ref' => $ref,
    ], 'Funds disbursed successfully.');
}

// ── GET /api/beneficiaries/stats ────────────────────────────
if ($id === 'stats' && $method === 'GET') {
    jsonSuccess([
        'by_category'   => Beneficiary::byCategory(),
        'approval_rate' => Beneficiary::approvalRateByCategory(),
    ]);
}

// ── GET /api/beneficiaries/export ───────────────────────────
if ($id === 'export' && $method === 'GET') {
    $result = Beneficiary::all(1, 9999);
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="beneficiaries-' . date('Y-m-d') . '.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['Name','Email','Grant','Amount','Status','Method','Reference','Date']);
    foreach ($result['items'] as $row) {
        fputcsv($out, [
            $row['name'], $row['email'], $row['grant_title'], $row['amount'],
            $row['status'], $row['payment_method'] ?? '', $row['transaction_ref'] ?? '', $row['date'],
        ]);
    }
    fclose($out);
    exit;
}

// ── GET /api/beneficiaries ──────────────────────────────────
if ($method === 'GET') {
    $page   = max(1, (int)($_GET['page']  ?? 1));
    $limit  = min(100, max(1, (int)($_GET['limit'] ?? 20)));
    $result = Beneficiary::all($page, $limit);
    jsonSuccess(array_merge($result, [
        'total_disbursed'  => Beneficiary::totalDisbursed(),
        'pending_payments' => Beneficiary::pendingCount(),
    ]));
}

jsonError('Method not allowed.', 405);
