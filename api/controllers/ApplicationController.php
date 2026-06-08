<?php
// ─────────────────────────────────────────────────────────────
//  controllers/ApplicationController.php
//
//  GET  /api/applications            admin list
//  GET  /api/applications/my         applicant's own list
//  GET  /api/applications/{id}       full detail
//  POST /api/applications            submit (multipart/form-data)
//  PATCH /api/applications/{id}/status   update status [admin]
//  GET  /api/applications/{id}/download  PDF download [admin]
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/../models/Application.php';
require_once __DIR__ . '/../models/Notification.php';

$auth = requireAuth();

// ── Sub-routes ──────────────────────────────────────────────
// /api/applications/my
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

// /api/applications/{id}/status
if ($action === 'status' && $method === 'PATCH') {
    requireAdmin();
    $body   = jsonBody();
    $status = $body['status'] ?? '';
    $reason = $body['reason'] ?? null;

    $allowed = ['submitted','under-review','approved','rejected'];
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

    // Notify the applicant
    $messages = [
        'approved'     => 'Congratulations! Your application for "' . $app['grant_title'] . '" has been approved.',
        'rejected'     => 'Your application for "' . $app['grant_title'] . '" was not successful.' . ($reason ? ' Reason: ' . $reason : ''),
        'under-review' => 'Your application for "' . $app['grant_title'] . '" is now under review.',
    ];
    Notification::create($app['user_id'], 'Application ' . ucwords(str_replace('-',' ',$status)), $messages[$status] ?? '');
    Message::send($app['user_id'], 'Application Status Update', $messages[$status] ?? '');

    jsonSuccess([], 'Status updated.');
}

// /api/applications/{id}/download
if ($action === 'download' && $method === 'GET') {
    requireAdmin();
    $app = Application::findById((int)$id);
    if (!$app) jsonError('Application not found.', 404);

    // Simple plain-text download if TCPDF not available
    header('Content-Type: text/plain');
    header('Content-Disposition: attachment; filename="application-' . $id . '.txt"');
    echo "APPLICATION DETAILS\n";
    echo "===================\n\n";
    foreach ($app as $key => $value) {
        if (in_array($key, ['documents','budget_items'])) continue;
        echo strtoupper(str_replace('_', ' ', $key)) . ": " . (is_array($value) ? json_encode($value) : $value) . "\n";
    }
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
        // Submission is multipart/form-data
        $data = $_POST;

        $errors = validate($data, [
            'grant_id'       => 'required|numeric',
            'full_name'      => 'required|max:255',
            'email'          => 'required|email',
            'research_title' => 'required|max:500',
        ]);
        if ($errors) jsonError('Validation failed.', 422, $errors);

        // Decode budget items
        if (!empty($data['budget_items'])) {
            $data['budget_items'] = json_decode($data['budget_items'], true) ?? [];
        }

        $appId = Application::create($data, $auth['id']);

        // Handle file uploads
        $docLabels = [
            'uploadProposal'        => 'Research Proposal PDF',
            'uploadCv'              => 'Curriculum Vitae (CV)',
            'uploadPublications'    => 'List of Publications',
            'uploadApprovalLetter'  => 'Institutional Approval Letter',
            'uploadPreviousEvidence'=> 'Evidence of Previous Research',
            'uploadSupportingDocs'  => 'Supporting Documents',
        ];
        foreach ($docLabels as $fieldName => $label) {
            if (!empty($_FILES[$fieldName]) && $_FILES[$fieldName]['error'] === UPLOAD_ERR_OK) {
                try {
                    $info = uploadFile($_FILES[$fieldName], (string)$appId);
                    Application::saveDocument($appId, $label, $info);
                } catch (RuntimeException $e) {
                    // Log but don't fail the whole submission
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
