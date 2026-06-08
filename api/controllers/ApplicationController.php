<?php
// ─────────────────────────────────────────────────────────────
//  controllers/ApplicationController.php
//
//  GET  /api/applications              admin list
//  GET  /api/applications/my           applicant's own list
//  GET  /api/applications/{id}         full detail
//  POST /api/applications              submit (multipart/form-data)
//  PATCH /api/applications/{id}/status update status [admin]
//  GET  /api/applications/{id}/download  HTML/PDF download [admin]
//  POST /api/applications/ai-check     AI completeness check [applicant]
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/../models/Application.php';
require_once __DIR__ . '/../models/Notification.php';
require_once __DIR__ . '/../models/Message.php';   // BUG FIX: was missing, caused fatal error on status update

$auth = requireAuth();

// ── Sub-routes ──────────────────────────────────────────────

// GET /api/applications/my
if ($id === 'my' && $method === 'GET') {
    $filters = [
        'status' => $_GET['status'] ?? '',
        'q'      => $_GET['q']     ?? '',
    ];
    $page  = max(1, (int)($_GET['page']  ?? 1));
    $limit = min(50, max(1, (int)($_GET['limit'] ?? 15)));
    $result = Application::forUser($auth['id'], $filters, $page, $limit);
    jsonList($result['items'], $result['total'], $page, $limit);
}

// POST /api/applications/ai-check  — AI completeness check
// NEW FEATURE: checks application fields for completeness before submission
if ($id === 'ai-check' && $method === 'POST') {
    $body = jsonBody();
    $issues = [];
    $score  = 100;

    $required = [
        'full_name'      => 'Full Name',
        'email'          => 'Email Address',
        'research_title' => 'Research Title',
        'objectives'     => 'Research Objectives',
        'methodology'    => 'Methodology',
        'grant_id'       => 'Grant Selection',
    ];
    foreach ($required as $field => $label) {
        if (empty($body[$field])) {
            $issues[] = ['field' => $field, 'severity' => 'error', 'message' => "{$label} is required."];
            $score -= 15;
        }
    }

    // Warn on thin content
    if (!empty($body['objectives']) && str_word_count($body['objectives']) < 30) {
        $issues[] = ['field' => 'objectives', 'severity' => 'warning', 'message' => 'Objectives seem brief — consider expanding to at least 30 words.'];
        $score -= 5;
    }
    if (!empty($body['methodology']) && str_word_count($body['methodology']) < 30) {
        $issues[] = ['field' => 'methodology', 'severity' => 'warning', 'message' => 'Methodology section is short — reviewers expect detail.'];
        $score -= 5;
    }

    // Budget check
    $budgetItems = is_array($body['budget_items'] ?? null) ? $body['budget_items'] : [];
    if (empty($budgetItems)) {
        $issues[] = ['field' => 'budget_items', 'severity' => 'warning', 'message' => 'No budget breakdown provided. A detailed budget improves approval chances.'];
        $score -= 10;
    }

    // Digital signature check
    if (empty($body['digital_signature'])) {
        $issues[] = ['field' => 'digital_signature', 'severity' => 'error', 'message' => 'Digital signature is required for submission.'];
        $score -= 10;
    }

    $score = max(0, $score);
    jsonSuccess([
        'score'    => $score,
        'complete' => $score >= 70 && !array_filter($issues, fn($i) => $i['severity'] === 'error'),
        'issues'   => $issues,
        'summary'  => $score >= 90 ? 'Excellent — application looks complete.'
                    : ($score >= 70 ? 'Good — a few improvements recommended.'
                    : 'Incomplete — please address the errors before submitting.'),
    ]);
}

// PATCH /api/applications/{id}/status
if ($action === 'status' && $method === 'PATCH') {
    requireAdmin();
    $body   = jsonBody();
    $status = $body['status'] ?? '';
    $reason = $body['reason'] ?? null;

    $allowed = ['submitted', 'under-review', 'approved', 'rejected'];
    if (!in_array($status, $allowed, true)) jsonError('Invalid status.', 422);

    $app = Application::findById((int)$id);
    if (!$app) jsonError('Application not found.', 404);

    Application::updateStatus((int)$id, $status, $reason, $auth['id']);

    // Create a beneficiary record when approved
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

    // Notify applicant
    $messages = [
        'approved'     => 'Congratulations! Your application for "' . $app['grant_title'] . '" has been approved.',
        'rejected'     => 'Your application for "' . $app['grant_title'] . '" was not successful.' . ($reason ? ' Reason: ' . $reason : ''),
        'under-review' => 'Your application for "' . $app['grant_title'] . '" is now under review.',
    ];
    $title = 'Application ' . ucwords(str_replace('-', ' ', $status));
    Notification::create($app['user_id'], $title, $messages[$status] ?? '');
    Message::send($app['user_id'], 'Application Status Update', $messages[$status] ?? '');

    jsonSuccess([], 'Status updated.');
}

// GET /api/applications/{id}/download
// IMPROVED: generates a properly formatted HTML letter with QR verification code
if ($action === 'download' && $method === 'GET') {
    requireAdmin();
    $app = Application::findById((int)$id);
    if (!$app) jsonError('Application not found.', 404);

    $budgetItems  = is_array($app['budget_items']) ? $app['budget_items'] : [];
    $totalBudget  = array_reduce($budgetItems, fn($c, $i) => $c + (float)($i['cost'] ?? 0), 0.0);
    $verifyToken  = base64_encode(hash_hmac('sha256', $id . '|' . $app['submitted_at'], JWT_SECRET, true));
    $verifyUrl    = (defined('FRONTEND_URL') ? FRONTEND_URL : 'http://localhost/grant-system')
                  . '/verify.html?ref=APP-' . str_pad($id, 6, '0', STR_PAD_LEFT) . '&t=' . urlencode($verifyToken);

    $budgetRows = '';
    foreach ($budgetItems as $item) {
        $budgetRows .= '<tr><td>' . htmlspecialchars($item['item'] ?? '') . '</td>'
                     . '<td>' . htmlspecialchars($item['description'] ?? '') . '</td>'
                     . '<td style="text-align:right;">₦' . number_format((float)($item['cost'] ?? 0), 2) . '</td></tr>';
    }

    $html = '<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Application Summary — APP-' . str_pad($id, 6, '0', STR_PAD_LEFT) . '</title>
<style>
  body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a2e;margin:40px;}
  h1{color:#0b4f96;font-size:22px;margin-bottom:4px;}
  h2{color:#0b4f96;font-size:14px;border-bottom:2px solid #0b4f96;padding-bottom:4px;margin-top:28px;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0b4f96;padding-bottom:16px;margin-bottom:24px;}
  .badge{background:#0b4f96;color:#fff;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:bold;}
  table{width:100%;border-collapse:collapse;margin-top:8px;}
  th{background:#f0f4ff;text-align:left;padding:8px;font-size:12px;}
  td{padding:7px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;}
  .qr-section{margin-top:36px;border-top:1px dashed #ccc;padding-top:16px;display:flex;align-items:center;gap:20px;}
  .qr-text{font-size:11px;color:#6b7280;}
  .footer{margin-top:40px;font-size:11px;color:#9ca3af;text-align:center;}
  .status-approved{color:#10b981;font-weight:bold;}
  .status-rejected{color:#ef4444;font-weight:bold;}
  .status-submitted{color:#3b82f6;font-weight:bold;}
  .status-under-review{color:#f59e0b;font-weight:bold;}
  @media print{body{margin:20px;} .no-print{display:none;}}
</style>
</head><body>
<div class="header">
  <div>
    <h1>Grant Application Summary</h1>
    <p style="margin:2px 0;color:#6b7280;">Reference: <strong>APP-' . str_pad($id, 6, '0', STR_PAD_LEFT) . '</strong></p>
    <p style="margin:2px 0;color:#6b7280;">Submitted: ' . date('d M Y', strtotime($app['submitted_at'] ?? 'now')) . '</p>
  </div>
  <div style="text-align:right;">
    <div class="badge">GRANT MANAGEMENT SYSTEM</div>
    <p style="font-size:11px;color:#6b7280;margin-top:6px;">Printed: ' . date('d M Y H:i') . '</p>
  </div>
</div>

<h2>Applicant Information</h2>
<table>
  <tr><th width="35%">Full Name</th><td>' . htmlspecialchars($app['applicant_name'] ?? '') . '</td></tr>
  <tr><th>Email</th><td>' . htmlspecialchars($app['email'] ?? $app['applicant_email'] ?? '') . '</td></tr>
  <tr><th>Phone</th><td>' . htmlspecialchars($app['phone'] ?? '') . '</td></tr>
  <tr><th>Institution</th><td>' . htmlspecialchars($app['institution'] ?? '') . '</td></tr>
  <tr><th>Faculty / Department</th><td>' . htmlspecialchars($app['faculty'] ?? '') . '</td></tr>
  <tr><th>Academic Rank</th><td>' . htmlspecialchars($app['academic_rank'] ?? '') . '</td></tr>
  <tr><th>Staff ID</th><td>' . htmlspecialchars($app['staff_id'] ?? '') . '</td></tr>
</table>

<h2>Grant &amp; Research Details</h2>
<table>
  <tr><th width="35%">Grant Program</th><td>' . htmlspecialchars($app['grant_title'] ?? '') . '</td></tr>
  <tr><th>Research Title</th><td>' . htmlspecialchars($app['research_title'] ?? '') . '</td></tr>
  <tr><th>Research Area</th><td>' . htmlspecialchars($app['research_area'] ?? '') . '</td></tr>
  <tr><th>Research Category</th><td>' . htmlspecialchars($app['research_category'] ?? '') . '</td></tr>
  <tr><th>Duration (months)</th><td>' . htmlspecialchars($app['research_duration'] ?? '') . '</td></tr>
  <tr><th>Requested Amount</th><td>₦' . number_format((float)($app['requested_amount'] ?? 0), 2) . '</td></tr>
  <tr><th>Status</th><td><span class="status-' . htmlspecialchars($app['status']) . '">' . strtoupper(str_replace('-', ' ', $app['status'])) . '</span></td></tr>
</table>

<h2>Objectives</h2>
<p>' . nl2br(htmlspecialchars($app['objectives'] ?? 'Not provided.')) . '</p>

<h2>Methodology</h2>
<p>' . nl2br(htmlspecialchars($app['methodology'] ?? 'Not provided.')) . '</p>

<h2>Expected Impact</h2>
<table>
  <tr><th width="35%">Beneficiaries</th><td>' . htmlspecialchars($app['impact_beneficiaries'] ?? '') . '</td></tr>
  <tr><th>Societal Impact</th><td>' . htmlspecialchars($app['impact_societal'] ?? '') . '</td></tr>
  <tr><th>Academic Contribution</th><td>' . htmlspecialchars($app['impact_academic'] ?? '') . '</td></tr>
  <tr><th>Innovation</th><td>' . htmlspecialchars($app['impact_innovation'] ?? '') . '</td></tr>
  <tr><th>Risk Assessment</th><td>' . htmlspecialchars($app['impact_risk'] ?? '') . '</td></tr>
</table>

<h2>Budget Breakdown</h2>
<table>
  <thead><tr><th>Item</th><th>Description</th><th style="text-align:right;">Amount (₦)</th></tr></thead>
  <tbody>' . ($budgetRows ?: '<tr><td colspan="3">No budget items provided.</td></tr>') . '
    <tr style="background:#f0f4ff;font-weight:bold;">
      <td colspan="2">Total Requested</td>
      <td style="text-align:right;">₦' . number_format($totalBudget, 2) . '</td>
    </tr>
  </tbody>
</table>

<div class="qr-section">
  <div>
    <!-- QR code rendered client-side via qrcode.js or server-side library -->
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=' . urlencode($verifyUrl) . '" width="90" height="90" alt="QR Verification Code" />
  </div>
  <div class="qr-text">
    <strong>Document Verification</strong><br>
    Scan the QR code or visit:<br>
    <span style="font-family:monospace;font-size:10px;">' . htmlspecialchars($verifyUrl) . '</span><br><br>
    This document was generated by the Grant Management System.<br>
    Ref: APP-' . str_pad($id, 6, '0', STR_PAD_LEFT) . ' &nbsp;|&nbsp; Issued: ' . date('d M Y H:i') . '
  </div>
</div>

<div class="footer">
  Grant Management System &mdash; Confidential &mdash; Do not distribute without authorisation.
</div>
</body></html>';

    ob_clean();
    header('Content-Type: text/html; charset=UTF-8');
    header('Content-Disposition: attachment; filename="application-' . $id . '.html"');
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
            // Applicants can only see their own
            if ($auth['role'] !== 'admin' && (int)$app['user_id'] !== (int)$auth['id']) {
                jsonError('Forbidden.', 403);
            }
            jsonSuccess($app);
        }

        // Admin list
        requireAdmin();
        $filters = [
            'status' => $_GET['status'] ?? '',
            'q'      => $_GET['q']     ?? '',
            'sort'   => $_GET['sort']  ?? 'date_desc',
        ];
        $page  = max(1, (int)($_GET['page']  ?? 1));
        $limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));
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

        // Notify admin(s) of new submission
        $adminStmt = db()->prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 5");
        $adminStmt->execute();
        foreach ($adminStmt->fetchAll() as $admin) {
            Notification::create($admin['id'], 'New Application', "A new application has been submitted for grant ID {$data['grant_id']}.");
        }

        jsonSuccess(['id' => $appId], 'Application submitted successfully.', 201);
        break;

    default:
        jsonError('Method not allowed.', 405);
}
