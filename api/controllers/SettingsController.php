<?php
// ─────────────────────────────────────────────────────────────
//  controllers/SettingsController.php
//
//  GET /api/settings/notifications
//  PUT /api/settings/notifications
//  GET /api/roles
// ─────────────────────────────────────────────────────────────
require_once __DIR__ . '/../models/User.php';

$auth       = requireAuth();
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
            'weeklyReports'       => false,
        ]);
    }

    if ($method === 'PUT') {
        $body = jsonBody();
        User::update($auth['id'], [
            'email_notifications' => !empty($body['emailNotifications'])  ? 1 : 0,
            'application_alerts'  => !empty($body['newApplications'])     ? 1 : 0,
            'deadline_reminders'  => !empty($body['deadlineReminders'])   ? 1 : 0,
        ]);
        jsonSuccess([], 'Preferences saved.');
    }
}

// ── Roles (static — extend with DB if needed) ───────────────
if ($settingKey === 'roles' || $resource === 'roles') {
    requireAdmin();
    $adminCount    = (int)db()->query("SELECT COUNT(*) FROM users WHERE role='admin'")->fetchColumn();
    $reviewerCount = (int)db()->query("SELECT COUNT(*) FROM users WHERE role='reviewer'")->fetchColumn();
    $applicantCount= (int)db()->query("SELECT COUNT(*) FROM users WHERE role='applicant'")->fetchColumn();

    jsonSuccess([
        ['id'=>1,'name'=>'Admin',    'icon'=>'shield-alt','users_count'=>$adminCount,
         'permissions'=>['Manage all grants','Approve/reject applications','Manage system users','View all reports','Export data']],
        ['id'=>2,'name'=>'Reviewer', 'icon'=>'eye',       'users_count'=>$reviewerCount,
         'permissions'=>['View applications','Add reviewer notes','Mark applications under review']],
        ['id'=>3,'name'=>'Applicant','icon'=>'user',      'users_count'=>$applicantCount,
         'permissions'=>['Browse open grants','Submit applications','View own applications','Receive notifications']],
    ]);
}

jsonError('Settings route not found.', 404);
