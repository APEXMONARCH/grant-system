<?php
// ─────────────────────────────────────────────────────────────
//  controllers/ApplicationController.php
//
//  GET    /api/applications              admin list (Kanban)
//  GET    /api/applications/my           applicant's own list
//  GET    /api/applications/{id}         full detail
//  POST   /api/applications              submit application
//  PATCH  /api/applications/{id}/status  update status [admin]
//  GET    /api/applications/{id}/download HTML summary download [admin]
//  POST   /api/applications/ai-check     completeness check [applicant]
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/../models/Application.php';
require_once __DIR__ . '/../models/Notification.php';
require_once __DIR__ . '/../models/Message.php';   // BUG FIX: was missing — caused fatal error on status update

$auth = requireAuth();

// ── GET /api/applications/my ────────────────────────────────
if ($id === 'my' && $method === 'GET') {
    $filters = [
        'status' => $_GET['status'] ?? '',
        'q'      => $_GET['q']     ?? '',
    ];
    $page   = max(1, (int)($_GET['page']  ?? 1));
    $limit  = min(50, max(1, (int)($_GET['limit'] ?? 15)));
    $result = Application::forUser($auth['id'], $filters, $page, $limit);
    jsonList($result['items'], $result['total'], $page, $limit);
}

// ── POST /api/applications/ai-check ────────────────────────
// AI completeness checker — scores the form before submission
if ($id === 'ai-check' && $method === 'POST') {
    $body   = jsonBody();
    $issues = [];
    $score  = 100;

    $required = [
        'grant_id'       => 'Grant Selection',
        'full_name'      => 'Full Name',
        'email'          => 'Email Address',
        'research_title' => 'Research Title',
        'objectives'     => 'Research Objectives',
        'methodology'    => 'Research Abstract',
    ];
    foreach ($required as $field => $label) {
        if (empty($body[$field])) {
            $issues[] = ['field' => $field, 'severity' => 'error', 'message' => "{$label} is required."];
            $score -= 15;
        }
    }

    if (!empty($body['objectives']) && str_word_count($body['objectives']) < 30) {
        $issues[] = ['field' => 'objectives', 'severity' => 'warning', 'message' => 'Objectives seem brief — aim for at least 30 words.'];
        $score -= 5;
    }
    if (!empty($body['methodology']) && str_word_count($body['methodology']) < 30) {
        $issues[] = ['field' => 'methodology', 'severity' => 'warning', 'message' => 'Methodology section is short — reviewers expect more detail.'];
        $score -= 5;
    }
    if (empty($body['budget_items']) || !is_array($body['budget_items']) || count($body['budget_items']) === 0) {
        $issues[] = ['field' => 'budget_items', 'severity' => 'warning', 'message' => 'No budget breakdown provided. A detailed budget improves approval chances.'];
        $score -= 10;
    }
    if (empty($body['digital_signature'])) {
        $issues[] = ['field' => 'digital_signature', 'severity' => 'error', 'message' => 'Digital signature is required before submitting.'];
        $score -= 10;
    }

    $score    = max(0, $score);
    $hasError = !empty(array_filter($issues, fn($i) => $i['severity'] === 'error'));

    jsonSuccess([
        'score'    => $score,
        'complete' => $score >= 70 && !$hasError,
        'issues'   => $issues,
        'summary'  => $score >= 90 ? 'Excellent — application looks complete.'
                    : ($score >= 70 ? 'Good — a few improvements recommended before submitting.'
                    : 'Incomplete — please fix the errors listed above.'),
    ]);
}

// ── PATCH /api/applications/{id}/status ────────────────────
if ($action === 'status' && $method === 'PATCH') {
    requireAdmin();
    $body   = jsonBody();
    $status = $body['status'] ?? '';
    $reason = $body['reason'] ?? null;

    $allowed = ['submitted', 'under-review', 'approved', 'rejected'];
    if (!in_array($status, $allowed, true)) jsonError('Invalid status value.', 422);

    $app = Application::findById((int)$id);
    if (!$app) jsonError('Application not found.', 404);

    Application::updateStatus((int)$id, $status, $reason, $auth['id']);

    // Auto-create beneficiary record on approval
    if ($status === 'approved') {
        $check = db()->prepare('SELECT id FROM beneficiaries WHERE application_id = ?');
        $check->execute([(int)$id]);
        if (!$check->fetch()) {
            db()->prepare('
                INSERT INTO beneficiaries (application_id, user_id, grant_id, amount, status)
                VALUES (?,?,?,?,?)
            ')->execute([$id, $app['user_id'], $app['grant_id'], $app['requested_amount'], 'pending']);
        }
    }

    // Notify applicant in-app + message
    $notifMessages = [
        'approved'     => 'Congratulations! Your application for "' . $app['grant_title'] . '" has been approved.',
        'rejected'     => 'Your application for "' . $app['grant_title'] . '" was not successful.' . ($reason ? ' Reason: ' . $reason : ''),
        'under-review' => 'Your application for "' . $app['grant_title'] . '" is now under review by our team.',
        'submitted'    => 'Your application for "' . $app['grant_title'] . '" status has been updated.',
    ];
    $notifTitle = 'Application ' . ucwords(str_replace('-', ' ', $status));
    Notification::create($app['user_id'], $notifTitle, $notifMessages[$status] ?? '');
    Message::send($app['user_id'], 'Application Status Update — ' . $notifTitle, $notifMessages[$status] ?? '');

    jsonSuccess([], 'Status updated successfully.');
}

// ── GET /api/applications/{id}/download ────────────────────
if ($action === 'download' && $method === 'GET') {
    requireAdmin();
    $app = Application::findById((int)$id);
    if (!$app) jsonError('Application not found.', 404);

    $budgetItems  = is_array($app['budget_items']) ? $app['budget_items'] : [];
    $totalBudget  = array_reduce($budgetItems, fn($c, $i) => $c + (float)($i['cost'] ?? 0), 0.0);
    $refNo        = 'APP-' . str_pad($id, 6, '0', STR_PAD_LEFT);
    $verifyToken  = base64_encode(hash_hmac('sha256', $id . '|' . ($app['submitted_at'] ?? ''), defined('JWT_SECRET') ? JWT_SECRET : 'secret', true));
    $verifyUrl    = (defined('FRONTEND_URL') ? FRONTEND_URL : 'http://localhost/grant-system')
                  . '/verify.html?ref=' . $refNo . '&t=' . urlencode($verifyToken);

    $budgetRows = '';
    foreach ($budgetItems as $item) {
        $budgetRows .= '<tr>'
            . '<td>' . htmlspecialchars($item['item'] ?? '') . '</td>'
            . '<td>' . htmlspecialchars($item['description'] ?? '') . '</td>'
            . '<td style="text-align:right;">&#8358;' . number_format((float)($item['cost'] ?? 0), 2) . '</td>'
            . '</tr>';
    }

    $statusColor = match($app['status']) {
        'approved'     => '#10b981',
        'rejected'     => '#ef4444',
        'under-review' => '#f59e0b',
        default        => '#3b82f6',
    };

    $html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Application Summary — ' . $refNo . '</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a2e;background:#fff;padding:40px;}
  h1{color:#0b4f96;font-size:20px;}
  h2{color:#0b4f96;font-size:13px;border-bottom:2px solid #0b4f96;padding-bottom:4px;margin:24px 0 10px;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0b4f96;padding-bottom:16px;margin-bottom:24px;}
  .badge{display:inline-block;background:#0b4f96;color:#fff;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:.5px;}
  .status-badge{display:inline-block;padding:4px 14px;border-radius:12px;font-size:11px;font-weight:bold;background:' . $statusColor . '22;color:' . $statusColor . ';border:1px solid ' . $statusColor . ';}
  table{width:100%;border-collapse:collapse;margin-top:6px;}
  th{background:#f0f4ff;text-align:left;padding:8px;font-size:11px;color:#374151;border:1px solid #e5e7eb;}
  td{padding:7px 8px;border:1px solid #e5e7eb;font-size:12px;vertical-align:top;}
  .total-row{background:#f0f4ff;font-weight:bold;}
  .qr-section{margin-top:32px;border-top:2px dashed #ccc;padding-top:16px;display:flex;align-items:flex-start;gap:20px;}
  .qr-text{font-size:11px;color:#6b7280;line-height:1.6;}
  .footer{margin-top:36px;font-size:10px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:12px;}
  p{margin:4px 0;font-size:12px;}
  @media print{body{padding:20px;}}
</style></head><body>

<div class="header">
  <div>
    <h1>Grant Application Summary</h1>
    <p style="margin-top:6px;color:#6b7280;">Reference: <strong>' . $refNo . '</strong></p>
    <p style="color:#6b7280;">Submitted: ' . date('d M Y', strtotime($app['submitted_at'] ?? 'now')) . '</p>
    <p style="margin-top:8px;">Status: <span class="status-badge">' . strtoupper(str_replace('-', ' ', $app['status'])) . '</span></p>
  </div>
  <div style="text-align:right;">
    <div class="badge">GRANT MANAGEMENT SYSTEM</div>
    <p style="font-size:10px;color:#9ca3af;margin-top:8px;">Generated: ' . date('d M Y H:i') . '</p>
  </div>
</div>

<h2>Applicant Information</h2>
<table>
  <tr><th width="35%">Full Name</th><td>' . htmlspecialchars($app['applicant_name'] ?? '') . '</td><th width="20%">Staff ID</th><td>' . htmlspecialchars($app['staff_id'] ?? 'N/A') . '</td></tr>
  <tr><th>Email</th><td>' . htmlspecialchars($app['email'] ?? $app['applicant_email'] ?? '') . '</td><th>Phone</th><td>' . htmlspecialchars($app['phone'] ?? 'N/A') . '</td></tr>
  <tr><th>Institution</th><td>' . htmlspecialchars($app['institution'] ?? 'N/A') . '</td><th>Faculty</th><td>' . htmlspecialchars($app['faculty'] ?? 'N/A') . '</td></tr>
  <tr><th>Academic Rank</th><td colspan="3">' . htmlspecialchars($app['academic_rank'] ?? 'N/A') . '</td></tr>
</table>

<h2>Grant &amp; Research Details</h2>
<table>
  <tr><th width="35%">Grant Program</th><td colspan="3">' . htmlspecialchars($app['grant_title'] ?? '') . '</td></tr>
  <tr><th>Research Title</th><td colspan="3">' . htmlspecialchars($app['research_title'] ?? '') . '</td></tr>
  <tr><th>Research Area</th><td>' . htmlspecialchars($app['research_area'] ?? '') . '</td><th>Category</th><td>' . htmlspecialchars($app['research_category'] ?? '') . '</td></tr>
  <tr><th>Duration</th><td>' . htmlspecialchars($app['research_duration'] ?? '') . ' months</td><th>Requested Amount</th><td><strong>&#8358;' . number_format((float)($app['requested_amount'] ?? 0), 2) . '</strong></td></tr>
</table>

<h2>Objectives</h2>
<p>' . nl2br(htmlspecialchars($app['objectives'] ?? 'Not provided.')) . '</p>

<h2>Methodology</h2>
<p>' . nl2br(htmlspecialchars($app['methodology'] ?? 'Not provided.')) . '</p>

<h2>Budget Breakdown</h2>
<table>
  <thead><tr><th>Item</th><th>Description</th><th style="text-align:right;">Amount (&#8358;)</th></tr></thead>
  <tbody>
    ' . ($budgetRows ?: '<tr><td colspan="3" style="text-align:center;color:#9ca3af;">No budget items provided.</td></tr>') . '
    <tr class="total-row"><td colspan="2">Total Requested</td><td style="text-align:right;">&#8358;' . number_format($totalBudget, 2) . '</td></tr>
  </tbody>
</table>

<h2>Research Impact</h2>
<table>
  <tr><th width="35%">Target Beneficiaries</th><td>' . htmlspecialchars($app['impact_beneficiaries'] ?? 'N/A') . '</td></tr>
  <tr><th>Societal Impact</th><td>' . htmlspecialchars($app['impact_societal'] ?? 'N/A') . '</td></tr>
  <tr><th>Academic Contribution</th><td>' . htmlspecialchars($app['impact_academic'] ?? 'N/A') . '</td></tr>
  <tr><th>Innovation</th><td>' . htmlspecialchars($app['impact_innovation'] ?? 'N/A') . '</td></tr>
  <tr><th>Risk Assessment</th><td>' . htmlspecialchars($app['impact_risk'] ?? 'N/A') . '</td></tr>
</table>

<div class="qr-section">
  <div>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=' . urlencode($verifyUrl) . '"
         width="90" height="90" alt="QR Verification Code" />
  </div>
  <div class="qr-text">
    <strong>Document Verification</strong><br>
    Scan the QR code to verify this document authenticity.<br>
    Or visit: <span style="font-family:monospace;font-size:10px;">' . htmlspecialchars($verifyUrl) . '</span><br><br>
    Reference: ' . $refNo . ' &nbsp;|&nbsp; Issued: ' . date('d M Y H:i') . '<br>
    This document was generated by the Grant Management System.
  </div>
</div>

<div class="footer">
  Grant Management System &mdash; Confidential Document &mdash; Do not distribute without authorisation.<br>
  ' . $refNo . ' &mdash; Printed ' . date('d M Y H:i:s') . '
</div>

</body></html>';

    ob_clean();
    header('Content-Type: text/html; charset=UTF-8');
    header('Content-Disposition: attachment; filename="application-' . $refNo . '.html"');
    header('Content-Length: ' . strlen($html));
    echo $html;
    exit;
}

// ── Main CRUD ───────────────────────────────────────────────
switch ($method) {

    case 'GET':
        if ($id) {
            $app = Application::findById((int)$id);
            if (!$app) jsonError('Application not found.', 404);
            if ($auth['role'] !== 'admin' && (int)$app['user_id'] !== (int)$auth['id']) {
                jsonError('Forbidden.', 403);
            }
            jsonSuccess($app);
        }

        // Admin list for Kanban board
        requireAdmin();
        $filters = [
            'status' => $_GET['status'] ?? '',
            'q'      => $_GET['q']     ?? '',
            'sort'   => $_GET['sort']  ?? 'date_desc',
        ];
        $page   = max(1, (int)($_GET['page']  ?? 1));
        $limit  = min(50, max(1, (int)($_GET['limit'] ?? 50)));
        $result = Application::all($filters, $page, $limit);
        jsonList($result['items'], $result['total'], $page, $limit);
        break;

    case 'POST':
        $data = $_POST;

        $errors = validate($data, [
            'grant_id'       => 'required|numeric',
            'full_name'      => 'required|max:255',
            'email'          => 'required|email',
            'research_title' => 'required|max:500',
        ]);
        if ($errors) jsonError('Validation failed.', 422, $errors);

        if (!empty($data['budget_items'])) {
            $data['budget_items'] = json_decode($data['budget_items'], true) ?? [];
        }

        $appId = Application::create($data, $auth['id']);

        // Handle file uploads
        $docLabels = [
            'uploadProposal'         => 'Research Proposal PDF',
            'uploadCv'               => 'Curriculum Vitae (CV)',
            'uploadPublications'     => 'List of Publications',
            'uploadApprovalLetter'   => 'Institutional Approval Letter',
            'uploadPreviousEvidence' => 'Evidence of Previous Research',
            'uploadSupportingDocs'   => 'Supporting Documents',
        ];
        foreach ($docLabels as $fieldName => $label) {
            if (!empty($_FILES[$fieldName]) && $_FILES[$fieldName]['error'] === UPLOAD_ERR_OK) {
                try {
                    $info = uploadFile($_FILES[$fieldName], (string)$appId);
                    Application::saveDocument($appId, $label, $info);
                } catch (RuntimeException $e) {
                    error_log("File upload failed for {$fieldName}: " . $e->getMessage());
                }
            }
        }

        // ── Notify ALL admins of the new submission ──────────
        // This is what populates the admin's Kanban board notification
        $applicantName = trim(($data['full_name'] ?? 'An applicant'));
        $grantStmt     = db()->prepare("SELECT title FROM grants WHERE id = ?");
        $grantStmt->execute([$data['grant_id']]);
        $grantTitle    = $grantStmt->fetchColumn() ?: 'Grant #' . $data['grant_id'];

        $adminStmt = db()->prepare("SELECT id FROM users WHERE role = 'admin' AND status = 'active'");
        $adminStmt->execute();
        foreach ($adminStmt->fetchAll() as $admin) {
            Notification::create(
                $admin['id'],
                'New Application Received',
                "{$applicantName} has submitted an application for \"{$grantTitle}\". Review it on the Applications board."
            );
        }

        jsonSuccess(['id' => $appId], 'Application submitted successfully.', 201);
        break;

    default:
        jsonError('Method not allowed.', 405);
}
