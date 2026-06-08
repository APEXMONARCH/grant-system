<?php
// ─────────────────────────────────────────────────────────────
//  controllers/AuthController.php
//
//  POST /api/auth/login
//  POST /api/auth/register
//  POST /api/auth/logout
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Notification.php';

// Route: /api/auth/{action}
$authAction = $parts[1] ?? '';   // login | register | logout

switch ($method . ':' . $authAction) {

    // ── POST /api/auth/login ────────────────────────────────
    case 'POST:login':
        $body = jsonBody();

        $errors = validate($body, [
            'email'    => 'required|email',
            'password' => 'required',
        ]);
        if ($errors) jsonError('Validation failed.', 422, $errors);

        $user = User::findByEmail($body['email']);

        if (!$user || !password_verify($body['password'], $user['password'])) {
            jsonError('Invalid email or password.', 401);
        }

        if ($user['status'] !== 'active') {
            jsonError('Your account is inactive. Please contact the administrator.', 403);
        }

        $token = JWT::encode(User::tokenPayload($user));

        jsonSuccess([
            'token' => $token,
            'user'  => User::safe($user),
        ], 'Login successful.');
        break;

    // ── POST /api/auth/register ─────────────────────────────
    case 'POST:register':
        $body = jsonBody();

        $errors = validate($body, [
            'first_name' => 'required|max:100',
            'last_name'  => 'required|max:100',
            'email'      => 'required|email|unique:users,email',
            'password'   => 'required|min:6',
        ]);
        if ($errors) jsonError('Validation failed.', 422, $errors);

        $id   = User::create($body);
        $user = User::findById($id);
        $token = JWT::encode(User::tokenPayload($user));

        // Auto-create welcome notification
        Notification::create($id, 'Welcome!', 'Your account has been created successfully. Start by browsing available grants.');

        jsonSuccess([
            'token' => $token,
            'user'  => User::safe($user),
        ], 'Account created successfully.', 201);
        break;

    // ── POST /api/auth/logout ───────────────────────────────
    case 'POST:logout':
        requireAuth(); // Validate token exists
        // Stateless JWT — client discards token. 
        // Add a token blocklist here if you need server-side invalidation.
        jsonSuccess([], 'Logged out successfully.');
        break;

    default:
        jsonError('Auth route not found.', 404);
}
