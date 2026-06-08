<?php
// ─────────────────────────────────────────────────────────────
//  controllers/UserController.php  [admin only]
// ─────────────────────────────────────────────────────────────
require_once __DIR__ . '/../models/User.php';

requireAdmin();

switch ($method) {

    case 'GET':
        $page   = max(1, (int)($_GET['page']  ?? 1));
        $limit  = min(100, max(1, (int)($_GET['limit'] ?? 50)));
        $users  = User::all($page, $limit);
        $total  = User::count();
        $safe   = array_map([User::class, 'safe'], $users);
        jsonList($safe, $total, $page, $limit);
        break;

    case 'POST':
        $body   = jsonBody();
        $errors = validate($body, [
            'name'     => 'required|max:200',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'role'     => 'required|in:admin,reviewer,applicant',
        ]);
        if ($errors) jsonError('Validation failed.', 422, $errors);

        // Split name into first/last
        $nameParts = explode(' ', trim($body['name']), 2);
        $body['first_name'] = $nameParts[0];
        $body['last_name']  = $nameParts[1] ?? '';

        $newId = User::create($body);
        jsonSuccess(User::safe(User::findById($newId)), 'User created.', 201);
        break;

    case 'PUT':
        if (!$id) jsonError('User ID required.', 400);
        $body   = jsonBody();
        $errors = validate($body, ['email' => 'email']);
        if ($errors) jsonError('Validation failed.', 422, $errors);

        // Handle name split
        if (!empty($body['name'])) {
            $parts = explode(' ', trim($body['name']), 2);
            $body['first_name'] = $parts[0];
            $body['last_name']  = $parts[1] ?? '';
        }
        User::update((int)$id, $body);
        if (!empty($body['password'])) User::updatePassword((int)$id, $body['password']);
        jsonSuccess(User::safe(User::findById((int)$id)), 'User updated.');
        break;

    case 'DELETE':
        if (!$id) jsonError('User ID required.', 400);
        User::delete((int)$id);
        jsonSuccess([], 'User deleted.');
        break;

    default:
        jsonError('Method not allowed.', 405);
}
