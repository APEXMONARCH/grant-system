<?php
// ─────────────────────────────────────────────────────────────
//  controllers/SettingsController.php
//
//  GET /api/settings/notifications
//  PUT /api/settings/notifications
//  GET /api/settings/roles   (also /api/roles for legacy)
// ─────────────────────────────────────────────────────────────
require_once __DIR__ . '/../models/User.php';

$auth       = requireAuth();
// BUG FIX: $resource is a router-level variable unavailable here; use $settingKey derived from $id
$settingKey = $id ?? '';

// ── Notification preferences ────────────────────────────────
if ($settingKey === 'notifications') {
    if ($method === 'GET') {
        $user = User::findById($auth['id']);
        jsonSuccess([
            'emailNotifications'  => (bool)($user['email_notifications'] ?? true),
            'systemAlerts'        => true,
            'newApplications'     => (bool)($user['application_alerts']  ?? true),
            'statusUpdates'       => (bool)($user['application_alerts']  ?? true),
            'deadlineReminders'   => (bool)($user['deadline_reminders']  ?? true),
            'reviewerFeedback'    => (bool)($user['reviewer_feedback']   ?? true),  // IMPROVEMENT: was missing
            'weeklyReports'       => false,
        ]);
    }

    if ($method === 'PUT') {
        $body = jsonBody();
        User::update($auth['id'], [
            'email_notifications' => !empty($body['emailNotifications']) ? 1 : 0,
            'application_alerts'  => !empty($body['newApplications'])    ? 1 : 0,
            'deadline_reminders'  => !empty($body['deadlineReminders'])  ? 1 : 0,
            'reviewer_feedback'   => !empty($body['reviewerFeedback'])   ? 1 : 0,  // IMPROVEMENT
        ]);
        jsonSuccess([], 'Preferences saved.');
    }

    jsonError('Method not allowed.', 405);
}

// ── Roles ─────────────────────────────────────────────────
// BUG FIX: original code used `$resource === 'roles'` which is not in scope in a controller file.
// Now handled purely via $settingKey, and the router also routes /api/roles here.
if ($settingKey === 'roles' || $settingKey === '') {
    // Allow empty $id when router hit /api/roles directly (router sets $resource='roles', $id=null)
    // We re-check the raw URI segment to distinguish /api/settings vs /api/roles
    $calledAsRolesEndpoint = (strpos($_SERVER['REQUEST_URI'] ?? '', '/roles') !== false
                              && strpos($_SERVER['REQUEST_URI'] ?? '', '/settings') === false);

    if ($settingKey === 'roles' || $calledAsRolesEndpoint) {
        requireAdmin();
        $pdo = db();
        $adminCount     = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='admin'")->fetchColumn();
        $reviewerCount  = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='reviewer'")->fetchColumn();
        $applicantCount = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='applicant'")->fetchColumn();

        jsonSuccess([
            ['id'=>1,'name'=>'Admin',    'icon'=>'shield-alt','users_count'=>$adminCount,
             'permissions'=>['Manage all grants','Approve/reject applications','Manage system users','View all reports','Export data']],
            ['id'=>2,'name'=>'Reviewer', 'icon'=>'eye',       'users_count'=>$reviewerCount,
             'permissions'=>['View applications','Add reviewer notes','Mark applications under review']],
            ['id'=>3,'name'=>'Applicant','icon'=>'user',      'users_count'=>$applicantCount,
             'permissions'=>['Browse open grants','Submit applications','View own applications','Receive notifications']],
        ]);
    }
}

jsonError('Settings route not found.', 404);
