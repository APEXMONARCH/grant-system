<?php
// ─────────────────────────────────────────────────────────────
//  controllers/AuthController.php  (FIXED v2)
//
//  POST /api/auth/login
//  POST /api/auth/register           (applicant registration)
//  POST /api/auth/register-admin     (admin registration — requires secret key)
//  POST /api/auth/logout
// ─────────────────────────────────────────────────────────────

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Notification.php';

// Route: /api/auth/{action}
$authAction = $parts[1] ?? '';   // login | register | register-admin | logout

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

    // ── POST /api/auth/register  (applicant) ───────────────
    case 'POST:register':
        $body = jsonBody();

        $errors = validate($body, [
            'first_name' => 'required|max:100',
            'last_name'  => 'required|max:100',
            'email'      => 'required|email|unique:users,email',
            'password'   => 'required|min:6',
        ]);
        if ($errors) jsonError('Validation failed.', 422, $errors);

        // Force applicant role — public registration never creates admins
        $body['role'] = 'applicant';

        $id    = User::create($body);
        $user  = User::findById($id);
        $token = JWT::encode(User::tokenPayload($user));

        Notification::create($id, 'Welcome!', 'Your account has been created successfully. Start by browsing available grants.');

        jsonSuccess([
            'token' => $token,
            'user'  => User::safe($user),
        ], 'Account created successfully.', 201);
        break;

    // ── POST /api/auth/register-admin  ─────────────────────
    // Protected by a secret key defined in constants.php
    // The frontend admin-signup.html sends:
    //   { first_name, last_name, email, password, admin_secret }
    case 'POST:register-admin':
        $body = jsonBody();

        // Validate secret key first
        $adminSecret = defined('ADMIN_REGISTRATION_SECRET') ? ADMIN_REGISTRATION_SECRET : '';
        if (empty($adminSecret) || ($body['admin_secret'] ?? '') !== $adminSecret) {
            jsonError('Invalid admin registration key.', 403);
        }

        $errors = validate($body, [
            'first_name' => 'required|max:100',
            'last_name'  => 'required|max:100',
            'email'      => 'required|email|unique:users,email',
            'password'   => 'required|min:8',
        ]);
        if ($errors) jsonError('Validation failed.', 422, $errors);

        $body['role'] = 'admin';

        $id    = User::create($body);
        $user  = User::findById($id);
        $token = JWT::encode(User::tokenPayload($user));

        Notification::create($id, 'Admin Account Created', 'Your admin account has been created. You have full system access.');

        jsonSuccess([
            'token' => $token,
            'user'  => User::safe($user),
        ], 'Admin account created successfully.', 201);
        break;

    // ── POST /api/auth/logout ───────────────────────────────
    case 'POST:logout':
        requireAuth();
        jsonSuccess([], 'Logged out successfully.');
        break;

    default:
        jsonError('Auth route not found.', 404);
}
