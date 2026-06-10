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

// ── Admin secret key ─────────────────────────────────────────
// Set this in constants.php as: define('ADMIN_SECRET', 'your-secret-key');
// If not defined, falls back to this default (change it!).
if (!defined('ADMIN_SECRET')) {
    define('ADMIN_SECRET', 'GrantAdmin@2025');
}

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

        // ── Role assignment ──────────────────────────────────
        // Determine the requested role (defaults to applicant for safety)
        $requestedRole = strtolower(trim($body['role'] ?? 'applicant'));

        // Only 'admin', 'reviewer', 'applicant' are valid
        if (!in_array($requestedRole, ['admin', 'reviewer', 'applicant'], true)) {
            $requestedRole = 'applicant';
        }

        // If requesting admin role, validate the secret key
        if ($requestedRole === 'admin') {
            $providedSecret = trim($body['admin_secret'] ?? '');
            if (empty($providedSecret)) {
                jsonError('Admin secret key is required to register as an administrator.', 403, [
                    'admin_secret' => ['Admin secret key is required.'],
                ]);
            }
            if (!hash_equals(ADMIN_SECRET, $providedSecret)) {
                jsonError('Invalid admin secret key. Please contact your system administrator.', 403, [
                    'admin_secret' => ['The secret key you entered is incorrect.'],
                ]);
            }
        }

        // Set the role in body for User::create
        $body['role'] = $requestedRole;

        $id    = User::create($body);
        $user  = User::findById($id);
        $token = JWT::encode(User::tokenPayload($user));

        // Auto-create welcome notification
        if ($requestedRole === 'admin') {
            Notification::create($id, 'Welcome, Administrator!', 'Your admin account has been created. You have full access to the Grant Management System.');
        } else {
            Notification::create($id, 'Welcome!', 'Your account has been created successfully. Start by browsing available grants.');
        }

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
