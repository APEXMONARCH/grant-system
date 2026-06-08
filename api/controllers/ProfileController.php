<?php
// ─────────────────────────────────────────────────────────────
//  controllers/ProfileController.php
//
//  GET  /api/profile
//  PUT  /api/profile
//  PATCH /api/profile/preferences
// ─────────────────────────────────────────────────────────────
require_once __DIR__ . '/../models/User.php';

$auth = requireAuth();

// PATCH /api/profile/preferences
if ($id === 'preferences' && $method === 'PATCH') {
    $body    = jsonBody();
    $allowed = ['email_notifications','application_alerts','deadline_reminders','reviewer_feedback'];
    $update  = array_intersect_key($body, array_flip($allowed));
    User::update($auth['id'], $update);
    jsonSuccess([], 'Preferences updated.');
}

switch ($method) {

    case 'GET':
        $user = User::findById($auth['id']);
        if (!$user) jsonError('User not found.', 404);
        jsonSuccess(User::safe($user));
        break;

    case 'PUT':
        $body   = jsonBody();
        $errors = validate($body, [
            'first_name' => 'max:100',
            'last_name'  => 'max:100',
            'phone'      => 'max:50',
        ]);
        if ($errors) jsonError('Validation failed.', 422, $errors);

        User::update($auth['id'], $body);
        $user = User::findById($auth['id']);
        jsonSuccess(User::safe($user), 'Profile updated.');
        break;

    default:
        jsonError('Method not allowed.', 405);
}
